# D1 Database Quick Start Guide

This guide will help you set up the D1 database for Hyper Trader Hub.

## Prerequisites

- Cloudflare account
- Wrangler CLI installed (`npm install -g wrangler` or via bun)
- Project dependencies installed (`bun install`)

## Step 1: Create D1 Database

```bash
# Login to Cloudflare (if not already logged in)
wrangler login

# Create the D1 database
wrangler d1 create hyper-trader-hub-db
```

This will output something like:
```
✅ Successfully created DB 'hyper-trader-hub-db' in region APAC
Created your new D1 database.

[[d1_databases]]
binding = "DB"
database_name = "hyper-trader-hub-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

## Step 2: Update wrangler.jsonc

Copy the `database_id` from the output above and update your `wrangler.jsonc`:

```jsonc
{
  // ... other config
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "hyper-trader-hub-db",
      "database_id": "YOUR_DATABASE_ID_HERE" // <-- Replace this
    }
  ]
}
```

## Step 3: Set Up Local Development

```bash
# Start wrangler dev to create local D1 instance
# (You can stop it with Ctrl+C after it starts)
wrangler dev

# Generate migrations from schema
bun run db:generate

# Push schema to local D1
bun run db:push

# (Optional) Open Drizzle Studio to view your database
bun run db:studio
```

## Step 4: Set Up Production (Optional)

1. Create a `.env` file from the example:
```bash
cp .env.example .env
```

2. Edit `.env` with your Cloudflare credentials:
```env
CLOUDFLARE_ACCOUNT_ID=your-account-id
CLOUDFLARE_DATABASE_ID=the-database-id-from-step-1
CLOUDFLARE_D1_TOKEN=your-api-token
```

To get your API token:
- Go to https://dash.cloudflare.com/profile/api-tokens
- Create a token with "D1:Edit" permissions

3. Apply schema to production:
```bash
# Generate production migrations
bun run db:generate:prod

# Push to production D1
bun run db:push:prod
```

## Troubleshooting

### "Local D1 database directory not found"
Run `wrangler dev` at least once to create the local D1 instance.

### "No SQLite file found in local D1 directory"
Make sure `wrangler dev` has fully started before running database commands.

### Permission errors with production
Ensure your API token has the correct permissions for D1.

## Next Steps

- Update your application code to use the D1 database
- Implement the migration strategy from localStorage to D1
- Set up cron jobs for automated tasks

## Useful Commands

```bash
# View all your D1 databases
wrangler d1 list

# Execute SQL directly (be careful!)
wrangler d1 execute hyper-trader-hub-db --command "SELECT * FROM user_settings"

# Execute SQL from file
wrangler d1 execute hyper-trader-hub-db --file ./schema.sql

# View database info
wrangler d1 info hyper-trader-hub-db
```