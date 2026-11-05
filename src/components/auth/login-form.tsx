"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, inputClass } from "@/components/ui/form";
import { firstFieldErrors, loginSchema } from "@/lib/validation";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setErrors(firstFieldErrors(parsed.error));
      return;
    }
    setErrors({});
    setPending(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const json = await response.json();

      if (!response.ok) {
        setMessage(json?.error?.message ?? "Gagal masuk. Coba lagi.");
        const details = json?.error?.details?.fieldErrors;
        if (details) {
          const fieldErrors: Record<string, string> = {};
          for (const [field, messages] of Object.entries(details)) {
            const first = (messages as string[] | undefined)?.[0];
            if (first) fieldErrors[field] = first;
          }
          setErrors(fieldErrors);
        }
        setPending(false);
        return;
      }

      const destination =
        next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
      router.push(destination);
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
          className="flex items-start gap-2 rounded-lg border border-short/40 bg-short/10 px-3 py-2 text-[13px] text-short"
        >
          <AlertCircle size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
          <span>{message}</span>
        </p>
      )}

      <Field label="Email" htmlFor="email" error={errors.email}>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="kamu@contoh.com"
          className={inputClass}
        />
      </Field>

      <Field label="Password" htmlFor="password" error={errors.password}>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Password kamu"
          className={inputClass}
        />
      </Field>

      <Button type="submit" className="min-h-11 w-full" disabled={pending}>
        {pending ? "Sedang masuk…" : "Masuk ke Neuraly"}
      </Button>
    </form>
  );
}
