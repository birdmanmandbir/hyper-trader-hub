# localStorage to D1 Complete Migration Plan

## Overview

This document outlines the complete migration from localStorage to D1, making Hyper Trader Hub a fully server-side rendered application with no client-side state persistence.

## Current localStorage Usage

| Key | Type | Purpose | Migration Strategy |
|-----|------|---------|-------------------|
| `hyperliquid-wallet` | string | User's wallet address | Session cookie + D1 |
| `dailyTarget` | DailyTarget | Daily trading goals | D1 user_settings table |
| `advancedSettings` | AdvancedSettings | User preferences | D1 user_settings table |
| `daily-start-balance` | DailyStartBalance | Today's starting balance | D1 daily_balances table |
| `trading-entry-checklist` | ChecklistItem[] | Entry criteria | D1 user_checklists table |
| `trading-exit-checklist` | ChecklistItem[] | Exit criteria | D1 user_checklists table |

## Architecture Changes

### 1. Remove Balance Caching
- Remove `current_balances` table
- Direct API calls to Hyperliquid
- Keep historical snapshots for analytics

### 2. Authentication Flow
```
User visits site → Check session cookie → 
  If no session → Show wallet connect
  If session → Load user data from D1
```

### 3. Data Flow
```
User action → Server updates D1 → Return fresh HTML
No client-side state needed!
```

## Implementation Plan

### Phase 1: Update Database Schema

```sql
-- Remove current_balances table (no longer needed)
DROP TABLE IF EXISTS current_balances;

-- User sessions for authentication
CREATE TABLE user_sessions (
  id TEXT PRIMARY KEY,
  user_address TEXT NOT NULL,
  created_at INTEGER DEFAULT (unixepoch()),
  expires_at INTEGER NOT NULL,
  INDEX idx_user_address (user_address),
  INDEX idx_expires (expires_at)
);

-- User checklists (new table)
CREATE TABLE user_checklists (
  user_address TEXT NOT NULL,
  checklist_type TEXT NOT NULL, -- 'entry' or 'exit'
  items TEXT NOT NULL, -- JSON array
  updated_at INTEGER DEFAULT (unixepoch()),
  PRIMARY KEY (user_address, checklist_type)
);

-- Update user_settings to include all preferences
-- (Already has dailyTarget and advancedSettings as JSON)
```

### Phase 2: Authentication System

```typescript
// app/lib/auth.server.ts
import { createCookie } from "react-router";
import { v4 as uuid } from "uuid";

export const sessionCookie = createCookie("session", {
  httpOnly: true,
  secure: true,
  sameSite: "lax",
  maxAge: 60 * 60 * 24 * 30, // 30 days
});

export async function createSession(
  db: D1Database,
  userAddress: string
): Promise<string> {
  const sessionId = uuid();
  const expiresAt = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60);
  
  await db.prepare(
    "INSERT INTO user_sessions (id, user_address, expires_at) VALUES (?, ?, ?)"
  ).bind(sessionId, userAddress, expiresAt).run();
  
  return sessionId;
}

export async function getSession(
  db: D1Database,
  sessionId: string
): Promise<string | null> {
  const session = await db.prepare(
    "SELECT user_address FROM user_sessions WHERE id = ? AND expires_at > ?"
  ).bind(sessionId, Math.floor(Date.now() / 1000)).first();
  
  return session?.user_address || null;
}

export async function requireAuth(request: Request, db: D1Database) {
  const cookieHeader = request.headers.get("Cookie");
  const sessionId = await sessionCookie.parse(cookieHeader);
  
  if (!sessionId) {
    throw redirect("/connect-wallet");
  }
  
  const userAddress = await getSession(db, sessionId);
  if (!userAddress) {
    throw redirect("/connect-wallet");
  }
  
  return userAddress;
}
```

### Phase 3: Update Services

```typescript
// app/services/balance.server.ts
export class BalanceService {
  constructor(
    private userAddress: string,
    private timezoneOffset: number = 0
  ) {}

  /**
   * Direct API call - no caching
   */
  async getBalance(): Promise<BalanceInfo> {
    const hlService = new HyperliquidService();
    return await hlService.getUserBalances(this.userAddress);
  }

  /**
   * Get daily start balance from D1
   */
  async getDailyStartBalance(): Promise<number> {
    const db = getDb(this.env);
    const userDate = getUserDateString(new Date(), this.timezoneOffset);
    
    const dailyBalance = await getDailyBalance(db, this.userAddress, userDate);
    return dailyBalance?.startBalance || 0;
  }
}
```

### Phase 4: Update Routes

```typescript
// app/routes/_index.tsx
export async function loader({ request, context }: LoaderFunctionArgs) {
  const db = getDb(context.env);
  
  // Require authentication
  const userAddress = await requireAuth(request, db);
  
  // Get all user data from D1
  const [settings, dailyBalance, checklists] = await Promise.all([
    getUserSettings(db, userAddress),
    getDailyBalance(db, userAddress, todayDate),
    getUserChecklists(db, userAddress),
  ]);
  
  // Get fresh balance from API
  const balanceService = new BalanceService(userAddress, settings?.timezoneOffset || 0);
  const balance = await balanceService.getBalance();
  
  return json({
    userAddress,
    settings: settings || DEFAULT_SETTINGS,
    dailyBalance,
    balance,
    checklists,
    serverTime: new Date().toISOString(),
  });
}

export default function Index() {
  const data = useLoaderData<typeof loader>();
  
  // No useState, no useLocalStorage, no client state!
  // Everything comes from the server
  
  return <HomePage {...data} />;
}
```

### Phase 5: Update Actions

```typescript
// app/routes/api.settings.ts
export async function action({ request, context }: ActionFunctionArgs) {
  const db = getDb(context.env);
  const userAddress = await requireAuth(request, db);
  
  const formData = await request.formData();
  const settings = JSON.parse(formData.get("settings"));
  
  // Save to D1
  await upsertUserSettings(db, {
    userAddress,
    dailyTarget: settings.dailyTarget,
    advancedSettings: settings.advancedSettings,
    timezoneOffset: settings.timezoneOffset,
  });
  
  return json({ success: true });
}
```

### Phase 6: Wallet Connection Flow

```typescript
// app/routes/connect-wallet.tsx
export async function action({ request, context }: ActionFunctionArgs) {
  const formData = await request.formData();
  const walletAddress = formData.get("walletAddress");
  
  // Validate wallet address
  if (!walletAddress?.match(/^0x[a-fA-F0-9]{40}$/)) {
    return json({ error: "Invalid wallet address" }, { status: 400 });
  }
  
  // Create session
  const db = getDb(context.env);
  const sessionId = await createSession(db, walletAddress);
  
  // Initialize user data if needed
  await initializeUserData(db, walletAddress);
  
  // Set cookie and redirect
  return redirect("/", {
    headers: {
      "Set-Cookie": await sessionCookie.serialize(sessionId),
    },
  });
}

export default function ConnectWallet() {
  return (
    <div className="connect-wallet-page">
      <h1>Connect Your Wallet</h1>
      <form method="post">
        <input
          name="walletAddress"
          placeholder="Enter your Hyperliquid wallet address"
          pattern="^0x[a-fA-F0-9]{40}$"
          required
        />
        <button type="submit">Connect</button>
      </form>
    </div>
  );
}
```

## Migration Steps

### Step 1: Update Database Schema
```bash
# Generate new migration
bun run db:generate

# Apply to local
bun run db:push

# Apply to production
bun run db:push:prod
```

### Step 2: Implement Authentication
1. Create auth utilities
2. Add session management
3. Create wallet connection page

### Step 3: Update Each Route
1. Add `requireAuth` to loaders
2. Remove `useLocalStorage` hooks
3. Move all state to loader data
4. Update forms to use actions

### Step 4: Remove localStorage Dependencies
1. Delete `useLocalStorage` hook
2. Remove localStorage constants
3. Update components to use server data

### Step 5: Testing
1. Test wallet connection flow
2. Test data persistence
3. Test multi-device sync
4. Test session expiration

## Benefits

1. **True SSR**: No hydration mismatches
2. **Multi-device Sync**: Data available everywhere
3. **Better Performance**: No client-side state management
4. **Improved SEO**: Full content on first render
5. **Simpler Code**: No state synchronization logic
6. **Data Persistence**: No risk of losing data

## Considerations

1. **Session Management**: Need to handle expired sessions
2. **Rate Limiting**: Consider adding rate limits per wallet
3. **Data Privacy**: Ensure users can only access their own data
4. **Backup Strategy**: Regular D1 backups

## Rollback Plan

If issues arise:
1. Keep localStorage code commented but not deleted
2. Add feature flag to toggle between localStorage and D1
3. Gradually migrate one feature at a time

## Timeline

- Week 1: Database schema and authentication
- Week 2: Migrate settings and daily targets
- Week 3: Migrate checklists and remaining data
- Week 4: Testing and optimization