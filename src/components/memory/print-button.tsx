"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Opens the browser's print dialog, where "Save as PDF" downloads the page. */
export function PrintButton({ className }: { className?: string }) {
  return (
    <Button size="sm" variant="ghost" className={cn(className)} onClick={() => window.print()}>
      <Printer data-icon="inline-start" /> Print / save as PDF
    </Button>
  );
}
