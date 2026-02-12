import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { createTikTokClient } from '@/lib/tiktok/client';
import { Campaign, MetricLevel } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { accountId: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const syncMetrics = searchParams.get('metrics') !== 'false'; // 기본값: true
    const days = Math.min(parseInt(searchParams.get('days') || '7', 10), 30);

    const account = await prisma.account.findUnique({
      where: { id: params.accountId },
    });

    if (!account) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Account not found' } },
        { status: 404 }
      );
    }

    // TikTok API 클라이언트 생성
    const client = createTikTokClient(account.accessToken, account.tiktokAdvId);

    // 캠페인 목록 조회
    const campaigns = await client.getAllCampaigns();

    // 캠페인 저장/업데이트
    const syncedCampaigns: Campaign[] = [];
    for (const campaign of campaigns) {
      const synced = await prisma.campaign.upsert({
        where: {
          accountId_tiktokCampaignId: {
            accountId: account.id,
            tiktokCampaignId: campaign.campaign_id,
          },
        },
        update: {
          name: campaign.campaign_name,
          objective: campaign.objective_type || 'UNKNOWN',
          status: campaign.operation_status || 'UNKNOWN',
          budget: campaign.budget || 0,
          budgetMode: campaign.budget_mode || 'UNKNOWN',
        },
        create: {
          accountId: account.id,
          tiktokCampaignId: campaign.campaign_id,
          name: campaign.campaign_name,
          objective: campaign.objective_type || 'UNKNOWN',
          status: campaign.operation_status || 'UNKNOWN',
          budget: campaign.budget || 0,
          budgetMode: campaign.budget_mode || 'UNKNOWN',
        },
      });
      syncedCampaigns.push(synced);
    }

    // 성과 데이터 동기화
    let syncedMetricsCount = 0;
    if (syncMetrics && syncedCampaigns.length > 0) {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const formatDate = (date: Date) => date.toISOString().split('T')[0];

      // TikTok 캠페인 ID → 내부 캠페인 ID 매핑 생성
      const campaignIdMap = new Map<string, string>();
      syncedCampaigns.forEach(c => {
        campaignIdMap.set(c.tiktokCampaignId, c.id);
      });

      // 캠페인별 성과 데이터 조회
      const campaignMetrics = await client.getPerformanceMetrics(
        formatDate(startDate),
        formatDate(endDate),
        'CAMPAIGN'
      );

      // 성과 데이터를 DB에 저장 (upsert)
      for (const metric of campaignMetrics) {
        // campaign_id가 없으면 스킵
        if (!metric.campaign_id) continue;

        const internalCampaignId = campaignIdMap.get(metric.campaign_id);
        if (!internalCampaignId) continue;

        const metricDate = new Date(metric.date);

        // 기존 메트릭 확인
        const existingMetric = await prisma.performanceMetric.findFirst({
          where: {
            accountId: account.id,
            campaignId: internalCampaignId,
            date: metricDate,
            level: 'CAMPAIGN',
            adGroupId: null,
            adId: null,
            creativeId: null,
          },
        });

        if (existingMetric) {
          // 업데이트
          await prisma.performanceMetric.update({
            where: { id: existingMetric.id },
            data: {
              spend: metric.spend,
              impressions: metric.impressions,
              clicks: metric.clicks,
              conversions: metric.conversions,
              ctr: metric.ctr,
              cpc: metric.cpc,
              cpm: metric.cpm,
              cvr: metric.cvr,
              cpa: metric.cpa,
              roas: metric.roas,
            },
          });
        } else {
          // 생성
          await prisma.performanceMetric.create({
            data: {
              accountId: account.id,
              campaignId: internalCampaignId,
              date: metricDate,
              level: 'CAMPAIGN',
              spend: metric.spend,
              impressions: metric.impressions,
              clicks: metric.clicks,
              conversions: metric.conversions,
              ctr: metric.ctr,
              cpc: metric.cpc,
              cpm: metric.cpm,
              cvr: metric.cvr,
              cpa: metric.cpa,
              roas: metric.roas,
            },
          });
        }
        syncedMetricsCount++;
      }
    }

    // 계정 마지막 동기화 시간 업데이트
    await prisma.account.update({
      where: { id: account.id },
      data: { lastSyncAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      data: {
        syncedCampaigns: syncedCampaigns.length,
        syncedMetrics: syncedMetricsCount,
        campaigns: syncedCampaigns,
      },
    });
  } catch (error) {
    console.error('Error syncing data:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SYNC_ERROR',
          message: error instanceof Error ? error.message : 'Failed to sync data',
        },
      },
      { status: 500 }
    );
  }
}
