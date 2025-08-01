# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a React Router v7 application built with TypeScript for Hyperliquid users to manage their trading activities. The project uses Server-Side Rendering (SSR) and modern tooling including Vite, TailwindCSS v4, and shadcn/ui components.

### Purpose
Hyper Trader Hub provides Hyperliquid traders with tools to:
- Check perpetual balances and positions
- Set daily trading goals
- Track profit/loss history in a calendar view
- Monitor trading performance over time

### Key Features
- **Hyperliquid API Integration**: Fetches user balances and trading data
- **Local Storage**: User wallet addresses stored in browser localStorage (no backend auth required)
- **Daily Goals**: Users can set and track daily trading targets
- **P&L Calendar**: Visual representation of daily profit/loss performance

## Essential Commands

```bash
# Development
# DO NOT use `bun run dev`, will run manually

# Type checking
bun run typecheck    # Generate types and run TypeScript checking

# Production
bun run build        # Create production build
bun run start        # Run production server

# Docker deployment
docker build -t hyper-trader-hub .
docker run -p 3000:3000 hyper-trader-hub
```

## Architecture

### Technology Stack
- **Framework**: React Router v7 with SSR
- **Language**: TypeScript with strict mode
- **Styling**: TailwindCSS v4 (via Vite plugin) + shadcn/ui components
- **Build Tool**: Vite
- **Package Manager**: Bun
- **Runtime**: Node.js 22 (production Docker image)

### Project Structure
```
app/                 # Main application code
├── root.tsx        # Root layout with HTML structure and error boundary
├── routes.ts       # Route configuration and type exports
├── routes/         # Route components (file-based routing)
├── lib/            # Shared utilities
└── app.css         # Global styles and Tailwind directives
```

### Key Conventions
- Path alias: `~/` maps to `./app/` directory
- Route files in `app/routes/` directory define page components
- shadcn/ui components should be added via CLI to maintain consistency
- CSS variables are used for theming (defined in app.css)

### React Router v7 Specifics
- Routes are defined in `app/routes.ts` using the new route configuration
- Each route file exports a default component and optional meta/loader/action functions
- SSR is enabled by default
- Error boundaries are handled in `root.tsx`
- **Type Convention**: Use `Route.LoaderArgs` and `Route.ActionArgs` instead of `LoaderFunctionArgs` and `ActionFunctionArgs`
  - Import the Route type: `import type { Route } from "./+types/[route-name]";`
  - Example: `export async function loader({ request, context }: Route.LoaderArgs) { ... }`

## Development Notes

### Adding New Routes
Create new route files in `app/routes/` directory. The file structure determines the URL structure.

### Adding UI Components
Use shadcn/ui CLI to add components:
```bash
npx shadcn@latest add [component-name]
```

### TypeScript Path Resolution
The `~/*` alias is configured in both TypeScript and Vite configs. Always use `~/` for imports from the app directory.

### Styling
- TailwindCSS v4 is configured with the new Vite plugin
- Global styles and CSS variables are in `app/app.css`
- Use the `cn()` utility from `~/lib/utils` for conditional classes

## Hyperliquid Integration Notes

### API Usage
- **Server-side only**: Hyperliquid SDK (@nktkas/hyperliquid) is used only on the server side to reduce client bundle size
- **Client-side formatting**: Use the formatting library (`~/lib/formatting`) for all client-side display formatting
- API calls should be made from loader functions in server-side code
- Position analysis calculations are performed server-side for consistency
- Request coalescing and caching (30-second TTL) prevent excessive API calls

### Data Storage
- User wallet addresses are stored in localStorage
- No backend authentication required - wallet address serves as user identifier
- Balance data is cached server-side to minimize API calls

### Key Data Points
- Perpetual positions and balances (spot and staking features have been removed)
- Position analysis with entry/exit fees, TP/SL calculations
- Historical P&L data for calendar view
- Daily goal tracking (stored locally)

## Useful Hooks and Utilities

### useLocalStorage Hook
The project includes a custom `useLocalStorage` hook at `app/hooks/useLocalStorage.ts` that should be used for all localStorage operations:

```typescript
const [value, setValue] = useLocalStorage<T>(key: string, defaultValue: T)
```

Features:
- Type-safe with TypeScript generics
- SSR-safe (checks for window availability)
- Handles JSON parsing/stringifying automatically
- Supports functional updates like useState
- Merges objects with defaults to handle missing properties

Example usage:
```typescript
const [walletAddress, setWalletAddress] = useLocalStorage<string | null>("hyperliquid-wallet", null);
const [target, setTarget] = useLocalStorage<DailyTarget>("dailyTarget", defaultTarget);
```

### Common localStorage Keys
- `hyperliquid-wallet` - User's wallet address
- `dailyTarget` - Daily trading targets
- `advancedSettings` - Advanced settings configuration
- `balance-data` - Cached balance information
- `daily-start-balance` - Balance at start of day
- `trading-entry-checklist` - Entry checklist items
- `trading-exit-checklist` - Exit checklist items

### Best Practices
1. **Always use the useLocalStorage hook** instead of direct localStorage access
2. Use kebab-case for localStorage keys
3. Provide sensible default values
4. Handle potential parsing errors in the hook (already implemented)
5. **Use shared constants** from `~/lib/constants` for:
   - Default values (e.g., `DEFAULT_ADVANCED_SETTINGS`, `DEFAULT_DAILY_TARGET`)
   - Storage keys (e.g., `STORAGE_KEYS.ADVANCED_SETTINGS`)
   - This prevents duplication and ensures consistency across the codebase

### Constants
The project uses a centralized constants file at `app/lib/constants.ts` that exports:
- `DEFAULT_ADVANCED_SETTINGS` - Default values for advanced settings
- `DEFAULT_DAILY_TARGET` - Default values for daily target
- `STORAGE_KEYS` - All localStorage keys used in the app

Example usage:
```typescript
import { DEFAULT_ADVANCED_SETTINGS, STORAGE_KEYS } from "~/lib/constants";

const [settings] = useLocalStorage<AdvancedSettings>(
  STORAGE_KEYS.ADVANCED_SETTINGS,
  DEFAULT_ADVANCED_SETTINGS
);
```

## Formatting Library

The project uses a client-side formatting library at `app/lib/formatting.ts` that provides consistent formatting for display values:

```typescript
import { formatUsdValue, formatPrice, formatPercentage, formatLeverage } from "~/lib/formatting";

// Format USD values with appropriate decimals
formatUsdValue(1234.56) // "$1,234.56"
formatUsdValue(0.0123, 4) // "$0.0123"

// Format prices based on value magnitude
formatPrice(50000) // "50,000"
formatPrice(0.00001234) // "0.00001234"

// Format percentages
formatPercentage(0.0456) // "4.56%"
formatPercentage(-0.123, 1) // "-12.3%"

// Format leverage
formatLeverage(5.5) // "5.5x"
```

## Server-Side Services

### Balance Service (`app/services/balance.server.ts`)
- Fetches balance data from Hyperliquid API
- Implements request coalescing and caching
- Calculates position analysis when positions exist
- Returns consolidated data including balance, orders, and analysis

### Position Analysis (`app/services/position-analysis.server.ts`)
- Calculates detailed position analysis including:
  - Entry and exit fees
  - Take profit analysis with net profits
  - Stop loss analysis with risk calculations
  - Visualization data for charts
  - Risk:Reward ratios and breakeven percentages
- All calculations are done server-side for consistency
- Fee calculations: `size * price * (fee / 100)` where fee is stored as percentage value (e.g., 0.0450 for 0.0450%)

## Database Notes
- Never write migration SQL, let Drizzle Kit do it
- **Never ask to run db-related commands, like db:generate, will do it manually**