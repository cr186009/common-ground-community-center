export function normalizeInterestEmail(value: string) {
  return value.trim().toLocaleLowerCase("en-US");
}

export function normalizePublicFirstName(value: string) {
  const firstName = value.trim().split(/\s+/u)[0] ?? "";
  return firstName.replace(/[^\p{L}\p{M}'’-]/gu, "").slice(0, 40);
}
