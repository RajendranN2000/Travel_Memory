import type { TemplateSlug } from "@/features/templates/types";

export interface DraftFields {
  title: string;
  description: string;
  destinationSlug: string;
  templateSlug: TemplateSlug;
  layout: string;
  palette: string | null;
  startDate: string | null;
  endDate: string | null;
}

export type SetField = <K extends keyof DraftFields>(key: K, value: DraftFields[K]) => void;
