import { Prisma, PrismaClient } from "@prisma/client";
import { decode } from "he";

const prisma = new PrismaClient();

const APPLY_CHANGES = process.argv.includes("--apply");

const HTML_ENTITY_PATTERN = /&(?:#\d+|#x[0-9a-f]+|[a-z][a-z0-9]+);/i;

type RepairTarget = {
  model: string;
  fields: string[];
};

const REPAIR_TARGETS: RepairTarget[] = [
  {
    model: "Event",
    fields: [
      "title",
      "description",
      "venueName",
      "location",
      "address",
      "city",
      "county",
      "cost",
      "tags",
      "sourceName",
    ],
  },
  {
    model: "SubmittedEvent",
    fields: [
      "title",
      "description",
      "venueName",
      "location",
      "address",
      "city",
      "county",
      "cost",
    ],
  },
  {
    model: "Meeting",
    fields: [
      "title",
      "description",
      "governmentBody",
      "plainEnglishSummary",
      "location",
      "address",
      "city",
      "county",
    ],
  },
  {
    model: "Alert",
    fields: ["title", "description", "instructions", "city", "county"],
  },
  {
    model: "VolunteerOpportunity",
    fields: [
      "title",
      "description",
      "organization",
      "location",
      "address",
      "city",
      "county",
    ],
  },
];

function delegateName(modelName: string): string {
  return modelName.charAt(0).toLowerCase() + modelName.slice(1);
}

function decodeRepeatedly(value: string): string {
  let result = value;

  // Handles values that were encoded more than once, such as:
  // "&amp;#038;" -> "&#038;" -> "&"
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const decoded = decode(result, {
      isAttributeValue: false,
      strict: false,
    });

    if (decoded === result) {
      break;
    }

    result = decoded;
  }

  return result.replace(/\u00a0/g, " ");
}

function normalizeField(field: string, value: string): string {
  const decoded = decodeRepeatedly(value);

  // Keep paragraph formatting in descriptions and summaries.
  if (
    field === "description" ||
    field === "plainEnglishSummary" ||
    field === "instructions"
  ) {
    return decoded
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n[ \t]+/g, "\n")
      .trim();
  }

  return decoded.replace(/\s+/g, " ").trim();
}

function getAvailableTargets(): RepairTarget[] {
  const models = Prisma.dmmf.datamodel.models;

  return REPAIR_TARGETS.flatMap((target) => {
    const model = models.find((item) => item.name === target.model);

    if (!model) {
      return [];
    }

    const stringFields = new Set(
      model.fields
        .filter((field) => field.kind === "scalar" && field.type === "String")
        .map((field) => field.name),
    );

    const fields = target.fields.filter((field) => stringFields.has(field));

    return fields.length > 0 ? [{ ...target, fields }] : [];
  });
}

async function repairModel(target: RepairTarget) {
  const delegate = (prisma as unknown as Record<string, any>)[
    delegateName(target.model)
  ];

  if (!delegate) {
    console.warn(`Skipping unavailable Prisma model: ${target.model}`);
    return {
      affectedRecords: 0,
      affectedFields: 0,
      updatedRecords: 0,
    };
  }

  const select = Object.fromEntries([
    ["id", true],
    ...target.fields.map((field) => [field, true]),
  ]);

  const records = (await delegate.findMany({
    select,
  })) as Array<Record<string, unknown>>;

  let affectedRecords = 0;
  let affectedFields = 0;
  let updatedRecords = 0;

  for (const record of records) {
    const changes: Record<string, string> = {};
    const previews: Array<{
      field: string;
      before: string;
      after: string;
    }> = [];

    for (const field of target.fields) {
      const value = record[field];

      if (typeof value !== "string" || !HTML_ENTITY_PATTERN.test(value)) {
        continue;
      }

      const normalized = normalizeField(field, value);

      if (normalized === value) {
        continue;
      }

      changes[field] = normalized;
      previews.push({
        field,
        before: value,
        after: normalized,
      });
    }

    if (previews.length === 0) {
      continue;
    }

    affectedRecords += 1;
    affectedFields += previews.length;

    console.log(
      `\n${target.model} ${String(record.id)}${
        APPLY_CHANGES ? " [REPAIR]" : " [AUDIT]"
      }`,
    );

    for (const preview of previews) {
      console.log(`  ${preview.field}`);
      console.log(`    before: ${preview.before}`);
      console.log(`    after:  ${preview.after}`);
    }

    if (APPLY_CHANGES) {
      await delegate.update({
        where: {
          id: record.id,
        },
        data: changes,
      });

      updatedRecords += 1;
    }
  }

  return {
    affectedRecords,
    affectedFields,
    updatedRecords,
  };
}

async function main() {
  const targets = getAvailableTargets();

  console.log(
    APPLY_CHANGES
      ? "Mode: APPLY — matching records will be updated."
      : "Mode: AUDIT — no database records will be changed.",
  );

  console.log(
    `Models checked: ${targets.map((target) => target.model).join(", ")}`,
  );

  let totalAffectedRecords = 0;
  let totalAffectedFields = 0;
  let totalUpdatedRecords = 0;

  for (const target of targets) {
    const result = await repairModel(target);

    totalAffectedRecords += result.affectedRecords;
    totalAffectedFields += result.affectedFields;
    totalUpdatedRecords += result.updatedRecords;
  }

  console.log("\n===== SUMMARY =====");
  console.log(`Affected records: ${totalAffectedRecords}`);
  console.log(`Affected fields:  ${totalAffectedFields}`);

  if (APPLY_CHANGES) {
    console.log(`Updated records:  ${totalUpdatedRecords}`);
  } else {
    console.log("Updated records:  0 — audit mode");
  }
}

main()
  .catch((error) => {
    console.error("HTML entity repair failed:");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
