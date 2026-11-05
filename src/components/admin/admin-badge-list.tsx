"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, Star, X } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { UserBadges } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { formatCount } from "@/lib/format";

type AdminUser = {
  id: string;
  username: string;
  name: string;
  avatarUrl: string | null;
  role: string;
  badges: string[];
  posts: number;
  followers: number;
};

type ManualBadge = "verified" | "curator";

const BADGES: Array<{ type: ManualBadge; label: string }> = [
  { type: "verified", label: "Verified" },
  { type: "curator", label: "Kurator" },
];

export function AdminBadgeList({ users }: { users: AdminUser[] }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, setPending] = useState<string | null>(null);

  async function toggle(user: AdminUser, type: ManualBadge, grant: boolean) {
    const key = `${user.username}:${type}`;
    const badgeLabel =
      BADGES.find((badge) => badge.type === type)?.label ?? type;
    setPending(key);
    try {
      const response = await fetch(
        `/api/admin/users/${user.username}/badges${
          grant ? "" : `?type=${type}`
        }`,
        {
          method: grant ? "POST" : "DELETE",
          ...(grant
            ? {
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ type }),
              }
            : {}),
        },
      );
      const body = await response.json();
      if (!response.ok || !body.ok) {
        throw new Error(body?.error?.message ?? "Gagal mengubah badge.");
      }
      toast({
        message: grant
          ? `Badge ${badgeLabel} diberikan ke @${user.username}`
          : `Badge ${badgeLabel} dicabut dari @${user.username}`,
      });
      router.refresh();
    } catch (error) {
      toast({
        message:
          error instanceof Error ? error.message : "Gagal mengubah badge.",
      });
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="divide-y divide-border">
      {users.map((user) => (
        <article key={user.id} className="px-4 py-4">
          <div className="flex items-start gap-3">
            <Avatar name={user.name} src={user.avatarUrl} size={40} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1">
                <span className="truncate font-semibold">{user.name}</span>
                <UserBadges types={user.badges} size="sm" />
                <span className="text-[13px] text-text-muted">
                  @{user.username}
                </span>
                {user.role === "admin" && (
                  <span className="rounded-full bg-accent/15 px-2 py-[1px] text-[11px] font-semibold text-accent">
                    admin
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-[13px] text-text-muted">
                {formatCount(user.posts)} postingan · {formatCount(user.followers)}{" "}
                pengikut
              </p>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {BADGES.map((badge) => {
              const has = user.badges.includes(badge.type);
              const busy = pending === `${user.username}:${badge.type}`;
              return (
                <button
                  key={badge.type}
                  type="button"
                  disabled={busy}
                  onClick={() => toggle(user, badge.type, !has)}
                  className={`inline-flex min-h-11 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[13px] font-semibold transition-colors disabled:opacity-50 ${
                    has
                      ? "border-short/40 text-short hover:bg-short/10"
                      : "border-border text-text hover:bg-text/10"
                  }`}
                >
                  {badge.type === "verified" ? (
                    <BadgeCheck size={15} />
                  ) : (
                    <Star size={15} />
                  )}
                  {busy ? "Menyimpan…" : has ? `Cabut ${badge.label}` : `Beri ${badge.label}`}
                  {has && <X size={13} />}
                </button>
              );
            })}
          </div>
        </article>
      ))}
    </div>
  );
}
