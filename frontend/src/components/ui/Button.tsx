import { clsx } from "clsx";
import { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

const variants = {
  primary: "bg-neo-grey text-neo-black border-4 border-neo-black shadow-neo-sm hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-none",
  outline: "bg-neo-white text-neo-black border-4 border-neo-black shadow-neo-sm hover:bg-neo-grey hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-none",
  ghost: "text-neo-black border-4 border-transparent hover:border-neo-black",
  danger: "bg-red-500 text-neo-white border-4 border-neo-black shadow-neo-sm hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-none",
};

const sizes = {
  sm: "px-3.5 py-2 text-sm",
  md: "px-5 py-2.5 text-base",
  lg: "px-7 py-3.5 text-lg uppercase",
};

export default function Button({
  children, variant = "primary", size = "md", loading, className, disabled, ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-none font-bold transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-neo-black disabled:cursor-not-allowed disabled:opacity-50",
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
