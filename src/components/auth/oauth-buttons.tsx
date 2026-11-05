"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function OAuthButtons({
  google,
  twitter,
  callbackUrl = "/",
}: {
  google: boolean;
  twitter: boolean;
  /** Tujuan setelah login (dari ?next=), divalidasi di halaman login. */
  callbackUrl?: string;
}) {
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!google && !twitter) return null;

  async function start(provider: "google" | "twitter") {
    setPending(provider);
    setError(null);
    try {
      await signIn(provider, { callbackUrl });
    } catch {
      setError("Gagal memulai login OAuth. Coba lagi.");
      setPending(null);
    }
  }

  return (
    <div className="space-y-2">
      {error && (
        <p
          role="alert"
          className="flex items-start gap-2 text-[13px] text-short"
        >
          <AlertCircle size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </p>
      )}
      {google && (
        <Button
          type="button"
          variant="secondary"
          className="min-h-11 w-full"
          disabled={pending !== null}
          onClick={() => start("google")}
        >
          <span
            aria-hidden="true"
            className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[13px] font-bold text-[#4285f4]"
          >
            G
          </span>
          {pending === "google" ? "Menghubungkan…" : "Lanjutkan dengan Google"}
        </Button>
      )}
      {twitter && (
        <Button
          type="button"
          variant="secondary"
          className="min-h-11 w-full"
          disabled={pending !== null}
          onClick={() => start("twitter")}
        >
          <span
            aria-hidden="true"
            className="flex h-5 w-5 items-center justify-center rounded-full bg-text text-[13px] font-bold text-bg"
          >
            X
          </span>
          {pending === "twitter" ? "Menghubungkan…" : "Lanjutkan dengan X"}
        </Button>
      )}
    </div>
  );
}

export function AuthDivider() {
  return (
    <div className="flex items-center gap-3 text-[13px] text-text-muted">
      <span className="h-px flex-1 bg-border" aria-hidden="true" />
      atau
      <span className="h-px flex-1 bg-border" aria-hidden="true" />
    </div>
  );
}
