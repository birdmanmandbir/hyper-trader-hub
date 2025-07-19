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

export const tradeHistory = sqliteTable("trade_history", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userAddress: text("user_address").notNull(),
  tradeDate: text("trade_date").notNull(), // User's local date YYYY-MM-DD
  tradeTime: integer("trade_time").notNull(), // Unix timestamp
  coin: text("coin").notNull(),
  side: text("side").notNull(), // 'long' or 'short'
  size: real("size").notNull(),
  entryPrice: real("entry_price").notNull(),
  exitPrice: real("exit_price"),
  pnl: real("pnl"),
  pnlPercentage: real("pnl_percentage"),
  status: text("status").default('open'), // 'open', 'closed', 'liquidated'
  createdAt: integer("created_at").default(sql`(unixepoch())`),
}, (table) => {
  return {
    userTradeDateIdx: index("idx_user_trade_date").on(table.userAddress, table.tradeDate),
  };
});

export const streakData = sqliteTable("streak_data", {
  userAddress: text("user_address").primaryKey(),
  currentStreak: integer("current_streak").default(0),
  bestStreak: integer("best_streak").default(0),
  lastUpdateDate: text("last_update_date").notNull(), // User's local date
  totalPositiveDays: integer("total_positive_days").default(0),
  totalNegativeDays: integer("total_negative_days").default(0),
  updatedAt: integer("updated_at").default(sql`(unixepoch())`),
});

export const cronLogs = sqliteTable("cron_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  jobName: text("job_name").notNull(),
  status: text("status").notNull(), // 'started', 'completed', 'failed'
  errorMessage: text("error_message"),
  usersProcessed: integer("users_processed").default(0),
  executionTimeMs: integer("execution_time_ms"),
  createdAt: integer("created_at").default(sql`(unixepoch())`),
}, (table) => {
  return {
    jobTimeIdx: index("idx_job_time").on(table.jobName, table.createdAt),
  };
});

// Type exports
export type UserSession = typeof userSessions.$inferSelect;
export type NewUserSession = typeof userSessions.$inferInsert;
export type UserChecklist = typeof userChecklists.$inferSelect;
export type NewUserChecklist = typeof userChecklists.$inferInsert;
export type UserSettings = typeof userSettings.$inferSelect;
export type NewUserSettings = typeof userSettings.$inferInsert;
export type DailyBalance = typeof dailyBalances.$inferSelect;
export type NewDailyBalance = typeof dailyBalances.$inferInsert;
export type TradingSession = typeof tradingSessions.$inferSelect;
export type NewTradingSession = typeof tradingSessions.$inferInsert;
export type PositionSnapshot = typeof positionSnapshots.$inferSelect;
export type NewPositionSnapshot = typeof positionSnapshots.$inferInsert;
export type TradeHistory = typeof tradeHistory.$inferSelect;
export type NewTradeHistory = typeof tradeHistory.$inferInsert;
export type StreakData = typeof streakData.$inferSelect;
export type NewStreakData = typeof streakData.$inferInsert;
export type CronLog = typeof cronLogs.$inferSelect;
export type NewCronLog = typeof cronLogs.$inferInsert;