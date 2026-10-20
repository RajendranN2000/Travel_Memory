"use client";

import { CheckCircle2, Download, FileImage, Info, Loader2, Printer, RefreshCw, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Segmented, Slider } from "@/features/reel/ui/controls";
import { cn } from "@/lib/utils";
import { pdfPageCount, spineWidthMm, type ExportScope } from "../pdf";
import type { Issue } from "../lint";
import type { BookStudioApi } from "./use-book-studio";
import { PageView } from "./page-view";

const SCOPES: { value: ExportScope; label: string; hint: string }[] = [
  { value: "all", label: "Whole book", hint: "Every page, one per PDF page" },
  { value: "page", label: "This page", hint: "Only the page you're on" },
  { value: "spreads", label: "Facing pages", hint: "A preview PDF with pages side by side" },
  { value: "cover-wrap", label: "Cover wrap", hint: "Back, spine and front on one sheet" },
];

function IssueList({ issues, studio, onClose }: { issues: Issue[]; studio: BookStudioApi; onClose: () => void }) {
  if (issues.length === 0) return null;
  return (
    <ul className="max-h-44 space-y-1.5 overflow-y-auto rounded-lg border border-border p-2">
      {issues.slice(0, 40).map((i) => (
        <li key={i.id}>
          <button
            type="button"
            onClick={() => {
              studio.selectElement(i.pageId, i.elementId ?? null);
              onClose();
            }}
            className={cn("flex w-full items-start gap-2 rounded-md px-2.5 py-1.5 text-left text-xs outline-none focus-visible:ring-3 focus-visible:ring-ring/50", i.severity === "error" ? "bg-destructive/10 text-destructive" : i.severity === "warning" ? "bg-warning/15 text-warning" : "bg-muted text-muted-foreground")}
          >
            <TriangleAlert aria-hidden className="mt-0.5 size-3.5 shrink-0" /> {i.message}
          </button>
        </li>
      ))}
      {issues.length > 40 ? <li className="px-2 py-1 text-xs text-muted-foreground">…and {issues.length - 40} more.</li> : null}
    </ul>
  );
}

function PrintFrame({ url }: { url: string }) {
  return <iframe id="book-print-frame" title="Print" src={url} className="pointer-events-none absolute size-0 opacity-0" aria-hidden />;
}

export function ExportDialog({ studio, open, onOpenChange }: { studio: BookStudioApi; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { project, exportUi, exportOptions: opts, issues } = studio;
  const running = exportUi.status === "running";
  const [ack, setAck] = useState(false);
  const [dpi, setDpi] = useState(150);
  const serious = issues.filter((i) => i.severity !== "info");
  const needsAck = serious.length > 0;
  const bleed = project.settings.bleedMm;
  const count = pdfPageCount(project, { scope: opts.scope });

  const close = (o: boolean) => {
    if (running) return;
    if (!o) setAck(false);
    if (!o && exportUi.status === "done") studio.resetExport();
    onOpenChange(o);
  };

  const print = () => {
    if (exportUi.status !== "done") return;
    const frame = document.getElementById("book-print-frame") as HTMLIFrameElement | null;
    try {
      frame?.contentWindow?.focus();
      frame?.contentWindow?.print();
    } catch {
      window.open(exportUi.url, "_blank", "noopener");
    }
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent showCloseButton={!running} onEscapeKeyDown={(e) => running && e.preventDefault()} onPointerDownOutside={(e) => running && e.preventDefault()} onInteractOutside={(e) => running && e.preventDefault()} className="max-h-[94svh] gap-4 overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{exportUi.status === "done" ? "Your PDF is ready" : running ? "Creating your PDF" : "Download PDF"}</DialogTitle>
          <DialogDescription>{exportUi.status === "done" ? "Made in this browser. Nothing was uploaded." : "The PDF is built here on your device: real text, with your photos placed at their printed size. Nothing is uploaded."}</DialogDescription>
        </DialogHeader>

        {exportUi.status === "idle" || exportUi.status === "error" ? (
          <div className="space-y-4">
            {exportUi.status === "error" ? (
              <div role="alert" className="space-y-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                <p className="flex items-start gap-2"><TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" /> {exportUi.message} Your book is safe and unchanged.</p>
                {exportUi.recoverable ? (
                  <Button size="sm" variant="secondary" onClick={() => { studio.setExportOptions({ skipBrokenImages: true }); void studio.runExport({ ...opts, skipBrokenImages: true }); }}>
                    Export without the photos that can&apos;t load
                  </Button>
                ) : null}
              </div>
            ) : null}

            <Segmented label="What to export" value={opts.scope} columns={2} options={SCOPES.map((s) => ({ value: s.value, label: <span className="block"><span className="block text-sm">{s.label}</span><span className="block text-[0.65rem] text-muted-foreground">{s.hint}</span></span>, hint: s.hint, disabled: s.value === "cover-wrap" && project.pages.length < 2 }))} onChange={(scope) => studio.setExportOptions({ scope, pageIndex: studio.pageIndex })} />
            <Segmented label="Quality" value={opts.quality} options={[{ value: "print", label: <span className="block"><span className="block text-sm">Print</span><span className="block text-[0.65rem] text-muted-foreground">Up to 300 DPI</span></span> }, { value: "share", label: <span className="block"><span className="block text-sm">Compressed</span><span className="block text-[0.65rem] text-muted-foreground">Smaller, for sharing</span></span> }]} onChange={(quality) => studio.setExportOptions({ quality, includeBleed: quality === "print" ? bleed > 0 : false })} />

            {opts.scope !== "spreads" ? (
              <div className="space-y-2.5 rounded-lg border border-border p-3">
                <label className="flex items-center justify-between gap-3 text-sm">
                  <span>Include bleed ({bleed} mm)<span className="block text-xs text-muted-foreground">Most printers want this. Turn it off for a trimmed-size PDF.</span></span>
                  <Switch checked={opts.includeBleed && bleed > 0} disabled={bleed === 0} onCheckedChange={(includeBleed) => studio.setExportOptions({ includeBleed })} aria-label="Include bleed in the PDF" />
                </label>
                <label className="flex items-center justify-between gap-3 text-sm">
                  <span>Crop marks<span className="block text-xs text-muted-foreground">Little corner lines that show where to trim.</span></span>
                  <Switch checked={opts.cropMarks} onCheckedChange={(cropMarks) => studio.setExportOptions({ cropMarks })} aria-label="Add crop marks" />
                </label>
              </div>
            ) : null}

            <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 rounded-lg bg-muted p-3 text-sm">
              <dt className="text-muted-foreground">PDF pages</dt>
              <dd className="text-right tabular-nums">{count}</dd>
              <dt className="text-muted-foreground">Page size</dt>
              <dd className="text-right tabular-nums">
                {opts.scope === "spreads" ? `${project.settings.widthMm * 2} × ${project.settings.heightMm} mm` : opts.scope === "cover-wrap" ? `${2 * project.settings.widthMm + spineWidthMm(project) + 2 * (opts.includeBleed ? bleed : 0)} × ${project.settings.heightMm + 2 * (opts.includeBleed ? bleed : 0)} mm` : `${project.settings.widthMm + 2 * (opts.includeBleed ? bleed : 0)} × ${project.settings.heightMm + 2 * (opts.includeBleed ? bleed : 0)} mm`}
              </dd>
              <dt className="text-muted-foreground">Photos</dt>
              <dd className="text-right">{opts.quality === "print" ? "Up to 300 DPI, high quality" : "Reduced to about 150 DPI"}</dd>
              <dt className="text-muted-foreground">Colour</dt>
              <dd className="text-right">RGB</dd>
            </dl>

            {issues.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm font-medium">
                  Before you print: {studio.issueSummary.errors ? `${studio.issueSummary.errors} problem${studio.issueSummary.errors === 1 ? "" : "s"}` : ""}
                  {studio.issueSummary.errors && studio.issueSummary.warnings ? ", " : ""}
                  {studio.issueSummary.warnings ? `${studio.issueSummary.warnings} warning${studio.issueSummary.warnings === 1 ? "" : "s"}` : ""}
                  {!studio.issueSummary.errors && !studio.issueSummary.warnings ? "all clear" : ""}
                </p>
                <IssueList issues={issues} studio={studio} onClose={() => close(false)} />
                {needsAck ? (
                  <label className="flex items-start gap-2 text-sm">
                    <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} className="mt-1 size-4 accent-[var(--primary)]" />
                    <span>I&apos;ve seen these and want to export anyway.</span>
                  </label>
                ) : null}
              </div>
            ) : (
              <p className="flex items-center gap-2 text-sm text-success"><CheckCircle2 aria-hidden className="size-4" /> No problems found.</p>
            )}

            <ul className="space-y-1 text-xs text-muted-foreground">
              <li className="flex gap-2"><Info aria-hidden className="mt-0.5 size-3.5 shrink-0" /> Every printer has its own requirements for bleed, marks and colour. Check yours and match the settings above.</li>
              <li className="flex gap-2"><Info aria-hidden className="mt-0.5 size-3.5 shrink-0" /> Large books with many photos can take a minute or more. Keep this tab open.</li>
            </ul>
            <DialogFooter className="gap-2 sm:justify-end">
              <Button variant="ghost" onClick={() => close(false)}>Close</Button>
              <Button onClick={() => void studio.runExport({ ...opts, pageIndex: studio.pageIndex, includeBleed: opts.scope === "spreads" ? false : opts.includeBleed && bleed > 0 })} disabled={needsAck && !ack}>
                <Download data-icon="inline-start" /> Create PDF
              </Button>
            </DialogFooter>
          </div>
        ) : null}

        {exportUi.status === "running" ? (
          <div className="space-y-4" aria-live="polite">
            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="flex items-center gap-2"><Loader2 aria-hidden className="size-4 motion-safe:animate-spin" /> {exportUi.progress.message}</span>
                <span className="tabular-nums">{Math.round(exportUi.progress.fraction * 100)}%</span>
              </div>
              <div role="progressbar" aria-label="PDF progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(exportUi.progress.fraction * 100)} className="h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary transition-[width] duration-200 motion-reduce:transition-none" style={{ width: `${exportUi.progress.fraction * 100}%` }} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Photos are prepared at their printed size, so big books take a little while. Keep this tab open.</p>
            <DialogFooter>
              <Button variant="outline" onClick={studio.cancelExport}>Cancel</Button>
            </DialogFooter>
          </div>
        ) : null}

        {exportUi.status === "done" ? (
          <div className="space-y-4">
            <PdfPreview studio={studio} url={exportUi.url} />
            <p className="flex items-start gap-2 text-sm text-muted-foreground">
              <CheckCircle2 aria-hidden className="mt-0.5 size-4 shrink-0 text-success" />
              <span>
                {exportUi.pageCount} PDF page{exportUi.pageCount === 1 ? "" : "s"}, {exportUi.sizes[0] ? `${Math.round(exportUi.sizes[0].widthMm * 10) / 10} × ${Math.round(exportUi.sizes[0].heightMm * 10) / 10} mm each, ` : ""}
                {(exportUi.bytes / 1_000_000).toFixed(1)} MB. If your browser can&apos;t show the preview, download it and open it in a PDF viewer.
              </span>
            </p>
            {exportUi.warnings.map((w) => (
              <p key={w} className="rounded-lg bg-warning/15 p-3 text-xs text-warning">{w}</p>
            ))}
            <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border p-3">
              <div className="min-w-40 flex-1">
                <Slider label="Page image resolution" value={dpi} min={72} max={300} step={6} format={(v) => `${v} DPI`} onChange={setDpi} />
              </div>
              <Button size="sm" variant="secondary" onClick={() => void studio.exportPng(studio.pageIndex, dpi, false)}>
                <FileImage data-icon="inline-start" /> This page as PNG
              </Button>
            </div>
            <PrintFrame url={exportUi.url} />
            <DialogFooter className="gap-2 sm:justify-between">
              <Button variant="ghost" onClick={() => studio.resetExport()}>
                <RefreshCw data-icon="inline-start" /> Change settings
              </Button>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={print}>
                  <Printer data-icon="inline-start" /> Print
                </Button>
                <Button asChild>
                  <a href={exportUi.url} download={exportUi.filename}>
                    <Download data-icon="inline-start" /> Download PDF
                  </a>
                </Button>
              </div>
            </DialogFooter>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

/**
 * Desktop browsers show the PDF inline. Phones and tablets usually can't render a PDF in a frame (it
 * comes up blank), so there the pages are drawn from the book itself, with a button to open the file.
 */
function PdfPreview({ studio, url }: { studio: BookStudioApi; url: string }) {
  const [inline] = useState(() => typeof navigator !== "undefined" && navigator.pdfViewerEnabled === true);
  if (inline) {
    return (
      <div className="relative h-[46svh] overflow-hidden rounded-lg border border-border bg-muted">
        <iframe title="PDF preview" src={`${url}#view=FitH`} className="h-full w-full" />
      </div>
    );
  }
  const s = studio.project.settings;
  const h = 150;
  const w = (h * s.widthMm) / s.heightMm;
  return (
    <div className="space-y-2 rounded-lg border border-border bg-muted p-3">
      <ul className="flex gap-3 overflow-x-auto pb-2" aria-label="Pages in your PDF">
        {studio.project.pages.map((page, i) => (
          <li key={page.id} className="shrink-0">
            <div className="overflow-hidden rounded-sm bg-white shadow-md ring-1 ring-black/10" style={{ width: w, height: h }}>
              <PageView render={studio.renderOf(page, i)} images={studio.images} pxPerMm={h / s.heightMm} />
            </div>
            <span className="mt-1 block text-center text-[0.65rem] text-muted-foreground tabular-nums">{i + 1}</span>
          </li>
        ))}
      </ul>
      <Button asChild size="sm" variant="secondary" className="w-full">
        <a href={url} target="_blank" rel="noopener">
          Open the PDF
        </a>
      </Button>
    </div>
  );
}
