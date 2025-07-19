# React Router v7 Knowledge Base

This document captures important learnings and best practices for React Router v7 based on our migration experience.

## Key Differences from v6

### 1. Route Configuration
- Routes are now defined in `app/routes.ts` using the new route configuration format
- File-based routing is still supported but route configuration is more explicit
- Type-safe routes with automatic type generation via `react-router typegen`

### 2. SSR by Default
- React Router v7 is SSR-first, especially when used with Cloudflare Workers
- Need to be careful about browser-only APIs (window, localStorage, etc.)
- Use `useEffect` or check `typeof window !== 'undefined'` for client-only code

### 3. Navigation Components

#### NavLink vs Link
- **NavLink**: Automatically detects active state, adds `active` class
- **Link**: Basic navigation without active state detection
- Both support client-side navigation (no page refresh)

#### Important NavLink Props
```tsx
<NavLink
  to="/path"
  end={true}  // Only active on exact match (important for "/" route)
  className="base-styles"  // Can be string or function
>
```

#### Navigation Pitfalls We Encountered
- Don't nest `<a>` tags or NavLink/Link components (causes hydration errors)
- Keep navigation styling simple - complex className functions can cause issues
- Use CSS classes for active states instead of inline styles

### 4. Data Loading and Actions

#### Loaders
- Run on the server during SSR
- Access to Cloudflare bindings via `context.cloudflare.env`
- Must handle both server and client environments

```typescript
export async function loader({ context }: Route.LoaderArgs) {
  const db = context.cloudflare.env.DB;
  // Fetch data
  return { data };
}
```

#### Actions
- Handle form submissions and mutations
- Also run on server with access to Cloudflare bindings
- Use `useFetcher` for non-navigation mutations

### 5. Context and Outlet

#### Sharing Data Across Routes
- Use Outlet context to share state/connections across routes
- Perfect for WebSocket connections, auth state, etc.

```typescript
// In parent component
<Outlet context={{ sharedData }} />

// In child route
const { sharedData } = useOutletContext<ContextType>();
```

#### Performance Optimization
- Establish persistent connections (WebSocket, DB) at root level
- Share via Outlet context to prevent reconnections on navigation
- This significantly improves navigation performance

### 6. Cloudflare Workers Integration

#### Environment Bindings
- Access D1, KV, R2, etc. via `context.cloudflare.env`
- Available in loaders, actions, and middleware
- Type safety via `wrangler types` command

#### WebSocket Considerations
- Use standard WebSocket API, not Node.js `ws` package
- Workers are stateless - connections don't persist between requests
- Client-side WebSocket connections are preferred for real-time data

### 7. Forms and Mutations

#### Best Practices
- Use `Form` component for navigation + mutation
- Use `fetcher.Form` for mutation without navigation
- Always prefer progressive enhancement

```typescript
// Navigation form
import { Form } from "react-router";
<Form method="post" action="/settings">

// Non-navigation form
const fetcher = useFetcher();
<fetcher.Form method="post" action="/api/update">
```

### 8. Error Handling

#### Error Boundaries
- Define in root.tsx for app-wide error handling
- Use `isRouteErrorResponse` to detect route errors
- Handle both 404s and unexpected errors

```typescript
export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  if (isRouteErrorResponse(error)) {
    // Handle route errors (404, etc.)
  }
  // Handle unexpected errors
}
```

### 9. Type Safety

#### Route Types
- Import types from generated `+types` files
- Use `Route.LoaderArgs`, `Route.ActionArgs`, etc.
- Run `bun run typecheck` to generate types

```typescript
import type { Route } from "./+types/route-name";

export async function loader({ request, context }: Route.LoaderArgs) {
  // Fully typed!
}
```

### 10. Performance Tips

1. **Minimize WebSocket Reconnections**
   - Establish at root level
   - Share via context
   - Prevents delays on navigation

2. **Optimize Bundle Size**
   - Use dynamic imports for heavy components
   - Tree-shake unused exports
   - Monitor with `bun run build --analyze`

3. **Leverage SSR**
   - Pre-render data in loaders
   - Minimize client-side data fetching
   - Use streaming for large responses

### 11. Common Gotchas

1. **Hydration Mismatches**
   - Ensure server and client render identical HTML
   - Be careful with time-dependent or random values
   - Use `useEffect` for client-only UI updates

2. **Navigation State**
   - Navigation is asynchronous
   - Use `useNavigation()` hook to show loading states
   - Handle pending states in UI

3. **Form Resubmission**
   - Browser back button can trigger form resubmission
   - Use PRG (Post-Redirect-Get) pattern
   - Or use `fetcher` for non-navigation mutations

### 12. Testing Considerations

- Mock `context.cloudflare.env` in tests
- Use `createRoutesStub` for isolated route testing
- Test both server and client rendering paths

## Migration Checklist

When migrating from React Router v6 to v7:

- [ ] Update route configuration to new format
- [ ] Replace `useLoaderData` types with generated types
- [ ] Update forms to use new `Form` component
- [ ] Handle SSR requirements (window, localStorage)
- [ ] Add error boundaries
- [ ] Generate types with `react-router typegen`
- [ ] Test navigation performance
- [ ] Verify hydration (no mismatches)
- [ ] Update deployment configuration

## Resources

- [React Router v7 Docs](https://reactrouter.com/start/framework)
- [Cloudflare Workers + React Router](https://reactrouter.com/start/framework/deployment#cloudflare)
- [Type Safety Guide](https://reactrouter.com/start/framework/type-safety)