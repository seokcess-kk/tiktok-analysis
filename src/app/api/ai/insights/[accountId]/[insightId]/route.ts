import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

interface RouteParams {
  params: { accountId: string; insightId: string };
}

/**
 * GET /api/ai/insights/:accountId/:insightId
 * 인사이트 상세 조회
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { accountId, insightId } = params;

    const insight = await prisma.aIInsight.findFirst({
      where: {
        id: insightId,
        accountId,
      },
      include: {
        strategies: true,
        account: {
          select: {
            id: true,
            name: true,
            client: {
              select: {
                name: true,
                industry: true,
              },
            },
          },
        },
      },
    });

    if (!insight) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Insight not found' },
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: insight.id,
        type: insight.type,
        severity: insight.severity,
        title: insight.title,
        summary: insight.summary,
        details: insight.details,
        metrics: insight.metrics,
        generatedAt: insight.generatedAt,
        expiresAt: insight.expiresAt,
        isRead: insight.isRead,
        readAt: insight.readAt,
        account: {
          id: insight.account.id,
          name: insight.account.name,
          clientName: insight.account.client.name,
          industry: insight.account.client.industry,
        },
        linkedStrategies: insight.strategies.map((s) => ({
          id: s.id,
          type: s.type,
          priority: s.priority,
          title: s.title,
          description: s.description,
          status: s.status,
        })),
      },
    });
  } catch (error) {
    console.error('Error fetching insight:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch insight',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/ai/insights/:accountId/:insightId
 * 인사이트 읽음 처리
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { accountId, insightId } = params;
    const body = await request.json();
    const { isRead } = body;

    const insight = await prisma.aIInsight.findFirst({
      where: {
        id: insightId,
        accountId,
      },
    });

    if (!insight) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Insight not found' },
        },
        { status: 404 }
      );
    }

    const updated = await prisma.aIInsight.update({
      where: { id: insightId },
      data: {
        isRead: isRead ?? true,
        readAt: isRead ? new Date() : null,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: updated.id,
        isRead: updated.isRead,
        readAt: updated.readAt,
      },
    });
  } catch (error) {
    console.error('Error updating insight:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update insight',
        },
      },
      { status: 500 }
    );
  }
}
