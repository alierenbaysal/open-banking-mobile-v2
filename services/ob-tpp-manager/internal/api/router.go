package api

import (
	"log/slog"
	"net/http"

	"github.com/go-chi/chi/v5"

	"gitlab.bankdhofar.com/ea/open-banking/services/ob-tpp-manager/internal/certs"
	"gitlab.bankdhofar.com/ea/open-banking/services/ob-tpp-manager/internal/keycloak"
)

// NewRouter creates and configures the Chi router with all middleware and routes.
func NewRouter(kc *keycloak.Client, certMgr *certs.Manager, consentServiceURL string, logger *slog.Logger) http.Handler {
	h := NewHandler(kc, certMgr, consentServiceURL, logger)

	r := chi.NewRouter()

	// Global middleware stack.
	r.Use(Recoverer(logger))
	r.Use(RequestLogger(logger))
	r.Use(CORS())
	r.Use(ContentTypeJSON())

	// Health check (outside /portal-api/tpp prefix).
	r.Get("/portal-api/health", h.Health)

	// TPP management routes.
	r.Route("/portal-api/tpp", func(r chi.Router) {
		r.Post("/register", h.Register)
		r.Get("/", h.ListTPPs)

		r.Route("/{tppId}", func(r chi.Router) {
			r.Get("/", h.GetTPP)
			r.Put("/", h.UpdateTPP)
			r.Delete("/", h.SuspendTPP)
			r.Post("/credentials", h.GenerateCredentials)
			r.Post("/certificate", h.UploadCertificate)
			r.Get("/certificate", h.GetCertificate)
			r.Post("/sandbox-token", h.GenerateSandboxToken)
		})
	})

	return r
}
