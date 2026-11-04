import { prisma } from "@/lib/db";

const MAX_LENGTH = 15;

function sanitize(raw: string) {
  const cleaned = raw
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, MAX_LENGTH);
  if (cleaned.length >= 3) return cleaned;
  return `user${cleaned}`.slice(0, MAX_LENGTH).padEnd(3, "0");
}

/** Buat username unik dari nama/email OAuth (regex DB: ^[a-z0-9_]{3,15}$). */
export async function uniqueUsername(raw: string) {
  const base = sanitize(raw);
  for (let i = 0; i < 100; i++) {
    const suffix = i === 0 ? "" : String(i);
    const candidate = `${base.slice(0, MAX_LENGTH - suffix.length)}${suffix}`;
    const taken = await prisma.user.findUnique({
      where: { username: candidate },
      select: { id: true },
    });
    if (!taken) return candidate;
  }
  return `${base.slice(0, 7)}${Date.now().toString(36).slice(-8)}`;
}
