package api

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"sort"
	"sync"
	"time"

	"github.com/go-chi/chi/v5"

	"gitlab.bankdhofar.com/ea/open-banking/services/ob-tpp-manager/internal/certs"
	"gitlab.bankdhofar.com/ea/open-banking/services/ob-tpp-manager/internal/keycloak"
	"gitlab.bankdhofar.com/ea/open-banking/services/ob-tpp-manager/internal/models"
)

// Handler holds all HTTP handler dependencies.
type Handler struct {
	kc                *keycloak.Client
	certMgr           *certs.Manager
	consentServiceURL string
	logger            *slog.Logger

	// In-memory TPP store. In production this would be backed by a database;
	// the consent-service's TPP registry is the persistent store.
	mu   sync.RWMutex
	tpps map[string]*models.TPP
	// Maps clientID → Keycloak internal UUID for secret operations.
	kcIDs map[string]string
}

// NewHandler creates a handler with all required dependencies.
func NewHandler(kc *keycloak.Client, certMgr *certs.Manager, consentServiceURL string, logger *slog.Logger) *Handler {
	return &Handler{
		kc:                kc,
		certMgr:           certMgr,
		consentServiceURL: consentServiceURL,
		logger:            logger,
		tpps:              make(map[string]*models.TPP),
		kcIDs:             make(map[string]string),
	}
}

// Health responds with service health status.
func (h *Handler) Health(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, models.HealthResponse{
		Status:  "healthy",
		Service: "ob-tpp-manager",
	})
}

// Register handles TPP registration: validates input, registers with the
// consent service, creates a Keycloak client, and returns credentials.
func (h *Handler) Register(w http.ResponseWriter, r *http.Request) {
	var req models.RegisterRequest
	if err := readJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_request", "Failed to parse request body: "+err.Error())
		return
	}

	// Validate required fields.
	if req.Name == "" {
		writeError(w, http.StatusBadRequest, "invalid_request", "Field 'name' is required")
		return
	}
	if len(req.RedirectURIs) == 0 {
		writeError(w, http.StatusBadRequest, "invalid_request", "At least one redirect_uri is required")
		return
	}
	if len(req.Roles) == 0 {
		writeError(w, http.StatusBadRequest, "invalid_request", "At least one role (AISP, PISP, CBPII) is required")
		return
	}
	if !models.ValidRoles(req.Roles) {
		writeError(w, http.StatusBadRequest, "invalid_request", "Invalid role; allowed values: AISP, PISP, CBPII")
		return
	}

	clientID := req.ClientID
	if clientID == "" {
		clientID = fmt.Sprintf("tpp-%s", generateID())
	}
	tppID := clientID
	now := time.Now().UTC()

	h.mu.RLock()
	if _, exists := h.tpps[tppID]; exists {
		h.mu.RUnlock()
		writeError(w, http.StatusConflict, "already_exists",
			fmt.Sprintf("TPP with client_id '%s' is already registered", clientID))
		return
	}
	h.mu.RUnlock()

	tpp := &models.TPP{
		ID:             tppID,
		Name:           req.Name,
		Description:    req.Description,
		RedirectURIs:   req.RedirectURIs,
		Roles:          req.Roles,
		Status:         models.StatusActive,
		ClientID:       clientID,
		OrganisationID: req.OrganisationID,
		SoftwareID:     req.SoftwareID,
		ContactEmail:   req.ContactEmail,
		CreatedAt:      now,
		UpdatedAt:      now,
	}

	// Step 1: Register with consent service.
	if err := h.registerWithConsentService(tpp); err != nil {
		h.logger.Error("consent service registration failed", "error", err, "tpp_id", tppID)
		writeError(w, http.StatusBadGateway, "consent_service_error",
			"Failed to register with consent service: "+err.Error())
		return
	}

	// Step 2: Create Keycloak client.
	kcID, err := h.kc.CreateClient(req.Name, clientID, req.RedirectURIs, req.Roles)
	if err != nil {
		h.logger.Error("keycloak client creation failed", "error", err, "tpp_id", tppID)
		writeError(w, http.StatusBadGateway, "keycloak_error",
			"Failed to create Keycloak client: "+err.Error())
		return
	}

	// Step 3: Retrieve the generated client secret.
	secret, err := h.kc.GetClientSecret(kcID)
	if err != nil {
		h.logger.Error("failed to retrieve client secret", "error", err, "tpp_id", tppID)
		writeError(w, http.StatusInternalServerError, "keycloak_error",
			"Client created but failed to retrieve secret: "+err.Error())
		return
	}

	// Store in local registry.
	h.mu.Lock()
	h.tpps[tppID] = tpp
	h.kcIDs[clientID] = kcID
	h.mu.Unlock()

	h.logger.Info("registered new TPP", "tpp_id", tppID, "client_id", clientID, "roles", req.Roles)

	// Return registration result with credentials.
	type registerResponse struct {
		*models.TPP
		ClientSecret string `json:"client_secret"`
	}
	writeJSON(w, http.StatusCreated, registerResponse{
		TPP:          tpp,
		ClientSecret: secret,
	})
}

// GetTPP returns details for a single TPP.
func (h *Handler) GetTPP(w http.ResponseWriter, r *http.Request) {
	tppID := chi.URLParam(r, "tppId")

	h.mu.RLock()
	tpp, ok := h.tpps[tppID]
	h.mu.RUnlock()

	if !ok {
		writeError(w, http.StatusNotFound, "not_found", fmt.Sprintf("TPP %s not found", tppID))
		return
	}

	writeJSON(w, http.StatusOK, tpp)
}

// UpdateTPP updates a TPP's mutable fields and syncs to Keycloak.
func (h *Handler) UpdateTPP(w http.ResponseWriter, r *http.Request) {
	tppID := chi.URLParam(r, "tppId")

	h.mu.RLock()
	tpp, ok := h.tpps[tppID]
	h.mu.RUnlock()

	if !ok {
		writeError(w, http.StatusNotFound, "not_found", fmt.Sprintf("TPP %s not found", tppID))
		return
	}

	var req models.UpdateRequest
	if err := readJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_request", "Failed to parse request body: "+err.Error())
		return
	}

	if len(req.Roles) > 0 && !models.ValidRoles(req.Roles) {
		writeError(w, http.StatusBadRequest, "invalid_request", "Invalid role; allowed values: AISP, PISP, CBPII")
		return
	}

	// Apply updates.
	h.mu.Lock()
	if req.Name != "" {
		tpp.Name = req.Name
	}
	if req.Description != "" {
		tpp.Description = req.Description
	}
	if len(req.RedirectURIs) > 0 {
		tpp.RedirectURIs = req.RedirectURIs
	}
	if len(req.Roles) > 0 {
		tpp.Roles = req.Roles
	}
	if req.ContactEmail != "" {
		tpp.ContactEmail = req.ContactEmail
	}
	tpp.UpdatedAt = time.Now().UTC()
	h.mu.Unlock()

	// Sync changes to Keycloak.
	h.mu.RLock()
	kcID := h.kcIDs[tpp.ClientID]
	h.mu.RUnlock()

	if kcID != "" {
		if err := h.kc.UpdateClient(kcID, tpp.Name, tpp.RedirectURIs, tpp.Roles); err != nil {
			h.logger.Error("failed to update keycloak client", "error", err, "tpp_id", tppID)
			writeError(w, http.StatusBadGateway, "keycloak_error",
				"TPP updated locally but Keycloak sync failed: "+err.Error())
			return
		}
	}

	h.logger.Info("updated TPP", "tpp_id", tppID)
	writeJSON(w, http.StatusOK, tpp)
}

// SuspendTPP marks a TPP as suspended and disables the Keycloak client.
func (h *Handler) SuspendTPP(w http.ResponseWriter, r *http.Request) {
	tppID := chi.URLParam(r, "tppId")

	h.mu.RLock()
	tpp, ok := h.tpps[tppID]
	h.mu.RUnlock()

	if !ok {
		writeError(w, http.StatusNotFound, "not_found", fmt.Sprintf("TPP %s not found", tppID))
		return
	}

	// Disable in Keycloak.
	h.mu.RLock()
	kcID := h.kcIDs[tpp.ClientID]
	h.mu.RUnlock()

	if kcID != "" {
		if err := h.kc.DisableClient(kcID); err != nil {
			h.logger.Error("failed to disable keycloak client", "error", err, "tpp_id", tppID)
			writeError(w, http.StatusBadGateway, "keycloak_error",
				"Failed to disable Keycloak client: "+err.Error())
			return
		}
	}

	h.mu.Lock()
	tpp.Status = models.StatusSuspended
	tpp.UpdatedAt = time.Now().UTC()
	h.mu.Unlock()

	h.logger.Info("suspended TPP", "tpp_id", tppID)
	writeJSON(w, http.StatusOK, tpp)
}

// ListTPPs returns all registered TPPs sorted by creation time (newest first).
func (h *Handler) ListTPPs(w http.ResponseWriter, r *http.Request) {
	h.mu.RLock()
	list := make([]*models.TPP, 0, len(h.tpps))
	for _, tpp := range h.tpps {
		list = append(list, tpp)
	}
	h.mu.RUnlock()

	sort.Slice(list, func(i, j int) bool {
		return list[i].CreatedAt.After(list[j].CreatedAt)
	})

	writeJSON(w, http.StatusOK, list)
}

// GenerateCredentials regenerates client credentials for a TPP.
func (h *Handler) GenerateCredentials(w http.ResponseWriter, r *http.Request) {
	tppID := chi.URLParam(r, "tppId")

	h.mu.RLock()
	tpp, ok := h.tpps[tppID]
	h.mu.RUnlock()

	if !ok {
		writeError(w, http.StatusNotFound, "not_found", fmt.Sprintf("TPP %s not found", tppID))
		return
	}

	h.mu.RLock()
	kcID := h.kcIDs[tpp.ClientID]
	h.mu.RUnlock()

	if kcID == "" {
		writeError(w, http.StatusInternalServerError, "internal_error", "No Keycloak client mapping found")
		return
	}

	secret, err := h.kc.RegenerateClientSecret(kcID)
	if err != nil {
		h.logger.Error("failed to regenerate credentials", "error", err, "tpp_id", tppID)
		writeError(w, http.StatusBadGateway, "keycloak_error",
			"Failed to regenerate client credentials: "+err.Error())
		return
	}

	h.logger.Info("regenerated credentials for TPP", "tpp_id", tppID)
	writeJSON(w, http.StatusOK, models.CredentialsResponse{
		ClientID:     tpp.ClientID,
		ClientSecret: secret,
	})
}

// UploadCertificate accepts a PEM certificate, validates it, stores metadata,
// and uploads it to Keycloak.
func (h *Handler) UploadCertificate(w http.ResponseWriter, r *http.Request) {
	tppID := chi.URLParam(r, "tppId")

	h.mu.RLock()
	tpp, ok := h.tpps[tppID]
	h.mu.RUnlock()

	if !ok {
		writeError(w, http.StatusNotFound, "not_found", fmt.Sprintf("TPP %s not found", tppID))
		return
	}

	var req models.CertificateUploadRequest
	if err := readJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_request", "Failed to parse request body: "+err.Error())
		return
	}

	if req.CertificatePEM == "" {
		writeError(w, http.StatusBadRequest, "invalid_request", "Field 'certificate_pem' is required")
		return
	}

	// Parse and validate the certificate.
	certInfo, err := h.certMgr.ParseAndValidate(req.CertificatePEM)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid_certificate", err.Error())
		return
	}

	// Upload to Keycloak for mTLS binding.
	h.mu.RLock()
	kcID := h.kcIDs[tpp.ClientID]
	h.mu.RUnlock()

	if kcID != "" {
		if err := h.kc.UploadClientCertificate(kcID, req.CertificatePEM); err != nil {
			h.logger.Error("failed to upload certificate to keycloak", "error", err, "tpp_id", tppID)
			writeError(w, http.StatusBadGateway, "keycloak_error",
				"Certificate valid but Keycloak upload failed: "+err.Error())
			return
		}
	}

	// Store certificate metadata on the TPP record.
	h.mu.Lock()
	tpp.Certificate = certInfo
	tpp.UpdatedAt = time.Now().UTC()
	h.mu.Unlock()

	h.logger.Info("uploaded certificate for TPP",
		"tpp_id", tppID,
		"subject", certInfo.Subject,
		"thumbprint", certInfo.Thumbprint,
		"expires", certInfo.NotAfter.Format(time.RFC3339))

	writeJSON(w, http.StatusOK, certInfo)
}

// GetCertificate returns the stored certificate metadata for a TPP.
func (h *Handler) GetCertificate(w http.ResponseWriter, r *http.Request) {
	tppID := chi.URLParam(r, "tppId")

	h.mu.RLock()
	tpp, ok := h.tpps[tppID]
	h.mu.RUnlock()

	if !ok {
		writeError(w, http.StatusNotFound, "not_found", fmt.Sprintf("TPP %s not found", tppID))
		return
	}

	if tpp.Certificate == nil {
		writeError(w, http.StatusNotFound, "not_found", "No certificate uploaded for this TPP")
		return
	}

	writeJSON(w, http.StatusOK, tpp.Certificate)
}

// GenerateSandboxToken generates a pre-authorized access token for sandbox testing.
func (h *Handler) GenerateSandboxToken(w http.ResponseWriter, r *http.Request) {
	tppID := chi.URLParam(r, "tppId")

	h.mu.RLock()
	tpp, ok := h.tpps[tppID]
	h.mu.RUnlock()

	if !ok {
		writeError(w, http.StatusNotFound, "not_found", fmt.Sprintf("TPP %s not found", tppID))
		return
	}

	if tpp.Status != models.StatusActive {
		writeError(w, http.StatusForbidden, "forbidden", "TPP is not active")
		return
	}

	var req models.SandboxTokenRequest
	// Body is optional for sandbox token.
	_ = readJSON(r, &req)

	// Determine scopes: use requested scopes if provided, otherwise derive from TPP roles.
	scopes := req.Scopes
	if len(scopes) == 0 {
		scopes = models.ScopesForRoles(tpp.Roles)
	}

	// Retrieve the current client secret from Keycloak.
	h.mu.RLock()
	kcID := h.kcIDs[tpp.ClientID]
	h.mu.RUnlock()

	if kcID == "" {
		writeError(w, http.StatusInternalServerError, "internal_error", "No Keycloak client mapping found")
		return
	}

	secret, err := h.kc.GetClientSecret(kcID)
	if err != nil {
		h.logger.Error("failed to get client secret for sandbox token", "error", err, "tpp_id", tppID)
		writeError(w, http.StatusBadGateway, "keycloak_error",
			"Failed to retrieve client credentials: "+err.Error())
		return
	}

	tokenResp, err := h.kc.GetSandboxToken(tpp.ClientID, secret, scopes)
	if err != nil {
		h.logger.Error("failed to generate sandbox token", "error", err, "tpp_id", tppID)
		writeError(w, http.StatusBadGateway, "keycloak_error",
			"Failed to generate sandbox token: "+err.Error())
		return
	}

	h.logger.Info("generated sandbox token for TPP", "tpp_id", tppID, "scopes", scopes)
	writeJSON(w, http.StatusOK, tokenResp)
}

// registerWithConsentService creates a TPP entry in the consent service registry.
func (h *Handler) registerWithConsentService(tpp *models.TPP) error {
	isAISP := false
	isPISP := false
	isCISP := false
	for _, r := range tpp.Roles {
		switch r {
		case models.RoleAISP:
			isAISP = true
		case models.RolePISP:
			isPISP = true
		case models.RoleCBPII:
			isCISP = true
		}
	}

	payload := map[string]interface{}{
		"tpp_id":        tpp.ID,
		"tpp_name":      tpp.Name,
		"client_id":     tpp.ClientID,
		"redirect_uris": tpp.RedirectURIs,
		"is_aisp":       isAISP,
		"is_pisp":       isPISP,
		"is_cisp":       isCISP,
		"status":        "Active",
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal consent service payload: %w", err)
	}

	url := fmt.Sprintf("%s/tpp", h.consentServiceURL)
	resp, err := http.Post(url, "application/json", bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("consent service request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("consent service returned %d: %s", resp.StatusCode, string(respBody))
	}

	return nil
}

// --- JSON helpers ---

func readJSON(r *http.Request, v interface{}) error {
	if r.Body == nil {
		return fmt.Errorf("empty request body")
	}
	defer r.Body.Close()

	decoder := json.NewDecoder(io.LimitReader(r.Body, 1<<20)) // 1 MB limit
	decoder.DisallowUnknownFields()
	return decoder.Decode(v)
}

func writeJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(v); err != nil {
		slog.Error("failed to write JSON response", "error", err)
	}
}

func writeError(w http.ResponseWriter, status int, errCode, message string) {
	writeJSON(w, status, models.ErrorResponse{
		Error:   errCode,
		Message: message,
	})
}

// generateID produces a time-based unique identifier suitable for TPP IDs.
func generateID() string {
	return fmt.Sprintf("%d", time.Now().UnixNano())
}
