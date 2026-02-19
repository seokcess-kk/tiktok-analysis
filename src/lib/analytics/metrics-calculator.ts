/**
 * 지표 계산 표준화 모듈
 *
 * 모든 API에서 사용하는 공통 지표 계산 함수
 */

import { config } from '@/lib/config';

// ============================================================
// 타입 정의
// ============================================================

export interface RawMetrics {
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  conversionValue?: number;
}

export interface CalculatedMetrics {
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
  valueSource: 'configured' | 'estimated';
}

export interface MetricsOptions {
  conversionValue?: number;
}

/**
 * null 값이 0으로 변환된 메트릭스
 */
export interface DefaultedMetrics {
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
  valueSource: 'configured' | 'estimated';
}

// ============================================================
// 핵심 계산 함수
// ============================================================

/**
 * CTR (Click Through Rate) 계산
 * @returns 퍼센트 값 (0-100)
 */
export function computeCtr(clicks: number, impressions: number): number | null {
  if (impressions === 0) return null;
  return (clicks / impressions) * 100;
}

/**
 * CVR (Conversion Rate) 계산
 * @returns 퍼센트 값 (0-100)
 */
export function computeCvr(conversions: number, clicks: number): number | null {
  if (clicks === 0) return null;
  return (conversions / clicks) * 100;
}

/**
 * CPC (Cost Per Click) 계산
 */
export function computeCpc(spend: number, clicks: number): number | null {
  if (clicks === 0) return null;
  return spend / clicks;
}

/**
 * CPM (Cost Per Mille) 계산
 */
export function computeCpm(spend: number, impressions: number): number | null {
  if (impressions === 0) return null;
  return (spend / impressions) * 1000;
}

/**
 * CPA (Cost Per Acquisition) 계산
 */
export function computeCpa(spend: number, conversions: number): number | null {
  if (conversions === 0) return null;
  return spend / conversions;
}

/**
 * ROAS (Return On Ad Spend) 계산
 */
export function computeRoas(
  spend: number,
  conversions: number,
  conversionValue: number
): number | null {
  if (spend === 0) return null;
  return (conversions * conversionValue) / spend;
}

// ============================================================
// 통합 계산 함수
// ============================================================

/**
 * 모든 지표를 한번에 계산
 */
export function computeAllMetrics(
  raw: RawMetrics,
  options: MetricsOptions = {}
): CalculatedMetrics {
  const { spend, impressions, clicks, conversions, conversionValue: rawValue } = raw;

  const hasRealValue = rawValue !== undefined && rawValue > 0;
  const conversionValue = rawValue ?? options.conversionValue ?? config.analytics.defaultConversionValue;
  const valueSource: 'configured' | 'estimated' = hasRealValue || options.conversionValue ? 'configured' : 'estimated';

  return {
    spend,
    impressions,
    clicks,
    conversions,
    ctr: computeCtr(clicks, impressions),
    cvr: computeCvr(conversions, clicks),
    cpc: computeCpc(spend, clicks),
    cpm: computeCpm(spend, impressions),
    cpa: computeCpa(spend, conversions),
    roas: computeRoas(spend, conversions, conversionValue),
    valueSource,
  };
}

/**
 * 여러 raw 데이터를 합산 후 지표 계산
 */
export function aggregateAndCompute(
  rawList: RawMetrics[],
  options: MetricsOptions = {}
): CalculatedMetrics {
  const aggregated: RawMetrics = {
    spend: 0,
    impressions: 0,
    clicks: 0,
    conversions: 0,
    conversionValue: 0,
  };

  for (const raw of rawList) {
    aggregated.spend += raw.spend;
    aggregated.impressions += raw.impressions;
    aggregated.clicks += raw.clicks;
    aggregated.conversions += raw.conversions;
    if (raw.conversionValue) {
      aggregated.conversionValue! += raw.conversionValue;
    }
  }

  return computeAllMetrics(aggregated, options);
}

// ============================================================
// 변화율 계산
// ============================================================

/**
 * 두 값 비교 (변화율 %)
 */
export function computeChange(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null;
  return ((current - previous) / previous) * 100;
}

export interface MetricsComparison {
  current: CalculatedMetrics;
  previous: CalculatedMetrics;
  changes: {
    spend: number | null;
    impressions: number | null;
    clicks: number | null;
    conversions: number | null;
    ctr: number | null;
    cvr: number | null;
    cpa: number | null;
    roas: number | null;
  };
}

/**
 * 두 기간 메트릭 비교
 */
export function compareMetrics(
  currentRaw: RawMetrics,
  previousRaw: RawMetrics,
  options: MetricsOptions = {}
): MetricsComparison {
  const current = computeAllMetrics(currentRaw, options);
  const previous = computeAllMetrics(previousRaw, options);

  return {
    current,
    previous,
    changes: {
      spend: computeChange(current.spend, previous.spend),
      impressions: computeChange(current.impressions, previous.impressions),
      clicks: computeChange(current.clicks, previous.clicks),
      conversions: computeChange(current.conversions, previous.conversions),
      ctr: current.ctr !== null && previous.ctr !== null
        ? computeChange(current.ctr, previous.ctr) : null,
      cvr: current.cvr !== null && previous.cvr !== null
        ? computeChange(current.cvr, previous.cvr) : null,
      cpa: current.cpa !== null && previous.cpa !== null
        ? computeChange(current.cpa, previous.cpa) : null,
      roas: current.roas !== null && previous.roas !== null
        ? computeChange(current.roas, previous.roas) : null,
    },
  };
}

// ============================================================
// 유틸리티
// ============================================================

/**
 * null 값을 0으로 변환
 */
export function metricsWithDefaults(metrics: CalculatedMetrics): DefaultedMetrics {
  return {
    spend: metrics.spend,
    impressions: metrics.impressions,
    clicks: metrics.clicks,
    conversions: metrics.conversions,
    ctr: metrics.ctr ?? 0,
    cvr: metrics.cvr ?? 0,
    cpc: metrics.cpc ?? 0,
    cpm: metrics.cpm ?? 0,
    cpa: metrics.cpa ?? 0,
    roas: metrics.roas ?? 0,
    valueSource: metrics.valueSource,
  };
}
