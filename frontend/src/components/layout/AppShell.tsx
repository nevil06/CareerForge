"use client";
import Sidebar from "./Sidebar";
import { clsx } from "clsx";

export function AppShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="organic-page flex min-h-screen">
      <Sidebar />
      <main className={clsx("organic-main pb-24 lg:pb-10", className)}>
        <div className="organic-container">{children}</div>
      </main>
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        {eyebrow && (
          <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.28em] text-clay">
            {eyebrow}
          </p>
        )}
        <h1 className="font-display text-4xl font-black leading-tight text-soil md:text-5xl">
          {title}
        </h1>
        {description && <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "moss",
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ElementType;
  tone?: "moss" | "clay" | "lagoon" | "sun";
}) {
  const tones = {
    moss: "bg-moss text-cream",
    clay: "bg-clay text-white",
    lagoon: "bg-lagoon text-white",
    sun: "bg-sun text-soil",
  };
  return (
    <div className="organic-panel p-5">
      <div className="flex items-center gap-4">
        <div className={clsx("rounded-[1.25rem] p-3 shadow-sm", tones[tone])}>
          <Icon size={22} />
        </div>
        <div>
          <p className="font-display text-3xl font-black text-soil">{value}</p>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">{label}</p>
        </div>
      </div>
    </div>
  );
}
