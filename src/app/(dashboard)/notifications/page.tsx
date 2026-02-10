'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Bell,
  AlertTriangle,
  TrendingUp,
  Target,
  FileText,
  CheckCircle2,
  Loader2,
  Trash2,
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

const typeConfig = {
  INSIGHT: { icon: TrendingUp, label: '인사이트', color: 'bg-blue-100 text-blue-800' },
  STRATEGY: { icon: Target, label: '전략', color: 'bg-purple-100 text-purple-800' },
  REPORT: { icon: FileText, label: '리포트', color: 'bg-green-100 text-green-800' },
  ANOMALY: { icon: AlertTriangle, label: '이상 감지', color: 'bg-red-100 text-red-800' },
  SYSTEM: { icon: Bell, label: '시스템', color: 'bg-gray-100 text-gray-800' },
};

export default function NotificationsPage() {
  const { data: session } = useSession();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'UNREAD'>('ALL');

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const userId = session?.user?.id || 'demo-user';
      const res = await fetch(`/api/notifications?userId=${userId}&limit=50`);
      const data = await res.json();

      if (data.success) {
        setNotifications(data.data.notifications);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [session]);

  const markAsRead = async (notificationId: string) => {
    try {
      await fetch(`/api/notifications/${notificationId}`, {
        method: 'PUT',
      });

      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n))
      );
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const userId = session?.user?.id || 'demo-user';
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, markAllRead: true }),
      });

      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      await fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE',
      });

      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const formatTimeAgo = (dateString: string): string => {
    const now = new Date();
    const date = new Date(dateString);
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return '방금 전';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}분 전`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}시간 전`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}일 전`;
    return date.toLocaleDateString('ko-KR');
  };

  const filteredNotifications =
    filter === 'UNREAD'
      ? notifications.filter((n) => !n.isRead)
      : notifications;

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">알림</h1>
          <p className="text-muted-foreground">
            모든 알림을 확인하고 관리하세요
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" onClick={markAllAsRead}>
            <CheckCircle2 className="h-4 w-4 mr-2" />
            모두 읽음 처리
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">전체</p>
            <p className="text-2xl font-bold">{notifications.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">읽지 않음</p>
            <p className="text-2xl font-bold text-blue-600">{unreadCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">이상 감지</p>
            <p className="text-2xl font-bold text-red-600">
              {notifications.filter((n) => n.type === 'ANOMALY' && !n.isRead).length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">인사이트</p>
            <p className="text-2xl font-bold text-purple-600">
              {notifications.filter((n) => n.type === 'INSIGHT').length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        <Button
          variant={filter === 'ALL' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('ALL')}
        >
          전체 ({notifications.length})
        </Button>
        <Button
          variant={filter === 'UNREAD' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('UNREAD')}
        >
          읽지 않음 ({unreadCount})
        </Button>
      </div>

      {/* Notifications List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            알림 목록
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>알림이 없습니다</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredNotifications.map((notification) => {
                const typeInfo = typeConfig[notification.type] || typeConfig.SYSTEM;
                const TypeIcon = typeInfo.icon;

                return (
                  <div
                    key={notification.id}
                    className={`flex items-start gap-4 p-4 rounded-lg border transition-colors ${
                      !notification.isRead
                        ? 'bg-blue-50/50 border-blue-200'
                        : 'hover:bg-muted/50'
                    }`}
                  >
                    <TypeIcon
                      className={`h-5 w-5 mt-0.5 ${
                        notification.type === 'ANOMALY'
                          ? 'text-red-600'
                          : notification.type === 'INSIGHT'
                          ? 'text-blue-600'
                          : 'text-gray-600'
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`font-medium ${
                            !notification.isRead ? 'text-foreground' : 'text-muted-foreground'
                          }`}
                        >
                          {notification.title}
                        </span>
                        <Badge variant="outline" className={typeInfo.color}>
                          {typeInfo.label}
                        </Badge>
                        {!notification.isRead && (
                          <span className="h-2 w-2 rounded-full bg-blue-500" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-4 mt-2">
                        {notification.account && (
                          <span className="text-xs text-muted-foreground">
                            {notification.account.name}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {formatTimeAgo(notification.createdAt)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {notification.link && (
                        <Link href={notification.link}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (!notification.isRead) {
                                markAsRead(notification.id);
                              }
                            }}
                          >
                            보기
                          </Button>
                        </Link>
                      )}
                      {!notification.isRead && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => markAsRead(notification.id)}
                        >
                          읽음
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => deleteNotification(notification.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
