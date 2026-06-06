package api

import (
	"fmt"
	"net"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"

	"gitlab.bankdhofar.com/ea/open-banking/services/ob-tpp-manager/internal/certs"
	"gitlab.bankdhofar.com/ea/open-banking/services/ob-tpp-manager/internal/models"
)

// Keycloak CLIENT-attribute keys used for per-TPP edge enforcement.
const (
	clAttrAllowedIPs   = "allowed_ips"          // CSV of CIDRs
	clAttrThumbprints  = "pinned_thumbprints"   // CSV of SHA-256 hex (matches Istio XFCC Hash=)
	clAttrCertPEM      = "byo_cert_pem"          // most-recent bring-your-own anchor for the trust bundle
	clAttrCertBound    = "tls.client.certificate.bound.access.tokens"
)

// SetIPAllowlist stores the partner's allowed source CIDRs on their Keycloak client.
// The DMZ reconciler turns these into an Istio AuthorizationPolicy.
func (h *Handler) SetIPAllowlist(w http.ResponseWriter, r *http.Request) {
	tppID := chi.URLParam(r, "tppId")
	if !h.tppSelfOrAdmin(r, tppID) {
		writeError(w, http.StatusForbidden, "forbidden", "Not authorized for this TPP")
		return
	}
	var req models.IPAllowlistRequest
	if err := readJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_request", "Failed to parse request body: "+err.Error())
		return
	}
	cidrs, err := normalizeCIDRs(req.CIDRs)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid_cidr", err.Error())
		return
	}
	uuid, err := h.resolveClientUUID(tppID)
	if err != nil {
		writeError(w, http.StatusNotFound, "not_found", err.Error())
		return
	}
	if err := h.kc.SetClientAttributes(uuid, map[string]string{clAttrAllowedIPs: strings.Join(cidrs, ",")}); err != nil {
		writeError(w, http.StatusBadGateway, "keycloak_error", err.Error())
		return
	}
	h.logger.Info("updated IP allowlist", "tpp", tppID, "cidrs", cidrs)
	writeJSON(w, http.StatusOK, models.IPAllowlistResponse{TPPClient: tppID, CIDRs: cidrs})
}

// GetIPAllowlist returns the partner's current allowlist.
func (h *Handler) GetIPAllowlist(w http.ResponseWriter, r *http.Request) {
	tppID := chi.URLParam(r, "tppId")
	if !h.tppSelfOrAdmin(r, tppID) {
		writeError(w, http.StatusForbidden, "forbidden", "Not authorized for this TPP")
		return
	}
	uuid, err := h.resolveClientUUID(tppID)
	if err != nil {
		writeError(w, http.StatusNotFound, "not_found", err.Error())
		return
	}
	attrs, err := h.kc.GetClientAttributes(uuid)
	if err != nil {
		writeError(w, http.StatusBadGateway, "keycloak_error", err.Error())
		return
	}
	writeJSON(w, http.StatusOK, models.IPAllowlistResponse{
		TPPClient: tppID,
		CIDRs:     splitCSV(attrs[clAttrAllowedIPs]),
	})
}

// GenerateCert is the convenience path: Qantara generates a keypair, pins it, and
// returns the private key exactly once. Bring-your-own (UploadCertificate) is the
// normal path.
func (h *Handler) GenerateCert(w http.ResponseWriter, r *http.Request) {
	tppID := chi.URLParam(r, "tppId")
	if !h.tppSelfOrAdmin(r, tppID) {
		writeError(w, http.StatusForbidden, "forbidden", "Not authorized for this TPP")
		return
	}
	var req models.CertGenerateRequest
	_ = readJSON(r, &req)
	cn := req.CommonName
	if cn == "" {
		cn = tppID
	}
	certPEM, keyPEM, info, err := certs.GenerateKeypair(cn)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "cert_error", err.Error())
		return
	}
	if err := h.pinCertToClient(tppID, info, certPEM); err != nil {
		writeError(w, http.StatusBadGateway, "keycloak_error", err.Error())
		return
	}
	h.logger.Info("generated keypair for TPP", "tpp", tppID, "thumbprint", info.Thumbprint)
	writeJSON(w, http.StatusOK, models.CertGenerateResponse{
		CertificatePEM: certPEM,
		PrivateKeyPEM:  keyPEM,
		Certificate:    info,
	})
}

// pinCertToClient records a cert thumbprint + anchor on the TPP's Keycloak client,
// enables cert-bound tokens, and uploads the cert to Keycloak. Shared by BYO
// upload and the generate path.
func (h *Handler) pinCertToClient(tppID string, info *models.CertificateInfo, pemCert string) error {
	uuid, err := h.resolveClientUUID(tppID)
	if err != nil {
		return err
	}
	attrs, err := h.kc.GetClientAttributes(uuid)
	if err != nil {
		return err
	}
	thumbs := appendUnique(splitCSV(attrs[clAttrThumbprints]), info.Thumbprint)
	if err := h.kc.SetClientAttributes(uuid, map[string]string{
		clAttrThumbprints: strings.Join(thumbs, ","),
		clAttrCertPEM:     pemCert,
		clAttrCertBound:   "true",
	}); err != nil {
		return err
	}
	if err := h.kc.UploadClientCertificate(uuid, pemCert); err != nil {
		h.logger.Warn("keycloak cert upload failed (thumbprint still pinned)", "tpp", tppID, "error", err)
	}
	h.mu.Lock()
	if tpp, ok := h.tpps[tppID]; ok {
		tpp.Certificate = info
		tpp.UpdatedAt = time.Now().UTC()
	}
	h.mu.Unlock()
	return nil
}

// GatewayConfig returns the per-TPP enforcement view for the DMZ reconciler
// (trust anchors + pinned thumbprints + IP allowlists). Gated by an internal key.
func (h *Handler) GatewayConfig(w http.ResponseWriter, r *http.Request) {
	clients, err := h.kc.ListClients()
	if err != nil {
		writeError(w, http.StatusBadGateway, "keycloak_error", err.Error())
		return
	}
	cfg := models.GatewayConfig{GeneratedAt: time.Now().UTC()}
	for _, cl := range clients {
		clientID, _ := cl["clientId"].(string)
		if !strings.HasPrefix(clientID, "tpp-") {
			continue
		}
		attrs := stringAttrs(cl["attributes"])
		thumbs := splitCSV(attrs[clAttrThumbprints])
		ips := splitCSV(attrs[clAttrAllowedIPs])
		pem := attrs[clAttrCertPEM]
		if len(thumbs) == 0 && len(ips) == 0 {
			continue
		}
		tc := models.GatewayTPPConfig{TPPClient: clientID, Thumbprints: thumbs, AllowedIPs: ips}
		if pem != "" {
			tc.CertPEMs = []string{pem}
		}
		cfg.TPPs = append(cfg.TPPs, tc)
	}
	writeJSON(w, http.StatusOK, cfg)
}

// --- helpers ---

func (h *Handler) resolveClientUUID(tppID string) (string, error) {
	h.mu.RLock()
	uuid := h.kcIDs[tppID]
	h.mu.RUnlock()
	if uuid != "" {
		return uuid, nil
	}
	uuid, found, err := h.kc.FindClientByClientID(tppID)
	if err != nil {
		return "", fmt.Errorf("keycloak lookup failed: %w", err)
	}
	if !found {
		return "", fmt.Errorf("TPP %s has no Keycloak client", tppID)
	}
	h.mu.Lock()
	h.kcIDs[tppID] = uuid
	h.mu.Unlock()
	return uuid, nil
}

func normalizeCIDRs(in []string) ([]string, error) {
	out := make([]string, 0, len(in))
	for _, raw := range in {
		s := strings.TrimSpace(raw)
		if s == "" {
			continue
		}
		if !strings.Contains(s, "/") {
			ip := net.ParseIP(s)
			if ip == nil {
				return nil, fmt.Errorf("invalid IP: %q", raw)
			}
			if ip.To4() != nil {
				s += "/32"
			} else {
				s += "/128"
			}
		}
		if _, _, err := net.ParseCIDR(s); err != nil {
			return nil, fmt.Errorf("invalid CIDR: %q", raw)
		}
		out = append(out, s)
	}
	return out, nil
}

func splitCSV(s string) []string {
	if strings.TrimSpace(s) == "" {
		return nil
	}
	parts := strings.Split(s, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		if t := strings.TrimSpace(p); t != "" {
			out = append(out, t)
		}
	}
	return out
}

func appendUnique(list []string, v string) []string {
	for _, x := range list {
		if x == v {
			return list
		}
	}
	return append(list, v)
}

func stringAttrs(v interface{}) map[string]string {
	out := map[string]string{}
	m, ok := v.(map[string]interface{})
	if !ok {
		return out
	}
	for k, val := range m {
		switch t := val.(type) {
		case string:
			out[k] = t
		case []interface{}:
			if len(t) > 0 {
				if s, ok := t[0].(string); ok {
					out[k] = s
				}
			}
		}
	}
	return out
}
