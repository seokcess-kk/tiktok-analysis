/**
 * 소재 성과×피로도 매트릭스 분석 모듈
 *
 * 성과 점수와 피로도를 결합하여 4분면 분류
 */

import { config } from '@/lib/config';

// ============================================================
// 타입 정의
// ============================================================

export type MatrixQuadrant = 'SCALE' | 'REFRESH' | 'TEST' | 'KILL';

export interface CreativeMatrixInput {
  id: string;
  name: string;
  type: string;
  thumbnailUrl?: string | null;
  performanceScore: number; // 0-100
  fatigueIndex: number; // 0-100
  metrics?: {
    spend: number;
    impressions: number;
    clicks: number;
    conversions: number;
    ctr?: number | null;
    roas?: number | null;
  };
  fatigueData?: {
    daysActive: number;
    performanceTrend: string;
    peakPerformanceDate?: Date | null;
  };
}

export interface MatrixPosition {
  quadrant: MatrixQuadrant;
  x: number; // 성과 점수 (0-100)
  y: number; // 피로도 (0-100)
  priority: number; // 교체 우선순위 (1-100, 높을수록 우선)
  recommendation: string;
  urgency: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface CreativeMatrixResult {
  id: string;
  name: string;
  type: string;
  thumbnailUrl?: string | null;
  position: MatrixPosition;
  metrics?: CreativeMatrixInput['metrics'];
  fatigueData?: CreativeMatrixInput['fatigueData'];
}

export interface MatrixSummary {
  quadrant: MatrixQuadrant;
  count: number;
  avgPerformance: number;
  avgFatigue: number;
  creatives: CreativeMatrixResult[];
}

// ============================================================
// 4분면 분류 로직
// ============================================================

/**
 * 성과와 피로도를 기반으로 분면 결정
 *
 * 매트릭스:
 *           고피로도
 *              |
 *   KILL      |     REFRESH
 *   (저성과)   |     (고성과)
 * ------------|-------------
 *   TEST      |     SCALE
 *   (저성과)   |     (고성과)
 *              |
 *           저피로도
 */
export function computeMatrixPosition(
  performanceScore: number,
  fatigueIndex: number,
  options: {
    performanceThreshold?: number;
    fatigueThreshold?: number;
  } = {}
): MatrixPosition {
  const performanceThreshold = options.performanceThreshold ?? 50;
  const fatigueThreshold = options.fatigueThreshold ?? config.creativeFatigue.mediumThreshold;

  const isHighPerformance = performanceScore >= performanceThreshold;
  const isHighFatigue = fatigueIndex >= fatigueThreshold;

  let quadrant: MatrixQuadrant;
  let priority: number;
  let recommendation: string;
  let urgency: 'HIGH' | 'MEDIUM' | 'LOW';

  if (isHighPerformance && !isHighFatigue) {
    // SCALE: 고성과 + 저피로도
    quadrant = 'SCALE';
    priority = 10; // 낮은 우선순위 (교체 불필요)
    recommendation = '예산 증액 및 노출 확대 권장';
    urgency = 'LOW';
  } else if (isHighPerformance && isHighFatigue) {
    // REFRESH: 고성과 + 고피로도
    quadrant = 'REFRESH';
    // 피로도가 높을수록 우선순위 높음
    priority = 40 + (fatigueIndex - fatigueThreshold);
    recommendation = '유사 컨셉 신규 소재로 교체 권장';
    urgency = fatigueIndex >= config.creativeFatigue.highThreshold ? 'HIGH' : 'MEDIUM';
  } else if (!isHighPerformance && !isHighFatigue) {
    // TEST: 저성과 + 저피로도
    quadrant = 'TEST';
    priority = 30; // 중간 우선순위
    recommendation = '성과 추이 모니터링, 개선 여지 탐색';
    urgency = 'LOW';
  } else {
    // KILL: 저성과 + 고피로도
    quadrant = 'KILL';
    // 가장 높은 우선순위
    priority = 70 + (100 - performanceScore) * 0.3;
    recommendation = '즉시 중단 및 신규 소재 대체 권장';
    urgency = 'HIGH';
  }

  return {
    quadrant,
    x: performanceScore,
    y: fatigueIndex,
    priority: Math.min(100, Math.max(1, Math.round(priority))),
    recommendation,
    urgency,
  };
}

// ============================================================
// 일괄 처리
// ============================================================

/**
 * 여러 소재 매트릭스 분석
 */
export function analyzeCreativeMatrix(
  creatives: CreativeMatrixInput[],
  options: {
    performanceThreshold?: number;
    fatigueThreshold?: number;
  } = {}
): CreativeMatrixResult[] {
  return creatives.map((creative) => ({
    id: creative.id,
    name: creative.name,
    type: creative.type,
    thumbnailUrl: creative.thumbnailUrl,
    position: computeMatrixPosition(
      creative.performanceScore,
      creative.fatigueIndex,
      options
    ),
    metrics: creative.metrics,
    fatigueData: creative.fatigueData,
  }));
}

/**
 * 교체 우선순위순 정렬
 */
export function sortByReplacementPriority(
  results: CreativeMatrixResult[]
): CreativeMatrixResult[] {
  return [...results].sort((a, b) => b.position.priority - a.position.priority);
}

/**
 * 분면별 요약
 */
export function summarizeByQuadrant(
  results: CreativeMatrixResult[]
): MatrixSummary[] {
  const groups: Record<MatrixQuadrant, CreativeMatrixResult[]> = {
    SCALE: [],
    REFRESH: [],
    TEST: [],
    KILL: [],
  };

  for (const result of results) {
    groups[result.position.quadrant].push(result);
  }

  const summaries: MatrixSummary[] = [];

  for (const quadrant of ['SCALE', 'REFRESH', 'TEST', 'KILL'] as MatrixQuadrant[]) {
    const creatives = groups[quadrant];
    if (creatives.length === 0) {
      summaries.push({
        quadrant,
        count: 0,
        avgPerformance: 0,
        avgFatigue: 0,
        creatives: [],
      });
      continue;
    }

    const totalPerformance = creatives.reduce((sum, c) => sum + c.position.x, 0);
    const totalFatigue = creatives.reduce((sum, c) => sum + c.position.y, 0);

    summaries.push({
      quadrant,
      count: creatives.length,
      avgPerformance: totalPerformance / creatives.length,
      avgFatigue: totalFatigue / creatives.length,
      creatives: sortByReplacementPriority(creatives),
    });
  }

  return summaries;
}

// ============================================================
// 성과 점수 계산 헬퍼
// ============================================================

/**
 * 메트릭 기반 성과 점수 계산
 * (기존 creative-scorer.ts와 연동하거나 독립 사용)
 */
export function computePerformanceScore(
  metrics: {
    ctr?: number | null;
    cvr?: number | null;
    roas?: number | null;
  },
  benchmarks: {
    ctr?: number;
    cvr?: number;
    roas?: number;
  } = {}
): number {
  const ctrBenchmark = benchmarks.ctr ?? config.analytics.benchmarks.ctr;
  const cvrBenchmark = benchmarks.cvr ?? config.analytics.benchmarks.cvr;
  const roasBenchmark = benchmarks.roas ?? 1.0;

  let score = 0;
  let weights = 0;

  // CTR 점수 (30% 가중치)
  if (metrics.ctr !== null && metrics.ctr !== undefined) {
    const ctrScore = Math.min(100, (metrics.ctr / ctrBenchmark) * 50);
    score += ctrScore * 0.3;
    weights += 0.3;
  }

  // CVR 점수 (30% 가중치)
  if (metrics.cvr !== null && metrics.cvr !== undefined) {
    const cvrScore = Math.min(100, (metrics.cvr / cvrBenchmark) * 50);
    score += cvrScore * 0.3;
    weights += 0.3;
  }

  // ROAS 점수 (40% 가중치)
  if (metrics.roas !== null && metrics.roas !== undefined) {
    const roasScore = Math.min(100, (metrics.roas / roasBenchmark) * 50);
    score += roasScore * 0.4;
    weights += 0.4;
  }

  if (weights === 0) return 0;
  return Math.round((score / weights) * 100) / 100;
}
