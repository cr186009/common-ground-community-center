import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const here = path.dirname(fileURLToPath(import.meta.url));
const csvDirectory = path.join(here, "csv");

const tableConfiguration = [
  {
    table: "Source",
    model: "source",
    booleans: ["active"],
    dates: ["lastScrapedAt", "createdAt", "updatedAt"],
  },
  {
    table: "Event",
    model: "event",
    booleans: ["isFree", "isKidFriendly", "isOutdoor"],
    numbers: ["confidenceScore"],
    dates: ["startDateTime", "endDateTime", "createdAt", "updatedAt", "lastSeenAt"],
  },
  {
    table: "Alert",
    model: "alert",
    dates: ["startsAt", "expiresAt", "createdAt", "updatedAt", "lastSeenAt"],
  },
  {
    table: "Meeting",
    model: "meeting",
    dates: ["startDateTime", "endDateTime", "createdAt", "updatedAt", "lastSeenAt"],
  },
  {
    table: "VolunteerOpportunity",
    model: "volunteerOpportunity",
    dates: ["dateTime", "createdAt", "updatedAt"],
  },
  {
    table: "ScrapeLog",
    model: "scrapeLog",
    integers: ["itemsFound", "itemsCreated", "itemsUpdated"],
    dates: ["createdAt"],
  },
  {
    table: "SubmittedEvent",
    model: "submittedEvent",
    dates: ["startDateTime", "endDateTime", "createdAt"],
  },
  {
    table: "Subscriber",
    model: "subscriber",
    booleans: ["active"],
    dates: ["createdAt"],
  },
];

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];

    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
    } else if (character === '"') {
      quoted = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n") {
      row.push(field.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field.replace(/\r$/, ""));
    rows.push(row);
  }

  const [headers, ...values] = rows;
  return values
    .filter((valueRow) => valueRow.some((value) => value !== ""))
    .map((valueRow) =>
      Object.fromEntries(headers.map((header, index) => [header, valueRow[index] ?? ""])),
    );
}

function convertRow(row, configuration) {
  const converted = {};

  for (const [key, value] of Object.entries(row)) {
    if (value === "") {
      converted[key] = null;
    } else if (configuration.booleans?.includes(key)) {
      converted[key] = value === "1" || value.toLowerCase() === "true";
    } else if (configuration.integers?.includes(key)) {
      converted[key] = Number.parseInt(value, 10);
    } else if (configuration.numbers?.includes(key)) {
      converted[key] = Number(value);
    } else if (configuration.dates?.includes(key)) {
      // Prisma stores SQLite DateTime values as Unix milliseconds.
      // This also accepts ISO strings if a CSV is later edited manually.
      const date = /^\d+$/.test(value)
        ? new Date(Number(value))
        : new Date(value);
      if (Number.isNaN(date.getTime())) {
        throw new Error(`Invalid date in ${configuration.table}.${key}: ${value}`);
      }
      converted[key] = date;
    } else {
      converted[key] = value;
    }
  }

  return converted;
}

async function main() {
  console.log("Importing CSV data into:", new URL(process.env.DATABASE_URL).host);

  for (const configuration of tableConfiguration) {
    const csvPath = path.join(csvDirectory, `${configuration.table}.csv`);
    const rows = parseCsv(fs.readFileSync(csvPath, "utf8"));
    const data = rows.map((row) => convertRow(row, configuration));
    const model = prisma[configuration.model];

    const result = await model.createMany({
      data,
      skipDuplicates: true,
    });

    const finalCount = await model.count();
    console.log(
      `${configuration.table}: ${result.count} imported, ${rows.length - result.count} skipped, ${finalCount} total`,
    );
  }
}

main()
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
