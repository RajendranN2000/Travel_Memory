/**
 * Supabase configuration. NEXT_PUBLIC_* values must be referenced statically
 * so Next.js can inline them into the browser bundle.
 */
export interface SupabaseConfig {
  url: string;
  key: string;
}

const PLACEHOLDER = /your-project|example\.supabase|replace-me|^$/i;

export function getSupabaseConfig(): SupabaseConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  if (PLACEHOLDER.test(url) || PLACEHOLDER.test(key)) return null;
  try {
    new URL(url);
  } catch {
    return null;
  }
  return { url, key };
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseConfig() !== null;
}

/**
 * Demo mode lets developers explore the editor with clearly labelled sample
 * data before Supabase is configured. It is never available in production.
 */
export function isDemoMode(): boolean {
  return !isSupabaseConfigured() && process.env.NODE_ENV !== "production";
}

export function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (process.env.NODE_ENV === "production") return "https://mytravelmemory.com";
  return "http://localhost:3000";
}
