import { cache } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

/** Satu pembacaan sesi per request, dipakai bersama nav + halaman. */
export const getSession = cache(async () => {
  // Hentikan prerender sebelum NextAuth membaca cookie/header.
  await connection();
  return auth();
});

export async function getSessionUser() {
  return (await getSession())?.user ?? null;
}

/** Untuk Server Component yang wajib login. */
export async function requireSessionUser() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}
