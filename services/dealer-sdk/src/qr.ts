/**
 * QR-payload helpers.
 *
 * The dealer's web/mobile app receives an Application from createApplication()
 * with a `qr.payload` URL. The dealer then renders that URL as a QR for the
 * customer to scan. This module is just a tiny convenience.
 *
 * We deliberately do NOT bundle a QR-rendering library — pick whichever
 * library best fits your stack:
 *   - browser: `qr-code-styling`, `qrcode`, `react-qr-code`
 *   - server: `qrcode`
 */

import type { Application } from "./types.js";

export function getQrPayload(application: Application): string {
  return application.qr.payload;
}

export function getQrExpiresAt(application: Application): Date {
  return new Date(application.qr.expires_at);
}

export function isQrExpired(application: Application, now: Date = new Date()): boolean {
  return getQrExpiresAt(application).getTime() <= now.getTime();
}

export function secondsUntilQrExpiry(application: Application, now: Date = new Date()): number {
  const ms = getQrExpiresAt(application).getTime() - now.getTime();
  return Math.max(0, Math.ceil(ms / 1000));
}
