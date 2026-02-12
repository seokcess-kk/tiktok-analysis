import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { accountId: string; campaignId: string } }
) {
  try {
    const { accountId, campaignId } = params;

    // 캠페인 존재 확인
    const campaign = await prisma.campaign.findFirst({
      where: {
        id: campaignId,
        accountId: accountId,
      },
    });

    if (!campaign) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Campaign not found' } },
        { status: 404 }
      );
    }

    // Campaign > AdGroup > Ad > Creative 계층을 통해 소재 조회
    const creatives = await prisma.creative.findMany({
      where: {
        ads: {
          some: {
            adGroup: {
              campaignId: campaignId,
            },
          },
        },
      },
      include: {
        ads: {
          where: {
            adGroup: {
              campaignId: campaignId,
            },
          },
          include: {
            adGroup: {
              select: {
                id: true,
                name: true,
                campaignId: true,
              },
            },
          },
        },
        fatigue: {
          orderBy: { date: 'desc' },
          take: 1,
        },
        metrics: {
          where: {
            level: 'CREATIVE',
          },
          orderBy: { date: 'desc' },
          take: 7,
        },
      },
    });

    // 성과 데이터 집계
    const creativesWithMetrics = creatives.map((creative) => {
      const latestMetrics = creative.metrics[0] || null;
      const latestFatigue = creative.fatigue[0] || null;

      // 7일 메트릭 합계
      const totals = creative.metrics.reduce(
        (acc, m) => ({
          spend: acc.spend + (m.spend || 0),
          impressions: acc.impressions + (m.impressions || 0),
          clicks: acc.clicks + (m.clicks || 0),
          conversions: acc.conversions + (m.conversions || 0),
        }),
        { spend: 0, impressions: 0, clicks: 0, conversions: 0 }
      );

      // 평균 계산
      const ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
      const cvr = totals.clicks > 0 ? (totals.conversions / totals.clicks) * 100 : 0;
      const cpa = totals.conversions > 0 ? totals.spend / totals.conversions : 0;
      const roas = totals.spend > 0 ? (totals.conversions * 100) / totals.spend : 0; // 가정: 전환당 100원 수익

      return {
        id: creative.id,
        tiktokCreativeId: creative.tiktokCreativeId,
        type: creative.type,
        thumbnailUrl: creative.thumbnailUrl,
        videoUrl: creative.videoUrl,
        imageUrl: creative.imageUrl,
        duration: creative.duration,
        tags: creative.tags,
        hookScore: creative.hookScore,
        metrics: {
          spend: totals.spend,
          impressions: totals.impressions,
          clicks: totals.clicks,
          conversions: totals.conversions,
          ctr: Number(ctr.toFixed(2)),
          cvr: Number(cvr.toFixed(2)),
          cpa: Math.round(cpa),
          roas: Number(roas.toFixed(2)),
        },
        fatigue: latestFatigue
          ? {
              index: latestFatigue.fatigueIndex,
              trend: latestFatigue.performanceTrend,
              daysActive: latestFatigue.daysActive,
              recommendedAction: latestFatigue.recommendedAction,
            }
          : null,
        score: creative.hookScore
          ? {
              overall: creative.hookScore,
              grade:
                creative.hookScore >= 80
                  ? 'S'
                  : creative.hookScore >= 70
                  ? 'A'
                  : creative.hookScore >= 60
                  ? 'B'
                  : creative.hookScore >= 50
                  ? 'C'
                  : creative.hookScore >= 40
                  ? 'D'
                  : 'F',
            }
          : null,
      };
    });

    // 등급 분포 계산
    const gradeDistribution = creativesWithMetrics.reduce(
      (acc, c) => {
        if (c.score?.grade) {
          acc[c.score.grade as keyof typeof acc]++;
        }
        return acc;
      },
      { S: 0, A: 0, B: 0, C: 0, D: 0, F: 0 }
    );

    return NextResponse.json({
      success: true,
      data: {
        creatives: creativesWithMetrics,
        summary: {
          total: creatives.length,
          gradeDistribution,
        },
        pagination: {
          total: creatives.length,
        },
      },
    });
  } catch (error) {
    console.error('Campaign creatives fetch error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch creatives' } },
      { status: 500 }
    );
  }
}
