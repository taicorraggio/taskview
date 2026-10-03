// Prisma 7 does NOT auto-load .env, and env() throws when a variable is
// unset — so load it explicitly. process.loadEnvFile() never overrides
// already-set variables, so real env (CI, Vercel, one-off exports) wins.
import { existsSync } from "node:fs";
import { defineConfig, env } from "prisma/config";

// load .env only when it exists — Vercel injects env directly and has no .env file
if (existsSync(".env")) {
  process.loadEnvFile();
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
