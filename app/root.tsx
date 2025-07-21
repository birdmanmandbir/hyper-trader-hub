import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";
import { Toaster } from "sonner";
import { Navigation } from "~/components/navigation";
import { PriceStoreInitializer } from "~/components/PriceStoreInitializer";
import { createSession, sessionCookie, destroySession, initializeUserData } from "~/lib/auth.server";

import type { Route } from "./+types/root";
import "./app.css";

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

// Handle wallet connection/disconnection
export async function action({ request, context }: Route.ActionArgs) {
  const formData = await request.formData();
  const actionType = formData.get("action");
  
  if (actionType === "connect") {
    const address = formData.get("address") as string;
    if (!address) {
      return { error: "No wallet address provided" };
    }

    // Create session
    const sessionId = await createSession(context.cloudflare.env, address);
    
    // Initialize user data if first time
    await initializeUserData(context.cloudflare.env, address);
    
    // Return success response with session cookie
    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': await sessionCookie.serialize(sessionId),
        },
      }
    );
  }
  
  if (actionType === "disconnect") {
    // Clear session
    const headers = await destroySession(request, context.cloudflare.env);
    // Return success response with cleared cookie
    const response = new Response(
      JSON.stringify({ success: true }),
      {
        headers: {
          'Content-Type': 'application/json',
          ...Object.fromEntries(headers.entries()),
        },
      }
    );
    return response;
  }
  
  return null;
}

export default function App() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <Outlet />
      <PriceStoreInitializer />
      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: 'white',
            color: 'black',
            border: '1px solid #e5e7eb',
          },
          className: 'sonner-toast',
          descriptionClassName: 'text-gray-600',
        }}
      />
    </div>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="pt-16 p-4 container mx-auto">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full p-4 overflow-x-auto">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
