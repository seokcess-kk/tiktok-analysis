import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import {
  batchSegmentAds,
  summarizeBySegment,
  type AdWithMetrics,
} from '@/lib/analytics/ad-segmenter';
import { type RawMetrics } from '@/lib/analytics/metrics-calculator';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: { accountId: string; campaignId: string };
}

/**
 * GET /api/accounts/:accountId/campaigns/:campaignId/ads/analysis
 * 캠페인 내 모든 광고의 세그먼트 분석
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { accountId, campaignId } = params;
    const { searchParams } = new URL(request.url);

    const days = parseInt(searchParams.get('days') || '7', 10);
    const status = searchParams.get('status'); // 'ENABLE', 'DISABLE', etc.

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

    // 캠페인 내 모든 광고 조회
    const adGroups = await prisma.adGroup.findMany({
      where: { campaignId },
      select: { id: true },
    });

    const adGroupIds = adGroups.map((ag) => ag.id);

    const whereAds: Record<string, unknown> = {
      adGroupId: { in: adGroupIds },
    };
    if (status && status !== 'all') {
      whereAds.status = status;
    }

    const ads = await prisma.ad.findMany({
      where: whereAds,
      select: {
        id: true,
        name: true,
        status: true,
      },
    });

    if (ads.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          campaign: {
            id: campaign.id,
            name: campaign.name,
          },
          period: {
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0],
            days,
          },
          summary: [],
          ads: [],
          total: 0,
        },
      });
    }

    const adIds = ads.map((a) => a.id);

    // 집계 메트릭 조회
    const adMetricsAgg = await prisma.performanceMetric.groupBy({
      by: ['adId'],
      where: {
        accountId,
        adId: { in: adIds },
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

    const metricsMap = new Map<string, typeof adMetricsAgg[0]>();
    adMetricsAgg.forEach((m) => {
      if (m.adId) {
        metricsMap.set(m.adId, m);
      }
    });

    // 일별 메트릭 조회 (추세 분석용)
    const dailyMetrics = await prisma.performanceMetric.findMany({
      where: {
        accountId,
        adId: { in: adIds },
        date: { gte: startDate, lte: endDate },
        level: 'AD',
      },
      select: {
        adId: true,
        date: true,
        spend: true,
        impressions: true,
        clicks: true,
        conversions: true,
      },
      orderBy: { date: 'asc' },
    });

    const dailyMetricsMap = new Map<string, RawMetrics[]>();
    dailyMetrics.forEach((m) => {
      if (!m.adId) return;
      if (!dailyMetricsMap.has(m.adId)) {
        dailyMetricsMap.set(m.adId, []);
      }
      dailyMetricsMap.get(m.adId)!.push({
        spend: m.spend,
        impressions: m.impressions,
        clicks: m.clicks,
        conversions: m.conversions,
      });
    });

    // AdWithMetrics 배열 구성
    const adsWithMetrics: AdWithMetrics[] = ads.map((ad) => {
      const agg = metricsMap.get(ad.id);
      return {
        id: ad.id,
        name: ad.name,
        status: ad.status,
        rawMetrics: {
          spend: agg?._sum.spend || 0,
          impressions: agg?._sum.impressions || 0,
          clicks: agg?._sum.clicks || 0,
          conversions: agg?._sum.conversions || 0,
        },
        dailyMetrics: dailyMetricsMap.get(ad.id),
      };
    });

    // 세그먼트 분류
    const conversionValue = campaign.account.conversionValue ?? undefined;
    const segmentedAds = batchSegmentAds(adsWithMetrics, { conversionValue });

    // 요약 통계
    const summary = summarizeBySegment(segmentedAds);

    // 응답 구성
    const adsResponse = segmentedAds.map((ad) => ({
      id: ad.id,
      name: ad.name,
      status: ad.status,
      label: ad.segment.label,
      confidence: ad.segment.confidence,
      reasons: ad.segment.reasons,
      nextAction: ad.segment.nextAction,
      metrics: {
        spend: ad.segment.metrics.spend,
        impressions: ad.segment.metrics.impressions,
        clicks: ad.segment.metrics.clicks,
        conversions: ad.segment.metrics.conversions,
        ctr: ad.segment.metrics.ctr,
        cvr: ad.segment.metrics.cvr,
        cpa: ad.segment.metrics.cpa,
        roas: ad.segment.metrics.roas,
        valueSource: ad.segment.metrics.valueSource,
      },
    }));

    // 세그먼트별 정렬 (SCALE > HOLD > TEST > KILL)
    const labelOrder: Record<string, number> = { SCALE: 0, HOLD: 1, TEST: 2, KILL: 3 };
    adsResponse.sort((a, b) => {
      const orderDiff = labelOrder[a.label] - labelOrder[b.label];
      if (orderDiff !== 0) return orderDiff;
      // 같은 세그먼트 내에서는 spend 내림차순
      return (b.metrics.spend ?? 0) - (a.metrics.spend ?? 0);
    });

    const summaryResponse = summary.map((s) => ({
      label: s.label,
      count: s.count,
      totalSpend: Math.round(s.totalSpend),
      avgRoas: Number(s.avgRoas.toFixed(2)),
      avgCpa: Math.round(s.avgCpa),
    }));

    return NextResponse.json({
      success: true,
      data: {
        campaign: {
          id: campaign.id,
          name: campaign.name,
        },
        period: {
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          days,
        },
        summary: summaryResponse,
        ads: adsResponse,
        total: adsResponse.length,
      },
    });
  } catch (error) {
    console.error('Error analyzing ads:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to analyze ads',
        },
      },
      { status: 500 }
    );
  }
}
