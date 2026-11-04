"use client";

import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { UserBadges } from "@/components/ui/badge";
import { FollowButton } from "@/components/user/follow-button";

/** UserCard — baris trader di right rail / hasil pencarian (DESIGN.md §4). */
export function UserCard({
  user,
  isFollowing,
  isGuest,
  detail,
}: {
  user: {
    username: string;
    name: string;
    avatarUrl: string | null;
    badges: string[];
  };
  isFollowing: boolean;
  isGuest: boolean;
  detail?: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl px-2 py-2 transition-colors hover:bg-text/5">
      <Link
        href={`/@${user.username}`}
        className="flex min-w-0 flex-1 items-center gap-3"
      >
        <Avatar name={user.name} src={user.avatarUrl} size={40} />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1">
            <span className="truncate text-[15px] font-semibold">
              {user.name}
            </span>
            <UserBadges types={user.badges} size="sm" />
          </span>
          <span className="block truncate text-[13px] text-text-muted">
            @{user.username}
            {detail ? ` · ${detail}` : ""}
          </span>
        </span>
      </Link>
      <FollowButton
        username={user.username}
        initialFollowing={isFollowing}
        isGuest={isGuest}
        size="sm"
      />
    </div>
  );
}
