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
    <div className="fixed inset-x-3 bottom-3 z-30 border-4 border-neo-black bg-neo-white p-2 shadow-neo-md lg:hidden">
      <nav className="flex items-center justify-around">
        {links.slice(0, 5).map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            aria-label={label}
            className={clsx(
              "grid h-11 w-11 place-items-center border-2 border-transparent transition-colors",
              pathname === href ? "bg-neo-grey text-neo-black border-neo-black shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]" : "text-neo-dark-grey hover:bg-neo-grey hover:border-neo-black",
            )}
          >
            <Icon size={20} strokeWidth={2.5} />
          </Link>
        ))}
      </nav>
    </div>
    <aside className="relative z-20 hidden min-h-screen w-72 flex-col border-r-4 border-neo-black bg-neo-white lg:flex">
      <div className="px-6 py-6 border-b-4 border-neo-black bg-neo-grey text-neo-black">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center border-2 border-neo-black bg-neo-white text-neo-black shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]">
            <Sprout size={24} strokeWidth={2.5} />
          </div>
          <div>
            <span className="font-display text-xl font-black text-neo-black uppercase tracking-tight">Carrier-Forge</span>
            <p className="text-xs font-bold uppercase tracking-widest text-neo-black">Hiring agent</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-2 px-4 py-6">
        {links.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href}
            className={clsx(
              "group flex items-center gap-3 border-2 px-4 py-3 text-sm font-bold uppercase tracking-wide transition-all",
              pathname === href
                ? "border-neo-black bg-neo-grey text-neo-black shadow-[4px_4px_0px_0px_rgba(17,24,39,1)] translate-x-[-2px] translate-y-[-2px]"
                : "border-transparent text-neo-dark-grey hover:border-neo-black hover:bg-neo-grey hover:text-neo-black hover:shadow-[2px_2px_0px_0px_rgba(17,24,39,1)] hover:translate-x-[-1px] hover:translate-y-[-1px]",
            )}>
            <Icon size={20} strokeWidth={2.5} />
            {label}
          </Link>
        ))}
      </nav>

      <div className="m-4 border-4 border-neo-black bg-neo-white p-3 shadow-[4px_4px_0px_0px_rgba(17,24,39,1)]">
        <div className="px-3 py-1 mb-2">
          <p className="text-xs font-bold text-neo-black truncate uppercase">{user?.email || "Guest"}</p>
          <p className="text-xs font-bold text-neo-dark-grey uppercase">{user?.role}</p>
        </div>
        <button
          onClick={() => { logout(); router.replace("/"); }}
          className="flex w-full items-center gap-3 border-2 border-neo-black bg-neo-white px-3 py-2.5 text-sm font-bold uppercase text-neo-black transition-colors hover:bg-red-500 hover:text-neo-white hover:shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]">
          <LogOut size={18} strokeWidth={2.5} /> Sign Out
        </button>
      </div>
    </aside>
    </>
  );
}
