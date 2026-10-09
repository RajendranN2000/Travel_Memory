"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Loader2 } from "lucide-react";
import Image from "next/image";
import { startTransition, useActionState } from "react";
import { useForm, useWatch } from "react-hook-form";
import type { z } from "zod";
import { FormMessage, TextAreaField, TextField } from "@/components/forms/field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { idleState } from "@/features/auth/schemas";
import { templates } from "@/features/templates/registry";
import { createTrip } from "@/features/trips/actions";
import { createTripSchema, LIMITS } from "@/features/trips/schemas";

type Input = z.input<typeof createTripSchema>;
type Output = z.output<typeof createTripSchema>;

export interface DestinationChoice {
  slug: string;
  name: string;
  region: string;
  tagline: string;
  image: { src: string; blurDataURL?: string } | null;
  recommendedTemplate: string;
}

export function CreateTripForm({
  destinations,
  defaults,
}: {
  destinations: DestinationChoice[];
  defaults: { destinationSlug: string; templateSlug: string; layout?: string };
}) {
  const [serverState, action, pending] = useActionState(createTrip, idleState);
  const form = useForm<Input, unknown, Output>({
    resolver: zodResolver(createTripSchema),
    defaultValues: {
      title: "",
      description: "",
      destinationSlug: defaults.destinationSlug,
      templateSlug: defaults.templateSlug,
      layout: defaults.layout,
      startDate: "",
      endDate: "",
    },
    mode: "onTouched",
  });
  const { register, handleSubmit, formState, setValue, control } = form;
  const destination = useWatch({ control, name: "destinationSlug" });
  const template = useWatch({ control, name: "templateSlug" });
  const recommended = destinations.find((d) => d.slug === destination)?.recommendedTemplate;
  const serverErrors = serverState.status === "error" ? (serverState.fieldErrors ?? {}) : {};
  const err = (key: keyof Input) => formState.errors[key]?.message ?? serverErrors[key];

  const onSubmit = handleSubmit((_values, event) => {
    const formEl = (event?.target as HTMLFormElement | undefined) ?? null;
    if (!formEl) return;
    const data = new FormData(formEl);
    startTransition(() => action(data));
  });

  return (
    <form onSubmit={onSubmit} className="space-y-12" noValidate>
      {serverState.status === "error" ? <FormMessage status="error" message={serverState.message} /> : null}

      <fieldset>
        <legend className="font-display text-2xl">1. Where did you go?</legend>
        <p className="mt-1 text-sm text-muted-foreground">The destination sets your memory&apos;s theme. You can change it later.</p>
        <div role="radiogroup" aria-label="Destination" className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {destinations.map((d) => {
            const checked = destination === d.slug;
            return (
              <label
                key={d.slug}
                className={cn(
                  "group relative flex aspect-[4/5] cursor-pointer flex-col justify-end overflow-hidden rounded-lg text-white ring-offset-2 ring-offset-background transition-shadow has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
                  checked && "ring-2 ring-primary",
                )}
              >
                <input
                  type="radio"
                  value={d.slug}
                  className="sr-only"
                  {...register("destinationSlug", {
                    onChange: () => setValue("layout", undefined),
                  })}
                />
                {d.image ? (
                  <Image src={d.image.src} alt="" fill sizes="(min-width: 1024px) 18vw, 45vw" className="-z-10 object-cover" placeholder={d.image.blurDataURL ? "blur" : "empty"} blurDataURL={d.image.blurDataURL} />
                ) : null}
                <span className="absolute inset-0 -z-10 bg-gradient-to-t from-black/75 to-black/5" />
                {checked ? (
                  <span className="absolute top-2.5 right-2.5 grid size-7 place-items-center rounded-full bg-white text-primary">
                    <Check className="size-4" aria-hidden />
                  </span>
                ) : null}
                <span className="p-3">
                  <span className="block font-display text-xl leading-tight">{d.name}</span>
                  <span className="block text-xs text-white/80">{d.region}</span>
                </span>
              </label>
            );
          })}
        </div>
        {err("destinationSlug") ? <p className="mt-2 text-sm text-destructive">{err("destinationSlug")}</p> : null}
      </fieldset>

      <fieldset>
        <legend className="font-display text-2xl">2. Pick a template</legend>
        <p className="mt-1 text-sm text-muted-foreground">You can preview and switch templates in the editor.</p>
        <div role="radiogroup" aria-label="Template" className="mt-5 grid gap-3 sm:grid-cols-2">
          {templates.map((t) => {
            const checked = template === t.slug;
            return (
              <label
                key={t.slug}
                className={cn(
                  "relative flex cursor-pointer flex-col gap-1 rounded-lg border bg-card p-4 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
                  checked ? "border-primary ring-1 ring-primary" : "border-border hover:border-foreground/30",
                )}
              >
                <input type="radio" value={t.slug} className="sr-only" {...register("templateSlug", { onChange: () => setValue("layout", undefined) })} />
                <span className="flex items-center gap-2">
                  <span className="font-semibold">{t.name}</span>
                  {recommended === t.slug ? <Badge variant="secondary">Suits {destinations.find((d) => d.slug === destination)?.name}</Badge> : null}
                  {checked ? <Check className="ml-auto size-4 text-primary" aria-hidden /> : null}
                </span>
                <span className="text-sm text-muted-foreground">{t.summary}</span>
              </label>
            );
          })}
        </div>
        <input type="hidden" {...register("layout")} />
      </fieldset>

      <fieldset className="space-y-6">
        <legend className="font-display text-2xl">3. Tell us about the trip</legend>
        <TextField id="title" label="Title" placeholder="Three slow days above the clouds" maxLength={LIMITS.title} autoComplete="off" error={err("title")} {...register("title")} />
        <div className="grid gap-6 sm:grid-cols-2">
          <TextField id="startDate" type="date" label="Start date" optional error={err("startDate")} {...register("startDate")} />
          <TextField id="endDate" type="date" label="End date" optional error={err("endDate")} {...register("endDate")} />
        </div>
        <TextAreaField
          id="description"
          label="A few words about it"
          optional
          rows={4}
          maxLength={LIMITS.description}
          placeholder="What made this trip worth remembering?"
          error={err("description")}
          hint="You can write more in the editor."
          {...register("description")}
        />
      </fieldset>

      <div className="flex flex-col-reverse gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">Your draft is private until you publish it.</p>
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
          {pending ? "Creating draft…" : "Create draft and add photos"}
        </Button>
      </div>
    </form>
  );
}
