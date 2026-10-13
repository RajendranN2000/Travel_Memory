# My Travel Memory

Turn trip photos into personal, shareable memory pages styled after the place you visited.

Phase 1 includes:

- five destination themes: Munnar, Goa, Ooty, Wayanad and Manali
- four template families: poster, editorial journal, collage and timeline
- a memory editor with autosave, photo uploads and reordering
- publishing with public, unlisted or private visibility

**Stack:** Next.js 16 (App Router, Cache Components, Turbopack) · TypeScript · Tailwind CSS 4 · shadcn/ui (Radix) · Motion · Lucide · React Hook Form + Zod · Supabase (Postgres, Auth, Storage) · Vitest · Playwright · Vercel.

---

## Quick start

Requirements: Node.js 20.9+ (tested on 24 LTS) and pnpm 10.

```bash
pnpm install
cp .env.example .env.local   # then fill in values (see below)
pnpm dev                     # http://localhost:3000
```

**Without Supabase**, the site still runs and every page renders. Accounts, saving and uploads are switched off, and a banner links to `/setup`. In development only, you can open the editor at `/editor/demo` with clearly labelled sample data. Nothing is saved, and publishing stays disabled. Demo mode never runs in production builds.

## Commands

| Command | What it does |
| --- | --- |
| `pnpm dev` | Development server (Turbopack) |
| `pnpm build` / `pnpm start` | Production build and server |
| `pnpm lint` | ESLint (Next.js core-web-vitals + TypeScript rules) |
| `pnpm typecheck` | Generates route types, then runs `tsc --noEmit` |
| `pnpm test` | Vitest unit and component tests |
| `pnpm test:e2e` | Playwright end-to-end tests (starts a dev server on port 3300) |
| `pnpm check` | Lint, type-check, unit tests and build in one go |
| `pnpm images:fetch` | Re-downloads destination photos listed in `scripts/image-sources.json` |
| `node scripts/build-brand-assets.mjs public/brand/Logo.png public/brand/Favicon.png` | Rebuilds the site logo, emblem, favicon and app icons from the two master images |
| `pnpm db:types` | Regenerates database types from a local Supabase stack |

## Setting up Supabase

1. **Create a project** at [supabase.com](https://supabase.com). From *Project Settings → API*, copy:
   - the Project URL, into `NEXT_PUBLIC_SUPABASE_URL`
   - the publishable key (`sb_publishable_…`), or the legacy anon key, into `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - the secret key (`sb_secret_…`), or the legacy service-role key, into `SUPABASE_SECRET_KEY`. This one is **server-only**.
2. **Apply the migrations** in `supabase/migrations`. These create the tables, constraints, RLS policies, the private `trip-photos` and `avatars` buckets with their policies, and the reference data. Profile photos need `20261009000200_profile_avatars.sql`; until it is applied, everything else works and uploading a profile photo shows a clear "apply the latest migration" message.
   ```bash
   pnpm exec supabase login
   pnpm exec supabase link --project-ref <your-ref>
   pnpm exec supabase db push
   ```
   Alternatively, paste each migration file into the SQL editor, in filename order.
3. **Configure auth** under *Authentication → URL Configuration*:
   - Set the **Site URL** to your site, e.g. `http://localhost:3000` or your production domain.
   - Add `<site>/auth/confirm` to the **Redirect URLs**.
   - Recommended: under *Email Templates*, change the confirmation and reset links to the token-hash format so they work across browsers and devices:
     - Confirm signup: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/my-memories`
     - Reset password: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery`

     The default PKCE links also work, as long as they're opened in the same browser.
4. **Production email:** Supabase's built-in email sender is heavily rate-limited. Before launch, configure custom SMTP under *Authentication → SMTP Settings*.
5. Restart `pnpm dev`. The `/setup` page shows whether the connection is detected.

### Local Supabase (optional, requires Docker)

```bash
pnpm exec supabase start          # runs migrations; prints local URL and keys
pnpm exec supabase test db        # runs the pgTAP RLS tests in supabase/tests
pnpm db:types                     # regenerate src/lib/supabase/database.types.ts
```

## Architecture

```
src/
  app/
    (site)/           Marketing and account pages, sharing the header and footer
    (studio)/         Editor and private draft preview, with their own chrome
    memory/[slug]/    Published memory pages
    auth/confirm/     Handler for email links
  config/
    themes/*.ts       Destination theme data. Add new destinations here.
    fonts.ts          Font registry (theme fonts aren't preloaded)
    generated/        Photo manifest with licence and attribution data
  features/
    themes/           Theme engine: types, registry and resolver with fallbacks,
                      CSS variable bridge, decorations, illustrated fallback
    templates/        Four template families, consuming MemoryContent + theme
    trips/            Zod schemas, server queries, server actions
    editor/           Editor UI, autosave queue, upload pipeline
    memories/         Sample memories, published-memory loader
    auth/, account/   Session data-access layer, auth and account actions
  lib/supabase/       Server, browser, proxy-session, anonymous and admin clients
  proxy.ts            Refreshes the session and redirects signed-out visitors (convenience only)
supabase/migrations/  Schema, RLS, storage policies, reference data
tests/unit, tests/e2e
```

**Theme engine.** Each destination is a typed config object: palettes, typography, image treatment, decorations, radius, copy, photography and supported templates. `resolveTheme(slug, palette)` falls back gracefully for unknown destinations, unknown palettes and missing images. Templates read the theme only through CSS variables (`bg-th-bg`, `text-th-primary`, `font-th-heading`, …), so there are no destination-specific conditionals in components. A unit test checks every palette against WCAG contrast thresholds.

**Templates** are plain React components shared by server pages and the client editor. They use container queries rather than viewport breakpoints, so the editor's phone and desktop previews match what visitors will see.

**Data flow.**

- The editor saves through validated server actions, with debounced autosave per field group.
- Photos are compressed in the browser, which also strips EXIF/GPS data. They upload directly to `trip-photos/<user>/<trip>/<photo>.jpg`. The server then checks the stored object's real size and type before recording it.
- Publishing writes a snapshot to `published_memories` containing storage paths only, never URLs. The slug is readable but has a random 10-character suffix.

### Security model

- **Every protected page and action verifies the user on the server.** `requireUser` covers pages, and actions check `auth.getClaims()`. `proxy.ts` only does convenience redirects.
- **RLS is on for every table.** Users can only read or write their own trips, photos and publications. Database triggers also check that a photo's or publication's owner owns the trip, and a CHECK constraint confirms each storage path sits in the owner's own folder.
- **Visibility:**
  - Anonymous visitors can list only public publications.
  - Unlisted and private memories are reachable only through the `get_published_memory(slug)` security-definer function. It returns private memories to their owner only, so they can't be enumerated.
  - Unlisted pages send `noindex` and `Referrer-Policy: no-referrer`.
  - The sitemap includes only public memories whose owners turned on indexing.
- **Photos stay in a private bucket.** Owners see them through their own signed URLs. Visitors to a published memory get 1-hour signed URLs, which the server creates only after the access check, and only for paths listed in that publication. Social previews use destination photography rather than user photos.
- **The secret key is used in exactly two server-only places**, both in `src/lib/supabase/admin.ts`: signing URLs for published photos, and deleting an account.
- **Abuse limits:**
  - 100 trips per account and 60 photos per trip, enforced by database triggers.
  - Photos must be 10 MB or less after compression, enforced by the bucket and the server.
  - Only JPEG, PNG or WebP files are accepted.
  - Server-action bodies are capped at 1 MB.
  - Supabase Auth applies its own rate limits.
- **Security headers:** `X-Frame-Options: DENY`, `nosniff`, a strict referrer policy, a restrictive permissions policy and `frame-ancestors 'none'`.

## Testing

```bash
pnpm test        # 137 unit/component tests
pnpm test:e2e    # Playwright, desktop and Pixel 7 profiles
```

**Unit and component tests** cover:

- theme configuration and contrast
- reference-data drift between the TypeScript config and the SQL migrations
- date formatting
- validation, slugs and storage-path ownership
- upload validation
- the autosave queue
- rendering of every template, layout and destination combination, including empty states
- server-action authorisation and publishing, run against an in-memory Supabase fake that emulates RLS ownership

**End-to-end tests** come in three suites:

- `public.spec.ts` always runs. It covers the landing, destination and template pages, the sample memory, not-found pages, protected-route redirects, security headers, horizontal overflow and image alt text.
- `demo-editor.spec.ts` runs only when Supabase isn't configured. It covers uploading, reordering, deleting and theme switching in demo mode.
- `account-flow.spec.ts` runs with `E2E_SUPABASE=1` against a real project; a local `supabase start` is recommended. It covers sign up, sign in and sign out, creating a trip, uploading, autosave persisting across a reload, publishing an unlisted memory, a visitor's access, switching to private, and a second account being denied access. The project needs email confirmation disabled (the local default) and `SUPABASE_SECRET_KEY` set.

The **pgTAP suite** in `supabase/tests/database/rls.test.sql` checks RLS, constraints and visibility inside Postgres (`supabase test db`).

## Deploying to Vercel

1. Push the repository to GitHub and import it in Vercel. The framework preset is detected automatically.
2. Under *Settings → Environment Variables*, add these for Production and Preview:
   - `NEXT_PUBLIC_SITE_URL`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SECRET_KEY`

   Mark the secret as **Sensitive**.
3. Add the production domain's `/auth/confirm` to Supabase's redirect URLs, and set the Site URL to the production domain.
4. Deploy. After the first deploy:
   - open `/setup` to confirm the connection
   - sign up with a real inbox
   - publish a test memory and open it in a private window

Use a separate Supabase project for Preview deployments if you don't want preview data mixing with production.

## Backup and recovery (complete before launch)

- **Database:** Supabase Pro and above take daily backups. Enable **Point-in-Time Recovery** for production. Before each migration, take an extra logical backup with `pnpm exec supabase db dump --linked -f backup.sql` (schema), plus `--data-only` for data, and store it outside Supabase.
- **Storage:** database backups don't include Storage objects. Schedule a job (for example a GitHub Action using the S3-compatible Storage endpoint or `supabase storage cp`) that copies the `trip-photos` bucket to separate object storage with versioning and a retention policy.
- **Restore drill:** before launch, restore a backup into a scratch project. Then:
  - point a preview deployment at it
  - check that a published memory renders with its photos
  - write down how long the restore took (your RTO) and how much data was lost (your RPO)
- **Migrations** are forward-only and kept in Git. Never edit an applied migration; add a new one.

## Images and licensing

Destination photos come from Wikimedia Commons under CC0, public-domain or CC BY / CC BY-SA licences. They're listed in `scripts/image-sources.json` and credited at `/credits`. The fetch script refuses any image whose licence doesn't permit commercial reuse. Two images were swapped out because their author asks to be contacted before commercial use. To replace images, edit the JSON and run `pnpm images:fetch`. If a theme has no imagery, templates fall back to an illustrated, palette-driven landscape.

## Known limitations of Phase 1

- **HEIC photos** are converted to JPEG in the browser (heic2any, loaded only when an iPhone photo is chosen).
- **Upload progress** shows a percentage for preparing and uploading each photo. If the progress-reporting request fails, the upload falls back to the standard Supabase upload (no percentage).
- **Legal pages** are drafts and must be reviewed before launch.
- **Performance needs another pass before launch.** These Lighthouse 12 mobile numbers come from a local `next start` on 9 Oct 2026, with no CDN and DevTools throttling (slow 4G, 4× CPU):

  | Page | Perf | A11y | LCP | CLS | TBT |
  | --- | --- | --- | --- | --- | --- |
  | `/` | 65 | 100 | 3.5 s | 0.000 | 788 ms |
  | `/memory/sample-goa` | 86 | 100 | 2.6 s | 0.001 | 312 ms |
  | `/destinations/munnar` | 66 | 100 | 3.2 s | 0.000 | 1189 ms |
  | `/templates` | 74 | 100 | 4.1 s | 0.000 | 306 ms |

  Layout shift is effectively zero and accessibility scores 100. LCP is above the 2.5 s "good" threshold, mainly because of time to first paint (render-blocking CSS and preloaded fonts) and main-thread work. Next steps:
  - Re-measure on the Vercel deployment with PageSpeed Insights, since the CDN and compression will change TTFB.
  - Trim the destination pages' client JavaScript.
  - Consider a subset of the display font for the hero.
