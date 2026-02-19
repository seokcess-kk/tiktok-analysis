/**
 * 광고 세그먼트 분류 모듈
 *
 * 광고 성과 기반 Scale/Hold/Kill/Test 세그먼트 분류
 */

import { config } from '@/lib/config';
import { computeAllMetrics, type RawMetrics, type CalculatedMetrics } from './metrics-calculator';

// ============================================================
// 타입 정의
// ============================================================

export type SegmentLabel = 'SCALE' | 'HOLD' | 'KILL' | 'TEST';

export interface SegmentThresholds {
  minImpressions: number;
  minClicks: number;
  scaleRoasThreshold: number;
  scaleCpaThreshold: number;
  killRoasThreshold: number;
  killCpaMultiplier: number;
  trendSlopeThreshold: number;
}

export interface SegmentResult {
  label: SegmentLabel;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  reasons: string[];
  nextAction: string;
  metrics: CalculatedMetrics;
}

export interface AdWithMetrics {
  id: string;
  name: string;
  status: string;
  rawMetrics: RawMetrics;
  dailyMetrics?: RawMetrics[];
}

export interface SegmentedAd {
  id: string;
  name: string;
  status: string;
  segment: SegmentResult;
}

// ============================================================
// 기본 임계값 (config에서 가져옴)
// ============================================================

function getDefaultThresholds(): SegmentThresholds {
  return {
    minImpressions: config.analytics.segment.minImpressions,
    minClicks: config.analytics.segment.minClicks,
    scaleRoasThreshold: config.analytics.segment.scaleRoasThreshold,
    scaleCpaThreshold: config.analytics.segment.scaleCpaThreshold,
    killRoasThreshold: config.analytics.segment.killRoasThreshold,
    killCpaMultiplier: config.analytics.segment.killCpaMultiplier,
    trendSlopeThreshold: config.analytics.segment.trendSlopeThreshold,
  };
}

// ============================================================
// 추세 분석
// ============================================================

/**
 * 선형 회귀로 기울기 계산
 */
function computeSlope(values: number[]): number {
  if (values.length < 2) return 0;

  const n = values.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;

  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumXX += i * i;
  }

  const denominator = n * sumXX - sumX * sumX;
  if (denominator === 0) return 0;

  return (n * sumXY - sumX * sumY) / denominator;
}

/**
 * ROAS 추세 계산
 */
function computeRoasTrend(dailyMetrics: RawMetrics[], conversionValue: number): number {
  const roasValues = dailyMetrics.map((m) => {
    if (m.spend === 0) return 0;
    return (m.conversions * conversionValue) / m.spend;
  });
  return computeSlope(roasValues);
}

// ============================================================
// 세그먼트 분류
// ============================================================

/**
 * 단일 광고 세그먼트 분류
 */
export function segmentAd(
  ad: AdWithMetrics,
  options: {
    conversionValue?: number;
    thresholds?: Partial<SegmentThresholds>;
    benchmarkCpa?: number;
  } = {}
): SegmentResult {
  const thresholds = { ...getDefaultThresholds(), ...options.thresholds };
  const conversionValue = options.conversionValue ?? config.analytics.defaultConversionValue;
  const benchmarkCpa = options.benchmarkCpa ?? config.analytics.benchmarks.cpa;

  // 메트릭 계산
  const metrics = computeAllMetrics(ad.rawMetrics, { conversionValue });
  const { impressions, clicks, conversions, roas, cpa } = metrics;

  const reasons: string[] = [];
  let label: SegmentLabel;
  let confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  let nextAction: string;

  // 1. 표본 부족 체크 → TEST
  if (impressions < thresholds.minImpressions || clicks < thresholds.minClicks) {
    reasons.push(`표본 부족 (노출: ${impressions}, 클릭: ${clicks})`);
    return {
      label: 'TEST',
      confidence: 'LOW',
      reasons,
      nextAction: '더 많은 데이터 수집 필요. 최소 1,000 노출, 50 클릭 권장.',
      metrics,
    };
  }

  // 2. ROAS 기반 분류
  const roasValue = roas ?? 0;
  const cpaValue = cpa ?? Infinity;

  // SCALE: 고ROAS & 저CPA
  if (
    roasValue >= thresholds.scaleRoasThreshold &&
    cpaValue <= benchmarkCpa * thresholds.scaleCpaThreshold
  ) {
    reasons.push(`ROAS ${roasValue.toFixed(2)} (기준: ${thresholds.scaleRoasThreshold})`);
    reasons.push(`CPA ${Math.round(cpaValue)}원 (벤치마크 ${benchmarkCpa}원 대비 ${((cpaValue / benchmarkCpa) * 100).toFixed(0)}%)`);

    // 추세 분석으로 신뢰도 결정
    if (ad.dailyMetrics && ad.dailyMetrics.length >= 3) {
      const slope = computeRoasTrend(ad.dailyMetrics, conversionValue);
      if (slope >= 0) {
        confidence = 'HIGH';
        reasons.push('상승 또는 안정 추세');
      } else if (slope > thresholds.trendSlopeThreshold) {
        confidence = 'MEDIUM';
        reasons.push('약간의 하락 추세 감지');
      } else {
        confidence = 'LOW';
        reasons.push('하락 추세 주의');
      }
    } else {
      confidence = 'MEDIUM';
    }

    label = 'SCALE';
    nextAction = '예산 증액 및 유사 타겟 확장 권장';
  }
  // KILL: 저ROAS & 고CPA
  else if (
    roasValue <= thresholds.killRoasThreshold ||
    cpaValue >= benchmarkCpa * thresholds.killCpaMultiplier
  ) {
    reasons.push(`ROAS ${roasValue.toFixed(2)} (기준 하한: ${thresholds.killRoasThreshold})`);
    if (conversions > 0) {
      reasons.push(`CPA ${Math.round(cpaValue)}원 (벤치마크 ${benchmarkCpa}원의 ${((cpaValue / benchmarkCpa) * 100).toFixed(0)}%)`);
    } else {
      reasons.push('전환 없음');
    }

    // 추세 분석
    if (ad.dailyMetrics && ad.dailyMetrics.length >= 3) {
      const slope = computeRoasTrend(ad.dailyMetrics, conversionValue);
      if (slope < thresholds.trendSlopeThreshold) {
        confidence = 'HIGH';
        reasons.push('지속적인 하락 추세');
      } else {
        confidence = 'MEDIUM';
        reasons.push('추세 불안정');
      }
    } else {
      confidence = 'MEDIUM';
    }

    label = 'KILL';
    nextAction = '예산 삭감 또는 광고 중단 권장';
  }
  // HOLD: 중간 성과
  else {
    reasons.push(`ROAS ${roasValue.toFixed(2)} (중간 범위)`);
    if (conversions > 0) {
      reasons.push(`CPA ${Math.round(cpaValue)}원`);
    }

    // 추세에 따라 방향 결정
    if (ad.dailyMetrics && ad.dailyMetrics.length >= 3) {
      const slope = computeRoasTrend(ad.dailyMetrics, conversionValue);
      if (slope > 0.05) {
        confidence = 'MEDIUM';
        reasons.push('상승 추세 - Scale 가능성');
        nextAction = '성과 추이 모니터링 후 Scale 검토';
      } else if (slope < thresholds.trendSlopeThreshold) {
        confidence = 'MEDIUM';
        reasons.push('하락 추세 - Kill 가능성');
        nextAction = '소재 교체 또는 타겟 조정 필요';
      } else {
        confidence = 'LOW';
        reasons.push('추세 안정');
        nextAction = '현재 설정 유지, 정기 모니터링';
      }
    } else {
      confidence = 'LOW';
      nextAction = '추가 데이터 수집 후 재평가';
    }

    label = 'HOLD';
  }

  return {
    label,
    confidence,
    reasons,
    nextAction,
    metrics,
  };
}

/**
 * 여러 광고 일괄 세그먼트 분류
 */
export function batchSegmentAds(
  ads: AdWithMetrics[],
  options: {
    conversionValue?: number;
    thresholds?: Partial<SegmentThresholds>;
    benchmarkCpa?: number;
  } = {}
): SegmentedAd[] {
  return ads.map((ad) => ({
    id: ad.id,
    name: ad.name,
    status: ad.status,
    segment: segmentAd(ad, options),
  }));
}

/**
 * 세그먼트별 요약 통계
 */
export interface SegmentSummary {
  label: SegmentLabel;
  count: number;
  totalSpend: number;
  avgRoas: number;
  avgCpa: number;
  ads: SegmentedAd[];
}

export function summarizeBySegment(segmentedAds: SegmentedAd[]): SegmentSummary[] {
  const groups: Record<SegmentLabel, SegmentedAd[]> = {
    SCALE: [],
    HOLD: [],
    KILL: [],
    TEST: [],
  };

  for (const ad of segmentedAds) {
    groups[ad.segment.label].push(ad);
  }

  const summaries: SegmentSummary[] = [];

  for (const label of ['SCALE', 'HOLD', 'KILL', 'TEST'] as SegmentLabel[]) {
    const ads = groups[label];
    if (ads.length === 0) {
      summaries.push({
        label,
        count: 0,
        totalSpend: 0,
        avgRoas: 0,
        avgCpa: 0,
        ads: [],
      });
      continue;
    }

    let totalSpend = 0;
    let totalRoas = 0;
    let totalCpa = 0;
    let roasCount = 0;
    let cpaCount = 0;

    for (const ad of ads) {
      totalSpend += ad.segment.metrics.spend;
      if (ad.segment.metrics.roas !== null) {
        totalRoas += ad.segment.metrics.roas;
        roasCount++;
      }
      if (ad.segment.metrics.cpa !== null) {
        totalCpa += ad.segment.metrics.cpa;
        cpaCount++;
      }
    }

    summaries.push({
      label,
      count: ads.length,
      totalSpend,
      avgRoas: roasCount > 0 ? totalRoas / roasCount : 0,
      avgCpa: cpaCount > 0 ? totalCpa / cpaCount : 0,
      ads,
    });
  }

  return summaries;
}
