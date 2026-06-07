package keycloak

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
)

// This file extends the Keycloak admin client with the user, realm-role, client-
// attribute, and direct-grant operations the partner self-service BFF needs.
// Keycloak is the system of record; Qantara drives it entirely from the backend.

// User is a minimal Keycloak user representation.
type User struct {
	ID            string              `json:"id,omitempty"`
	Username      string              `json:"username,omitempty"`
	Email         string              `json:"email,omitempty"`
	FirstName     string              `json:"firstName,omitempty"`
	Enabled       bool                `json:"enabled"`
	EmailVerified bool                `json:"emailVerified"`
	Attributes    map[string][]string `json:"attributes,omitempty"`
}

// FindUserByEmail returns the user with the given email (exact match), if any.
func (c *Client) FindUserByEmail(email string) (*User, bool, error) {
	// briefRepresentation=false so the returned users include their attributes
	// (the onboarding PIN/TOTP/status live there).
	resp, err := c.doRequest(http.MethodGet,
		fmt.Sprintf("/users?email=%s&exact=true&briefRepresentation=false", url.QueryEscape(email)), nil)
	if err != nil {
		return nil, false, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, false, fmt.Errorf("keycloak user search returned %d: %s", resp.StatusCode, string(body))
	}
	var users []User
	if err := json.NewDecoder(resp.Body).Decode(&users); err != nil {
		return nil, false, fmt.Errorf("failed to decode user search: %w", err)
	}
	for i := range users {
		if strings.EqualFold(users[i].Email, email) {
			return &users[i], true, nil
		}
	}
	return nil, false, nil
}

// ListUsersByAttribute returns users whose attribute attrKey equals attrVal.
// It first tries Keycloak's indexed attribute search (q=key:val); if that is
// unavailable (older Keycloak, or the attribute isn't indexed) it falls back to
// enumerating users and filtering client-side.
func (c *Client) ListUsersByAttribute(attrKey, attrVal string) ([]User, error) {
	q := url.QueryEscape(fmt.Sprintf("%s:%s", attrKey, attrVal))
	resp, err := c.doRequest(http.MethodGet,
		fmt.Sprintf("/users?q=%s&briefRepresentation=false&max=1000", q), nil)
	if err != nil {
		return nil, err
	}
	if resp.StatusCode == http.StatusOK {
		defer resp.Body.Close()
		var users []User
		if derr := json.NewDecoder(resp.Body).Decode(&users); derr != nil {
			return nil, fmt.Errorf("failed to decode attribute search: %w", derr)
		}
		// The q-search is best-effort on the server; confirm the match locally.
		out := make([]User, 0, len(users))
		for i := range users {
			if attrEquals(users[i].Attributes, attrKey, attrVal) {
				out = append(out, users[i])
			}
		}
		return out, nil
	}
	resp.Body.Close()

	// Fallback: enumerate and filter.
	resp, err = c.doRequest(http.MethodGet, "/users?max=1000&briefRepresentation=false", nil)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("keycloak user enumerate returned %d: %s", resp.StatusCode, string(body))
	}
	var all []User
	if err := json.NewDecoder(resp.Body).Decode(&all); err != nil {
		return nil, fmt.Errorf("failed to decode user enumerate: %w", err)
	}
	out := make([]User, 0)
	for i := range all {
		if attrEquals(all[i].Attributes, attrKey, attrVal) {
			out = append(out, all[i])
		}
	}
	return out, nil
}

func attrEquals(m map[string][]string, key, val string) bool {
	if v, ok := m[key]; ok {
		for _, x := range v {
			if x == val {
				return true
			}
		}
	}
	return false
}

// CreateUser creates an enabled user (no password yet) with the given attributes
// and returns the Keycloak user id.
func (c *Client) CreateUser(email, name string, attributes map[string][]string) (string, error) {
	u := User{
		Username:      email,
		Email:         email,
		FirstName:     name,
		Enabled:       true,
		EmailVerified: false,
		Attributes:    attributes,
	}
	resp, err := c.doRequest(http.MethodPost, "/users", u)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	if resp.StatusCode == http.StatusConflict {
		// Already exists — resolve the id.
		existing, found, ferr := c.FindUserByEmail(email)
		if ferr == nil && found {
			return existing.ID, nil
		}
		return "", fmt.Errorf("user exists but lookup failed")
	}
	if resp.StatusCode != http.StatusCreated {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("keycloak create user returned %d: %s", resp.StatusCode, string(body))
	}
	return idFromLocation(resp.Header.Get("Location")), nil
}

// GetUserAttributes returns the user's current attribute map.
func (c *Client) GetUserAttributes(userID string) (map[string][]string, error) {
	u, err := c.getUser(userID)
	if err != nil {
		return nil, err
	}
	if u.Attributes == nil {
		return map[string][]string{}, nil
	}
	return u.Attributes, nil
}

// SetUserAttributes merges the given attributes into the user (other fields kept).
func (c *Client) SetUserAttributes(userID string, attrs map[string][]string) error {
	u, err := c.getUser(userID)
	if err != nil {
		return err
	}
	if u.Attributes == nil {
		u.Attributes = map[string][]string{}
	}
	for k, v := range attrs {
		if v == nil {
			delete(u.Attributes, k)
			continue
		}
		u.Attributes[k] = v
	}
	// Send identity fields alongside attributes. With realm
	// registrationEmailAsUsername=true, Keycloak runs user-profile validation on
	// PUT and rejects an attributes-only body with
	// error-user-attribute-required(email). Echo the existing username/email so
	// the update validates.
	payload := map[string]interface{}{
		"username":      u.Username,
		"email":         u.Email,
		"firstName":     u.FirstName,
		"enabled":       u.Enabled,
		"emailVerified": u.EmailVerified,
		"attributes":    u.Attributes,
	}
	resp, err := c.doRequest(http.MethodPut, "/users/"+userID, payload)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusNoContent {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("keycloak update user returned %d: %s", resp.StatusCode, string(body))
	}
	return nil
}

// SetPassword sets a permanent (non-temporary) password on the user.
func (c *Client) SetPassword(userID, password string) error {
	body := map[string]interface{}{"type": "password", "value": password, "temporary": false}
	resp, err := c.doRequest(http.MethodPut, "/users/"+userID+"/reset-password", body)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusNoContent {
		b, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("keycloak set password returned %d: %s", resp.StatusCode, string(b))
	}
	return nil
}

// AddRealmRoleToUser assigns a realm role to the user (idempotent at Keycloak).
func (c *Client) AddRealmRoleToUser(userID, roleName string) error {
	role, err := c.getRealmRole(roleName)
	if err != nil {
		return err
	}
	resp, err := c.doRequest(http.MethodPost, "/users/"+userID+"/role-mappings/realm",
		[]map[string]string{{"id": role.ID, "name": role.Name}})
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusNoContent && resp.StatusCode != http.StatusOK {
		b, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("keycloak add role returned %d: %s", resp.StatusCode, string(b))
	}
	return nil
}

// DirectGrantLogin verifies the user's password via the resource-owner password
// grant on the BFF client. Returns nil on success, an error (invalid creds) otherwise.
func (c *Client) DirectGrantLogin(bffClientID, bffClientSecret, username, password string) error {
	tokenURL := fmt.Sprintf("%s/realms/%s/protocol/openid-connect/token", c.baseURL, c.realm)
	data := url.Values{
		"grant_type":    {"password"},
		"client_id":     {bffClientID},
		"client_secret": {bffClientSecret},
		"username":      {username},
		"password":      {password},
		"scope":         {"openid"},
	}
	resp, err := c.httpClient.PostForm(tokenURL, data)
	if err != nil {
		return fmt.Errorf("direct grant request failed: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode == http.StatusOK {
		return nil
	}
	if resp.StatusCode == http.StatusUnauthorized || resp.StatusCode == http.StatusBadRequest {
		return ErrInvalidCredentials
	}
	b, _ := io.ReadAll(resp.Body)
	return fmt.Errorf("direct grant returned %d: %s", resp.StatusCode, string(b))
}

// ErrInvalidCredentials is returned by DirectGrantLogin on bad username/password.
var ErrInvalidCredentials = fmt.Errorf("invalid credentials")

// EnsureRealmRole creates the realm role if it does not already exist.
func (c *Client) EnsureRealmRole(name string) error {
	if _, err := c.getRealmRole(name); err == nil {
		return nil
	}
	resp, err := c.doRequest(http.MethodPost, "/roles", map[string]string{"name": name})
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusCreated && resp.StatusCode != http.StatusConflict {
		b, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("keycloak create role returned %d: %s", resp.StatusCode, string(b))
	}
	return nil
}

// EnsureBFFClient find-or-creates the confidential portal BFF client (direct
// access grants enabled) and returns its UUID and secret. Idempotent.
func (c *Client) EnsureBFFClient(clientID string) (string, string, error) {
	uuid, found, err := c.FindClientByClientID(clientID)
	if err != nil {
		return "", "", err
	}
	if !found {
		kc := kcClient{
			ClientID:                  clientID,
			Name:                      "Qantara Portal BFF",
			Enabled:                   true,
			Protocol:                  "openid-connect",
			PublicClient:              false,
			DirectAccessGrantsEnabled: true,
			StandardFlowEnabled:       false,
			ServiceAccountsEnabled:    false,
		}
		resp, err := c.doRequest(http.MethodPost, "/clients", kc)
		if err != nil {
			return "", "", err
		}
		defer resp.Body.Close()
		if resp.StatusCode != http.StatusCreated {
			b, _ := io.ReadAll(resp.Body)
			return "", "", fmt.Errorf("keycloak create BFF client returned %d: %s", resp.StatusCode, string(b))
		}
		uuid = idFromLocation(resp.Header.Get("Location"))
		c.logger.Info("created portal BFF client", "client_id", clientID, "kc_id", uuid)
	}
	secret, err := c.GetClientSecret(uuid)
	if err != nil {
		return "", "", err
	}
	return uuid, secret, nil
}

// GetClientAttributes returns the (string) attribute map of a client by UUID.
func (c *Client) GetClientAttributes(clientUUID string) (map[string]string, error) {
	resp, err := c.doRequest(http.MethodGet, "/clients/"+clientUUID, nil)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		b, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("keycloak get client returned %d: %s", resp.StatusCode, string(b))
	}
	var kc kcClient
	if err := json.NewDecoder(resp.Body).Decode(&kc); err != nil {
		return nil, err
	}
	if kc.Attributes == nil {
		return map[string]string{}, nil
	}
	return kc.Attributes, nil
}

// SetClientAttributes merges the given attributes into the client.
func (c *Client) SetClientAttributes(clientUUID string, attrs map[string]string) error {
	current, err := c.GetClientAttributes(clientUUID)
	if err != nil {
		return err
	}
	for k, v := range attrs {
		current[k] = v
	}
	resp, err := c.doRequest(http.MethodPut, "/clients/"+clientUUID,
		map[string]interface{}{"attributes": current})
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusNoContent {
		b, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("keycloak update client attrs returned %d: %s", resp.StatusCode, string(b))
	}
	return nil
}

// ListClients returns all clients in the realm (used by the gateway reconciler view).
func (c *Client) ListClients() ([]map[string]interface{}, error) {
	resp, err := c.doRequest(http.MethodGet, "/clients?max=1000", nil)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		b, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("keycloak list clients returned %d: %s", resp.StatusCode, string(b))
	}
	var clients []map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&clients); err != nil {
		return nil, err
	}
	return clients, nil
}

// --- internal helpers ---

type realmRole struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

func (c *Client) getRealmRole(name string) (*realmRole, error) {
	resp, err := c.doRequest(http.MethodGet, "/roles/"+url.PathEscape(name), nil)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("realm role %q not found (%d)", name, resp.StatusCode)
	}
	var role realmRole
	if err := json.NewDecoder(resp.Body).Decode(&role); err != nil {
		return nil, err
	}
	return &role, nil
}

func (c *Client) getUser(userID string) (*User, error) {
	resp, err := c.doRequest(http.MethodGet, "/users/"+userID, nil)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		b, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("keycloak get user returned %d: %s", resp.StatusCode, string(b))
	}
	var u User
	if err := json.NewDecoder(resp.Body).Decode(&u); err != nil {
		return nil, err
	}
	return &u, nil
}

func idFromLocation(location string) string {
	if location == "" {
		return ""
	}
	parts := strings.Split(strings.TrimRight(location, "/"), "/")
	return parts[len(parts)-1]
}
