import { createHash, timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";

import { ADMIN_COOKIE_NAME } from "@/lib/hub-constants";

function hashValue(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function secureEquals(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function getAdminPassword() {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    throw new Error(
      "ADMIN_PASSWORD environment variable is not set. " +
        "Set it in your Replit Secrets before using the admin panel."
    );
  }
  return password;
}

export async function isAdminAuthenticated() {
  const cookieStore = await cookies();
  const currentCookie = cookieStore.get(ADMIN_COOKIE_NAME)?.value;

  if (!currentCookie) {
    return false;
  }

  return secureEquals(currentCookie, hashValue(getAdminPassword()));
}

export async function createAdminSession() {
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE_NAME, hashValue(getAdminPassword()), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_COOKIE_NAME);
}
