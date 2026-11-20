import "server-only";
import { createClient } from "@/lib/supabase/server";

export type FeedbackItemRow = {
  id: string;
  kind: string;
  area: string;
  severity: string | null;
  description: string;
  steps: string | null;
  status: string;
  screenshots: { path: string; url: string | null }[];
};
export type FeedbackRow = {
  id: string;
  createdAt: string;
  name: string | null;
  role: string | null;
  contact: string | null;
  ratings: Record<string, number>;
  liked: string | null;
  change: string | null;
  pageUrl: string | null;
  userAgent: string | null;
  status: string;
  adminNote: string | null;
  items: FeedbackItemRow[];
};

/** Feedback for admins (RLS: admins only), newest first, screenshots signed for 1 h. */
export async function listFeedback(): Promise<FeedbackRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("feedback")
    .select(
      "id, created_at, name, role, contact, ratings, liked, change, page_url, user_agent, status, admin_note, items:feedback_items(id, position, kind, area, severity, description, steps, status, screenshots)",
    )
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) return []; // e.g. before migration 0023
  const paths = (data ?? []).flatMap((f) =>
    ((f.items ?? []) as { screenshots: string[] }[]).flatMap((i) => i.screenshots ?? []),
  );
  const urls = new Map<string, string>();
  if (paths.length) {
    const { data: signed } = await supabase.storage.from("feedback").createSignedUrls(paths, 3600);
    for (const s of signed ?? []) if (s.path && s.signedUrl) urls.set(s.path, s.signedUrl);
  }
  return (data ?? []).map((f) => ({
    id: f.id as string,
    createdAt: f.created_at as string,
    name: f.name as string | null,
    role: f.role as string | null,
    contact: f.contact as string | null,
    ratings: (f.ratings ?? {}) as Record<string, number>,
    liked: f.liked as string | null,
    change: f.change as string | null,
    pageUrl: f.page_url as string | null,
    userAgent: f.user_agent as string | null,
    status: f.status as string,
    adminNote: f.admin_note as string | null,
    items: (
      (f.items ?? []) as (Omit<FeedbackItemRow, "screenshots"> & {
        position: number;
        screenshots: string[];
      })[]
    )
      .sort((a, b) => a.position - b.position)
      .map((i) => ({
        id: i.id,
        kind: i.kind,
        area: i.area,
        severity: i.severity,
        description: i.description,
        steps: i.steps,
        status: i.status,
        screenshots: (i.screenshots ?? []).map((p) => ({ path: p, url: urls.get(p) ?? null })),
      })),
  }));
}

/** Number of submissions not looked at yet, for the admin overview. */
export async function newFeedbackCount(): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("feedback")
    .select("id", { count: "exact", head: true })
    .eq("status", "new");
  return error ? 0 : (count ?? 0);
}
