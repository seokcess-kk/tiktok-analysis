import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

interface RouteParams {
  params: { accountId: string };
}

/**
 * GET /api/ai/insights/:accountId
 * 인사이트 목록 조회
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { accountId } = params;
    const { searchParams } = new URL(request.url);

    // 쿼리 파라미터
    const type = searchParams.get('type'); // DAILY_SUMMARY, ANOMALY, TREND, CREATIVE, PREDICTION
    const severity = searchParams.get('severity'); // INFO, WARNING, CRITICAL
    const isRead = searchParams.get('isRead'); // true, false
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // 계정 존재 확인
    const account = await prisma.account.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Account not found' },
        },
        { status: 404 }
      );
    }

    // 필터 조건 구성
    const where: any = { accountId };
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
      where: { accountId, isRead: false },
    });

    // 심각도별 카운트
    const severityCounts = await prisma.aIInsight.groupBy({
      by: ['severity'],
      where: { accountId },
      _count: { severity: true },
    });

    return NextResponse.json({
      success: true,
      data: {
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
    console.error('Error fetching insights:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch insights',
        },
      },
      { status: 500 }
    );
  }
}
