import { renderPage, type PageRender } from "./display-list";
import type { FontStore } from "./fonts";
import type { BookPage, BookProject } from "./types";
import type { SourceSize } from "./image-fit";

interface Entry {
  index: number;
  fontsVersion: number;
  sizes: ReadonlyMap<string, SourceSize>;
  settings: BookProject["settings"];
  theme: BookProject["theme"];
  fonts: FontStore;
  render: PageRender;
}

/** Page renders keyed by the page object, so only pages that changed are laid out again. */
const cache = new WeakMap<BookPage, Entry>();

export function cachedRender(
  project: BookProject,
  page: BookPage,
  index: number,
  env: { fonts: FontStore; fontsVersion: number; sizes: ReadonlyMap<string, SourceSize> },
): PageRender {
  const hit = cache.get(page);
  if (hit && hit.index === index && hit.fontsVersion === env.fontsVersion && hit.sizes === env.sizes && hit.settings === project.settings && hit.theme === project.theme && hit.fonts === env.fonts) {
    return hit.render;
  }
  const render = renderPage(project, page, { measurer: env.fonts, sources: env.sizes, pageNumber: index + 1 });
  cache.set(page, { index, fontsVersion: env.fontsVersion, sizes: env.sizes, settings: project.settings, theme: project.theme, fonts: env.fonts, render });
  return render;
}
