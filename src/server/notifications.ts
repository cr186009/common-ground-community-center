const DEFAULT_RECIPIENT = "chris.a.robertson@gmail.com";

type Notification = {
  subject: string;
  text: string;
};

type EmailMessage = Notification & { to: string };

export async function sendEmail(message: EmailMessage) {
  const apiKey = process.env.RESEND_API_KEY || process.env.EMAIL_PROVIDER_API_KEY;
  if (!apiKey) return { sent: false as const, reason: "not-configured" as const };

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || "Common Ground <onboarding@resend.dev>",
      to: [message.to],
      subject: message.subject,
      text: message.text,
    }),
  });
  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Email provider returned ${response.status}: ${details.slice(0, 300)}`);
  }
  return { sent: true as const };
}

export async function sendOwnerNotification(notification: Notification) {
  const result = await sendEmail({
    ...notification,
    to: process.env.ADMIN_NOTIFICATION_EMAIL || DEFAULT_RECIPIENT,
  });
  if (!result.sent) {
    console.warn(`[notifications] Email not configured; saved without notification: ${notification.subject}`);
    return result;
  }
  return result;
}

export function notifyOwnerSafely(notification: Notification) {
  return sendOwnerNotification(notification).catch((error) => {
    console.error("[notifications] Saved successfully, but owner notification failed.", error);
    return { sent: false as const, reason: "provider-error" as const };
  });
}
