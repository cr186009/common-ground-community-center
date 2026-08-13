const DEFAULT_RECIPIENT = "chris.a.robertson@gmail.com";

type Notification = {
  subject: string;
  text: string;
};

export async function sendOwnerNotification(notification: Notification) {
  const apiKey = process.env.RESEND_API_KEY || process.env.EMAIL_PROVIDER_API_KEY;
  if (!apiKey) {
    console.warn(`[notifications] Email not configured; saved without notification: ${notification.subject}`);
    return { sent: false as const, reason: "not-configured" as const };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || "Common Ground <onboarding@resend.dev>",
      to: [process.env.ADMIN_NOTIFICATION_EMAIL || DEFAULT_RECIPIENT],
      subject: notification.subject,
      text: notification.text,
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Email provider returned ${response.status}: ${details.slice(0, 300)}`);
  }

  return { sent: true as const };
}

export function notifyOwnerSafely(notification: Notification) {
  return sendOwnerNotification(notification).catch((error) => {
    console.error("[notifications] Saved successfully, but owner notification failed.", error);
    return { sent: false as const, reason: "provider-error" as const };
  });
}
