import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { createTikTokClient } from '@/lib/tiktok/client';
import { Campaign, AdGroup, Ad, Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { accountId: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const syncMetrics = searchParams.get('metrics') !== 'false'; // 기본값: true
    const syncAdGroups = searchParams.get('adgroups') !== 'false'; // 기본값: true
    const syncAds = searchParams.get('ads') !== 'false'; // 기본값: true
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

    // ─────────────────────────────────────────
    // 1. 캠페인 동기화
    // ─────────────────────────────────────────
    const campaigns = await client.getAllCampaigns();

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

    // TikTok 캠페인 ID → 내부 캠페인 ID 매핑
    const campaignIdMap = new Map<string, string>();
    syncedCampaigns.forEach(c => {
      campaignIdMap.set(c.tiktokCampaignId, c.id);
    });

    // ─────────────────────────────────────────
    // 2. 광고그룹 동기화
    // ─────────────────────────────────────────
    const syncedAdGroups: AdGroup[] = [];
    const adGroupIdMap = new Map<string, string>(); // TikTok AdGroup ID → 내부 AdGroup ID

    if (syncAdGroups && syncedCampaigns.length > 0) {
      const tiktokCampaignIds = campaigns.map(c => c.campaign_id);
      const adGroups = await client.getAllAdGroups(tiktokCampaignIds);

      for (const adGroup of adGroups) {
        const internalCampaignId = campaignIdMap.get(adGroup.campaign_id);
        if (!internalCampaignId) continue;

        const synced = await prisma.adGroup.upsert({
          where: {
            campaignId_tiktokAdGroupId: {
              campaignId: internalCampaignId,
              tiktokAdGroupId: adGroup.adgroup_id,
            },
          },
          update: {
            name: adGroup.adgroup_name,
            status: adGroup.status || 'UNKNOWN',
            bidStrategy: adGroup.bid_type || 'UNKNOWN',
            bidAmount: adGroup.bid_price || null,
            targeting: (adGroup.targeting || {}) as Prisma.InputJsonValue,
          },
          create: {
            campaignId: internalCampaignId,
            tiktokAdGroupId: adGroup.adgroup_id,
            name: adGroup.adgroup_name,
            status: adGroup.status || 'UNKNOWN',
            bidStrategy: adGroup.bid_type || 'UNKNOWN',
            bidAmount: adGroup.bid_price || null,
            targeting: (adGroup.targeting || {}) as Prisma.InputJsonValue,
          },
        });
        syncedAdGroups.push(synced);
        adGroupIdMap.set(adGroup.adgroup_id, synced.id);
      }
    }

    // ─────────────────────────────────────────
    // 3. 광고 동기화
    // ─────────────────────────────────────────
    const syncedAds: Ad[] = [];

    if (syncAds && syncedAdGroups.length > 0) {
      const tiktokAdGroupIds = syncedAdGroups.map(ag => ag.tiktokAdGroupId);
      const ads = await client.getAllAds(tiktokAdGroupIds);

      for (const ad of ads) {
        const internalAdGroupId = adGroupIdMap.get(ad.adgroup_id);
        if (!internalAdGroupId) continue;

        const synced = await prisma.ad.upsert({
          where: {
            adGroupId_tiktokAdId: {
              adGroupId: internalAdGroupId,
              tiktokAdId: ad.ad_id,
            },
          },
          update: {
            name: ad.ad_name,
            status: ad.status || 'UNKNOWN',
          },
          create: {
            adGroupId: internalAdGroupId,
            tiktokAdId: ad.ad_id,
            name: ad.ad_name,
            status: ad.status || 'UNKNOWN',
          },
        });
        syncedAds.push(synced);
      }
    }

    // ─────────────────────────────────────────
    // 4. 성과 데이터 동기화
    // ─────────────────────────────────────────
    let syncedMetricsCount = 0;
    let syncedAdGroupMetricsCount = 0;
    let syncedAdMetricsCount = 0;

    // TikTok Ad ID → 내부 Ad ID 매핑
    const adIdMap = new Map<string, string>();
    const adAdGroupMap = new Map<string, string>(); // adId -> adGroupId
    syncedAds.forEach(ad => {
      adIdMap.set(ad.tiktokAdId, ad.id);
      adAdGroupMap.set(ad.id, ad.adGroupId);
    });

    if (syncMetrics && syncedCampaigns.length > 0) {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const formatDate = (date: Date) => date.toISOString().split('T')[0];

      // 4-1. 캠페인 레벨 성과 데이터
      const campaignMetrics = await client.getPerformanceMetrics(
        formatDate(startDate),
        formatDate(endDate),
        'CAMPAIGN'
      );

      for (const metric of campaignMetrics) {
        if (!metric.campaign_id) continue;

        const internalCampaignId = campaignIdMap.get(metric.campaign_id);
        if (!internalCampaignId) continue;

        const metricDate = new Date(metric.date);

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

      // 4-2. 광고그룹 레벨 성과 데이터
      if (syncedAdGroups.length > 0) {
        const adGroupMetrics = await client.getPerformanceMetrics(
          formatDate(startDate),
          formatDate(endDate),
          'ADGROUP'
        );

        for (const metric of adGroupMetrics) {
          if (!metric.adgroup_id) continue;

          const internalAdGroupId = adGroupIdMap.get(metric.adgroup_id);
          if (!internalAdGroupId) continue;

          // 광고그룹의 캠페인 ID 찾기
          const adGroup = syncedAdGroups.find(ag => ag.id === internalAdGroupId);
          if (!adGroup) continue;

          const metricDate = new Date(metric.date);

          const existingMetric = await prisma.performanceMetric.findFirst({
            where: {
              accountId: account.id,
              adGroupId: internalAdGroupId,
              date: metricDate,
              level: 'ADGROUP',
              adId: null,
              creativeId: null,
            },
          });

          if (existingMetric) {
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
            await prisma.performanceMetric.create({
              data: {
                accountId: account.id,
                campaignId: adGroup.campaignId,
                adGroupId: internalAdGroupId,
                date: metricDate,
                level: 'ADGROUP',
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
          syncedAdGroupMetricsCount++;
        }
      }

      // 4-3. 광고 레벨 성과 데이터
      if (syncedAds.length > 0) {
        const adMetrics = await client.getPerformanceMetrics(
          formatDate(startDate),
          formatDate(endDate),
          'AD'
        );

        for (const metric of adMetrics) {
          if (!metric.ad_id) continue;

          const internalAdId = adIdMap.get(metric.ad_id);
          if (!internalAdId) continue;

          // 광고의 광고그룹 ID 찾기
          const adGroupId = adAdGroupMap.get(internalAdId);
          if (!adGroupId) continue;

          // 광고그룹의 캠페인 ID 찾기
          const adGroup = syncedAdGroups.find(ag => ag.id === adGroupId);
          if (!adGroup) continue;

          const metricDate = new Date(metric.date);

          const existingMetric = await prisma.performanceMetric.findFirst({
            where: {
              accountId: account.id,
              adId: internalAdId,
              date: metricDate,
              level: 'AD',
              creativeId: null,
            },
          });

          if (existingMetric) {
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
            await prisma.performanceMetric.create({
              data: {
                accountId: account.id,
                campaignId: adGroup.campaignId,
                adGroupId: adGroupId,
                adId: internalAdId,
                date: metricDate,
                level: 'AD',
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
          syncedAdMetricsCount++;
        }
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
        syncedAdGroups: syncedAdGroups.length,
        syncedAds: syncedAds.length,
        summary: {
          campaigns: syncedCampaigns.length,
          adGroups: syncedAdGroups.length,
          ads: syncedAds.length,
          metrics: {
            campaign: syncedMetricsCount,
            adGroup: syncedAdGroupMetricsCount,
            ad: syncedAdMetricsCount,
            total: syncedMetricsCount + syncedAdGroupMetricsCount + syncedAdMetricsCount,
          },
        },
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
