package models

import "time"

// --- Partner onboarding / BFF auth models ---
//
// Keycloak is the system of record (users, passwords). The PIN hash, TOTP secret,
// and onboarding status live as Keycloak USER attributes; the IP allowlist and
// pinned cert thumbprints live as Keycloak CLIENT attributes. Qantara never
// exposes a Keycloak page — every screen is served by the portal and driven by
// this BFF.

// InviteRequest is sent by an admin to invite a partner developer by email.
type InviteRequest struct {
	Email     string `json:"email"`
	Name      string `json:"name,omitempty"`
	TPPClient string `json:"tpp_client_id,omitempty"` // link the user to an existing TPP
	Admin     bool   `json:"admin,omitempty"`         // mint this user as a Qantara admin
}

// SignupRequest is a public, unauthenticated request for sandbox access. It
// creates a PENDING user that an admin must approve before any PIN is sent.
type SignupRequest struct {
	Email        string `json:"email"`
	Name         string `json:"name,omitempty"`
	Organisation string `json:"organisation,omitempty"`
	Message      string `json:"message,omitempty"`
}

// SignupRequestItem is one entry in the admin pending-signups queue.
type SignupRequestItem struct {
	Email        string `json:"email"`
	Name         string `json:"name,omitempty"`
	Organisation string `json:"organisation,omitempty"`
	Message      string `json:"message,omitempty"`
	RequestedAt  int64  `json:"requested_at"`
}

// SignupDecisionRequest approves or rejects a pending signup by email.
type SignupDecisionRequest struct {
	Email string `json:"email"`
	Admin bool   `json:"admin,omitempty"` // optionally mint the approved user as an admin
}

// InviteResponse confirms an invite was created and emailed.
type InviteResponse struct {
	Email     string    `json:"email"`
	Status    string    `json:"status"`
	ExpiresAt time.Time `json:"expires_at"`
	Emailed   bool      `json:"emailed"`
	// DevPIN is only populated when email delivery is disabled (dev/sandbox) so
	// the flow remains testable; never set when a real email was sent.
	DevPIN string `json:"dev_pin,omitempty"`
}

// VerifyPINRequest activates an invite using the emailed one-time PIN.
type VerifyPINRequest struct {
	Email string `json:"email"`
	PIN   string `json:"pin"`
}

// ActivationResponse returns a short-lived ticket authorizing set-password + TOTP.
type ActivationResponse struct {
	Ticket string `json:"ticket"`
	Email  string `json:"email"`
	Name   string `json:"name,omitempty"`
}

// SetPasswordRequest sets the partner's password during activation.
type SetPasswordRequest struct {
	Ticket   string `json:"ticket"`
	Password string `json:"password"`
}

// TOTPInitResponse returns the secret + otpauth URI the portal renders as a QR.
type TOTPInitResponse struct {
	Secret     string `json:"secret"`
	OtpauthURI string `json:"otpauth_uri"`
}

// TOTPInitRequest carries the activation ticket.
type TOTPInitRequest struct {
	Ticket string `json:"ticket"`
}

// TOTPVerifyRequest confirms TOTP enrolment with the first generated code.
type TOTPVerifyRequest struct {
	Ticket string `json:"ticket"`
	Code   string `json:"code"`
}

// LoginRequest is the BFF login (password + TOTP) — Keycloak is never shown.
type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	Code     string `json:"code"` // TOTP
}

// SessionUser is returned by /portal-api/auth/me.
type SessionUser struct {
	Subject string   `json:"sub"`
	Email   string   `json:"email"`
	Name    string   `json:"name,omitempty"`
	TPP     string   `json:"tpp_client_id,omitempty"`
	Roles   []string `json:"roles,omitempty"`
}

// --- Admin partner management ---

// AdminPartner is one row in the admin partner-management console.
type AdminPartner struct {
	Email        string `json:"email"`
	Name         string `json:"name,omitempty"`
	Organisation string `json:"organisation,omitempty"`
	Status       string `json:"status"` // onb_status: invited/pending/active/rejected/revoked
	IsAdmin      bool   `json:"is_admin"`
	CreatedAt    int64  `json:"created_at"` // Keycloak createdTimestamp (epoch millis)
}

// AdminRevokeRequest revokes a partner by email.
type AdminRevokeRequest struct {
	Email string `json:"email"`
}

// --- Self-service IP allowlist ---

// IPAllowlistRequest sets the partner's allowed source CIDRs.
type IPAllowlistRequest struct {
	CIDRs []string `json:"cidrs"`
}

// IPAllowlistResponse returns the current allowlist for a TPP.
type IPAllowlistResponse struct {
	TPPClient string   `json:"tpp_client_id"`
	CIDRs     []string `json:"cidrs"`
}

// --- mTLS certificate (bring-your-own is the normal path) ---

// CertGenerateRequest asks Qantara to generate a keypair for the partner
// (convenience only — the partner downloads the private key once).
type CertGenerateRequest struct {
	CommonName string `json:"common_name,omitempty"`
}

// CertGenerateResponse returns a freshly generated keypair. The private key is
// shown exactly once and never stored server-side.
type CertGenerateResponse struct {
	CertificatePEM string           `json:"certificate_pem"`
	PrivateKeyPEM  string           `json:"private_key_pem"`
	Certificate    *CertificateInfo `json:"certificate"`
}

// GatewayTPPConfig is the per-TPP enforcement view consumed by the DMZ reconciler
// (trust bundle + IP-allowlist AuthorizationPolicy).
type GatewayTPPConfig struct {
	TPPClient   string   `json:"tpp_client_id"`
	Thumbprints []string `json:"thumbprints"`         // pinned SHA-256 cert thumbprints
	CertPEMs    []string `json:"cert_pems,omitempty"` // BYO anchors for the trust bundle
	AllowedIPs  []string `json:"allowed_ips,omitempty"`
}

// GatewayConfig is the full reconciler payload.
type GatewayConfig struct {
	TPPs        []GatewayTPPConfig `json:"tpps"`
	GeneratedAt time.Time          `json:"generated_at"`
}
