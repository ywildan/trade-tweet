import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";

/**
 * Detail post = +1 view per (user|IP hash, post) per hari (spesifikasi.md §7).
 * Unique PostView membuat render berulang tidak menambah angka.
 */
export async function recordPostView(
  postId: string,
  userId: string | null,
): Promise<boolean> {
  const headerStore = await headers();
  const forwarded = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || headerStore.get("x-real-ip") || "local";
  const viewerKey =
    userId ?? createHash("sha256").update(ip).digest("hex").slice(0, 32);
  const day = new Date().toISOString().slice(0, 10);

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
