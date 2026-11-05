import Link from "next/link";
import { RegisterForm } from "@/components/auth/register-form";
import { AuthDivider, OAuthButtons } from "@/components/auth/oauth-buttons";
import { enabledOAuthProviders } from "@/lib/oauth";

export const metadata = { title: "Daftar" };

// Halaman membaca ?next= untuk callback OAuth, jadi tidak bisa prerender.
export const instant = false;

function safeNext(raw: string | string[] | undefined): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value && value.startsWith("/") && !value.startsWith("//")
    ? value
    : "/";
}

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const params = await searchParams;
  const callbackUrl = safeNext(params.next);
  const { google, twitter } = enabledOAuthProviders;

  return (
    <>
      <h1 className="text-[30px] font-bold leading-9">Buat akun</h1>
      <p className="mt-1 text-[15px] text-text-muted">
        Mulai catat setup dan bangun reputasi yang terukur.
      </p>

      {(google || twitter) && (
        <div className="mt-6 space-y-4">
          <OAuthButtons
            google={google}
            twitter={twitter}
            callbackUrl={callbackUrl}
          />
          <AuthDivider />
        </div>
      )}

      <div className="mt-4">
        <RegisterForm />
      </div>

      <p className="mt-6 text-[15px] text-text-muted">
        Sudah punya akun?{" "}
        <Link href="/login" className="font-semibold text-accent hover:underline">
          Masuk
        </Link>
      </p>
    </>
  );
}
