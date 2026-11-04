"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, inputClass } from "@/components/ui/form";
import { firstFieldErrors, registerSchema } from "@/lib/validation";

export function RegisterForm() {
  const router = useRouter();

  const [form, setForm] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function update(field: keyof typeof form) {
    return (event: React.ChangeEvent<HTMLInputElement>) => {
      const value =
        field === "username"
          ? event.target.value.toLowerCase()
          : event.target.value;
      setForm((current) => ({ ...current, [field]: value }));
    };
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    const parsed = registerSchema.safeParse({
      name: form.name,
      username: form.username,
      email: form.email,
      password: form.password,
    });
    const fieldErrors: Record<string, string> = parsed.success
      ? {}
      : firstFieldErrors(parsed.error);

    if (form.password !== form.confirmPassword) {
      fieldErrors.confirmPassword = "Konfirmasi password tidak sama.";
    }
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }
    if (!parsed.success) return;

    setErrors({});
    setPending(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const json = await response.json();

      if (!response.ok) {
        setMessage(json?.error?.message ?? "Pendaftaran gagal. Coba lagi.");
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

      const username = json?.data?.user?.username as string | undefined;
      router.push(username ? `/@${username}` : "/");
      router.refresh();
    } catch {
      setMessage("Tidak bisa menghubungi server. Coba lagi.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {message && (
        <p
          role="alert"
          className="rounded-lg border border-short/40 bg-short/10 px-3 py-2 text-[13px] text-short"
        >
          {message}
        </p>
      )}

      <Field label="Nama tampilan" htmlFor="name" error={errors.name}>
        <input
          id="name"
          name="name"
          autoComplete="name"
          value={form.name}
          onChange={update("name")}
          placeholder="Nama kamu"
          className={inputClass}
          maxLength={50}
        />
      </Field>

      <Field
        label="Username"
        htmlFor="username"
        hint="3–15 karakter"
        error={errors.username}
      >
        <div className="flex items-center rounded-lg border border-border bg-bg-input focus-within:border-accent">
          <span className="pl-3 text-text-muted">@</span>
          <input
            id="username"
            name="username"
            autoComplete="username"
            value={form.username}
            onChange={update("username")}
            placeholder="namakamu"
            className="w-full bg-transparent px-1.5 py-2.5 text-[15px] text-text placeholder:text-text-muted outline-none"
            maxLength={15}
          />
        </div>
      </Field>

      <Field label="Email" htmlFor="register-email" error={errors.email}>
        <input
          id="register-email"
          name="email"
          type="email"
          autoComplete="email"
          value={form.email}
          onChange={update("email")}
          placeholder="kamu@contoh.com"
          className={inputClass}
        />
      </Field>

      <Field
        label="Password"
        htmlFor="register-password"
        hint="min. 8 karakter"
        error={errors.password}
      >
        <input
          id="register-password"
          name="password"
          type="password"
          autoComplete="new-password"
          value={form.password}
          onChange={update("password")}
          placeholder="Buat password"
          className={inputClass}
          maxLength={72}
        />
      </Field>

      <Field
        label="Ulangi password"
        htmlFor="confirm-password"
        error={errors.confirmPassword}
      >
        <input
          id="confirm-password"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          value={form.confirmPassword}
          onChange={update("confirmPassword")}
          placeholder="Ketik ulang password"
          className={inputClass}
          maxLength={72}
        />
      </Field>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Membuat akun…" : "Daftar"}
      </Button>
    </form>
  );
}
