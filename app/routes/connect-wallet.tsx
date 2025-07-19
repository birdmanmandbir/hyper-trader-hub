import { json, redirect, type ActionFunctionArgs } from "react-router";
import { createSession, sessionCookie, initializeUserData } from "~/lib/auth.server";
import * as React from "react";

export async function action({ request, context }: ActionFunctionArgs) {
  const formData = await request.formData();
  const walletAddress = formData.get("walletAddress") as string;
  
  // Validate wallet address
  if (!walletAddress?.match(/^0x[a-fA-F0-9]{40}$/)) {
    return json({ error: "Invalid wallet address format" }, { status: 400 });
  }
  
  // Create session
  const sessionId = await createSession(context.env, walletAddress);
  
  // Initialize user data if needed
  await initializeUserData(context.env, walletAddress);
  
  // Set cookie and redirect
  return redirect("/", {
    headers: {
      "Set-Cookie": await sessionCookie.serialize(sessionId),
    },
  });
}

// Lazy load client-only components
const Web3Provider = React.lazy(() => import("~/components/Web3Provider.client").then(m => ({ default: m.Web3Provider })));
const WalletConnector = React.lazy(() => import("~/components/WalletConnector").then(m => ({ default: m.WalletConnector })));

export default function ConnectWallet() {
  const [isClient, setIsClient] = React.useState(false);
  
  React.useEffect(() => {
    setIsClient(true);
  }, []);
  
  if (!isClient) {
    // Server-side or initial client render
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Connect Your Wallet</h2>
          <p className="text-muted-foreground">Loading wallet connection...</p>
        </div>
      </div>
    );
  }
  
  return (
    <React.Suspense fallback={
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Connect Your Wallet</h2>
          <p className="text-muted-foreground">Loading wallet connection...</p>
        </div>
      </div>
    }>
      <Web3Provider>
        <div className="min-h-screen flex items-center justify-center p-4">
          <WalletConnector />
        </div>
      </Web3Provider>
    </React.Suspense>
  );
}