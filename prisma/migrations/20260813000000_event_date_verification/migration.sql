CREATE TYPE "DateVerificationStatus" AS ENUM ('VERIFIED', 'CONFLICT', 'AMBIGUOUS', 'MISSING_EVIDENCE', 'MANUALLY_VERIFIED');

ALTER TABLE "Event"
ADD COLUMN "dateVerificationStatus" "DateVerificationStatus" NOT NULL DEFAULT 'MISSING_EVIDENCE',
ADD COLUMN "dateVerificationReason" TEXT,
ADD COLUMN "dateEvidence" TEXT NOT NULL DEFAULT '[]',
ADD COLUMN "dateVerifiedAt" TIMESTAMP(3),
ADD COLUMN "sourcePublishedText" TEXT;

-- Existing events have not passed the new evidence check. Hold them for review
-- rather than leaving formerly approved records invisible outside the queue.
UPDATE "Event"
SET "status" = 'PENDING',
    "dateVerificationReason" = 'Awaiting date verification after integrity migration.';
