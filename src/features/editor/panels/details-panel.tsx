"use client";

import { TextAreaField, TextField } from "@/components/forms/field";
import { LIMITS } from "@/features/trips/schemas";
import type { DraftFields, SetField } from "../types";

function Counter({ value, max }: { value: string; max: number }) {
  const near = value.length > max * 0.9;
  return (
    <span className={near ? "text-warning" : undefined}>
      {value.length}/{max}
    </span>
  );
}

export function DetailsPanel({ draft, setField, errors }: { draft: DraftFields; setField: SetField; errors: Record<string, string> }) {
  const dateError =
    draft.startDate && draft.endDate && draft.endDate < draft.startDate ? "The end date can't be before the start date." : undefined;
  return (
    <div className="space-y-6">
      <TextField
        id="trip-title"
        label="Title"
        value={draft.title}
        maxLength={LIMITS.title}
        onChange={(e) => setField("title", e.target.value)}
        placeholder="Name your trip"
        autoComplete="off"
        error={errors.title ?? (draft.title.trim() ? undefined : "A title is needed before you can publish.")}
        hint={<Counter value={draft.title} max={LIMITS.title} />}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          id="trip-start"
          type="date"
          label="Start date"
          optional
          value={draft.startDate ?? ""}
          onChange={(e) => setField("startDate", e.target.value || null)}
          error={errors.startDate}
        />
        <TextField
          id="trip-end"
          type="date"
          label="End date"
          optional
          min={draft.startDate ?? undefined}
          value={draft.endDate ?? ""}
          onChange={(e) => setField("endDate", e.target.value || null)}
          error={errors.endDate ?? dateError}
        />
      </div>
      <TextAreaField
        id="trip-description"
        label="Your story"
        optional
        rows={7}
        value={draft.description}
        maxLength={LIMITS.description}
        onChange={(e) => setField("description", e.target.value)}
        placeholder="What made this trip worth remembering? A few sentences is plenty."
        error={errors.description}
        hint={<Counter value={draft.description} max={LIMITS.description} />}
      />
    </div>
  );
}
