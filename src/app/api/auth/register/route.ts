import { signIn } from "@/auth";
import { apiError, apiOk, handleApiError, isUniqueConstraintError } from "@/lib/api";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/db";
import { enforceRateLimit, requestKey } from "@/lib/rate-limit";
import { publicUserSelect, serializePublicUser } from "@/lib/users";
import { registerSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const limit = await enforceRateLimit({
      key: `register:${requestKey(request)}`,
      limit: 10,
      windowMs: 60_000,
    });
    if (!limit.ok) {
      const response = apiError(
        "RATE_LIMITED",
        `Terlalu banyak percobaan daftar. Coba lagi dalam ${limit.retryAfter} detik.`,
        429,
      );
      response.headers.set("Retry-After", String(limit.retryAfter));
      return response;
    }

    const body = await request.json().catch(() => null);
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("INVALID", "Data pendaftaran tidak valid.", 400, {
        fieldErrors: parsed.error.flatten().fieldErrors,
      });
    }

    const { username, name, email, password } = parsed.data;

    const existing = await prisma.user.findFirst({
      where: { OR: [{ username }, { email }] },
      select: { username: true, email: true },
    });
    if (existing) {
      return apiError(
        "CONFLICT",
        existing.username === username
          ? "Username sudah dipakai."
          : "Email sudah terdaftar.",
        409,
      );
    }

    const user = await prisma.user.create({
      data: {
        username,
        name,
        email,
        passwordHash: await hashPassword(password),
        signalStats: { create: {} },
      },
      select: { ...publicUserSelect, email: true },
    });

    try {
      // Langsung masuk setelah daftar (cookie sesi di-set oleh NextAuth).
      await signIn("credentials", { email, password, redirect: false });
    } catch (error) {
      console.error("[register] auto sign-in gagal", error);
    }

    return apiOk({ user: serializePublicUser(user, user.email) }, { status: 201 });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return apiError("CONFLICT", "Username atau email sudah dipakai.", 409);
    }
    return handleApiError(error);
  }
}
