"""Tests for AIS (Account Information Service) endpoints."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.main import app

AUTH = {"Authorization": "Bearer test-consent-token"}


@pytest.fixture
def client():
    return TestClient(app)


# ── Health ───────────────────────────────────────────────────────────────

class TestHealth:
    def test_health(self, client):
        resp = client.get("/health")
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"

    def test_ready(self, client):
        resp = client.get("/ready")
        assert resp.status_code == 200
        assert resp.json()["status"] == "ready"


# ── Auth ─────────────────────────────────────────────────────────────────

class TestAuth:
    def test_missing_bearer_returns_401(self, client):
        resp = client.get("/open-banking/v4.0/aisp/accounts")
        assert resp.status_code == 401
        body = resp.json()
        assert body["Code"] == "401"
        assert body["Errors"][0]["ErrorCode"] == "UK.OBIE.Header.Missing"

    def test_bearer_token_accepted(self, client):
        resp = client.get("/open-banking/v4.0/aisp/accounts", headers=AUTH)
        assert resp.status_code == 200


# ── FAPI Headers ─────────────────────────────────────────────────────────

class TestFAPIHeaders:
    def test_interaction_id_echoed(self, client):
        resp = client.get(
            "/open-banking/v4.0/aisp/accounts",
            headers={**AUTH, "x-fapi-interaction-id": "test-uuid-123"},
        )
        assert resp.headers["x-fapi-interaction-id"] == "test-uuid-123"

    def test_interaction_id_generated(self, client):
        resp = client.get("/open-banking/v4.0/aisp/accounts", headers=AUTH)
        assert "x-fapi-interaction-id" in resp.headers
        assert len(resp.headers["x-fapi-interaction-id"]) > 0


# ── Account Access Consents ──────────────────────────────────────────────

class TestAccountAccessConsents:
    def test_create_and_get_consent(self, client):
        create_resp = client.post(
            "/open-banking/v4.0/aisp/account-access-consents",
            headers=AUTH,
            json={
                "Data": {
                    "Permissions": [
                        "ReadAccountsBasic",
                        "ReadAccountsDetail",
                        "ReadBalances",
                        "ReadTransactionsBasic",
                        "ReadTransactionsDetail",
                    ]
                },
                "Risk": {},
            },
        )
        assert create_resp.status_code == 201
        consent = create_resp.json()
        assert consent["Data"]["Status"] == "AwaitingAuthorisation"
        assert "ReadBalances" in consent["Data"]["Permissions"]

        consent_id = consent["Data"]["ConsentId"]
        get_resp = client.get(
            f"/open-banking/v4.0/aisp/account-access-consents/{consent_id}",
            headers=AUTH,
        )
        assert get_resp.status_code == 200
        assert get_resp.json()["Data"]["ConsentId"] == consent_id

    def test_delete_consent(self, client):
        create_resp = client.post(
            "/open-banking/v4.0/aisp/account-access-consents",
            headers=AUTH,
            json={"Data": {"Permissions": ["ReadAccountsBasic"]}, "Risk": {}},
        )
        consent_id = create_resp.json()["Data"]["ConsentId"]

        del_resp = client.delete(
            f"/open-banking/v4.0/aisp/account-access-consents/{consent_id}",
            headers=AUTH,
        )
        assert del_resp.status_code == 204

        get_resp = client.get(
            f"/open-banking/v4.0/aisp/account-access-consents/{consent_id}",
            headers=AUTH,
        )
        assert get_resp.status_code == 404

    def test_get_nonexistent_consent_404(self, client):
        resp = client.get(
            "/open-banking/v4.0/aisp/account-access-consents/does-not-exist",
            headers=AUTH,
        )
        assert resp.status_code == 404


# ── Accounts ─────────────────────────────────────────────────────────────

class TestAccounts:
    def test_get_accounts(self, client):
        resp = client.get("/open-banking/v4.0/aisp/accounts", headers=AUTH)
        assert resp.status_code == 200
        data = resp.json()
        accounts = data["Data"]["Account"]
        assert len(accounts) == 5
        assert all(a["AccountId"].startswith("DHOF-") for a in accounts)

    def test_get_single_account(self, client):
        resp = client.get("/open-banking/v4.0/aisp/accounts/DHOF-10001", headers=AUTH)
        assert resp.status_code == 200
        accounts = resp.json()["Data"]["Account"]
        assert len(accounts) == 1
        assert accounts[0]["Currency"] == "OMR"
        assert accounts[0]["Account"][0]["SchemeName"] == "IBAN"
        assert accounts[0]["Account"][0]["Identification"].startswith("OM02DHOF")

    def test_get_nonexistent_account_404(self, client):
        resp = client.get("/open-banking/v4.0/aisp/accounts/DHOF-99999", headers=AUTH)
        assert resp.status_code == 404


# ── Balances ─────────────────────────────────────────────────────────────

class TestBalances:
    def test_get_account_balances(self, client):
        resp = client.get("/open-banking/v4.0/aisp/accounts/DHOF-10001/balances", headers=AUTH)
        assert resp.status_code == 200
        balances = resp.json()["Data"]["Balance"]
        assert len(balances) >= 1
        assert balances[0]["Amount"]["Currency"] == "OMR"
        # OMR uses 3 decimal places
        assert "." in balances[0]["Amount"]["Amount"]

    def test_get_all_balances(self, client):
        resp = client.get("/open-banking/v4.0/aisp/balances", headers=AUTH)
        assert resp.status_code == 200
        balances = resp.json()["Data"]["Balance"]
        assert len(balances) >= 5  # At least one per account


# ── Transactions ─────────────────────────────────────────────────────────

class TestTransactions:
    def test_get_account_transactions(self, client):
        resp = client.get(
            "/open-banking/v4.0/aisp/accounts/DHOF-10001/transactions",
            headers=AUTH,
        )
        assert resp.status_code == 200
        txns = resp.json()["Data"]["Transaction"]
        assert len(txns) >= 20
        assert all(t["AccountId"] == "DHOF-10001" for t in txns)

    def test_get_all_transactions(self, client):
        resp = client.get("/open-banking/v4.0/aisp/transactions", headers=AUTH)
        assert resp.status_code == 200
        txns = resp.json()["Data"]["Transaction"]
        assert len(txns) >= 20

    def test_transaction_has_required_fields(self, client):
        resp = client.get(
            "/open-banking/v4.0/aisp/accounts/DHOF-10001/transactions",
            headers=AUTH,
        )
        txn = resp.json()["Data"]["Transaction"][0]
        assert "TransactionId" in txn
        assert "Amount" in txn
        assert "CreditDebitIndicator" in txn
        assert "Status" in txn
        assert "BookingDateTime" in txn


# ── Beneficiaries ────────────────────────────────────────────────────────

class TestBeneficiaries:
    def test_get_account_beneficiaries(self, client):
        resp = client.get(
            "/open-banking/v4.0/aisp/accounts/DHOF-10001/beneficiaries",
            headers=AUTH,
        )
        assert resp.status_code == 200
        bens = resp.json()["Data"]["Beneficiary"]
        assert len(bens) >= 1

    def test_get_all_beneficiaries(self, client):
        resp = client.get("/open-banking/v4.0/aisp/beneficiaries", headers=AUTH)
        assert resp.status_code == 200


# ── Direct Debits ────────────────────────────────────────────────────────

class TestDirectDebits:
    def test_get_account_direct_debits(self, client):
        resp = client.get(
            "/open-banking/v4.0/aisp/accounts/DHOF-10001/direct-debits",
            headers=AUTH,
        )
        assert resp.status_code == 200
        dds = resp.json()["Data"]["DirectDebit"]
        assert len(dds) >= 1

    def test_get_all_direct_debits(self, client):
        resp = client.get("/open-banking/v4.0/aisp/direct-debits", headers=AUTH)
        assert resp.status_code == 200


# ── Standing Orders ──────────────────────────────────────────────────────

class TestStandingOrders:
    def test_get_account_standing_orders(self, client):
        resp = client.get(
            "/open-banking/v4.0/aisp/accounts/DHOF-10001/standing-orders",
            headers=AUTH,
        )
        assert resp.status_code == 200
        sos = resp.json()["Data"]["StandingOrder"]
        assert len(sos) >= 1

    def test_get_all_standing_orders(self, client):
        resp = client.get("/open-banking/v4.0/aisp/standing-orders", headers=AUTH)
        assert resp.status_code == 200


# ── Scheduled Payments ──────────────────────────────────────────────────

class TestScheduledPayments:
    def test_get_account_scheduled_payments(self, client):
        resp = client.get(
            "/open-banking/v4.0/aisp/accounts/DHOF-10001/scheduled-payments",
            headers=AUTH,
        )
        assert resp.status_code == 200
        sps = resp.json()["Data"]["ScheduledPayment"]
        assert len(sps) >= 1

    def test_get_all_scheduled_payments(self, client):
        resp = client.get("/open-banking/v4.0/aisp/scheduled-payments", headers=AUTH)
        assert resp.status_code == 200


# ── Statements ───────────────────────────────────────────────────────────

class TestStatements:
    def test_get_account_statements(self, client):
        resp = client.get(
            "/open-banking/v4.0/aisp/accounts/DHOF-10001/statements",
            headers=AUTH,
        )
        assert resp.status_code == 200
        stmts = resp.json()["Data"]["Statement"]
        assert len(stmts) >= 1

    def test_get_single_statement(self, client):
        resp = client.get(
            "/open-banking/v4.0/aisp/accounts/DHOF-10001/statements/STMT-202603",
            headers=AUTH,
        )
        assert resp.status_code == 200

    def test_get_statement_transactions(self, client):
        resp = client.get(
            "/open-banking/v4.0/aisp/accounts/DHOF-10001/statements/STMT-202603/transactions",
            headers=AUTH,
        )
        assert resp.status_code == 200
        assert "Transaction" in resp.json()["Data"]


# ── Product ──────────────────────────────────────────────────────────────

class TestProduct:
    def test_get_product(self, client):
        resp = client.get(
            "/open-banking/v4.0/aisp/accounts/DHOF-10001/product",
            headers=AUTH,
        )
        assert resp.status_code == 200
        prods = resp.json()["Data"]["Product"]
        assert len(prods) == 1
        assert prods[0]["ProductName"] == "Al Maha Current Account"


# ── Party ────────────────────────────────────────────────────────────────

class TestParty:
    def test_get_party(self, client):
        resp = client.get(
            "/open-banking/v4.0/aisp/accounts/DHOF-10001/party",
            headers=AUTH,
        )
        assert resp.status_code == 200
        party = resp.json()["Data"]["Party"]
        assert party["Name"] == "Ahmed bin Said Al-Busaidi"


# ── PIS: Domestic Payment Flow ──────────────────────────────────────────

class TestDomesticPayments:
    def test_full_domestic_payment_flow(self, client):
        # 1. Create consent
        consent_resp = client.post(
            "/open-banking/v4.0/pisp/domestic-payment-consents",
            headers=AUTH,
            json={
                "Data": {
                    "Initiation": {
                        "InstructionIdentification": "INST-001",
                        "EndToEndIdentification": "E2E-001",
                        "InstructedAmount": {"Amount": "100.000", "Currency": "OMR"},
                        "CreditorAccount": {
                            "SchemeName": "IBAN",
                            "Identification": "OM02DHOF0002010055667701",
                            "Name": "Fatima bint Khalid Al-Hinai",
                        },
                    }
                },
                "Risk": {"PaymentContextCode": "PartyToParty"},
            },
        )
        assert consent_resp.status_code == 201
        consent_id = consent_resp.json()["Data"]["ConsentId"]

        # 2. Check funds
        funds_resp = client.get(
            f"/open-banking/v4.0/pisp/domestic-payment-consents/{consent_id}/funds-confirmation",
            headers=AUTH,
        )
        assert funds_resp.status_code == 200
        assert funds_resp.json()["Data"]["FundsAvailableResult"]["FundsAvailable"] is True

        # 3. Execute payment
        pay_resp = client.post(
            "/open-banking/v4.0/pisp/domestic-payments",
            headers=AUTH,
            json={
                "Data": {
                    "ConsentId": consent_id,
                    "Initiation": {
                        "InstructionIdentification": "INST-001",
                        "EndToEndIdentification": "E2E-001",
                        "InstructedAmount": {"Amount": "100.000", "Currency": "OMR"},
                        "CreditorAccount": {
                            "SchemeName": "IBAN",
                            "Identification": "OM02DHOF0002010055667701",
                            "Name": "Fatima bint Khalid Al-Hinai",
                        },
                    },
                },
                "Risk": {"PaymentContextCode": "PartyToParty"},
            },
        )
        assert pay_resp.status_code == 201
        payment_id = pay_resp.json()["Data"]["DomesticPaymentId"]

        # 4. Get payment
        get_resp = client.get(
            f"/open-banking/v4.0/pisp/domestic-payments/{payment_id}",
            headers=AUTH,
        )
        assert get_resp.status_code == 200

        # 5. Get payment details
        details_resp = client.get(
            f"/open-banking/v4.0/pisp/domestic-payments/{payment_id}/payment-details",
            headers=AUTH,
        )
        assert details_resp.status_code == 200
        assert "PaymentStatus" in details_resp.json()["Data"]


# ── PIS: Scheduled Payments ─────────────────────────────────────────────

class TestScheduledPaymentsPIS:
    def test_scheduled_payment_flow(self, client):
        consent_resp = client.post(
            "/open-banking/v4.0/pisp/domestic-scheduled-payment-consents",
            headers=AUTH,
            json={
                "Data": {
                    "Initiation": {
                        "RequestedExecutionDateTime": "2026-05-01T09:00:00+04:00",
                        "InstructedAmount": {"Amount": "250.000", "Currency": "OMR"},
                        "CreditorAccount": {
                            "SchemeName": "IBAN",
                            "Identification": "OM02NBOM0001010087654301",
                            "Name": "Al Jazeera Trading LLC",
                        },
                    }
                },
                "Risk": {},
            },
        )
        assert consent_resp.status_code == 201
        consent_id = consent_resp.json()["Data"]["ConsentId"]

        pay_resp = client.post(
            "/open-banking/v4.0/pisp/domestic-scheduled-payments",
            headers=AUTH,
            json={
                "Data": {
                    "ConsentId": consent_id,
                    "Initiation": {
                        "RequestedExecutionDateTime": "2026-05-01T09:00:00+04:00",
                        "InstructedAmount": {"Amount": "250.000", "Currency": "OMR"},
                    },
                },
                "Risk": {},
            },
        )
        assert pay_resp.status_code == 201
        payment_id = pay_resp.json()["Data"]["DomesticScheduledPaymentId"]

        get_resp = client.get(
            f"/open-banking/v4.0/pisp/domestic-scheduled-payments/{payment_id}",
            headers=AUTH,
        )
        assert get_resp.status_code == 200


# ── PIS: Standing Orders ────────────────────────────────────────────────

class TestStandingOrdersPIS:
    def test_standing_order_flow(self, client):
        consent_resp = client.post(
            "/open-banking/v4.0/pisp/domestic-standing-order-consents",
            headers=AUTH,
            json={
                "Data": {
                    "Initiation": {
                        "Frequency": "EvryWorkgDay",
                        "FirstPaymentDateTime": "2026-05-01T09:00:00+04:00",
                        "FirstPaymentAmount": {"Amount": "50.000", "Currency": "OMR"},
                        "CreditorAccount": {
                            "SchemeName": "IBAN",
                            "Identification": "OM02DHOF0001010012345602",
                            "Name": "Ahmed bin Said Al-Busaidi",
                        },
                    }
                },
                "Risk": {},
            },
        )
        assert consent_resp.status_code == 201
        consent_id = consent_resp.json()["Data"]["ConsentId"]

        order_resp = client.post(
            "/open-banking/v4.0/pisp/domestic-standing-orders",
            headers=AUTH,
            json={
                "Data": {
                    "ConsentId": consent_id,
                    "Initiation": {
                        "Frequency": "EvryWorkgDay",
                        "FirstPaymentDateTime": "2026-05-01T09:00:00+04:00",
                        "FirstPaymentAmount": {"Amount": "50.000", "Currency": "OMR"},
                    },
                },
                "Risk": {},
            },
        )
        assert order_resp.status_code == 201
        order_id = order_resp.json()["Data"]["DomesticStandingOrderId"]

        get_resp = client.get(
            f"/open-banking/v4.0/pisp/domestic-standing-orders/{order_id}",
            headers=AUTH,
        )
        assert get_resp.status_code == 200


# ── PIS: International Payments ─────────────────────────────────────────

class TestInternationalPayments:
    def test_international_payment_flow(self, client):
        consent_resp = client.post(
            "/open-banking/v4.0/pisp/international-payment-consents",
            headers=AUTH,
            json={
                "Data": {
                    "Initiation": {
                        "InstructionIdentification": "INT-001",
                        "EndToEndIdentification": "E2E-INT-001",
                        "InstructedAmount": {"Amount": "1000.00", "Currency": "USD"},
                        "CurrencyOfTransfer": "USD",
                        "CreditorAccount": {
                            "SchemeName": "IBAN",
                            "Identification": "AE070331234567890123456",
                            "Name": "Emirates Trading Corp",
                        },
                    }
                },
                "Risk": {},
            },
        )
        assert consent_resp.status_code == 201
        consent_id = consent_resp.json()["Data"]["ConsentId"]

        pay_resp = client.post(
            "/open-banking/v4.0/pisp/international-payments",
            headers=AUTH,
            json={
                "Data": {
                    "ConsentId": consent_id,
                    "Initiation": {
                        "InstructionIdentification": "INT-001",
                        "EndToEndIdentification": "E2E-INT-001",
                        "InstructedAmount": {"Amount": "1000.00", "Currency": "USD"},
                    },
                },
                "Risk": {},
            },
        )
        assert pay_resp.status_code == 201
        payment_id = pay_resp.json()["Data"]["InternationalPaymentId"]

        get_resp = client.get(
            f"/open-banking/v4.0/pisp/international-payments/{payment_id}",
            headers=AUTH,
        )
        assert get_resp.status_code == 200


# ── CoF: Confirmation of Funds ──────────────────────────────────────────

class TestCoF:
    def test_funds_confirmation_flow(self, client):
        consent_resp = client.post(
            "/open-banking/v4.0/cbpii/funds-confirmation-consents",
            headers=AUTH,
            json={
                "Data": {
                    "DebtorAccount": {
                        "SchemeName": "IBAN",
                        "Identification": "OM02DHOF0001010012345601",
                        "Name": "Ahmed bin Said Al-Busaidi",
                    }
                }
            },
        )
        assert consent_resp.status_code == 201
        consent_id = consent_resp.json()["Data"]["ConsentId"]

        check_resp = client.post(
            "/open-banking/v4.0/cbpii/funds-confirmations",
            headers=AUTH,
            json={
                "Data": {
                    "ConsentId": consent_id,
                    "Reference": "Purchase-001",
                    "InstructedAmount": {"Amount": "500.000", "Currency": "OMR"},
                }
            },
        )
        assert check_resp.status_code == 201
        assert check_resp.json()["Data"]["FundsAvailable"] is True

    def test_delete_cof_consent(self, client):
        consent_resp = client.post(
            "/open-banking/v4.0/cbpii/funds-confirmation-consents",
            headers=AUTH,
            json={
                "Data": {
                    "DebtorAccount": {
                        "SchemeName": "IBAN",
                        "Identification": "OM02DHOF0001010012345601",
                    }
                }
            },
        )
        consent_id = consent_resp.json()["Data"]["ConsentId"]

        del_resp = client.delete(
            f"/open-banking/v4.0/cbpii/funds-confirmation-consents/{consent_id}",
            headers=AUTH,
        )
        assert del_resp.status_code == 204


# ── VRP ──────────────────────────────────────────────────────────────────

class TestVRP:
    def test_vrp_flow(self, client):
        consent_resp = client.post(
            "/open-banking/v4.0/pisp/domestic-vrp-consents",
            headers=AUTH,
            json={
                "Data": {
                    "ControlParameters": {
                        "MaximumIndividualAmount": {"Amount": "100.000", "Currency": "OMR"},
                        "PeriodicLimits": [
                            {
                                "Amount": "500.000",
                                "Currency": "OMR",
                                "PeriodType": "Month",
                                "PeriodAlignment": "Calendar",
                            }
                        ],
                    },
                    "Initiation": {
                        "CreditorAccount": {
                            "SchemeName": "IBAN",
                            "Identification": "OM02DHOF0002010055667701",
                            "Name": "Fatima bint Khalid Al-Hinai",
                        }
                    },
                },
                "Risk": {},
            },
        )
        assert consent_resp.status_code == 201
        consent_id = consent_resp.json()["Data"]["ConsentId"]

        # Funds confirmation
        funds_resp = client.post(
            f"/open-banking/v4.0/pisp/domestic-vrp-consents/{consent_id}/funds-confirmation",
            headers=AUTH,
            json={"Data": {"InstructedAmount": {"Amount": "50.000", "Currency": "OMR"}}},
        )
        assert funds_resp.status_code == 201
        assert funds_resp.json()["Data"]["FundsAvailableResult"]["FundsAvailable"] is True

        # Execute VRP
        vrp_resp = client.post(
            "/open-banking/v4.0/pisp/domestic-vrps",
            headers=AUTH,
            json={
                "Data": {
                    "ConsentId": consent_id,
                    "Initiation": {
                        "CreditorAccount": {
                            "SchemeName": "IBAN",
                            "Identification": "OM02DHOF0002010055667701",
                        }
                    },
                    "Instruction": {
                        "InstructedAmount": {"Amount": "50.000", "Currency": "OMR"},
                    },
                },
                "Risk": {},
            },
        )
        assert vrp_resp.status_code == 201
        vrp_id = vrp_resp.json()["Data"]["DomesticVRPId"]

        get_resp = client.get(
            f"/open-banking/v4.0/pisp/domestic-vrps/{vrp_id}",
            headers=AUTH,
        )
        assert get_resp.status_code == 200

    def test_delete_vrp_consent(self, client):
        consent_resp = client.post(
            "/open-banking/v4.0/pisp/domestic-vrp-consents",
            headers=AUTH,
            json={"Data": {"ControlParameters": {}, "Initiation": {}}, "Risk": {}},
        )
        consent_id = consent_resp.json()["Data"]["ConsentId"]

        del_resp = client.delete(
            f"/open-banking/v4.0/pisp/domestic-vrp-consents/{consent_id}",
            headers=AUTH,
        )
        assert del_resp.status_code == 204


# ── Events ───────────────────────────────────────────────────────────────

class TestEvents:
    def test_event_subscription_crud(self, client):
        # Create
        create_resp = client.post(
            "/open-banking/v4.0/events/event-subscriptions",
            headers=AUTH,
            json={
                "Data": {
                    "CallbackUrl": "https://tpp.example.com/callback",
                    "Version": "4.0",
                    "EventTypes": [
                        "urn:uk:org:openbanking:events:resource-update",
                        "urn:uk:org:openbanking:events:consent-authorization-revoked",
                    ],
                }
            },
        )
        assert create_resp.status_code == 201
        sub_id = create_resp.json()["Data"]["EventSubscriptionId"]

        # List
        list_resp = client.get("/open-banking/v4.0/events/event-subscriptions", headers=AUTH)
        assert list_resp.status_code == 200
        subs = list_resp.json()["Data"]["EventSubscription"]
        assert any(s["EventSubscriptionId"] == sub_id for s in subs)

        # Get single
        get_resp = client.get(
            f"/open-banking/v4.0/events/event-subscriptions/{sub_id}",
            headers=AUTH,
        )
        assert get_resp.status_code == 200

        # Update
        update_resp = client.put(
            f"/open-banking/v4.0/events/event-subscriptions/{sub_id}",
            headers=AUTH,
            json={"Data": {"CallbackUrl": "https://tpp.example.com/callback-v2"}},
        )
        assert update_resp.status_code == 200
        assert update_resp.json()["Data"]["CallbackUrl"] == "https://tpp.example.com/callback-v2"

        # Delete
        del_resp = client.delete(
            f"/open-banking/v4.0/events/event-subscriptions/{sub_id}",
            headers=AUTH,
        )
        assert del_resp.status_code == 204

    def test_poll_events(self, client):
        resp = client.get("/open-banking/v4.0/events", headers=AUTH)
        assert resp.status_code == 200

    def test_acknowledge_events(self, client):
        resp = client.post(
            "/open-banking/v4.0/events",
            headers=AUTH,
            json={"sets": {}},
        )
        assert resp.status_code == 200


# ── OBIE Response Envelope ───────────────────────────────────────────────

class TestResponseEnvelope:
    def test_accounts_has_links_and_meta(self, client):
        resp = client.get("/open-banking/v4.0/aisp/accounts", headers=AUTH)
        body = resp.json()
        assert "Links" in body
        assert "Self" in body["Links"]
        assert "Meta" in body
        assert "TotalPages" in body["Meta"]

    def test_omr_three_decimal_places(self, client):
        resp = client.get("/open-banking/v4.0/aisp/accounts/DHOF-10001/balances", headers=AUTH)
        balances = resp.json()["Data"]["Balance"]
        for b in balances:
            if b["Amount"]["Currency"] == "OMR":
                amount = b["Amount"]["Amount"]
                # OMR amounts should have 3 decimal places
                decimal_part = amount.split(".")[1]
                assert len(decimal_part) == 3
