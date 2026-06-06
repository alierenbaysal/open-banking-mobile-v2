// Package session issues and verifies HMAC-signed, stateless tokens used for two
// purposes: the BFF portal session cookie and the short-lived "activation ticket"
// that authorizes the multi-step onboarding (set-password → enrol TOTP). No DB or
// Redis — the token carries its own claims and is tamper-evident.
package session

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"strings"
	"time"
)

// Purpose distinguishes token audiences so an activation ticket can't be replayed
// as a session and vice versa.
type Purpose string

const (
	PurposeSession    Purpose = "session"
	PurposeActivation Purpose = "activation"
)

// Claims is the payload carried by a signed token.
type Claims struct {
	Purpose  Purpose  `json:"p"`
	Subject  string   `json:"sub"`           // Keycloak user id
	Email    string   `json:"email"`
	Name     string   `json:"name,omitempty"`
	TPP      string   `json:"tpp,omitempty"` // linked TPP client_id
	Roles    []string `json:"roles,omitempty"`
	IssuedAt int64    `json:"iat"`
	Expiry   int64    `json:"exp"`
}

// Signer signs and verifies tokens with a shared secret.
type Signer struct{ key []byte }

// NewSigner returns a Signer keyed by the given secret.
func NewSigner(secret string) *Signer { return &Signer{key: []byte(secret)} }

// Issue returns a signed token string: base64url(claims).base64url(hmac).
func (s *Signer) Issue(c Claims, ttl time.Duration) (string, error) {
	now := time.Now()
	c.IssuedAt = now.Unix()
	c.Expiry = now.Add(ttl).Unix()
	payload, err := json.Marshal(c)
	if err != nil {
		return "", err
	}
	body := base64.RawURLEncoding.EncodeToString(payload)
	return body + "." + s.sign(body), nil
}

// Verify parses a token, checks its signature, expiry, and required purpose.
func (s *Signer) Verify(token string, want Purpose) (*Claims, error) {
	parts := strings.SplitN(token, ".", 2)
	if len(parts) != 2 {
		return nil, fmt.Errorf("malformed token")
	}
	if !hmac.Equal([]byte(parts[1]), []byte(s.sign(parts[0]))) {
		return nil, fmt.Errorf("bad signature")
	}
	payload, err := base64.RawURLEncoding.DecodeString(parts[0])
	if err != nil {
		return nil, fmt.Errorf("bad payload: %w", err)
	}
	var c Claims
	if err := json.Unmarshal(payload, &c); err != nil {
		return nil, fmt.Errorf("bad claims: %w", err)
	}
	if c.Purpose != want {
		return nil, fmt.Errorf("wrong token purpose")
	}
	if time.Now().Unix() > c.Expiry {
		return nil, fmt.Errorf("token expired")
	}
	return &c, nil
}

func (s *Signer) sign(body string) string {
	mac := hmac.New(sha256.New, s.key)
	mac.Write([]byte(body))
	return base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
}
