import { PrismaClient } from "@prisma/client";

// Replit deployments may keep the live credential under the explicit
// PRODUCTION_DATABASE_URL name. Prisma itself reads DATABASE_URL, so map the
// production-only alias before the client is created without logging the value.
if (!process.env.DATABASE_URL && process.env.PRODUCTION_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.PRODUCTION_DATABASE_URL;
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
