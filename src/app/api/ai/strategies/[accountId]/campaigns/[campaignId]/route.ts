import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

interface RouteParams {
  params: { accountId: string; campaignId: string };
}

/**
 * GET /api/ai/strategies/:accountId/campaigns/:campaignId
 * 캠페인별 전략 목록 조회
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { accountId, campaignId } = params;
    const { searchParams } = new URL(request.url);

    // 쿼리 파라미터
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
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
    if (status) where.status = status;
    if (priority) where.priority = priority;

    // 전략 목록 조회
    const [strategies, total] = await Promise.all([
      prisma.aIStrategy.findMany({
        where,
        orderBy: [
          { priority: 'asc' },
          { createdAt: 'desc' },
        ],
        take: limit,
        skip: offset,
        include: {
          insight: {
            select: {
              id: true,
              type: true,
              title: true,
              severity: true,
            },
          },
        },
      }),
      prisma.aIStrategy.count({ where }),
    ]);

    // 상태별 카운트
    const statusCounts = await prisma.aIStrategy.groupBy({
      by: ['status'],
      where: { accountId, campaignId },
      _count: { status: true },
    });

    // 우선순위별 카운트 (PENDING만)
    const priorityCounts = await prisma.aIStrategy.groupBy({
      by: ['priority'],
      where: { accountId, campaignId, status: 'PENDING' },
      _count: { priority: true },
    });

    return NextResponse.json({
      success: true,
      data: {
        campaign: {
          id: campaign.id,
          name: campaign.name,
        },
        strategies: strategies.map((s) => ({
          id: s.id,
          type: s.type,
          priority: s.priority,
          title: s.title,
          description: s.description,
          actionItems: s.actionItems,
          expectedImpact: s.expectedImpact,
          difficulty: s.difficulty,
          status: s.status,
          acceptedAt: s.acceptedAt,
          completedAt: s.completedAt,
          rejectedReason: s.rejectedReason,
          actualResult: s.actualResult,
          createdAt: s.createdAt,
          linkedInsight: s.insight,
        })),
        pagination: {
          total,
          limit,
          offset,
        },
        summary: {
          total,
          byStatus: statusCounts.reduce(
            (acc, item) => {
              acc[item.status] = item._count.status;
              return acc;
            },
            {
              PENDING: 0,
              ACCEPTED: 0,
              IN_PROGRESS: 0,
              COMPLETED: 0,
              REJECTED: 0,
              EXPIRED: 0,
            } as Record<string, number>
          ),
          pendingByPriority: priorityCounts.reduce(
            (acc, item) => {
              acc[item.priority] = item._count.priority;
              return acc;
            },
            { HIGH: 0, MEDIUM: 0, LOW: 0 } as Record<string, number>
          ),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching campaign strategies:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch campaign strategies',
        },
      },
      { status: 500 }
    );
  }
}
