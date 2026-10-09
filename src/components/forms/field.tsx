import type { ComponentProps, ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface FieldShellProps {
  id: string;
  label: string;
  error?: string;
  hint?: ReactNode;
  className?: string;
  children: ReactNode;
  optional?: boolean;
}

export function FieldShell({ id, label, error, hint, className, children, optional }: FieldShellProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={id} className="text-sm font-medium">
        {label}
        {optional ? <span className="font-normal text-muted-foreground"> (optional)</span> : null}
      </Label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-sm text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function describedBy(id: string, error?: string, hint?: ReactNode) {
  return error ? `${id}-error` : hint ? `${id}-hint` : undefined;
}

export function TextField({
  id,
  label,
  error,
  hint,
  optional,
  className,
  ...props
}: Omit<FieldShellProps, "children"> & ComponentProps<typeof Input>) {
  return (
    <FieldShell id={id} label={label} error={error} hint={hint} optional={optional} className={className}>
      <Input id={id} aria-invalid={error ? true : undefined} aria-describedby={describedBy(id, error, hint)} {...props} />
    </FieldShell>
  );
}

export function TextAreaField({
  id,
  label,
  error,
  hint,
  optional,
  className,
  ...props
}: Omit<FieldShellProps, "children"> & ComponentProps<typeof Textarea>) {
  return (
    <FieldShell id={id} label={label} error={error} hint={hint} optional={optional} className={className}>
      <Textarea id={id} aria-invalid={error ? true : undefined} aria-describedby={describedBy(id, error, hint)} {...props} />
    </FieldShell>
  );
}

export function FormMessage({ status, message }: { status: "error" | "success"; message: string }) {
  return (
    <div
      role={status === "error" ? "alert" : "status"}
      className={cn(
        "rounded-md border px-4 py-3 text-sm leading-relaxed",
        status === "error" ? "border-destructive/30 bg-destructive/5 text-destructive" : "border-success/30 bg-success/5 text-success",
      )}
    >
      {message}
    </div>
  );
}
