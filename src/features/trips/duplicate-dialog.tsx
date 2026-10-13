"use client";

import { Copy, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { FormMessage } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { templates } from "@/features/templates/registry";
import type { TemplateSlug } from "@/features/templates/types";
import { duplicateTrip } from "./actions";

/**
 * Copies a memory, with every photo, caption, place, date and crop, into a new
 * draft that uses another template, so the same details can be tried in a
 * different design without redoing the work.
 */
export function DuplicateTripDialog({
  tripId,
  title,
  templateSlug,
  open,
  onOpenChange,
  beforeCopy,
}: {
  tripId: string;
  title: string;
  templateSlug: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Runs first, e.g. to save pending edits so the copy includes them. Return false to stop. */
  beforeCopy?: () => Promise<boolean>;
}) {
  const router = useRouter();
  const firstOther = templates.find((t) => t.slug !== templateSlug)?.slug ?? templates[0].slug;
  const [selected, setSelected] = useState<TemplateSlug>(firstOther);
  const [name, setName] = useState(`Copy of ${title.trim() || "Untitled trip"}`.slice(0, 120));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const copy = () =>
    startTransition(async () => {
      setError(null);
      if (beforeCopy && !(await beforeCopy())) {
        setError("Some changes haven't saved yet. Fix the save error, then try again.");
        return;
      }
      const result = await duplicateTrip({ tripId, templateSlug: selected, title: name });
      if (!result.ok) {
        setError(result.fieldErrors?.title ?? result.error);
        return;
      }
      toast.success("Copy created. Your original is untouched.");
      onOpenChange(false);
      router.push(`/editor/${result.data.id}`);
    });

  return (
    <Dialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Duplicate with another template</DialogTitle>
          <DialogDescription>
            Makes a new private draft with the same title, story, photos, captions, dates and crops. Your original and its published page stay as they are.
          </DialogDescription>
        </DialogHeader>

        {error ? <FormMessage status="error" message={error} /> : null}

        <div className="space-y-2">
          <Label htmlFor="duplicate-title">Name of the copy</Label>
          <Input id="duplicate-title" value={name} maxLength={120} onChange={(e) => setName(e.target.value)} />
        </div>

        <fieldset className="space-y-2">
          <legend className="mb-1 text-sm font-semibold">Template for the copy</legend>
          <RadioGroup value={selected} onValueChange={(v) => setSelected(v as TemplateSlug)} className="gap-2">
            {templates.map((t) => (
              <Label
                key={t.slug}
                htmlFor={`dup-${t.slug}`}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-md border p-3 font-normal transition-colors",
                  selected === t.slug ? "border-primary bg-primary/[0.04]" : "border-border hover:border-foreground/30",
                )}
              >
                <RadioGroupItem id={`dup-${t.slug}`} value={t.slug} className="mt-1" />
                <span>
                  <span className="block font-medium">
                    {t.name}
                    {t.slug === templateSlug ? <span className="ml-2 text-xs font-normal text-muted-foreground">current</span> : null}
                  </span>
                  <span className="mt-0.5 block text-sm text-muted-foreground">{t.bestFor}</span>
                </span>
              </Label>
            ))}
          </RadioGroup>
        </fieldset>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={copy} disabled={pending || !name.trim()}>
            {pending ? <Loader2 className="animate-spin" aria-hidden /> : <Copy data-icon="inline-start" />}
            {pending ? "Copying photos…" : "Create copy"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
