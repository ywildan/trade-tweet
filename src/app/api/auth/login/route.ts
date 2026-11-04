import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { apiError, apiOk, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { enforceRateLimit, requestKey } from "@/lib/rate-limit";
import { publicUserSelect, serializePublicUser } from "@/lib/users";
import { loginSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const limit = await enforceRateLimit({
      key: `login:${requestKey(request)}`,
      limit: 10,
      windowMs: 60_000,
    });
    if (!limit.ok) {
      const response = apiError(
        "RATE_LIMITED",
        `Terlalu banyak percobaan masuk. Coba lagi dalam ${limit.retryAfter} detik.`,
        429,
      );
      response.headers.set("Retry-After", String(limit.retryAfter));
      return response;
    }

    const body = await request.json().catch(() => null);
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("INVALID", "Email atau password tidak valid.", 400, {
        fieldErrors: parsed.error.flatten().fieldErrors,
      });
    }

    const { email, password } = parsed.data;

    try {
      await signIn("credentials", { email, password, redirect: false });
    } catch (error) {
      if (error instanceof AuthError) {
        return apiError("UNAUTH", "Email atau password salah.", 401);
      }
      throw error;
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { ...publicUserSelect, email: true },
    });
    if (!user) {
      return apiError("NOT_FOUND", "Akun tidak ditemukan.", 404);
    }

    return apiOk({ user: serializePublicUser(user, user.email) });
  } catch (error) {
    return handleApiError(error);
  }
}
