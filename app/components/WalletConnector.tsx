import * as React from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Wallet } from "lucide-react";
import { useFetcher } from "react-router";

export function WalletConnector() {
  const { address, isConnected } = useAccount();
  const { connectors, connect, isPending, error } = useConnect();
  const { disconnect } = useDisconnect();
  const fetcher = useFetcher();
  
  React.useEffect(() => {
    if (isConnected && address) {
      // Submit the wallet address to create session
      fetcher.submit(
        { walletAddress: address },
        { method: "post" }
      );
    }
  }, [isConnected, address]);

  if (isConnected && address) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Wallet Connected</CardTitle>
          <CardDescription>
            {address}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Creating your session...
          </p>
          <Button 
            variant="outline" 
            onClick={() => disconnect()}
            className="w-full"
          >
            Disconnect
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Connect Your Wallet</CardTitle>
        <CardDescription>
          Choose your preferred wallet to continue
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {connectors.map((connector) => (
            <Button
              key={connector.id}
              onClick={() => connect({ connector })}
              disabled={isPending}
              variant="outline"
              className="w-full justify-start gap-3"
            >
              <Wallet className="w-4 h-4" />
              {connector.name}
              {isPending && " (connecting...)"}
            </Button>
          ))}
        </div>
        
        {error && (
          <p className="text-sm text-red-600 mt-4">
            {error.message}
          </p>
        )}
        
        <div className="mt-6 text-sm text-muted-foreground">
          <p className="font-medium mb-2">Why connect your wallet?</p>
          <ul className="space-y-1 list-disc list-inside">
            <li>Secure authentication without passwords</li>
            <li>Your wallet address identifies your account</li>
            <li>We never ask for private keys or signatures</li>
            <li>All your settings sync across devices</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}