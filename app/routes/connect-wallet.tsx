import { redirect, type ActionFunctionArgs } from "react-router";
import { createSession, sessionCookie, initializeUserData } from "~/lib/auth.server";
import * as React from "react";

export async function action({ request, context }: ActionFunctionArgs) {
  const formData = await request.formData();
  const walletAddress = formData.get("walletAddress") as string;
  
  // Validate wallet address
  if (!walletAddress?.match(/^0x[a-fA-F0-9]{40}$/)) {
    return Response.json({ error: "Invalid wallet address format" }, { status: 400 });
  }
  
  // Create session
  const sessionId = await createSession(context.cloudflare.env, walletAddress);
  
  // Initialize user data if needed
  await initializeUserData(context.cloudflare.env, walletAddress);
  
  // Set cookie and redirect
  return redirect("/", {
    headers: {
      "Set-Cookie": await sessionCookie.serialize(sessionId),
    },
  });
}

// Client-only component that handles wallet connection
const ClientWalletConnection = React.lazy(() => 
  import("~/components/ClientWalletConnection").then(m => ({ 
    default: m.ClientWalletConnection 
  }))
);

export default function ConnectWallet() {
  const [isClient, setIsClient] = React.useState(false);
  
  React.useEffect(() => {
    setIsClient(true);
  }, []);
  
  const loadingContent = (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4">Connect Your Wallet</h2>
        <p className="text-muted-foreground">Loading wallet connection...</p>
      </div>
    </div>
  );
  
  if (!isClient) {
    return loadingContent;
  }
  
  return (
    <React.Suspense fallback={loadingContent}>
      <ClientWalletConnection />
    </React.Suspense>
  );
}