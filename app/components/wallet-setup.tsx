import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";

interface WalletSetupProps {
  onWalletSubmit: (address: string) => void;
  isLoading?: boolean;
  error?: string | null;
}

export function WalletSetup({ onWalletSubmit, isLoading, error }: WalletSetupProps) {
  const [walletAddress, setWalletAddress] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const validateAddress = (address: string) => {
    if (!address) {
      setValidationError("Please enter a wallet address");
      return false;
    }
    if (!address.match(/^0x[a-fA-F0-9]{40}$/)) {
      setValidationError("Invalid Ethereum address format");
      return false;
    }
    setValidationError(null);
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateAddress(walletAddress)) {
      onWalletSubmit(walletAddress);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Connect Your Wallet</CardTitle>
        <CardDescription>
          Enter your Hyperliquid wallet address to view balances
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Input
              type="text"
              placeholder="0x..."
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              disabled={isLoading}
              className="font-mono"
            />
            {(validationError || error) && (
              <p className="text-sm text-red-500">
                {validationError || error}
              </p>
            )}
          </div>
          <Button 
            type="submit" 
            disabled={isLoading} 
            className="w-full"
          >
            {isLoading ? "Connecting..." : "Connect Wallet"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}