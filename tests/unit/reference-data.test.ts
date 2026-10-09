import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { templates } from "@/features/templates/registry";
import { listDestinationThemes } from "@/features/themes/registry";

const sql = readFileSync(path.resolve(import.meta.dirname, "../../supabase/migrations/20261009000100_reference_data.sql"), "utf8");

describe("database reference data stays in sync with configuration", () => {
  it.each(listDestinationThemes().map((t) => [t.slug, t] as const))("seeds destination %s with its palettes", (slug, theme) => {
    expect(sql).toContain(`('${slug}', '${theme.name}'`);
    expect(sql).toContain(`"palettes": [${theme.palettes.map((p) => `"${p.key}"`).join(", ")}]`);
  });

  it.each(templates.map((t) => [t.slug, t] as const))("seeds template %s with its layouts", (slug, template) => {
    expect(sql).toContain(`('${slug}', '${template.name}', '${template.family}', array[${template.layouts.map((l) => `'${l.key}'`).join(", ")}])`);
  });
});
