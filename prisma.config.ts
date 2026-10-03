// Prisma 7 does NOT auto-load .env, and env() throws when a variable is
// unset — so load it explicitly. process.loadEnvFile() never overrides
// already-set variables, so real env (CI, Vercel, one-off exports) wins.
process.loadEnvFile();

import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
