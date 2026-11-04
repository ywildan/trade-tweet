import { timingSafeEqual } from "node:crypto";
import { connection } from "next/server";
import { apiError, apiOk, handleApiError } from "@/lib/api";
import { refreshDailyStats } from "@/lib/daily-stats";

export const maxDuration = 60;

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const bearer = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "")
    .trim();
  const header = bearer || request.headers.get("x-cron-secret")?.trim();
  if (!header) return false;

  const a = Buffer.from(header);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function handle(request: Request) {
  await connection();

  if (!process.env.CRON_SECRET) {
    return apiError("INTERNAL", "CRON_SECRET belum diset.", 500);
  }
  if (!isAuthorized(request)) {
    return apiError("UNAUTH", "Secret cron tidak valid.", 401);
  }

  try {
    const { searchParams } = new URL(request.url);
    const summary = await refreshDailyStats(searchParams.get("day") ?? undefined);
    return apiOk(summary);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Rollup DailyStat harian. Default: kemarin UTC.
 * Opsional `?day=YYYY-MM-DD` untuk mengisi ulang hari tertentu.
 */
export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
