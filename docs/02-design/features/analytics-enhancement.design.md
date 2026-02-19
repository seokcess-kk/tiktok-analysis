# Design: analytics-enhancement

> 광고 성과 분석 고도화 - 상세 설계 문서

## 1. 설계 개요

### 1.1 목적

Plan 문서에서 정의한 4개 Phase의 구체적인 구현 설계를 정의합니다.

### 1.2 설계 원칙

1. **기존 코드 활용**: `fatigue-calculator.ts`, `creative-scorer.ts` 재사용
2. **하위 호환성**: 기존 API 응답 구조 유지, 필드 추가만
3. **설정 우선**: 모든 임계값은 `config.ts`에서 관리
4. **단일 책임**: 각 모듈은 하나의 역할만 담당

---

## 2. Phase 1: 지표 계산 표준화

### 2.1 신규 파일: `src/lib/analytics/metrics-calculator.ts`

```typescript
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
  conversionValue?: number; // 실제 전환 가치 (선택)
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
  conversionValue?: number; // 계정별 설정값
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

  // 전환 가치 결정: 원본 값 > 옵션 값 > 기본값
  const hasRealValue = rawValue !== undefined && rawValue > 0;
  const conversionValue = rawValue ?? options.conversionValue ?? config.analytics.defaultConversionValue;
  const valueSource: 'configured' | 'estimated' = hasRealValue ? 'configured' : 'estimated';

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
 * 두 기간 메트릭 비교 (변화율)
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
```

### 2.2 Prisma 스키마 확장

```prisma
// prisma/schema.prisma

model Account {
  // ... 기존 필드
  conversionValue    Float?    // 계정별 전환 가치 설정 (원)
}
```

### 2.3 config.ts 확장 (이미 존재)

`config.analytics.defaultConversionValue`가 이미 존재하므로 추가 작업 불필요.

### 2.4 API 수정 패턴

```typescript
// Before (campaigns/route.ts)
const roas = totalSpend > 0 ? (totalConversions * 50000) / totalSpend : 0;

// After
import { computeAllMetrics } from '@/lib/analytics/metrics-calculator';

const metrics = computeAllMetrics({
  spend: totalSpend,
  impressions: totalImpressions,
  clicks: totalClicks,
  conversions: totalConversions,
}, { conversionValue: account.conversionValue ?? undefined });

// 응답에 valueSource 포함
return {
  ...metrics,
  valueSource: metrics.valueSource,
};
```

---

## 3. Phase 2: 광고 액션 세그먼트

### 3.1 신규 파일: `src/lib/analytics/ad-segmenter.ts`

```typescript
/**
 * 광고 액션 세그먼트 분류
 *
 * 광고를 Scale/Hold/Kill/Test 4가지 세그먼트로 분류
 */

import { config } from '@/lib/config';
import { CalculatedMetrics, computeAllMetrics, computeChange } from './metrics-calculator';

// ============================================================
// 타입 정의
// ============================================================

export type AdSegmentLabel = 'SCALE' | 'HOLD' | 'KILL' | 'TEST';

export interface SegmentThresholds {
  minImpressions: number;
  minClicks: number;
  scaleRoasThreshold: number;
  scaleCpaThreshold: number;
  killRoasThreshold: number;
  killCpaMultiplier: number;
  trendSlopeThreshold: number;
}

export interface AdSegmentInput {
  adId: string;
  name: string;
  metrics: CalculatedMetrics;
  previousMetrics?: CalculatedMetrics;
  daysActive: number;
}

export interface AdSegmentResult {
  adId: string;
  name: string;
  label: AdSegmentLabel;
  confidence: number; // 0-100
  reasons: string[];
  nextAction: string;
  metrics: CalculatedMetrics;
  spendShare?: number;
  roasTrend?: number;
}

// ============================================================
// 기본 임계값
// ============================================================

const DEFAULT_THRESHOLDS: SegmentThresholds = {
  minImpressions: 1000,
  minClicks: 50,
  scaleRoasThreshold: 2.0,
  scaleCpaThreshold: 0.8, // 벤치마크의 80% 이하
  killRoasThreshold: 0.5,
  killCpaMultiplier: 2.0, // 벤치마크의 2배 이상
  trendSlopeThreshold: -0.1,
};

// ============================================================
// 세그먼트 분류 로직
// ============================================================

/**
 * 표본 충분도 계산 (0-100)
 */
function computeSampleConfidence(
  impressions: number,
  clicks: number,
  thresholds: SegmentThresholds
): number {
  const impressionRatio = Math.min(impressions / thresholds.minImpressions, 1);
  const clickRatio = Math.min(clicks / thresholds.minClicks, 1);
  return Math.round((impressionRatio * 0.4 + clickRatio * 0.6) * 100);
}

/**
 * 단일 광고 세그먼트 분류
 */
export function segmentAd(
  input: AdSegmentInput,
  thresholds: SegmentThresholds = DEFAULT_THRESHOLDS,
  benchmarkCpa: number = config.analytics.benchmarks.cpa
): AdSegmentResult {
  const { adId, name, metrics, previousMetrics, daysActive } = input;
  const reasons: string[] = [];

  // 표본 충분도 확인
  const sampleConfidence = computeSampleConfidence(
    metrics.impressions,
    metrics.clicks,
    thresholds
  );

  // 표본 부족 → TEST
  if (sampleConfidence < 50) {
    return {
      adId,
      name,
      label: 'TEST',
      confidence: sampleConfidence,
      reasons: ['데이터 표본이 부족합니다. 더 많은 노출이 필요합니다.'],
      nextAction: '예산을 유지하고 데이터 수집을 계속하세요.',
      metrics,
    };
  }

  // ROAS/CPA 기반 분류
  const roas = metrics.roas ?? 0;
  const cpa = metrics.cpa ?? Infinity;

  // ROAS 추세 계산
  let roasTrend: number | undefined;
  if (previousMetrics?.roas !== null && metrics.roas !== null) {
    roasTrend = computeChange(metrics.roas!, previousMetrics?.roas ?? 0);
  }

  // SCALE 조건: ROAS >= 2.0 또는 CPA <= 벤치마크의 80%
  if (roas >= thresholds.scaleRoasThreshold) {
    reasons.push(`ROAS ${roas.toFixed(2)}x로 목표 이상`);
    if (cpa <= benchmarkCpa * thresholds.scaleCpaThreshold) {
      reasons.push(`CPA ₩${cpa.toLocaleString()}로 효율적`);
    }
    if (roasTrend && roasTrend > 0) {
      reasons.push(`ROAS 상승 추세 (+${roasTrend.toFixed(1)}%)`);
    }

    return {
      adId,
      name,
      label: 'SCALE',
      confidence: Math.min(sampleConfidence + 10, 100),
      reasons,
      nextAction: '예산을 20-50% 증액하여 스케일업하세요.',
      metrics,
      roasTrend,
    };
  }

  // KILL 조건: ROAS < 0.5 또는 CPA >= 벤치마크의 2배
  if (roas < thresholds.killRoasThreshold || cpa >= benchmarkCpa * thresholds.killCpaMultiplier) {
    if (roas < thresholds.killRoasThreshold) {
      reasons.push(`ROAS ${roas.toFixed(2)}x로 수익성 없음`);
    }
    if (cpa >= benchmarkCpa * thresholds.killCpaMultiplier) {
      reasons.push(`CPA ₩${cpa.toLocaleString()}로 과도한 비용`);
    }
    if (daysActive >= 7) {
      reasons.push(`${daysActive}일간 개선 없음`);
    }

    return {
      adId,
      name,
      label: 'KILL',
      confidence: Math.min(sampleConfidence + 5, 100),
      reasons,
      nextAction: '광고를 중단하고 새로운 소재로 교체하세요.',
      metrics,
      roasTrend,
    };
  }

  // HOLD 조건: 그 외 (중간 성과)
  reasons.push(`ROAS ${roas.toFixed(2)}x로 안정적`);
  if (roasTrend !== undefined) {
    if (roasTrend > 0) {
      reasons.push('상승 추세 관찰 중');
    } else if (roasTrend < thresholds.trendSlopeThreshold * 100) {
      reasons.push('하락 추세 주의');
    }
  }

  return {
    adId,
    name,
    label: 'HOLD',
    confidence: sampleConfidence,
    reasons,
    nextAction: '현재 예산을 유지하고 성과를 모니터링하세요.',
    metrics,
    roasTrend,
  };
}

/**
 * 여러 광고 배치 세그먼트 분류
 */
export function batchSegmentAds(
  ads: AdSegmentInput[],
  thresholds?: SegmentThresholds,
  benchmarkCpa?: number
): AdSegmentResult[] {
  // 전체 spend 계산 (spendShare용)
  const totalSpend = ads.reduce((sum, ad) => sum + ad.metrics.spend, 0);

  return ads.map((ad) => {
    const result = segmentAd(ad, thresholds, benchmarkCpa);
    result.spendShare = totalSpend > 0
      ? (ad.metrics.spend / totalSpend) * 100
      : 0;
    return result;
  });
}

/**
 * 세그먼트별 광고 그룹화
 */
export function groupBySegment(
  results: AdSegmentResult[]
): Record<AdSegmentLabel, AdSegmentResult[]> {
  const groups: Record<AdSegmentLabel, AdSegmentResult[]> = {
    SCALE: [],
    HOLD: [],
    KILL: [],
    TEST: [],
  };

  for (const result of results) {
    groups[result.label].push(result);
  }

  // 각 그룹 내 정렬 (ROAS 내림차순)
  for (const label of Object.keys(groups) as AdSegmentLabel[]) {
    groups[label].sort((a, b) => (b.metrics.roas ?? 0) - (a.metrics.roas ?? 0));
  }

  return groups;
}

/**
 * 세그먼트 요약 통계
 */
export interface SegmentSummary {
  total: number;
  scale: { count: number; spend: number; spendShare: number };
  hold: { count: number; spend: number; spendShare: number };
  kill: { count: number; spend: number; spendShare: number };
  test: { count: number; spend: number; spendShare: number };
  avgConfidence: number;
}

export function getSegmentSummary(results: AdSegmentResult[]): SegmentSummary {
  const totalSpend = results.reduce((sum, r) => sum + r.metrics.spend, 0);

  const summary: SegmentSummary = {
    total: results.length,
    scale: { count: 0, spend: 0, spendShare: 0 },
    hold: { count: 0, spend: 0, spendShare: 0 },
    kill: { count: 0, spend: 0, spendShare: 0 },
    test: { count: 0, spend: 0, spendShare: 0 },
    avgConfidence: 0,
  };

  let totalConfidence = 0;

  for (const r of results) {
    const key = r.label.toLowerCase() as 'scale' | 'hold' | 'kill' | 'test';
    summary[key].count++;
    summary[key].spend += r.metrics.spend;
    totalConfidence += r.confidence;
  }

  // spendShare 계산
  if (totalSpend > 0) {
    summary.scale.spendShare = (summary.scale.spend / totalSpend) * 100;
    summary.hold.spendShare = (summary.hold.spend / totalSpend) * 100;
    summary.kill.spendShare = (summary.kill.spend / totalSpend) * 100;
    summary.test.spendShare = (summary.test.spend / totalSpend) * 100;
  }

  summary.avgConfidence = results.length > 0
    ? Math.round(totalConfidence / results.length)
    : 0;

  return summary;
}
```

### 3.2 config.ts 확장

```typescript
// config.ts에 추가
analytics: {
  // ... 기존 설정

  /** 광고 세그먼트 임계값 */
  segment: {
    /** 최소 노출수 */
    minImpressions: getEnvInt('SEGMENT_MIN_IMPRESSIONS', 1000),
    /** 최소 클릭수 */
    minClicks: getEnvInt('SEGMENT_MIN_CLICKS', 50),
    /** Scale 기준 ROAS */
    scaleRoasThreshold: getEnvFloat('SEGMENT_SCALE_ROAS', 2.0),
    /** Kill 기준 ROAS */
    killRoasThreshold: getEnvFloat('SEGMENT_KILL_ROAS', 0.5),
  },
},
```

### 3.3 신규 API: `/ads/analysis/route.ts`

```typescript
// src/app/api/accounts/[accountId]/campaigns/[campaignId]/ads/analysis/route.ts

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { config } from '@/lib/config';
import { computeAllMetrics } from '@/lib/analytics/metrics-calculator';
import {
  batchSegmentAds,
  groupBySegment,
  getSegmentSummary,
  AdSegmentInput,
} from '@/lib/analytics/ad-segmenter';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: { accountId: string; campaignId: string };
}

/**
 * GET /api/accounts/:accountId/campaigns/:campaignId/ads/analysis
 * 광고 세그먼트 분석
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { accountId, campaignId } = params;
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '7', 10);

    // 계정 확인 (conversionValue 포함)
    const account = await prisma.account.findUnique({
      where: { id: accountId },
      select: { id: true, conversionValue: true },
    });

    if (!account) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Account not found' } },
        { status: 404 }
      );
    }

    // 날짜 범위
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // 이전 기간 (비교용)
    const prevEndDate = new Date(startDate);
    prevEndDate.setDate(prevEndDate.getDate() - 1);
    const prevStartDate = new Date(prevEndDate);
    prevStartDate.setDate(prevStartDate.getDate() - days);

    // 광고 목록 조회
    const ads = await prisma.ad.findMany({
      where: {
        adGroup: { campaign: { id: campaignId, accountId } },
      },
      select: {
        id: true,
        name: true,
        status: true,
        createdAt: true,
      },
    });

    // 현재 기간 메트릭
    const currentMetrics = await prisma.performanceMetric.groupBy({
      by: ['adId'],
      where: {
        adId: { in: ads.map((a) => a.id) },
        date: { gte: startDate, lte: endDate },
        level: 'AD',
      },
      _sum: {
        spend: true,
        impressions: true,
        clicks: true,
        conversions: true,
      },
    });

    // 이전 기간 메트릭
    const previousMetrics = await prisma.performanceMetric.groupBy({
      by: ['adId'],
      where: {
        adId: { in: ads.map((a) => a.id) },
        date: { gte: prevStartDate, lte: prevEndDate },
        level: 'AD',
      },
      _sum: {
        spend: true,
        impressions: true,
        clicks: true,
        conversions: true,
      },
    });

    // 메트릭 맵 생성
    const currentMap = new Map(currentMetrics.map((m) => [m.adId, m._sum]));
    const previousMap = new Map(previousMetrics.map((m) => [m.adId, m._sum]));

    // 세그먼트 입력 데이터 생성
    const conversionValue = account.conversionValue ?? config.analytics.defaultConversionValue;

    const segmentInputs: AdSegmentInput[] = ads.map((ad) => {
      const current = currentMap.get(ad.id);
      const previous = previousMap.get(ad.id);

      const daysActive = Math.ceil(
        (Date.now() - new Date(ad.createdAt).getTime()) / (1000 * 60 * 60 * 24)
      );

      return {
        adId: ad.id,
        name: ad.name,
        metrics: computeAllMetrics({
          spend: current?.spend ?? 0,
          impressions: current?.impressions ?? 0,
          clicks: current?.clicks ?? 0,
          conversions: current?.conversions ?? 0,
        }, { conversionValue }),
        previousMetrics: previous ? computeAllMetrics({
          spend: previous.spend ?? 0,
          impressions: previous.impressions ?? 0,
          clicks: previous.clicks ?? 0,
          conversions: previous.conversions ?? 0,
        }, { conversionValue }) : undefined,
        daysActive,
      };
    });

    // 세그먼트 분류
    const results = batchSegmentAds(segmentInputs);
    const grouped = groupBySegment(results);
    const summary = getSegmentSummary(results);

    return NextResponse.json({
      success: true,
      data: {
        period: { startDate, endDate, days },
        summary,
        segments: grouped,
        ads: results,
      },
    });
  } catch (error) {
    console.error('Ad analysis error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to analyze ads' } },
      { status: 500 }
    );
  }
}
```

---

## 4. Phase 3: 소재 성과×피로도 매트릭스

### 4.1 신규 파일: `src/lib/analytics/creative-matrix.ts`

```typescript
/**
 * 소재 성과×피로도 매트릭스
 *
 * 소재를 4분면으로 분류:
 * - SCALE: 고효율 + 저피로 → 예산 증액
 * - REFRESH: 고효율 + 고피로 → 유사 소재로 교체
 * - TEST: 저효율 + 저피로 → 테스트 계속
 * - KILL: 저효율 + 고피로 → 즉시 중단
 */

import { config } from '@/lib/config';
import { CreativeScore } from './creative-scorer';
import { FatigueOutput } from './fatigue-calculator';

// ============================================================
// 타입 정의
// ============================================================

export type MatrixQuadrant = 'SCALE' | 'REFRESH' | 'TEST' | 'KILL';

export interface MatrixInput {
  creativeId: string;
  name: string;
  score: CreativeScore;
  fatigue: FatigueOutput | null;
}

export interface MatrixResult {
  creativeId: string;
  name: string;
  quadrant: MatrixQuadrant;
  performanceScore: number; // 0-100
  fatigueIndex: number;     // 0-100
  priority: number;         // 교체 우선순위 (높을수록 급함)
  action: string;
  reasons: string[];
}

export interface MatrixThresholds {
  performanceThreshold: number; // 이상이면 고효율
  fatigueThreshold: number;     // 이상이면 고피로
}

// ============================================================
// 기본 임계값
// ============================================================

const DEFAULT_THRESHOLDS: MatrixThresholds = {
  performanceThreshold: 60, // 성과 점수 60 이상 = 고효율
  fatigueThreshold: config.creativeFatigue.mediumThreshold, // 피로도 40 이상 = 고피로
};

// ============================================================
// 매트릭스 분류 로직
// ============================================================

/**
 * 단일 소재 매트릭스 분류
 */
export function classifyCreative(
  input: MatrixInput,
  thresholds: MatrixThresholds = DEFAULT_THRESHOLDS
): MatrixResult {
  const { creativeId, name, score, fatigue } = input;

  const performanceScore = score.overall;
  const fatigueIndex = fatigue?.index ?? 0;

  const isHighPerformance = performanceScore >= thresholds.performanceThreshold;
  const isHighFatigue = fatigueIndex >= thresholds.fatigueThreshold;

  let quadrant: MatrixQuadrant;
  let action: string;
  let priority: number;
  const reasons: string[] = [];

  if (isHighPerformance && !isHighFatigue) {
    // 고효율 + 저피로 → SCALE
    quadrant = 'SCALE';
    action = '예산을 증액하여 성과를 극대화하세요.';
    priority = 10; // 낮은 우선순위 (교체 불필요)
    reasons.push(`성과 점수 ${performanceScore}점 (${score.grade}등급)`);
    reasons.push(`피로도 ${fatigueIndex}%로 양호`);
  } else if (isHighPerformance && isHighFatigue) {
    // 고효율 + 고피로 → REFRESH
    quadrant = 'REFRESH';
    action = '성과가 좋지만 피로도가 높습니다. 유사 컨셉의 새 소재를 준비하세요.';
    priority = 60 + Math.min(fatigueIndex - thresholds.fatigueThreshold, 40);
    reasons.push(`성과 점수 ${performanceScore}점으로 우수`);
    reasons.push(`피로도 ${fatigueIndex}%로 교체 시기 임박`);
    if (fatigue?.estimatedExhaustion) {
      reasons.push(`예상 소진일: ${fatigue.estimatedExhaustion.toLocaleDateString()}`);
    }
  } else if (!isHighPerformance && !isHighFatigue) {
    // 저효율 + 저피로 → TEST
    quadrant = 'TEST';
    action = '아직 테스트 중입니다. 성과를 지켜보거나 타겟/입찰 조정을 시도하세요.';
    priority = 30;
    reasons.push(`성과 점수 ${performanceScore}점으로 개선 여지 있음`);
    reasons.push(`피로도 ${fatigueIndex}%로 테스트 여력 있음`);
  } else {
    // 저효율 + 고피로 → KILL
    quadrant = 'KILL';
    action = '성과가 낮고 피로도가 높습니다. 즉시 중단하고 새 소재로 교체하세요.';
    priority = 90 + Math.min(fatigueIndex - thresholds.fatigueThreshold, 10);
    reasons.push(`성과 점수 ${performanceScore}점으로 저조`);
    reasons.push(`피로도 ${fatigueIndex}%로 소진됨`);
  }

  return {
    creativeId,
    name,
    quadrant,
    performanceScore,
    fatigueIndex,
    priority,
    action,
    reasons,
  };
}

/**
 * 여러 소재 배치 분류
 */
export function batchClassifyCreatives(
  inputs: MatrixInput[],
  thresholds?: MatrixThresholds
): MatrixResult[] {
  return inputs
    .map((input) => classifyCreative(input, thresholds))
    .sort((a, b) => b.priority - a.priority); // 우선순위 내림차순
}

/**
 * 4분면별 그룹화
 */
export function groupByQuadrant(
  results: MatrixResult[]
): Record<MatrixQuadrant, MatrixResult[]> {
  const groups: Record<MatrixQuadrant, MatrixResult[]> = {
    SCALE: [],
    REFRESH: [],
    TEST: [],
    KILL: [],
  };

  for (const result of results) {
    groups[result.quadrant].push(result);
  }

  return groups;
}

/**
 * 매트릭스 요약 통계
 */
export interface MatrixSummary {
  total: number;
  scale: number;
  refresh: number;
  test: number;
  kill: number;
  avgPerformance: number;
  avgFatigue: number;
  urgentReplacement: number; // priority >= 80
}

export function getMatrixSummary(results: MatrixResult[]): MatrixSummary {
  const summary: MatrixSummary = {
    total: results.length,
    scale: 0,
    refresh: 0,
    test: 0,
    kill: 0,
    avgPerformance: 0,
    avgFatigue: 0,
    urgentReplacement: 0,
  };

  if (results.length === 0) return summary;

  let totalPerformance = 0;
  let totalFatigue = 0;

  for (const r of results) {
    summary[r.quadrant.toLowerCase() as 'scale' | 'refresh' | 'test' | 'kill']++;
    totalPerformance += r.performanceScore;
    totalFatigue += r.fatigueIndex;
    if (r.priority >= 80) summary.urgentReplacement++;
  }

  summary.avgPerformance = Math.round(totalPerformance / results.length);
  summary.avgFatigue = Math.round(totalFatigue / results.length);

  return summary;
}
```

### 4.2 신규 API: `/creatives/matrix/route.ts`

```typescript
// src/app/api/accounts/[accountId]/creatives/matrix/route.ts

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { scoreCreatives, CreativeWithMetrics } from '@/lib/analytics/creative-scorer';
import { calculateFatigueIndex, DailyMetric } from '@/lib/analytics/fatigue-calculator';
import {
  batchClassifyCreatives,
  groupByQuadrant,
  getMatrixSummary,
  MatrixInput,
} from '@/lib/analytics/creative-matrix';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: { accountId: string };
}

/**
 * GET /api/accounts/:accountId/creatives/matrix
 * 소재 성과×피로도 매트릭스 분석
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { accountId } = params;
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '14', 10);

    // 계정 확인
    const account = await prisma.account.findUnique({
      where: { id: accountId },
      select: { id: true },
    });

    if (!account) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Account not found' } },
        { status: 404 }
      );
    }

    // 소재 목록 조회
    const creatives = await prisma.creative.findMany({
      where: {
        ads: {
          some: {
            adGroup: { campaign: { accountId } },
          },
        },
      },
      select: {
        id: true,
        tiktokCreativeId: true,
        type: true,
        createdAt: true,
      },
    });

    if (creatives.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          summary: getMatrixSummary([]),
          quadrants: { SCALE: [], REFRESH: [], TEST: [], KILL: [] },
          creatives: [],
        },
      });
    }

    // 날짜 범위
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // 소재별 메트릭 조회
    const metrics = await prisma.performanceMetric.findMany({
      where: {
        creativeId: { in: creatives.map((c) => c.id) },
        date: { gte: startDate, lte: endDate },
        level: 'CREATIVE',
      },
      select: {
        creativeId: true,
        date: true,
        spend: true,
        impressions: true,
        clicks: true,
        conversions: true,
        ctr: true,
        cvr: true,
        cpa: true,
        roas: true,
        videoViews: true,
        videoWatched6s: true,
        avgVideoPlayTime: true,
      },
    });

    // 소재별 메트릭 그룹화
    const metricsMap = new Map<string, typeof metrics>();
    for (const m of metrics) {
      if (!m.creativeId) continue;
      const list = metricsMap.get(m.creativeId) || [];
      list.push(m);
      metricsMap.set(m.creativeId, list);
    }

    // 소재별 점수 및 피로도 계산
    const matrixInputs: MatrixInput[] = [];

    for (const creative of creatives) {
      const creativeMetrics = metricsMap.get(creative.id) || [];

      if (creativeMetrics.length === 0) continue;

      // 집계 메트릭
      const aggregated = creativeMetrics.reduce(
        (acc, m) => ({
          spend: acc.spend + m.spend,
          impressions: acc.impressions + m.impressions,
          clicks: acc.clicks + m.clicks,
          conversions: acc.conversions + m.conversions,
          videoViews: acc.videoViews + (m.videoViews ?? 0),
          videoWatched6s: acc.videoWatched6s + (m.videoWatched6s ?? 0),
          avgVideoPlayTime: m.avgVideoPlayTime ?? acc.avgVideoPlayTime,
        }),
        { spend: 0, impressions: 0, clicks: 0, conversions: 0, videoViews: 0, videoWatched6s: 0, avgVideoPlayTime: 0 }
      );

      // 성과 점수 계산
      const creativeWithMetrics: CreativeWithMetrics = {
        id: creative.id,
        type: creative.type,
        metrics: {
          spend: aggregated.spend,
          impressions: aggregated.impressions,
          clicks: aggregated.clicks,
          conversions: aggregated.conversions,
          ctr: aggregated.impressions > 0 ? (aggregated.clicks / aggregated.impressions) * 100 : 0,
          cvr: aggregated.clicks > 0 ? (aggregated.conversions / aggregated.clicks) * 100 : 0,
          cpc: aggregated.clicks > 0 ? aggregated.spend / aggregated.clicks : 0,
          cpm: aggregated.impressions > 0 ? (aggregated.spend / aggregated.impressions) * 1000 : 0,
          cpa: aggregated.conversions > 0 ? aggregated.spend / aggregated.conversions : 0,
          roas: 0, // 별도 계산
          videoViews: aggregated.videoViews,
          videoWatched6s: aggregated.videoWatched6s,
          avgVideoPlayTime: aggregated.avgVideoPlayTime,
        },
      };

      const scores = scoreCreatives([creativeWithMetrics]);
      const score = scores.get(creative.id);
      if (!score) continue;

      // 피로도 계산
      const creativeAge = Math.ceil(
        (Date.now() - new Date(creative.createdAt).getTime()) / (1000 * 60 * 60 * 24)
      );

      const dailyMetrics: DailyMetric[] = creativeMetrics.map((m) => ({
        date: m.date,
        impressions: m.impressions,
        ctr: m.ctr ?? 0,
        cvr: m.cvr ?? 0,
        frequency: m.impressions > 0 ? 1 : 0, // 단순화
      }));

      const fatigue = calculateFatigueIndex({
        dailyMetrics,
        creativeAge,
      });

      matrixInputs.push({
        creativeId: creative.id,
        name: creative.tiktokCreativeId,
        score,
        fatigue,
      });
    }

    // 매트릭스 분류
    const results = batchClassifyCreatives(matrixInputs);
    const quadrants = groupByQuadrant(results);
    const summary = getMatrixSummary(results);

    return NextResponse.json({
      success: true,
      data: {
        period: { startDate, endDate, days },
        summary,
        quadrants,
        creatives: results,
      },
    });
  } catch (error) {
    console.error('Creative matrix error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to analyze creatives' } },
      { status: 500 }
    );
  }
}
```

---

## 5. Phase 4: 조기경보 시스템

### 5.1 신규 파일: `src/lib/analytics/early-warning.ts`

```typescript
/**
 * 조기경보 시스템
 *
 * 성과 하락 추세를 감지하고 리스크 스코어를 계산
 */

import { config } from '@/lib/config';
import { PerformanceTrend } from './fatigue-calculator';

// ============================================================
// 타입 정의
// ============================================================

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type WarningType = 'PERFORMANCE_DECLINE' | 'FATIGUE_SPIKE' | 'BUDGET_INEFFICIENCY';

export interface DailyTrendData {
  date: Date;
  spend: number;
  roas: number;
  cpa: number;
  ctr: number;
}

export interface WarningInput {
  entityId: string;
  entityType: 'AD' | 'CREATIVE' | 'CAMPAIGN';
  entityName: string;
  dailyData: DailyTrendData[];
  fatigueIndex?: number;
  fatigueTrend?: PerformanceTrend;
}

export interface WarningResult {
  entityId: string;
  entityType: string;
  entityName: string;
  riskScore: number; // 0-100
  riskLevel: RiskLevel;
  warnings: Warning[];
  prediction: Prediction | null;
  recommendedAction: string;
}

export interface Warning {
  type: WarningType;
  severity: RiskLevel;
  message: string;
  metric: string;
  change: number; // 변화율 (%)
}

export interface Prediction {
  metric: string;
  currentValue: number;
  predictedValue: number; // D+3 예측
  changePercent: number;
  confidence: number; // 0-100
}

// ============================================================
// 임계값
// ============================================================

const THRESHOLDS = {
  roasDeclineWarning: -15, // ROAS 15% 이상 하락
  roasDeclineCritical: -30,
  cpaIncreaseWarning: 20, // CPA 20% 이상 상승
  cpaIncreaseCritical: 40,
  ctrDeclineWarning: -20,
  slopeThreshold: -0.1, // 일일 기울기
  highRisk: 70,
  mediumRisk: 40,
};

// ============================================================
// 핵심 계산 함수
// ============================================================

/**
 * 선형 회귀 기울기 계산
 */
function calculateSlope(values: number[]): number {
  const n = values.length;
  if (n < 2) return 0;

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumX2 += i * i;
  }

  const denominator = n * sumX2 - sumX * sumX;
  if (denominator === 0) return 0;

  return (n * sumXY - sumX * sumY) / denominator;
}

/**
 * D+3 예측 (선형 회귀)
 */
function predictValue(values: number[], daysAhead: number = 3): Prediction | null {
  if (values.length < 5) return null;

  const slope = calculateSlope(values);
  const currentValue = values[values.length - 1];
  const avgValue = values.reduce((a, b) => a + b, 0) / values.length;

  const predictedValue = currentValue + slope * daysAhead;
  const changePercent = currentValue > 0
    ? ((predictedValue - currentValue) / currentValue) * 100
    : 0;

  // 신뢰도: 데이터 분산과 샘플 크기 기반
  const variance = values.reduce((sum, v) => sum + Math.pow(v - avgValue, 2), 0) / values.length;
  const cv = avgValue > 0 ? Math.sqrt(variance) / avgValue : 1;
  const confidence = Math.max(0, Math.min(100, 100 - cv * 50 - Math.max(0, 10 - values.length) * 5));

  return {
    metric: 'ROAS',
    currentValue,
    predictedValue,
    changePercent,
    confidence: Math.round(confidence),
  };
}

/**
 * 리스크 레벨 결정
 */
function determineRiskLevel(score: number): RiskLevel {
  if (score >= 80) return 'CRITICAL';
  if (score >= THRESHOLDS.highRisk) return 'HIGH';
  if (score >= THRESHOLDS.mediumRisk) return 'MEDIUM';
  return 'LOW';
}

/**
 * 변화율 계산
 */
function computeChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

// ============================================================
// 메인 경보 함수
// ============================================================

/**
 * 단일 엔티티 경보 분석
 */
export function analyzeWarnings(input: WarningInput): WarningResult {
  const { entityId, entityType, entityName, dailyData, fatigueIndex, fatigueTrend } = input;
  const warnings: Warning[] = [];
  let riskScore = 0;

  if (dailyData.length < 3) {
    return {
      entityId,
      entityType,
      entityName,
      riskScore: 0,
      riskLevel: 'LOW',
      warnings: [],
      prediction: null,
      recommendedAction: '데이터가 부족합니다. 계속 모니터링하세요.',
    };
  }

  // 최근 데이터 정렬
  const sorted = [...dailyData].sort((a, b) => a.date.getTime() - b.date.getTime());
  const recent = sorted.slice(-7);
  const previous = sorted.slice(-14, -7);

  // 현재/이전 기간 평균
  const recentAvg = {
    roas: recent.reduce((s, d) => s + d.roas, 0) / recent.length,
    cpa: recent.reduce((s, d) => s + d.cpa, 0) / recent.length,
    ctr: recent.reduce((s, d) => s + d.ctr, 0) / recent.length,
  };

  const previousAvg = previous.length > 0
    ? {
        roas: previous.reduce((s, d) => s + d.roas, 0) / previous.length,
        cpa: previous.reduce((s, d) => s + d.cpa, 0) / previous.length,
        ctr: previous.reduce((s, d) => s + d.ctr, 0) / previous.length,
      }
    : recentAvg;

  // ROAS 하락 경보
  const roasChange = computeChange(recentAvg.roas, previousAvg.roas);
  if (roasChange <= THRESHOLDS.roasDeclineCritical) {
    warnings.push({
      type: 'PERFORMANCE_DECLINE',
      severity: 'CRITICAL',
      message: `ROAS가 ${Math.abs(roasChange).toFixed(1)}% 급락했습니다.`,
      metric: 'ROAS',
      change: roasChange,
    });
    riskScore += 40;
  } else if (roasChange <= THRESHOLDS.roasDeclineWarning) {
    warnings.push({
      type: 'PERFORMANCE_DECLINE',
      severity: 'HIGH',
      message: `ROAS가 ${Math.abs(roasChange).toFixed(1)}% 하락했습니다.`,
      metric: 'ROAS',
      change: roasChange,
    });
    riskScore += 25;
  }

  // CPA 상승 경보
  const cpaChange = computeChange(recentAvg.cpa, previousAvg.cpa);
  if (cpaChange >= THRESHOLDS.cpaIncreaseCritical) {
    warnings.push({
      type: 'BUDGET_INEFFICIENCY',
      severity: 'CRITICAL',
      message: `CPA가 ${cpaChange.toFixed(1)}% 급등했습니다.`,
      metric: 'CPA',
      change: cpaChange,
    });
    riskScore += 35;
  } else if (cpaChange >= THRESHOLDS.cpaIncreaseWarning) {
    warnings.push({
      type: 'BUDGET_INEFFICIENCY',
      severity: 'HIGH',
      message: `CPA가 ${cpaChange.toFixed(1)}% 상승했습니다.`,
      metric: 'CPA',
      change: cpaChange,
    });
    riskScore += 20;
  }

  // 피로도 경보
  if (fatigueIndex !== undefined && fatigueIndex >= config.creativeFatigue.highThreshold) {
    warnings.push({
      type: 'FATIGUE_SPIKE',
      severity: fatigueTrend === 'EXHAUSTED' ? 'CRITICAL' : 'HIGH',
      message: `소재 피로도가 ${fatigueIndex}%로 높습니다.`,
      metric: 'Fatigue',
      change: fatigueIndex,
    });
    riskScore += fatigueIndex >= 80 ? 30 : 15;
  }

  // 추세 기반 리스크 가산
  const roasValues = recent.map((d) => d.roas);
  const roasSlope = calculateSlope(roasValues);
  if (roasSlope < THRESHOLDS.slopeThreshold) {
    riskScore += 15;
  }

  // 예측
  const prediction = predictValue(roasValues);

  // 최종 리스크 스코어 (0-100 제한)
  riskScore = Math.min(100, Math.max(0, riskScore));
  const riskLevel = determineRiskLevel(riskScore);

  // 권장 조치
  let recommendedAction: string;
  if (riskLevel === 'CRITICAL') {
    recommendedAction = '즉시 예산을 50% 감액하고 소재를 교체하세요.';
  } else if (riskLevel === 'HIGH') {
    recommendedAction = '예산을 20-30% 감액하고 새 소재를 테스트하세요.';
  } else if (riskLevel === 'MEDIUM') {
    recommendedAction = '성과를 주시하고 대체 소재를 준비하세요.';
  } else {
    recommendedAction = '현재 상태를 유지하고 정기적으로 모니터링하세요.';
  }

  return {
    entityId,
    entityType,
    entityName,
    riskScore,
    riskLevel,
    warnings,
    prediction,
    recommendedAction,
  };
}

/**
 * 여러 엔티티 배치 경보 분석
 */
export function batchAnalyzeWarnings(inputs: WarningInput[]): WarningResult[] {
  return inputs
    .map(analyzeWarnings)
    .filter((r) => r.riskScore > 0 || r.warnings.length > 0)
    .sort((a, b) => b.riskScore - a.riskScore);
}

/**
 * 경보 요약
 */
export interface WarningSummary {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  avgRiskScore: number;
}

export function getWarningSummary(results: WarningResult[]): WarningSummary {
  const summary: WarningSummary = {
    total: results.length,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    avgRiskScore: 0,
  };

  if (results.length === 0) return summary;

  let totalScore = 0;
  for (const r of results) {
    summary[r.riskLevel.toLowerCase() as 'critical' | 'high' | 'medium' | 'low']++;
    totalScore += r.riskScore;
  }

  summary.avgRiskScore = Math.round(totalScore / results.length);
  return summary;
}
```

### 5.2 daily-insights 수정

```typescript
// src/app/api/jobs/daily-insights/route.ts에 추가

import { batchAnalyzeWarnings, WarningSummary } from '@/lib/analytics/early-warning';

// 기존 인사이트 생성 로직 후에 추가:

// 조기경보 분석
const warningInputs = ads.map((ad) => ({
  entityId: ad.id,
  entityType: 'AD' as const,
  entityName: ad.name,
  dailyData: ad.dailyMetrics,
  fatigueIndex: ad.fatigueIndex,
  fatigueTrend: ad.fatigueTrend,
}));

const warnings = batchAnalyzeWarnings(warningInputs);

// 고위험 경보를 AIInsight로 저장
for (const warning of warnings.filter((w) => w.riskLevel === 'CRITICAL' || w.riskLevel === 'HIGH')) {
  await prisma.aIInsight.create({
    data: {
      accountId,
      type: 'ANOMALY',
      severity: warning.riskLevel === 'CRITICAL' ? 'CRITICAL' : 'WARNING',
      title: `${warning.entityName} 성과 하락 경보`,
      summary: warning.warnings.map((w) => w.message).join(' '),
      details: {
        riskScore: warning.riskScore,
        warnings: warning.warnings,
        prediction: warning.prediction,
      },
    },
  });
}
```

---

## 6. analytics/index.ts 통합 내보내기

```typescript
// src/lib/analytics/index.ts

// 기존 모듈
export * from './fatigue-calculator';
export * from './creative-scorer';

// 신규 모듈
export * from './metrics-calculator';
export * from './ad-segmenter';
export * from './creative-matrix';
export * from './early-warning';
```

---

## 7. 구현 체크리스트

### Phase 1: 지표 계산 표준화
- [ ] `src/lib/analytics/metrics-calculator.ts` 생성
- [ ] `prisma/schema.prisma` Account에 `conversionValue` 필드 추가
- [ ] `npx prisma migrate dev` 실행
- [ ] config.ts에 segment 설정 추가
- [ ] 기존 API 6개 수정 (ROAS 계산 교체)

### Phase 2: 광고 세그먼트
- [ ] `src/lib/analytics/ad-segmenter.ts` 생성
- [ ] `src/app/api/.../ads/analysis/route.ts` 생성

### Phase 3: 소재 매트릭스
- [ ] `src/lib/analytics/creative-matrix.ts` 생성
- [ ] `src/app/api/.../creatives/matrix/route.ts` 생성

### Phase 4: 조기경보
- [ ] `src/lib/analytics/early-warning.ts` 생성
- [ ] `daily-insights/route.ts` 수정
- [ ] `src/lib/analytics/index.ts` 업데이트

---

## 8. 테스트 시나리오

| 시나리오 | 입력 | 예상 결과 |
|----------|------|----------|
| ROAS 계산 | spend=100000, conversions=5, conversionValue=50000 | roas=2.5, valueSource='estimated' |
| 세그먼트 SCALE | ROAS=3.0, CPA=8000 | label='SCALE', action='증액' |
| 세그먼트 KILL | ROAS=0.3, CPA=25000 | label='KILL', action='중단' |
| 매트릭스 REFRESH | score=75, fatigue=65 | quadrant='REFRESH', priority=85 |
| 조기경보 CRITICAL | ROAS -35% 하락 | riskLevel='CRITICAL', warnings 포함 |
