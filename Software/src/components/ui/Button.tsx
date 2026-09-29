import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "ghost";
type Size = "sm" | "md";

const base =
  "inline-flex items-center justify-center gap-2 rounded-[4px] font-mono tracking-[0.02em] transition-colors duration-200 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-cy disabled:cursor-not-allowed disabled:opacity-40";
const variants: Record<Variant, string> = {
  primary: "bg-cy text-[#04121A] hover:bg-cy2 border border-cy hover:border-cy2",
  ghost: "border border-line3 text-white hover:border-cy hover:text-cy",
};
const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-[11px]",
  md: "h-10 px-4 text-[12px]",
};

const cls = (variant: Variant, size: Size, className: string) => `${base} ${variants[variant]} ${sizes[size]} ${className}`;

export function Button({
  variant = "ghost",
  size = "md",
  className = "",
  children,
  ...rest
}: ComponentProps<"button"> & { variant?: Variant; size?: Size; children: ReactNode }) {
  return (
    <button type="button" {...rest} className={cls(variant, size, className)}>
      {children}
    </button>
  );
}

export function ButtonLink({
  href,
  variant = "ghost",
  size = "md",
  className = "",
  children,
  ...rest
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size; children: ReactNode }) {
  return (
    <Link href={href} {...rest} className={cls(variant, size, className)}>
      {children}
    </Link>
  );
}
