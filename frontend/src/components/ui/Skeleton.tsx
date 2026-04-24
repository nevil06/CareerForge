import React from "react";

interface SkeletonProps {
  className?: string;
  variant?: "text" | "rectangular" | "circular";
}

export function Skeleton({ className = "", variant = "rectangular" }: SkeletonProps) {
  const baseClasses = "animate-pulse bg-neo-grey border-2 border-neo-black";
  
  let variantClasses = "";
  if (variant === "text") {
    variantClasses = "h-4 w-full rounded-none";
  } else if (variant === "circular") {
    variantClasses = "rounded-full";
  } else {
    variantClasses = "h-32 w-full rounded-none shadow-[4px_4px_0px_0px_rgba(17,24,39,1)]";
  }

  return <div className={`${baseClasses} ${variantClasses} ${className}`} />;
}
