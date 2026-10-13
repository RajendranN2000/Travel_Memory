"use client";

import { Loader2 } from "lucide-react";
import { useActionState } from "react";
import { FieldShell, FormMessage, TextField } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { idleState, type FormState } from "@/features/auth/schemas";
import { submitFeedback } from "@/features/feedback/actions";

const KINDS = [
  ["bug", "Something is broken"],
  ["suggestion", "I have a suggestion"],
  ["other", "Something else"],
] as const;

function fe(state: FormState) {
  return state.status === "error" ? (state.fieldErrors ?? {}) : {};
}

export function FeedbackForm({ page }: { page: string }) {
  const [state, action, pending] = useActionState(submitFeedback, idleState);
  const values = state.status === "error" ? (state.values ?? {}) : {};

  if (state.status === "success") return <FormMessage status="success" message={state.message} />;

  return (
    <form action={action} className="space-y-5" noValidate>
      {state.status === "error" ? <FormMessage status="error" message={state.message} /> : null}
      <input type="hidden" name="page" value={page} />
      {/* Honeypot: hidden from people and screen readers, tempting to bots. */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <FieldShell id="kind" label="What is this about?" error={fe(state).kind}>
        <select
          id="kind"
          name="kind"
          defaultValue={values.kind || "suggestion"}
          className="h-11 w-full rounded-md border border-input bg-card px-3 text-base"
        >
          {KINDS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </FieldShell>

      <FieldShell id="message" label="Your message" error={fe(state).message} hint="What happened, or what would you like to see? Please don't include passwords.">
        <Textarea id="message" name="message" rows={6} maxLength={2000} required defaultValue={values.message} aria-invalid={fe(state).message ? true : undefined} />
      </FieldShell>

      <TextField
        id="email"
        name="email"
        type="email"
        label="Email"
        optional
        autoComplete="email"
        defaultValue={values.email}
        hint="Only if you'd like a reply."
        error={fe(state).email}
      />

      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" aria-hidden /> : null} Send feedback
      </Button>
    </form>
  );
}
