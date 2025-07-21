import React from 'react';
import { useFetcher } from 'react-router';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { X } from 'lucide-react';

interface WalletInputProps {
  connectedAddress?: string | null;
}

export function WalletInput({ connectedAddress }: WalletInputProps) {
  const fetcher = useFetcher();
  const [address, setAddress] = React.useState('');
  const [error, setError] = React.useState('');

  // Simple Ethereum address validation
  const isValidAddress = (addr: string) => {
    return /^0x[a-fA-F0-9]{40}$/.test(addr);
  };

  const handleConnect = () => {
    const trimmedAddress = address.trim();
    
    if (!trimmedAddress) {
      setError('Please enter a wallet address');
      return;
    }

    if (!isValidAddress(trimmedAddress)) {
      setError('Invalid Ethereum address');
      return;
    }

    setError('');
    fetcher.submit(
      { action: 'connect', address: trimmedAddress },
      { method: 'post', action: '/' }
    );
  };

  const handleDisconnect = () => {
    fetcher.submit(
      { action: 'disconnect' },
      { method: 'post', action: '/' }
    );
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleConnect();
    }
  };

  // Connected state
  if (connectedAddress) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">
          {connectedAddress.slice(0, 6)}...{connectedAddress.slice(-4)}
        </span>
        <Button
          onClick={handleDisconnect}
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          disabled={fetcher.state !== 'idle'}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  // Disconnected state
  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <Input
          type="text"
          placeholder="Enter wallet address"
          value={address}
          onChange={(e) => {
            setAddress(e.target.value);
            setError('');
          }}
          onKeyPress={handleKeyPress}
          className="w-[300px]"
          disabled={fetcher.state !== 'idle'}
        />
        {error && (
          <p className="absolute top-full mt-1 text-xs text-destructive">
            {error}
          </p>
        )}
      </div>
      <Button
        onClick={handleConnect}
        disabled={fetcher.state !== 'idle' || !address.trim()}
      >
        Connect
      </Button>
    </div>
  );
}