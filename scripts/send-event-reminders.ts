import { prisma } from "../src/lib/prisma";
import { sendDueEventReminders } from "../src/server/event-reminders";

sendDueEventReminders()
  .then((result) => console.log(JSON.stringify(result)))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
