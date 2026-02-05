/**
 * Creative Scorer
 * 소재 종합 점수 산정 알고리즘
 *
 * 종합 점수는 0-100 범위로 계산되며, 높을수록 성과가 좋은 소재
 *
 * 점수 구성:
 * - 효율성 (35%): CTR, CVR, CPA 기반
 * - 스케일 (25%): 노출수, 전환수 볼륨
 * - 지속가능성 (25%): 피로도 역수
 * - 인게이지먼트 (15%): 영상 시청 지표
 */

export type CreativeType = 'VIDEO' | 'IMAGE' | 'CAROUSEL';

export interface CreativeMetrics {
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  cvr: number;
  cpc: number;
  cpm: number;
  cpa: number;
  roas: number;
  // 영상 전용 메트릭
  videoViews?: number;
  videoWatched2s?: number;
  videoWatched6s?: number;
  avgVideoPlayTime?: number;
}

export interface CreativeFatigue {
  index: number;
  trend: string;
}

export interface CreativeWithMetrics {
  id: string;
  type: CreativeType;
  metrics: CreativeMetrics;
  fatigue?: CreativeFatigue | null;
}

export interface IndustryBenchmarks {
  ctr: number;
  cvr: number;
  cpa: number;
  avgImpressions: number;
  avgConversions: number;
  avgVideoPlayTime: number;
}

export interface ScoreBreakdown {
  efficiency: number;
  scale: number;
  sustainability: number;
  engagement: number;
}

export interface CreativeScore {
  overall: number; // 0-100 종합 점수
  breakdown: ScoreBreakdown;
  rank: number;
  percentile: number;
  grade: 'S' | 'A' | 'B' | 'C' | 'D' | 'F';
  recommendation: string;
}

// 가중치 상수
const WEIGHTS = {
  EFFICIENCY: 0.35,
  SCALE: 0.25,
  SUSTAINABILITY: 0.25,
  ENGAGEMENT: 0.15,
} as const;

// 효율성 세부 가중치
const EFFICIENCY_WEIGHTS = {
  CTR: 0.30,
  CVR: 0.40,
  CPA: 0.30,
} as const;

// 스케일 세부 가중치
const SCALE_WEIGHTS = {
  IMPRESSIONS: 0.40,
  CONVERSIONS: 0.60,
} as const;

// 인게이지먼트 세부 가중치
const ENGAGEMENT_WEIGHTS = {
  WATCH_RATE: 0.60,
  AVG_PLAY_TIME: 0.40,
} as const;

// 기본 벤치마크 (업종별로 조정 필요)
export const DEFAULT_BENCHMARKS: IndustryBenchmarks = {
  ctr: 1.0, // 1%
  cvr: 2.0, // 2%
  cpa: 10000, // 10,000원
  avgImpressions: 50000,
  avgConversions: 100,
  avgVideoPlayTime: 8, // 8초
};

/**
 * 벤치마크 대비 비율을 0-100 점수로 정규화
 * 벤치마크의 2배 이상이면 100점, 절반 이하이면 30점
 */
function normalizeScore(value: number, benchmark: number, inverse = false): number {
  if (benchmark === 0) return 50;

  let ratio = inverse ? benchmark / value : value / benchmark;

  // 비정상적인 값 처리
  if (!Number.isFinite(ratio) || ratio < 0) {
    ratio = 0;
  }

  // 비율을 점수로 변환 (선형 보간)
  if (ratio >= 2.0) return 100;
  if (ratio >= 1.5) return 85 + (ratio - 1.5) * 30; // 85-100
  if (ratio >= 1.2) return 75 + (ratio - 1.2) * 33.33; // 75-85
  if (ratio >= 1.0) return 65 + (ratio - 1.0) * 50; // 65-75
  if (ratio >= 0.8) return 55 + (ratio - 0.8) * 50; // 55-65
  if (ratio >= 0.6) return 45 + (ratio - 0.6) * 50; // 45-55
  if (ratio >= 0.4) return 35 + (ratio - 0.4) * 50; // 35-45
  if (ratio >= 0.2) return 20 + (ratio - 0.2) * 75; // 20-35
  return Math.max(0, ratio * 100); // 0-20
}

/**
 * 등급 결정
 */
function determineGrade(score: number): 'S' | 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 90) return 'S';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C';
  if (score >= 50) return 'D';
  return 'F';
}

/**
 * 점수 기반 권장 조치
 */
function getRecommendation(score: number, breakdown: ScoreBreakdown): string {
  const weakPoints: string[] = [];

  if (breakdown.efficiency < 50) weakPoints.push('효율성');
  if (breakdown.scale < 50) weakPoints.push('스케일');
  if (breakdown.sustainability < 50) weakPoints.push('지속가능성');
  if (breakdown.engagement < 50) weakPoints.push('인게이지먼트');

  if (score >= 80) {
    return '우수한 성과의 소재입니다. 예산을 증액하여 스케일업을 고려하세요.';
  }

  if (score >= 60) {
    if (weakPoints.length > 0) {
      return `양호한 소재이나 ${weakPoints.join(', ')} 개선이 필요합니다.`;
    }
    return '전반적으로 양호한 성과입니다. 지속적인 모니터링을 권장합니다.';
  }

  if (score >= 40) {
    if (weakPoints.length > 0) {
      return `${weakPoints.join(', ')} 지표가 낮습니다. 소재 개선 또는 교체를 검토하세요.`;
    }
    return '성과가 저조합니다. 타겟팅이나 소재 전략 점검이 필요합니다.';
  }

  return '성과가 매우 저조합니다. 소재 교체를 강력히 권장합니다.';
}

/**
 * 단일 소재 점수 계산
 */
export function scoreCreative(
  creative: CreativeWithMetrics,
  benchmarks: IndustryBenchmarks = DEFAULT_BENCHMARKS
): CreativeScore {
  const { metrics, fatigue, type } = creative;

  // 1. 효율성 점수 (CTR, CVR, CPA 기반)
  const ctrScore = normalizeScore(metrics.ctr, benchmarks.ctr);
  const cvrScore = normalizeScore(metrics.cvr, benchmarks.cvr);
  const cpaScore = normalizeScore(metrics.cpa, benchmarks.cpa, true); // CPA는 낮을수록 좋음

  const efficiency =
    ctrScore * EFFICIENCY_WEIGHTS.CTR +
    cvrScore * EFFICIENCY_WEIGHTS.CVR +
    cpaScore * EFFICIENCY_WEIGHTS.CPA;

  // 2. 스케일 점수 (노출, 전환 볼륨)
  const impressionScore = normalizeScore(metrics.impressions, benchmarks.avgImpressions);
  const conversionScore = normalizeScore(metrics.conversions, benchmarks.avgConversions);

  const scale =
    impressionScore * SCALE_WEIGHTS.IMPRESSIONS +
    conversionScore * SCALE_WEIGHTS.CONVERSIONS;

  // 3. 지속가능성 점수 (피로도 역수)
  // 피로도가 0이면 100점, 100이면 0점
  const sustainability = fatigue ? Math.max(0, 100 - fatigue.index) : 70; // 기본값 70

  // 4. 인게이지먼트 점수 (영상인 경우)
  let engagement = 50; // 기본값

  if (type === 'VIDEO' && metrics.videoViews && metrics.videoViews > 0) {
    // 6초 이상 시청률
    const watchRate = metrics.videoWatched6s
      ? (metrics.videoWatched6s / metrics.videoViews) * 100
      : 50;

    // 평균 재생 시간 점수
    const avgPlayScore = metrics.avgVideoPlayTime
      ? normalizeScore(metrics.avgVideoPlayTime, benchmarks.avgVideoPlayTime)
      : 50;

    engagement =
      watchRate * ENGAGEMENT_WEIGHTS.WATCH_RATE +
      avgPlayScore * ENGAGEMENT_WEIGHTS.AVG_PLAY_TIME;
  }

  // 가중 평균 종합 점수
  const overall = Math.round(
    efficiency * WEIGHTS.EFFICIENCY +
    scale * WEIGHTS.SCALE +
    sustainability * WEIGHTS.SUSTAINABILITY +
    engagement * WEIGHTS.ENGAGEMENT
  );

  const breakdown: ScoreBreakdown = {
    efficiency: Math.round(efficiency),
    scale: Math.round(scale),
    sustainability: Math.round(sustainability),
    engagement: Math.round(engagement),
  };

  const grade = determineGrade(overall);
  const recommendation = getRecommendation(overall, breakdown);

  return {
    overall,
    breakdown,
    rank: 0, // 전체 계산 후 설정
    percentile: 0, // 전체 계산 후 설정
    grade,
    recommendation,
  };
}

/**
 * 여러 소재의 점수를 배치로 계산하고 순위 부여
 */
export function scoreCreatives(
  creatives: CreativeWithMetrics[],
  benchmarks: IndustryBenchmarks = DEFAULT_BENCHMARKS
): Map<string, CreativeScore> {
  const scores = new Map<string, CreativeScore>();
  const scoreList: Array<{ id: string; score: CreativeScore }> = [];

  // 각 소재 점수 계산
  for (const creative of creatives) {
    const score = scoreCreative(creative, benchmarks);
    scoreList.push({ id: creative.id, score });
  }

  // 점수 내림차순 정렬
  scoreList.sort((a, b) => b.score.overall - a.score.overall);

  // 순위 및 백분위 계산
  const total = scoreList.length;
  scoreList.forEach((item, index) => {
    item.score.rank = index + 1;
    item.score.percentile = Math.round(((total - index) / total) * 100);
    scores.set(item.id, item.score);
  });

  return scores;
}

/**
 * Top N 소재 추출
 */
export function getTopCreatives(
  scores: Map<string, CreativeScore>,
  n: number = 10
): Array<{ id: string; score: CreativeScore }> {
  const sorted = Array.from(scores.entries())
    .map(([id, score]) => ({ id, score }))
    .sort((a, b) => b.score.overall - a.score.overall)
    .slice(0, n);

  return sorted;
}

/**
 * Bottom N 소재 추출
 */
export function getBottomCreatives(
  scores: Map<string, CreativeScore>,
  n: number = 10
): Array<{ id: string; score: CreativeScore }> {
  const sorted = Array.from(scores.entries())
    .map(([id, score]) => ({ id, score }))
    .sort((a, b) => a.score.overall - b.score.overall)
    .slice(0, n);

  return sorted;
}

/**
 * 등급별 소재 분류
 */
export function categorizeByGrade(
  scores: Map<string, CreativeScore>
): Record<string, string[]> {
  const categories: Record<string, string[]> = {
    S: [],
    A: [],
    B: [],
    C: [],
    D: [],
    F: [],
  };

  for (const [id, score] of scores) {
    categories[score.grade].push(id);
  }

  return categories;
}

/**
 * 소재 성과 요약 통계
 */
export interface CreativesSummary {
  totalCreatives: number;
  avgScore: number;
  gradeDistribution: Record<string, number>;
  topPerformersCount: number; // S, A 등급
  needsAttentionCount: number; // D, F 등급
  avgEfficiency: number;
  avgScale: number;
  avgSustainability: number;
  avgEngagement: number;
}

export function getCreativesSummary(scores: Map<string, CreativeScore>): CreativesSummary {
  const scoresList = Array.from(scores.values());
  const total = scoresList.length;

  if (total === 0) {
    return {
      totalCreatives: 0,
      avgScore: 0,
      gradeDistribution: { S: 0, A: 0, B: 0, C: 0, D: 0, F: 0 },
      topPerformersCount: 0,
      needsAttentionCount: 0,
      avgEfficiency: 0,
      avgScale: 0,
      avgSustainability: 0,
      avgEngagement: 0,
    };
  }

  const gradeDistribution: Record<string, number> = { S: 0, A: 0, B: 0, C: 0, D: 0, F: 0 };

  let sumScore = 0;
  let sumEfficiency = 0;
  let sumScale = 0;
  let sumSustainability = 0;
  let sumEngagement = 0;

  for (const score of scoresList) {
    sumScore += score.overall;
    sumEfficiency += score.breakdown.efficiency;
    sumScale += score.breakdown.scale;
    sumSustainability += score.breakdown.sustainability;
    sumEngagement += score.breakdown.engagement;
    gradeDistribution[score.grade]++;
  }

  return {
    totalCreatives: total,
    avgScore: Math.round(sumScore / total),
    gradeDistribution,
    topPerformersCount: gradeDistribution.S + gradeDistribution.A,
    needsAttentionCount: gradeDistribution.D + gradeDistribution.F,
    avgEfficiency: Math.round(sumEfficiency / total),
    avgScale: Math.round(sumScale / total),
    avgSustainability: Math.round(sumSustainability / total),
    avgEngagement: Math.round(sumEngagement / total),
  };
}
