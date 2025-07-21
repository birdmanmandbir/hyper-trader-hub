import { NavLink } from "react-router";
import { WalletConnection } from './WalletConnection';

export function Navigation() {
  const navItems = [
    { path: "/", label: "Overview", end: true },
    { path: "/daily-target", label: "Daily Target" },
    { path: "/checklist", label: "Checklist" },
    { path: "/tips", label: "Trading Tips" },
    { path: "/advanced-settings", label: "Settings" },
  ];

  return (
    <nav className="border-b">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <h1 className="text-xl font-bold">Hyper Trader Hub</h1>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.end}
                  className="nav-link px-4 py-2 rounded-md text-sm font-medium transition-colors"
                  prefetch="intent"
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>
          
          {/* Wallet Connection */}
          <div className="flex items-center">
            <WalletConnection />
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden pb-2">
          <div className="flex flex-col space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                className="nav-link px-3 py-2 rounded-md text-sm font-medium transition-colors"
                prefetch="intent"
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}