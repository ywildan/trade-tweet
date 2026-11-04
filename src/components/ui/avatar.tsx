const PALETTES = [
  "bg-accent/80",
  "bg-repost/80",
  "bg-like/70",
  "bg-gold/80",
  "bg-short/60",
  "bg-verified/70",
  "bg-text-muted/60",
  "bg-long/60",
];

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

/** Avatar dengan fallback inisial + warna deterministik (DESIGN.md §10). */
export function Avatar({
  name,
  src,
  size = 40,
  className = "",
}: {
  name: string;
  src?: string | null;
  size?: number;
  className?: string;
}) {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  const palette = PALETTES[hash % PALETTES.length];

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full ${className}`}
      style={{ width: size, height: size }}
    >
      {src ? (
        // URL avatar bebas domain (diisi user), jadi tidak lewat next/image.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={name}
          width={size}
          height={size}
          className="h-full w-full object-cover"
        />
      ) : (
        <span
          aria-hidden
          className={`inline-flex h-full w-full items-center justify-center font-bold text-white ${palette}`}
          style={{ fontSize: Math.max(11, size * 0.3) }}
        >
          {initials(name) || "?"}
        </span>
      )}
    </span>
  );
}
