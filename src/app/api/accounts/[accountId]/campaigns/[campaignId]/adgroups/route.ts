import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { computeAllMetrics, metricsWithDefaults } from '@/lib/analytics/metrics-calculator';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: { accountId: string; campaignId: string };
}

/**
 * GET /api/accounts/:accountId/campaigns/:campaignId/adgroups
 * 캠페인별 광고그룹 목록 조회 (with metrics)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { accountId, campaignId } = params;
    const { searchParams } = new URL(request.url);

    const status = searchParams.get('status');
    const days = parseInt(searchParams.get('days') || '7', 10);

    // 캠페인 및 계정 확인
    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, accountId },
      include: {
        account: {
          select: { conversionValue: true },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Campaign not found' } },
        { status: 404 }
      );
    }

    // 날짜 범위 계산
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // 광고그룹 조회 조건
    const where: Record<string, unknown> = { campaignId };
    if (status && status !== 'all') {
      where.status = status;
    }

    // 광고그룹 목록 조회
    const adGroups = await prisma.adGroup.findMany({
      where,
      include: {
        _count: {
          select: { ads: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // 각 광고그룹의 성과 지표 조회
    const adGroupMetrics = await prisma.performanceMetric.groupBy({
      by: ['adGroupId'],
      where: {
        accountId,
        adGroupId: { in: adGroups.map((ag) => ag.id) },
        date: { gte: startDate, lte: endDate },
        level: 'ADGROUP',
      },
      _sum: {
        spend: true,
        impressions: true,
        clicks: true,
        conversions: true,
      },
    });

    // 메트릭 맵 생성
    const metricsMap = new Map<string, typeof adGroupMetrics[0]>();
    adGroupMetrics.forEach((m) => {
      if (m.adGroupId) {
        metricsMap.set(m.adGroupId, m);
      }
    });

    // 광고그룹 데이터 가공 (공통 모듈 사용)
    const conversionValue = campaign.account.conversionValue ?? undefined;
    const adGroupsWithMetrics = adGroups.map((adGroup) => {
      const rawMetrics = metricsMap.get(adGroup.id);
      const spend = rawMetrics?._sum.spend || 0;
      const impressions = rawMetrics?._sum.impressions || 0;
      const clicks = rawMetrics?._sum.clicks || 0;
      const conversions = rawMetrics?._sum.conversions || 0;

      const calculated = computeAllMetrics(
        { spend, impressions, clicks, conversions },
        { conversionValue }
      );
      const metrics = metricsWithDefaults(calculated);

      return {
        id: adGroup.id,
        tiktokAdGroupId: adGroup.tiktokAdGroupId,
        name: adGroup.name,
        status: adGroup.status,
        bidStrategy: adGroup.bidStrategy,
        bidAmount: adGroup.bidAmount,
        adCount: adGroup._count.ads,
        metrics: {
          spend: metrics.spend,
          impressions: metrics.impressions,
          clicks: metrics.clicks,
          conversions: metrics.conversions,
          ctr: Number(metrics.ctr.toFixed(2)),
          cvr: Number(metrics.cvr.toFixed(2)),
          cpa: Math.round(metrics.cpa),
          roas: Number(metrics.roas.toFixed(2)),
          valueSource: calculated.valueSource,
        },
        createdAt: adGroup.createdAt,
        updatedAt: adGroup.updatedAt,
      };
    });

    // 지출 기준 정렬 (내림차순)
    adGroupsWithMetrics.sort((a, b) => b.metrics.spend - a.metrics.spend);

    return NextResponse.json({
      success: true,
      data: {
        campaign: {
          id: campaign.id,
          name: campaign.name,
          status: campaign.status,
        },
        adGroups: adGroupsWithMetrics,
        total: adGroupsWithMetrics.length,
        period: {
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          days,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching ad groups:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch ad groups',
        },
      },
      { status: 500 }
    );
  }
}
