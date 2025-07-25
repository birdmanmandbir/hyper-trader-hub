import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { getDb } from "~/db/client.server";

let authInstance: ReturnType<typeof betterAuth>;

export function createBetterAuth(env: Env): ReturnType<typeof betterAuth> {
  const db = getDb(env)
  if (!authInstance) {
    authInstance = betterAuth({
      database: drizzleAdapter(db, {
        provider: "sqlite",
      }),
      emailAndPassword: {
        enabled: true,
      },
      socialProviders: {
        github: {
          clientId: process.env.GITHUB_CLIENT_ID as string,
          clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
        },
      },
    });
  }
  return authInstance;
}

export function getAuth(env: Env): ReturnType<typeof betterAuth> {
  if (!authInstance) {
    authInstance = createBetterAuth(env);
  }

  return authInstance;
}
