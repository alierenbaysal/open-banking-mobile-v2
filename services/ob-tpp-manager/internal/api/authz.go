package api

import (
	"context"
	"net/http"
	"strings"
	"time"

	"gitlab.bankdhofar.com/ea/open-banking/services/ob-tpp-manager/internal/session"
)

// Session cookie + authorization middleware for the partner self-service BFF.
// The SPA holds an httpOnly, signed session cookie; Keycloak is never exposed.

const sessionCookieName = "qantara_session"
const sessionTTL = 12 * time.Hour

type ctxKey string

const claimsCtxKey ctxKey = "qantara_claims"

func (h *Handler) setSessionCookie(w http.ResponseWriter, c session.Claims) error {
	c.Purpose = session.PurposeSession
	tok, err := h.signer.Issue(c, sessionTTL)
	if err != nil {
		return err
	}
	http.SetCookie(w, &http.Cookie{
		Name:     sessionCookieName,
		Value:    tok,
		Path:     "/",
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   int(sessionTTL.Seconds()),
	})
	return nil
}

func clearSessionCookie(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{
		Name: sessionCookieName, Value: "", Path: "/",
		HttpOnly: true, Secure: true, SameSite: http.SameSiteLaxMode, MaxAge: -1,
	})
}

func (h *Handler) sessionClaims(r *http.Request) (*session.Claims, bool) {
	ck, err := r.Cookie(sessionCookieName)
	if err != nil {
		return nil, false
	}
	c, err := h.signer.Verify(ck.Value, session.PurposeSession)
	if err != nil {
		return nil, false
	}
	return c, true
}

func claimsFrom(r *http.Request) *session.Claims {
	c, _ := r.Context().Value(claimsCtxKey).(*session.Claims)
	return c
}

// requireSession rejects requests without a valid session cookie.
func (h *Handler) requireSession(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		c, ok := h.sessionClaims(r)
		if !ok {
			writeError(w, http.StatusUnauthorized, "unauthorized", "Login required")
			return
		}
		next(w, r.WithContext(context.WithValue(r.Context(), claimsCtxKey, c)))
	}
}

// requireAdmin allows either an admin session (qantara-admin role) or a static
// admin API key (used to bootstrap the very first invitations).
func (h *Handler) requireAdmin(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if h.adminAPIKey != "" && r.Header.Get("X-Admin-Key") == h.adminAPIKey {
			next(w, r)
			return
		}
		if c, ok := h.sessionClaims(r); ok && hasRole(c.Roles, "qantara-admin") {
			next(w, r.WithContext(context.WithValue(r.Context(), claimsCtxKey, c)))
			return
		}
		writeError(w, http.StatusForbidden, "forbidden", "Admin privileges required")
	}
}

// requireReconciler gates the internal gateway-config endpoint with a shared key.
func (h *Handler) requireReconciler(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if h.reconcilerAPIKey == "" || r.Header.Get("X-Internal-Key") != h.reconcilerAPIKey {
			writeError(w, http.StatusUnauthorized, "unauthorized", "internal key required")
			return
		}
		next(w, r)
	}
}

// ownsTPPOrAdmin authorizes a self-service action on tppID by ownership: the
// session must be admin, or the TPP's owner_email (resolved from its Keycloak
// client attribute, falling back to the in-memory record) must equal the
// session user's email (case-insensitive). TPPs with no owner (the pre-seeded
// demo apps) are admin-only.
func (h *Handler) ownsTPPOrAdmin(r *http.Request, tppID string) bool {
	c := claimsFrom(r)
	if c == nil {
		return false
	}
	if hasRole(c.Roles, "qantara-admin") {
		return true
	}
	owner := h.tppOwnerEmail(tppID)
	return owner != "" && strings.EqualFold(owner, c.Email)
}

func hasRole(roles []string, want string) bool {
	for _, x := range roles {
		if x == want {
			return true
		}
	}
	return false
}
