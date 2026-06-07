package api

import (
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/hex"
	"fmt"
	"math/big"
	"net/http"
	"strconv"
	"strings"
	"time"

	"gitlab.bankdhofar.com/ea/open-banking/services/ob-tpp-manager/internal/keycloak"
	"gitlab.bankdhofar.com/ea/open-banking/services/ob-tpp-manager/internal/models"
	"gitlab.bankdhofar.com/ea/open-banking/services/ob-tpp-manager/internal/session"
	"gitlab.bankdhofar.com/ea/open-banking/services/ob-tpp-manager/internal/totp"
)

// Keycloak user-attribute keys used by the onboarding flow.
const (
	attrPinHash     = "onb_pin_hash"
	attrPinSalt     = "onb_pin_salt"
	attrPinExp      = "onb_pin_exp"
	attrStatus      = "onb_status"
	attrTPP         = "tpp_client_id"
	attrTOTP        = "totp_secret"
	attrTOTPPending = "totp_pending"
	attrAdmin       = "onb_admin"
	attrOrg         = "onb_org"
	attrMsg         = "onb_msg"
	attrReqAt       = "onb_requested_at"

	statusInvited  = "invited"
	statusActive   = "active"
	statusPending  = "pending"
	statusRejected = "rejected"

	activationTTL = 15 * time.Minute
	pinTTL        = 24 * time.Hour
)

// Invite (admin) creates/refreshes a partner user and emails a one-time PIN.
func (h *Handler) Invite(w http.ResponseWriter, r *http.Request) {
	var req models.InviteRequest
	if err := readJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_request", "Failed to parse request body: "+err.Error())
		return
	}
	email := strings.ToLower(strings.TrimSpace(req.Email))
	if !strings.Contains(email, "@") {
		writeError(w, http.StatusBadRequest, "invalid_request", "A valid email is required")
		return
	}

	uid, found, err := h.kc.FindUserByEmail(email)
	var userID string
	if err != nil {
		writeError(w, http.StatusBadGateway, "keycloak_error", "User lookup failed: "+err.Error())
		return
	}
	if found {
		userID = uid.ID
	} else {
		userID, err = h.kc.CreateUser(email, req.Name, nil)
		if err != nil {
			writeError(w, http.StatusBadGateway, "keycloak_error", "Failed to create user: "+err.Error())
			return
		}
	}

	resp, err := h.sendInvite(userID, email, req.Name, req.TPPClient, req.Admin)
	if err != nil {
		writeError(w, http.StatusBadGateway, "keycloak_error", err.Error())
		return
	}

	h.logger.Info("invited partner", "email", email, "emailed", resp.Emailed, "tpp", req.TPPClient, "admin", req.Admin)
	writeJSON(w, http.StatusCreated, resp)
}

// sendInvite generates a one-time PIN, stores the invite attributes (status =
// invited), best-effort assigns the tpp-developer realm role, optionally marks
// the user as an admin, and emails the PIN. Shared by the admin Invite handler
// and the self-signup approval flow. Returns the InviteResponse the caller emits.
func (h *Handler) sendInvite(userID, email, name, tppClient string, admin bool) (models.InviteResponse, error) {
	if err := h.kc.AddRealmRoleToUser(userID, "tpp-developer"); err != nil {
		h.logger.Warn("could not assign tpp-developer role", "email", email, "error", err)
	}

	pin := genPIN()
	salt := genSalt()
	exp := time.Now().Add(pinTTL)
	attrs := map[string][]string{
		attrPinHash: {hashPIN(salt, pin)},
		attrPinSalt: {salt},
		attrPinExp:  {strconv.FormatInt(exp.Unix(), 10)},
		attrStatus:  {statusInvited},
	}
	if tppClient != "" {
		attrs[attrTPP] = []string{tppClient}
	}
	if admin {
		attrs[attrAdmin] = []string{"true"}
	}
	if err := h.kc.SetUserAttributes(userID, attrs); err != nil {
		return models.InviteResponse{}, fmt.Errorf("Failed to store invite: %w", err)
	}

	resp := models.InviteResponse{Email: email, Status: statusInvited, ExpiresAt: exp}
	if h.mailer.Enabled() {
		if err := h.mailer.Send(email, "Your Qantara sandbox invitation", inviteEmailHTML(name, pin, h.portalBaseURL, exp)); err != nil {
			h.logger.Error("invite email send failed", "email", email, "error", err)
			resp.DevPIN = pin // sandbox fallback so the flow stays testable
		} else {
			resp.Emailed = true
		}
	} else {
		resp.DevPIN = pin
	}
	return resp, nil
}

// VerifyPIN validates the emailed PIN and returns a short-lived activation ticket.
func (h *Handler) VerifyPIN(w http.ResponseWriter, r *http.Request) {
	var req models.VerifyPINRequest
	if err := readJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_request", "Failed to parse request body: "+err.Error())
		return
	}
	email := strings.ToLower(strings.TrimSpace(req.Email))
	u, found, err := h.kc.FindUserByEmail(email)
	if err != nil {
		writeError(w, http.StatusBadGateway, "keycloak_error", err.Error())
		return
	}
	if !found {
		writeError(w, http.StatusUnauthorized, "invalid_pin", "Invalid email or PIN")
		return
	}
	salt := attrGet(u.Attributes, attrPinSalt)
	hash := attrGet(u.Attributes, attrPinHash)
	expStr := attrGet(u.Attributes, attrPinExp)
	if hash == "" {
		writeError(w, http.StatusUnauthorized, "invalid_pin", "No active invitation for this email")
		return
	}
	if exp, _ := strconv.ParseInt(expStr, 10, 64); time.Now().Unix() > exp {
		writeError(w, http.StatusUnauthorized, "pin_expired", "Your invitation PIN has expired — request a new invite")
		return
	}
	if subtle.ConstantTimeCompare([]byte(hashPIN(salt, strings.TrimSpace(req.PIN))), []byte(hash)) != 1 {
		writeError(w, http.StatusUnauthorized, "invalid_pin", "Invalid email or PIN")
		return
	}

	ticket, err := h.signer.Issue(session.Claims{
		Purpose: session.PurposeActivation,
		Subject: u.ID,
		Email:   email,
		Name:    u.FirstName,
		TPP:     attrGet(u.Attributes, attrTPP),
	}, activationTTL)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error", "Failed to issue activation ticket")
		return
	}
	writeJSON(w, http.StatusOK, models.ActivationResponse{Ticket: ticket, Email: email, Name: u.FirstName})
}

// SetPassword sets the partner's password during activation.
func (h *Handler) SetPassword(w http.ResponseWriter, r *http.Request) {
	var req models.SetPasswordRequest
	if err := readJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_request", "Failed to parse request body: "+err.Error())
		return
	}
	c, err := h.signer.Verify(req.Ticket, session.PurposeActivation)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "invalid_ticket", "Activation session invalid or expired")
		return
	}
	if !strongPassword(req.Password) {
		writeError(w, http.StatusBadRequest, "weak_password",
			"Password must be at least 12 characters and include upper, lower, and a digit")
		return
	}
	if err := h.kc.SetPassword(c.Subject, req.Password); err != nil {
		writeError(w, http.StatusBadGateway, "keycloak_error", "Failed to set password: "+err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "password_set"})
}

// TOTPInit generates a TOTP secret and otpauth URI for the portal to render as a QR.
func (h *Handler) TOTPInit(w http.ResponseWriter, r *http.Request) {
	var req models.TOTPInitRequest
	if err := readJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_request", "Failed to parse request body: "+err.Error())
		return
	}
	c, err := h.signer.Verify(req.Ticket, session.PurposeActivation)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "invalid_ticket", "Activation session invalid or expired")
		return
	}
	secret, err := totp.GenerateSecret()
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error", "Failed to generate secret")
		return
	}
	if err := h.kc.SetUserAttributes(c.Subject, map[string][]string{attrTOTPPending: {secret}}); err != nil {
		writeError(w, http.StatusBadGateway, "keycloak_error", err.Error())
		return
	}
	writeJSON(w, http.StatusOK, models.TOTPInitResponse{
		Secret:     secret,
		OtpauthURI: totp.OtpauthURI("Qantara", c.Email, secret),
	})
}

// TOTPVerify confirms the authenticator code, activates the account, and logs in.
func (h *Handler) TOTPVerify(w http.ResponseWriter, r *http.Request) {
	var req models.TOTPVerifyRequest
	if err := readJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_request", "Failed to parse request body: "+err.Error())
		return
	}
	c, err := h.signer.Verify(req.Ticket, session.PurposeActivation)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "invalid_ticket", "Activation session invalid or expired")
		return
	}
	attrs, err := h.kc.GetUserAttributes(c.Subject)
	if err != nil {
		writeError(w, http.StatusBadGateway, "keycloak_error", err.Error())
		return
	}
	pending := attrGet(attrs, attrTOTPPending)
	if pending == "" {
		writeError(w, http.StatusBadRequest, "no_pending_totp", "Start authenticator setup first")
		return
	}
	if !totp.Validate(pending, req.Code) {
		writeError(w, http.StatusUnauthorized, "invalid_code", "That code is incorrect — try again")
		return
	}
	// Confirm TOTP, activate, and clear the one-time PIN.
	if err := h.kc.SetUserAttributes(c.Subject, map[string][]string{
		attrTOTP:        {pending},
		attrTOTPPending: nil,
		attrStatus:      {statusActive},
		attrPinHash:     nil,
		attrPinSalt:     nil,
		attrPinExp:      nil,
	}); err != nil {
		writeError(w, http.StatusBadGateway, "keycloak_error", err.Error())
		return
	}

	sc := session.Claims{Subject: c.Subject, Email: c.Email, Name: c.Name, TPP: c.TPP, Roles: rolesForUser(attrs)}
	if err := h.setSessionCookie(w, sc); err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error", "Failed to start session")
		return
	}
	h.logger.Info("partner activated and logged in", "email", c.Email)
	writeJSON(w, http.StatusOK, models.SessionUser{Subject: c.Subject, Email: c.Email, Name: c.Name, TPP: c.TPP, Roles: sc.Roles})
}

// Login verifies password (via Keycloak direct grant) + TOTP, then starts a session.
func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	var req models.LoginRequest
	if err := readJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_request", "Failed to parse request body: "+err.Error())
		return
	}
	email := strings.ToLower(strings.TrimSpace(req.Email))
	u, found, err := h.kc.FindUserByEmail(email)
	if err != nil {
		writeError(w, http.StatusBadGateway, "keycloak_error", err.Error())
		return
	}
	if !found || attrGet(u.Attributes, attrStatus) != statusActive {
		writeError(w, http.StatusUnauthorized, "invalid_login", "Invalid credentials")
		return
	}
	secret := attrGet(u.Attributes, attrTOTP)
	if secret == "" {
		writeError(w, http.StatusForbidden, "not_activated", "Account not fully activated")
		return
	}
	if err := h.kc.DirectGrantLogin(h.bffClientID, h.bffClientSecret, email, req.Password); err != nil {
		if err == keycloak.ErrInvalidCredentials {
			writeError(w, http.StatusUnauthorized, "invalid_login", "Invalid credentials")
			return
		}
		writeError(w, http.StatusBadGateway, "keycloak_error", err.Error())
		return
	}
	if !totp.Validate(secret, req.Code) {
		writeError(w, http.StatusUnauthorized, "invalid_login", "Invalid credentials")
		return
	}

	sc := session.Claims{Subject: u.ID, Email: email, Name: u.FirstName, TPP: attrGet(u.Attributes, attrTPP), Roles: rolesForUser(u.Attributes)}
	if err := h.setSessionCookie(w, sc); err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error", "Failed to start session")
		return
	}
	h.logger.Info("partner login", "email", email)
	writeJSON(w, http.StatusOK, models.SessionUser{Subject: u.ID, Email: email, Name: u.FirstName, TPP: sc.TPP, Roles: sc.Roles})
}

// Logout clears the session cookie.
func (h *Handler) Logout(w http.ResponseWriter, r *http.Request) {
	clearSessionCookie(w)
	writeJSON(w, http.StatusOK, map[string]string{"status": "logged_out"})
}

// Me returns the current session user.
func (h *Handler) Me(w http.ResponseWriter, r *http.Request) {
	c := claimsFrom(r)
	if c == nil {
		writeError(w, http.StatusUnauthorized, "unauthorized", "Login required")
		return
	}
	writeJSON(w, http.StatusOK, models.SessionUser{Subject: c.Subject, Email: c.Email, Name: c.Name, TPP: c.TPP, Roles: c.Roles})
}

// --- helpers ---

// rolesForUser derives the session roles from the user's onboarding attributes.
// Every partner is a tpp-developer; users flagged onb_admin=true additionally
// carry qantara-admin so requireAdmin's session path and the admin UI work.
func rolesForUser(attrs map[string][]string) []string {
	if attrGet(attrs, attrAdmin) == "true" {
		return []string{"tpp-developer", "qantara-admin"}
	}
	return []string{"tpp-developer"}
}

func attrGet(m map[string][]string, key string) string {
	if v, ok := m[key]; ok && len(v) > 0 {
		return v[0]
	}
	return ""
}

func genPIN() string {
	n, err := rand.Int(rand.Reader, big.NewInt(1_000_000))
	if err != nil {
		return "000000"
	}
	return fmt.Sprintf("%06d", n.Int64())
}

func genSalt() string {
	b := make([]byte, 16)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}

func hashPIN(salt, pin string) string {
	sum := sha256.Sum256([]byte(salt + ":" + pin))
	return hex.EncodeToString(sum[:])
}

func strongPassword(p string) bool {
	if len(p) < 12 {
		return false
	}
	var upper, lower, digit bool
	for _, c := range p {
		switch {
		case c >= 'A' && c <= 'Z':
			upper = true
		case c >= 'a' && c <= 'z':
			lower = true
		case c >= '0' && c <= '9':
			digit = true
		}
	}
	return upper && lower && digit
}

func inviteEmailHTML(name, pin, portalURL string, exp time.Time) string {
	if name == "" {
		name = "there"
	}
	if portalURL == "" {
		portalURL = "https://qantara.tnd.bankdhofar.com"
	}
	return fmt.Sprintf(`<!doctype html><html><body style="font-family:Arial,Helvetica,sans-serif;background:#f4f6f8;padding:24px;">
<div style="max-width:520px;margin:auto;background:#fff;border-radius:12px;padding:32px;border:1px solid #e6e9ec;">
<h2 style="color:#0a7d4b;margin:0 0 8px;">Qantara Open Banking</h2>
<p style="color:#222;">Hi %s,</p>
<p style="color:#444;">You've been invited to the Qantara developer sandbox. Use the one-time PIN below to activate your account and set up your password and authenticator.</p>
<div style="font-size:30px;letter-spacing:8px;font-weight:bold;color:#0a7d4b;text-align:center;background:#f0faf5;border-radius:8px;padding:16px;margin:20px 0;">%s</div>
<p style="text-align:center;"><a href="%s/activate" style="display:inline-block;background:#0a7d4b;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;">Activate your account</a></p>
<p style="color:#888;font-size:13px;">This PIN expires on %s. If you didn't expect this invitation, you can ignore this email.</p>
</div></body></html>`, name, pin, strings.TrimRight(portalURL, "/"), exp.Format("2 Jan 2006 15:04 MST"))
}
