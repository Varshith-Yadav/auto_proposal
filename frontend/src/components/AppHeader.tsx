import { useEffect, useState } from "react";
import { Moon, Shield, Star, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const navItems = [
  { label: "Dashboard", path: "/" },
  { label: "My Proposals", path: "/proposals" },
  { label: "Profile", path: "/profile" },
  { label: "Settings", path: "/settings" },
];

export function AppHeader() {
  const location = useLocation();
  const { theme, setTheme, systemTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const resolvedTheme = theme === "system" ? systemTheme : theme;
  const isDark = resolvedTheme === "dark";

  return (
    <header className="h-14 border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-50 flex items-center px-6 gap-8">
      <Link to="/" className="flex items-center gap-2 shrink-0">
        <div className="relative h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
          <Shield className="h-4 w-4 text-accent" />
          <Star className="h-2 w-2 text-accent absolute top-1 right-1" />
        </div>
        <span className="text-lg font-semibold tracking-tight">GovPreneurs</span>
      </Link>

      <nav className="flex items-center gap-1">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              "px-3 py-1.5 rounded-md text-sm transition-colors duration-150",
              location.pathname === item.path
                ? "bg-secondary text-foreground font-medium"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="ml-auto flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setTheme(isDark ? "light" : "dark")}
          aria-label="Toggle dark mode"
        >
          {mounted && isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        <div className="h-8 w-8 rounded-full bg-accent/20 flex items-center justify-center text-xs font-semibold text-accent">
          JD
        </div>
      </div>
    </header>
  );
}
