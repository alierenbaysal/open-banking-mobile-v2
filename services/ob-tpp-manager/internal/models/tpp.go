package models

import "time"

// TPPRole defines the Open Banking roles a TPP can hold.
type TPPRole string

const (
	RoleAISP  TPPRole = "AISP"  // Account Information Service Provider
	RolePISP  TPPRole = "PISP"  // Payment Initiation Service Provider
	RoleCBPII TPPRole = "CBPII" // Card-Based Payment Instrument Issuer
)

// TPPStatus represents the lifecycle state of a TPP registration.
type TPPStatus string

const (
	StatusActive    TPPStatus = "active"
	StatusSuspended TPPStatus = "suspended"
	StatusPending   TPPStatus = "pending"
)

// TPP represents a Third-Party Provider registration.
type TPP struct {
	ID              string            `json:"id"`
	Name            string            `json:"name"`
	Description     string            `json:"description,omitempty"`
	RedirectURIs    []string          `json:"redirect_uris"`
	Roles           []TPPRole         `json:"roles"`
	Status          TPPStatus         `json:"status"`
	ClientID        string            `json:"client_id"`
	OrganisationID  string            `json:"organisation_id,omitempty"`
	SoftwareID      string            `json:"software_id,omitempty"`
	ContactEmail    string            `json:"contact_email,omitempty"`
	Certificate     *CertificateInfo  `json:"certificate,omitempty"`
	CreatedAt       time.Time         `json:"created_at"`
	UpdatedAt       time.Time         `json:"updated_at"`
}

// RegisterRequest is the payload for TPP registration.
type RegisterRequest struct {
	Name           string    `json:"name"`
	Description    string    `json:"description,omitempty"`
	RedirectURIs   []string  `json:"redirect_uris"`
	Roles          []TPPRole `json:"roles"`
	OrganisationID string    `json:"organisation_id,omitempty"`
	SoftwareID     string    `json:"software_id,omitempty"`
	ContactEmail   string    `json:"contact_email,omitempty"`
}

// UpdateRequest is the payload for updating a TPP registration.
type UpdateRequest struct {
	Name         string    `json:"name,omitempty"`
	Description  string    `json:"description,omitempty"`
	RedirectURIs []string  `json:"redirect_uris,omitempty"`
	Roles        []TPPRole `json:"roles,omitempty"`
	ContactEmail string    `json:"contact_email,omitempty"`
}

// CredentialsResponse is returned when generating new client credentials.
type CredentialsResponse struct {
	ClientID     string `json:"client_id"`
	ClientSecret string `json:"client_secret"`
}

// CertificateInfo holds metadata extracted from an uploaded X.509 certificate.
type CertificateInfo struct {
	Subject      string    `json:"subject"`
	Issuer       string    `json:"issuer"`
	SerialNumber string    `json:"serial_number"`
	NotBefore    time.Time `json:"not_before"`
	NotAfter     time.Time `json:"not_after"`
	Thumbprint   string    `json:"thumbprint"`
	UploadedAt   time.Time `json:"uploaded_at"`
}

// CertificateUploadRequest carries a PEM-encoded certificate.
type CertificateUploadRequest struct {
	CertificatePEM string `json:"certificate_pem"`
}

// SandboxTokenRequest defines optional scopes for sandbox token generation.
type SandboxTokenRequest struct {
	Scopes []string `json:"scopes,omitempty"`
}

// SandboxTokenResponse is the sandbox access token returned to the TPP.
type SandboxTokenResponse struct {
	AccessToken string `json:"access_token"`
	TokenType   string `json:"token_type"`
	ExpiresIn   int    `json:"expires_in"`
	Scope       string `json:"scope"`
}

// ErrorResponse is a standard JSON error envelope.
type ErrorResponse struct {
	Error   string `json:"error"`
	Message string `json:"message"`
}

// HealthResponse is the health check response.
type HealthResponse struct {
	Status  string `json:"status"`
	Service string `json:"service"`
}

// ValidRoles returns true if every role in the slice is a known TPP role.
func ValidRoles(roles []TPPRole) bool {
	valid := map[TPPRole]bool{
		RoleAISP:  true,
		RolePISP:  true,
		RoleCBPII: true,
	}
	for _, r := range roles {
		if !valid[r] {
			return false
		}
	}
	return true
}

// ScopesForRoles maps TPP roles to their corresponding OAuth scopes.
func ScopesForRoles(roles []TPPRole) []string {
	scopeSet := make(map[string]bool)
	for _, r := range roles {
		switch r {
		case RoleAISP:
			scopeSet["accounts"] = true
		case RolePISP:
			scopeSet["payments"] = true
		case RoleCBPII:
			scopeSet["fundsconfirmations"] = true
		}
	}
	// Always include openid
	scopeSet["openid"] = true

	scopes := make([]string, 0, len(scopeSet))
	for s := range scopeSet {
		scopes = append(scopes, s)
	}
	return scopes
}
