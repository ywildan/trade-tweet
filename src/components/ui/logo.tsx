import Link from "next/link";

export function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      aria-hidden
      className="shrink-0"
    >
      <rect x="8" y="14" width="6" height="20" rx="2" fill="var(--long)" />
      <line x1="11" y1="8" x2="11" y2="40" stroke="var(--long)" strokeWidth="2" />
      <rect x="21" y="10" width="6" height="18" rx="2" fill="var(--short)" />
      <line x1="24" y1="5" x2="24" y2="34" stroke="var(--short)" strokeWidth="2" />
      <rect x="34" y="18" width="6" height="16" rx="2" fill="var(--accent)" />
      <line x1="37" y1="12" x2="37" y2="40" stroke="var(--accent)" strokeWidth="2" />
    </svg>
  );
}

export function Logo({
  href = "/",
  size = 36,
  withWordmark = true,
}: {
  href?: string;
  size?: number;
  withWordmark?: boolean;
}) {
  return (
    <Link
      href={href}
      aria-label="Neuraly — beranda"
      className="inline-flex items-center gap-2 text-text"
    >
      <LogoMark size={size} />
      {withWordmark && (
        <span className="text-[22px] font-bold tracking-tight">
          Neural<span className="text-accent">y</span>
        </span>
      )}
    </Link>
  );
}
