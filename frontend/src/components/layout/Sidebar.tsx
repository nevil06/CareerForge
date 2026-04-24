"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clsx } from "clsx";
import { useAuthStore } from "@/lib/store";
import {
  LayoutDashboard, Briefcase, User, Bell, FileText, LogOut, Sparkles,
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
  { href: "/company/jobs", label: "My Jobs", icon: Briefcase },
  { href: "/company/notifications", label: "Notifications", icon: Bell },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const links = user?.role === "company" ? companyLinks : candidateLinks;

  return (
    <aside className="w-64 min-h-screen bg-white border-r border-gray-100 flex flex-col">
      <div className="px-6 py-5 border-b border-gray-100">
        <span className="text-lg font-bold text-brand-600">⚡ Carrier-Forge</span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {links.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href}
            className={clsx(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
              pathname === href
                ? "bg-brand-50 text-brand-600"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
            )}>
            <Icon size={18} />
            {label}
          </Link>
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-gray-100">
        <div className="px-3 py-2 text-xs text-gray-400 truncate">{user?.email}</div>
        <button
          onClick={() => { logout(); router.push("/"); }}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 w-full transition-colors">
          <LogOut size={18} /> Sign Out
        </button>
      </div>
    </aside>
  );
}
