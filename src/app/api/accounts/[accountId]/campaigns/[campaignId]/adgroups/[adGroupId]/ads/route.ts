import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { computeAllMetrics, metricsWithDefaults } from '@/lib/analytics/metrics-calculator';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: { accountId: string; campaignId: string; adGroupId: string };
}

/**
 * GET /api/accounts/:accountId/campaigns/:campaignId/adgroups/:adGroupId/ads
 * 광고그룹별 광고 목록 조회 (with metrics)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { accountId, campaignId, adGroupId } = params;
    const { searchParams } = new URL(request.url);

    const status = searchParams.get('status');
    const days = parseInt(searchParams.get('days') || '7', 10);

    // 광고그룹 확인 (계정 정보 포함)
    const adGroup = await prisma.adGroup.findFirst({
      where: {
        id: adGroupId,
        campaignId,
        campaign: { accountId },
      },
      include: {
        campaign: {
          include: {
            account: {
              select: { conversionValue: true },
            },
          },
        },
      },
    });

    if (!adGroup) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Ad group not found' } },
        { status: 404 }
      );
    }

    // 날짜 범위 계산
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // 광고 조회 조건
    const where: Record<string, unknown> = { adGroupId };
    if (status && status !== 'all') {
      where.status = status;
    }

    // 광고 목록 조회
    const ads = await prisma.ad.findMany({
      where,
      include: {
        creative: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // 각 광고의 성과 지표 조회
    const adMetrics = await prisma.performanceMetric.groupBy({
      by: ['adId'],
      where: {
        accountId,
        adId: { in: ads.map((ad) => ad.id) },
        date: { gte: startDate, lte: endDate },
        level: 'AD',
      },
      _sum: {
        spend: true,
        impressions: true,
        clicks: true,
        conversions: true,
      },
    });

    // 메트릭 맵 생성
    const metricsMap = new Map<string, typeof adMetrics[0]>();
    adMetrics.forEach((m) => {
      if (m.adId) {
        metricsMap.set(m.adId, m);
      }
    });

    // 광고 데이터 가공 (공통 모듈 사용)
    const conversionValue = adGroup.campaign.account.conversionValue ?? undefined;
    const adsWithMetrics = ads.map((ad) => {
      const rawMetrics = metricsMap.get(ad.id);
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
        id: ad.id,
        tiktokAdId: ad.tiktokAdId,
        name: ad.name,
        status: ad.status,
        creativeCount: ad.creative ? 1 : 0,
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
        createdAt: ad.createdAt,
        updatedAt: ad.updatedAt,
      };
    });

    // 지출 기준 정렬 (내림차순)
    adsWithMetrics.sort((a, b) => b.metrics.spend - a.metrics.spend);

    return NextResponse.json({
      success: true,
      data: {
        campaign: {
          id: adGroup.campaign.id,
          name: adGroup.campaign.name,
          status: adGroup.campaign.status,
        },
        adGroup: {
          id: adGroup.id,
          name: adGroup.name,
          status: adGroup.status,
        },
        ads: adsWithMetrics,
        total: adsWithMetrics.length,
        period: {
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          days,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching ads:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch ads',
        },
      },
      { status: 500 }
    );
  }
}
