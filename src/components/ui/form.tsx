import type { ReactNode } from "react";

export const inputClass =
  "w-full rounded-lg border border-border bg-bg-input px-3 py-2.5 text-[15px] text-text placeholder:text-text-muted outline-none transition-colors focus:border-accent";

export const textareaClass = `${inputClass} min-h-[96px] resize-y leading-5`;

export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <label htmlFor={htmlFor} className="text-[13px] font-semibold text-text">
          {label}
        </label>
        {hint && <span className="text-[12px] text-text-muted">{hint}</span>}
      </div>
      {children}
      {error && (
        <p className="mt-1 text-[13px] text-short" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
