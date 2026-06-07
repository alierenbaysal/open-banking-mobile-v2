package config

import (
	"fmt"
	"os"
	"strings"
)

// Config holds all application configuration loaded from environment variables.
type Config struct {
	Port                      string
	KeycloakURL               string
	KeycloakRealm             string
	KeycloakAdminClientID     string
	KeycloakAdminClientSecret string
	ConsentServiceURL         string
	LogLevel                  string

	// Partner self-service BFF.
	BFFClientID      string
	PortalBaseURL    string
	SessionSecret    string
	AdminAPIKey      string
	ReconcilerAPIKey string

	// Microsoft Entra (Azure AD) SSO — human login via OIDC. The BFF is a
	// confidential OIDC client; Keycloak stays the user/data store.
	EntraClientID     string
	EntraClientSecret string
	EntraTenantID     string
	// Graph app (svc-entra-automation) used for B2B guest invites on approval.
	GraphClientID     string
	GraphClientSecret string
	// Admins are recognised by exact email (ADMIN_EMAILS, comma list) or by
	// belonging to ADMIN_DOMAIN. Everyone else is a partner.
	AdminDomain string
	AdminEmails string

	// SMTP (Stalwart relay) for invites + magic PINs.
	SMTPHost        string
	SMTPPort        string
	SMTPUsername    string
	SMTPPassword    string
	SMTPFrom        string
	SMTPFromName    string
	SMTPImplicitTLS bool
	SMTPInsecure    bool
}

// Load reads configuration from environment variables with sensible defaults.
func Load() (*Config, error) {
	cfg := &Config{
		Port:                      envOrDefault("PORT", "8000"),
		KeycloakURL:               os.Getenv("KEYCLOAK_URL"),
		KeycloakRealm:             envOrDefault("KEYCLOAK_REALM", "open-banking"),
		KeycloakAdminClientID:     os.Getenv("KEYCLOAK_ADMIN_CLIENT_ID"),
		KeycloakAdminClientSecret: os.Getenv("KEYCLOAK_ADMIN_CLIENT_SECRET"),
		ConsentServiceURL:         envOrDefault("CONSENT_SERVICE_URL", "http://ob-consent-service:8000"),
		LogLevel:                  envOrDefault("LOG_LEVEL", "info"),

		BFFClientID:      envOrDefault("BFF_CLIENT_ID", "qantara-portal-bff"),
		PortalBaseURL:    envOrDefault("PORTAL_BASE_URL", "https://qantara.tnd.bankdhofar.com"),
		SessionSecret:    os.Getenv("SESSION_SECRET"),
		AdminAPIKey:      os.Getenv("ADMIN_API_KEY"),
		ReconcilerAPIKey: os.Getenv("RECONCILER_API_KEY"),

		EntraClientID:     os.Getenv("ENTRA_CLIENT_ID"),
		EntraClientSecret: os.Getenv("ENTRA_CLIENT_SECRET"),
		EntraTenantID:     os.Getenv("ENTRA_TENANT_ID"),
		GraphClientID:     os.Getenv("GRAPH_CLIENT_ID"),
		GraphClientSecret: os.Getenv("GRAPH_CLIENT_SECRET"),
		AdminDomain:       envOrDefault("ADMIN_DOMAIN", "bankdhofar.com"),
		AdminEmails:       envOrDefault("ADMIN_EMAILS", "e.baysal@bankdhofar.com"),

		SMTPHost:        os.Getenv("SMTP_HOST"),
		SMTPPort:        envOrDefault("SMTP_PORT", "587"),
		SMTPUsername:    os.Getenv("SMTP_USERNAME"),
		SMTPPassword:    os.Getenv("SMTP_PASSWORD"),
		SMTPFrom:        envOrDefault("SMTP_FROM", "qantara@bankdhofar.dev"),
		SMTPFromName:    envOrDefault("SMTP_FROM_NAME", "Qantara Open Banking"),
		SMTPImplicitTLS: os.Getenv("SMTP_IMPLICIT_TLS") == "true",
		SMTPInsecure:    os.Getenv("SMTP_INSECURE") == "true",
	}

	var missing []string
	if cfg.KeycloakURL == "" {
		missing = append(missing, "KEYCLOAK_URL")
	}
	if cfg.KeycloakAdminClientID == "" {
		missing = append(missing, "KEYCLOAK_ADMIN_CLIENT_ID")
	}
	if cfg.KeycloakAdminClientSecret == "" {
		missing = append(missing, "KEYCLOAK_ADMIN_CLIENT_SECRET")
	}

	if len(missing) > 0 {
		return nil, fmt.Errorf("missing required environment variables: %s", strings.Join(missing, ", "))
	}

	return cfg, nil
}

func envOrDefault(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
