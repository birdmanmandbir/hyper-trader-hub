#!/bin/bash

# Build the project
echo "Building project..."
bun run build

# Deploy to Cloudflare Pages
echo "Deploying to Cloudflare Pages..."
bunx wrangler pages deploy build/client --project-name=hyper-trader-hub

echo "Deployment complete!"