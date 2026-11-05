import Link from "next/link";
import { Suspense } from "react";
import { AlertCircle } from "lucide-react";
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

/** Pesan ramah untuk kode error NextAuth (?error=) setelah OAuth gagal. */
function oauthErrorMessage(raw: string | string[] | undefined): string | null {
  const code = Array.isArray(raw) ? raw[0] : raw;
  if (!code) return null;
  switch (code) {
    case "AccessDenied":
      return "Login Google/X dibatalkan atau ditolak. Coba lagi.";
    case "OAuthAccountNotLinked":
      return "Email ini sudah terdaftar dengan cara masuk lain. Masuk dengan cara yang dulu dipakai.";
    case "OAuthCallback":
    case "OAuthCreateAccount":
    case "Callback":
      return "Login OAuth gagal diproses. Coba lagi.";
    case "Configuration":
      return "Login OAuth belum dikonfigurasi dengan benar. Coba lagi nanti.";
    default:
      return "Terjadi kesalahan saat login. Coba lagi.";
  }
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[]; error?: string | string[] }>;
}) {
  const params = await searchParams;
  const callbackUrl = safeNext(params.next);
  const oauthError = oauthErrorMessage(params.error);
  const { google, twitter } = enabledOAuthProviders;

  return (
    <>
      <h1 className="text-[30px] font-bold leading-9">Masuk ke Neuraly</h1>
      <p className="mt-1 text-[15px] text-text-muted">
        Lanjutkan membangun rekam jejak tradingmu.
      </p>

      {oauthError && (
        <p
          role="alert"
          className="mt-4 flex items-start gap-2 rounded-lg border border-short/40 bg-short/10 px-3 py-2 text-[13px] text-short"
        >
          <AlertCircle size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
          <span>{oauthError}</span>
        </p>
      )}

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
      <div className="h-[70px] rounded-lg bg-bg-input" />
      <div className="h-[70px] rounded-lg bg-bg-input" />
      <div className="h-11 rounded-lg bg-bg-input" />
    </div>
  );
}
