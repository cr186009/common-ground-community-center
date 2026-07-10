CREATE TABLE "Event" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startDateTime" DATETIME NOT NULL,
    "endDateTime" DATETIME,
    "locationName" TEXT,
    "address" TEXT,
    "city" TEXT NOT NULL,
    "county" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'OTHER',
    "sourceName" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "originalUrl" TEXT,
    "imageUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'APPROVED',
    "confidenceScore" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "lastSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sourceId" TEXT,
    CONSTRAINT "Event_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "Source" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "county" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "scrapeFrequency" TEXT,
    "lastScrapedAt" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "SubmittedEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "submitterName" TEXT NOT NULL,
    "submitterEmail" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startDateTime" DATETIME NOT NULL,
    "endDateTime" DATETIME,
    "locationName" TEXT,
    "address" TEXT,
    "city" TEXT NOT NULL,
    "county" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'OTHER',
    "sourceUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "ScrapeLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceId" TEXT,
    "sourceName" TEXT NOT NULL,
    "level" TEXT NOT NULL DEFAULT 'INFO',
    "message" TEXT NOT NULL,
    "details" TEXT,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" DATETIME,
    CONSTRAINT "ScrapeLog_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "Event_status_startDateTime_idx" ON "Event"("status", "startDateTime");
CREATE INDEX "Event_city_startDateTime_idx" ON "Event"("city", "startDateTime");
CREATE INDEX "Event_county_startDateTime_idx" ON "Event"("county", "startDateTime");
CREATE INDEX "Event_sourceName_startDateTime_idx" ON "Event"("sourceName", "startDateTime");
CREATE UNIQUE INDEX "Source_name_key" ON "Source"("name");
CREATE INDEX "SubmittedEvent_status_startDateTime_idx" ON "SubmittedEvent"("status", "startDateTime");
CREATE INDEX "ScrapeLog_startedAt_idx" ON "ScrapeLog"("startedAt");
CREATE INDEX "ScrapeLog_sourceName_startedAt_idx" ON "ScrapeLog"("sourceName", "startedAt");
