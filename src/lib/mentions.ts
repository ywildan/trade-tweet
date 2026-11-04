/** Batas mention per post agar satu postingan tidak memicu spam notifikasi. */
export const MAX_MENTIONS_PER_POST = 5;

const MENTION_PATTERN = /(^|[^a-z0-9_@])@([a-z0-9_]{3,15})\b/gi;

/**
 * Ambil @username unik dari isi post (lowercase, maks 5).
 * Aturan handle sama dengan usernameSchema: 3–15 karakter [a-z0-9_].
 */
export function extractMentions(
  content: string,
  limit = MAX_MENTIONS_PER_POST,
): string[] {
  const found = new Set<string>();
  for (const match of content.matchAll(MENTION_PATTERN)) {
    found.add(match[2].toLowerCase());
    if (found.size >= limit) break;
  }
  return [...found];
}
