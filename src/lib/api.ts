import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { zodDetails } from "@/lib/validation";

export type ApiErrorCode =
  | "INVALID"
  | "UNAUTH"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "INTERNAL";

export function apiOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init);
}

export function apiError(
  code: ApiErrorCode,
  message: string,
  status: number,
  details?: unknown,
) {
  return NextResponse.json(
    { ok: false, error: { code, message, ...(details ? { details } : {}) } },
    { status },
  );
}

/** Error Prisma unique constraint (duplikat username/email). */
export function isUniqueConstraintError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  );
}

export function handleApiError(error: unknown) {
  if (error instanceof ZodError) {
    return apiError("INVALID", "Data tidak valid.", 400, zodDetails(error));
  }
  console.error("[api]", error);
  return apiError("INTERNAL", "Terjadi kesalahan pada server.", 500);
}
