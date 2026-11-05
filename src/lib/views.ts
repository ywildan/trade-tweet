import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";

/**
 * Detail post = +1 view per (user|IP hash, post) per hari (spesifikasi.md §7).
 * Unique PostView membuat render berulang tidak menambah angka.
 */
/** Tayangan profil, dedupe per (profil|IP hash, hari) seperti post view. */
export async function recordProfileView(
  profileId: string,
  userId: string | null,
): Promise<boolean> {
  const headerStore = await headers();
  const forwarded = headerStore
    .get("x-forwarded-for")
    ?.split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  const ip =
    forwarded?.[forwarded.length - 1] ||
    headerStore.get("x-real-ip") ||
    "local";
  const viewerKey =
    userId ?? createHash("sha256").update(ip).digest("hex").slice(0, 32);
  const day = new Date().toISOString().slice(0, 10);

  try {
    await prisma.profileView.create({
      data: { profileId, viewerKey, day },
    });
    return true;
  } catch (error) {
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? (error as { code?: string }).code
        : undefined;
    if (code === "P2002") return false;
    throw error;
  }
}

/**
 * Konteks dedupe view: dibaca saat render, lalu dioper sebagai primitif
 * (aman dipakai di dalam after(), yang tidak boleh memanggil headers()).
 */
export async function getPostViewContext(
  userId: string | null,
): Promise<{ viewerKey: string; day: string }> {
  const headerStore = await headers();
  // Entri terakhir X-Forwarded-For (lihat requestKey di rate-limit.ts):
  // entri pertama dikendalikan pengirim dan bisa diputar untuk
  // menggelembungkan view tamu.
  const forwarded = headerStore
    .get("x-forwarded-for")
    ?.split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  const ip =
    forwarded?.[forwarded.length - 1] ||
    headerStore.get("x-real-ip") ||
    "local";
  const viewerKey =
    userId ?? createHash("sha256").update(ip).digest("hex").slice(0, 32);
  const day = new Date().toISOString().slice(0, 10);
  return { viewerKey, day };
}

/**
 * Tulis satu view dengan konteks yang sudah dibaca. Dedupe tetap sama:
 * satu baris per (post, viewerKey, hari); duplikat (P2002) bukan view baru.
 */
export async function recordPostViewWithContext(
  postId: string,
  viewerKey: string,
  day: string,
): Promise<boolean> {
  try {
    await prisma.postView.create({
      data: { postId, viewerKey, day, count: 1 },
    });
    await prisma.post.update({
      where: { id: postId },
      data: { views: { increment: 1 } },
    });
    return true;
  } catch (error) {
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? (error as { code?: string }).code
        : undefined;
    if (code === "P2002") return false;
    throw error;
  }
}

export async function recordPostView(
  postId: string,
  userId: string | null,
): Promise<boolean> {
  const { viewerKey, day } = await getPostViewContext(userId);
  return recordPostViewWithContext(postId, viewerKey, day);
}
