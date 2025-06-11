import { Link, useLocation } from "react-router";
import { cn } from "~/lib/utils";

interface NavigationProps {
  nextUpdateIn?: number;
  isUpdating?: boolean;
  isConnected?: boolean;
}

export function Navigation({ nextUpdateIn, isUpdating, isConnected }: NavigationProps) {
  const location = useLocation();

  const navItems = [
    { path: "/", label: "Overview" },
    { path: "/daily-target", label: "Daily Target" },
    { path: "/advanced-settings", label: "Settings" },
  ];

  return (
    <nav className="border-b">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo/Title */}
          <div className="flex items-center space-x-8">
            <h1 className="text-xl font-bold">Hyper Trader Hub</h1>
            
            {/* Navigation Items */}
            <div className="hidden md:flex space-x-1">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "px-4 py-2 rounded-md text-sm font-medium transition-colors",
                    location.pathname === item.path
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Update Timer */}
          {isConnected && nextUpdateIn !== undefined && (
            <div className="text-sm text-muted-foreground">
              {isUpdating ? (
                <span className="text-primary">Updating...</span>
              ) : (
                <span>Next update in: {nextUpdateIn}s</span>
              )}
            </div>
          )}
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden pb-2">
          <div className="flex space-x-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex-1 text-center px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  location.pathname === item.path
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}