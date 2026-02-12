import type {
  TikTokAdvertiser,
  TikTokCampaign,
  TikTokAdGroup,
  TikTokAd,
  TikTokCreative,
  TikTokMetrics,
} from '@/types';

const TIKTOK_API_BASE = 'https://business-api.tiktok.com/open_api/v1.3';

interface TikTokApiResponse<T> {
  code: number;
  message: string;
  data: T;
  request_id: string;
}

interface TikTokListResponse<T> {
  list: T[];
  page_info: {
    page: number;
    page_size: number;
    total_page: number;
    total_number: number;
  };
}

export class TikTokClient {
  private accessToken: string;
  private advertiserId: string;
  private requestQueue: Promise<any> = Promise.resolve();
  private requestCount = 0;
  private resetTime = Date.now() + 60000; // Reset every minute

  constructor(accessToken: string, advertiserId: string) {
    this.accessToken = accessToken;
    this.advertiserId = advertiserId;
  }

  private async rateLimit(): Promise<void> {
    // TikTok API rate limit: 10 requests per second
    const now = Date.now();
    if (now > this.resetTime) {
      this.requestCount = 0;
      this.resetTime = now + 60000;
    }

    if (this.requestCount >= 600) {
      // 600 requests per minute = 10 per second
      const waitTime = this.resetTime - now;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
      this.requestCount = 0;
      this.resetTime = Date.now() + 60000;
    }

    this.requestCount++;
  }

  private async request<T>(
    endpoint: string,
    method: 'GET' | 'POST' = 'GET',
    params?: Record<string, unknown>
  ): Promise<T> {
    // Apply rate limiting
    await this.rateLimit();

    let url = `${TIKTOK_API_BASE}${endpoint}`;

    const headers: HeadersInit = {
      'Access-Token': this.accessToken,
      'Content-Type': 'application/json',
    };

    const options: RequestInit = {
      method,
      headers,
    };

    if (params) {
      if (method === 'GET') {
        // GET 요청 시 쿼리 파라미터로 변환
        const searchParams = new URLSearchParams();
        for (const [key, value] of Object.entries(params)) {
          if (value !== undefined && value !== null) {
            searchParams.append(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
          }
        }
        url += (endpoint.includes('?') ? '&' : '?') + searchParams.toString();
      } else {
        options.body = JSON.stringify(params);
      }
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      throw new Error(`TikTok API Error: ${response.status} ${response.statusText}`);
    }

    const data: TikTokApiResponse<T> = await response.json();

    if (data.code !== 0) {
      throw new Error(`TikTok API Error: ${data.code} - ${data.message}`);
    }

    return data.data;
  }

  // ─────────────────────────────────────────
  // Advertiser
  // ─────────────────────────────────────────

  async getAdvertiserInfo(): Promise<TikTokAdvertiser> {
    const data = await this.request<{ list: TikTokAdvertiser[] }>(
      `/advertiser/info/?advertiser_ids=["${this.advertiserId}"]`
    );
    return data.list[0];
  }

  // ─────────────────────────────────────────
  // Campaigns
  // ─────────────────────────────────────────

  async getCampaigns(page = 1, pageSize = 100): Promise<TikTokListResponse<TikTokCampaign>> {
    return this.request<TikTokListResponse<TikTokCampaign>>(
      `/campaign/get/`,
      'GET',
      {
        advertiser_id: this.advertiserId,
        page,
        page_size: pageSize,
      }
    );
  }

  async getAllCampaigns(): Promise<TikTokCampaign[]> {
    const campaigns: TikTokCampaign[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const response = await this.getCampaigns(page);
      campaigns.push(...response.list);
      hasMore = page < response.page_info.total_page;
      page++;
    }

    return campaigns;
  }

  // ─────────────────────────────────────────
  // Ad Groups
  // ─────────────────────────────────────────

  async getAdGroups(
    campaignIds?: string[],
    page = 1,
    pageSize = 100
  ): Promise<TikTokListResponse<TikTokAdGroup>> {
    const body: Record<string, unknown> = {
      advertiser_id: this.advertiserId,
      page,
      page_size: pageSize,
    };

    if (campaignIds && campaignIds.length > 0) {
      body.filtering = { campaign_ids: campaignIds };
    }

    return this.request<TikTokListResponse<TikTokAdGroup>>(
      `/adgroup/get/`,
      'GET',
      body
    );
  }

  async getAllAdGroups(campaignIds?: string[]): Promise<TikTokAdGroup[]> {
    const adGroups: TikTokAdGroup[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const response = await this.getAdGroups(campaignIds, page);
      adGroups.push(...response.list);
      hasMore = page < response.page_info.total_page;
      page++;
    }

    return adGroups;
  }

  // ─────────────────────────────────────────
  // Ads
  // ─────────────────────────────────────────

  async getAds(
    adGroupIds?: string[],
    page = 1,
    pageSize = 100
  ): Promise<TikTokListResponse<TikTokAd>> {
    const body: Record<string, unknown> = {
      advertiser_id: this.advertiserId,
      page,
      page_size: pageSize,
    };

    if (adGroupIds && adGroupIds.length > 0) {
      body.filtering = { adgroup_ids: adGroupIds };
    }

    return this.request<TikTokListResponse<TikTokAd>>(`/ad/get/`, 'GET', body);
  }

  async getAllAds(adGroupIds?: string[]): Promise<TikTokAd[]> {
    const ads: TikTokAd[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const response = await this.getAds(adGroupIds, page);
      ads.push(...response.list);
      hasMore = page < response.page_info.total_page;
      page++;
    }

    return ads;
  }

  // ─────────────────────────────────────────
  // Creatives
  // ─────────────────────────────────────────

  async getCreatives(
    adIds?: string[],
    page = 1,
    pageSize = 100
  ): Promise<TikTokListResponse<TikTokCreative>> {
    const body: Record<string, unknown> = {
      advertiser_id: this.advertiserId,
      page,
      page_size: pageSize,
    };

    if (adIds && adIds.length > 0) {
      body.filtering = { ad_ids: adIds };
    }

    return this.request<TikTokListResponse<TikTokCreative>>(
      `/creative/get/`,
      'GET',
      body
    );
  }

  async getAllCreatives(adIds?: string[]): Promise<TikTokCreative[]> {
    const creatives: TikTokCreative[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const response = await this.getCreatives(adIds, page);
      creatives.push(...response.list);
      hasMore = page < response.page_info.total_page;
      page++;
    }

    return creatives;
  }

  // ─────────────────────────────────────────
  // Reports
  // ─────────────────────────────────────────

  async getReport(params: {
    reportType: 'BASIC' | 'AUDIENCE' | 'PLAYABLE';
    dimensions: string[];
    metrics: string[];
    dataLevel: 'AUCTION_ADVERTISER' | 'AUCTION_CAMPAIGN' | 'AUCTION_ADGROUP' | 'AUCTION_AD';
    startDate: string;
    endDate: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ list: Record<string, unknown>[] }> {
    return this.request<{ list: Record<string, unknown>[] }>(
      `/report/integrated/get/`,
      'GET',
      {
        advertiser_id: this.advertiserId,
        report_type: params.reportType,
        dimensions: params.dimensions,
        metrics: params.metrics,
        data_level: params.dataLevel,
        start_date: params.startDate,
        end_date: params.endDate,
        page: params.page || 1,
        page_size: params.pageSize || 1000,
      }
    );
  }

  async getPerformanceMetrics(
    startDate: string,
    endDate: string,
    level: 'ADVERTISER' | 'CAMPAIGN' | 'ADGROUP' | 'AD' = 'CAMPAIGN'
  ): Promise<TikTokMetrics[]> {
    const dataLevelMap = {
      ADVERTISER: 'AUCTION_ADVERTISER',
      CAMPAIGN: 'AUCTION_CAMPAIGN',
      ADGROUP: 'AUCTION_ADGROUP',
      AD: 'AUCTION_AD',
    } as const;

    const dimensionMap = {
      ADVERTISER: ['advertiser_id'],
      CAMPAIGN: ['campaign_id'],
      ADGROUP: ['adgroup_id'],
      AD: ['ad_id'],
    } as const;

    const response = await this.getReport({
      reportType: 'BASIC',
      dimensions: [...dimensionMap[level], 'stat_time_day'],
      metrics: [
        'spend',
        'impressions',
        'clicks',
        'conversion',
        'ctr',
        'cpc',
        'cpm',
        'cost_per_conversion',
        'video_play_actions',
        'video_watched_2s',
        'video_watched_6s',
        'average_video_play',
      ],
      dataLevel: dataLevelMap[level],
      startDate,
      endDate,
    });

    const results = response.list.map((item) => {
      const metrics = (item as { metrics: Record<string, string> }).metrics;
      const dimensions = (item as { dimensions: Record<string, string> }).dimensions;
      const spend = Number(metrics.spend) || 0;
      const impressions = Number(metrics.impressions) || 0;
      const clicks = Number(metrics.clicks) || 0;
      const conversions = Number(metrics.conversion) || 0;

      // 날짜 형식 표준화: "2026-02-06 00:00:00" → "2026-02-06"
      const rawDate = dimensions.stat_time_day || '';
      const date = rawDate.split(' ')[0];

      return {
        date,
        spend,
        impressions,
        clicks,
        conversions,
        ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
        cpc: clicks > 0 ? spend / clicks : 0,
        cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
        cvr: clicks > 0 ? (conversions / clicks) * 100 : 0,
        cpa: conversions > 0 ? spend / conversions : 0,
        roas: spend > 0 ? (conversions * 50000) / spend : 0, // 가정: 전환당 50,000원
        video_play_actions: Number(metrics.video_play_actions) || undefined,
        video_watched_2s: Number(metrics.video_watched_2s) || undefined,
        video_watched_6s: Number(metrics.video_watched_6s) || undefined,
        average_video_play: Number(metrics.average_video_play) || undefined,
        // 레벨별 ID 추가
        campaign_id: dimensions.campaign_id,
        adgroup_id: dimensions.adgroup_id,
        ad_id: dimensions.ad_id,
        advertiser_id: dimensions.advertiser_id,
      };
    });

    // 날짜 순으로 정렬 (오름차순)
    return results.sort((a, b) => a.date.localeCompare(b.date));
  }
}

// Factory function
export function createTikTokClient(
  accessToken: string,
  advertiserId: string
): TikTokClient {
  return new TikTokClient(accessToken, advertiserId);
}
