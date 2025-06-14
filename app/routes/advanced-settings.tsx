import * as React from "react";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { useLocalStorage } from "~/hooks/useLocalStorage";
import type { AdvancedSettings, TimePeriod } from "~/lib/types";
import { DEFAULT_ADVANCED_SETTINGS, STORAGE_KEYS } from "~/lib/constants";

export default function AdvancedSettings() {
  const [settings, setSettings] = useLocalStorage<AdvancedSettings>(
    STORAGE_KEYS.ADVANCED_SETTINGS,
    DEFAULT_ADVANCED_SETTINGS
  );
  const [tempSettings, setTempSettings] = React.useState(settings);

  const handleSave = () => {
    setSettings(tempSettings);
    toast.success("Advanced settings saved successfully!", {
      description: `Taker fee: ${tempSettings.takerFee}%, Maker fee: ${tempSettings.makerFee}%, Streak threshold: ${tempSettings.streakThreshold}%, Loss threshold: ${tempSettings.lossThreshold}%`
    });
  };

  const handleReset = () => {
    setTempSettings(DEFAULT_ADVANCED_SETTINGS);
    setSettings(DEFAULT_ADVANCED_SETTINGS);
    toast.info("Settings reset to defaults");
  };

  const addTimePeriod = (type: 'preferred' | 'avoided') => {
    const newPeriod: TimePeriod = { start: '09:00', end: '10:00', label: '' };
    if (type === 'preferred') {
      setTempSettings({
        ...tempSettings,
        preferredTradingTimes: [...tempSettings.preferredTradingTimes, newPeriod]
      });
    } else {
      setTempSettings({
        ...tempSettings,
        avoidedTradingTimes: [...tempSettings.avoidedTradingTimes, newPeriod]
      });
    }
  };

  const removeTimePeriod = (type: 'preferred' | 'avoided', index: number) => {
    if (type === 'preferred') {
      setTempSettings({
        ...tempSettings,
        preferredTradingTimes: tempSettings.preferredTradingTimes.filter((_, i) => i !== index)
      });
    } else {
      setTempSettings({
        ...tempSettings,
        avoidedTradingTimes: tempSettings.avoidedTradingTimes.filter((_, i) => i !== index)
      });
    }
  };

  const updateTimePeriod = (type: 'preferred' | 'avoided', index: number, field: keyof TimePeriod, value: string) => {
    if (type === 'preferred') {
      const updated = [...tempSettings.preferredTradingTimes];
      updated[index] = { ...updated[index], [field]: value };
      setTempSettings({ ...tempSettings, preferredTradingTimes: updated });
    } else {
      const updated = [...tempSettings.avoidedTradingTimes];
      updated[index] = { ...updated[index], [field]: value };
      setTempSettings({ ...tempSettings, avoidedTradingTimes: updated });
    }
  };

  const [newCrypto, setNewCrypto] = React.useState('');
  const [newLeverage, setNewLeverage] = React.useState('');

  const addCryptoLeverage = () => {
    if (newCrypto && newLeverage) {
      setTempSettings({
        ...tempSettings,
        leverageMap: {
          ...tempSettings.leverageMap,
          [newCrypto.toUpperCase()]: parseInt(newLeverage)
        }
      });
      setNewCrypto('');
      setNewLeverage('');
    }
  };

  const removeCryptoLeverage = (crypto: string) => {
    const { [crypto]: _, ...rest } = tempSettings.leverageMap;
    setTempSettings({
      ...tempSettings,
      leverageMap: rest
    });
  };

  const updateCryptoLeverage = (crypto: string, leverage: string) => {
    setTempSettings({
      ...tempSettings,
      leverageMap: {
        ...tempSettings.leverageMap,
        [crypto]: parseInt(leverage) || 1
      }
    });
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

            <div className="pt-6 border-t">
              <h3 className="font-semibold mb-4">Risk Management</h3>
              <div>
                <label className="text-sm font-medium">Loss Threshold (%)</label>
                <Input
                  type="number"
                  value={tempSettings.lossThreshold}
                  onChange={(e) => setTempSettings({ ...tempSettings, lossThreshold: parseFloat(e.target.value) || 30 })}
                  placeholder="30"
                  min="10"
                  max="100"
                  step="5"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Stop trading advice triggers when loss reaches this % of daily target (e.g., 30% means -3% loss if target is 10%)
                </p>
              </div>
            </div>

            <div className="pt-6 border-t">
              <h3 className="font-semibold mb-4">Leverage Configuration</h3>
              <div className="mb-4">
                <label className="text-sm font-medium">Default Leverage</label>
                <Input
                  type="number"
                  value={tempSettings.defaultLeverage}
                  onChange={(e) => setTempSettings({ ...tempSettings, defaultLeverage: parseInt(e.target.value) || 10 })}
                  placeholder="10"
                  min="1"
                  max="100"
                  step="1"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Default leverage for cryptos not specifically configured
                </p>
              </div>

              <div className="mb-4">
                <label className="text-sm font-medium">Per-Crypto Leverage</label>
                <p className="text-sm text-muted-foreground mb-3">
                  Set specific leverage for different cryptocurrencies
                </p>
                
                <div className="space-y-2 mb-3">
                  {Object.entries(tempSettings.leverageMap).map(([crypto, leverage]) => (
                    <div key={crypto} className="flex gap-2 items-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                      <div className="flex-1 font-mono font-semibold">{crypto}</div>
                      <Input
                        type="number"
                        value={leverage}
                        onChange={(e) => updateCryptoLeverage(crypto, e.target.value)}
                        className="w-24"
                        min="1"
                        max="100"
                        step="1"
                      />
                      <span className="text-sm text-muted-foreground">x</span>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => removeCryptoLeverage(crypto)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={newCrypto}
                    onChange={(e) => setNewCrypto(e.target.value.toUpperCase())}
                    placeholder="Symbol (e.g., SOL)"
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    value={newLeverage}
                    onChange={(e) => setNewLeverage(e.target.value)}
                    placeholder="Leverage"
                    className="w-32"
                    min="1"
                    max="100"
                    step="1"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={addCryptoLeverage}
                    disabled={!newCrypto || !newLeverage}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t">
              <h3 className="font-semibold mb-4">Trading Time Periods</h3>
              
              {/* Preferred Trading Times */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium">Preferred Trading Times</label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => addTimePeriod('preferred')}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Time
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Best times to trade based on your strategy and market conditions
                </p>
                <div className="space-y-2">
                  {tempSettings.preferredTradingTimes.map((period, index) => (
                    <div key={index} className="flex gap-2 items-center p-2 bg-green-50 dark:bg-green-900/20 rounded">
                      <Input
                        type="time"
                        value={period.start}
                        onChange={(e) => updateTimePeriod('preferred', index, 'start', e.target.value)}
                        className="flex-1"
                      />
                      <span className="text-sm">to</span>
                      <Input
                        type="time"
                        value={period.end}
                        onChange={(e) => updateTimePeriod('preferred', index, 'end', e.target.value)}
                        className="flex-1"
                      />
                      <Input
                        type="text"
                        value={period.label || ''}
                        onChange={(e) => updateTimePeriod('preferred', index, 'label', e.target.value)}
                        placeholder="Label (optional)"
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => removeTimePeriod('preferred', index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {tempSettings.preferredTradingTimes.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-2">No preferred times set</p>
                  )}
                </div>
              </div>

              {/* Avoided Trading Times */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium">Avoided Trading Times</label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => addTimePeriod('avoided')}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Time
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Times to avoid trading (low volume, high volatility, etc.)
                </p>
                <div className="space-y-2">
                  {tempSettings.avoidedTradingTimes.map((period, index) => (
                    <div key={index} className="flex gap-2 items-center p-2 bg-red-50 dark:bg-red-900/20 rounded">
                      <Input
                        type="time"
                        value={period.start}
                        onChange={(e) => updateTimePeriod('avoided', index, 'start', e.target.value)}
                        className="flex-1"
                      />
                      <span className="text-sm">to</span>
                      <Input
                        type="time"
                        value={period.end}
                        onChange={(e) => updateTimePeriod('avoided', index, 'end', e.target.value)}
                        className="flex-1"
                      />
                      <Input
                        type="text"
                        value={period.label || ''}
                        onChange={(e) => updateTimePeriod('avoided', index, 'label', e.target.value)}
                        placeholder="Label (optional)"
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => removeTimePeriod('avoided', index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {tempSettings.avoidedTradingTimes.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-2">No avoided times set</p>
                  )}
                </div>
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