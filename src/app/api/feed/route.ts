import { connection } from "next/server";
import { auth } from "@/auth";
import { apiOk, handleApiError } from "@/lib/api";
import { getFeed } from "@/lib/posts";

/** GET /api/feed?tab=foryou|following&cursor= */
export async function GET(request: Request) {
  // Feed bergantung pada sesi & data terbaru: jangan ikut prerender.
  // Di luar try/catch agar sinyal prerender Next tidak tertelan.
  await connection();

  try {
    const session = await auth();
    const { searchParams } = new URL(request.url);
    const tab = searchParams.get("tab") === "following" ? "following" : "foryou";
    const cursor = searchParams.get("cursor");

    const result = await getFeed({
      tab,
      cursor,
      viewerId: session?.user.id ?? null,
    });

    return apiOk(result);
  } catch (error) {
    return handleApiError(error);
  }
}
