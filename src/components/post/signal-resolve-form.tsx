"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

type Outcome = "TP_HIT" | "SL_HIT" | "CANCELLED";

const OPTIONS: Array<{
  id: Outcome;
  label: string;
  className: string;
  toast: string;
}> = [
  {
    id: "TP_HIT",
    label: "Tandai TP",
    className: "border-long bg-long/15 text-long",
    toast: "Sinyal ditandai TP.",
  },
  {
    id: "SL_HIT",
    label: "Tandai SL",
    className: "border-short bg-short/15 text-short",
    toast: "Sinyal ditandai SL.",
  },
  {
    id: "CANCELLED",
    label: "Batalkan sinyal",
    className: "border-border bg-bg-input text-text",
    toast: "Sinyal dibatalkan.",
  },
];

/** Override manual pembuat sinyal bila feed delay/tidak akurat (Phase 4). */
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
              className={`rounded-full border px-3 py-1.5 text-[13px] font-semibold transition-colors ${
                active
                  ? option.className
                  : "border-border text-text-muted hover:bg-bg-input/60 hover:text-text"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <textarea
        value={note}
        onChange={(event) => setNote(event.target.value)}
        maxLength={280}
        rows={2}
        placeholder="Catatan (opsional) — mis. feed delay atau API tidak akurat"
        aria-label="Catatan penutupan sinyal"
        className="w-full resize-y rounded-lg border border-border bg-bg-input px-3 py-2 text-[14px] text-text placeholder:text-text-muted outline-none focus:border-accent"
      />

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
