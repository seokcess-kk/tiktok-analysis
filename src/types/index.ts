// ─────────────────────────────────────────
// TikTok API Types
// ─────────────────────────────────────────

export interface TikTokAdvertiser {
  advertiser_id: string;
  advertiser_name: string;
  timezone: string;
  currency: string;
  status: string;
}

export interface TikTokCampaign {
  campaign_id: string;
  campaign_name: string;
  advertiser_id: string;
  objective_type?: string;
  budget?: number;
  budget_mode?: string;
  status?: string;
  operation_status?: string;
  create_time?: string;
  modify_time?: string;
}

export interface TikTokAdGroup {
  adgroup_id: string;
  adgroup_name: string;
  campaign_id: string;
  advertiser_id: string;
  bid_type: string;
  bid_price: number;
  status: string;
  targeting: Record<string, unknown>;
}

export interface TikTokAd {
  ad_id: string;
  ad_name: string;
  adgroup_id: string;
  advertiser_id: string;
  status: string;
  creative_type: string;
}

export interface TikTokMetrics {
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  cpc: number;
  cpm: number;
  cvr: number;
  cpa: number;
  video_play_actions?: number;
  video_watched_2s?: number;
  video_watched_6s?: number;
  average_video_play?: number;
}

// ─────────────────────────────────────────
// App Types
// ─────────────────────────────────────────

export interface Account {
  id: string;
  tiktokAdvId: string;
  name: string;
  status: 'ACTIVE' | 'PAUSED' | 'DISCONNECTED';
  client: {
    id: string;
    name: string;
    industry?: string;
  };
  lastSyncAt?: Date;
}

export interface Creative {
  id: string;
  tiktokCreativeId: string;
  type: 'VIDEO' | 'IMAGE' | 'CAROUSEL';
  thumbnailUrl?: string;
  videoUrl?: string;
  duration?: number;
  tags?: string[];
  hookScore?: number;
  metrics?: CreativeMetrics;
  fatigue?: CreativeFatigue;
}

export interface CreativeMetrics {
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  cvr: number;
  cpa: number;
  roas: number;
  videoViews?: number;
  videoWatched2s?: number;
  videoWatched6s?: number;
  avgVideoPlayTime?: number;
}

export interface CreativeFatigue {
  index: number;
  trend: 'RISING' | 'STABLE' | 'DECLINING' | 'EXHAUSTED';
  peakDate?: Date;
  daysActive: number;
  recommendedAction?: string;
}

export interface CreativeScore {
  overall: number;
  breakdown: {
    efficiency: number;
    scale: number;
    sustainability: number;
    engagement: number;
  };
  rank: number;
  percentile: number;
}

// ─────────────────────────────────────────
// AI Types
// ─────────────────────────────────────────

export interface AIInsight {
  id: string;
  type: 'DAILY_SUMMARY' | 'ANOMALY' | 'TREND' | 'CREATIVE' | 'PREDICTION';
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  title: string;
  summary: string;
  keyFindings: KeyFinding[];
  rootCause?: RootCause[];
  recommendations: string[];
  generatedAt: Date;
}

export interface KeyFinding {
  finding: string;
  impact: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  metric: string;
  change: number;
  evidence?: string;
}

export interface RootCause {
  factor: string;
  contribution: number;
  evidence: string;
}

export interface AIStrategy {
  id: string;
  type: 'BUDGET' | 'CAMPAIGN' | 'TARGETING' | 'CREATIVE' | 'BIDDING';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  description: string;
  actionItems: ActionItem[];
  expectedImpact: ExpectedImpact;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  status: 'PENDING' | 'ACCEPTED' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED';
}

export interface ActionItem {
  action: string;
  target: string;
  targetId: string;
  currentValue?: string;
  suggestedValue: string;
  reason: string;
}

export interface ExpectedImpact {
  metric: string;
  currentValue: number;
  expectedValue: number;
  changePercent: number;
  confidence: number;
}

// ─────────────────────────────────────────
// API Response Types
// ─────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

// ─────────────────────────────────────────
// Filter & Query Types
// ─────────────────────────────────────────

export interface DateRange {
  startDate: string;
  endDate: string;
}

export interface MetricsFilter extends DateRange {
  level?: 'ACCOUNT' | 'CAMPAIGN' | 'ADGROUP' | 'AD' | 'CREATIVE';
  campaignIds?: string[];
  adGroupIds?: string[];
}

export interface CreativesFilter extends DateRange {
  type?: 'VIDEO' | 'IMAGE' | 'CAROUSEL';
  sortBy?: 'spend' | 'ctr' | 'cvr' | 'roas' | 'fatigueIndex' | 'score';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}
