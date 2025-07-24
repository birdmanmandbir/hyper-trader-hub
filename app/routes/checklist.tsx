import * as React from "react";
import { useLoaderData, Form, useFetcher } from "react-router";
import type { Route } from "./+types/checklist";
import { Card } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { RotateCcw, LogIn, LogOut } from "lucide-react";
import { requireAuth } from "~/lib/auth.server";
import { getUserChecklists, upsertUserChecklist, getDb } from "~/db/client.server";

interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
}

const defaultEntryChecklist: ChecklistItem[] = [
  { id: "e1", text: "Market structure confirms trend direction", checked: false },
  { id: "e2", text: "Key support/resistance levels identified", checked: false },
  { id: "e3", text: "Volume confirms the move", checked: false },
  { id: "e4", text: "Risk/reward ratio is at least 1:2", checked: false },
  { id: "e5", text: "Position size calculated (max 2% risk)", checked: false },
  { id: "e6", text: "Stop loss level determined", checked: false },
  { id: "e7", text: "No major news events coming up", checked: false },
  { id: "e8", text: "Entry aligns with higher timeframe", checked: false },
  { id: "e9", text: "Not revenge trading or FOMO", checked: false },
  { id: "e10", text: "Mental state is calm and focused", checked: false },
];

const defaultExitChecklist: ChecklistItem[] = [
  { id: "x1", text: "Target level reached or approaching", checked: false },
  { id: "x2", text: "Market structure showing reversal signs", checked: false },
  { id: "x3", text: "Volume divergence detected", checked: false },
  { id: "x4", text: "Key resistance/support being tested", checked: false },
  { id: "x5", text: "Time-based exit criteria met", checked: false },
  { id: "x6", text: "Trailing stop hit or close", checked: false },
  { id: "x7", text: "Fundamental thesis changed", checked: false },
  { id: "x8", text: "Better opportunity identified", checked: false },
  { id: "x9", text: "Risk parameters exceeded", checked: false },
  { id: "x10", text: "Profit target achieved", checked: false },
];

export async function loader({ request, context }: Route.LoaderArgs) {
  const userAddress = await requireAuth(request, context.cloudflare.env);
  const db = getDb(context.cloudflare.env);
  
  // Get user checklists from D1
  const checklists = await getUserChecklists(db, userAddress);
  
  // Use stored checklists or defaults
  const entryChecklist = checklists.entry.length > 0 ? checklists.entry : defaultEntryChecklist;
  const exitChecklist = checklists.exit.length > 0 ? checklists.exit : defaultExitChecklist;
  
  return {
    userAddress,
    entryChecklist,
    exitChecklist,
  };
}

export async function action({ request, context }: Route.ActionArgs) {
  const userAddress = await requireAuth(request, context.cloudflare.env);
  const db = getDb(context.cloudflare.env);
  const formData = await request.formData();
  
  const actionType = formData.get("actionType") as string;
  const checklistType = formData.get("checklistType") as 'entry' | 'exit';
  
  if (actionType === "reset") {
    // Reset to defaults
    const defaultItems = checklistType === 'entry' ? defaultEntryChecklist : defaultExitChecklist;
    await upsertUserChecklist(db, userAddress, checklistType, defaultItems);
  } else if (actionType === "toggle") {
    // Toggle specific item
    const itemId = formData.get("itemId") as string;
    const currentItems = formData.get("items") as string;
    const items = JSON.parse(currentItems) as ChecklistItem[];
    
    const updatedItems = items.map(item =>
      item.id === itemId ? { ...item, checked: !item.checked } : item
    );
    
    await upsertUserChecklist(db, userAddress, checklistType, updatedItems);
  }
  
  return { success: true };
}

export default function ChecklistPage() {
  const { entryChecklist, exitChecklist } = useLoaderData<typeof loader>();
  const toggleFetcher = useFetcher();
  const resetFetcher = useFetcher();
  
  // Use optimistic updates for better UX
  const optimisticEntryChecklist = React.useMemo(() => {
    if (!toggleFetcher.formData) return entryChecklist;
    
    const actionType = toggleFetcher.formData.get("actionType");
    const checklistType = toggleFetcher.formData.get("checklistType");
    const itemId = toggleFetcher.formData.get("itemId");
    
    if (actionType === "toggle" && checklistType === "entry" && itemId) {
      return entryChecklist.map(item =>
        item.id === itemId ? { ...item, checked: !item.checked } : item
      );
    }
    
    return entryChecklist;
  }, [entryChecklist, toggleFetcher.formData]);
  
  const optimisticExitChecklist = React.useMemo(() => {
    if (!toggleFetcher.formData) return exitChecklist;
    
    const actionType = toggleFetcher.formData.get("actionType");
    const checklistType = toggleFetcher.formData.get("checklistType");
    const itemId = toggleFetcher.formData.get("itemId");
    
    if (actionType === "toggle" && checklistType === "exit" && itemId) {
      return exitChecklist.map(item =>
        item.id === itemId ? { ...item, checked: !item.checked } : item
      );
    }
    
    return exitChecklist;
  }, [exitChecklist, toggleFetcher.formData]);
  
  // Handle reset optimistically
  const displayEntryChecklist = React.useMemo(() => {
    if (!resetFetcher.formData) return optimisticEntryChecklist;
    
    const actionType = resetFetcher.formData.get("actionType");
    const checklistType = resetFetcher.formData.get("checklistType");
    
    if (actionType === "reset" && checklistType === "entry") {
      return defaultEntryChecklist;
    }
    
    return optimisticEntryChecklist;
  }, [optimisticEntryChecklist, resetFetcher.formData]);
  
  const displayExitChecklist = React.useMemo(() => {
    if (!resetFetcher.formData) return optimisticExitChecklist;
    
    const actionType = resetFetcher.formData.get("actionType");
    const checklistType = resetFetcher.formData.get("checklistType");
    
    if (actionType === "reset" && checklistType === "exit") {
      return defaultExitChecklist;
    }
    
    return optimisticExitChecklist;
  }, [optimisticExitChecklist, resetFetcher.formData]);

  const toggleEntryItem = (id: string) => {
    const currentItems = optimisticEntryChecklist.map(item =>
      item.id === id ? { ...item, checked: !item.checked } : item
    );
    
    toggleFetcher.submit(
      {
        actionType: "toggle",
        checklistType: "entry",
        itemId: id,
        items: JSON.stringify(currentItems)
      },
      { method: "post" }
    );
  };

  const toggleExitItem = (id: string) => {
    const currentItems = optimisticExitChecklist.map(item =>
      item.id === id ? { ...item, checked: !item.checked } : item
    );
    
    toggleFetcher.submit(
      {
        actionType: "toggle",
        checklistType: "exit",
        itemId: id,
        items: JSON.stringify(currentItems)
      },
      { method: "post" }
    );
  };

  const resetEntryChecklist = () => {
    resetFetcher.submit(
      {
        actionType: "reset",
        checklistType: "entry"
      },
      { method: "post" }
    );
  };

  const resetExitChecklist = () => {
    resetFetcher.submit(
      {
        actionType: "reset",
        checklistType: "exit"
      },
      { method: "post" }
    );
  };

  const entryProgress = displayEntryChecklist.filter(item => item.checked).length;
  const exitProgress = displayExitChecklist.filter(item => item.checked).length;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Trading Checklist</h1>
      
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <LogIn className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Entry Checklist</h2>
                <p className="text-sm text-muted-foreground">
                  {entryProgress}/{displayEntryChecklist.length} completed
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={resetEntryChecklist}
              className="gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </Button>
          </div>

          <div className="space-y-3">
            {displayEntryChecklist.map(item => (
              <div
                key={item.id}
                className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <Checkbox
                  id={item.id}
                  checked={item.checked}
                  onCheckedChange={() => toggleEntryItem(item.id)}
                />
                <label
                  htmlFor={item.id}
                  className={`text-sm flex-1 cursor-pointer select-none ${
                    item.checked ? "line-through text-muted-foreground" : ""
                  }`}
                >
                  {item.text}
                </label>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-200 dark:border-green-800">
            <p className="text-sm font-medium text-green-800 dark:text-green-200">
              Entry Readiness: {entryProgress === displayEntryChecklist.length ? "✓ All criteria met!" : `${entryProgress}/${displayEntryChecklist.length} criteria checked`}
            </p>
            <div className="mt-2 h-2 bg-green-200 dark:bg-green-900 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all duration-300"
                style={{ width: `${(entryProgress / displayEntryChecklist.length) * 100}%` }}
              />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
                <LogOut className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Exit Checklist</h2>
                <p className="text-sm text-muted-foreground">
                  {exitProgress}/{displayExitChecklist.length} completed
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={resetExitChecklist}
              className="gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </Button>
          </div>

          <div className="space-y-3">
            {displayExitChecklist.map(item => (
              <div
                key={item.id}
                className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <Checkbox
                  id={item.id}
                  checked={item.checked}
                  onCheckedChange={() => toggleExitItem(item.id)}
                />
                <label
                  htmlFor={item.id}
                  className={`text-sm flex-1 cursor-pointer select-none ${
                    item.checked ? "line-through text-muted-foreground" : ""
                  }`}
                >
                  {item.text}
                </label>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-200 dark:border-red-800">
            <p className="text-sm font-medium text-red-800 dark:text-red-200">
              Exit Readiness: {exitProgress === displayExitChecklist.length ? "✓ All criteria met!" : `${exitProgress}/${displayExitChecklist.length} criteria checked`}
            </p>
            <div className="mt-2 h-2 bg-red-200 dark:bg-red-900 rounded-full overflow-hidden">
              <div
                className="h-full bg-red-500 transition-all duration-300"
                style={{ width: `${(exitProgress / displayExitChecklist.length) * 100}%` }}
              />
            </div>
          </div>
        </Card>
      </div>

      <Card className="mt-6 p-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/10 dark:to-purple-900/10 border-blue-200 dark:border-blue-800">
        <h3 className="text-lg font-semibold mb-3">How to Use These Checklists</h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>• Review each item carefully before entering or exiting a trade</li>
          <li>• Check off items as you confirm them - be honest with yourself</li>
          <li>• Aim for at least 80% completion before making trading decisions</li>
          <li>• Your checklist progress is saved automatically and persists across page navigation</li>
          <li>• Use the Reset button to clear the checklist for your next trade</li>
        </ul>
      </Card>
    </div>
  );
}