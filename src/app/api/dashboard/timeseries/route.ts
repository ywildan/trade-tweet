import { connection } from "next/server";
import { auth } from "@/auth";
import { apiError, apiOk, handleApiError } from "@/lib/api";
import { getDashboardTimeseries } from "@/lib/dashboard";

/** GET /api/dashboard/timeseries — views & interaksi per hari (30 hari). */
export async function GET() {
  await connection();

  try {
    const session = await auth();
    if (!session?.user) {
      return apiError("UNAUTH", "Masuk dulu untuk melihat analitik.", 401);
    }

    const series = await getDashboardTimeseries(session.user.id);
    return apiOk({ days: series });
  } catch (error) {
    return handleApiError(error);
  }
}
