# Hyper Trader Hub

A comprehensive portfolio tracker and trading assistant for Hyperliquid DEX users. Track your balances, monitor positions, set daily targets, and calculate optimal leverage - all in one place.

![Hyper Trader Hub](https://img.shields.io/badge/Hyperliquid-Trading%20Assistant-blue)
![React Router](https://img.shields.io/badge/React%20Router-v7-red)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)
![Bun](https://img.shields.io/badge/Bun-Latest-orange)

## 🚀 Features

### Portfolio Overview
- **Real-time Balance Tracking**: Monitor your total portfolio value across perps, spot, and staking
- **Automatic Updates**: Balances refresh every 30 seconds with countdown timer
- **Multi-Asset Support**: Track perpetual positions, spot balances, and HYPE staking
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
- **Staking Balance**: Track staked HYPE and pending withdrawals
- **Fee Configuration**: Customize taker (0.04%) and maker (0.012%) fees
- **Local Storage**: All settings persist across sessions
- **No Backend Required**: Direct connection to Hyperliquid API
- **Mobile Responsive**: Works seamlessly on all devices

## 🛠️ Tech Stack

- **Framework**: React Router v7 (SPA mode)
- **Language**: TypeScript
- **Styling**: TailwindCSS v4 + shadcn/ui
- **API**: @nktkas/hyperliquid SDK
- **Build Tool**: Vite + Bun
- **Deployment**: Cloudflare Pages

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

### Cloudflare Pages (Recommended)

#### Manual Deployment
```bash
# Build the project
bun run build

# Deploy to Cloudflare Pages
bunx wrangler pages deploy build/client --project-name=hyper-trader-hub
```

#### Automatic Deployment (GitHub Actions)
1. Add these secrets to your GitHub repository:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`

2. Push to main branch - deployment happens automatically!

### Other Platforms
Since this is a static SPA, you can deploy to:
- Vercel
- Netlify  
- GitHub Pages
- AWS S3 + CloudFront
- Any static hosting service

## 🔧 Configuration

### Environment Setup
No environment variables required! The app connects directly to Hyperliquid's public API.

### Custom Domain
1. Go to Cloudflare Pages dashboard
2. Select your project
3. Go to "Custom domains"
4. Add your domain

## 📱 Usage

### Getting Started
1. Visit the app
2. Enter your Hyperliquid wallet address
3. View your portfolio overview

### Setting Daily Targets
1. Navigate to "Daily Target"
2. Set your daily profit goal (%)
3. Set minimum trades
4. Set risk/reward ratio
5. View required profit per trade

### Advanced Settings
1. Navigate to "Settings"
2. Configure trading fees
3. Settings persist in local storage

## 🔐 Security

- **No Private Keys**: Only public wallet addresses are used
- **Local Storage Only**: All data stored in browser
- **No Backend**: Direct API calls to Hyperliquid
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
- Follow updates on [Twitter](https://twitter.com/yourusername)

---

Built with ❤️ for the Hyperliquid community