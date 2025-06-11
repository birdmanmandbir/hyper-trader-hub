# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a React Router v7 application built with TypeScript for Hyperliquid users to manage their trading activities. The project uses Server-Side Rendering (SSR) and modern tooling including Vite, TailwindCSS v4, and shadcn/ui components.

### Purpose
Hyper Trader Hub provides Hyperliquid traders with tools to:
- Check perpetual and spot balances
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
bun run dev          # Start development server with HMR on http://localhost:5173

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
- Use Hyperliquid API to fetch user balances, positions, and trading history
- API calls should be made from loader functions or client-side hooks
- Consider rate limiting and error handling for API requests

### Data Storage
- User wallet addresses are stored in localStorage
- No backend authentication required - wallet address serves as user identifier
- Consider implementing data caching to minimize API calls

### Key Data Points
- Perpetual positions and balances
- Spot balances
- Historical P&L data for calendar view
- Daily goal tracking (stored locally)