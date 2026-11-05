import { z } from "zod";
import { countChars, POST_MAX_CHARS } from "@/lib/text";
import {
  MARKETS,
  TIMEFRAMES,
  findSymbolEntry,
  isMetalSymbol,
  type MarketName,
} from "@/lib/symbols";

/** Handle @username di DB: lowercase, 3–15 karakter (spesifikasi.md §3). */
export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(
    /^[a-z0-9_]{3,15}$/,
    "Username 3–15 karakter, hanya huruf kecil, angka, dan underscore.",
  );

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Email tidak valid."));

export const registerSchema = z.object({
  username: usernameSchema,
  name: z
    .string()
    .trim()
    .min(1, "Nama wajib diisi.")
    .max(50, "Nama maksimal 50 karakter."),
  email: emailSchema,
  password: z
    .string()
    .min(8, "Password minimal 8 karakter.")
    .max(72, "Password maksimal 72 karakter."),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password wajib diisi.").max(72),
});

const optionalMediaUrl = z
  .string()
  .trim()
  .max(500, "URL maksimal 500 karakter.")
  .refine(
    (value) => value === "" || /^(https?:\/\/|\/)\S*$/i.test(value),
    "URL harus diawali http://, https://, atau /.",
  )
  .transform((value) => (value === "" ? null : value));

const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} maksimal ${max} karakter.`)
    .transform((value) => (value === "" ? null : value));

export const profileUpdateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Nama wajib diisi.")
    .max(50, "Nama maksimal 50 karakter."),
  bio: optionalText(160, "Bio"),
  location: optionalText(50, "Lokasi"),
  avatarUrl: optionalMediaUrl,
  bannerUrl: optionalMediaUrl,
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;

/* ------------------------------------------------------------------ */
/* Post & sinyal (spesifikasi.md §4 Phase 2)                          */
/* ------------------------------------------------------------------ */

const blankToUndefined = (value: unknown) =>
  value === "" || value === null ? undefined : value;

const optionalSymbol = z.preprocess(
  blankToUndefined,
  z
    .string()
    .trim()
    .toUpperCase()
    .regex(
      /^[A-Z0-9]{2,20}$/,
      "Simbol hanya huruf dan angka, 2–20 karakter (mis. BTCUSDT, XAUUSD).",
    )
    .optional(),
);

const optionalMarket = z.preprocess(
  blankToUndefined,
  z.enum(MARKETS).optional(),
);

const optionalNumber = z.preprocess(
  blankToUndefined,
  z.coerce
    .number()
    .finite("Angka tidak valid.")
    .positive("Angka harus lebih dari 0.")
    .optional(),
);

export const postSchema = z
  .object({
    content: z
      .string()
      .trim()
      .refine(
        (value) => countChars(value) <= POST_MAX_CHARS,
        `Maksimal ${POST_MAX_CHARS} karakter (emoji dihitung 2).`,
      ),
    replyToId: z.preprocess(blankToUndefined, z.string().trim().optional()),
    quoteOfId: z.preprocess(blankToUndefined, z.string().trim().optional()),
    isSignal: z.boolean().default(false),
    market: optionalMarket,
    symbol: optionalSymbol,
    direction: z.preprocess(
      blankToUndefined,
      z.enum(["LONG", "SHORT"]).optional(),
    ),
    entry: optionalNumber,
    takeProfit: optionalNumber,
    stopLoss: optionalNumber,
    timeframe: z.preprocess(
      blankToUndefined,
      z.enum(TIMEFRAMES).optional(),
    ),
  })
  .superRefine((data, ctx) => {
    if (data.quoteOfId) {
      if (data.replyToId) {
        ctx.addIssue({
          code: "custom",
          path: ["quoteOfId"],
          message: "Tidak bisa membalas dan mengutip sekaligus.",
        });
      }
      if (data.isSignal) {
        ctx.addIssue({
          code: "custom",
          path: ["isSignal"],
          message: "Kutipan bukan sinyal. Matikan toggle sinyal.",
        });
      }
    }

    if (!data.isSignal) {
      if (data.content.length === 0) {
        ctx.addIssue({
          code: "custom",
          path: ["content"],
          message: "Tulis sesuatu dulu sebelum posting.",
        });
      }
      return;
    }

    if (data.replyToId) {
      ctx.addIssue({
        code: "custom",
        path: ["isSignal"],
        message: "Balasan tidak bisa berupa sinyal.",
      });
    }

    const required: Array<[keyof typeof data, string]> = [
      ["market", "Pilih market sinyal."],
      ["symbol", "Simbol wajib diisi."],
      ["direction", "Pilih arah LONG atau SHORT."],
      ["entry", "Entry wajib diisi."],
      ["takeProfit", "TP wajib diisi."],
      ["stopLoss", "SL wajib diisi."],
      ["timeframe", "Pilih timeframe."],
    ];
    for (const [field, message] of required) {
      if (data[field] == null) {
        ctx.addIssue({ code: "custom", path: [field], message });
      }
    }

    if (data.market === "FOREX" || data.market === "STOCK") {
      ctx.addIssue({
        code: "custom",
        path: ["market"],
        message: "Market ini segera hadir. Pakai CRYPTO atau METAL dulu.",
      });
    }

    if (data.market && data.symbol) {
      const symbolIsMetal = isMetalSymbol(data.symbol);
      if (data.market === "METAL" && !symbolIsMetal) {
        ctx.addIssue({
          code: "custom",
          path: ["symbol"],
          message: "Market METAL hanya untuk XAUUSD, XAGUSD, XPTUSD, XPDUSD.",
        });
      }
      if (data.market === "CRYPTO" && symbolIsMetal) {
        ctx.addIssue({
          code: "custom",
          path: ["symbol"],
          message: "Simbol ini milik market METAL.",
        });
      }
      // Simbol di luar katalog tidak bisa di-resolve otomatis (feed menolak)
      // dan akan terjebak OPEN selamanya: tolak sejak compose.
      if (data.market === "CRYPTO") {
        const entry = findSymbolEntry(data.symbol);
        if (!entry || entry.market !== "CRYPTO") {
          ctx.addIssue({
            code: "custom",
            path: ["symbol"],
            message: "Simbol tidak ada di katalog crypto Neuraly.",
          });
        }
      }
    }

    const { entry, takeProfit, stopLoss, direction } = data;
    if (entry != null && takeProfit != null && stopLoss != null) {
      if (takeProfit === stopLoss) {
        ctx.addIssue({
          code: "custom",
          path: ["takeProfit"],
          message: "TP dan SL tidak boleh sama.",
        });
      }
      if (takeProfit === entry) {
        ctx.addIssue({
          code: "custom",
          path: ["takeProfit"],
          message: "TP tidak boleh sama dengan Entry.",
        });
      }
      if (stopLoss === entry) {
        ctx.addIssue({
          code: "custom",
          path: ["stopLoss"],
          message: "SL tidak boleh sama dengan Entry.",
        });
      }

      if (direction === "LONG") {
        if (takeProfit <= entry) {
          ctx.addIssue({
            code: "custom",
            path: ["takeProfit"],
            message: "Untuk LONG, TP harus di atas Entry.",
          });
        }
        if (stopLoss >= entry) {
          ctx.addIssue({
            code: "custom",
            path: ["stopLoss"],
            message: "Untuk LONG, SL harus di bawah Entry.",
          });
        }
      } else if (direction === "SHORT") {
        if (takeProfit >= entry) {
          ctx.addIssue({
            code: "custom",
            path: ["takeProfit"],
            message: "Untuk SHORT, TP harus di bawah Entry.",
          });
        }
        if (stopLoss <= entry) {
          ctx.addIssue({
            code: "custom",
            path: ["stopLoss"],
            message: "Untuk SHORT, SL harus di atas Entry.",
          });
        }
      }
    }
  });

export type PostInput = z.infer<typeof postSchema>;

/** Override manual pembuat sinyal (Phase 4). */
export const resolveSignalSchema = z.object({
  outcome: z.enum(["TP_HIT", "SL_HIT", "CANCELLED"]),
  note: z
    .string()
    .trim()
    .max(280, "Catatan maksimal 280 karakter.")
    .optional()
    .transform((value) => (value ? value : null)),
});

export type ResolveSignalInput = z.infer<typeof resolveSignalSchema>;

/** Pasar yang boleh dipakai untuk membuat sinyal (Phase 2). */
export const SIGNAL_MARKETS: MarketName[] = ["CRYPTO", "METAL"];

/** Ambil fieldErrors dari ZodError untuk response 400 INVALID. */
export function zodDetails(error: z.ZodError) {
  return { fieldErrors: z.flattenError(error).fieldErrors };
}

/** fieldErrors -> satu pesan per field untuk form inline. */
export function firstFieldErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  const fieldErrors = z.flattenError(error).fieldErrors as Record<
    string,
    string[] | undefined
  >;
  for (const [field, messages] of Object.entries(fieldErrors)) {
    if (messages?.[0]) result[field] = messages[0];
  }
  return result;
}
