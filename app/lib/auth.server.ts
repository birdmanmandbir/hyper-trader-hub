import { createCookie, redirect } from "react-router";
import { getDb, getUserSession, createUserSession } from "~/db/client.server";
import * as schema from "~/db/schema";
import { eq } from "drizzle-orm";

export const sessionCookie = createCookie("hyper-trader-session", {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  maxAge: 60 * 60 * 24 * 30, // 30 days
  path: "/",
});

/**
 * Get user address from session
 * Returns null if no valid session
 */
export async function getSessionUser(
  request: Request,
  env: Env
): Promise<string | null> {
  const cookieHeader = request.headers.get("Cookie");
  const sessionId = await sessionCookie.parse(cookieHeader);
  
  if (!sessionId) return null;
  
  const db = getDb(env);
  const session = await getUserSession(db, sessionId);
  
  return session?.userAddress || null;
}

/**
 * Require authentication or redirect to connect wallet
 */
export async function requireAuth(
  request: Request,
  env: Env
): Promise<string> {
  const userAddress = await getSessionUser(request, env);
  
  if (!userAddress) {
    throw redirect("/connect-wallet");
  }
  
  return userAddress;
}

/**
 * Create a new session for user
 */
export async function createSession(
  env: Env,
  userAddress: string
): Promise<string> {
  const db = getDb(env);
  return await createUserSession(db, userAddress);
}

/**
 * Destroy session (logout)
 */
export async function destroySession(
  request: Request
): Promise<Headers> {
  const headers = new Headers();
  headers.append("Set-Cookie", await sessionCookie.serialize("", { maxAge: 0 }));
  return headers;
}

/**
 * Initialize user data if first time
 */
export async function initializeUserData(
  env: Env,
  userAddress: string
): Promise<void> {
  const db = getDb(env);
  
  // Check if user settings exist
  const settings = await db
    .select()
    .from(schema.userSettings)
    .where(eq(schema.userSettings.userAddress, userAddress))
    .limit(1);
  
  if (settings.length === 0) {
    // Create default settings
    await db.insert(schema.userSettings).values({
      userAddress,
      dailyTarget: JSON.stringify({
        targetPercentage: 1,
        minimumTrades: 2,
        fixedSLPercentage: 2,
        fixedLeverageRatio: 10,
      }),
      advancedSettings: JSON.stringify({
        defaultLeverage: 10,
        leverageMap: {},
        takerFee: 2.5,
        makerFee: 0.2,
        streakThreshold: 0.5,
        lossThreshold: 5,
        preferredTimes: [],
        avoidedTimes: [],
        defaultLongCrypto: "BTC",
        defaultShortCrypto: "ETH",
      }),
      timezoneOffset: 0,
    });
  }
}