import { connection } from "next/server";
import { apiOk, handleApiError } from "@/lib/api";
import { searchAll } from "@/lib/search";
import { getSessionUser } from "@/lib/session";

/** GET /api/search?q= — user (username/nama), post (isi), simbol katalog. */
export async function GET(request: Request) {
  await connection();

  try {
    const { searchParams } = new URL(request.url);
    const user = await getSessionUser();
    const results = await searchAll(
      searchParams.get("q") ?? "",
      user?.id ?? null,
    );
    return apiOk(results);
  } catch (error) {
    return handleApiError(error);
  }
}
