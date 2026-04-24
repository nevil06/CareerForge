import { clsx } from "clsx";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "danger";
  className?: string;
}

const variants = {
  default: "bg-neo-white text-neo-black border-2 border-neo-black shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]",
  success: "bg-green-400 text-neo-black border-2 border-neo-black shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]",
  warning: "bg-neo-grey text-neo-black border-2 border-neo-black shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]",
  danger: "bg-red-400 text-neo-black border-2 border-neo-black shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]",
};

export default function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span className={clsx("inline-flex items-center rounded-none px-3 py-1 text-xs font-bold uppercase tracking-wider", variants[variant], className)}>
      {children}
    </span>
  );
}
