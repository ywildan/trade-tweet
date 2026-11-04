import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
];

/**
 * Pemeriksaan optimistis (cookie sesi) agar guest mendapat redirect HTTP
 * sungguhan. Validasi sesi tetap dilakukan di halaman/route.
 */
export function proxy(request: NextRequest) {
  const hasSession = SESSION_COOKIES.some(
    (name) => request.cookies.get(name)?.value,
  );

  if (!hasSession) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/settings/:path*",
    "/compose",
    "/bookmarks",
    "/notifications",
    "/dashboard",
    "/admin/:path*",
  ],
};
