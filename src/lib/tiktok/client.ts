import type {
  TikTokAdvertiser,
  TikTokCampaign,
  TikTokAdGroup,
  TikTokAd,
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

  constructor(accessToken: string, advertiserId: string) {
    this.accessToken = accessToken;
    this.advertiserId = advertiserId;
  }

  private async request<T>(
    endpoint: string,
    method: 'GET' | 'POST' = 'GET',
    body?: Record<string, unknown>
  ): Promise<T> {
    const url = `${TIKTOK_API_BASE}${endpoint}`;

    const headers: HeadersInit = {
      'Access-Token': this.accessToken,
      'Content-Type': 'application/json',
    };

    const options: RequestInit = {
      method,
      headers,
    };

    if (body) {
      options.body = JSON.stringify(body);
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
      'POST',
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
      'POST',
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

    return this.request<TikTokListResponse<TikTokAd>>(`/ad/get/`, 'POST', body);
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
      'POST',
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

    return response.list.map((item) => ({
      date: item.stat_time_day as string,
      spend: Number(item.spend) || 0,
      impressions: Number(item.impressions) || 0,
      clicks: Number(item.clicks) || 0,
      conversions: Number(item.conversion) || 0,
      ctr: Number(item.ctr) || 0,
      cpc: Number(item.cpc) || 0,
      cpm: Number(item.cpm) || 0,
      cvr: item.conversion && item.clicks
        ? (Number(item.conversion) / Number(item.clicks)) * 100
        : 0,
      cpa: Number(item.cost_per_conversion) || 0,
      video_play_actions: Number(item.video_play_actions) || undefined,
      video_watched_2s: Number(item.video_watched_2s) || undefined,
      video_watched_6s: Number(item.video_watched_6s) || undefined,
      average_video_play: Number(item.average_video_play) || undefined,
    }));
  }
}

// Factory function
export function createTikTokClient(
  accessToken: string,
  advertiserId: string
): TikTokClient {
  return new TikTokClient(accessToken, advertiserId);
}
