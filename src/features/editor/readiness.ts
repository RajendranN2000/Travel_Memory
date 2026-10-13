export type ReadinessSeverity = "error" | "warning";

export interface ReadinessItem {
  severity: ReadinessSeverity;
  message: string;
}

export interface ReadinessInput {
  title: string;
  description: string;
  startDate: string | null;
  photos: Array<{ url: string | null; caption: string }>;
  uploadsBusy: boolean;
  /** Edits that haven't reached the server yet */
  unsaved: boolean;
  saveFailed: boolean;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * Lists what is missing or still loading before a memory is published,
 * printed or saved as PDF. Errors block publishing; warnings only inform.
 */
export function checkReadiness(input: ReadinessInput): ReadinessItem[] {
  const items: ReadinessItem[] = [];
  const error = (message: string) => items.push({ severity: "error", message });
  const warning = (message: string) => items.push({ severity: "warning", message });

  if (!input.title.trim()) error("Add a title in Details.");
  if (input.photos.length === 0) error("Add at least one photo.");
  if (input.uploadsBusy) error("Photos are still uploading. Wait for them to finish.");
  if (input.saveFailed) error("Some changes couldn't be saved. Fix the save error first.");
  else if (input.unsaved) warning("Your latest changes are still saving.");

  const missingUrl = input.photos.filter((p) => !p.url).length;
  if (missingUrl > 0) warning(`${plural(missingUrl, "photo can't", "photos can't")} be displayed. Reload the page, or replace ${missingUrl === 1 ? "it" : "them"}.`);

  if (input.photos.length > 0) {
    const uncaptioned = input.photos.filter((p) => !p.caption.trim()).length;
    if (uncaptioned > 0) warning(`${plural(uncaptioned, "photo has", "photos have")} no caption.`);
  }
  if (!input.description.trim()) warning("There's no trip story yet.");
  if (!input.startDate) warning("No start date is set.");
  return items;
}
