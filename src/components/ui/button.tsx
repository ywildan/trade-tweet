import type {
  ButtonHTMLAttributes,
  ReactNode,
} from "react";

/* Button: radius 8, teks semibold 15px. Server-safe. */
type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const variantClass: Record<Variant, string> = {
  primary:
    "bg-accent text-on-accent hover:bg-accent-hover disabled:opacity-50 disabled:hover:bg-accent",
  secondary:
    "border border-border-strong text-text hover:bg-bg-input/60 disabled:opacity-50",
  ghost: "text-text hover:bg-bg-input/60 disabled:opacity-50",
  danger:
    "border border-short text-short hover:bg-short/10 disabled:opacity-50",
};

const sizeClass: Record<Size, string> = {
  sm: "h-11 px-3 text-[13px]",
  md: "h-11 px-4 text-[15px]",
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
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors duration-150 ${sizeClass[size]} ${variantClass[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
