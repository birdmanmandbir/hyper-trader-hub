import { NavLink } from "react-router";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "~/components/ui/navigation-menu";
import { cn } from "~/lib/utils";

export function Navigation() {
  const navItems = [
    { path: "/", label: "Overview" },
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
            
            <NavigationMenu className="hidden md:block">
              <NavigationMenuList>
                {navItems.map((item) => (
                  <NavigationMenuItem key={item.path}>
                    <NavLink to={item.path}>
                      {({ isActive }) => (
                        <NavigationMenuLink
                          className={cn(
                            navigationMenuTriggerStyle(),
                            isActive && "bg-black text-white hover:bg-black hover:text-white dark:bg-white dark:text-black dark:hover:bg-white dark:hover:text-black"
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
                        isActive && "bg-black text-white hover:bg-black hover:text-white dark:bg-white dark:text-black dark:hover:bg-white dark:hover:text-black"
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