"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/** Switches light/dark with a short colour cross-fade (see `.theme-switching` in globals.css). */
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const toggle = () => {
    const root = document.documentElement;
    root.classList.add("theme-switching");
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
    window.setTimeout(() => root.classList.remove("theme-switching"), 450);
  };
  return (
    <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle light and dark theme" className={cn("relative", className)}>
      <Sun aria-hidden className="size-[1.15rem] scale-100 rotate-0 transition-all duration-500 dark:scale-0 dark:-rotate-90" />
      <Moon aria-hidden className="absolute size-[1.15rem] scale-0 rotate-90 transition-all duration-500 dark:scale-100 dark:rotate-0" />
    </Button>
  );
}
