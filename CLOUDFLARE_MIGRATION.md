# Cloudflare Pages to Workers Migration Guide

This guide documents the process of migrating a React Router v7 project from Cloudflare Pages (SPA mode) to Cloudflare Workers (SSR mode).

## Overview

Migrating from Cloudflare Pages to Workers enables:
- Server-side rendering (SSR) for better SEO and initial page load
- Edge computing capabilities
- Better environment variable handling
- Type-safe Cloudflare bindings

## Migration Steps

### 1. Install Dependencies

```bash
bun add @cloudflare/vite-plugin @react-router/cloudflare wrangler --dev
```

### 2. Create Worker Entry Point

Create `workers/app.ts`:
```typescript
import { createRequestHandler } from "react-router";

declare module "react-router" {
  export interface AppLoadContext {
    cloudflare: {
      env: Env;
      ctx: ExecutionContext;
    };
  }
}

const requestHandler = createRequestHandler(
  () => import("virtual:react-router/server-build"),
  import.meta.env.MODE
);

export default {
  async fetch(request, env, ctx) {
    return requestHandler(request, {
      cloudflare: { env, ctx },
    });
  },
} satisfies ExportedHandler<Env>;
```

### 3. Create Wrangler Configuration

Create `wrangler.jsonc`:
```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "your-project-name",
  "compatibility_date": "2025-07-19",
  "main": "./workers/app.ts",
  "assets": { "directory": "./build/client", "binding": "ASSETS" },
  "observability": { "enabled": true }
}
```

### 4. Update Vite Configuration

Add Cloudflare plugin to `vite.config.ts`:
```typescript
import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
  plugins: [
    cloudflare({ viteEnvironment: { name: "ssr" } }),
    // ... other plugins
  ],
});
```

### 5. Enable SSR in React Router

Update `react-router.config.ts`:
```typescript
export default {
  ssr: true,
  future: {
    unstable_viteEnvironmentApi: true,
  },
} satisfies Config;
```

### 6. Create Server Entry Point

Create `app/entry.server.tsx`:
```tsx
import type { AppLoadContext, EntryContext } from "react-router";
import { ServerRouter } from "react-router";
import { renderToReadableStream } from "react-dom/server";
import { isbot } from "isbot";

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  routerContext: EntryContext,
  loadContext: AppLoadContext
) {
  const userAgent = request.headers.get("user-agent");
  const isBot = userAgent ? isbot(userAgent) : false;

  const stream = await renderToReadableStream(
    <ServerRouter context={routerContext} url={request.url} />,
    {
      signal: request.signal,
      onError(error: unknown) {
        console.error(error);
        responseStatusCode = 500;
      },
    }
  );

  if (isBot) {
    await stream.allReady;
  }

  responseHeaders.set("Content-Type", "text/html; charset=utf-8");
  responseHeaders.set("X-Powered-By", "React Router");

  return new Response(stream, {
    headers: responseHeaders,
    status: responseStatusCode,
  });
}
```

### 7. Update TypeScript Configuration

Create `tsconfig.cloudflare.json`:
```json
{
  "extends": "./tsconfig.json",
  "include": [
    ".react-router/types/**/*",
    "app/**/*",
    "workers/**/*",
    "worker-configuration.d.ts"
  ],
  "compilerOptions": {
    "composite": true,
    "lib": ["DOM", "DOM.Iterable", "ES2022"],
    "types": ["vite/client"],
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler"
  }
}
```

Update main `tsconfig.json`:
```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.node.json" },
    { "path": "./tsconfig.cloudflare.json" }
  ],
  "compilerOptions": {
    "types": ["./worker-configuration.d.ts"]
  }
}
```

### 8. Update Package Scripts

```json
{
  "scripts": {
    "build": "react-router build",
    "cf-typegen": "wrangler types",
    "deploy": "bun run build && wrangler deploy",
    "dev": "react-router dev",
    "postinstall": "bun run cf-typegen",
    "typecheck": "bun run cf-typegen && react-router typegen && tsc"
  }
}
```

### 9. Update .gitignore

Add Cloudflare-specific files:
```
# Cloudflare
worker-configuration.d.ts
*.tsbuildinfo
```

### 10. Remove Old Files

- Delete `deploy.sh` or any Pages-specific deployment scripts
- Remove `build:static` script from package.json
- Delete any GitHub Actions workflows for Pages deployment

## Deployment

Deploy to Cloudflare Workers:
```bash
bun run deploy
```

## Important Notes

### Node.js Compatibility

The `nodejs_compat` flag is generally **not needed** unless:
- Your app crashes with Node.js module errors at runtime
- You're using libraries that require Node.js APIs without Web API fallbacks

Most modern libraries work with Web APIs available in Workers.

### Environment Variables

- Define variables in `wrangler.jsonc` under `vars`
- Access them via `loadContext.cloudflare.env` in loaders/actions
- Use `wrangler secret` for sensitive values

### Custom Domains

Configure routes in `wrangler.jsonc`:
```jsonc
"routes": [
  {
    "pattern": "yourdomain.com/*",
    "zone_name": "yourdomain.com"
  }
]
```

### Generated Types

The `worker-configuration.d.ts` file is auto-generated and should not be committed to git. It's created by:
- `bun run cf-typegen`
- `postinstall` hook
- `typecheck` script

## Troubleshooting

1. **Build warnings about Node.js imports**: Usually safe to ignore unless runtime errors occur
2. **Type errors**: Run `bun run cf-typegen` to regenerate Worker types
3. **Deployment failures**: Check `wrangler.jsonc` configuration and ensure you're logged in with `wrangler login`