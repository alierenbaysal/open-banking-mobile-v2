package certs

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/sha256"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/hex"
	"encoding/pem"
	"fmt"
	"math/big"
	"time"

	"gitlab.bankdhofar.com/ea/open-banking/services/ob-tpp-manager/internal/models"
)

// GenerateKeypair creates a self-signed P-256 client certificate + private key as
// a convenience for partners who don't want to produce their own. The trust model
// is bring-your-own with per-TPP thumbprint pinning, so a self-signed leaf is
// sufficient: the gateway trusts it via the uploaded anchor + pinned thumbprint.
// The private key is returned exactly once and never persisted server-side.
func GenerateKeypair(commonName string) (certPEM, keyPEM string, info *models.CertificateInfo, err error) {
	if commonName == "" {
		commonName = "Qantara TPP Client"
	}
	priv, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		return "", "", nil, fmt.Errorf("generate key: %w", err)
	}

	serial, err := rand.Int(rand.Reader, new(big.Int).Lsh(big.NewInt(1), 128))
	if err != nil {
		return "", "", nil, fmt.Errorf("generate serial: %w", err)
	}

	now := time.Now()
	tmpl := x509.Certificate{
		SerialNumber: serial,
		Subject: pkix.Name{
			CommonName:   commonName,
			Organization: []string{"Qantara TPP (sandbox)"},
		},
		NotBefore:             now.Add(-5 * time.Minute),
		NotAfter:              now.AddDate(2, 0, 0),
		KeyUsage:              x509.KeyUsageDigitalSignature,
		ExtKeyUsage:           []x509.ExtKeyUsage{x509.ExtKeyUsageClientAuth},
		BasicConstraintsValid: true,
	}

	der, err := x509.CreateCertificate(rand.Reader, &tmpl, &tmpl, &priv.PublicKey, priv)
	if err != nil {
		return "", "", nil, fmt.Errorf("create certificate: %w", err)
	}

	keyDER, err := x509.MarshalPKCS8PrivateKey(priv)
	if err != nil {
		return "", "", nil, fmt.Errorf("marshal key: %w", err)
	}

	certPEM = string(pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: der}))
	keyPEM = string(pem.EncodeToMemory(&pem.Block{Type: "PRIVATE KEY", Bytes: keyDER}))

	thumb := sha256.Sum256(der)
	info = &models.CertificateInfo{
		Subject:      tmpl.Subject.String(),
		Issuer:       tmpl.Subject.String(),
		SerialNumber: serial.Text(16),
		NotBefore:    tmpl.NotBefore,
		NotAfter:     tmpl.NotAfter,
		Thumbprint:   hex.EncodeToString(thumb[:]),
		UploadedAt:   now,
	}
	return certPEM, keyPEM, info, nil
}
