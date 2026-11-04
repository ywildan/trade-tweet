/** X.com menghitung emoji sebagai 2 karakter (spesifikasi.md §3). */
export function countChars(value: string): number {
  let count = 0;
  for (const char of value) {
    count += (char.codePointAt(0) ?? 0) > 0xffff ? 2 : 1;
  }
  return count;
}

export const POST_MAX_CHARS = 280;
