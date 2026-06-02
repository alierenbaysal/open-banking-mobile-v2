"""THEQA SAML 2.0 Service Provider helpers.

Wraps python3-saml (OneLogin) for the THEQA SAS integration:

  * build_settings()  -> the OneLogin settings dict from app config
  * prepare_request() -> adapt a FastAPI Request into OneLogin's request dict
  * build_auth()      -> an OneLogin_Saml2_Auth bound to a request
  * sp_metadata()     -> SP metadata XML (for MTCIT / our own records)

THEQA SAS uses standard SAML 2.0 Web Browser SSO "secured by Crypto Token
Agent (CTA)". The CTA layer is an MTCIT-specific wrapper delivered via their
.Net/Java/PHP SDK; this module implements the standards-based SP foundation.
CTA-specific handling, if required, is layered on top once we review the SDK.
"""

from __future__ import annotations

import logging
from typing import Any

from onelogin.saml2.auth import OneLogin_Saml2_Auth
from onelogin.saml2.settings import OneLogin_Saml2_Settings

from app.config import settings

logger = logging.getLogger(__name__)

_BINDING_REDIRECT = "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect"
_BINDING_POST = "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"


def build_settings() -> dict[str, Any]:
    """Assemble the OneLogin settings dict from application configuration."""
    return {
        "strict": settings.saml_strict,
        "debug": settings.saml_debug,
        "sp": {
            "entityId": settings.saml_sp_entity_id,
            "assertionConsumerService": {
                "url": settings.acs_url,
                "binding": _BINDING_POST,
            },
            "singleLogoutService": {
                "url": settings.sls_url,
                "binding": _BINDING_REDIRECT,
            },
            "NameIDFormat": "urn:oasis:names:tc:SAML:2.0:nameid-format:persistent",
            "x509cert": settings.saml_sp_x509cert,
            "privateKey": settings.saml_sp_private_key,
        },
        "idp": {
            "entityId": settings.saml_idp_entity_id,
            "singleSignOnService": {
                "url": settings.saml_idp_sso_url,
                "binding": _BINDING_REDIRECT,
            },
            "singleLogoutService": {
                "url": settings.saml_idp_slo_url,
                "binding": _BINDING_REDIRECT,
            },
            "x509cert": settings.saml_idp_x509cert,
        },
        "security": {
            "authnRequestsSigned": settings.saml_authn_requests_signed,
            "wantAssertionsSigned": settings.saml_want_assertions_signed,
            "wantMessagesSigned": False,
            "wantNameId": False,
            "signatureAlgorithm": "http://www.w3.org/2001/04/xmldsig-more#rsa-sha256",
            "digestAlgorithm": "http://www.w3.org/2001/04/xmlenc#sha256",
        },
        "contactPerson": {
            "technical": {
                "givenName": "Bank Dhofar Enterprise Architecture",
                "emailAddress": "e.baysal@bankdhofar.com",
            },
        },
        "organization": {
            "en-US": {
                "name": "Bank Dhofar SAOG",
                "displayname": "Bank Dhofar Qantara",
                "url": "https://bankdhofar.com",
            },
        },
    }


def prepare_request(
    *,
    http_host: str,
    path: str,
    get_data: dict[str, Any],
    post_data: dict[str, Any],
) -> dict[str, Any]:
    """Build the request dict OneLogin expects.

    THEQA endpoints are always served over HTTPS at the SP base URL, so we
    force https/443 regardless of the in-cluster scheme (TLS terminates at the
    Istio gateway, the pod sees plain HTTP).
    """
    return {
        "https": "on",
        "http_host": http_host,
        "server_port": "443",
        "script_name": path,
        "get_data": get_data,
        "post_data": post_data,
    }


def build_auth(request_data: dict[str, Any]) -> OneLogin_Saml2_Auth:
    """Instantiate an OneLogin auth object for the given request."""
    return OneLogin_Saml2_Auth(request_data, old_settings=build_settings())


def sp_metadata() -> tuple[str, list[str]]:
    """Return (metadata_xml, errors). errors is empty when valid."""
    saml_settings = OneLogin_Saml2_Settings(
        settings=build_settings(), sp_validation_only=True
    )
    metadata = saml_settings.get_sp_metadata()
    errors = saml_settings.validate_metadata(metadata)
    return metadata, errors
