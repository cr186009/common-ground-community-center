ALTER TABLE "EventInterest"
ADD COLUMN "reminderRequested" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "reminderClaimedAt" TIMESTAMP(3),
ADD COLUMN "reminderSentAt" TIMESTAMP(3),
ADD COLUMN "reminderFailure" TEXT;

CREATE INDEX "EventInterest_reminderRequested_reminderSentAt_idx"
ON "EventInterest"("reminderRequested", "reminderSentAt");
