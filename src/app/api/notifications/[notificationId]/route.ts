import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

interface RouteParams {
  params: { notificationId: string };
}

/**
 * PUT /api/notifications/:notificationId
 * 개별 알림 읽음 처리
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { notificationId } = params;

    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Notification not found' },
        },
        { status: 404 }
      );
    }

    const updated = await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: updated.id,
        isRead: updated.isRead,
      },
    });
  } catch (error) {
    console.error('Error updating notification:', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to update notification' },
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/notifications/:notificationId
 * 알림 삭제
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { notificationId } = params;

    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Notification not found' },
        },
        { status: 404 }
      );
    }

    await prisma.notification.delete({
      where: { id: notificationId },
    });

    return NextResponse.json({
      success: true,
      message: 'Notification deleted',
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to delete notification' },
      },
      { status: 500 }
    );
  }
}
