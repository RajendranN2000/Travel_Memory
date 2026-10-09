import type { ComponentType } from "react";
import type { MemoryContent } from "@/features/memories/types";
import { resolveTheme } from "@/features/themes/registry";
import { ContactSheet } from "./components/contact-sheet";
import { DayByDay } from "./components/day-by-day";
import { FieldJournal } from "./components/field-journal";
import { HorizonPoster } from "./components/horizon-poster";
import type { TemplateProps } from "./components/shared";
import { getTemplate, resolveLayout, templates } from "./registry";
import type { TemplateSlug } from "./types";

const components: Record<TemplateSlug, ComponentType<TemplateProps>> = {
  "horizon-poster": HorizonPoster,
  "field-journal": FieldJournal,
  "contact-sheet": ContactSheet,
  "day-by-day": DayByDay,
};

/**
 * Renders any memory with its template and destination theme. Unknown
 * templates, layouts, destinations and palettes all fall back to defaults.
 */
export function MemoryRenderer({
  memory,
  priority = false,
  sizesHint = "full",
}: {
  memory: MemoryContent;
  priority?: boolean;
  sizesHint?: TemplateProps["sizesHint"];
}) {
  const template = getTemplate(memory.templateSlug) ?? templates[0];
  const resolved = resolveTheme(memory.destinationSlug, memory.palette);
  const layout = resolveLayout(template, memory.layout);
  const Component = components[template.slug];
  return <Component memory={memory} resolved={resolved} layout={layout} priority={priority} sizesHint={sizesHint} />;
}
