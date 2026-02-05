import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

/**
 * GET /api/notifications
 * 현재 사용자의 알림 목록 조회
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // TODO: 실제로는 세션에서 userId 가져오기
    const userId = searchParams.get('userId') || 'demo-user';
    const accountId = searchParams.get('accountId');
    const isRead = searchParams.get('isRead');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // 필터 조건
    const where: any = { userId };
    if (accountId) where.accountId = accountId;
    if (isRead !== null && isRead !== undefined) {
      where.isRead = isRead === 'true';
    }

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          account: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({
        where: { userId, isRead: false },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        notifications: notifications.map((n) => ({
          id: n.id,
          type: n.type,
          title: n.title,
          message: n.message,
          link: n.link,
          isRead: n.isRead,
          createdAt: n.createdAt,
          account: n.account,
        })),
        pagination: {
          total,
          limit,
          offset,
        },
        unreadCount,
      },
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch notifications' },
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/notifications
 * 알림 일괄 읽음 처리
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, notificationIds, markAllRead } = body;

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'BAD_REQUEST', message: 'userId is required' },
        },
        { status: 400 }
      );
    }

    if (markAllRead) {
      // 모든 알림 읽음 처리
      await prisma.notification.updateMany({
        where: { userId, isRead: false },
        data: { isRead: true },
      });
    } else if (notificationIds && Array.isArray(notificationIds)) {
      // 특정 알림들 읽음 처리
      await prisma.notification.updateMany({
        where: {
          id: { in: notificationIds },
          userId,
        },
        data: { isRead: true },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Notifications marked as read',
    });
  } catch (error) {
    console.error('Error updating notifications:', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to update notifications' },
      },
      { status: 500 }
    );
  }
}
