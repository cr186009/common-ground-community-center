const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export async function verifyCaptcha(token: string, remoteIp?: string | null) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Event submissions are temporarily unavailable because CAPTCHA is not configured.");
    }
    return true;
  }

  if (!token) return false;

  const body = new FormData();
  body.set("secret", secret);
  body.set("response", token);
  if (remoteIp) body.set("remoteip", remoteIp);

  const response = await fetch(VERIFY_URL, { method: "POST", body });
  if (!response.ok) return false;
  const result = await response.json() as { success?: boolean };
  return result.success === true;
}
