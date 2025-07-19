import { json, redirect, type ActionFunctionArgs } from "react-router";
import { createSession, sessionCookie, initializeUserData } from "~/lib/auth.server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";

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

export default function ConnectWallet() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Connect Your Wallet</CardTitle>
          <CardDescription>
            Enter your Hyperliquid wallet address to continue
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form method="post" className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="walletAddress" className="text-sm font-medium">
                Wallet Address
              </label>
              <Input
                id="walletAddress"
                name="walletAddress"
                placeholder="0x..."
                pattern="^0x[a-fA-F0-9]{40}$"
                required
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Your Ethereum-compatible wallet address (42 characters starting with 0x)
              </p>
            </div>
            
            <Button type="submit" className="w-full">
              Connect Wallet
            </Button>
          </form>
          
          <div className="mt-6 text-sm text-muted-foreground">
            <p className="font-medium mb-2">Why do we need your wallet address?</p>
            <ul className="space-y-1 list-disc list-inside">
              <li>To fetch your Hyperliquid trading data</li>
              <li>To save your preferences and settings</li>
              <li>To track your daily progress</li>
            </ul>
            <p className="mt-2">
              We never ask for private keys or have access to your funds.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}