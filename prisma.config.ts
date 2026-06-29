import { config } from "dotenv";
import { defineConfig, env } from "prisma/config";

// Prisma v7 does not auto-load .env files — load Next.js env files explicitly.
config({ path: ".env" });
config({ path: ".env.local", override: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Neon: use direct (unpooled) URL for migrations when available.
    url: process.env.DIRECT_DATABASE_URL ?? env("DATABASE_URL"),
  },
});
