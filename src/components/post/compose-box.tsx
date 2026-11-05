"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Target,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Field, inputClass } from "@/components/ui/form";
import { firstFieldErrors, postSchema } from "@/lib/validation";
import { countChars, POST_MAX_CHARS } from "@/lib/text";
import {
  ACTIVE_MARKETS,
  MARKETS,
  TIMEFRAMES,
  findSymbolEntry,
  isMetalSymbol,
  searchSymbols,
  type MarketName,
  type TimeframeName,
} from "@/lib/symbols";
import type { FeedPost, QuotePost } from "@/types/post";

type ComposeBoxProps = {
  user: { name: string; avatarUrl: string | null };
  replyTo?: { id: string; username: string; name: string } | null;
  quote?: QuotePost | null;
  autoFocus?: boolean;
  onPosted?: (post: FeedPost) => void;
  /** Dipanggil tiap kali status draf berubah (untuk konfirmasi buang draf). */
  onDraftChange?: (hasDraft: boolean) => void;
};

const MARKET_LABEL: Record<MarketName, string> = {
  CRYPTO: "Crypto",
  METAL: "Metal",
  FOREX: "Forex",
  STOCK: "Saham",
};

function toNumber(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

export function ComposeBox({
  user,
  replyTo = null,
  quote = null,
  autoFocus = false,
  onPosted,
  onDraftChange,
}: ComposeBoxProps) {
  const router = useRouter();
  const isReply = Boolean(replyTo);
  const isQuote = Boolean(quote);

  const [content, setContent] = useState("");
  const [isSignal, setIsSignal] = useState(false);
  const [market, setMarket] = useState<MarketName>("CRYPTO");
  const [symbol, setSymbol] = useState("");
  const [direction, setDirection] = useState<"LONG" | "SHORT">("LONG");
  const [entry, setEntry] = useState("");
  const [takeProfit, setTakeProfit] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [timeframe, setTimeframe] = useState<TimeframeName>("4H");
  const [symbolFocused, setSymbolFocused] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isSignalActive = isSignal && !isReply && !isQuote;

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const used = countChars(content);
  const remaining = POST_MAX_CHARS - used;

  useEffect(() => {
    const element = textareaRef.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, 320)}px`;
  }, [content]);

  const hasDraft =
    content.trim().length > 0 ||
    symbol.trim().length > 0 ||
    entry.trim().length > 0 ||
    takeProfit.trim().length > 0 ||
    stopLoss.trim().length > 0;
  useEffect(() => {
    onDraftChange?.(hasDraft);
  }, [hasDraft, onDraftChange]);

  const liveErrors = useMemo(() => {
    const result: Record<string, string> = {};
    const e = toNumber(entry);
    const tp = toNumber(takeProfit);
    const sl = toNumber(stopLoss);

    if (e != null && e <= 0) result.entry = "Entry harus lebih dari 0.";
    if (tp != null && tp <= 0) result.takeProfit = "TP harus lebih dari 0.";
    if (sl != null && sl <= 0) result.stopLoss = "SL harus lebih dari 0.";

    if (tp != null && sl != null && tp > 0 && sl > 0 && tp === sl) {
      result.takeProfit = "TP dan SL tidak boleh sama.";
    }

    if (e != null && e > 0) {
      if (tp != null && tp > 0) {
        if (direction === "LONG" && tp <= e) {
          result.takeProfit = "Untuk LONG, TP harus di atas Entry.";
        }
        if (direction === "SHORT" && tp >= e) {
          result.takeProfit = "Untuk SHORT, TP harus di bawah Entry.";
        }
      }
      if (sl != null && sl > 0) {
        if (direction === "LONG" && sl >= e) {
          result.stopLoss = "Untuk LONG, SL harus di bawah Entry.";
        }
        if (direction === "SHORT" && sl <= e) {
          result.stopLoss = "Untuk SHORT, SL harus di atas Entry.";
        }
      }
    }

    if (symbol) {
      const meta = findSymbolEntry(symbol);
      if (market === "METAL" && !isMetalSymbol(symbol)) {
        result.symbol = "Market METAL hanya untuk XAUUSD, XAGUSD, XPTUSD, XPDUSD.";
      } else if (market === "CRYPTO" && isMetalSymbol(symbol)) {
        result.symbol = "Simbol ini milik market METAL.";
      } else if (meta && meta.market !== market) {
        result.symbol = `Simbol ini milik market ${meta.market}.`;
      } else if (market === "CRYPTO" && !meta) {
        result.symbol = "Simbol tidak ada di katalog crypto Neuraly.";
      }
    }

    return result;
  }, [entry, takeProfit, stopLoss, direction, symbol, market]);

  const suggestions = useMemo(
    () => searchSymbols(symbol, market, 8),
    [symbol, market],
  );

  function clearError(field: string) {
    setErrors((previous) => {
      if (!previous[field]) return previous;
      const next = { ...previous };
      delete next[field];
      return next;
    });
    setGeneralError(null);
  }

  function changeSymbol(raw: string) {
    const upper = raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 20);
    setSymbol(upper);
    clearError("symbol");
    const meta = findSymbolEntry(upper);
    if (meta) setMarket(meta.market);
  }

  function changeMarket(next: MarketName) {
    if (!ACTIVE_MARKETS.includes(next)) return;
    setMarket(next);
    clearError("market");
    if (!symbol) return;
    const meta = findSymbolEntry(symbol);
    const symbolFits =
      next === "METAL" ? isMetalSymbol(symbol) : !isMetalSymbol(symbol);
    if (!symbolFits || (meta && meta.market !== next)) {
      setSymbol("");
      clearError("symbol");
    }
  }

  // Tombol Posting nonaktif sampai sinyal lengkap, bukan baru gagal setelah diklik.
  const signalComplete =
    !isSignalActive ||
    (symbol.trim().length > 0 &&
      toNumber(entry) != null &&
      toNumber(takeProfit) != null &&
      toNumber(stopLoss) != null &&
      Object.keys(liveErrors).length === 0);
  const canSubmit =
    !submitting &&
    remaining >= 0 &&
    (isSignalActive ? signalComplete : content.trim().length > 0);

  async function handleSubmit() {
    if (!canSubmit) return;
    setErrors({});
    setGeneralError(null);

    const payload = {
      content,
      ...(isReply
        ? { replyToId: replyTo?.id }
        : {
            isSignal: isSignalActive,
            ...(isSignalActive
              ? {
                  market,
                  symbol,
                  direction,
                  entry,
                  takeProfit,
                  stopLoss,
                  timeframe,
                }
              : {}),
            ...(quote ? { quoteOfId: quote.id } : {}),
          }),
    };

    const parsed = postSchema.safeParse(payload);
    if (!parsed.success) {
      setErrors(firstFieldErrors(parsed.error));
      setGeneralError("Periksa lagi isian yang ditandai.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const json = await response.json().catch(() => null);

      if (!response.ok) {
        if (response.status === 401) {
          const next = replyTo ? `/post/${replyTo.id}` : "/compose";
          router.push(`/login?next=${encodeURIComponent(next)}`);
          return;
        }

        const fieldErrors = json?.error?.details?.fieldErrors as
          | Record<string, string[] | undefined>
          | undefined;
        if (fieldErrors) {
          const flat: Record<string, string> = {};
          for (const [field, messages] of Object.entries(fieldErrors)) {
            if (messages?.[0]) flat[field] = messages[0];
          }
          setErrors(flat);
        }
        setGeneralError(json?.error?.message ?? "Gagal memposting. Coba lagi.");
        return;
      }

      const created = json.data.post as FeedPost;
      setContent("");
      setIsSignal(false);
      setSymbol("");
      setEntry("");
      setTakeProfit("");
      setStopLoss("");
      setDirection("LONG");
      setTimeframe("4H");
      setErrors({});

      if (onPosted) {
        onPosted(created);
      } else if (isReply) {
        router.refresh();
      } else if (quote) {
        router.push(`/post/${created.id}`);
        router.refresh();
      } else {
        router.push("/");
        router.refresh();
      }
    } catch {
      setGeneralError("Tidak bisa menghubungi server. Coba lagi.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-4">
      <div className="flex gap-3">
        <Avatar name={user.name} src={user.avatarUrl} size={40} />
        <div className="min-w-0 flex-1">
          {replyTo && (
            <p className="mb-1 text-[13px] text-text-muted">
              Membalas{" "}
              <span className="text-accent">@{replyTo.username}</span>
            </p>
          )}

          <textarea
            ref={textareaRef}
            value={content}
            onChange={(event) => {
              setContent(event.target.value);
              clearError("content");
            }}
            autoFocus={autoFocus}
            rows={1}
            placeholder={
              replyTo
                ? "Tulis balasan…"
                : isQuote
                  ? "Tambahkan komentar…"
                  : isSignalActive
                    ? "Ceritakan setup-nya (opsional)…"
                    : "Ada setup apa hari ini?"
            }
            aria-label={
              replyTo
                ? "Tulis balasan"
                : isQuote
                  ? "Tulis komentar kutipan"
                  : "Tulis postingan"
            }
            aria-invalid={Boolean(errors.content)}
            className="min-h-[44px] w-full resize-none bg-transparent py-2 text-[19px] leading-6 text-text placeholder:text-text-muted"
          />

          {(errors.content || liveErrors.content) && (
            <p className="text-[13px] text-short" role="alert">
              {errors.content ?? liveErrors.content}
            </p>
          )}

          {quote && <QuotePreview quote={quote} />}

          {isSignalActive && (
            <SignalFields
              market={market}
              symbol={symbol}
              suggestions={suggestions}
              symbolFocused={symbolFocused}
              direction={direction}
              entry={entry}
              takeProfit={takeProfit}
              stopLoss={stopLoss}
              timeframe={timeframe}
              errors={errors}
              liveErrors={liveErrors}
              onMarketChange={changeMarket}
              onSymbolChange={changeSymbol}
              onSymbolFocus={() => setSymbolFocused(true)}
              onSymbolBlur={() => setSymbolFocused(false)}
              onDirectionChange={(value) => {
                setDirection(value);
                // Pesan lama LONG/SHORT tidak relevan setelah arah berganti.
                setErrors((previous) => {
                  if (!previous.takeProfit && !previous.stopLoss) {
                    return previous;
                  }
                  const next = { ...previous };
                  delete next.takeProfit;
                  delete next.stopLoss;
                  return next;
                });
                setGeneralError(null);
              }}
              onEntryChange={(value) => {
                setEntry(value);
                clearError("entry");
              }}
              onTakeProfitChange={(value) => {
                setTakeProfit(value);
                clearError("takeProfit");
              }}
              onStopLossChange={(value) => {
                setStopLoss(value);
                clearError("stopLoss");
              }}
              onTimeframeChange={(value) => {
                setTimeframe(value);
                clearError("timeframe");
              }}
            />
          )}

          {generalError && (
            <p className="mt-2 text-[13px] text-short" role="alert">
              {generalError}
            </p>
          )}

          <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
            {!isReply && !isQuote && (
              <button
                type="button"
                onClick={() => {
                  setIsSignal((value) => !value);
                  setErrors({});
                  setGeneralError(null);
                }}
                aria-pressed={isSignal}
                className={`inline-flex min-h-11 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[13px] font-semibold transition-colors ${
                  isSignal
                    ? "border-accent bg-accent/15 text-accent"
                    : "border-border text-text-muted hover:bg-bg-input/60 hover:text-text"
                }`}
              >
                <Target size={14} />
                Ini sinyal
              </button>
            )}

            <span className="ml-auto" aria-hidden>
              <CharCounter used={used} remaining={remaining} />
            </span>

            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={!canSubmit}
              aria-label={replyTo ? "Kirim balasan" : "Posting"}
            >
              {submitting && <Loader2 size={16} className="animate-spin" />}
              {replyTo ? "Balas" : "Posting"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function QuotePreview({ quote }: { quote: QuotePost }) {
  return (
    <div className="mt-2 rounded-xl border border-border p-3">
      <div className="flex items-center gap-1.5 text-[13px]">
        <Avatar name={quote.author.name} src={quote.author.avatarUrl} size={20} />
        <span className="font-semibold">{quote.author.name}</span>
        <span className="truncate text-text-muted">
          @{quote.author.username}
        </span>
      </div>
      {quote.content && (
        <p className="mt-1 whitespace-pre-wrap break-words text-[14px] text-text-muted line-clamp-3">
          {quote.content}
        </p>
      )}
      {quote.isSignal && quote.symbol && (
        <p className="mt-1 text-[12px] font-semibold text-accent">
          {quote.symbol}
          {quote.direction ? ` · ${quote.direction}` : ""}
        </p>
      )}
    </div>
  );
}

function CharCounter({ used, remaining }: { used: number; remaining: number }) {
  if (used === 0) return null;
  const radius = 9;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(1, used / POST_MAX_CHARS);
  const over = remaining < 0;

  return (
    <span
      className={`inline-flex items-center gap-1 text-[12px] ${
        over ? "text-short" : "text-text-muted"
      }`}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" className="-rotate-90">
        <circle
          cx="12"
          cy="12"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          opacity="0.2"
        />
        <circle
          cx="12"
          cy="12"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
        />
      </svg>
      {remaining <= 20 && <span className="tabular">{remaining}</span>}
    </span>
  );
}

type SignalFieldsProps = {
  market: MarketName;
  symbol: string;
  suggestions: ReturnType<typeof searchSymbols>;
  symbolFocused: boolean;
  direction: "LONG" | "SHORT";
  entry: string;
  takeProfit: string;
  stopLoss: string;
  timeframe: TimeframeName;
  errors: Record<string, string>;
  liveErrors: Record<string, string>;
  onMarketChange: (market: MarketName) => void;
  onSymbolChange: (value: string) => void;
  onSymbolFocus: () => void;
  onSymbolBlur: () => void;
  onDirectionChange: (value: "LONG" | "SHORT") => void;
  onEntryChange: (value: string) => void;
  onTakeProfitChange: (value: string) => void;
  onStopLossChange: (value: string) => void;
  onTimeframeChange: (value: TimeframeName) => void;
};

function SignalFields({
  market,
  symbol,
  suggestions,
  symbolFocused,
  direction,
  entry,
  takeProfit,
  stopLoss,
  timeframe,
  errors,
  liveErrors,
  onMarketChange,
  onSymbolChange,
  onSymbolFocus,
  onSymbolBlur,
  onDirectionChange,
  onEntryChange,
  onTakeProfitChange,
  onStopLossChange,
  onTimeframeChange,
}: SignalFieldsProps) {
  const fieldError = (name: string) => errors[name] ?? liveErrors[name];

  return (
    <div className="mt-2 space-y-3 rounded-xl border border-border bg-bg-elev/40 p-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          label="Simbol"
          htmlFor="signal-symbol"
          hint="BTCUSDT, XAUUSD…"
          error={fieldError("symbol")}
        >
          <div className="relative">
            <input
              id="signal-symbol"
              value={symbol}
              onChange={(event) => onSymbolChange(event.target.value)}
              onFocus={onSymbolFocus}
              onBlur={onSymbolBlur}
              autoComplete="off"
              spellCheck={false}
              placeholder="BTCUSDT"
              aria-invalid={Boolean(fieldError("symbol"))}
              aria-expanded={symbolFocused && suggestions.length > 0}
              aria-controls="signal-symbol-suggestions"
              role="combobox"
              className={inputClass}
            />
            {symbolFocused && suggestions.length > 0 && (
              <div
                id="signal-symbol-suggestions"
                role="listbox"
                className="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-border bg-bg-elev py-1 shadow-xl"
              >
                {suggestions.map((item) => (
                  <button
                    key={item.symbol}
                    type="button"
                    role="option"
                    aria-selected={false}
                    onMouseDown={(event) => {
                      event.preventDefault();
                      onSymbolChange(item.symbol);
                      onSymbolBlur();
                    }}
                    className="flex min-h-11 w-full items-center gap-2 px-3 py-2 text-left text-[14px] hover:bg-text/5"
                  >
                    <span className="font-semibold">{item.symbol}</span>
                    <span className="truncate text-[12px] text-text-muted">
                      {item.name}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </Field>

        <div>
          <div className="mb-1.5 flex items-baseline justify-between gap-2">
            <span className="text-[13px] font-semibold text-text">Market</span>
            <span className="text-[12px] text-text-muted">
              Forex & saham segera
            </span>
          </div>
          <div id="signal-market" role="group" aria-label="Market" className="flex gap-1">
            {MARKETS.map((item) => {
              const active = item === market;
              const enabled = ACTIVE_MARKETS.includes(item);
              return (
                <button
                  key={item}
                  type="button"
                  disabled={!enabled}
                  title={enabled ? MARKET_LABEL[item] : "Segera hadir"}
                  aria-pressed={active}
                  onClick={() => onMarketChange(item)}
                  className={`flex min-h-11 flex-1 rounded-lg border px-2 py-2 text-[13px] font-semibold transition-colors ${
                    active
                      ? "border-accent bg-accent/15 text-accent"
                      : enabled
                        ? "border-border text-text-muted hover:bg-bg-input/60 hover:text-text"
                        : "cursor-not-allowed border-border/60 text-text-muted/40"
                  }`}
                >
                  {MARKET_LABEL[item]}
                </button>
              );
            })}
          </div>
          {fieldError("market") && (
            <p className="mt-1 text-[13px] text-short" role="alert">
              {fieldError("market")}
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <div className="mb-1.5 text-[13px] font-semibold text-text">Arah</div>
          <div id="signal-direction" role="group" aria-label="Arah" className="flex gap-1">
            {(["LONG", "SHORT"] as const).map((item) => {
              const active = direction === item;
              const long = item === "LONG";
              return (
                <button
                  key={item}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onDirectionChange(item)}
                  className={`flex min-h-11 flex-1 items-center justify-center gap-1 rounded-lg border px-2 py-2 text-[13px] font-semibold transition-colors ${
                    active
                      ? long
                        ? "border-long bg-long/15 text-text"
                        : "border-short bg-short/15 text-text"
                      : "border-border text-text-muted hover:bg-bg-input/60 hover:text-text"
                  }`}
                >
                  {long ? (
                    <TrendingUp
                      size={15}
                      aria-hidden
                      className={active ? "text-long" : undefined}
                    />
                  ) : (
                    <TrendingDown
                      size={15}
                      aria-hidden
                      className={active ? "text-short" : undefined}
                    />
                  )}
                  {long ? "LONG" : "SHORT"}
                </button>
              );
            })}
          </div>
        </div>

        <Field label="Timeframe" htmlFor="signal-timeframe">
          <select
            id="signal-timeframe"
            value={timeframe}
            onChange={(event) =>
              onTimeframeChange(event.target.value as TimeframeName)
            }
            className={inputClass}
          >
            {TIMEFRAMES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Field
          label="Entry"
          htmlFor="signal-entry"
          error={fieldError("entry")}
        >
          <input
            id="signal-entry"
            type="number"
            inputMode="decimal"
            step="any"
            min="0"
            value={entry}
            onChange={(event) => onEntryChange(event.target.value)}
            placeholder="2312.50"
            aria-invalid={Boolean(fieldError("entry"))}
            className={`${inputClass} tabular`}
          />
        </Field>
        <Field
          label="Take Profit"
          htmlFor="signal-tp"
          error={fieldError("takeProfit")}
        >
          <input
            id="signal-tp"
            type="number"
            inputMode="decimal"
            step="any"
            min="0"
            value={takeProfit}
            onChange={(event) => onTakeProfitChange(event.target.value)}
            placeholder="2340.00"
            aria-invalid={Boolean(fieldError("takeProfit"))}
            className={`${inputClass} tabular`}
          />
        </Field>
        <Field
          label="Stop Loss"
          htmlFor="signal-sl"
          error={fieldError("stopLoss")}
        >
          <input
            id="signal-sl"
            type="number"
            inputMode="decimal"
            step="any"
            min="0"
            value={stopLoss}
            onChange={(event) => onStopLossChange(event.target.value)}
            placeholder="2290.00"
            aria-invalid={Boolean(fieldError("stopLoss"))}
            className={`${inputClass} tabular`}
          />
        </Field>
      </div>
    </div>
  );
}
