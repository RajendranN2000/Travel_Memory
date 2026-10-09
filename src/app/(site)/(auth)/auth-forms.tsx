"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";
import { FormMessage, TextField } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { requestPasswordReset, signIn, signUp } from "@/features/auth/actions";
import { idleState, type FormState } from "@/features/auth/schemas";

function errors(state: FormState) {
  return state.status === "error" ? (state.fieldErrors ?? {}) : {};
}
function value(state: FormState, key: string) {
  return state.status === "error" ? state.values?.[key] : undefined;
}

function SubmitButton({ pending, children }: { pending: boolean; children: React.ReactNode }) {
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending} aria-disabled={pending}>
      {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
      {children}
    </Button>
  );
}

export function SignInForm({ next, disabled }: { next: string; disabled?: boolean }) {
  const [state, action, pending] = useActionState(signIn, idleState);
  const fe = errors(state);
  return (
    <form action={action} className="space-y-5" noValidate>
      <input type="hidden" name="next" value={next} />
      {state.status === "error" ? <FormMessage status="error" message={state.message} /> : null}
      <TextField
        id="email"
        name="email"
        type="email"
        label="Email"
        autoComplete="email"
        inputMode="email"
        required
        defaultValue={value(state, "email")}
        error={fe.email}
        disabled={disabled}
      />
      <TextField
        id="password"
        name="password"
        type="password"
        label="Password"
        autoComplete="current-password"
        required
        error={fe.password}
        disabled={disabled}
      />
      <div className="flex justify-end">
        <Link href="/reset-password" className="inline-flex min-h-11 items-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
          Forgot your password?
        </Link>
      </div>
      <SubmitButton pending={pending || Boolean(disabled)}>{pending ? "Signing in…" : "Sign in"}</SubmitButton>
    </form>
  );
}

export function SignUpForm({ next, disabled }: { next: string; disabled?: boolean }) {
  const [state, action, pending] = useActionState(signUp, idleState);
  const fe = errors(state);
  if (state.status === "success") {
    return (
      <div className="space-y-4">
        <FormMessage status="success" message={state.message} />
        <p className="text-sm text-muted-foreground">
          Didn&apos;t get it? Check your spam folder, or{" "}
          <Link href="/signup" className="underline underline-offset-2">
            try again
          </Link>
          .
        </p>
      </div>
    );
  }
  return (
    <form action={action} className="space-y-5" noValidate>
      <input type="hidden" name="next" value={next} />
      {state.status === "error" ? <FormMessage status="error" message={state.message} /> : null}
      <TextField
        id="displayName"
        name="displayName"
        label="Your name"
        optional
        autoComplete="name"
        maxLength={80}
        defaultValue={value(state, "displayName")}
        error={fe.displayName}
        hint="Shown only to you for now."
        disabled={disabled}
      />
      <TextField
        id="email"
        name="email"
        type="email"
        label="Email"
        autoComplete="email"
        inputMode="email"
        required
        defaultValue={value(state, "email")}
        error={fe.email}
        disabled={disabled}
      />
      <TextField
        id="password"
        name="password"
        type="password"
        label="Password"
        autoComplete="new-password"
        required
        minLength={8}
        maxLength={72}
        error={fe.password}
        hint="At least 8 characters."
        disabled={disabled}
      />
      <SubmitButton pending={pending || Boolean(disabled)}>{pending ? "Creating account…" : "Create account"}</SubmitButton>
      <p className="text-xs leading-relaxed text-muted-foreground">
        By creating an account you agree to the draft{" "}
        <Link href="/terms" className="underline underline-offset-2">
          terms
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="underline underline-offset-2">
          privacy notice
        </Link>
        .
      </p>
    </form>
  );
}

export function ResetRequestForm({ disabled }: { disabled?: boolean }) {
  const [state, action, pending] = useActionState(requestPasswordReset, idleState);
  if (state.status === "success") return <FormMessage status="success" message={state.message} />;
  const fe = errors(state);
  return (
    <form action={action} className="space-y-5" noValidate>
      {state.status === "error" ? <FormMessage status="error" message={state.message} /> : null}
      <TextField id="email" name="email" type="email" label="Email" autoComplete="email" required error={fe.email} disabled={disabled} />
      <SubmitButton pending={pending || Boolean(disabled)}>{pending ? "Sending…" : "Send reset link"}</SubmitButton>
    </form>
  );
}
