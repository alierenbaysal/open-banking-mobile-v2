package api

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"gitlab.bankdhofar.com/ea/open-banking/services/ob-tpp-manager/internal/keycloak"
	"gitlab.bankdhofar.com/ea/open-banking/services/ob-tpp-manager/internal/session"
)

// Microsoft Entra (Azure AD) SSO for the Qantara developer portal.
//
// This replaces the password + magic-PIN + TOTP human login: a person signs in
// with their Entra identity (bank staff = admins; B2B-guest partners = developers)
// via the OIDC authorization-code + PKCE flow. The id_token is trusted on the
// back channel — it is fetched directly from Microsoft's token endpoint over TLS,
// so we decode (not JWKS-verify) its payload. Keycloak remains the user/data store
// and OBIE machine-client issuer; we find-or-create a Keycloak record per human so
// roles/TPP linkage keep flowing through the existing session machinery.

const ssoStateCookieName = "qantara_sso_state"
const ssoStateTTL = 10 * time.Minute

// ssoCallbackPath is appended to the request scheme+host to build the redirect_uri
// (must exactly match a URI registered on the Entra app — omtd and tnd are both
// registered).
const ssoCallbackPath = "/portal-api/auth/sso/callback"

// SSOLogin (PUBLIC) starts the Entra OIDC authorization-code + PKCE flow.
func (h *Handler) SSOLogin(w http.ResponseWriter, r *http.Request) {
	if h.entraClientID == "" || h.entraTenantID == "" {
		writeError(w, http.StatusServiceUnavailable, "sso_unconfigured", "SSO is not configured")
		return
	}

	// PKCE verifier (32 random bytes, base64url) + S256 challenge.
	verifier, err := randomURLToken(32)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error", "Failed to generate PKCE verifier")
		return
	}
	sum := sha256.Sum256([]byte(verifier))
	challenge := base64.RawURLEncoding.EncodeToString(sum[:])

	nonce, err := randomURLToken(16)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error", "Failed to generate nonce")
		return
	}

	returnPath := sanitizeReturnPath(r.URL.Query().Get("return"))
	redirectURI := h.ssoRedirectURI(r)

	// Signed, short-lived state carried in an httpOnly cookie.
	stateTok, err := h.signer.Issue(session.Claims{
		Purpose:      session.PurposeSSOState,
		Nonce:        nonce,
		PKCEVerifier: verifier,
		ReturnPath:   returnPath,
		RedirectURI:  redirectURI,
	}, ssoStateTTL)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error", "Failed to issue SSO state")
		return
	}
	http.SetCookie(w, &http.Cookie{
		Name:     ssoStateCookieName,
		Value:    stateTok,
		Path:     "/",
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   int(ssoStateTTL.Seconds()),
	})

	authz := h.entraAuthorizeURL()
	q := url.Values{
		"client_id":             {h.entraClientID},
		"response_type":         {"code"},
		"redirect_uri":          {redirectURI},
		"scope":                 {"openid profile email"},
		"response_mode":         {"query"},
		"state":                 {stateTok},
		"code_challenge":        {challenge},
		"code_challenge_method": {"S256"},
		"nonce":                 {nonce},
	}
	http.Redirect(w, r, authz+"?"+q.Encode(), http.StatusFound)
}

// SSOCallback (PUBLIC) completes the Entra OIDC flow: validates the signed state,
// exchanges the code for tokens, derives the user's role, ensures a Keycloak
// record, and starts the BFF session.
func (h *Handler) SSOCallback(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	if errParam := q.Get("error"); errParam != "" {
		h.logger.Warn("sso callback returned error from Entra", "error", errParam, "desc", q.Get("error_description"))
		h.ssoFail(w, r, "/", "sso-failed")
		return
	}
	code := q.Get("code")
	stateParam := q.Get("state")

	// Read + clear the state cookie, verify signature/expiry, and confirm it
	// matches the state echoed back by Entra.
	ck, err := r.Cookie(ssoStateCookieName)
	clearSSOStateCookie(w)
	if err != nil || code == "" || stateParam == "" {
		h.ssoFail(w, r, "/", "sso-failed")
		return
	}
	state, err := h.signer.Verify(ck.Value, session.PurposeSSOState)
	if err != nil || state.PKCEVerifier == "" {
		h.logger.Warn("sso state verification failed", "error", err)
		h.ssoFail(w, r, "/", "sso-failed")
		return
	}
	if ck.Value != stateParam {
		h.logger.Warn("sso state mismatch between cookie and callback param")
		h.ssoFail(w, r, state.ReturnPath, "sso-failed")
		return
	}

	// Exchange the authorization code for tokens (PKCE: send the verifier).
	idToken, err := h.exchangeCode(code, state.RedirectURI, state.PKCEVerifier)
	if err != nil {
		h.logger.Error("sso token exchange failed", "error", err)
		h.ssoFail(w, r, state.ReturnPath, "sso-failed")
		return
	}

	// Back-channel trust: the id_token came straight from Microsoft over TLS, so
	// we decode its claims rather than doing JWKS signature verification.
	claims, err := decodeJWTClaims(idToken)
	if err != nil {
		h.logger.Error("sso id_token decode failed", "error", err)
		h.ssoFail(w, r, state.ReturnPath, "sso-failed")
		return
	}

	email := strings.ToLower(strings.TrimSpace(firstNonEmpty(
		claims.Email, claims.PreferredUsername, claims.UPN)))
	if email == "" || !strings.Contains(email, "@") {
		h.logger.Warn("sso id_token missing usable email claim")
		h.ssoFail(w, r, state.ReturnPath, "sso-failed")
		return
	}
	name := claims.Name

	// Resolve the Keycloak record (if any) up front: its onb_admin / onb_status
	// attributes participate in the role and approval-gate decisions.
	kcUser, found, err := h.kc.FindUserByEmail(email)
	if err != nil {
		h.logger.Error("sso keycloak lookup failed", "email", email, "error", err)
		h.ssoFail(w, r, state.ReturnPath, "sso-failed")
		return
	}

	isAdmin := h.isAdminEmail(email)
	if found && attrGet(kcUser.Attributes, attrAdmin) == "true" {
		isAdmin = true
	}

	if !isAdmin {
		// Partners must have been approved before they can sign in. A missing or
		// pending record means "awaiting approval" — bounce to the signup screen.
		status := ""
		if found {
			status = attrGet(kcUser.Attributes, attrStatus)
		}
		if status != statusActive {
			h.logger.Info("sso partner not yet approved", "email", email, "status", status)
			h.ssoRedirect(w, r, joinPath(state.ReturnPath, "/signup")+"?status=awaiting-approval")
			return
		}
	}

	// Ensure a Keycloak record exists (find-or-create by email). Admins are
	// activated and flagged on first sign-in.
	userID, attrs, err := h.ensureSSOUser(kcUser, found, email, name, isAdmin)
	if err != nil {
		h.logger.Error("sso ensure keycloak user failed", "email", email, "error", err)
		h.ssoFail(w, r, state.ReturnPath, "sso-failed")
		return
	}

	sc := session.Claims{
		Subject: userID,
		Email:   email,
		Name:    firstNonEmpty(name, attrGet(attrs, attrOrg)),
		TPP:     attrGet(attrs, attrTPP),
		Roles:   rolesForUser(attrs),
	}
	if err := h.setSessionCookie(w, sc); err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error", "Failed to start session")
		return
	}
	h.logger.Info("sso login", "email", email, "admin", isAdmin, "roles", sc.Roles)
	h.ssoRedirect(w, r, defaultPath(state.ReturnPath))
}

// ensureSSOUser finds-or-creates the Keycloak record for an SSO sign-in and
// returns its id and current attributes. For admins it sets onb_status=active and
// onb_admin=true so rolesForUser grants qantara-admin. Best-effort assigns the
// tpp-developer realm role.
func (h *Handler) ensureSSOUser(existing *keycloak.User, found bool, email, name string, isAdmin bool) (string, map[string][]string, error) {
	var userID string
	var attrs map[string][]string

	if found {
		userID = existing.ID
		attrs = existing.Attributes
		if attrs == nil {
			attrs = map[string][]string{}
		}
	} else {
		var seed map[string][]string
		if isAdmin {
			seed = map[string][]string{attrStatus: {statusActive}, attrAdmin: {"true"}}
		}
		id, err := h.kc.CreateUser(email, name, seed)
		if err != nil {
			return "", nil, err
		}
		userID = id
		attrs = map[string][]string{}
		for k, v := range seed {
			attrs[k] = v
		}
	}

	// Admins: ensure active + admin flag (covers a pre-existing non-admin record
	// that should now be treated as staff).
	if isAdmin && (attrGet(attrs, attrAdmin) != "true" || attrGet(attrs, attrStatus) != statusActive) {
		upd := map[string][]string{attrStatus: {statusActive}, attrAdmin: {"true"}}
		if err := h.kc.SetUserAttributes(userID, upd); err != nil {
			return "", nil, err
		}
		attrs[attrStatus] = []string{statusActive}
		attrs[attrAdmin] = []string{"true"}
	}

	if err := h.kc.AddRealmRoleToUser(userID, "tpp-developer"); err != nil {
		h.logger.Warn("sso could not assign tpp-developer role", "email", email, "error", err)
	}
	return userID, attrs, nil
}

// --- Entra / Graph plumbing ---

func (h *Handler) entraAuthorizeURL() string {
	return "https://login.microsoftonline.com/" + h.entraTenantID + "/oauth2/v2.0/authorize"
}

func (h *Handler) entraTokenURL() string {
	return "https://login.microsoftonline.com/" + h.entraTenantID + "/oauth2/v2.0/token"
}

// ssoRedirectURI builds the redirect_uri from the incoming request's scheme+host
// so it matches whichever registered URI (omtd or tnd) the user came in on.
func (h *Handler) ssoRedirectURI(r *http.Request) string {
	host := r.Header.Get("X-Forwarded-Host")
	if host == "" {
		host = r.Host
	}
	scheme := r.Header.Get("X-Forwarded-Proto")
	if scheme == "" {
		// Edge terminates TLS; the portal is always served over https.
		scheme = "https"
	}
	return scheme + "://" + host + ssoCallbackPath
}

// exchangeCode swaps the authorization code for tokens and returns the raw
// id_token. Uses the confidential client secret + PKCE verifier.
func (h *Handler) exchangeCode(code, redirectURI, verifier string) (string, error) {
	form := url.Values{
		"grant_type":    {"authorization_code"},
		"client_id":     {h.entraClientID},
		"client_secret": {h.entraClientSecret},
		"code":          {code},
		"redirect_uri":  {redirectURI},
		"code_verifier": {verifier},
	}
	resp, err := h.httpClient.PostForm(h.entraTokenURL(), form)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if resp.StatusCode != http.StatusOK {
		return "", &ssoError{status: resp.StatusCode, body: string(body)}
	}
	var tok struct {
		IDToken string `json:"id_token"`
	}
	if err := json.Unmarshal(body, &tok); err != nil {
		return "", err
	}
	if tok.IDToken == "" {
		return "", &ssoError{status: resp.StatusCode, body: "token response missing id_token"}
	}
	return tok.IDToken, nil
}

// entraIDClaims are the id_token claims we consume.
type entraIDClaims struct {
	Email             string `json:"email"`
	PreferredUsername string `json:"preferred_username"`
	UPN               string `json:"upn"`
	Name              string `json:"name"`
	OID               string `json:"oid"`
}

// decodeJWTClaims base64url-decodes the JWT payload (middle segment) and unmarshals
// it. No signature verification — see the file header for the back-channel-trust
// rationale.
func decodeJWTClaims(jwt string) (*entraIDClaims, error) {
	parts := strings.Split(jwt, ".")
	if len(parts) < 2 {
		return nil, &ssoError{body: "malformed id_token"}
	}
	payload, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return nil, err
	}
	var c entraIDClaims
	if err := json.Unmarshal(payload, &c); err != nil {
		return nil, err
	}
	return &c, nil
}

// inviteGuest sends an Entra B2B guest invitation via the Microsoft Graph
// invitations API (app-only, svc-entra-automation creds). Best-effort: callers log
// and continue on failure so a missing Graph permission never blocks approval.
func (h *Handler) inviteGuest(email string) error {
	if h.graphClientID == "" || h.graphClientSecret == "" || h.entraTenantID == "" {
		return &ssoError{body: "graph credentials not configured"}
	}
	token, err := h.graphToken()
	if err != nil {
		return err
	}
	payload := map[string]interface{}{
		"invitedUserEmailAddress": email,
		"inviteRedirectUrl":       h.portalBaseURL,
		"sendInvitationMessage":   true,
	}
	body, _ := json.Marshal(payload)
	req, err := http.NewRequest(http.MethodPost, "https://graph.microsoft.com/v1.0/invitations", strings.NewReader(string(body)))
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	resp, err := h.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	rb, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return &ssoError{status: resp.StatusCode, body: string(rb)}
	}
	return nil
}

// graphToken fetches an app-only Microsoft Graph access token (client_credentials).
func (h *Handler) graphToken() (string, error) {
	form := url.Values{
		"grant_type":    {"client_credentials"},
		"client_id":     {h.graphClientID},
		"client_secret": {h.graphClientSecret},
		"scope":         {"https://graph.microsoft.com/.default"},
	}
	tokenURL := "https://login.microsoftonline.com/" + h.entraTenantID + "/oauth2/v2.0/token"
	resp, err := h.httpClient.PostForm(tokenURL, form)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if resp.StatusCode != http.StatusOK {
		return "", &ssoError{status: resp.StatusCode, body: string(body)}
	}
	var tok struct {
		AccessToken string `json:"access_token"`
	}
	if err := json.Unmarshal(body, &tok); err != nil {
		return "", err
	}
	if tok.AccessToken == "" {
		return "", &ssoError{status: resp.StatusCode, body: "graph token response missing access_token"}
	}
	return tok.AccessToken, nil
}

// --- helpers ---

// isAdminEmail returns true if the email is explicitly listed in ADMIN_EMAILS or
// its domain matches ADMIN_DOMAIN.
func (h *Handler) isAdminEmail(email string) bool {
	for _, a := range h.adminEmails {
		if a == email {
			return true
		}
	}
	if h.adminDomain != "" {
		if at := strings.LastIndex(email, "@"); at >= 0 {
			if strings.EqualFold(email[at+1:], h.adminDomain) {
				return true
			}
		}
	}
	return false
}

func randomURLToken(n int) (string, error) {
	b := make([]byte, n)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
}

func clearSSOStateCookie(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{
		Name: ssoStateCookieName, Value: "", Path: "/",
		HttpOnly: true, Secure: true, SameSite: http.SameSiteLaxMode, MaxAge: -1,
	})
}

// ssoRedirect issues a 302 to a portal-relative path.
func (h *Handler) ssoRedirect(w http.ResponseWriter, r *http.Request, path string) {
	http.Redirect(w, r, path, http.StatusFound)
}

// ssoFail bounces the browser back to the portal with an error flag so the SPA can
// render a friendly "sign-in failed" message instead of raw JSON.
func (h *Handler) ssoFail(w http.ResponseWriter, r *http.Request, returnPath, reason string) {
	http.Redirect(w, r, defaultPath(returnPath)+"?error="+reason, http.StatusFound)
}

// sanitizeReturnPath only allows site-relative paths (must start with "/" and not
// "//") to prevent open redirects via the ?return param.
func sanitizeReturnPath(p string) string {
	if p == "" || !strings.HasPrefix(p, "/") || strings.HasPrefix(p, "//") {
		return "/"
	}
	return p
}

func defaultPath(p string) string {
	if p == "" {
		return "/"
	}
	return p
}

// joinPath appends sub to base, collapsing the boundary slash.
func joinPath(base, sub string) string {
	base = defaultPath(base)
	if base == "/" {
		return sub
	}
	return strings.TrimRight(base, "/") + sub
}

func firstNonEmpty(vals ...string) string {
	for _, v := range vals {
		if strings.TrimSpace(v) != "" {
			return v
		}
	}
	return ""
}

// ssoError is a small typed error carrying the upstream status + body for logs.
type ssoError struct {
	status int
	body   string
}

func (e *ssoError) Error() string {
	if e.status != 0 {
		return "sso upstream " + strings.TrimSpace(e.body) + " (status " + strconv.Itoa(e.status) + ")"
	}
	return e.body
}
