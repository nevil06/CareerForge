"use client";
import { useEffect, useState } from "react";
import { AppShell, PageHeader } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { getCandidateNotifications } from "@/lib/api";
import { Bell } from "lucide-react";
import { clsx } from "clsx";

export default function NotificationsPage() {
  const [notifs, setNotifs] = useState<any[]>([]);

  useEffect(() => {
    getCandidateNotifications().then((r) => setNotifs(r.data)).catch(() => {});
  }, []);

  return (
    <AppShell>
      <div className="max-w-3xl">
        <PageHeader
          eyebrow="Signal feed"
          title="Notifications"
          description="Fresh match events and agent updates appear here."
        />

        {notifs.length === 0 ? (
          <Card className="py-12 text-center text-stone-500">
            <Bell className="mx-auto mb-3 text-fern" />
            No notifications yet.
          </Card>
        ) : (
          <div className="space-y-3">
            {notifs.map((n) => (
              <Card key={n.id} className={clsx(!n.is_read && "border-fern/30 bg-fern/10")}>
                <div className="flex items-start gap-3">
                  <div className={clsx("mt-2 h-2 w-2 flex-shrink-0 rounded-full", n.is_read ? "bg-stone-300" : "bg-moss")} />
                  <div>
                    <p className="text-sm font-bold text-soil">{n.title}</p>
                    <p className="mt-0.5 text-sm text-stone-600">{n.message}</p>
                    <p className="mt-1 text-xs font-semibold text-stone-400">
                      {new Date(n.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
