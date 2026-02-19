/**
 * API 타입 정의
 *
 * 프론트엔드에서 사용하는 API 응답 타입들
 */

// ============================================================
// 기본 API 응답 타입
// ============================================================

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
    retryAfter?: number;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ============================================================
// 계정 관련 타입
// ============================================================

export type AccountStatus = 'ACTIVE' | 'PAUSED' | 'DISCONNECTED';

export interface Account {
  id: string;
  name: string;
  tiktokAdvId: string;
  clientId: string;
  clientName?: string;
  status: AccountStatus;
  lastSyncAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AccountWithMetrics extends Account {
  metrics: {
    spend: number;
    impressions: number;
    clicks: number;
    conversions: number;
    ctr: number;
    cvr: number;
    cpa: number;
    roas: number;
  };
}

// ============================================================
// 캠페인 관련 타입
// ============================================================

export interface Campaign {
  id: string;
  accountId: string;
  tiktokCampaignId: string;
  name: string;
  status: string;
  objective: string;
  budget: number;
  budgetMode: 'DAILY' | 'LIFETIME';
  adGroupCount?: number;
  creativeCount?: number;
  metrics?: CampaignMetrics;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignMetrics {
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  cvr: number;
  cpa: number;
  roas: number;
}

// ============================================================
// 광고그룹 관련 타입
// ============================================================

export interface AdGroup {
  id: string;
  campaignId: string;
  tiktokAdGroupId: string;
  name: string;
  status: string;
  bidStrategy: string;
  bidAmount: number | null;
  targeting: Record<string, unknown>;
  adCount?: number;
  metrics?: CampaignMetrics;
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// 광고 관련 타입
// ============================================================

export interface Ad {
  id: string;
  adGroupId: string;
  tiktokAdId: string;
  name: string;
  status: string;
  creativeId: string | null;
  metrics?: CampaignMetrics;
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// 크리에이티브 관련 타입
// ============================================================

export type CreativeType = 'VIDEO' | 'IMAGE' | 'CAROUSEL';
export type PerformanceTrend = 'RISING' | 'STABLE' | 'DECLINING' | 'EXHAUSTED';

export interface Creative {
  id: string;
  tiktokCreativeId: string;
  type: CreativeType;
  thumbnailUrl: string | null;
  videoUrl: string | null;
  imageUrl: string | null;
  duration: number | null;
  tags: string[] | null;
  hookScore: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreativeWithFatigue extends Creative {
  fatigueIndex: number | null;
  performanceTrend: PerformanceTrend | null;
  daysActive: number | null;
  recommendedAction: string | null;
}

// ============================================================
// 인사이트 관련 타입
// ============================================================

export type InsightType = 'DAILY_SUMMARY' | 'ANOMALY' | 'TREND' | 'CREATIVE' | 'PREDICTION';
export type Severity = 'INFO' | 'WARNING' | 'CRITICAL';

export interface KeyFinding {
  finding: string;
  impact: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  metric: string;
  change: number;
  evidence?: string;
}

export interface Insight {
  id: string;
  accountId: string;
  campaignId?: string;
  creativeId?: string;
  type: InsightType;
  severity: Severity;
  title: string;
  summary: string;
  details: {
    keyFindings?: KeyFinding[];
    rootCause?: Array<{
      factor: string;
      contribution: number;
      evidence: string;
    }>;
    recommendations?: string[];
  };
  metrics?: Record<string, number>;
  isRead: boolean;
  generatedAt: string;
  expiresAt: string | null;
}

// ============================================================
// 전략 관련 타입
// ============================================================

export type StrategyType = 'BUDGET' | 'CAMPAIGN' | 'TARGETING' | 'CREATIVE' | 'BIDDING';
export type Priority = 'HIGH' | 'MEDIUM' | 'LOW';
export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';
export type StrategyStatus = 'PENDING' | 'ACCEPTED' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED' | 'EXPIRED';

export interface ActionItem {
  action: string;
  target: string;
  targetId?: string;
  currentValue?: string | number;
  suggestedValue?: string | number;
  reason: string;
}

export interface ExpectedImpact {
  metric: string;
  currentValue: number;
  expectedValue: number;
  changePercent: number;
  confidence: number;
}

export interface Strategy {
  id: string;
  accountId: string;
  campaignId?: string;
  creativeId?: string;
  insightId?: string;
  type: StrategyType;
  priority: Priority;
  difficulty: Difficulty;
  status: StrategyStatus;
  title: string;
  description: string;
  actionItems: ActionItem[];
  expectedImpact: ExpectedImpact;
  acceptedAt?: string;
  completedAt?: string;
  rejectedReason?: string;
  actualResult?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// 메트릭 관련 타입
// ============================================================

export type MetricLevel = 'ACCOUNT' | 'CAMPAIGN' | 'ADGROUP' | 'AD' | 'CREATIVE';

export interface PerformanceMetric {
  id: string;
  accountId: string;
  campaignId?: string;
  adGroupId?: string;
  adId?: string;
  creativeId?: string;
  date: string;
  level: MetricLevel;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number | null;
  cvr: number | null;
  cpc: number | null;
  cpm: number | null;
  cpa: number | null;
  roas: number | null;
  videoViews?: number;
  videoWatched2s?: number;
  videoWatched6s?: number;
  avgVideoPlayTime?: number;
}

export interface DailyMetric {
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr?: number;
  cpa?: number;
  roas?: number;
}

// ============================================================
// 리포트 관련 타입
// ============================================================

export type ReportType = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'CUSTOM';
export type ReportStatus = 'PENDING' | 'GENERATING' | 'COMPLETED' | 'FAILED';

export interface Report {
  id: string;
  accountId: string;
  type: ReportType;
  title: string;
  status: ReportStatus;
  periodStart: string;
  periodEnd: string;
  content?: Record<string, unknown>;
  fileUrl?: string;
  fileSize?: number;
  errorMessage?: string;
  createdAt: string;
  completedAt?: string;
}

// ============================================================
// 알림 관련 타입
// ============================================================

export type NotificationType = 'INSIGHT' | 'STRATEGY' | 'ANOMALY' | 'REPORT' | 'SYSTEM';

export interface Notification {
  id: string;
  userId: string;
  accountId?: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}
