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
    <div className="flex min-h-screen bg-neo-grey">
      <Sidebar />
      <main className={clsx("flex-1 pb-24 lg:pb-10 p-4 lg:p-8", className)}>
        <div className="max-w-7xl mx-auto">{children}</div>
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
          <p className="mb-2 text-xs font-extrabold uppercase tracking-widest text-neo-dark-grey">
            {eyebrow}
          </p>
        )}
        <h1 className="font-display text-4xl font-black leading-tight text-neo-black md:text-5xl uppercase tracking-tight">
          {title}
        </h1>
        {description && <p className="mt-2 max-w-2xl text-base font-medium leading-6 text-neo-dark-grey">{description}</p>}
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
    moss: "bg-neo-grey text-neo-black border-2 border-neo-black",
    clay: "bg-neo-grey text-neo-black border-2 border-neo-black",
    lagoon: "bg-neo-grey text-neo-black border-2 border-neo-black",
    sun: "bg-green-400 text-neo-black border-2 border-neo-black",
  };
  return (
    <div className="border-4 border-neo-black bg-neo-white shadow-neo-md p-5">
      <div className="flex items-center gap-4">
        <div className={clsx("p-3", tones[tone])}>
          <Icon size={24} strokeWidth={2.5} />
        </div>
        <div>
          <p className="font-display text-3xl font-black text-neo-black">{value}</p>
          <p className="text-xs font-bold uppercase tracking-widest text-neo-dark-grey">{label}</p>
        </div>
      </div>
    </div>
  );
}
