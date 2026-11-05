import Link from "next/link";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";
import { AuthDivider, OAuthButtons } from "@/components/auth/oauth-buttons";
import { enabledOAuthProviders } from "@/lib/oauth";

export const metadata = { title: "Masuk" };

// Halaman membaca ?next= untuk callback OAuth, jadi tidak bisa prerender.
export const instant = false;

function safeNext(raw: string | string[] | undefined): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  // Hanya path internal relatif, bukan //evil.com (open redirect).
  return value && value.startsWith("/") && !value.startsWith("//")
    ? value
    : "/";
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const params = await searchParams;
  const callbackUrl = safeNext(params.next);
  const { google, twitter } = enabledOAuthProviders;

  return (
    <>
      <h1 className="text-[30px] font-bold leading-9">Masuk ke SPMTrade</h1>
      <p className="mt-1 text-[15px] text-text-muted">
        Lanjutkan membangun rekam jejak tradingmu.
      </p>

      <div className="mt-6 space-y-4">
        {(google || twitter) && (
          <>
            <OAuthButtons
              google={google}
              twitter={twitter}
              callbackUrl={callbackUrl}
            />
            <AuthDivider />
          </>
        )}

        <Suspense fallback={<FormSkeleton />}>
          <LoginForm />
        </Suspense>
      </div>

      <p className="mt-6 text-[15px] text-text-muted">
        Belum punya akun?{" "}
        <Link href="/register" className="font-semibold text-accent hover:underline">
          Daftar
        </Link>
      </p>
    </>
  );
}

function FormSkeleton() {
  return (
    <div className="space-y-4" aria-hidden>
      <div className="h-[70px] animate-pulse rounded-lg bg-bg-input" />
      <div className="h-[70px] animate-pulse rounded-lg bg-bg-input" />
      <div className="h-10 animate-pulse rounded-2xl bg-bg-input" />
    </div>
  );
}
