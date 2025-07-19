import { Card } from "~/components/ui/card";
import { AlertCircle, TrendingUp, Shield, Brain, Target, Calendar } from "lucide-react";

export default function TipsPage() {
  return (
    <div className="container mx-auto p-4 space-y-6">
      <h1 className="text-3xl font-bold mb-6">Trading Tips: Avoid Common Mistakes</h1>
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
              <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold">Position Sizing Mistakes</h2>
              <p className="text-muted-foreground">
                <strong>Problem:</strong> Trading with excessive size relative to your account balance, risking catastrophic losses on a single trade.
              </p>
              <p className="text-sm">
                <strong>Solution:</strong> Never risk more than 1-2% of your total account on a single trade. Calculate position size based on your stop loss distance and stick to it religiously.
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
              <TrendingUp className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold">Overconfidence After Wins</h2>
              <p className="text-muted-foreground">
                <strong>Problem:</strong> Increasing risk and abandoning your strategy after a winning streak, leading to giving back profits.
              </p>
              <p className="text-sm">
                <strong>Solution:</strong> Maintain consistent position sizing regardless of recent performance. Take breaks after big wins to reset emotionally. Remember that markets are random in the short term.
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
              <Shield className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold">Refusing to Accept Losses</h2>
              <p className="text-muted-foreground">
                <strong>Problem:</strong> Not using stop losses or moving them further away when the market proves your analysis wrong.
              </p>
              <p className="text-sm">
                <strong>Solution:</strong> Set stop losses before entering trades and never move them against you. Accept that losses are part of trading. Small losses are better than account-destroying ones.
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
              <Brain className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold">Analysis Paralysis</h2>
              <p className="text-muted-foreground">
                <strong>Problem:</strong> Hesitating to enter valid setups due to fear or overthinking, missing profitable opportunities.
              </p>
              <p className="text-sm">
                <strong>Solution:</strong> Trust your tested strategy. If all criteria are met, execute without hesitation. Keep a trading journal to build confidence in your edge over time.
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
              <Target className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold">FOMO Trading</h2>
              <p className="text-muted-foreground">
                <strong>Problem:</strong> Chasing price moves without a plan, entering at the worst possible times due to fear of missing out.
              </p>
              <p className="text-sm">
                <strong>Solution:</strong> Only trade your predefined setups. If you missed an entry, wait for the next one. There are always new opportunities. Better to miss a move than lose money on a bad entry.
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold">Lack of Planning</h2>
              <p className="text-muted-foreground">
                <strong>Problem:</strong> Trading without a clear plan, making emotional decisions in the heat of the moment.
              </p>
              <p className="text-sm">
                <strong>Solution:</strong> Create a trading plan before market open. Define your setups, risk parameters, and daily limits. Review and adjust your plan regularly based on performance data.
              </p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/10 dark:to-purple-900/10 border-blue-200 dark:border-blue-800">
        <h2 className="text-2xl font-semibold mb-4">Golden Rules for Consistent Trading</h2>
        <ul className="space-y-3">
          <li className="flex items-start gap-2">
            <span className="text-blue-600 dark:text-blue-400 font-semibold">1.</span>
            <span>Risk management is more important than being right. Protect your capital above all else.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 dark:text-blue-400 font-semibold">2.</span>
            <span>Follow your trading plan religiously. Discipline beats intelligence in trading.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 dark:text-blue-400 font-semibold">3.</span>
            <span>Keep emotions in check. Take breaks when feeling euphoric or desperate.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 dark:text-blue-400 font-semibold">4.</span>
            <span>Focus on process, not profits. Good process leads to long-term profitability.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 dark:text-blue-400 font-semibold">5.</span>
            <span>Learn from every trade. Keep a detailed journal and review it regularly.</span>
          </li>
        </ul>
      </Card>
    </div>
  );
}