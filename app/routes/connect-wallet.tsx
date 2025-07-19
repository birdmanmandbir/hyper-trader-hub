import { json, redirect, type ActionFunctionArgs } from "react-router";
import { createSession, sessionCookie, initializeUserData } from "~/lib/auth.server";
import { Web3Provider } from "~/components/Web3Provider";
import { WalletConnector } from "~/components/WalletConnector";

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
    <Web3Provider>
      <div className="min-h-screen flex items-center justify-center p-4">
        <WalletConnector />
      </div>
    </Web3Provider>
  );
}