CREATE TYPE "DateVerificationStatus" AS ENUM ('VERIFIED', 'CONFLICT', 'AMBIGUOUS', 'MISSING_EVIDENCE', 'MANUALLY_VERIFIED');

ALTER TABLE "Event"
ADD COLUMN "dateVerificationStatus" "DateVerificationStatus" NOT NULL DEFAULT 'MISSING_EVIDENCE',
ADD COLUMN "dateVerificationReason" TEXT,
ADD COLUMN "dateEvidence" TEXT NOT NULL DEFAULT '[]',
ADD COLUMN "dateVerifiedAt" TIMESTAMP(3),
ADD COLUMN "timeVerificationStatus" "DateVerificationStatus" NOT NULL DEFAULT 'MISSING_EVIDENCE',
ADD COLUMN "timeVerificationReason" TEXT,
ADD COLUMN "timeEvidence" TEXT NOT NULL DEFAULT '[]',
ADD COLUMN "timeVerifiedAt" TIMESTAMP(3),
ADD COLUMN "sourcePublishedText" TEXT;
