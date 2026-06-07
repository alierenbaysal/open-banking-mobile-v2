package api

import (
	"net/http"
	"sort"
	"strconv"
	"strings"
	"time"

	"gitlab.bankdhofar.com/ea/open-banking/services/ob-tpp-manager/internal/models"
)

// Gated self-signup with admin approval.
//
// A stranger self-requests access via the public Signup endpoint: this creates a
// PENDING Keycloak user with NO PIN and sends NO email. The request surfaces in
// an admin queue (SignupRequests). An admin approves — running the shared invite
// flow (PIN + email + role) — or rejects. Admins may still invite directly via
// the existing /auth/invite endpoint.

// Signup (PUBLIC, no auth) records a pending access request. No PIN, no email.
func (h *Handler) Signup(w http.ResponseWriter, r *http.Request) {
	var req models.SignupRequest
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
	if found {
		switch attrGet(u.Attributes, attrStatus) {
		case statusActive:
			writeError(w, http.StatusConflict, "already_registered", "This email is already registered")
			return
		case statusPending, statusInvited:
			writeJSON(w, http.StatusOK, map[string]string{"status": "already_pending"})
			return
		}
	}

	attrs := map[string][]string{
		attrStatus: {statusPending},
		attrReqAt:  {strconv.FormatInt(time.Now().Unix(), 10)},
	}
	if req.Organisation != "" {
		attrs[attrOrg] = []string{req.Organisation}
	}
	if req.Message != "" {
		attrs[attrMsg] = []string{req.Message}
	}

	if found {
		// Update the existing (non-active) user back into the pending queue.
		if err := h.kc.SetUserAttributes(u.ID, attrs); err != nil {
			writeError(w, http.StatusBadGateway, "keycloak_error", "Failed to record request: "+err.Error())
			return
		}
	} else {
		if _, cerr := h.kc.CreateUser(email, req.Name, attrs); cerr != nil {
			writeError(w, http.StatusBadGateway, "keycloak_error", "Failed to create user: "+cerr.Error())
			return
		}
	}

	h.logger.Info("self-signup request recorded", "email", email, "org", req.Organisation)
	writeJSON(w, http.StatusCreated, map[string]string{"status": "pending_approval"})
}

// SignupRequests (ADMIN) lists pending self-signup requests, newest first.
func (h *Handler) SignupRequests(w http.ResponseWriter, r *http.Request) {
	users, err := h.kc.ListUsersByAttribute(attrStatus, statusPending)
	if err != nil {
		writeError(w, http.StatusBadGateway, "keycloak_error", "Failed to list requests: "+err.Error())
		return
	}
	items := make([]models.SignupRequestItem, 0, len(users))
	for i := range users {
		u := users[i]
		reqAt, _ := strconv.ParseInt(attrGet(u.Attributes, attrReqAt), 10, 64)
		items = append(items, models.SignupRequestItem{
			Email:        u.Email,
			Name:         u.FirstName,
			Organisation: attrGet(u.Attributes, attrOrg),
			Message:      attrGet(u.Attributes, attrMsg),
			RequestedAt:  reqAt,
		})
	}
	sort.Slice(items, func(a, b int) bool { return items[a].RequestedAt > items[b].RequestedAt })
	writeJSON(w, http.StatusOK, items)
}

// ApproveSignup (ADMIN) approves a pending request: runs the shared invite flow
// (PIN + email + role), moving the user to status=invited.
func (h *Handler) ApproveSignup(w http.ResponseWriter, r *http.Request) {
	var req models.SignupDecisionRequest
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
	if !found || attrGet(u.Attributes, attrStatus) != statusPending {
		writeError(w, http.StatusNotFound, "not_found", "No pending request for this email")
		return
	}

	resp, err := h.sendInvite(u.ID, email, u.FirstName, attrGet(u.Attributes, attrTPP), req.Admin)
	if err != nil {
		writeError(w, http.StatusBadGateway, "keycloak_error", err.Error())
		return
	}
	h.logger.Info("approved self-signup", "email", email, "emailed", resp.Emailed, "admin", req.Admin)
	writeJSON(w, http.StatusOK, resp)
}

// RejectSignup (ADMIN) rejects a pending request: marks status=rejected and
// clears any pin attributes. The user record is kept.
func (h *Handler) RejectSignup(w http.ResponseWriter, r *http.Request) {
	var req models.SignupDecisionRequest
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
		writeError(w, http.StatusNotFound, "not_found", "No request for this email")
		return
	}
	if err := h.kc.SetUserAttributes(u.ID, map[string][]string{
		attrStatus:  {statusRejected},
		attrPinHash: nil,
		attrPinSalt: nil,
		attrPinExp:  nil,
	}); err != nil {
		writeError(w, http.StatusBadGateway, "keycloak_error", err.Error())
		return
	}
	h.logger.Info("rejected self-signup", "email", email)
	writeJSON(w, http.StatusOK, map[string]string{"status": "rejected"})
}
