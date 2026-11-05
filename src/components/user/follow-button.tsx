"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useToast } from "@/components/ui/toast";

export function FollowButton({
  username,
  initialFollowing,
  isGuest,
  size = "md",
}: {
  username: string;
  initialFollowing: boolean;
  isGuest: boolean;
  size?: "sm" | "md";
}) {
  const router = useRouter();
  const toast = useToast();
  const [following, setFollowing] = useState(initialFollowing);
  const [syncedInitial, setSyncedInitial] = useState(initialFollowing);
  const [hover, setHover] = useState(false);
  const [busy, setBusy] = useState(false);

  if (initialFollowing !== syncedInitial) {
    setSyncedInitial(initialFollowing);
    setFollowing(initialFollowing);
  }

  const sizeClass =
    size === "sm"
      ? "min-h-11 h-11 px-3 text-[13px]"
      : "min-h-11 h-11 px-4 text-[14px]";

  if (isGuest) {
    return (
      <Link
        href={`/login?next=${encodeURIComponent(`/@${username}`)}`}
        className={`inline-flex shrink-0 items-center justify-center rounded-lg bg-text font-semibold text-bg transition-colors hover:bg-text/90 ${sizeClass}`}
      >
        Ikuti
      </Link>
    );
  }

  async function toggle() {
    if (busy) return;
    const next = !following;
    setFollowing(next);
    setBusy(true);
    try {
      const response = await fetch(`/api/users/${username}/follow`, {
        method: next ? "POST" : "DELETE",
      });
      const json = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(json?.error?.message ?? "Aksi gagal.");
      }
      toast({
        message: next
          ? `Mulai mengikuti @${username}.`
          : `Berhenti mengikuti @${username}.`,
      });
      router.refresh();
    } catch {
      setFollowing(!next);
      toast({ message: "Gagal memperbarui status ikuti. Coba lagi." });
    } finally {
      setBusy(false);
    }
  }

  const label = following ? (hover ? "Berhenti ikuti" : "Mengikuti") : "Ikuti";

  return (
    <button
      type="button"
      onClick={toggle}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      disabled={busy}
      aria-pressed={following}
      className={`inline-flex shrink-0 items-center justify-center rounded-lg border font-semibold transition-colors disabled:opacity-70 ${sizeClass} ${
        following
          ? hover
            ? "border-short bg-short/10 text-short"
            : "border-border text-text hover:bg-bg-input/60"
          : "border-transparent bg-text text-bg hover:bg-text/90"
      }`}
    >
      {label}
    </button>
  );
}
