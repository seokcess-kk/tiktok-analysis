import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { createTikTokClient } from '@/lib/tiktok/client';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { accountId: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const days = Math.min(parseInt(searchParams.get('days') || '7', 10), 30); // 최대 30일
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const level = (searchParams.get('level') || 'ADVERTISER') as 'ADVERTISER' | 'CAMPAIGN' | 'ADGROUP' | 'AD';
    const campaignId = searchParams.get('campaignId');
    const adGroupId = searchParams.get('adGroupId');

    const account = await prisma.account.findUnique({
      where: { id: params.accountId },
    });

    if (!account) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Account not found' } },
        { status: 404 }
      );
    }

    // 날짜 범위 계산
    const formatDate = (date: Date) => date.toISOString().split('T')[0];

    let startDate: Date;
    let endDate: Date;

    if (startDateParam && endDateParam) {
      // 직접 날짜 지정
      startDate = new Date(startDateParam);
      endDate = new Date(endDateParam);
    } else {
      // days 기반 계산
      endDate = new Date();
      startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
    }

    // TikTok API 클라이언트 생성
    const client = createTikTokClient(account.accessToken, account.tiktokAdvId);

    // 성과 데이터 조회 (레벨별)
    const metrics = await client.getPerformanceMetrics(
      formatDate(startDate),
      formatDate(endDate),
      level
    );

    // 집계 계산
    const totals = metrics.reduce(
      (acc, m) => ({
        spend: acc.spend + m.spend,
        impressions: acc.impressions + m.impressions,
        clicks: acc.clicks + m.clicks,
        conversions: acc.conversions + m.conversions,
      }),
      { spend: 0, impressions: 0, clicks: 0, conversions: 0 }
    );

    const avgCtr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
    const avgCpc = totals.clicks > 0 ? totals.spend / totals.clicks : 0;
    const avgCpa = totals.conversions > 0 ? totals.spend / totals.conversions : 0;
    const roas = totals.spend > 0 ? (totals.conversions * 50000) / totals.spend : 0; // 가정: 전환당 50,000원

    // Period comparison if requested
    const comparePeriod = searchParams.get('compare') === 'true';
    let comparison: {
      period: { startDate: string; endDate: string };
      totals: { spend: number; impressions: number; clicks: number; conversions: number };
      averages: { ctr: number; cpc: number; cpa: number; roas: number };
      changes: { spend: number; impressions: number; clicks: number; conversions: number; ctr: number; cpc: number; cpa: number; roas: number };
    } | null = null;

    if (comparePeriod) {
      // Calculate previous period (same duration)
      const periodDuration = endDate.getTime() - startDate.getTime();
      const prevEndDate = new Date(startDate.getTime() - 1);
      const prevStartDate = new Date(prevEndDate.getTime() - periodDuration);

      const prevMetrics = await client.getPerformanceMetrics(
        formatDate(prevStartDate),
        formatDate(prevEndDate),
        level
      );

      const prevTotals = prevMetrics.reduce(
        (acc, m) => ({
          spend: acc.spend + m.spend,
          impressions: acc.impressions + m.impressions,
          clicks: acc.clicks + m.clicks,
          conversions: acc.conversions + m.conversions,
        }),
        { spend: 0, impressions: 0, clicks: 0, conversions: 0 }
      );

      const prevCtr = prevTotals.impressions > 0 ? (prevTotals.clicks / prevTotals.impressions) * 100 : 0;
      const prevCpc = prevTotals.clicks > 0 ? prevTotals.spend / prevTotals.clicks : 0;
      const prevCpa = prevTotals.conversions > 0 ? prevTotals.spend / prevTotals.conversions : 0;
      const prevRoas = prevTotals.spend > 0 ? (prevTotals.conversions * 50000) / prevTotals.spend : 0;

      comparison = {
        period: {
          startDate: formatDate(prevStartDate),
          endDate: formatDate(prevEndDate),
        },
        totals: prevTotals,
        averages: {
          ctr: prevCtr,
          cpc: prevCpc,
          cpa: prevCpa,
          roas: prevRoas,
        },
        changes: {
          spend: prevTotals.spend > 0 ? ((totals.spend - prevTotals.spend) / prevTotals.spend) * 100 : 0,
          impressions: prevTotals.impressions > 0 ? ((totals.impressions - prevTotals.impressions) / prevTotals.impressions) * 100 : 0,
          clicks: prevTotals.clicks > 0 ? ((totals.clicks - prevTotals.clicks) / prevTotals.clicks) * 100 : 0,
          conversions: prevTotals.conversions > 0 ? ((totals.conversions - prevTotals.conversions) / prevTotals.conversions) * 100 : 0,
          ctr: prevCtr > 0 ? ((avgCtr - prevCtr) / prevCtr) * 100 : 0,
          cpc: prevCpc > 0 ? ((avgCpc - prevCpc) / prevCpc) * 100 : 0,
          cpa: prevCpa > 0 ? ((avgCpa - prevCpa) / prevCpa) * 100 : 0,
          roas: prevRoas > 0 ? ((roas - prevRoas) / prevRoas) * 100 : 0,
        },
      };
    }

    return NextResponse.json({
      success: true,
      data: {
        period: { startDate: formatDate(startDate), endDate: formatDate(endDate), days },
        totals: {
          spend: totals.spend,
          impressions: totals.impressions,
          clicks: totals.clicks,
          conversions: totals.conversions,
        },
        averages: {
          ctr: avgCtr,
          cpc: avgCpc,
          cpa: avgCpa,
          roas: roas,
        },
        daily: metrics,
        comparison,
      },
    });
  } catch (error) {
    console.error('Error fetching metrics:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'API_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch metrics',
        },
      },
      { status: 500 }
    );
  }
}
