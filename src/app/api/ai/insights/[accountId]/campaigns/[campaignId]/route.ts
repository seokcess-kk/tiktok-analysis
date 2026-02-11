import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

interface RouteParams {
  params: { accountId: string; campaignId: string };
}

/**
 * GET /api/ai/insights/:accountId/campaigns/:campaignId
 * 캠페인별 인사이트 목록 조회
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { accountId, campaignId } = params;
    const { searchParams } = new URL(request.url);

    // 쿼리 파라미터
    const type = searchParams.get('type');
    const severity = searchParams.get('severity');
    const isRead = searchParams.get('isRead');
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // 캠페인 존재 확인
    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, accountId },
    });

    if (!campaign) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Campaign not found' },
        },
        { status: 404 }
      );
    }

    // 필터 조건 구성
    const where: Record<string, unknown> = { accountId, campaignId };
    if (type) where.type = type;
    if (severity) where.severity = severity;
    if (isRead !== null && isRead !== undefined) {
      where.isRead = isRead === 'true';
    }

    // 인사이트 목록 조회
    const [insights, total] = await Promise.all([
      prisma.aIInsight.findMany({
        where,
        orderBy: { generatedAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          strategies: {
            select: {
              id: true,
              title: true,
              priority: true,
              status: true,
            },
          },
        },
      }),
      prisma.aIInsight.count({ where }),
    ]);

    // 읽지 않은 인사이트 수
    const unreadCount = await prisma.aIInsight.count({
      where: { accountId, campaignId, isRead: false },
    });

    // 심각도별 카운트
    const severityCounts = await prisma.aIInsight.groupBy({
      by: ['severity'],
      where: { accountId, campaignId },
      _count: { severity: true },
    });

    return NextResponse.json({
      success: true,
      data: {
        campaign: {
          id: campaign.id,
          name: campaign.name,
        },
        insights: insights.map((insight) => ({
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
          linkedStrategies: insight.strategies,
        })),
        pagination: {
          total,
          limit,
          offset,
        },
        summary: {
          total,
          unread: unreadCount,
          bySeverity: severityCounts.reduce(
            (acc, item) => {
              acc[item.severity] = item._count.severity;
              return acc;
            },
            { INFO: 0, WARNING: 0, CRITICAL: 0 } as Record<string, number>
          ),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching campaign insights:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch campaign insights',
        },
      },
      { status: 500 }
    );
  }
}
