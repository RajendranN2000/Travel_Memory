"use client";

import { Loader2 } from "lucide-react";
import { useActionState } from "react";
import { FormMessage, PasswordField, TextField } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { deleteAccount, updateProfile } from "@/features/account/actions";
import { updatePassword } from "@/features/auth/actions";
import { idleState, type FormState } from "@/features/auth/schemas";

function fe(state: FormState) {
  return state.status === "error" ? (state.fieldErrors ?? {}) : {};
}

function Status({ state }: { state: FormState }) {
  if (state.status === "idle") return null;
  return <FormMessage status={state.status} message={state.message} />;
}

export function ProfileForm({ displayName }: { displayName: string }) {
  const [state, action, pending] = useActionState(updateProfile, idleState);
  return (
    <form action={action} className="space-y-4">
      <Status state={state} />
      <TextField id="displayName" name="displayName" label="Display name" optional defaultValue={displayName} maxLength={80} autoComplete="name" error={fe(state).displayName} />
      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" aria-hidden /> : null} Save profile
      </Button>
    </form>
  );
}

export function PasswordForm() {
  const [state, action, pending] = useActionState(updatePassword, idleState);
  return (
    <form action={action} className="space-y-4">
      <Status state={state} />
      <PasswordField id="new-password" name="password" label="New password" autoComplete="new-password" minLength={8} maxLength={72} hint="At least 8 characters." error={fe(state).password} />
      <PasswordField id="confirm-password" name="confirm" label="Confirm new password" autoComplete="new-password" error={fe(state).confirm} />
      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" aria-hidden /> : null} Update password
      </Button>
    </form>
  );
}

export function DeleteAccountForm() {
  const [state, action, pending] = useActionState(deleteAccount, idleState);
  return (
    <form action={action} className="space-y-4">
      <Status state={state} />
      <TextField
        id="delete-confirm"
        name="confirm"
        label="Type DELETE to confirm"
        autoComplete="off"
        autoCapitalize="characters"
        error={fe(state).confirm}
      />
      <Button type="submit" variant="destructive" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" aria-hidden /> : null} Delete my account and photos
      </Button>
    </form>
  );
}
