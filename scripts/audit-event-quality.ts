import { prisma } from "../src/lib/prisma";
import { cleanPublicText } from "../src/server/hub-scrapers/helpers";

const apply = process.argv.includes("--apply");
const HOUR = 60 * 60 * 1000;

function titleProblems(title: string) {
  const problems: string[] = [];
  if (cleanPublicText(title) !== title) problems.push("encoded markup or boilerplate");
  if (/\s{2,}|[|•·–—:-]\s*$/.test(title)) problems.push("malformed spacing or trailing separator");
  if (/https?:\/\/|www\./i.test(title)) problems.push("URL embedded in title");
  if (/^(calendar|event|events|details|untitled|click here)$/i.test(title.trim())) problems.push("generic title");
  if (title.length < 3 || title.length > 140) problems.push("implausible title length");
  return problems;
}

async function main() {
  const events = await prisma.event.findMany({
    orderBy: [{ startDateTime: "asc" }, { title: "asc" }],
    select: {
      id: true, title: true, startDateTime: true, endDateTime: true,
      isAllDay: true, timeZone: true, sourceName: true, sourceUrl: true,
      originalUrl: true, status: true,
    },
  });

  const titleIssues = events.flatMap((event) => {
    const problems = titleProblems(event.title);
    return problems.length ? [{ ...event, problems, cleanedTitle: cleanPublicText(event.title).replace(/\s+/g, " ").replace(/[|•·–—:-]\s*$/, "").trim() }] : [];
  });

  const dateIssues = events.flatMap((event) => {
    const problems: string[] = [];
    const durationHours = event.endDateTime ? (event.endDateTime.getTime() - event.startDateTime.getTime()) / HOUR : null;
    if (durationHours !== null && durationHours < 0) problems.push("end precedes start");
    if (!event.isAllDay && durationHours !== null && durationHours > 24) problems.push("timed event exceeds 24 hours");
    if (!event.isAllDay && event.startDateTime.getUTCHours() === 4 && event.startDateTime.getUTCMinutes() === 0) problems.push("timed event begins at Eastern midnight");
    if (!event.timeZone) problems.push("missing timezone");
    return problems.length ? [{ ...event, durationHours, problems }] : [];
  });

  console.log(JSON.stringify({ mode: apply ? "apply" : "dry-run", totalEvents: events.length, titleIssueCount: titleIssues.length, dateIssueCount: dateIssues.length, titleIssues, dateIssues }, null, 2));

  if (apply) {
    for (const issue of titleIssues) {
      if (issue.cleanedTitle.length >= 3) await prisma.event.update({ where: { id: issue.id }, data: { title: issue.cleanedTitle } });
    }
    console.log(`Normalized ${titleIssues.length} malformed event title(s). Date/time issues were report-only.`);
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => prisma.$disconnect());
