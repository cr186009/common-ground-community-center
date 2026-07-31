-- Preserve one canonical row for each already-imported NWS feature before
-- enforcing database-level identity. The oldest row is retained.
DELETE FROM "Alert"
WHERE "id" IN (
  SELECT "id"
  FROM (
    SELECT
      "id",
      ROW_NUMBER() OVER (
        PARTITION BY "sourceName", "originalUrl"
        ORDER BY "createdAt" ASC, "id" ASC
      ) AS duplicate_number
    FROM "Alert"
    WHERE "sourceName" = 'National Weather Service alerts'
      AND "originalUrl" IS NOT NULL
  ) duplicates
  WHERE duplicate_number > 1
);

ALTER TABLE "Alert" ADD COLUMN "externalId" TEXT;

UPDATE "Alert"
SET "externalId" = "originalUrl"
WHERE "sourceName" = 'National Weather Service alerts'
  AND "originalUrl" IS NOT NULL;

CREATE UNIQUE INDEX "Alert_sourceName_externalId_key"
ON "Alert"("sourceName", "externalId");

-- Apply the public retention policy immediately to existing production data.
UPDATE "Alert"
SET "status" = 'EXPIRED'
WHERE "status" = 'ACTIVE'
  AND "expiresAt" < CURRENT_TIMESTAMP;

UPDATE "Alert"
SET "status" = 'ARCHIVED'
WHERE "status" = 'EXPIRED'
  AND "expiresAt" < CURRENT_TIMESTAMP - INTERVAL '48 hours';
