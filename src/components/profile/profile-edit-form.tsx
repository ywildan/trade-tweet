"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Field, inputClass, textareaClass } from "@/components/ui/form";
import { firstFieldErrors, profileUpdateSchema } from "@/lib/validation";

type EditableUser = {
  username: string;
  name: string;
  bio: string | null;
  location: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
};

export function ProfileEditForm({ user }: { user: EditableUser }) {
  const router = useRouter();

  const [form, setForm] = useState({
    name: user.name,
    bio: user.bio ?? "",
    location: user.location ?? "",
    avatarUrl: user.avatarUrl ?? "",
    bannerUrl: user.bannerUrl ?? "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

  function update(field: keyof typeof form) {
    return (
      event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => {
      const value = event.target.value;
      setForm((current) => ({ ...current, [field]: value }));
      setSaved(false);
    };
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setSaved(false);

    const parsed = profileUpdateSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(firstFieldErrors(parsed.error));
      return;
    }
    setErrors({});
    setPending(true);

    try {
      const response = await fetch(
        `/api/users/${encodeURIComponent(user.username)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parsed.data),
        },
      );

      if (response.status === 401) {
        router.push("/login?next=%2Fsettings%2Fprofile");
        return;
      }

      const json = await response.json();
      if (!response.ok) {
        setMessage(json?.error?.message ?? "Gagal menyimpan profil.");
        const details = json?.error?.details?.fieldErrors;
        if (details) {
          const serverErrors: Record<string, string> = {};
          for (const [field, messages] of Object.entries(details)) {
            const first = (messages as string[] | undefined)?.[0];
            if (first) serverErrors[field] = first;
          }
          setErrors(serverErrors);
        }
        setPending(false);
        return;
      }

      setSaved(true);
      setPending(false);
      router.refresh();
    } catch {
      setMessage("Tidak bisa menghubungi server. Coba lagi.");
      setPending(false);
    }
  }

  const avatarPreview = /^(https?:\/\/|\/)/i.test(form.avatarUrl)
    ? form.avatarUrl
    : null;
  const bannerPreview = /^(https?:\/\/|\/)/i.test(form.bannerUrl)
    ? form.bannerUrl
    : null;

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      {saved && (
        <p
          role="status"
          className="rounded-lg border border-long/40 bg-long/10 px-3 py-2 text-[13px] text-long"
        >
          Perubahan tersimpan.
        </p>
      )}
      {message && (
        <p
          role="alert"
          className="rounded-lg border border-short/40 bg-short/10 px-3 py-2 text-[13px] text-short"
        >
          {message}
        </p>
      )}

      <section className="overflow-hidden rounded-2xl border border-border bg-bg-elev/50">
        <div className="relative aspect-[3/1] w-full bg-bg-input">
          {bannerPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={bannerPreview}
              alt="Pratinjau banner"
              className="h-full w-full object-cover"
            />
          ) : (
            <div
              className="h-full w-full"
              style={{
                background:
                  "linear-gradient(135deg, rgba(29,155,240,0.35), rgba(0,186,124,0.22) 55%, rgba(0,0,0,0))",
              }}
            />
          )}
          <div className="absolute -bottom-10 left-4">
            <Avatar
              name={form.name || user.username}
              src={avatarPreview}
              size={80}
              className="ring-4 ring-bg-elev"
            />
          </div>
        </div>
        <div className="h-12" />
      </section>

      <Field
        label="Nama tampilan"
        htmlFor="profile-name"
        error={errors.name}
        hint={`${form.name.length}/50`}
      >
        <input
          id="profile-name"
          value={form.name}
          onChange={update("name")}
          className={inputClass}
          maxLength={50}
          autoComplete="name"
        />
      </Field>

      <Field
        label="Bio"
        htmlFor="profile-bio"
        error={errors.bio}
        hint={`${form.bio.length}/160`}
      >
        <textarea
          id="profile-bio"
          value={form.bio}
          onChange={update("bio")}
          className={textareaClass}
          maxLength={160}
          placeholder="Ceritakan gaya tradingmu…"
        />
      </Field>

      <Field label="Lokasi" htmlFor="profile-location" error={errors.location}>
        <input
          id="profile-location"
          value={form.location}
          onChange={update("location")}
          className={inputClass}
          maxLength={50}
          placeholder="Jakarta, Indonesia"
          autoComplete="address-level2"
        />
      </Field>

      <Field
        label="URL avatar"
        htmlFor="profile-avatar"
        error={errors.avatarUrl}
        hint="opsional"
      >
        <input
          id="profile-avatar"
          type="text"
          inputMode="url"
          value={form.avatarUrl}
          onChange={update("avatarUrl")}
          className={inputClass}
          placeholder="https://…/avatar.jpg"
        />
      </Field>

      <Field
        label="URL banner"
        htmlFor="profile-banner"
        error={errors.bannerUrl}
        hint="opsional, rasio 3:1"
      >
        <input
          id="profile-banner"
          type="text"
          inputMode="url"
          value={form.bannerUrl}
          onChange={update("bannerUrl")}
          className={inputClass}
          placeholder="https://…/banner.jpg"
        />
      </Field>

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Menyimpan…" : "Simpan"}
        </Button>
        <Link href={`/@${user.username}`}>
          <Button type="button" variant="ghost">
            Batal
          </Button>
        </Link>
      </div>
    </form>
  );
}
