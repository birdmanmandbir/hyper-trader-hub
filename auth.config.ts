// This file is *ONLY* used by the Better Auth CLI!
// It provides a local database connection for CLI operations
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { findLocalD1Database } from "./drizzle-dev.config";

const db = drizzle(findLocalD1Database());

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "sqlite",
  }),
});
