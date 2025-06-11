import * as React from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { useLocalStorage } from "~/hooks/useLocalStorage";

interface AdvancedSettings {
  takerFee: number; // in percentage, e.g., 0.04
  makerFee: number; // in percentage, e.g., 0.02
  streakThreshold: number; // in percentage, e.g., 90
}

export default function AdvancedSettings() {
  const [settings, setSettings] = useLocalStorage<AdvancedSettings>("advancedSettings", {
    takerFee: 0.04,
    makerFee: 0.012,
    streakThreshold: 90,
  });
  const [tempSettings, setTempSettings] = React.useState(settings);

  const handleSave = () => {
    setSettings(tempSettings);
    toast.success("Advanced settings saved successfully!", {
      description: `Taker fee: ${tempSettings.takerFee}%, Maker fee: ${tempSettings.makerFee}%, Streak threshold: ${tempSettings.streakThreshold}%`
    });
  };

  const handleReset = () => {
    const defaults = { takerFee: 0.04, makerFee: 0.012, streakThreshold: 90 };
    setTempSettings(defaults);
    setSettings(defaults);
    toast.info("Settings reset to defaults");
  };

  return (
    <div className="container max-w-2xl mx-auto p-6">
      <div className="mb-6">
        <h2 className="text-3xl font-bold">Advanced Settings</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Trading Fees Configuration</CardTitle>
          <CardDescription>
            Configure your trading fees for more accurate profit/loss calculations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Taker Fee (%)</label>
              <Input
                type="number"
                value={tempSettings.takerFee}
                onChange={(e) => setTempSettings({ ...tempSettings, takerFee: parseFloat(e.target.value) || 0 })}
                placeholder="0.04"
                min="0"
                step="0.01"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Fee charged when taking liquidity (market orders)
              </p>
            </div>

            <div>
              <label className="text-sm font-medium">Maker Fee (%)</label>
              <Input
                type="number"
                value={tempSettings.makerFee}
                onChange={(e) => setTempSettings({ ...tempSettings, makerFee: parseFloat(e.target.value) || 0 })}
                placeholder="0.02"
                min="0"
                step="0.01"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Fee charged when providing liquidity (limit orders)
              </p>
            </div>

            <div className="pt-6 border-t">
              <h3 className="font-semibold mb-4">Streak Settings</h3>
              <div>
                <label className="text-sm font-medium">Streak Threshold (%)</label>
                <Input
                  type="number"
                  value={tempSettings.streakThreshold}
                  onChange={(e) => setTempSettings({ ...tempSettings, streakThreshold: parseFloat(e.target.value) || 90 })}
                  placeholder="90"
                  min="1"
                  max="100"
                  step="1"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Minimum percentage of daily target required to maintain streak
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSave} className="flex-1">
                Save Settings
              </Button>
              <Button onClick={handleReset} variant="outline">
                Reset to Defaults
              </Button>
            </div>
          </div>

          <div className="pt-6 border-t">
            <h3 className="font-semibold mb-4">Fee Impact on Trading</h3>
            <div className="space-y-3">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium">Round Trip (Entry + Exit)</p>
                <p className="text-sm text-muted-foreground">
                  Market orders: {(tempSettings.takerFee * 2).toFixed(3)}%
                </p>
                <p className="text-sm text-muted-foreground">
                  Limit orders: {(tempSettings.makerFee * 2).toFixed(3)}%
                </p>
              </div>

              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  <strong>Note:</strong> When using stop market orders, you'll pay taker fees on both entry and exit, 
                  totaling {(tempSettings.takerFee * 2).toFixed(3)}% of your position size.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}