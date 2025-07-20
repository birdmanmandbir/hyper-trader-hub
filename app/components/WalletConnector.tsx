import { useAccount, useConnect, useDisconnect } from "wagmi";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { useFetcher } from "react-router";

export function WalletConnector() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending, error } = useConnect();
  const { disconnect } = useDisconnect();
  const fetcher = useFetcher();

  const handleConnect = async (connector: any) => {
    connect({ connector });
  };

  const handleAuthenticate = () => {
    if (address) {
      fetcher.submit(
        { walletAddress: address },
        { method: "post", action: "/connect-wallet" }
      );
    }
  };

  if (isConnected && address) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Wallet Connected</CardTitle>
          <CardDescription>
            {address.slice(0, 6)}...{address.slice(-4)}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={handleAuthenticate}
            className="w-full"
            disabled={fetcher.state !== "idle"}
          >
            {fetcher.state === "idle" ? "Continue to App" : "Loading..."}
          </Button>
          <Button
            onClick={() => disconnect()}
            variant="outline"
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
          Choose a wallet to connect to Hyper Trader Hub
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="text-sm text-destructive">
            {error.message}
          </div>
        )}
        {connectors.map((connector) => (
          <Button
            key={connector.uid}
            onClick={() => handleConnect(connector)}
            disabled={isPending}
            className="w-full"
          >
            {connector.name}
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}