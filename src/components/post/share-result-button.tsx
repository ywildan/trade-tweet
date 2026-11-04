"use client";

import { useEffect, useRef, useState } from "react";
import {
  Download,
  ExternalLink,
  Link2,
  Share,
} from "lucide-react";

import { useToast } from "@/components/ui/toast";

/** Tombol bagikan hasil — unduh SVG, buka kartu, atau salin tautan post. */
export function ShareResultButton({
  postId,
  variant = "icon",
}: {
  postId: string;
  variant?: "icon" | "full";
}) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/post/${postId}`,
      );
      toast({ message: "Tautan postingan disalin." });
      setOpen(false);
    } catch {
      toast({ message: "Gagal menyalin tautan." });
    }
  }

  const cardUrl = `/api/share-card/${postId}`;

  return (
    <div
      ref={rootRef}
      className="relative"
      onClick={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          setOpen((value) => !value);
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Bagikan Hasil"
        title="Bagikan Hasil"
        className={
          variant === "full"
            ? "inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-[14px] font-semibold text-white transition-colors hover:bg-accent-hover"
            : "inline-flex items-center gap-1 rounded-full p-1.5 text-[13px] transition-colors hover:bg-accent/10 hover:text-accent"
        }
      >
        <Share size={variant === "full" ? 16 : 18} strokeWidth={1.8} />
        {variant === "full" && "Bagikan Hasil"}
      </button>

      {open && (
        <div
          role="menu"
          className={`absolute z-40 w-60 overflow-hidden rounded-xl border border-border bg-bg-elev py-1 shadow-2xl ${
            variant === "full"
              ? "left-0 top-full mt-2"
              : "bottom-full right-0 mb-2"
          }`}
        >
          <a
            role="menuitem"
            href={`${cardUrl}?download=1`}
            download
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-2.5 text-[14px] transition-colors hover:bg-text/10"
          >
            <Download size={17} />
            Unduh kartu SVG
          </a>
          <a
            role="menuitem"
            href={cardUrl}
            target="_blank"
            rel="noreferrer noopener"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-2.5 text-[14px] transition-colors hover:bg-text/10"
          >
            <ExternalLink size={17} />
            Buka kartu
          </a>
          <button
            type="button"
            role="menuitem"
            onClick={copyLink}
            className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-[14px] transition-colors hover:bg-text/10"
          >
            <Link2 size={17} />
            Salin tautan postingan
          </button>
        </div>
      )}
    </div>
  );
}
