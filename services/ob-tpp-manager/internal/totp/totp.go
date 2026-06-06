// Package totp implements RFC 6238 time-based one-time passwords with no
// external dependencies. Qantara owns MFA verification in the BFF (the secret is
// persisted as a Keycloak user attribute), so partners never see a Keycloak page.
package totp

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha1"
	"encoding/base32"
	"encoding/binary"
	"fmt"
	"net/url"
	"strings"
	"time"
)

const (
	period = 30 // seconds per step
	digits = 6
)

// GenerateSecret returns a new random base32-encoded secret (160-bit, unpadded),
// suitable for embedding in an otpauth URI for authenticator apps.
func GenerateSecret() (string, error) {
	buf := make([]byte, 20)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return strings.TrimRight(base32.StdEncoding.EncodeToString(buf), "="), nil
}

// OtpauthURI builds an otpauth://totp/ URI the portal renders as a QR code.
func OtpauthURI(issuer, account, secret string) string {
	label := url.PathEscape(issuer + ":" + account)
	q := url.Values{}
	q.Set("secret", secret)
	q.Set("issuer", issuer)
	q.Set("algorithm", "SHA1")
	q.Set("digits", fmt.Sprintf("%d", digits))
	q.Set("period", fmt.Sprintf("%d", period))
	return "otpauth://totp/" + label + "?" + q.Encode()
}

// Validate checks a user-supplied code against the secret, tolerating ±1 step of
// clock skew.
func Validate(secret, input string) bool {
	input = strings.TrimSpace(input)
	if len(input) != digits {
		return false
	}
	now := int64(time.Now().Unix()) / period
	for _, skew := range []int64{0, -1, 1} {
		c, err := code(secret, uint64(now+skew))
		if err != nil {
			return false
		}
		if hmac.Equal([]byte(c), []byte(input)) {
			return true
		}
	}
	return false
}

func code(secret string, counter uint64) (string, error) {
	key, err := base32.StdEncoding.DecodeString(pad(secret))
	if err != nil {
		return "", err
	}
	var buf [8]byte
	binary.BigEndian.PutUint64(buf[:], counter)
	mac := hmac.New(sha1.New, key)
	mac.Write(buf[:])
	sum := mac.Sum(nil)
	offset := sum[len(sum)-1] & 0x0f
	val := (uint32(sum[offset]&0x7f) << 24) |
		(uint32(sum[offset+1]) << 16) |
		(uint32(sum[offset+2]) << 8) |
		uint32(sum[offset+3])
	return fmt.Sprintf("%0*d", digits, val%1_000_000), nil
}

func pad(s string) string {
	s = strings.ToUpper(strings.TrimSpace(s))
	if m := len(s) % 8; m != 0 {
		s += strings.Repeat("=", 8-m)
	}
	return s
}
