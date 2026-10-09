"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Opens the browser's print dialog, where "Save as PDF" downloads the page.
 * While the dialog is open the document title is the memory's title, which
 * browsers use as the suggested PDF file name.
 */
export function PrintButton({ title, className }: { title: string; className?: string }) {
  const print = () => {
    const previous = document.title;
    const restore = () => {
      document.title = previous;
      window.removeEventListener("afterprint", restore);
    };
    window.addEventListener("afterprint", restore);
    document.title = title;
    window.print();
  };
  return (
    <Button size="sm" variant="ghost" className={cn(className)} onClick={print}>
      <Printer data-icon="inline-start" /> Print / save as PDF
    </Button>
  );
}
