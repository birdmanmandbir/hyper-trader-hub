import { redirect, type ActionFunctionArgs } from "react-router";
import { createSession, sessionCookie, initializeUserData } from "~/lib/auth.server";
import { ClientWalletConnection } from "~/components/ClientWalletConnection";

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

export default function ConnectWallet() {
  return <ClientWalletConnection />;
}