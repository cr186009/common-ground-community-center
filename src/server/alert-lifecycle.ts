import type { AlertStatus } from "@prisma/client";

export const EXPIRED_ALERT_RETENTION_MS = 14 * 24 * 60 * 60 * 1_000;

export function alertStatusForExpiration(
  expiresAt: Date | null | undefined,
  now = new Date(),
): AlertStatus {
  if (!expiresAt || expiresAt >= now) return "ACTIVE";
  if (expiresAt.getTime() >= now.getTime() - EXPIRED_ALERT_RETENTION_MS) {
    return "EXPIRED";
  }
  return "ARCHIVED";
}

export function resolveAlertStatus(
  requested: AlertStatus | null | undefined,
  expiresAt: Date | null | undefined,
  now = new Date(),
): AlertStatus {
  const lifecycleStatus = alertStatusForExpiration(expiresAt, now);
  return lifecycleStatus === "ACTIVE" ? requested ?? "ACTIVE" : lifecycleStatus;
}

export function expiredAlertArchiveCutoff(now = new Date()) {
  return new Date(now.getTime() - EXPIRED_ALERT_RETENTION_MS);
}
