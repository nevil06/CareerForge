import { clsx } from "clsx";
import { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

const variants = {
  primary: "bg-soil text-cream shadow-leaf hover:-translate-y-0.5 hover:bg-moss",
  outline: "border border-moss/20 bg-white/45 text-soil hover:-translate-y-0.5 hover:border-moss/40 hover:bg-white/80",
  ghost: "text-moss hover:bg-moss/10",
  danger: "bg-clay text-white shadow-sm hover:-translate-y-0.5 hover:bg-red-600",
};

const sizes = {
  sm: "px-3.5 py-2 text-sm",
  md: "px-5 py-2.5 text-sm",
  lg: "px-7 py-3.5 text-base",
};

export default function Button({
  children, variant = "primary", size = "md", loading, className, disabled, ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-[1.2rem] font-bold transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-fern/20 disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        sizes[size],
        className,
      )}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      )}
      {children}
    </button>
  );
}
