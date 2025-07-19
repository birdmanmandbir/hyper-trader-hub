import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "~/components/ui/command";
import { cn } from "~/lib/utils";
import { getCryptoList, getCryptoDisplayName } from "~/lib/crypto-config";

interface CryptoComboboxProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function CryptoCombobox({ 
  value, 
  onValueChange, 
  placeholder = "Select crypto...",
  className 
}: CryptoComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const cryptoList = getCryptoList();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("justify-between", className)}
        >
          {value ? getCryptoDisplayName(value) : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput placeholder="Search crypto..." />
          <CommandList>
            <CommandEmpty>No crypto found.</CommandEmpty>
            <CommandGroup>
              {cryptoList.map((crypto) => (
                <CommandItem
                  key={crypto}
                  value={crypto}
                  onSelect={() => {
                    onValueChange(crypto);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === crypto ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {getCryptoDisplayName(crypto)}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}