"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clsx } from "clsx";
import { useAuthStore } from "@/lib/store";
import {
  LayoutDashboard, Briefcase, User, Bell, LogOut, Sparkles, Sprout,
} from "lucide-react";

const candidateLinks = [
  { href: "/candidate/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/candidate/profile", label: "My Profile", icon: User },
  { href: "/candidate/jobs", label: "Browse Jobs", icon: Briefcase },
  { href: "/candidate/ai-tools", label: "AI Tools", icon: Sparkles },
  { href: "/candidate/notifications", label: "Notifications", icon: Bell },
];

const companyLinks = [
  { href: "/company/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/company/profile", label: "Company Profile", icon: User },
  { href: "/company/jobs", label: "My Jobs", icon: Briefcase },
  { href: "/company/candidates", label: "Find Candidates", icon: User },
  { href: "/company/notifications", label: "Notifications", icon: Bell },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const links = user?.role === "company" ? companyLinks : candidateLinks;

  return (
    <>
    <div className="fixed inset-x-3 bottom-3 z-30 rounded-[1.5rem] border border-white/70 bg-cream/80 p-2 shadow-organic backdrop-blur-xl lg:hidden">
      <nav className="flex items-center justify-around">
        {links.slice(0, 5).map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            aria-label={label}
            className={clsx(
              "grid h-11 w-11 place-items-center rounded-[1rem] transition-colors",
              pathname === href ? "bg-soil text-cream" : "text-stone-500 hover:bg-white/70",
            )}
          >
            <Icon size={18} />
          </Link>
        ))}
      </nav>
    </div>
    <aside className="relative z-20 hidden min-h-screen w-72 flex-col border-r border-white/60 bg-cream/55 shadow-organic backdrop-blur-xl lg:flex">
      <div className="px-6 py-6">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-[1.35rem] bg-soil text-cream shadow-leaf">
            <Sprout size={22} />
          </div>
          <div>
            <span className="font-display text-xl font-black text-soil">Carrier-Forge</span>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-clay">Hiring agent</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-2 px-4 py-3">
        {links.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href}
            className={clsx(
              "group flex items-center gap-3 rounded-[1.25rem] px-4 py-3 text-sm font-bold transition-all",
              pathname === href
                ? "bg-soil text-cream shadow-leaf"
                : "text-stone-600 hover:-translate-y-0.5 hover:bg-white/65 hover:text-soil",
            )}>
            <Icon size={18} />
            {label}
          </Link>
        ))}
      </nav>

      <div className="m-4 rounded-[1.75rem] border border-white/70 bg-white/45 p-3">
        <div className="px-3 py-1">
          <p className="text-xs font-semibold text-stone-500 truncate">{user?.email || "Guest"}</p>
          <p className="text-xs text-stone-400 capitalize">{user?.role}</p>
        </div>
        <button
          onClick={() => { logout(); router.replace("/"); }}
          className="flex w-full items-center gap-3 rounded-[1.15rem] px-3 py-2.5 text-sm font-bold text-stone-600 transition-colors hover:bg-red-50 hover:text-red-600">
          <LogOut size={18} /> Sign Out
        </button>
      </div>
    </aside>
    </>
  );
}
