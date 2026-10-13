"use client";

import { Check, Copy, ExternalLink, Globe, Link2, Loader2, Lock, Send } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { FormMessage } from "@/components/forms/field";
import { ReadinessChecklist, useImageProbe } from "@/components/memory/readiness";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { Visibility } from "@/features/memories/types";
import { publishTrip, unpublishTrip, updateVisibility } from "@/features/trips/actions";
import type { Publication } from "@/features/trips/types";
import type { ReadinessItem } from "./readiness";

const OPTIONS: Array<{ value: Visibility; label: string; description: string; icon: typeof Globe }> = [
  { value: "public", label: "Public", description: "Anyone can view it. Search engines only if you allow it below.", icon: Globe },
  { value: "unlisted", label: "Unlisted", description: "Only people with the link can view it. Never listed or indexed.", icon: Link2 },
  { value: "private", label: "Private", description: "Only you, while signed in, can open the link.", icon: Lock },
];

export function PublishDialog({
  tripId,
  publication,
  readiness,
  photoUrls,
  hasChangesSincePublish,
  demo,
  flush,
  onChange,
  open: openProp,
  onOpenChange,
}: {
  tripId: string;
  publication: Publication | null;
  /** Missing details found by the pre-publish check */
  readiness: ReadinessItem[];
  /** Photo URLs to test-load while the dialog is open */
  photoUrls: string[];
  hasChangesSincePublish: boolean;
  demo: boolean;
  flush: () => Promise<boolean>;
  onChange: (publication: Publication | null) => void;
  /** Optional control, so other buttons (e.g. the step footer) can open the dialog. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [openState, setOpenState] = useState(false);
  const open = openProp ?? openState;
  const setOpen = onOpenChange ?? setOpenState;
  const [visibility, setVisibility] = useState<Visibility>(publication?.visibility ?? "unlisted");
  const [indexing, setIndexing] = useState(publication?.allowIndexing ?? false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);

  const probe = useImageProbe(photoUrls, open && !demo);
  const checks: ReadinessItem[] =
    probe.failed > 0
      ? [...readiness, { severity: "warning", message: `${probe.failed} ${probe.failed === 1 ? "photo" : "photos"} didn't load. Check your connection or replace ${probe.failed === 1 ? "it" : "them"}.` }]
      : readiness;
  const blockers = checks.filter((i) => i.severity === "error");
  const hasWarnings = checks.some((i) => i.severity === "warning");

  const url = publication && typeof window !== "undefined" ? `${window.location.origin}/memory/${publication.slug}` : "";
  const settingsChanged = publication && (publication.visibility !== visibility || publication.allowIndexing !== (visibility === "public" && indexing));

  const publish = () =>
    startTransition(async () => {
      setError(null);
      const saved = await flush();
      if (!saved) {
        setError("Some changes haven't saved yet. Fix the save error, then publish.");
        return;
      }
      const result = await publishTrip({ tripId, visibility, allowIndexing: indexing });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onChange(result.data);
      toast.success(publication ? "Published memory updated" : "Your memory is published");
    });

  const saveSettings = () =>
    startTransition(async () => {
      setError(null);
      const result = await updateVisibility({ tripId, visibility, allowIndexing: indexing });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onChange(result.data);
      toast.success("Sharing settings updated");
    });

  const unpublish = () =>
    startTransition(async () => {
      setError(null);
      const result = await unpublishTrip(tripId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onChange(null);
      toast.success("Memory unpublished. The link no longer works.");
    });

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy automatically. Select the link and copy it instead.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="sm:h-11 sm:px-5">
          <Send data-icon="inline-start" />
          {publication ? (hasChangesSincePublish ? "Update" : "Published") : "Publish"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[92svh] grid-cols-[minmax(0,1fr)] overflow-x-hidden overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">{publication ? "Your published memory" : "Publish your memory"}</DialogTitle>
          <DialogDescription>
            {publication
              ? "Publishing again replaces the shared page with your latest draft."
              : "Publishing creates a shareable page from your current draft. You can keep editing afterwards."}
          </DialogDescription>
        </DialogHeader>

        {demo ? (
          <FormMessage status="error" message="Publishing is disabled in demo mode because nothing is saved. Connect Supabase to publish." />
        ) : null}
        {!demo ? (
          <div className={cn("rounded-md border p-3", blockers.length > 0 ? "border-destructive/40 bg-destructive/5" : hasWarnings ? "border-warning/40 bg-warning/10" : "border-success/40 bg-success/5")}>
            <p className="mb-2 text-sm font-medium">Check before you publish</p>
            <ReadinessChecklist items={checks} checking={probe.checking} total={photoUrls.length} />
          </div>
        ) : null}
        {error ? <FormMessage status="error" message={error} /> : null}

        {publication ? (
          <div className="space-y-2 rounded-md border border-border bg-muted/40 p-3">
            <Label htmlFor="share-url" className="text-xs text-muted-foreground">
              Link
            </Label>
            <div className="flex gap-2">
              <input
                id="share-url"
                readOnly
                value={url}
                onFocus={(e) => e.currentTarget.select()}
                className="h-11 min-w-0 flex-1 rounded-md border border-input bg-card px-3 text-sm"
              />
              <Button size="icon" variant="outline" onClick={copy} aria-label="Copy link">
                {copied ? <Check /> : <Copy />}
              </Button>
              <Button size="icon" variant="outline" asChild>
                <a href={`/memory/${publication.slug}`} target="_blank" rel="noopener" aria-label="Open published memory in a new tab">
                  <ExternalLink />
                </a>
              </Button>
            </div>
            {hasChangesSincePublish ? <p className="text-xs text-warning">Your draft has changes that aren&apos;t on the published page yet.</p> : null}
          </div>
        ) : null}

        <fieldset className="min-w-0 space-y-3">
          <legend className="mb-2 text-sm font-semibold">Who can see it?</legend>
          <RadioGroup value={visibility} onValueChange={(v) => setVisibility(v as Visibility)} className="gap-2">
            {OPTIONS.map(({ value, label, description, icon: Icon }) => (
              <Label
                key={value}
                htmlFor={`vis-${value}`}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-md border p-3 font-normal transition-colors",
                  visibility === value ? "border-primary bg-primary/[0.04]" : "border-border hover:border-foreground/30",
                )}
              >
                <RadioGroupItem id={`vis-${value}`} value={value} className="mt-1" />
                <span>
                  <span className="flex items-center gap-1.5 font-medium">
                    <Icon aria-hidden className="size-4" /> {label}
                  </span>
                  <span className="mt-0.5 block text-sm text-muted-foreground">{description}</span>
                </span>
              </Label>
            ))}
          </RadioGroup>
          {visibility === "public" ? (
            <div className="flex items-center justify-between gap-4 rounded-md border border-border p-3">
              <Label htmlFor="allow-indexing" className="text-sm font-normal">
                Let search engines show this memory
              </Label>
              <Switch id="allow-indexing" checked={indexing} onCheckedChange={setIndexing} />
            </div>
          ) : null}
        </fieldset>

        {/* Stacked, full-width buttons: three actions never fit side by side in the dialog. */}
        <DialogFooter className="flex-col gap-2 sm:flex-col sm:justify-start">
          <Button className="h-auto min-h-11 w-full py-2 whitespace-normal" onClick={publish} disabled={pending || demo || probe.checking || blockers.length > 0}>
            {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
            {publication ? "Publish latest draft" : "Publish"}
            {hasWarnings ? " anyway" : ""}
          </Button>
          {publication && settingsChanged ? (
            <Button variant="outline" className="h-auto min-h-11 w-full py-2 whitespace-normal" onClick={saveSettings} disabled={pending || demo}>
              Save sharing settings
            </Button>
          ) : null}
          {publication ? (
            <Button
              variant="ghost"
              className="h-auto min-h-11 w-full py-2 whitespace-normal text-destructive hover:text-destructive"
              onClick={unpublish}
              disabled={pending || demo}
            >
              Unpublish
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
