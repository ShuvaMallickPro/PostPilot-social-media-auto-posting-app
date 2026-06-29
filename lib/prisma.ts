import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/lib/generated/prisma/client";

/**
 * Singleton Prisma client for the app runtime.
 *
 * Why singleton?
 * - Next.js dev hot-reload re-executes modules on every save.
 * - Without a global cache, each reload would open a new DB connection pool.
 * - PostgreSQL has a connection limit; extra pools cause "too many connections" errors.
 *
 * In production each server instance keeps one pool — that is expected and healthy.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const adapter = new PrismaPg({ connectionString });

  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
