"use client";

import { Printer } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { ReadinessItem } from "@/features/editor/readiness";
import { ReadinessChecklist } from "./readiness";

const LOAD_TIMEOUT_MS = 8000;

/** Forces every image on the page to load and resolves with how many failed. */
async function countFailedImages(): Promise<{ total: number; failed: number }> {
  const images = Array.from(document.querySelectorAll<HTMLImageElement>("main img"));
  const results = await Promise.all(
    images.map((img) => {
      // Lazy images below the fold would otherwise be missing from the printout.
      img.loading = "eager";
      if (img.complete) return Promise.resolve(img.naturalWidth > 0);
      return new Promise<boolean>((resolve) => {
        const timer = setTimeout(() => resolve(false), LOAD_TIMEOUT_MS);
        const done = (ok: boolean) => () => {
          clearTimeout(timer);
          resolve(ok);
        };
        img.addEventListener("load", done(true), { once: true });
        img.addEventListener("error", done(false), { once: true });
      });
    }),
  );
  return { total: images.length, failed: results.filter((ok) => !ok).length };
}

/**
 * Checks that the memory's details and photos have loaded, then opens the
 * browser's print dialog, where "Save as PDF" downloads the page.
 * While the dialog is open the document title is the memory's title, which
 * browsers use as the suggested PDF file name.
 */
export function PrintButton({ title, issues = [], className }: { title: string; issues?: ReadinessItem[]; className?: string }) {
  const [open, setOpen] = useState(false);
  const [checking, setChecking] = useState(false);
  const [photoTotal, setPhotoTotal] = useState(0);
  const [failed, setFailed] = useState(0);

  const begin = async () => {
    setOpen(true);
    setChecking(true);
    const result = await countFailedImages();
    setPhotoTotal(result.total);
    setFailed(result.failed);
    setChecking(false);
  };

  const items: ReadinessItem[] =
    failed > 0
      ? [...issues, { severity: "warning", message: `${failed} ${failed === 1 ? "photo" : "photos"} didn't load and will be missing from the printout.` }]
      : issues;
  const blocked = items.some((i) => i.severity === "error");
  const warned = items.length > 0;

  const print = () => {
    setOpen(false);
    // Let the dialog finish closing so it isn't part of the printout.
    setTimeout(() => {
      const previous = document.title;
      const restore = () => {
        document.title = previous;
        window.removeEventListener("afterprint", restore);
      };
      window.addEventListener("afterprint", restore);
      document.title = title;
      window.print();
    }, 200);
  };

  return (
    <>
      <Button size="sm" variant="ghost" className={cn(className)} onClick={begin}>
        <Printer data-icon="inline-start" /> Print / save as PDF
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Ready to print?</DialogTitle>
            <DialogDescription>We check that every detail and photo has loaded so nothing is missing from the PDF.</DialogDescription>
          </DialogHeader>
          <ReadinessChecklist items={items} checking={checking} total={photoTotal} />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Back
            </Button>
            <Button onClick={print} disabled={checking || blocked}>
              <Printer data-icon="inline-start" /> {warned ? "Print anyway" : "Print / save as PDF"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
