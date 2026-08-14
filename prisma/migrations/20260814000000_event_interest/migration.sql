CREATE TABLE "EventInterest" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT,
    "showNamePublicly" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EventInterest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EventInterest_eventId_email_key" ON "EventInterest"("eventId", "email");
CREATE INDEX "EventInterest_eventId_createdAt_idx" ON "EventInterest"("eventId", "createdAt");
CREATE INDEX "EventInterest_createdAt_idx" ON "EventInterest"("createdAt");

ALTER TABLE "EventInterest"
ADD CONSTRAINT "EventInterest_eventId_fkey"
FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
