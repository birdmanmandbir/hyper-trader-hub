# SSR Time Handling and D1 Migration Strategy

## Overview

This document outlines the strategy for handling time-based operations in a Server-Side Rendering (SSR) environment using Cloudflare Workers, D1 database, and Cron jobs. It addresses hydration mismatches, timezone handling, and migration from localStorage to a persistent database solution.

## Table of Contents

1. [Core Principles](#core-principles)
2. [Timezone Handling](#timezone-handling)
3. [D1 Database Schema](#d1-database-schema)
4. [Drizzle ORM Setup](#drizzle-orm-setup)
5. [Time-Based Module Redesign](#time-based-module-redesign)
6. [Cron Job Configuration](#cron-job-configuration)
7. [Migration Strategy](#migration-strategy)
8. [Implementation Guide](#implementation-guide)

## Core Principles

### 1. Server Time as Source of Truth
- All time calculations happen on the server in UTC
- Client receives pre-calculated time values
- No `Date.now()` or `new Date()` in initial render
- Timezone conversions happen server-side

### 2. Progressive Enhancement
- Initial render uses server-provided time
- Client-side updates after hydration
- Graceful degradation for JavaScript-disabled environments

### 3. Data Persistence Strategy
- **D1 Database**: All persistent data (settings, history, sessions)
  - Direct API calls for real-time balance (no caching)
  - Historical snapshots every 30 minutes for analytics
  - User settings, preferences, and checklists
  - Session management for authentication
- **No localStorage**: Fully server-side rendered with D1 persistence

## Timezone Handling

### User Timezone Configuration

```typescript
// Timezone format: UTC offset in hours (e.g., -5 for EST, +8 for CST)
interface UserTimezone {
  offset: number; // -12 to +14
  name: string; // "UTC-5 (EST)" or "UTC+8 (CST)"
  autoDetect: boolean; // Use browser timezone
}
```

### Timezone Detection and Storage

```typescript
// app/lib/timezone.server.ts
export function detectTimezone(request: Request): UserTimezone {
  // Check cookie first
  const cookieHeader = request.headers.get("Cookie");
  const cookies = parseCookies(cookieHeader);
  
  if (cookies.timezone) {
    return JSON.parse(cookies.timezone);
  }
  
  // Fallback to Accept-Language header heuristic
  const acceptLanguage = request.headers.get("Accept-Language");
  const estimatedOffset = estimateTimezoneFromLanguage(acceptLanguage);
  
  return {
    offset: estimatedOffset,
    name: `UTC${estimatedOffset >= 0 ? '+' : ''}${estimatedOffset}`,
    autoDetect: true
  };
}

// app/routes/api.timezone.ts
export async function action({ request, context }: ActionFunctionArgs) {
  const formData = await request.formData();
  const offset = Number(formData.get("offset"));
  const name = String(formData.get("name"));
  
  // Store in D1
  const userAddress = await getUserAddress(request);
  await context.env.DB.prepare(
    "UPDATE user_settings SET timezone_offset = ?, timezone_name = ? WHERE user_address = ?"
  ).bind(offset, name, userAddress).run();
  
  // Set cookie for immediate use
  return json({ success: true }, {
    headers: {
      "Set-Cookie": `timezone=${JSON.stringify({ offset, name })}; Path=/; Max-Age=31536000`
    }
  });
}
```

### Time Conversion Utilities

```typescript
// app/lib/time-utils.server.ts
export function convertUTCToUserTime(utcDate: Date, offset: number): Date {
  const userTime = new Date(utcDate.getTime() + offset * 60 * 60 * 1000);
  return userTime;
}

export function formatUserTime(utcDate: Date, offset: number, format: string): string {
  const userTime = convertUTCToUserTime(utcDate, offset);
  // Use a consistent formatter that works on server
  return formatDate(userTime, format);
}

export function getDayBoundariesUTC(userDate: Date, offset: number): { start: Date; end: Date } {
  // Get user's midnight in UTC
  const userMidnight = new Date(userDate);
  userMidnight.setHours(0, 0, 0, 0);
  
  // Convert to UTC
  const utcStart = new Date(userMidnight.getTime() - offset * 60 * 60 * 1000);
  const utcEnd = new Date(utcStart.getTime() + 24 * 60 * 60 * 1000);
  
  return { start: utcStart, end: utcEnd };
}
```

## D1 Database Schema

### Initial Setup

```bash
# Create D1 database
wrangler d1 create hyper-trader-hub-db

# Add to wrangler.jsonc
{
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "hyper-trader-hub-db",
      "database_id": "your-database-id"
    }
  ]
}
```

### Database Schema

```sql
-- migrations/0001_initial_schema.sql

-- User sessions for authentication
CREATE TABLE user_sessions (
  id TEXT PRIMARY KEY,
  user_address TEXT NOT NULL,
  created_at INTEGER DEFAULT (unixepoch()),
  expires_at INTEGER NOT NULL,
  INDEX idx_user_address (user_address),
  INDEX idx_expires (expires_at)
);

-- User checklists for trading criteria
CREATE TABLE user_checklists (
  user_address TEXT NOT NULL,
  checklist_type TEXT NOT NULL, -- 'entry' or 'exit'
  items TEXT NOT NULL, -- JSON array
  updated_at INTEGER DEFAULT (unixepoch()),
  PRIMARY KEY (user_address, checklist_type)
);

-- User settings with timezone
CREATE TABLE user_settings (
  user_address TEXT PRIMARY KEY,
  daily_target TEXT NOT NULL DEFAULT '{}', -- JSON
  advanced_settings TEXT NOT NULL DEFAULT '{}', -- JSON
  timezone_offset INTEGER DEFAULT 0, -- Hours from UTC (-12 to +14)
  timezone_name TEXT DEFAULT 'UTC',
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

-- Daily balances (stored in UTC)
CREATE TABLE daily_balances (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_address TEXT NOT NULL,
  date TEXT NOT NULL, -- YYYY-MM-DD in UTC
  user_date TEXT NOT NULL, -- YYYY-MM-DD in user's timezone
  start_balance REAL NOT NULL,
  end_balance REAL,
  account_value REAL NOT NULL,
  perps_value REAL NOT NULL,
  spot_value REAL DEFAULT 0,
  staking_value REAL DEFAULT 0,
  daily_pnl REAL,
  daily_pnl_percentage REAL,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  UNIQUE(user_address, date),
  INDEX idx_user_date (user_address, user_date)
);

-- Trading sessions
CREATE TABLE trading_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_address TEXT NOT NULL,
  session_date TEXT NOT NULL, -- User's local date
  start_time INTEGER NOT NULL, -- Unix timestamp
  end_time INTEGER,
  initial_balance REAL NOT NULL,
  final_balance REAL,
  high_balance REAL,
  low_balance REAL,
  pnl REAL,
  pnl_percentage REAL,
  trades_count INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (unixepoch()),
  INDEX idx_user_session (user_address, session_date)
);

-- Position snapshots for historical tracking
CREATE TABLE position_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_address TEXT NOT NULL,
  snapshot_time INTEGER NOT NULL, -- Unix timestamp
  positions TEXT NOT NULL, -- JSON array
  total_pnl REAL NOT NULL,
  account_value REAL NOT NULL,
  leverage REAL NOT NULL,
  margin_used REAL NOT NULL,
  created_at INTEGER DEFAULT (unixepoch()),
  INDEX idx_user_time (user_address, snapshot_time)
);

-- Trade history (for P&L calendar)
CREATE TABLE trade_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_address TEXT NOT NULL,
  trade_date TEXT NOT NULL, -- User's local date YYYY-MM-DD
  trade_time INTEGER NOT NULL, -- Unix timestamp
  coin TEXT NOT NULL,
  side TEXT NOT NULL, -- 'long' or 'short'
  size REAL NOT NULL,
  entry_price REAL NOT NULL,
  exit_price REAL,
  pnl REAL,
  pnl_percentage REAL,
  status TEXT DEFAULT 'open', -- 'open', 'closed', 'liquidated'
  created_at INTEGER DEFAULT (unixepoch()),
  INDEX idx_user_trade_date (user_address, trade_date)
);

-- Streak tracking
CREATE TABLE streak_data (
  user_address TEXT PRIMARY KEY,
  current_streak INTEGER DEFAULT 0,
  best_streak INTEGER DEFAULT 0,
  last_update_date TEXT NOT NULL, -- User's local date
  total_positive_days INTEGER DEFAULT 0,
  total_negative_days INTEGER DEFAULT 0,
  updated_at INTEGER DEFAULT (unixepoch())
);

-- Cron job logs
CREATE TABLE cron_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_name TEXT NOT NULL,
  status TEXT NOT NULL, -- 'started', 'completed', 'failed'
  error_message TEXT,
  users_processed INTEGER DEFAULT 0,
  execution_time_ms INTEGER,
  created_at INTEGER DEFAULT (unixepoch()),
  INDEX idx_job_time (job_name, created_at DESC)
);
```

## Drizzle ORM Setup

### Installation

```bash
# Install runtime dependency
bun add drizzle-orm

# Install dev dependencies
bun add -D drizzle-kit
```

### Configuration

We use separate configurations for local development and production:

#### Local Development Configuration

```typescript
// drizzle-dev.config.ts
import { defineConfig } from 'drizzle-kit';
import * as fs from 'fs';
import * as path from 'path';

// Find the local D1 SQLite file created by Wrangler
function findLocalD1Database() {
  const d1Dir = '.wrangler/state/v3/d1/miniflare-D1DatabaseObject';
  
  if (!fs.existsSync(d1Dir)) {
    throw new Error('Local D1 database directory not found. Run "wrangler dev" first.');
  }
  
  const files = fs.readdirSync(d1Dir);
  const sqliteFile = files.find(f => f.endsWith('.sqlite'));
  
  if (!sqliteFile) {
    throw new Error('No SQLite file found in local D1 directory');
  }
  
  return path.join(d1Dir, sqliteFile);
}

export default defineConfig({
  schema: './app/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: findLocalD1Database(),
  }
});
```

#### Production Configuration

```typescript
// drizzle-prod.config.ts
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './app/db/schema.ts',
  out: './drizzle',
  dialect: "sqlite",
  driver: "d1-http",
  dbCredentials: {
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID || "",
    databaseId: process.env.CLOUDFLARE_DATABASE_ID || "",
    token: process.env.CLOUDFLARE_D1_TOKEN || "",
  }
});
```

#### Environment Variables

Create a `.env` file for production credentials:

```bash
# .env
CLOUDFLARE_ACCOUNT_ID=your-account-id
CLOUDFLARE_DATABASE_ID=your-database-id
CLOUDFLARE_D1_TOKEN=your-api-token
```

#### Available Scripts

```json
{
  "scripts": {
    "db:generate": "drizzle-kit generate --config drizzle-dev.config.ts",
    "db:generate:prod": "drizzle-kit generate --config drizzle-prod.config.ts",
    "db:migrate": "drizzle-kit migrate --config drizzle-dev.config.ts",
    "db:migrate:prod": "drizzle-kit migrate --config drizzle-prod.config.ts",
    "db:push": "drizzle-kit push --config drizzle-dev.config.ts",
    "db:push:prod": "drizzle-kit push --config drizzle-prod.config.ts",
    "db:studio": "drizzle-kit studio --config drizzle-dev.config.ts"
  }
}
```

### Schema Definition

```typescript
// app/db/schema.ts
import { sql } from "drizzle-orm";
import { 
  sqliteTable, 
  text, 
  integer, 
  real, 
  index,
  uniqueIndex 
} from "drizzle-orm/sqlite-core";

// User sessions for authentication
export const userSessions = sqliteTable("user_sessions", {
  id: text("id").primaryKey(),
  userAddress: text("user_address").notNull(),
  createdAt: integer("created_at").default(sql`(unixepoch())`),
  expiresAt: integer("expires_at").notNull(),
}, (table) => {
  return {
    userAddressIdx: index("idx_user_address").on(table.userAddress),
    expiresIdx: index("idx_expires").on(table.expiresAt),
  };
});

// User checklists for trading criteria
export const userChecklists = sqliteTable("user_checklists", {
  userAddress: text("user_address").notNull(),
  checklistType: text("checklist_type").notNull(), // 'entry' or 'exit'
  items: text("items").notNull(), // JSON array
  updatedAt: integer("updated_at").default(sql`(unixepoch())`),
}, (table) => {
  return {
    pk: uniqueIndex("pk_user_checklist").on(table.userAddress, table.checklistType),
  };
});

export const userSettings = sqliteTable("user_settings", {
  userAddress: text("user_address").primaryKey(),
  dailyTarget: text("daily_target").notNull().default('{}'),
  advancedSettings: text("advanced_settings").notNull().default('{}'),
  timezoneOffset: integer("timezone_offset").default(0),
  timezoneName: text("timezone_name").default('UTC'),
  createdAt: integer("created_at").default(sql`(unixepoch())`),
  updatedAt: integer("updated_at").default(sql`(unixepoch())`),
});

export const dailyBalances = sqliteTable("daily_balances", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userAddress: text("user_address").notNull(),
  date: text("date").notNull(), // UTC date
  userDate: text("user_date").notNull(), // User timezone date
  startBalance: real("start_balance").notNull(),
  endBalance: real("end_balance"),
  accountValue: real("account_value").notNull(),
  perpsValue: real("perps_value").notNull(),
  spotValue: real("spot_value").default(0),
  stakingValue: real("staking_value").default(0),
  dailyPnl: real("daily_pnl"),
  dailyPnlPercentage: real("daily_pnl_percentage"),
  createdAt: integer("created_at").default(sql`(unixepoch())`),
  updatedAt: integer("updated_at").default(sql`(unixepoch())`),
}, (table) => {
  return {
    userDateIdx: index("idx_user_date").on(table.userAddress, table.userDate),
    uniqueUserDate: uniqueIndex("unique_user_date").on(table.userAddress, table.date),
  };
});

export const tradingSessions = sqliteTable("trading_sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userAddress: text("user_address").notNull(),
  sessionDate: text("session_date").notNull(),
  startTime: integer("start_time").notNull(),
  endTime: integer("end_time"),
  initialBalance: real("initial_balance").notNull(),
  finalBalance: real("final_balance"),
  highBalance: real("high_balance"),
  lowBalance: real("low_balance"),
  pnl: real("pnl"),
  pnlPercentage: real("pnl_percentage"),
  tradesCount: integer("trades_count").default(0),
  createdAt: integer("created_at").default(sql`(unixepoch())`),
}, (table) => {
  return {
    userSessionIdx: index("idx_user_session").on(table.userAddress, table.sessionDate),
  };
});

export const positionSnapshots = sqliteTable("position_snapshots", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userAddress: text("user_address").notNull(),
  snapshotTime: integer("snapshot_time").notNull(),
  positions: text("positions").notNull(), // JSON
  totalPnl: real("total_pnl").notNull(),
  accountValue: real("account_value").notNull(),
  leverage: real("leverage").notNull(),
  marginUsed: real("margin_used").notNull(),
  createdAt: integer("created_at").default(sql`(unixepoch())`),
}, (table) => {
  return {
    userTimeIdx: index("idx_user_time").on(table.userAddress, table.snapshotTime),
  };
});

// Type exports
export type UserSettings = typeof userSettings.$inferSelect;
export type NewUserSettings = typeof userSettings.$inferInsert;
export type DailyBalance = typeof dailyBalances.$inferSelect;
export type TradingSession = typeof tradingSessions.$inferSelect;
export type PositionSnapshot = typeof positionSnapshots.$inferSelect;
```

### Database Client

```typescript
// app/db/client.server.ts
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export function getDb(env: Env) {
  return drizzle(env.DB, { schema });
}

// Type-safe queries
export async function getUserSettings(db: ReturnType<typeof getDb>, userAddress: string) {
  const result = await db
    .select()
    .from(schema.userSettings)
    .where(eq(schema.userSettings.userAddress, userAddress))
    .limit(1);
  
  return result[0] || null;
}

export async function getDailyBalance(
  db: ReturnType<typeof getDb>, 
  userAddress: string,
  userDate: string
) {
  const result = await db
    .select()
    .from(schema.dailyBalances)
    .where(
      and(
        eq(schema.dailyBalances.userAddress, userAddress),
        eq(schema.dailyBalances.userDate, userDate)
      )
    )
    .limit(1);
  
  return result[0] || null;
}
```

## Time-Based Module Redesign

### 1. Balance Service (Direct API Calls)

```typescript
// app/services/balance.server.ts
import { getDb, getDailyBalance, createDailyBalance } from "~/db/client.server";
import { HyperliquidService, type BalanceInfo } from "~/lib/hyperliquid";
import { getUserDateString } from "~/lib/time-utils.server";

export class BalanceService {
  constructor(
    private env: Env,
    private userAddress: string,
    private timezoneOffset: number = 0
  ) {}

  /**
   * Fetch balance directly from Hyperliquid API
   * No caching - always fresh data
   */
  async getBalance(): Promise<BalanceInfo> {
    const hlService = new HyperliquidService();
    const balance = await hlService.getUserBalances(this.userAddress);
    
    // Ensure daily balance record exists
    await this.ensureDailyBalance(balance);
    
    return balance;
  }

  /**
   * Get today's starting balance from D1
   */
  async getDailyStartBalance(): Promise<number> {
    const db = getDb(this.env);
    const userDate = getUserDateString(new Date(), this.timezoneOffset);
    
    const dailyBalance = await getDailyBalance(db, this.userAddress, userDate);
    return dailyBalance?.startBalance || 0;
  }
}

/**
 * Loader helper to get balance data
 */
export async function getBalanceData(
  env: Env,
  userAddress: string,
  timezoneOffset: number = 0
) {
  const service = new BalanceService(env, userAddress, timezoneOffset);
  
  const [balance, dailyStartBalance] = await Promise.all([
    service.getBalance(),
    service.getDailyStartBalance()
  ]);
  
  return {
    balance,
    dailyStartBalance,
    timestamp: Date.now()
  };
}
```

### 2. API Route for Balance

```typescript
// app/routes/api.balance.ts
import { json, type LoaderFunctionArgs } from "react-router";
import { requireAuth } from "~/lib/auth.server";
import { getBalanceData } from "~/services/balance.server";
import { getUserSettings } from "~/db/client.server";
import { getDb } from "~/db/client.server";

export async function loader({ request, context }: LoaderFunctionArgs) {
  // Require authentication
  const userAddress = await requireAuth(request, context.env);
  
  // Get user timezone
  const db = getDb(context.env);
  const settings = await getUserSettings(db, userAddress);
  const timezoneOffset = settings?.timezoneOffset || 0;
  
  // Get balance data (direct API call, no caching)
  const balanceData = await getBalanceData(
    context.env,
    userAddress,
    timezoneOffset
  );
  
  return json(balanceData);
}

// app/hooks/useRealtimePnL.ts (client-side)
export function useRealtimePnL(positions: Position[]) {
  const [livePrices, setLivePrices] = useState<Record<string, number>>({});
  const [totalPnL, setTotalPnL] = useState(0);
  
  useEffect(() => {
    if (!positions.length) return;
    
    const ws = new WebSocket("wss://api.hyperliquid.xyz/ws");
    const coins = [...new Set(positions.map(p => p.coin))];
    
    ws.onopen = () => {
      ws.send(JSON.stringify({
        method: "subscribe",
        subscription: { type: "allMids" }
      }));
    };
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.channel === "allMids") {
        setLivePrices(data.data);
      }
    };
    
    return () => ws.close();
  }, [positions]);
  
  // Calculate P&L with live prices
  useEffect(() => {
    const pnl = positions.reduce((total, pos) => {
      const livePrice = livePrices[pos.coin];
      if (!livePrice) return total + parseFloat(pos.unrealizedPnl || '0');
      
      const isLong = parseFloat(pos.szi) > 0;
      const size = Math.abs(parseFloat(pos.szi));
      const entry = parseFloat(pos.entryPx);
      
      const pnlPerCoin = isLong ? (livePrice - entry) : (entry - livePrice);
      return total + (pnlPerCoin * size);
    }, 0);
    
    setTotalPnL(pnl);
  }, [positions, livePrices]);
  
  return { totalPnL, livePrices };
}
```

### 3. Trading Time Management

```typescript
// app/components/TradingTimeBar.server.tsx
import { getTradingStatus } from "~/lib/trading-hours.server";

interface TradingTimeBarProps {
  serverTime: string;
  timezoneOffset: number;
  preferences: TradingPreferences;
}

export function TradingTimeBar({ 
  serverTime, 
  timezoneOffset, 
  preferences 
}: TradingTimeBarProps) {
  const status = getTradingStatus(
    new Date(serverTime),
    timezoneOffset,
    preferences
  );
  
  // All calculations done server-side
  return (
    <div className="trading-time-bar">
      <div className="current-time">
        {status.currentUserTime}
      </div>
      <div className={`status ${status.className}`}>
        {status.emoji} {status.text}
      </div>
      <div className="time-bar">
        {/* Pre-calculated positions */}
        {status.periods.map((period) => (
          <div
            key={period.id}
            className={period.className}
            style={{
              left: `${period.leftPercent}%`,
              width: `${period.widthPercent}%`
            }}
          />
        ))}
        <div 
          className="current-indicator"
          style={{ left: `${status.currentPositionPercent}%` }}
        />
      </div>
    </div>
  );
}
```

## Cron Job Configuration

### wrangler.jsonc Configuration

```jsonc
{
  "name": "hyper-trader-hub",
  "crons": [
    // Daily reset at 00:00 UTC
    "0 0 * * *",
    // Position snapshots every 30 minutes
    "*/30 * * * *",
    // Cleanup old data weekly
    "0 3 * * 0"
  ]
}
```

### Cron Handler Implementation

```typescript
// workers/cron.ts
import { getDb } from "~/db/client.server";
import { dailyBalances, positionSnapshots, cronLogs, userSettings } from "~/db/schema";
import { HyperliquidService } from "~/lib/hyperliquid";
import { convertUTCToUserTime } from "~/lib/time-utils.server";
import { sql, and, eq, lt, desc } from "drizzle-orm";

export interface Env {
  DB: D1Database;
}

export default {
  async scheduled(
    event: ScheduledEvent,
    env: Env,
    ctx: ExecutionContext
  ): Promise<void> {
    const startTime = Date.now();
    const db = getDb(env);
    
    try {
      switch (event.cron) {
        case "0 0 * * *":
          await dailyReset(env);
          break;
        case "*/30 * * * *":
          await captureSnapshots(env);
          break;
        case "0 3 * * 0":
          await cleanupOldData(env);
          break;
      }
      
      await logCronExecution(db, event.cron, "completed", null, Date.now() - startTime);
    } catch (error) {
      await logCronExecution(db, event.cron, "failed", error.message, Date.now() - startTime);
      throw error;
    }
  },
} satisfies ExportedHandler<Env>;

async function dailyReset(env: Env) {
  const db = getDb(env);
  const hlService = new HyperliquidService();
  
  // Get all active users
  const users = await db
    .select()
    .from(userSettings)
    .all();
  
  let processedCount = 0;
  
  for (const user of users) {
    try {
      const balance = await hlService.getUserBalances(user.userAddress);
      const now = new Date();
      const utcDate = now.toISOString().split('T')[0];
      const userDate = convertUTCToUserTime(now, user.timezoneOffset || 0)
        .toISOString().split('T')[0];
      
      // Update yesterday's end balance
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayUserDate = convertUTCToUserTime(yesterday, user.timezoneOffset || 0)
        .toISOString().split('T')[0];
      
      await db
        .update(dailyBalances)
        .set({
          endBalance: parseFloat(balance.accountValue),
          dailyPnl: sql`${parseFloat(balance.accountValue)} - start_balance`,
          dailyPnlPercentage: sql`((${parseFloat(balance.accountValue)} - start_balance) / start_balance) * 100`,
          updatedAt: Math.floor(Date.now() / 1000),
        })
        .where(
          and(
            eq(dailyBalances.userAddress, user.userAddress),
            eq(dailyBalances.userDate, yesterdayUserDate)
          )
        );
      
      // Create today's entry
      await db
        .insert(dailyBalances)
        .values({
          userAddress: user.userAddress,
          date: utcDate,
          userDate: userDate,
          startBalance: parseFloat(balance.accountValue),
          accountValue: parseFloat(balance.accountValue),
          perpsValue: parseFloat(balance.accountValue),
          spotValue: 0, // Calculate if needed
          stakingValue: 0, // Calculate if needed
        })
        .onConflictDoNothing();
      
      processedCount++;
    } catch (error) {
      console.error(`Error processing user ${user.userAddress}:`, error);
    }
  }
  
  await logCronExecution(db, "daily-reset", "completed", null, Date.now(), processedCount);
}

async function captureSnapshots(env: Env) {
  const db = getDb(env);
  const hlService = new HyperliquidService();
  
  // Get all users to check for active positions
  const users = await db
    .select()
    .from(userSettings)
    .all();
  
  let processedCount = 0;
  
  for (const user of users) {
    try {
      const balance = await hlService.getUserBalances(user.userAddress);
      
      // Only capture if there are positions
      if (balance.perpetualPositions.length > 0) {
        await db.insert(positionSnapshots).values({
          userAddress: user.userAddress,
          snapshotTime: Math.floor(Date.now() / 1000),
          positions: JSON.stringify(balance.perpetualPositions),
          totalPnl: balance.perpetualPositions.reduce(
            (sum, pos) => sum + parseFloat(pos.unrealizedPnl || '0'),
            0
          ),
          accountValue: parseFloat(balance.accountValue),
          leverage: parseFloat(balance.totalNotionalPosition) / parseFloat(balance.accountValue),
          marginUsed: parseFloat(balance.totalMarginUsed),
        });
        
        processedCount++;
      }
    } catch (error) {
      console.error(`Error capturing snapshot for ${user.userAddress}:`, error);
    }
  }
  
  await logCronExecution(db, "capture-snapshots", "completed", null, Date.now(), processedCount);
}

async function cleanupOldData(env: Env) {
  const db = getDb(env);
  const thirtyDaysAgo = Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60);
  
  // Delete old snapshots
  await db
    .delete(positionSnapshots)
    .where(lt(positionSnapshots.snapshotTime, thirtyDaysAgo));
  
  // Delete old cron logs
  await db
    .delete(cronLogs)
    .where(lt(cronLogs.createdAt, thirtyDaysAgo));
}
```

## Migration Strategy

### Phase 1: Infrastructure Setup (Week 1)

1. **D1 Database Creation**
   ```bash
   # Create the D1 database
   wrangler d1 create hyper-trader-hub-db
   
   # Update wrangler.jsonc with the database ID from the output
   ```

2. **Local Development Setup**
   ```bash
   # Start wrangler dev to create local D1 instance
   wrangler dev
   
   # Generate migrations from schema
   bun run db:generate
   
   # Apply migrations to local D1
   bun run db:push
   
   # Open Drizzle Studio to view local database
   bun run db:studio
   ```

3. **Production Deployment**
   ```bash
   # Set up environment variables
   cp .env.example .env
   # Edit .env with your Cloudflare credentials
   
   # Generate production migrations
   bun run db:generate:prod
   
   # Apply to production D1
   bun run db:push:prod
   ```

4. **Verify Setup**
   - Test database connections
   - Verify schema creation
   - Test basic CRUD operations

5. **Add Timezone Settings**
   - Add timezone picker component
   - Store timezone in cookie and D1
   - Update all time displays

### Phase 2: Settings Migration (Week 2)

1. **Parallel Storage**
   ```typescript
   // app/hooks/useSettings.ts
   export function useSettings() {
     const [localSettings] = useLocalStorage("settings", defaults);
     const dbSettings = useLoaderData<{ settings: UserSettings }>();
     
     // Merge with DB taking precedence
     const settings = { ...localSettings, ...dbSettings.settings };
     
     const updateSettings = async (newSettings: Partial<Settings>) => {
       // Update both localStorage and D1
       setLocalSettings(newSettings);
       await fetch("/api/settings", {
         method: "POST",
         body: JSON.stringify(newSettings),
       });
     };
     
     return [settings, updateSettings];
   }
   ```

2. **Migration Script**
   ```typescript
   // app/routes/api.migrate.ts
   export async function action({ request, context }: ActionFunctionArgs) {
     const { userAddress, localStorageData } = await request.json();
     const db = getDb(context.env);
     
     // Migrate settings
     await db
       .insert(userSettings)
       .values({
         userAddress,
         dailyTarget: JSON.stringify(localStorageData.dailyTarget),
         advancedSettings: JSON.stringify(localStorageData.advancedSettings),
         timezoneOffset: localStorageData.timezoneOffset || 0,
       })
       .onConflictDoUpdate({
         target: userSettings.userAddress,
         set: {
           dailyTarget: JSON.stringify(localStorageData.dailyTarget),
           advancedSettings: JSON.stringify(localStorageData.advancedSettings),
           updatedAt: sql`(unixepoch())`,
         },
       });
     
     return json({ success: true });
   }
   ```

### Phase 3: Balance Tracking (Week 3)

1. **Implement Balance Service**
   - Create server-side balance tracking
   - Set up cron jobs
   - Test snapshot capturing

2. **Update UI Components**
   - Use server-provided timestamps
   - Remove client-side Date.now()
   - Add loading states

### Phase 4: Historical Features (Week 4)

1. **P&L Calendar**
   - Query historical data from D1
   - Server-side rendering of calendar
   - Add export functionality

2. **Performance Analytics**
   - Daily/weekly/monthly charts
   - Win rate tracking
   - Best/worst days analysis

## Implementation Guide

### 1. Environment Setup

```typescript
// worker-configuration.d.ts
interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
}
```

### 2. Loader Pattern for SSR

```typescript
// app/routes/_index.tsx
export async function loader({ request, context }: LoaderFunctionArgs) {
  const userAddress = await getUserAddress(request);
  const db = getDb(context.env);
  
  // Get user settings with timezone
  const settings = await getUserSettings(db, userAddress);
  const timezoneOffset = settings?.timezoneOffset || 0;
  
  // Get server time
  const serverTime = new Date();
  
  // Get today's balance
  const balanceService = new BalanceService(context.env, userAddress, timezoneOffset);
  const dailyBalance = await balanceService.getDailyStartBalance();
  
  // Get trading time status
  const tradingStatus = getTradingStatus(serverTime, timezoneOffset, settings);
  
  return json({
    serverTime: serverTime.toISOString(),
    timezoneOffset,
    settings,
    dailyBalance,
    tradingStatus,
  });
}

export default function Index() {
  const { serverTime, timezoneOffset, settings, dailyBalance, tradingStatus } = 
    useLoaderData<typeof loader>();
  
  // No Date.now() or new Date() in initial render
  // All time-based values come from server
  
  return (
    <div>
      <TradingTimeBar 
        serverTime={serverTime}
        timezoneOffset={timezoneOffset}
        preferences={settings.tradingPreferences}
      />
      {/* Rest of UI */}
    </div>
  );
}
```

### 3. Progressive Enhancement

```typescript
// app/components/LiveClock.tsx
export function LiveClock({ serverTime, timezoneOffset }: Props) {
  // Initial state from server
  const [time, setTime] = useState(serverTime);
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
    // Only start client updates after hydration
    const interval = setInterval(() => {
      setTime(new Date().toISOString());
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);
  
  // Show server time initially, client time after hydration
  const displayTime = isClient 
    ? formatUserTime(new Date(time), timezoneOffset, "HH:mm:ss")
    : formatUserTime(new Date(serverTime), timezoneOffset, "HH:mm:ss");
  
  return <span>{displayTime}</span>;
}
```

## Testing Strategy

### 1. Unit Tests for Time Utils

```typescript
// app/lib/time-utils.test.ts
import { describe, it, expect } from "vitest";
import { convertUTCToUserTime, getDayBoundariesUTC } from "./time-utils.server";

describe("Time Utils", () => {
  it("converts UTC to user time correctly", () => {
    const utc = new Date("2024-01-15T12:00:00Z");
    const est = convertUTCToUserTime(utc, -5);
    expect(est.getHours()).toBe(7);
  });
  
  it("handles timezone boundaries", () => {
    const userDate = new Date("2024-01-15T20:00:00"); // 8 PM user time
    const boundaries = getDayBoundariesUTC(userDate, -5);
    // User's midnight is 5 AM UTC
    expect(boundaries.start.getUTCHours()).toBe(5);
  });
});
```

### 2. Integration Tests

```typescript
// tests/cron.test.ts
import { unstable_dev } from "wrangler";

describe("Cron Jobs", () => {
  it("daily reset creates new balance entries", async () => {
    const worker = await unstable_dev("workers/cron.ts");
    
    // Trigger cron
    await worker.fetch("/__scheduled?cron=0+0+*+*+*");
    
    // Check database
    const db = worker.env.DB;
    const balances = await db.prepare(
      "SELECT * FROM daily_balances WHERE date = date('now')"
    ).all();
    
    expect(balances.results.length).toBeGreaterThan(0);
  });
});
```

## Performance Considerations

### 1. Query Optimization

```sql
-- Add indexes for common queries
CREATE INDEX idx_daily_balance_lookup 
ON daily_balances(user_address, user_date);

CREATE INDEX idx_snapshot_recent 
ON position_snapshots(user_address, snapshot_time DESC);

-- Use covering indexes
CREATE INDEX idx_balance_summary 
ON daily_balances(user_address, user_date, start_balance, daily_pnl);
```

### 2. Data Strategy

```typescript
// Data layers:
// 1. Direct API calls for real-time balance (no caching)
// 2. D1 historical snapshots - Every 30 minutes for analytics
// 3. D1 user data - Settings, sessions, checklists

export async function getBalance(userAddress: string): Promise<BalanceInfo> {
  // Always fetch fresh data
  const hlService = new HyperliquidService();
  return await hlService.getUserBalances(userAddress);
}

export async function getHistoricalSnapshots(
  db: D1Database,
  userAddress: string,
  days: number = 7
): Promise<PositionSnapshot[]> {
  const sinceTime = Math.floor(Date.now() / 1000) - (days * 24 * 60 * 60);
  
  return await db
    .select()
    .from(positionSnapshots)
    .where(
      and(
        eq(positionSnapshots.userAddress, userAddress),
        gte(positionSnapshots.snapshotTime, sinceTime)
      )
    )
    .orderBy(desc(positionSnapshots.snapshotTime))
    .all();
}
```

## Security Considerations

1. **Input Validation**
   - Validate Ethereum addresses
   - Sanitize timezone offsets (-12 to +14)
   - Validate JSON data before storage

2. **Rate Limiting**
   - Implement per-user rate limits
   - Use Cloudflare rate limiting rules
   - Cache API responses

3. **Data Privacy**
   - No PII stored
   - User address as identifier
   - Implement data retention policies

## Monitoring and Alerts

```typescript
// app/lib/monitoring.ts
export async function trackMetric(
  env: Env,
  metric: string,
  value: number,
  tags: Record<string, string> = {}
) {
  // Send to analytics
  await env.ANALYTICS.writeDataPoint({
    metric,
    value,
    tags,
    timestamp: Date.now(),
  });
}

// Usage in cron jobs
await trackMetric(env, "cron.execution_time", executionTime, {
  job: "daily_reset",
  status: "success",
});
```

## Rollback Strategy

1. **Feature Flags**
   ```typescript
   const USE_D1_STORAGE = env.FEATURE_FLAGS?.USE_D1_STORAGE ?? false;
   
   if (USE_D1_STORAGE) {
     return await getFromD1(userAddress);
   } else {
     return getFromLocalStorage();
   }
   ```

2. **Dual Write Period**
   - Write to both localStorage and D1
   - Read from D1 with localStorage fallback
   - Monitor for discrepancies

3. **Data Export**
   - Implement export endpoints
   - Allow users to download their data
   - Provide migration tools

## Future Enhancements

1. **Multi-Region Deployment**
   - Use Durable Objects for user sessions
   - Regional D1 read replicas
   - Smart routing based on user location

2. **Advanced Analytics**
   - Machine learning for trade analysis
   - Pattern recognition
   - Automated alerts

3. **Social Features**
   - Leaderboards (privacy-respecting)
   - Trading competitions
   - Anonymized benchmarking

## Conclusion

This migration strategy provides:
- ✅ No hydration mismatches
- ✅ Proper timezone handling
- ✅ Persistent data storage
- ✅ Historical tracking
- ✅ Scalable architecture
- ✅ Better user experience

The phased approach ensures minimal disruption while gradually improving the system's capabilities.