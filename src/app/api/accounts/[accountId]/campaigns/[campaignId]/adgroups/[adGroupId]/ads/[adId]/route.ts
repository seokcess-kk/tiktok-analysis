import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: { accountId: string; campaignId: string; adGroupId: string; adId: string };
}

/**
 * GET /api/accounts/:accountId/campaigns/:campaignId/adgroups/:adGroupId/ads/:adId
 * 광고 상세 조회 (with metrics)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { accountId, campaignId, adGroupId, adId } = params;
    const { searchParams } = new URL(request.url);

    const days = parseInt(searchParams.get('days') || '7', 10);

    // 광고 확인 (관계 검증 포함)
    const ad = await prisma.ad.findFirst({
      where: {
        id: adId,
        adGroupId,
        adGroup: {
          campaignId,
          campaign: { accountId },
        },
      },
      include: {
        adGroup: {
          include: {
            campaign: true,
          },
        },
        creative: true,
      },
    });

    if (!ad) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Ad not found' } },
        { status: 404 }
      );
    }

    // 날짜 범위 계산
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // 광고의 일별 성과 지표 조회
    const dailyMetrics = await prisma.performanceMetric.findMany({
      where: {
        accountId,
        adId,
        date: { gte: startDate, lte: endDate },
        level: 'AD',
      },
      orderBy: { date: 'asc' },
    });

    // 총 합계 계산
    const totals = dailyMetrics.reduce(
      (acc, m) => ({
        spend: acc.spend + m.spend,
        impressions: acc.impressions + m.impressions,
        clicks: acc.clicks + m.clicks,
        conversions: acc.conversions + m.conversions,
      }),
      { spend: 0, impressions: 0, clicks: 0, conversions: 0 }
    );

    // 평균 계산
    const ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
    const cvr = totals.clicks > 0 ? (totals.conversions / totals.clicks) * 100 : 0;
    const cpc = totals.clicks > 0 ? totals.spend / totals.clicks : 0;
    const cpm = totals.impressions > 0 ? (totals.spend / totals.impressions) * 1000 : 0;
    const cpa = totals.conversions > 0 ? totals.spend / totals.conversions : 0;
    const roas = totals.spend > 0 ? (totals.conversions * 50000) / totals.spend : 0;

    // 일별 데이터 포맷
    const daily = dailyMetrics.map((m) => ({
      date: m.date.toISOString().split('T')[0],
      spend: m.spend,
      impressions: m.impressions,
      clicks: m.clicks,
      conversions: m.conversions,
      ctr: m.ctr,
      cvr: m.cvr,
      cpc: m.cpc,
      cpm: m.cpm,
      cpa: m.cpa,
      roas: m.roas,
    }));

    // 크리에이티브 배열 생성 (단일 creative를 배열로 변환)
    const creatives = ad.creative
      ? [
          {
            id: ad.creative.id,
            tiktokCreativeId: ad.creative.tiktokCreativeId,
            type: ad.creative.type,
            thumbnailUrl: ad.creative.thumbnailUrl,
            videoUrl: ad.creative.videoUrl,
            imageUrl: ad.creative.imageUrl,
            duration: ad.creative.duration,
            tags: ad.creative.tags,
            hookScore: ad.creative.hookScore,
            createdAt: ad.creative.createdAt,
          },
        ]
      : [];

    return NextResponse.json({
      success: true,
      data: {
        ad: {
          id: ad.id,
          tiktokAdId: ad.tiktokAdId,
          name: ad.name,
          status: ad.status,
          creativeCount: creatives.length,
          createdAt: ad.createdAt,
          updatedAt: ad.updatedAt,
        },
        adGroup: {
          id: ad.adGroup.id,
          name: ad.adGroup.name,
          status: ad.adGroup.status,
        },
        campaign: {
          id: ad.adGroup.campaign.id,
          name: ad.adGroup.campaign.name,
          status: ad.adGroup.campaign.status,
        },
        metrics: {
          ...totals,
          ctr: Number(ctr.toFixed(2)),
          cvr: Number(cvr.toFixed(2)),
          cpc: Number(cpc.toFixed(2)),
          cpm: Number(cpm.toFixed(2)),
          cpa: Math.round(cpa),
          roas: Number(roas.toFixed(2)),
        },
        daily,
        creatives,
        period: {
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          days,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching ad:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch ad',
        },
      },
      { status: 500 }
    );
  }
}
