import { clsx } from "clsx";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "danger";
  className?: string;
}

const variants = {
  default: "bg-sage/80 text-moss ring-moss/10",
  success: "bg-fern/15 text-moss ring-fern/20",
  warning: "bg-sun/25 text-amber-800 ring-sun/30",
  danger: "bg-clay/15 text-clay ring-clay/20",
};

export default function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span className={clsx("inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ring-1", variants[variant], className)}>
      {children}
    </span>
  );
}
