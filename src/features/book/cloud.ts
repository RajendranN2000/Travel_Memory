import type { Json } from "@/lib/supabase/database.types";
import { getBrowserClient } from "@/lib/supabase/browser";
import type { BookMeta, StoredImage } from "./storage";
import type { BookProject } from "./types";

/*
 * Account copy of the books. The browser's IndexedDB stays the working copy (fast, works offline);
 * this keeps a copy under the signed-in user so books follow them between devices. Every function
 * is a quiet no-op when Supabase isn't configured or nobody is signed in.
 */

const BUCKET = "book-images";

async function session() {
  const supabase = getBrowserClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id;
  return userId ? { supabase, userId } : null;
}

export async function cloudSaveBook(project: BookProject): Promise<void> {
  const s = await session();
  if (!s) return;
  const { error } = await s.supabase.from("book_projects").upsert({
    owner_id: s.userId,
    id: project.id,
    trip_id: project.tripId,
    title: project.title.slice(0, 200),
    template_key: project.templateKey,
    kind: project.kind,
    page_count: project.pages.length,
    width_mm: project.settings.widthMm,
    height_mm: project.settings.heightMm,
    created_at_ms: project.createdAt,
    updated_at_ms: project.updatedAt,
    project: project as unknown as Json,
  });
  if (error) throw error;
}

export async function cloudListBooks(): Promise<BookMeta[]> {
  const s = await session();
  if (!s) return [];
  const { data, error } = await s.supabase
    .from("book_projects")
    .select("id, trip_id, title, template_key, kind, page_count, width_mm, height_mm, updated_at_ms")
    .order("updated_at_ms", { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    tripId: r.trip_id,
    title: r.title,
    templateKey: r.template_key,
    kind: r.kind as BookMeta["kind"],
    pageCount: r.page_count,
    widthMm: Number(r.width_mm),
    heightMm: Number(r.height_mm),
    updatedAt: r.updated_at_ms,
  }));
}

export async function cloudLoadBook(id: string): Promise<BookProject | null> {
  const s = await session();
  if (!s) return null;
  const { data, error } = await s.supabase.from("book_projects").select("project").eq("id", id).maybeSingle();
  if (error) throw error;
  return (data?.project as unknown as BookProject | undefined) ?? null;
}

export async function cloudLatestForTrip(tripId: string): Promise<BookProject | null> {
  const s = await session();
  if (!s) return null;
  const { data, error } = await s.supabase
    .from("book_projects")
    .select("project")
    .eq("trip_id", tripId)
    .order("updated_at_ms", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data?.project as unknown as BookProject | undefined) ?? null;
}

export async function cloudDeleteBook(id: string): Promise<void> {
  const s = await session();
  if (!s) return;
  const { data } = await s.supabase.from("book_images").select("storage_path").eq("project_id", id);
  const paths = (data ?? []).map((r) => r.storage_path);
  if (paths.length) await s.supabase.storage.from(BUCKET).remove(paths);
  const { error } = await s.supabase.from("book_projects").delete().eq("id", id);
  if (error) throw error;
}

const imagePath = (userId: string, projectId: string, imageId: string) => `${userId}/${projectId}/${imageId}`;

export async function cloudSaveImage(projectId: string, image: { id: string; name: string; width: number; height: number; blob: Blob }): Promise<void> {
  const s = await session();
  if (!s) return;
  const path = imagePath(s.userId, projectId, image.id);
  const { error: uploadError } = await s.supabase.storage.from(BUCKET).upload(path, image.blob, { upsert: true, contentType: image.blob.type || "image/jpeg" });
  if (uploadError) throw uploadError;
  const { error } = await s.supabase
    .from("book_images")
    .upsert({ owner_id: s.userId, project_id: projectId, image_id: image.id, name: image.name.slice(0, 255), width: image.width, height: image.height, storage_path: path });
  if (error) throw error;
}

export async function cloudDeleteImage(projectId: string, imageId: string): Promise<void> {
  const s = await session();
  if (!s) return;
  await s.supabase.storage.from(BUCKET).remove([imagePath(s.userId, projectId, imageId)]);
  await s.supabase.from("book_images").delete().eq("project_id", projectId).eq("image_id", imageId);
}

export async function cloudLoadImages(projectId: string): Promise<StoredImage[]> {
  const s = await session();
  if (!s) return [];
  const { data, error } = await s.supabase.from("book_images").select("image_id, name, width, height, storage_path").eq("project_id", projectId);
  if (error) throw error;
  const out: StoredImage[] = [];
  for (const r of data ?? []) {
    const { data: blob } = await s.supabase.storage.from(BUCKET).download(r.storage_path);
    if (blob) out.push({ key: `${projectId}:${r.image_id}`, projectId, id: r.image_id, name: r.name, width: r.width, height: r.height, blob });
  }
  return out;
}
