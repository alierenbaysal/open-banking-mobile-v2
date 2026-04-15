# Changelog

All notable changes to `@bankdhofar/auto-loans-sdk` will be documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [1.0.0] — 2026-04-15

### Added
- Initial public release.
- `AutoLoansClient` with full CRUD over loan applications, decisions, contracts,
  disbursements, and webhook management.
- `verifyWebhookSignature()` and `parseAndVerifyWebhook()` for HMAC-SHA256
  signature validation (constant-time compare).
- QR helpers: `getQrPayload`, `isQrExpired`, `secondsUntilQrExpiry`.
- RFC 7807 problem-details mapping via `AutoLoansApiError`.
- Auto-generated `Idempotency-Key` (or pass your own).
- Cross-runtime: Node 18+, browsers, Bun, Deno.
- Zero runtime dependencies.
