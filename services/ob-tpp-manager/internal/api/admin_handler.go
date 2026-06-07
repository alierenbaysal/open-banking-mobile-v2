package api

import (
	"net/http"
	"sort"
	"strings"

	"gitlab.bankdhofar.com/ea/open-banking/services/ob-tpp-manager/internal/models"
)

// Admin console endpoints (mounted under requireAdmin). They give Qantara staff
// a view of every partner and every registered application, plus the ability to
// revoke a partner's access. Keycloak is the system of record throughout.

// ListPartners (ADMIN) lists all partner users from Keycloak, newest first.
func (h *Handler) ListPartners(w http.ResponseWriter, r *http.Request) {
	users, err := h.kc.ListUsers()
	if err != nil {
		writeError(w, http.StatusBadGateway, "keycloak_error", "Failed to list partners: "+err.Error())
		return
	}
	items := make([]models.AdminPartner, 0, len(users))
	for i := range users {
		u := users[i]
		// Skip records that never entered the onboarding lifecycle (no onb_status
		// and not flagged as an admin) — these aren't Qantara partners.
		status := attrGet(u.Attributes, attrStatus)
		isAdmin := attrGet(u.Attributes, attrAdmin) == "true"
		if status == "" && !isAdmin {
			continue
		}
		items = append(items, models.AdminPartner{
			Email:        u.Email,
			Name:         u.FirstName,
			Organisation: attrGet(u.Attributes, attrOrg),
			Status:       status,
			IsAdmin:      isAdmin,
			CreatedAt:    u.CreatedTimestamp,
		})
	}
	sort.Slice(items, func(a, b int) bool { return items[a].CreatedAt > items[b].CreatedAt })
	writeJSON(w, http.StatusOK, items)
}

// RevokePartner (ADMIN) disables a partner's Keycloak user (enabled=false,
// onb_status=revoked) and best-effort suspends every TPP they own.
func (h *Handler) RevokePartner(w http.ResponseWriter, r *http.Request) {
	var req models.AdminRevokeRequest
	if err := readJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_request", "Failed to parse request body: "+err.Error())
		return
	}
	email := strings.ToLower(strings.TrimSpace(req.Email))
	if !strings.Contains(email, "@") {
		writeError(w, http.StatusBadRequest, "invalid_request", "A valid email is required")
		return
	}

	u, found, err := h.kc.FindUserByEmail(email)
	if err != nil {
		writeError(w, http.StatusBadGateway, "keycloak_error", "User lookup failed: "+err.Error())
		return
	}
	if !found {
		writeError(w, http.StatusNotFound, "not_found", "No partner with this email")
		return
	}

	if err := h.kc.DisableUser(u.ID); err != nil {
		writeError(w, http.StatusBadGateway, "keycloak_error", "Failed to disable user: "+err.Error())
		return
	}
	if err := h.kc.SetUserAttributes(u.ID, map[string][]string{attrStatus: {statusRevoked}}); err != nil {
		// The account is already disabled; a status-attribute write failure is
		// non-fatal — log and continue so the revoke still reports success.
		h.logger.Warn("revoke: failed to set onb_status=revoked", "email", email, "error", err)
	}

	// Best-effort: suspend every TPP this partner owns.
	suspended := h.suspendOwnedTPPs(email)

	h.logger.Info("revoked partner", "email", email, "tpps_suspended", suspended)
	writeJSON(w, http.StatusOK, map[string]string{"status": statusRevoked})
}

// suspendOwnedTPPs disables the Keycloak clients of every TPP owned by email and
// marks them suspended in the in-memory store. Returns the count suspended.
func (h *Handler) suspendOwnedTPPs(email string) int {
	h.mu.RLock()
	ids := make([]string, 0, len(h.tpps))
	for id := range h.tpps {
		ids = append(ids, id)
	}
	h.mu.RUnlock()

	count := 0
	for _, id := range ids {
		owner := h.tppOwnerEmail(id)
		if owner == "" || !strings.EqualFold(owner, email) {
			continue
		}
		uuid, err := h.resolveClientUUID(id)
		if err != nil {
			h.logger.Warn("revoke: could not resolve client for owned TPP", "tpp", id, "error", err)
			continue
		}
		if err := h.kc.DisableClient(uuid); err != nil {
			h.logger.Warn("revoke: failed to disable client for owned TPP", "tpp", id, "error", err)
			continue
		}
		h.mu.Lock()
		if t, ok := h.tpps[id]; ok {
			t.Status = models.StatusSuspended
		}
		h.mu.Unlock()
		count++
	}
	return count
}

// ListApplications (ADMIN) returns ALL registered TPPs including owner_email so
// the console can show applications alongside their owners. Newest first.
func (h *Handler) ListApplications(w http.ResponseWriter, r *http.Request) {
	h.mu.RLock()
	ids := make([]string, 0, len(h.tpps))
	for id := range h.tpps {
		ids = append(ids, id)
	}
	h.mu.RUnlock()

	list := make([]*models.TPP, 0, len(ids))
	for _, id := range ids {
		// Ensure owner_email is populated (resolves + caches from Keycloak if the
		// in-memory record predates an attribute write / startup sync).
		h.tppOwnerEmail(id)
		h.mu.RLock()
		tpp := h.tpps[id]
		h.mu.RUnlock()
		if tpp != nil {
			list = append(list, tpp)
		}
	}
	sort.Slice(list, func(i, j int) bool {
		return list[i].CreatedAt.After(list[j].CreatedAt)
	})
	writeJSON(w, http.StatusOK, list)
}
