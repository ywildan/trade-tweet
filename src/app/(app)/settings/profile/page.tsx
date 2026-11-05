import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { LogoutButton } from "@/components/auth/logout-button";
import { ProfileEditForm } from "@/components/profile/profile-edit-form";
import { getSessionUser } from "@/lib/session";
import { getUserById } from "@/lib/users";

export const metadata = { title: "Kelola profil" };

export default function SettingsProfilePage() {
  return (
    <Suspense fallback={<SettingsSkeleton />}>
      <SettingsView />
    </Suspense>
  );
}

async function SettingsView() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    redirect("/login?next=%2Fsettings%2Fprofile");
  }

  const user = await getUserById(sessionUser.id);
  if (!user) {
    redirect("/login");
  }

  return (
    <>
      <header className="sticky top-0 z-20 flex h-[53px] items-center gap-4 border-b border-border bg-bg px-3">
        <Link
          href={`/@${user.username}`}
          aria-label="Kembali ke profil"
          className="-ml-2 flex min-h-11 min-w-11 items-center justify-center rounded-lg p-2 text-[20px] transition-colors hover:bg-text/10"
        >
          ←
        </Link>
        <div>
          <h1 className="text-[20px] font-bold leading-6">Kelola profil</h1>
          <p className="text-[13px] leading-4 text-text-muted">
            @{user.username}
          </p>
        </div>
      </header>

      <div className="px-4 py-4">
        <ProfileEditForm
          user={{
            username: user.username,
            name: user.name,
            bio: user.bio,
            location: user.location,
            avatarUrl: user.avatarUrl,
            bannerUrl: user.bannerUrl,
          }}
        />

        <section className="mt-8 border-t border-border pt-5">
          <h2 className="text-[17px] font-bold">Sesi</h2>
          <p className="mt-1 text-[13px] text-text-muted">
            Keluar dari akun ini di perangkat yang sedang kamu pakai.
          </p>
          <div className="mt-3">
            <LogoutButton />
          </div>
        </section>
      </div>
    </>
  );
}

function SettingsSkeleton() {
  return (
    <div aria-hidden>
      <header className="flex h-[53px] items-center gap-4 border-b border-border px-3">
        <span className="text-[20px] text-text-muted">←</span>
        <div className="h-4 w-32 rounded bg-bg-input" />
      </header>
      <div className="space-y-4 p-4">
        <div className="aspect-[3/1] rounded-xl bg-bg-input" />
        <div className="h-20 rounded-xl bg-bg-input" />
        <div className="h-11 rounded-lg bg-bg-input" />
        <div className="h-24 rounded-lg bg-bg-input" />
      </div>
    </div>
  );
}
