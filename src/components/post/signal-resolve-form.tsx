"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ban, Check, Loader2, X, type LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

type Outcome = "TP_HIT" | "SL_HIT" | "CANCELLED";

const OPTIONS: Array<{
  id: Outcome;
  label: string;
  icon: LucideIcon;
  iconClass: string;
  className: string;
  toast: string;
}> = [
  {
    id: "TP_HIT",
    label: "Tandai TP",
    icon: Check,
    iconClass: "text-long",
    className: "border-long bg-long/15 text-text",
    toast: "Sinyal ditandai TP.",
  },
  {
    id: "SL_HIT",
    label: "Tandai SL",
    icon: X,
    iconClass: "text-short",
    className: "border-short bg-short/15 text-text",
    toast: "Sinyal ditandai SL.",
  },
  {
    id: "CANCELLED",
    label: "Batalkan sinyal",
    icon: Ban,
    iconClass: "text-text-muted",
    className: "border-border bg-bg-input text-text",
    toast: "Sinyal dibatalkan.",
  },
];

/** Penutupan manual oleh pembuat sinyal bila feed tidak akurat. */
export function SignalResolveForm({ postId }: { postId: string }) {
  const router = useRouter();
  const toast = useToast();
  const [outcome, setOutcome] = useState<Outcome>("TP_HIT");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);

    try {
      const response = await fetch(`/api/posts/${postId}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outcome, note }),
      });
      const json = await response.json().catch(() => null);

      if (!response.ok) {
        if (response.status === 401) {
          router.push(
            `/login?next=${encodeURIComponent(`/post/${postId}`)}`,
          );
          return;
        }
        setError(json?.error?.message ?? "Gagal menutup sinyal.");
        return;
      }

      const option = OPTIONS.find((item) => item.id === outcome);
      toast({ message: option?.toast ?? "Sinyal ditutup." });
      router.refresh();
    } catch {
      setError("Tidak bisa menghubungi server. Coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Hasil sinyal">
        {OPTIONS.map((option) => {
          const active = outcome === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => setOutcome(option.id)}
              aria-pressed={active}
              className={`inline-flex min-h-11 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[13px] font-semibold transition-colors ${
                active
                  ? option.className
                  : "border-border text-text-muted hover:bg-bg-input/60 hover:text-text"
              }`}
            >
              <option.icon
                size={15}
                aria-hidden
                className={active ? option.iconClass : undefined}
              />
              {option.label}
            </button>
          );
        })}
      </div>

      <div>
        <label
          htmlFor="signal-resolve-note"
          className="mb-1.5 block text-[13px] font-semibold text-text"
        >
          Catatan <span className="font-normal text-text-muted">(opsional)</span>
        </label>
        <textarea
          id="signal-resolve-note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          maxLength={280}
          rows={2}
          placeholder="Contoh: feed delay atau API tidak akurat"
          className="w-full resize-y rounded-lg border border-border bg-bg-input px-3 py-2 text-[14px] text-text placeholder:text-text-muted focus:border-accent"
        />
      </div>

      {error && (
        <p className="text-[13px] text-short" role="alert">
          {error}
        </p>
      )}

      <Button type="submit" size="sm" disabled={busy}>
        {busy && <Loader2 size={15} className="animate-spin" />}
        Simpan hasil
      </Button>
    </form>
  );
}
