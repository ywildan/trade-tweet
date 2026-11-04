import type { ReactNode } from "react";

/**
 * Badge — DESIGN.md §7. Dipasangkan SETELAH nama user, semua ukuran 12–18px.
 * Server-safe.
 */

/** Centang verified: lingkaran biru + centang putih (SVG inline). */
export function VerifiedBadge({ size = 18 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 22 22"
      width={size}
      height={size}
      aria-label="Akun terverifikasi"
      role="img"
      className="inline-block shrink-0 translate-y-[1px]"
    >
      <title>Akun terverifikasi</title>
      <path
        fill="#1d9bf0"
        d="M20.396 11c-.018-.006-2.862-1.603-4.614-2.612.787-2.409 1.316-5.61 1.344-5.789a.681.681 0 0 0-.154-.413-.7.7 0 0 0-.195-.16c-.432-.25-5.53.25-8.262 1.16-.166-.628-.35-1.226-.53-1.78A16 16 0 0 0 .552 3.5a.65.65 0 0 0-.316.254.68.68 0 0 0-.1.362c0 .148.422 4.102 1.37 7.218.086.278.26.51.5.66.199.13.435.21.687.239 1.635.18 3.03.36 4.195.59.093.017.188.025.283.026.048-.069-.163-2.35-.175-2.39-.01-.038-.023-.073-.038-.105a1.22 1.22 0 0 0-.28-.397 1.205 1.205 0 0 1 .09-.01c.062-.033 4.248-.714 7.678-.714.08 0 .157.003.231.012a1.204 1.204 0 0 0-.09.435c0 .064.008.127.02.188 0 .012-.007.024-.006.036-.008.04-.01.08-.008.12.015.037.027.076.04.115-.112.534-.63 2.44-1.26 4.34-.024.093-.04.188-.064.282a.594.594 0 0 0-.08.265c0 .015-.006.03-.006.045.005.08.018.156.042.227a.616.616 0 0 0 .01.037c.164.416.53.61.918.61.076 0 .152-.007.228-.02 6.385-.088 7.825-.113 8.247-.088.426.025.857-.18 1.18-.46l.024-.02a.68.68 0 0 0 .116-.176c.047-.104.068-.217.062-.332a.694.694 0 0 0-.163-.383l-.004-.005-.001-.004a.738.738 0 0 0-.145-.144c-.07-.04-2.7-1.573-4.92-2.357Z"
      />
    </svg>
  );
}

const pillStyles: Record<string, string> = {
  curator:
    "bg-gold/[0.12] text-gold border border-gold/30",
  sniper: "bg-gold/[0.12] text-gold border border-gold/30",
  consistent: "bg-accent/[0.12] text-accent border border-accent/30",
  profit_hunter: "bg-long/[0.12] text-long border border-long/30",
  analyst: "bg-text-muted/10 text-text-muted border border-text-muted/20",
};

const pillLabels: Record<string, string> = {
  curator: "⭐ Kurator",
  sniper: "🎯 Sniper",
  consistent: "📈 Konsisten",
  profit_hunter: "💰 Profit Hunter",
  analyst: "🔍 Analis",
};

/** Pill badge reputasi (sniper, dsb). type = UserBadge.type di DB. */
export function ReputationBadge({
  type,
  size = "md",
}: {
  type: keyof typeof pillStyles;
  size?: "sm" | "md";
}) {
  const cls = pillStyles[type];
  const label = pillLabels[type];
  if (!cls) return null;
  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold ${cls} ${
        size === "sm" ? "px-2 py-[1px] text-[11px]" : "px-2.5 py-[2px] text-xs"
      }`}
      title={label}
    >
      {size === "sm" ? label.split(" ")[0] : label}
    </span>
  );
}

/** Wrapper semua badge: <UserBadges types={["verified", "sniper"]} /> */
export function UserBadges({
  types,
  size = "md",
}: {
  types: string[];
  size?: "sm" | "md";
}) {
  const has = (t: string) => types.includes(t);
  return (
    <span className="inline-flex items-center gap-1">
      {has("verified") && <VerifiedBadge size={size === "sm" ? 15 : 18} />}
      {has("curator") && <ReputationBadge type="curator" size={size} />}
      {has("sniper") && <ReputationBadge type="sniper" size={size} />}
      {has("consistent") && <ReputationBadge type="consistent" size={size} />}
      {has("profit_hunter") && (
        <ReputationBadge type="profit_hunter" size={size} />
      )}
      {has("analyst") && <ReputationBadge type="analyst" size={size} />}
    </span>
  );
}

/** Chip status siklus sinyal (DESIGN.md §5.2). status = SignalStatus DB. */
export function SignalStatusChip({
  status,
}: {
  status: "OPEN" | "TP_HIT" | "SL_HIT" | "EXPIRED" | "CANCELLED";
}): ReactNode {
  const map: Record<string, string> = {
    OPEN: "bg-text-muted/15 text-text-muted",
    TP_HIT: "bg-long text-black font-bold",
    SL_HIT: "bg-short text-white font-bold",
    EXPIRED: "bg-text-muted/10 text-text-muted/70",
    CANCELLED: "bg-text-muted/10 text-text-muted/60",
  };
  const label: Record<string, string> = {
    OPEN: "OPEN",
    TP_HIT: "TP 🎯",
    SL_HIT: "SL",
    EXPIRED: "Kedaluwarsa",
    CANCELLED: "Batal",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-[2px] text-[11px] font-semibold tracking-wide ${map[status]}`}
    >
      {label[status]}
    </span>
  );
}
