package api

import (
	"net/http"

	"github.com/go-chi/chi/v5"
)

// NewRouter creates and configures the Chi router with all middleware and routes.
func NewRouter(d Deps) http.Handler {
	h := NewHandler(d)

	go h.SyncFromConsentService()

	r := chi.NewRouter()

	// Global middleware stack.
	r.Use(Recoverer(d.Logger))
	r.Use(RequestLogger(d.Logger))
	r.Use(CORS())
	r.Use(ContentTypeJSON())

	// Health check.
	r.Get("/portal-api/health", h.Health)

	// Partner self-service authentication (BFF). Keycloak is never exposed —
	// every screen is native Qantara UI driven by these endpoints.
	r.Route("/portal-api/auth", func(r chi.Router) {
		r.Post("/invite", h.requireAdmin(h.Invite)) // admin session or X-Admin-Key
		r.Post("/signup", h.Signup)                 // public — gated self-signup request
		r.Get("/signup-requests", h.requireAdmin(h.SignupRequests))
		r.Post("/signup-requests/approve", h.requireAdmin(h.ApproveSignup))
		r.Post("/signup-requests/reject", h.requireAdmin(h.RejectSignup))
		r.Post("/verify-pin", h.VerifyPIN)
		r.Post("/set-password", h.SetPassword)
		r.Post("/totp/init", h.TOTPInit)
		r.Post("/totp/verify", h.TOTPVerify)
		r.Post("/login", h.Login)
		r.Post("/logout", h.Logout)
		r.Get("/me", h.requireSession(h.Me))
	})

	// Internal reconciler view consumed by the DMZ gateway-config CronJob.
	r.Get("/portal-api/internal/gateway-config", h.requireReconciler(h.GatewayConfig))

	// TPP management + self-service (session-protected).
	r.Route("/portal-api/tpp", func(r chi.Router) {
		r.Post("/register", h.requireSession(h.Register))
		r.Get("/", h.requireSession(h.ListTPPs))

		r.Route("/{tppId}", func(r chi.Router) {
			r.Get("/", h.requireSession(h.GetTPP))
			r.Put("/", h.requireSession(h.UpdateTPP))
			r.Delete("/", h.requireSession(h.SuspendTPP))
			r.Post("/credentials", h.requireSession(h.GenerateCredentials))
			r.Post("/certificate", h.requireSession(h.UploadCertificate))
			r.Get("/certificate", h.requireSession(h.GetCertificate))
			r.Post("/certificate/generate", h.requireSession(h.GenerateCert))
			r.Post("/sandbox-token", h.requireSession(h.GenerateSandboxToken))
			r.Get("/ip-allowlist", h.requireSession(h.GetIPAllowlist))
			r.Put("/ip-allowlist", h.requireSession(h.SetIPAllowlist))
		})
	})

	return r
}
