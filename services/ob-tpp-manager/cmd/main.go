package main

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"gitlab.bankdhofar.com/ea/open-banking/services/ob-tpp-manager/internal/api"
	"gitlab.bankdhofar.com/ea/open-banking/services/ob-tpp-manager/internal/certs"
	"gitlab.bankdhofar.com/ea/open-banking/services/ob-tpp-manager/internal/config"
	"gitlab.bankdhofar.com/ea/open-banking/services/ob-tpp-manager/internal/keycloak"
	"gitlab.bankdhofar.com/ea/open-banking/services/ob-tpp-manager/internal/mailer"
	"gitlab.bankdhofar.com/ea/open-banking/services/ob-tpp-manager/internal/session"
)

func main() {
	// Load configuration from environment.
	cfg, err := config.Load()
	if err != nil {
		fmt.Fprintf(os.Stderr, "configuration error: %s\n", err)
		os.Exit(1)
	}

	// Initialize structured logger.
	logger := initLogger(cfg.LogLevel)

	logger.Info("starting ob-tpp-manager",
		"port", cfg.Port,
		"keycloak_url", cfg.KeycloakURL,
		"keycloak_realm", cfg.KeycloakRealm,
		"consent_service_url", cfg.ConsentServiceURL,
	)

	// Initialize dependencies.
	kcClient := keycloak.NewClient(
		cfg.KeycloakURL,
		cfg.KeycloakRealm,
		cfg.KeycloakAdminClientID,
		cfg.KeycloakAdminClientSecret,
		logger,
	)
	certMgr := certs.NewManager()
	mail := mailer.New(cfg.SMTPHost, cfg.SMTPPort, cfg.SMTPUsername, cfg.SMTPPassword,
		cfg.SMTPFrom, cfg.SMTPFromName, cfg.SMTPImplicitTLS, cfg.SMTPInsecure)
	if mail.Enabled() {
		logger.Info("SMTP configured", "host", cfg.SMTPHost, "from", cfg.SMTPFrom)
	} else {
		logger.Warn("SMTP not configured (SMTP_HOST unset) — invites return a dev PIN instead of emailing")
	}

	sessionSecret := cfg.SessionSecret
	if sessionSecret == "" {
		buf := make([]byte, 32)
		_, _ = rand.Read(buf)
		sessionSecret = hex.EncodeToString(buf)
		logger.Warn("SESSION_SECRET not set — generated an ephemeral secret; set it via a K8s secret for multi-replica session validity")
	}
	signer := session.NewSigner(sessionSecret)

	// Bootstrap Keycloak: ensure the partner roles and the confidential portal
	// BFF client (direct access grants) exist. Idempotent; tolerant of Keycloak
	// being briefly unreachable at startup.
	if err := kcClient.EnsureRealmRole("tpp-developer"); err != nil {
		logger.Warn("could not ensure realm role tpp-developer", "error", err)
	}
	if err := kcClient.EnsureRealmRole("qantara-admin"); err != nil {
		logger.Warn("could not ensure realm role qantara-admin", "error", err)
	}
	bffUUID, bffSecret, err := kcClient.EnsureBFFClient(cfg.BFFClientID)
	if err != nil {
		logger.Error("could not ensure portal BFF client — partner login unavailable until Keycloak is reachable", "error", err)
	} else {
		logger.Info("portal BFF client ready", "client_id", cfg.BFFClientID, "kc_id", bffUUID)
	}

	// Build router.
	router := api.NewRouter(api.Deps{
		KC:                kcClient,
		CertMgr:           certMgr,
		Mailer:            mail,
		Signer:            signer,
		ConsentServiceURL: cfg.ConsentServiceURL,
		BFFClientID:       cfg.BFFClientID,
		BFFClientSecret:   bffSecret,
		PortalBaseURL:     cfg.PortalBaseURL,
		AdminAPIKey:       cfg.AdminAPIKey,
		ReconcilerAPIKey:  cfg.ReconcilerAPIKey,
		Logger:            logger,
	})

	// Configure HTTP server.
	srv := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           router,
		ReadHeaderTimeout: 10 * time.Second,
		ReadTimeout:       30 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       120 * time.Second,
		MaxHeaderBytes:    1 << 20, // 1 MB
	}

	// Start server in a goroutine.
	errCh := make(chan error, 1)
	go func() {
		logger.Info("HTTP server listening", "addr", srv.Addr)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			errCh <- err
		}
	}()

	// Wait for interrupt signal or server error.
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	select {
	case sig := <-quit:
		logger.Info("received shutdown signal", "signal", sig.String())
	case err := <-errCh:
		logger.Error("server error", "error", err)
	}

	// Graceful shutdown with 15-second deadline.
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	logger.Info("shutting down HTTP server")
	if err := srv.Shutdown(ctx); err != nil {
		logger.Error("server shutdown error", "error", err)
		os.Exit(1)
	}

	logger.Info("ob-tpp-manager stopped")
}

// initLogger creates a structured slog.Logger at the specified level.
func initLogger(level string) *slog.Logger {
	var logLevel slog.Level
	switch strings.ToLower(level) {
	case "debug":
		logLevel = slog.LevelDebug
	case "warn", "warning":
		logLevel = slog.LevelWarn
	case "error":
		logLevel = slog.LevelError
	default:
		logLevel = slog.LevelInfo
	}

	handler := slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: logLevel,
	})
	return slog.New(handler)
}
