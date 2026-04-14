/**
 * Small formatting helpers.
 */

export function formatOMR(amount: number): string {
  return `OMR ${amount.toFixed(3)}`;
}

export function formatCompact(amount: number): string {
  if (amount >= 1_000_000) return `OMR ${(amount / 1_000_000).toFixed(2)}M`;
  if (amount >= 1_000) return `OMR ${(amount / 1_000).toFixed(1)}K`;
  return `OMR ${amount.toFixed(0)}`;
}

export function formatPercent(n: number, digits = 1): string {
  return `${(n * 100).toFixed(digits)}%`;
}

export function formatRelative(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.floor(hr / 24);
  return `${days}d ago`;
}

export function formatHour(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString([], { day: "2-digit", month: "short", year: "numeric" });
}

export function maskCard(n: string): string {
  const s = n.replace(/\D/g, "");
  if (s.length < 4) return s;
  return `**** **** **** ${s.slice(-4)}`;
}

export function genOrderRef(): string {
  const year = new Date().getFullYear();
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `INV-${year}-${rand}`;
}

export function genState(): string {
  const arr = new Uint8Array(16);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(arr);
  } else {
    for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}
