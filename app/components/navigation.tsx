import { NavLink } from "react-router";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "~/components/ui/navigation-menu";
import { cn } from "~/lib/utils";

interface NavigationProps {
  nextUpdateIn?: number;
  isUpdating?: boolean;
  isConnected?: boolean;
}

export function Navigation({ nextUpdateIn, isUpdating, isConnected }: NavigationProps) {
  const navItems = [
    { path: "/", label: "Overview" },
    { path: "/daily-target", label: "Daily Target" },
    { path: "/advanced-settings", label: "Settings" },
  ];

  return (
    <nav className="border-b">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <h1 className="text-xl font-bold">Hyper Trader Hub</h1>
            
            <NavigationMenu className="hidden md:block">
              <NavigationMenuList>
                {navItems.map((item) => (
                  <NavigationMenuItem key={item.path}>
                    <NavLink to={item.path}>
                      {({ isActive }) => (
                        <NavigationMenuLink
                          className={cn(
                            navigationMenuTriggerStyle(),
                            isActive && "bg-black text-white dark:bg-white dark:text-black"
                          )}
                        >
                          {item.label}
                        </NavigationMenuLink>
                      )}
                    </NavLink>
                  </NavigationMenuItem>
                ))}
              </NavigationMenuList>
            </NavigationMenu>
          </div>

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

        <NavigationMenu className="md:hidden pb-2">
          <NavigationMenuList className="flex-col w-full">
            {navItems.map((item) => (
              <NavigationMenuItem key={item.path} className="w-full">
                <NavLink to={item.path} className="w-full">
                  {({ isActive }) => (
                    <NavigationMenuLink
                      className={cn(
                        navigationMenuTriggerStyle(),
                        "w-full justify-start",
                        isActive && "bg-black text-white dark:bg-white dark:text-black"
                      )}
                    >
                      {item.label}
                    </NavigationMenuLink>
                  )}
                </NavLink>
              </NavigationMenuItem>
            ))}
          </NavigationMenuList>
        </NavigationMenu>
      </div>
    </nav>
  );
}