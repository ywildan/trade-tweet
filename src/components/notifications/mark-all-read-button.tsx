"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { useToast } from "@/components/ui/toast";

export function MarkAllReadButton() {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function markAll() {
    if (busy) return;
    setBusy(true);
    try {
      const response = await fetch("/api/notifications/read-all", {
        method: "POST",
      });
      if (!response.ok) throw new Error();
      toast({ message: "Semua notifikasi ditandai dibaca." });
      router.refresh();
    } catch {
      toast({ message: "Gagal menandai notifikasi. Coba lagi." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={markAll}
      disabled={busy}
      className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[13px] font-semibold text-text-muted transition-colors hover:bg-bg-input/60 hover:text-text disabled:opacity-60"
    >
      {busy && <Loader2 size={13} className="animate-spin" />}
      Tandai semua dibaca
    </button>
  );
}
