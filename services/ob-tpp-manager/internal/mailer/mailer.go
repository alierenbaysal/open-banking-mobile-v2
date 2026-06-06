// Package mailer sends transactional email (partner invites + magic PINs) over
// SMTP, reusing the existing Stalwart server that GitLab already relays through.
// Qantara sends as qantara@bankdhofar.dev. Pure stdlib (net/smtp).
package mailer

import (
	"crypto/tls"
	"fmt"
	"net"
	"net/smtp"
	"strings"
	"time"
)

// Mailer holds SMTP submission settings for the Stalwart relay.
type Mailer struct {
	host     string
	port     string
	username string
	password string
	from     string
	fromName string
	implicit bool // true = implicit TLS (465); false = STARTTLS (587)
	insecure bool // skip cert verification (in-cluster self-signed)
}

// New builds a Mailer. When host is empty the Mailer is disabled and Send errors.
func New(host, port, username, password, from, fromName string, implicit, insecure bool) *Mailer {
	if port == "" {
		port = "587"
	}
	if from == "" {
		from = "qantara@bankdhofar.dev"
	}
	if fromName == "" {
		fromName = "Qantara Open Banking"
	}
	return &Mailer{
		host: host, port: port, username: username, password: password,
		from: from, fromName: fromName, implicit: implicit, insecure: insecure,
	}
}

// Enabled reports whether an SMTP host is configured.
func (m *Mailer) Enabled() bool { return m.host != "" }

// From returns the configured sender address.
func (m *Mailer) From() string { return m.from }

// Send delivers a single HTML email to one recipient.
func (m *Mailer) Send(to, subject, htmlBody string) error {
	if !m.Enabled() {
		return fmt.Errorf("mailer not configured (SMTP_HOST unset)")
	}
	addr := net.JoinHostPort(m.host, m.port)
	msg := m.buildMIME(to, subject, htmlBody)
	tlsCfg := &tls.Config{ServerName: m.host, InsecureSkipVerify: m.insecure} //nolint:gosec // sandbox relay may be self-signed

	var conn net.Conn
	var err error
	if m.implicit {
		conn, err = tls.DialWithDialer(&net.Dialer{Timeout: 15 * time.Second}, "tcp", addr, tlsCfg)
	} else {
		conn, err = net.DialTimeout("tcp", addr, 15*time.Second)
	}
	if err != nil {
		return fmt.Errorf("smtp dial %s: %w", addr, err)
	}

	c, err := smtp.NewClient(conn, m.host)
	if err != nil {
		conn.Close()
		return fmt.Errorf("smtp client: %w", err)
	}
	defer c.Close()

	if !m.implicit {
		if ok, _ := c.Extension("STARTTLS"); ok {
			if err := c.StartTLS(tlsCfg); err != nil {
				return fmt.Errorf("smtp starttls: %w", err)
			}
		}
	}
	if m.username != "" {
		if err := c.Auth(smtp.PlainAuth("", m.username, m.password, m.host)); err != nil {
			return fmt.Errorf("smtp auth: %w", err)
		}
	}
	if err := c.Mail(m.from); err != nil {
		return fmt.Errorf("smtp mail from: %w", err)
	}
	if err := c.Rcpt(to); err != nil {
		return fmt.Errorf("smtp rcpt to: %w", err)
	}
	w, err := c.Data()
	if err != nil {
		return fmt.Errorf("smtp data: %w", err)
	}
	if _, err := w.Write(msg); err != nil {
		return fmt.Errorf("smtp write: %w", err)
	}
	if err := w.Close(); err != nil {
		return fmt.Errorf("smtp close: %w", err)
	}
	return c.Quit()
}

func (m *Mailer) buildMIME(to, subject, htmlBody string) []byte {
	var b strings.Builder
	fmt.Fprintf(&b, "From: %s <%s>\r\n", m.fromName, m.from)
	fmt.Fprintf(&b, "To: %s\r\n", to)
	fmt.Fprintf(&b, "Subject: %s\r\n", subject)
	fmt.Fprintf(&b, "Date: %s\r\n", time.Now().Format(time.RFC1123Z))
	b.WriteString("MIME-Version: 1.0\r\n")
	b.WriteString("Content-Type: text/html; charset=\"UTF-8\"\r\n")
	b.WriteString("\r\n")
	b.WriteString(htmlBody)
	return []byte(b.String())
}
