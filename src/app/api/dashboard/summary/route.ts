import { connection } from "next/server";
import { auth } from "@/auth";
import { apiError, apiOk, handleApiError } from "@/lib/api";
import { getDashboardSummary } from "@/lib/dashboard";

/** GET /api/dashboard/summary: ringkasan 30 hari milik pengguna login. */
export async function GET() {
  await connection();

  try {
    const session = await auth();
    if (!session?.user) {
      return apiError("UNAUTH", "Masuk dulu untuk melihat analitik.", 401);
    }

    const summary = await getDashboardSummary(session.user.id);
    return apiOk(summary);
  } catch (error) {
    return handleApiError(error);
  }
}
