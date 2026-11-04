import type {
  ButtonHTMLAttributes,
  ReactNode,
} from "react";

/**
 * Button — DESIGN.md §2.3 (radius 16, 15px semibold) + §9 pola interaksi.
 * Server-safe (no client hooks).
 */
type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const variantClass: Record<Variant, string> = {
  primary:
    "bg-accent text-white hover:bg-accent-hover disabled:opacity-50 disabled:hover:bg-accent",
  secondary:
    "border border-border text-text hover:bg-bg-input/60 disabled:opacity-50",
  ghost: "text-text hover:bg-bg-input/60 disabled:opacity-50",
  danger:
    "border border-short/60 text-short hover:bg-short/10 disabled:opacity-50",
};

const sizeClass: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px]",
  md: "h-10 px-4 text-[15px]",
  lg: "h-12 px-6 text-[15px]",
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...rest
}: {
  variant?: Variant;
  size?: Size;
  children?: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-2xl font-semibold transition-colors duration-150 cursor-pointer ${sizeClass[size]} ${variantClass[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
