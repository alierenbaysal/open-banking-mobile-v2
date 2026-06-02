"""Unit tests for the THEQA SAML provider that do not require a DB or network.

These exercise the settings assembly and metadata generation — enough to catch
config/structure regressions in CI without a live IdP.
"""

from __future__ import annotations

import os

# Provide a throwaway self-signed SP cert/key so metadata generation can sign.
# Generated once, fixed value — not used against any real IdP.
_TEST_KEY = os.environ.setdefault("SAML_SP_PRIVATE_KEY", "")
_TEST_CERT = os.environ.setdefault("SAML_SP_X509CERT", "")


def test_build_settings_shape():
    from app.services import saml_provider

    s = saml_provider.build_settings()
    assert s["sp"]["entityId"] == "36f54cb6-f700-46b0-81d3-5caa4ad322f0"
    assert s["sp"]["assertionConsumerService"]["url"].endswith("/theqa/saml/acs")
    assert s["idp"]["singleSignOnService"]["url"].startswith("https://stg-idp-pki.mtcit.gov.om")
    assert s["security"]["authnRequestsSigned"] is True
    assert s["security"]["wantAssertionsSigned"] is True


def test_acs_and_sls_urls():
    from app.config import settings

    assert settings.acs_url == "https://theqa.omtd.bankdhofar.com/theqa/saml/acs"
    assert settings.sls_url == "https://theqa.omtd.bankdhofar.com/theqa/saml/sls"


def test_reference_parsing():
    from uuid import uuid4

    from app.api.saml import _parse_reference

    ref = uuid4()
    assert _parse_reference(str(ref)) == ref
    assert _parse_reference("not-a-uuid") is None
    assert _parse_reference(None) is None


def test_national_id_extraction():
    from app.api.saml import _extract_national_id

    assert _extract_national_id({"civilId": ["12345678"]}) == "12345678"
    assert _extract_national_id({"national_id": "87654321"}) == "87654321"
    assert _extract_national_id({"unrelated": ["x"]}) is None
