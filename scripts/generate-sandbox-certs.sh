#!/usr/bin/env bash
#
# generate-sandbox-certs.sh
#
# Generates a self-signed CA and per-TPP client certificates for the
# Qantara Open Banking sandbox environment.
#
# Usage:
#   ./scripts/generate-sandbox-certs.sh
#
# Output directory: certs/sandbox/
#   ca.crt, ca.key          — Sandbox CA
#   ca-bundle.crt            — CA bundle for Istio mTLS trust
#   {name}.crt, {name}.key  — Per-TPP client certificate and key
#
# The script is idempotent — re-running regenerates everything.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
OUT_DIR="${REPO_ROOT}/certs/sandbox"

CA_DAYS=3650       # 10-year CA validity
CLIENT_DAYS=730    # 2-year client cert validity
KEY_BITS=2048

# TPP definitions: name|CN|O
TPPS=(
  "hisab|hisab-business|Hisab LLC"
  "masroofi|masroofi-wallet|Masroofi Digital"
  "sadad|sadad-payments|Sadad Gateway"
  "salalah-electronics|salalah-souq|Salalah Electronics"
  "muscat-motors|muscat-motors|Muscat Motors"
)

echo "=== Qantara Sandbox Certificate Generator ==="
echo ""
echo "Output directory: ${OUT_DIR}"
echo ""

mkdir -p "${OUT_DIR}"

# ---------------------------------------------------------------------------
# 1. Generate Sandbox CA
# ---------------------------------------------------------------------------
echo "--- Generating Sandbox CA (${CA_DAYS}-day validity) ---"

openssl genrsa -out "${OUT_DIR}/ca.key" ${KEY_BITS} 2>/dev/null

openssl req -new -x509 \
  -key "${OUT_DIR}/ca.key" \
  -out "${OUT_DIR}/ca.crt" \
  -days ${CA_DAYS} \
  -subj "/C=OM/ST=Muscat/O=Bank Dhofar/OU=Open Banking/CN=Qantara Sandbox CA" \
  -sha256

# CA bundle — same file, used by Istio as the trusted CA for client cert validation
cp "${OUT_DIR}/ca.crt" "${OUT_DIR}/ca-bundle.crt"

echo "  CA certificate : ${OUT_DIR}/ca.crt"
echo "  CA key         : ${OUT_DIR}/ca.key"
echo "  CA bundle      : ${OUT_DIR}/ca-bundle.crt"
echo ""

# ---------------------------------------------------------------------------
# 2. Generate per-TPP client certificates
# ---------------------------------------------------------------------------
echo "--- Generating TPP Client Certificates (${CLIENT_DAYS}-day validity) ---"
echo ""

for entry in "${TPPS[@]}"; do
  IFS='|' read -r name cn org <<< "${entry}"

  echo "  [${name}]"
  echo "    CN=${cn}, O=${org}"

  # Generate private key
  openssl genrsa -out "${OUT_DIR}/${name}.key" ${KEY_BITS} 2>/dev/null

  # Generate CSR
  openssl req -new \
    -key "${OUT_DIR}/${name}.key" \
    -out "${OUT_DIR}/${name}.csr" \
    -subj "/C=OM/O=${org}/CN=${cn}" \
    -sha256

  # Sign with CA
  openssl x509 -req \
    -in "${OUT_DIR}/${name}.csr" \
    -CA "${OUT_DIR}/ca.crt" \
    -CAkey "${OUT_DIR}/ca.key" \
    -CAcreateserial \
    -out "${OUT_DIR}/${name}.crt" \
    -days ${CLIENT_DAYS} \
    -sha256 \
    2>/dev/null

  # Clean up CSR (not needed after signing)
  rm -f "${OUT_DIR}/${name}.csr"

  echo "    cert : ${OUT_DIR}/${name}.crt"
  echo "    key  : ${OUT_DIR}/${name}.key"
  echo ""
done

# Clean up CA serial file
rm -f "${OUT_DIR}/ca.srl"

# ---------------------------------------------------------------------------
# 3. Print SHA-256 thumbprints
# ---------------------------------------------------------------------------
echo "=== SHA-256 Certificate Thumbprints ==="
echo ""
echo "These thumbprints are used for OAuth 2.0 certificate-bound access tokens"
echo "(RFC 8705 / x5t#S256 claim in JWTs)."
echo ""

printf "%-22s %s\n" "CERTIFICATE" "SHA-256 THUMBPRINT"
printf "%-22s %s\n" "---------------------" "-------------------------------------------------------------------"

# CA thumbprint
thumbprint=$(openssl x509 -in "${OUT_DIR}/ca.crt" -noout -fingerprint -sha256 | sed 's/.*=//' | tr -d ':')
printf "%-22s %s\n" "ca" "${thumbprint}"

# Per-TPP thumbprints
for entry in "${TPPS[@]}"; do
  IFS='|' read -r name cn org <<< "${entry}"
  thumbprint=$(openssl x509 -in "${OUT_DIR}/${name}.crt" -noout -fingerprint -sha256 | sed 's/.*=//' | tr -d ':')
  printf "%-22s %s\n" "${name}" "${thumbprint}"
done

echo ""
echo "=== Done. ${#TPPS[@]} TPP client certificates generated. ==="
