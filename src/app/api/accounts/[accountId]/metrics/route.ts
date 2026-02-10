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

    // 성과 데이터 조회
    const metrics = await client.getPerformanceMetrics(
      formatDate(startDate),
      formatDate(endDate),
      'ADVERTISER'
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
