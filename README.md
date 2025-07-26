# Hyper Trader Hub

A comprehensive perpetuals trading assistant for Hyperliquid DEX users. Track your perps positions, monitor P&L, set daily targets, and calculate optimal leverage - all in one place.

![Hyper Trader Hub](https://img.shields.io/badge/Hyperliquid-Trading%20Assistant-blue)
![React Router](https://img.shields.io/badge/React%20Router-v7-red)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)
![Bun](https://img.shields.io/badge/Bun-Latest-orange)

## 🚀 Features

### Portfolio Overview
- **Real-time Balance Tracking**: Monitor your total portfolio value and perpetual positions
- **Automatic Updates**: Balances refresh every 30 seconds with countdown timer
- **Perpetuals Focus**: Track all your perps positions with detailed analytics
- **Leverage Monitoring**: Visual indicators for current leverage and margin usage
- **Position Details**: View entry prices, P&L, and ROE for all positions

### Daily Target System
- **Goal Setting**: Set daily profit targets as percentage of portfolio
- **Progress Tracking**: Visual progress bar with real-time P&L tracking
- **Trade Planning**: Calculate required profit per trade based on your goals
- **Risk Management**: See risk per trade including fees
- **Achievement Alerts**: Get notified when daily targets are reached

### Trading Calculator
- **Leverage Calculator**: Find optimal leverage for 1% price moves
- **Position Sizing**: Calculate exact position size needed
- **Fee Integration**: Account for taker/maker fees in calculations
- **Risk Analysis**: See actual risk including fees (not just theoretical)
- **Effective RR**: Compare target vs actual risk/reward after fees
- **Win Rate Analysis**: Minimum win rate needed to be profitable

### Advanced Features
- **User Authentication**: Secure authentication with Better Auth
- **Cloud Storage**: User data stored in Cloudflare D1 database
- **Fee Configuration**: Customize taker (0.04%) and maker (0.012%) fees
- **Backend API**: Cloudflare Workers for server-side processing
- **Mobile Responsive**: Works seamlessly on all devices

## 🛠️ Tech Stack

- **Framework**: React Router v7 with SSR
- **Language**: TypeScript
- **Styling**: TailwindCSS v4 + shadcn/ui
- **API**: @nktkas/hyperliquid SDK
- **Build Tool**: Vite + Bun
- **Backend**: Cloudflare Workers
- **Database**: Cloudflare D1
- **Auth**: Better Auth

## 📦 Installation

### Prerequisites
- [Bun](https://bun.sh) (recommended) or Node.js 18+
- Git

### Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/hyper-trader-hub.git
cd hyper-trader-hub

# Install dependencies
bun install

# Start development server
bun run dev
```

The app will be available at `http://localhost:5173`

## 🏗️ Building for Production

```bash
# Create production build
bun run build

# Test production build locally
bun run start
```

## 🚀 Deployment

### Cloudflare Workers

```bash
# Deploy to Cloudflare Workers
bun run deploy
```

#### Prerequisites
1. Configure your Cloudflare account ID in `wrangler.jsonc`
2. Set up D1 database:
   ```bash
   wrangler d1 create hyper-trader-hub-db
   ```
3. Run database migrations:
   ```bash
   bun run db:migrate:prod
   ```

#### Automatic Deployment (GitHub Actions)
1. Add these secrets to your GitHub repository:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`

2. Push to main branch - deployment happens automatically!

## 🔧 Configuration

### Environment Setup
1. Set up Better Auth secrets for authentication
2. Configure D1 database bindings in `wrangler.jsonc`
3. The app connects to Hyperliquid's public API server-side

### Custom Domain
1. Configure your domain in `wrangler.jsonc` routes section
2. Or add custom domain via Cloudflare dashboard after deployment

## 📱 Usage

### Getting Started
1. Visit the app
2. Sign in with your GitHub account (or other auth provider)
3. Enter your Hyperliquid wallet address
4. View your portfolio overview

### Setting Daily Targets
1. Navigate to "Daily Target"
2. Set your daily profit goal (%)
3. Set minimum trades
4. Set risk/reward ratio
5. View required profit per trade

### Advanced Settings
1. Navigate to "Settings"
2. Configure trading fees
3. Settings are stored in your user profile

## 🔐 Security

- **No Private Keys**: Only public wallet addresses are used
- **Secure Authentication**: Better Auth for user authentication
- **Server-Side API Calls**: Hyperliquid API calls made from Cloudflare Workers
- **Database Security**: User data stored securely in Cloudflare D1
- **Read-Only**: No trading capabilities, only monitoring

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🙏 Acknowledgments

- [Hyperliquid](https://hyperliquid.xyz) for the amazing DEX
- [@nktkas/hyperliquid](https://github.com/nktkas/hyperliquid-ts) for the TypeScript SDK
- [shadcn/ui](https://ui.shadcn.com) for beautiful components
- [React Router](https://reactrouter.com) for the framework

## 📞 Support

- Create an issue for bug reports
- Start a discussion for feature requests
- Follow updates on [X (Twitter)](https://x.com/NeilBro02384732)

---

Built with ❤️ for the Hyperliquid community