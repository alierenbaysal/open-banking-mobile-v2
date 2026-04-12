package config

import (
	"fmt"
	"os"
	"strings"
)

// Config holds all application configuration loaded from environment variables.
type Config struct {
	Port                    string
	KeycloakURL             string
	KeycloakRealm           string
	KeycloakAdminClientID   string
	KeycloakAdminClientSecret string
	ConsentServiceURL       string
	LogLevel                string
}

// Load reads configuration from environment variables with sensible defaults.
func Load() (*Config, error) {
	cfg := &Config{
		Port:                    envOrDefault("PORT", "8000"),
		KeycloakURL:             os.Getenv("KEYCLOAK_URL"),
		KeycloakRealm:           envOrDefault("KEYCLOAK_REALM", "open-banking"),
		KeycloakAdminClientID:   os.Getenv("KEYCLOAK_ADMIN_CLIENT_ID"),
		KeycloakAdminClientSecret: os.Getenv("KEYCLOAK_ADMIN_CLIENT_SECRET"),
		ConsentServiceURL:       envOrDefault("CONSENT_SERVICE_URL", "http://ob-consent-service:8000"),
		LogLevel:                envOrDefault("LOG_LEVEL", "info"),
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
