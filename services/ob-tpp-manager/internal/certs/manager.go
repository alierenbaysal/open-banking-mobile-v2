package certs

import (
	"crypto/sha256"
	"crypto/x509"
	"encoding/hex"
	"encoding/pem"
	"fmt"
	"time"

	"gitlab.bankdhofar.com/ea/open-banking/services/ob-tpp-manager/internal/models"
)

// Manager provides X.509 certificate parsing, validation, and metadata extraction.
type Manager struct{}

// NewManager creates a new certificate manager.
func NewManager() *Manager {
	return &Manager{}
}

// ParseAndValidate accepts a PEM-encoded certificate string, parses it, validates
// the basic structure and expiry, and returns extracted metadata.
func (m *Manager) ParseAndValidate(pemData string) (*models.CertificateInfo, error) {
	block, _ := pem.Decode([]byte(pemData))
	if block == nil {
		return nil, fmt.Errorf("failed to decode PEM block: no valid PEM data found")
	}

	if block.Type != "CERTIFICATE" {
		return nil, fmt.Errorf("PEM block type is %q, expected CERTIFICATE", block.Type)
	}

	cert, err := x509.ParseCertificate(block.Bytes)
	if err != nil {
		return nil, fmt.Errorf("failed to parse X.509 certificate: %w", err)
	}

	now := time.Now()
	if now.Before(cert.NotBefore) {
		return nil, fmt.Errorf("certificate is not yet valid: notBefore=%s", cert.NotBefore.Format(time.RFC3339))
	}
	if now.After(cert.NotAfter) {
		return nil, fmt.Errorf("certificate has expired: notAfter=%s", cert.NotAfter.Format(time.RFC3339))
	}

	thumbprint := sha256.Sum256(cert.Raw)

	info := &models.CertificateInfo{
		Subject:      cert.Subject.String(),
		Issuer:       cert.Issuer.String(),
		SerialNumber: cert.SerialNumber.Text(16),
		NotBefore:    cert.NotBefore,
		NotAfter:     cert.NotAfter,
		Thumbprint:   hex.EncodeToString(thumbprint[:]),
		UploadedAt:   now,
	}

	return info, nil
}
