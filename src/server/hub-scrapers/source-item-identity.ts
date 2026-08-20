export function getSourceItemIdentity(value: string | null | undefined) {
  if (!value) return null;

  try {
    const url = new URL(value);
    const eventId = url.searchParams.get("EID");
    if (/\/calendar\.aspx$/i.test(url.pathname) && eventId) {
      return `${url.origin.toLocaleLowerCase("en-US")}/calendar.aspx?eid=${encodeURIComponent(eventId)}`;
    }

    url.hash = "";
    return url.toString();
  } catch {
    return value.trim() || null;
  }
}
