import { prisma } from "@/lib/db";

export type RateLimitDecision =
  | { ok: true }
  | { ok: false; retryAfter: number };

/**
 * Rate limit sederhana berbasis tabel DB (spesifikasi.md §4 Phase 6).
 * Upsert atomik pada unique [key, windowStart]; batas dihitung per jendela.
 */
export async function enforceRateLimit({
  key,
  limit,
  windowMs,
}: {
  key: string;
  limit: number;
  windowMs: number;
}): Promise<RateLimitDecision> {
  const now = Date.now();
  const windowStart = new Date(Math.floor(now / windowMs) * windowMs);

  const row = await prisma.rateLimit.upsert({
    where: { key_windowStart: { key, windowStart } },
    update: { count: { increment: 1 } },
    create: { key, windowStart, count: 1 },
    select: { count: true },
  });

  if (row.count <= limit) return { ok: true };

  return {
    ok: false,
    retryAfter: Math.max(
      1,
      Math.ceil((windowStart.getTime() + windowMs - now) / 1000),
    ),
  };
}

/**
 * Identitas klien untuk rate limit berbasis IP.
 * Ambil entri TERAKHIR X-Forwarded-For, bukan pertama: proxy tepercaya
 * (mis. Vercel) menambahkan IP klien asli di ujung rantai, sedangkan
 * entri pertama sepenuhnya dikendalikan pengirim dan bisa dipalsukan
 * untuk memutar maupun menghabiskan kuota IP orang lain. Ini bukan
 * perlindungan sempurna di luar proxy tepercaya: karena itu limit login
 * juga diikat ke email (lihat route login).
 */
export function requestKey(request: Request): string {
  const forwarded = request.headers
    .get("x-forwarded-for")
    ?.split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  const last = forwarded?.[forwarded.length - 1];
  return last || request.headers.get("x-real-ip")?.trim() || "local";
}
