"use client";

import { Bell, CheckCircle2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import NotificationAPI, { type UserNotificationItem } from "@/services/notificationAPI";

const eventLabels: Record<string, string> = {
  REQUEST_SEMESTER_PENDING:   "Request semester: Pending",
  REQUEST_SEMESTER_FORWARD:   "Request semester: Forward",
  REQUEST_SEMESTER_COMPILED:  "Request semester: Compiled",
  REQUEST_SEMESTER_TARIFFIED: "Request semester: Tariffied",
  LOGIN_FAILED:               "Login failed",
  PASSWORD_CHANGED:           "Password changed",
  CUSTOM:                     "General notification",
};

const Notification = () => {
  const [items,   setItems]   = useState<UserNotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await NotificationAPI.getMyNotifications();
        if (!active) return;
        setItems(data);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load notifications");
      } finally {
        if (active) setLoading(false);
      }
    };
    void loadData();
    return () => { active = false; };
  }, []);

  const unreadCount = useMemo(() => items.filter((i) => i.status === "UNREAD").length, [items]);

  const markAsRead = async (id: number) => {
    try {
      await NotificationAPI.markAsRead(id);
      setItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, status: "READ", readAt: new Date().toISOString() } : item,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to mark notification as read");
    }
  };

  return (
    <div className="space-y-4">

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-[15px] font-bold text-gray-900 tracking-tight">MY NOTIFICATIONS</h1>
        <span className="text-[13px] text-gray-500">
          Unread:{" "}
          <span className={`font-bold ${unreadCount > 0 ? "text-amber-600" : "text-gray-700"}`}>
            {unreadCount}
          </span>
        </span>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="px-3 py-2 bg-amber-50 border border-amber-300 text-[13px] text-amber-900">
          {error}
        </div>
      )}

      {/* ── List ── */}
      <div className="bg-white border border-gray-300">
        {loading ? (
          <div className="px-6 py-10 text-center text-[14px] text-gray-400">
            Loading notifications…
          </div>
        ) : items.length === 0 ? (
          <div className="px-6 py-10 text-center text-[14px] text-gray-400">
            No notifications yet.
          </div>
        ) : (
          items.map((item, idx) => {
            const isUnread = item.status === "UNREAD";
            return (
              <div
                key={item.id}
                className={`flex items-start justify-between gap-4 px-4 py-4 border-b border-gray-200 last:border-b-0 ${
                  idx % 2 === 0 ? "bg-white" : "bg-gray-50"
                } ${isUnread ? "border-l-2 border-l-gray-800" : ""}`}
              >
                {/* Icon + content */}
                <div className="flex items-start gap-3">
                  {/* Square icon */}
                  <div
                    className={`w-8 h-8 flex items-center justify-center shrink-0 ${
                      isUnread ? "bg-gray-800" : "bg-gray-100"
                    }`}
                  >
                    {isUnread ? (
                      <Bell className="w-4 h-4 text-white" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-gray-400" />
                    )}
                  </div>

                  {/* Text */}
                  <div className="space-y-0.5">
                    <p className="text-[12px] font-bold uppercase tracking-wide text-gray-500">
                      {eventLabels[item.eventType] ?? item.eventType}
                    </p>
                    <p className="text-[13px] font-semibold text-gray-900">{item.title}</p>
                    <p className="text-[13px] text-gray-600">{item.message}</p>
                    <p className="text-[11px] font-mono text-gray-400 pt-1">
                      {new Date(item.createdAt).toLocaleString()}
                      <span className={`ml-2 font-sans font-semibold ${isUnread ? "text-amber-600" : "text-gray-400"}`}>
                        · {item.status}
                      </span>
                    </p>
                  </div>
                </div>

                {/* Action */}
                {isUnread && (
                  <button
                    type="button"
                    onClick={() => void markAsRead(item.id)}
                    className="shrink-0 px-3 py-1.5 text-[12px] font-semibold border border-gray-300 text-gray-700 bg-white hover:bg-gray-100 transition-colors"
                  >
                    Mark as read
                  </button>
                )}
              </div>
            );
          })
        )}

        {/* ── Footer ── */}
        {!loading && items.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t border-gray-200">
            <p className="text-[13px] font-semibold text-gray-800">
              Total: <span className="font-bold text-gray-900">{items.length}</span>
            </p>
            <p className="text-[13px] text-gray-500">
              {items.length - unreadCount} read · {unreadCount} unread
            </p>
          </div>
        )}
      </div>

    </div>
  );
};

export default Notification;