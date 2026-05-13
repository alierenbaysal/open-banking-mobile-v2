package keycloak

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"mime/multipart"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	"gitlab.bankdhofar.com/ea/open-banking/services/ob-tpp-manager/internal/models"
)

// Client provides administrative access to the Keycloak server for managing
// OIDC clients within the open-banking realm.
type Client struct {
	baseURL      string
	realm        string
	clientID     string
	clientSecret string
	httpClient   *http.Client
	logger       *slog.Logger

	mu          sync.Mutex
	accessToken string
	tokenExpiry time.Time
}

// tokenResponse represents the Keycloak token endpoint response.
type tokenResponse struct {
	AccessToken string `json:"access_token"`
	ExpiresIn   int    `json:"expires_in"`
	TokenType   string `json:"token_type"`
}

// kcClient represents a Keycloak OIDC client resource.
type kcClient struct {
	ID                        string              `json:"id,omitempty"`
	ClientID                  string              `json:"clientId"`
	Name                      string              `json:"name,omitempty"`
	Description               string              `json:"description,omitempty"`
	Enabled                   bool                `json:"enabled"`
	Protocol                  string              `json:"protocol"`
	PublicClient              bool                `json:"publicClient"`
	BearerOnly                bool                `json:"bearerOnly"`
	ConsentRequired           bool                `json:"consentRequired"`
	StandardFlowEnabled       bool                `json:"standardFlowEnabled"`
	DirectAccessGrantsEnabled bool                `json:"directAccessGrantsEnabled"`
	ServiceAccountsEnabled    bool                `json:"serviceAccountsEnabled"`
	RedirectUris              []string            `json:"redirectUris,omitempty"`
	WebOrigins                []string            `json:"webOrigins,omitempty"`
	DefaultClientScopes       []string            `json:"defaultClientScopes,omitempty"`
	OptionalClientScopes      []string            `json:"optionalClientScopes,omitempty"`
	Attributes                map[string]string   `json:"attributes,omitempty"`
	Secret                    string              `json:"secret,omitempty"`
}

// kcClientSecret represents the secret response from Keycloak.
type kcClientSecret struct {
	Type  string `json:"type"`
	Value string `json:"value"`
}

// NewClient creates a new Keycloak admin client.
func NewClient(baseURL, realm, clientID, clientSecret string, logger *slog.Logger) *Client {
	return &Client{
		baseURL:      strings.TrimRight(baseURL, "/"),
		realm:        realm,
		clientID:     clientID,
		clientSecret: clientSecret,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
		logger: logger,
	}
}

// getToken obtains or reuses a valid admin access token via client_credentials grant.
func (c *Client) getToken() (string, error) {
	c.mu.Lock()
	defer c.mu.Unlock()

	// Reuse token if still valid with a 30-second safety margin.
	if c.accessToken != "" && time.Now().Before(c.tokenExpiry.Add(-30*time.Second)) {
		return c.accessToken, nil
	}

	tokenURL := fmt.Sprintf("%s/realms/%s/protocol/openid-connect/token", c.baseURL, c.realm)
	data := url.Values{
		"grant_type":    {"client_credentials"},
		"client_id":     {c.clientID},
		"client_secret": {c.clientSecret},
	}

	resp, err := c.httpClient.PostForm(tokenURL, data)
	if err != nil {
		return "", fmt.Errorf("keycloak token request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("keycloak token request returned %d: %s", resp.StatusCode, string(body))
	}

	var tok tokenResponse
	if err := json.NewDecoder(resp.Body).Decode(&tok); err != nil {
		return "", fmt.Errorf("failed to decode keycloak token response: %w", err)
	}

	c.accessToken = tok.AccessToken
	c.tokenExpiry = time.Now().Add(time.Duration(tok.ExpiresIn) * time.Second)
	c.logger.Debug("obtained keycloak admin token", "expires_in", tok.ExpiresIn)

	return c.accessToken, nil
}

// doRequest executes an authenticated HTTP request against the Keycloak admin API.
func (c *Client) doRequest(method, path string, body interface{}) (*http.Response, error) {
	token, err := c.getToken()
	if err != nil {
		return nil, err
	}

	var reqBody io.Reader
	if body != nil {
		b, err := json.Marshal(body)
		if err != nil {
			return nil, fmt.Errorf("failed to marshal request body: %w", err)
		}
		reqBody = bytes.NewReader(b)
	}

	reqURL := fmt.Sprintf("%s/admin/realms/%s%s", c.baseURL, c.realm, path)
	req, err := http.NewRequest(method, reqURL, reqBody)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+token)
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}

	return c.httpClient.Do(req)
}

// CreateClient creates a new OIDC client in Keycloak configured with FAPI 2.0
// profile settings. Returns the Keycloak internal UUID for the client.
func (c *Client) CreateClient(tppName, clientID string, redirectURIs []string, roles []models.TPPRole) (string, error) {
	scopes := models.ScopesForRoles(roles)

	kc := kcClient{
		ClientID:                  clientID,
		Name:                      tppName,
		Enabled:                   true,
		Protocol:                  "openid-connect",
		PublicClient:              false,
		BearerOnly:                false,
		ConsentRequired:           true,
		StandardFlowEnabled:       true,
		DirectAccessGrantsEnabled: false,
		ServiceAccountsEnabled:    true,
		RedirectUris:              redirectURIs,
		WebOrigins:                []string{"+"},
		DefaultClientScopes:       scopes,
		Attributes: map[string]string{
			"pkce.code.challenge.method":                  "S256",
			"token.endpoint.auth.signing.alg":             "PS256",
			"id.token.signed.response.alg":                "PS256",
			"access.token.signed.response.alg":            "PS256",
			"tls.client.certificate.bound.access.tokens":  "false",
			"request.object.signature.alg":                "PS256",
			"use.refresh.tokens":                          "true",
			"client.session.idle.timeout":                 "300",
			"client.session.max.lifespan":                 "3600",
		},
	}

	resp, err := c.doRequest(http.MethodPost, "/clients", kc)
	if err != nil {
		return "", fmt.Errorf("failed to create keycloak client: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusCreated {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("keycloak create client returned %d: %s", resp.StatusCode, string(body))
	}

	// Keycloak returns the resource URL in the Location header.
	location := resp.Header.Get("Location")
	if location == "" {
		return "", fmt.Errorf("keycloak did not return Location header for created client")
	}

	// Extract UUID from the Location URL (last path segment).
	parts := strings.Split(strings.TrimRight(location, "/"), "/")
	kcID := parts[len(parts)-1]

	c.logger.Info("created keycloak client", "client_id", clientID, "kc_id", kcID)
	return kcID, nil
}

// GetClientSecret retrieves the client secret for a given Keycloak client UUID.
func (c *Client) GetClientSecret(kcClientUUID string) (string, error) {
	resp, err := c.doRequest(http.MethodGet, fmt.Sprintf("/clients/%s/client-secret", kcClientUUID), nil)
	if err != nil {
		return "", fmt.Errorf("failed to get client secret: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("keycloak get client secret returned %d: %s", resp.StatusCode, string(body))
	}

	var sec kcClientSecret
	if err := json.NewDecoder(resp.Body).Decode(&sec); err != nil {
		return "", fmt.Errorf("failed to decode client secret response: %w", err)
	}

	return sec.Value, nil
}

// RegenerateClientSecret generates a new client secret for the given Keycloak client UUID.
func (c *Client) RegenerateClientSecret(kcClientUUID string) (string, error) {
	resp, err := c.doRequest(http.MethodPost, fmt.Sprintf("/clients/%s/client-secret", kcClientUUID), nil)
	if err != nil {
		return "", fmt.Errorf("failed to regenerate client secret: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("keycloak regenerate secret returned %d: %s", resp.StatusCode, string(body))
	}

	var sec kcClientSecret
	if err := json.NewDecoder(resp.Body).Decode(&sec); err != nil {
		return "", fmt.Errorf("failed to decode regenerated secret response: %w", err)
	}

	c.logger.Info("regenerated client secret", "kc_id", kcClientUUID)
	return sec.Value, nil
}

// UpdateClient updates an existing Keycloak client's properties.
func (c *Client) UpdateClient(kcClientUUID string, name string, redirectURIs []string, roles []models.TPPRole) error {
	update := kcClient{
		Name:         name,
		Enabled:      true,
		Protocol:     "openid-connect",
		RedirectUris: redirectURIs,
	}
	if len(roles) > 0 {
		update.DefaultClientScopes = models.ScopesForRoles(roles)
	}

	resp, err := c.doRequest(http.MethodPut, fmt.Sprintf("/clients/%s", kcClientUUID), update)
	if err != nil {
		return fmt.Errorf("failed to update keycloak client: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusNoContent {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("keycloak update client returned %d: %s", resp.StatusCode, string(body))
	}

	c.logger.Info("updated keycloak client", "kc_id", kcClientUUID)
	return nil
}

// DisableClient disables a Keycloak client (used for TPP suspension).
func (c *Client) DisableClient(kcClientUUID string) error {
	update := map[string]interface{}{
		"enabled": false,
	}

	resp, err := c.doRequest(http.MethodPut, fmt.Sprintf("/clients/%s", kcClientUUID), update)
	if err != nil {
		return fmt.Errorf("failed to disable keycloak client: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusNoContent {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("keycloak disable client returned %d: %s", resp.StatusCode, string(body))
	}

	c.logger.Info("disabled keycloak client", "kc_id", kcClientUUID)
	return nil
}

// FindClientByClientID looks up a Keycloak client by its clientId field.
// Returns the Keycloak internal UUID and whether the client was found.
func (c *Client) FindClientByClientID(clientID string) (string, bool, error) {
	resp, err := c.doRequest(http.MethodGet, fmt.Sprintf("/clients?clientId=%s", url.QueryEscape(clientID)), nil)
	if err != nil {
		return "", false, fmt.Errorf("failed to search keycloak clients: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return "", false, fmt.Errorf("keycloak client search returned %d: %s", resp.StatusCode, string(body))
	}

	var clients []kcClient
	if err := json.NewDecoder(resp.Body).Decode(&clients); err != nil {
		return "", false, fmt.Errorf("failed to decode client search response: %w", err)
	}

	for _, kc := range clients {
		if kc.ClientID == clientID {
			return kc.ID, true, nil
		}
	}

	return "", false, nil
}

// GetSandboxToken obtains an access token for the given client using client_credentials grant.
func (c *Client) GetSandboxToken(clientID, clientSecret string, scopes []string) (*models.SandboxTokenResponse, error) {
	tokenURL := fmt.Sprintf("%s/realms/%s/protocol/openid-connect/token", c.baseURL, c.realm)

	scopeStr := strings.Join(scopes, " ")
	if scopeStr == "" {
		scopeStr = "openid"
	}

	data := url.Values{
		"grant_type":    {"client_credentials"},
		"client_id":     {clientID},
		"client_secret": {clientSecret},
		"scope":         {scopeStr},
	}

	resp, err := c.httpClient.PostForm(tokenURL, data)
	if err != nil {
		return nil, fmt.Errorf("sandbox token request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("sandbox token request returned %d: %s", resp.StatusCode, string(body))
	}

	var raw struct {
		AccessToken string `json:"access_token"`
		TokenType   string `json:"token_type"`
		ExpiresIn   int    `json:"expires_in"`
		Scope       string `json:"scope"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&raw); err != nil {
		return nil, fmt.Errorf("failed to decode sandbox token response: %w", err)
	}

	return &models.SandboxTokenResponse{
		AccessToken: raw.AccessToken,
		TokenType:   raw.TokenType,
		ExpiresIn:   raw.ExpiresIn,
		Scope:       raw.Scope,
	}, nil
}

// UploadClientCertificate configures the certificate on the Keycloak client for mTLS.
func (c *Client) UploadClientCertificate(kcClientUUID, pemCert string) error {
	token, err := c.getToken()
	if err != nil {
		return err
	}

	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	_ = writer.WriteField("keystoreFormat", "Certificate PEM")
	part, err := writer.CreateFormFile("file", "client.crt")
	if err != nil {
		return fmt.Errorf("failed to create form file: %w", err)
	}
	if _, err := part.Write([]byte(pemCert)); err != nil {
		return fmt.Errorf("failed to write cert to form: %w", err)
	}
	writer.Close()

	reqURL := fmt.Sprintf("%s/admin/realms/%s/clients/%s/certificates/jwt.credential/upload-certificate",
		c.baseURL, c.realm, kcClientUUID)
	req, err := http.NewRequest(http.MethodPost, reqURL, &body)
	if err != nil {
		return fmt.Errorf("failed to create upload request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", writer.FormDataContentType())

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("failed to upload certificate to keycloak: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusNoContent {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("keycloak certificate upload returned %d: %s", resp.StatusCode, string(respBody))
	}

	c.logger.Info("uploaded client certificate to keycloak", "kc_id", kcClientUUID)
	return nil
}
