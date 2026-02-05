'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Bell,
  AlertTriangle,
  TrendingUp,
  Target,
  FileText,
  CheckCircle2,
  X,
} from 'lucide-react';

interface Notification {
  id: string;
  type: 'INSIGHT' | 'STRATEGY' | 'REPORT' | 'ANOMALY' | 'SYSTEM';
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
  account?: {
    id: string;
    name: string;
  };
}

interface NotificationBellProps {
  userId?: string;
}

const typeConfig = {
  INSIGHT: { icon: TrendingUp, color: 'text-blue-600' },
  STRATEGY: { icon: Target, color: 'text-purple-600' },
  REPORT: { icon: FileText, color: 'text-green-600' },
  ANOMALY: { icon: AlertTriangle, color: 'text-red-600' },
  SYSTEM: { icon: Bell, color: 'text-gray-600' },
};

export function NotificationBell({ userId = 'demo-user' }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/notifications?userId=${userId}&limit=10`);
      const data = await res.json();

      if (data.success) {
        setNotifications(data.data.notifications);
        setUnreadCount(data.data.unreadCount);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      await fetch(`/api/notifications/${notificationId}`, {
        method: 'PUT',
      });

      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, markAllRead: true }),
      });

      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch notifications on mount and periodically
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000); // 1분마다 갱신
    return () => clearInterval(interval);
  }, [userId]);

  // Format time ago
  const formatTimeAgo = (dateString: string): string => {
    const now = new Date();
    const date = new Date(dateString);
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return '방금 전';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}분 전`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}시간 전`;
    return `${Math.floor(seconds / 86400)}일 전`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchNotifications();
        }}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-background border rounded-lg shadow-lg z-50">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <h3 className="font-semibold">알림</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  className="text-xs"
                >
                  모두 읽음
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-[400px] overflow-y-auto">
            {loading && notifications.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                로딩 중...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>새로운 알림이 없습니다</p>
              </div>
            ) : (
              notifications.map((notification) => {
                const typeInfo = typeConfig[notification.type] || typeConfig.SYSTEM;
                const TypeIcon = typeInfo.icon;

                return (
                  <div
                    key={notification.id}
                    className={`px-4 py-3 border-b last:border-b-0 hover:bg-muted/50 cursor-pointer transition-colors ${
                      !notification.isRead ? 'bg-blue-50/50' : ''
                    }`}
                    onClick={() => {
                      if (!notification.isRead) {
                        markAsRead(notification.id);
                      }
                      if (notification.link) {
                        window.location.href = notification.link;
                      }
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <TypeIcon className={`h-5 w-5 mt-0.5 ${typeInfo.color}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-medium text-sm ${
                              !notification.isRead ? 'text-foreground' : 'text-muted-foreground'
                            }`}
                          >
                            {notification.title}
                          </span>
                          {!notification.isRead && (
                            <span className="h-2 w-2 rounded-full bg-blue-500" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          {notification.account && (
                            <span>{notification.account.name}</span>
                          )}
                          <span>{formatTimeAgo(notification.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t">
            <Link
              href="/notifications"
              className="text-sm text-primary hover:underline"
              onClick={() => setIsOpen(false)}
            >
              모든 알림 보기
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
