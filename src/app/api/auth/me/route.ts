import { connection } from "next/server";
import { auth } from "@/auth";
import { apiError, apiOk, handleApiError } from "@/lib/api";
import { getUserById } from "@/lib/users";

export async function GET() {
  // Di luar try/catch agar sinyal prerender Next tidak tertelan handler error.
  await connection();

  try {
    const session = await auth();
    if (!session?.user) {
      return apiError("UNAUTH", "Belum masuk.", 401);
    }

    const user = await getUserById(session.user.id);
    if (!user) {
      return apiError("NOT_FOUND", "Akun tidak ditemukan.", 404);
    }

    return apiOk({ user });
  } catch (error) {
    return handleApiError(error);
  }
}
