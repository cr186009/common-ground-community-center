export type ScraperInventoryMismatch =
  | "NONE"
  | "DATABASE_ONLY"
  | "REGISTRY_ONLY";

export type ScraperInventoryAudit = {
  databaseOnly: string[];
  registryOnly: string[];
  duplicateDatabaseNames: string[][];
  matched: string[];
};

export function normalizeInventoryName(name: string) {
  return name
    .normalize("NFKC")
    .toLocaleLowerCase("en-US")
    .replace(/\s+/g, " ")
    .trim();
}

/** Compare persisted sources with the code registry without requiring exact casing. */
export function auditScraperInventory(
  databaseSourceNames: string[],
  registeredScraperNames: string[],
): ScraperInventoryAudit {
  const db = new Map<string, string[]>();
  for (const name of databaseSourceNames) {
    const key = normalizeInventoryName(name);
    db.set(key, [...(db.get(key) ?? []), name]);
  }

  const registry = new Map<string, string[]>();
  for (const name of registeredScraperNames) {
    const key = normalizeInventoryName(name);
    registry.set(key, [...(registry.get(key) ?? []), name]);
  }

  const sort = (values: string[]) => values.sort((a, b) => a.localeCompare(b));
  return {
    databaseOnly: sort(
      [...db].filter(([key]) => !registry.has(key)).flatMap(([, names]) => names),
    ),
    registryOnly: sort(
      [...registry].filter(([key]) => !db.has(key)).flatMap(([, names]) => names),
    ),
    duplicateDatabaseNames: [...db.values()].filter((names) => names.length > 1),
    matched: sort(
      [...db].filter(([key]) => registry.has(key)).map(([, names]) => names[0]),
    ),
  };
}

export function getInventoryMismatch(
  sourceName: string,
  registeredScraperNames: string[],
): ScraperInventoryMismatch {
  const registered = new Set(registeredScraperNames.map(normalizeInventoryName));
  return registered.has(normalizeInventoryName(sourceName)) ? "NONE" : "DATABASE_ONLY";
}
