import Link from "next/link";
import { RegisterForm } from "@/components/auth/register-form";
import { AuthDivider, OAuthButtons } from "@/components/auth/oauth-buttons";
import { enabledOAuthProviders } from "@/lib/oauth";

export const metadata = { title: "Daftar" };

export default function RegisterPage() {
  const { google, twitter } = enabledOAuthProviders;

  return (
    <>
      <h1 className="text-[30px] font-bold leading-9">Buat akun</h1>
      <p className="mt-1 text-[15px] text-text-muted">
        Mulai catat setup dan bangun reputasi yang terukur.
      </p>

      {(google || twitter) && (
        <div className="mt-6 space-y-4">
          <OAuthButtons google={google} twitter={twitter} />
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
