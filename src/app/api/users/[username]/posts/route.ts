import { auth } from "@/auth";
import { apiError, apiOk, handleApiError } from "@/lib/api";
import {
  getUserBookmarks,
  getUserPosts,
  getUserReplies,
  getUserReposts,
} from "@/lib/posts";
import { prisma } from "@/lib/db";
import type { FeedPost } from "@/types/post";

type Context = { params: Promise<{ username: string }> };
type Tab = "signals" | "replies" | "reposts" | "bookmarks";

const TABS: Tab[] = ["signals", "replies", "reposts", "bookmarks"];

/** GET /api/users/[username]/posts?tab=signals|replies|reposts|bookmarks */
export async function GET(request: Request, context: Context) {
  try {
    const { username } = await context.params;
    const target = await prisma.user.findUnique({
      where: { username: username.toLowerCase() },
      select: { id: true },
    });
    if (!target) {
      return apiError("NOT_FOUND", "Pengguna tidak ditemukan.", 404);
    }

    const session = await auth();
    const { searchParams } = new URL(request.url);
    const rawTab = searchParams.get("tab") as Tab | null;
    const tab: Tab = rawTab && TABS.includes(rawTab) ? rawTab : "signals";

    if (tab === "bookmarks" && session?.user.id !== target.id) {
      return apiError("FORBIDDEN", "Simpanan hanya bisa dilihat pemiliknya.", 403);
    }

    const viewerId = session?.user.id ?? null;
    let items: FeedPost[];
    switch (tab) {
      case "replies":
        items = await getUserReplies(target.id, viewerId);
        break;
      case "reposts":
        items = await getUserReposts(target.id, viewerId);
        break;
      case "bookmarks":
        items = await getUserBookmarks(target.id, viewerId);
        break;
      default:
        items = await getUserPosts(target.id, viewerId);
    }

    return apiOk({ items, tab });
  } catch (error) {
    return handleApiError(error);
  }
}
