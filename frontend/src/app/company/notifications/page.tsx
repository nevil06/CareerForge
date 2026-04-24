"use client";
import { useEffect, useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import { Card } from "@/components/ui/Card";
import { getCompanyNotifications } from "@/lib/api";
import { Bell } from "lucide-react";
import { clsx } from "clsx";

export default function CompanyNotificationsPage() {
  const [notifs, setNotifs] = useState<any[]>([]);

  useEffect(() => {
    getCompanyNotifications().then((r) => setNotifs(r.data)).catch(() => {});
  }, []);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8 overflow-auto max-w-2xl">
        <div className="flex items-center gap-2 mb-6">
          <Bell className="text-brand-500" size={22} />
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
        </div>
        {notifs.length === 0 ? (
          <Card className="text-center text-gray-400 py-12">No notifications yet.</Card>
        ) : (
          <div className="space-y-3">
            {notifs.map((n) => (
              <Card key={n.id} className={clsx(!n.is_read && "border-brand-200 bg-brand-50/30")}>
                <div className="flex items-start gap-3">
                  <div className={clsx("w-2 h-2 rounded-full mt-2 flex-shrink-0", n.is_read ? "bg-gray-300" : "bg-brand-500")} />
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{n.title}</p>
                    <p className="text-sm text-gray-500 mt-0.5">{n.message}</p>
                    <p className="text-xs text-gray-400 mt-1">{new Date(n.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
