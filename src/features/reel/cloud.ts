import { getBrowserClient } from "@/lib/supabase/browser";
import type { Json } from "@/lib/supabase/database.types";
import type { ReelExportMeta } from "./reel-library";
import type { ReelProject } from "./types";

/*
 * Account copy of the reel settings and of the details of finished reels, so they follow the
 * signed-in user between devices. The video files themselves are never uploaded: they stay in the
 * browser that rendered them. Every function is a quiet no-op without Supabase or a signed-in user.
 */

export interface CloudReelProject {
  tripId: string;
  draft: ReelProject | null;
  saved: ReelProject | null;
  savedAt: string | null;
  updatedAt: number;
}

async function session() {
  const supabase = getBrowserClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id;
  return userId ? { supabase, userId } : null;
}

export async function cloudPushReelProject(p: CloudReelProject): Promise<void> {
  const s = await session();
  if (!s) return;
  const { error } = await s.supabase.from("reel_projects").upsert({
    owner_id: s.userId,
    trip_id: p.tripId,
    draft: p.draft as unknown as Json,
    saved: p.saved as unknown as Json,
    saved_at: p.savedAt,
    updated_at_ms: p.updatedAt,
  });
  if (error) throw error;
}

export async function cloudPullReelProjects(): Promise<CloudReelProject[]> {
  const s = await session();
  if (!s) return [];
  const { data, error } = await s.supabase.from("reel_projects").select("trip_id, draft, saved, saved_at, updated_at_ms").limit(500);
  if (error) throw error;
  return (data ?? []).map((r) => ({
    tripId: r.trip_id,
    draft: r.draft as unknown as ReelProject | null,
    saved: r.saved as unknown as ReelProject | null,
    savedAt: r.saved_at,
    updatedAt: r.updated_at_ms,
  }));
}

export async function cloudDeleteReelProject(tripId: string): Promise<void> {
  const s = await session();
  if (!s) return;
  await s.supabase.from("reel_projects").delete().eq("trip_id", tripId);
}

export async function cloudSaveReelExport(meta: ReelExportMeta): Promise<void> {
  const s = await session();
  if (!s) return;
  const { error } = await s.supabase
    .from("reel_exports")
    .upsert({ owner_id: s.userId, id: meta.id, trip_id: meta.tripId, meta: meta as unknown as Json, created_at_ms: meta.createdAt });
  if (error) throw error;
}

export async function cloudListReelExports(): Promise<ReelExportMeta[]> {
  const s = await session();
  if (!s) return [];
  const { data, error } = await s.supabase.from("reel_exports").select("meta").order("created_at_ms", { ascending: false }).limit(100);
  if (error) throw error;
  return (data ?? []).map((r) => r.meta as unknown as ReelExportMeta);
}

export async function cloudDeleteReelExport(id: string): Promise<void> {
  const s = await session();
  if (!s) return;
  await s.supabase.from("reel_exports").delete().eq("id", id);
}
