/**
 * Creative Fatigue Calculator
 * 소재 피로도 지수 계산 알고리즘
 *
 * 피로도 지수는 0-100 범위로 계산되며, 높을수록 소재 교체가 필요함을 의미
 *
 * 계산 요소:
 * - CTR 하락률 (35%): 피크 대비 현재 CTR 하락 비율
 * - CVR 하락률 (30%): 피크 대비 현재 CVR 하락 비율
 * - 빈도 증가율 (20%): 초기 대비 최근 빈도 증가 비율
 * - 소재 수명 (15%): 활성 기간에 따른 점수
 */

export type PerformanceTrend = 'RISING' | 'STABLE' | 'DECLINING' | 'EXHAUSTED';

export interface DailyMetric {
  date: Date;
  impressions: number;
  ctr: number;
  cvr: number;
  frequency: number;
}

export interface FatigueInput {
  dailyMetrics: DailyMetric[];
  creativeAge: number; // 일수
}

export interface FatigueFactor {
  factor: string;
  weight: number;
  value: number;
  contribution: number; // weight * value
}

export interface FatigueOutput {
  index: number; // 0-100
  trend: PerformanceTrend;
  peakDate: Date | null;
  peakCtr: number | null;
  currentCtr: number | null;
  daysFromPeak: number | null;
  estimatedExhaustion: Date | null;
  factors: FatigueFactor[];
  recommendation: FatigueRecommendation;
}

export interface FatigueRecommendation {
  action: 'KEEP' | 'MONITOR' | 'PREPARE_REPLACEMENT' | 'REPLACE' | 'URGENT_REPLACE';
  reason: string;
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

// 가중치 상수
const WEIGHTS = {
  CTR_DECLINE: 0.35,
  CVR_DECLINE: 0.30,
  FREQUENCY_INCREASE: 0.20,
  AGE_FACTOR: 0.15,
} as const;

// 임계값 상수
const THRESHOLDS = {
  MAX_AGE_DAYS: 30, // 30일 기준 수명
  EXHAUSTED_INDEX: 80, // 80 이상이면 소진됨
  WARNING_INDEX: 60, // 60 이상이면 주의
  SLOPE_DECLINING: -0.05, // 기울기 -0.05 미만이면 하락 추세
  SLOPE_RISING: 0.05, // 기울기 0.05 초과이면 상승 추세
} as const;

/**
 * 선형 회귀 기울기 계산
 * 최소자승법을 사용하여 데이터 포인트의 추세를 계산
 */
function calculateSlope(values: number[]): number {
  const n = values.length;
  if (n < 2) return 0;

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;

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
 * 배열의 평균 계산
 */
function calculateAverage(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

/**
 * 피로도 지수 기반 권장 조치 결정
 */
function getRecommendation(
  index: number,
  trend: PerformanceTrend,
  daysFromPeak: number | null
): FatigueRecommendation {
  if (index >= 80 || trend === 'EXHAUSTED') {
    return {
      action: 'URGENT_REPLACE',
      reason: '소재가 거의 소진되었습니다. 즉시 새로운 소재로 교체가 필요합니다.',
      urgency: 'CRITICAL',
    };
  }

  if (index >= 70) {
    return {
      action: 'REPLACE',
      reason: '피로도가 높습니다. 빠른 시일 내 소재 교체를 권장합니다.',
      urgency: 'HIGH',
    };
  }

  if (index >= 60 || trend === 'DECLINING') {
    return {
      action: 'PREPARE_REPLACEMENT',
      reason: '성과 하락이 시작되었습니다. 대체 소재를 준비해주세요.',
      urgency: 'MEDIUM',
    };
  }

  if (index >= 40 || (daysFromPeak !== null && daysFromPeak > 14)) {
    return {
      action: 'MONITOR',
      reason: '소재 성과를 주시하며 대체 소재 제작을 고려해주세요.',
      urgency: 'LOW',
    };
  }

  return {
    action: 'KEEP',
    reason: '소재가 양호한 상태입니다. 현재 소재를 유지하세요.',
    urgency: 'LOW',
  };
}

/**
 * 메인 피로도 계산 함수
 */
export function calculateFatigueIndex(input: FatigueInput): FatigueOutput {
  const { dailyMetrics, creativeAge } = input;

  // 데이터가 부족한 경우 기본값 반환
  if (dailyMetrics.length < 3) {
    return {
      index: 0,
      trend: 'STABLE',
      peakDate: null,
      peakCtr: null,
      currentCtr: null,
      daysFromPeak: null,
      estimatedExhaustion: null,
      factors: [],
      recommendation: {
        action: 'KEEP',
        reason: '분석을 위한 데이터가 부족합니다. 더 많은 데이터가 수집되면 정확한 분석이 가능합니다.',
        urgency: 'LOW',
      },
    };
  }

  // 날짜순 정렬 (오래된 것부터)
  const sortedMetrics = [...dailyMetrics].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // 1. CTR 분석
  const ctrValues = sortedMetrics.map((m) => m.ctr);
  const peakCtr = Math.max(...ctrValues);
  const peakCtrIndex = ctrValues.indexOf(peakCtr);
  const currentCtr = ctrValues[ctrValues.length - 1];
  const ctrDecline = peakCtr > 0 ? ((peakCtr - currentCtr) / peakCtr) * 100 : 0;

  // 2. CVR 분석
  const cvrValues = sortedMetrics.map((m) => m.cvr);
  const peakCvr = Math.max(...cvrValues);
  const currentCvr = cvrValues[cvrValues.length - 1];
  const cvrDecline = peakCvr > 0 ? ((peakCvr - currentCvr) / peakCvr) * 100 : 0;

  // 3. 빈도(Frequency) 분석
  const recentMetrics = sortedMetrics.slice(-7);
  const earlyMetrics = sortedMetrics.slice(0, Math.min(7, sortedMetrics.length));

  const recentFrequency = calculateAverage(recentMetrics.map((m) => m.frequency));
  const earlyFrequency = calculateAverage(earlyMetrics.map((m) => m.frequency));
  const frequencyIncrease = earlyFrequency > 0
    ? ((recentFrequency - earlyFrequency) / earlyFrequency) * 100
    : 0;

  // 4. 소재 수명 요소
  const ageScore = Math.min(creativeAge / THRESHOLDS.MAX_AGE_DAYS, 1) * 100;

  // 가중 평균 계산
  const factors: FatigueFactor[] = [
    {
      factor: 'CTR 하락',
      weight: WEIGHTS.CTR_DECLINE,
      value: Math.max(0, Math.min(ctrDecline, 100)),
      contribution: WEIGHTS.CTR_DECLINE * Math.max(0, Math.min(ctrDecline, 100)),
    },
    {
      factor: 'CVR 하락',
      weight: WEIGHTS.CVR_DECLINE,
      value: Math.max(0, Math.min(cvrDecline, 100)),
      contribution: WEIGHTS.CVR_DECLINE * Math.max(0, Math.min(cvrDecline, 100)),
    },
    {
      factor: '빈도 증가',
      weight: WEIGHTS.FREQUENCY_INCREASE,
      value: Math.max(0, Math.min(frequencyIncrease, 100)),
      contribution: WEIGHTS.FREQUENCY_INCREASE * Math.max(0, Math.min(frequencyIncrease, 100)),
    },
    {
      factor: '소재 수명',
      weight: WEIGHTS.AGE_FACTOR,
      value: ageScore,
      contribution: WEIGHTS.AGE_FACTOR * ageScore,
    },
  ];

  const rawIndex = factors.reduce((sum, f) => sum + f.contribution, 0);
  const index = Math.round(Math.min(rawIndex, 100));

  // 트렌드 판단
  const recentCtrValues = ctrValues.slice(-7);
  const recentSlope = calculateSlope(recentCtrValues);

  let trend: PerformanceTrend;
  if (index >= THRESHOLDS.EXHAUSTED_INDEX) {
    trend = 'EXHAUSTED';
  } else if (recentSlope < THRESHOLDS.SLOPE_DECLINING) {
    trend = 'DECLINING';
  } else if (recentSlope > THRESHOLDS.SLOPE_RISING) {
    trend = 'RISING';
  } else {
    trend = 'STABLE';
  }

  // 피크 날짜 및 피크로부터의 일수
  const peakDate = sortedMetrics[peakCtrIndex]?.date || null;
  const daysFromPeak = peakDate
    ? Math.floor((Date.now() - new Date(peakDate).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  // 예상 소진 날짜 계산 (선형 회귀 기반)
  let estimatedExhaustion: Date | null = null;
  if (trend === 'DECLINING' && index < THRESHOLDS.EXHAUSTED_INDEX && recentSlope !== 0) {
    // 하루 평균 피로도 증가율 추정
    const dailyFatigueIncrease = Math.abs(recentSlope) * 10; // CTR 하락 기울기를 피로도 증가로 변환
    if (dailyFatigueIncrease > 0) {
      const daysToExhaustion = (THRESHOLDS.EXHAUSTED_INDEX - index) / dailyFatigueIncrease;
      if (daysToExhaustion > 0 && daysToExhaustion < 365) {
        estimatedExhaustion = new Date();
        estimatedExhaustion.setDate(estimatedExhaustion.getDate() + Math.round(daysToExhaustion));
      }
    }
  }

  // 권장 조치 결정
  const recommendation = getRecommendation(index, trend, daysFromPeak);

  return {
    index,
    trend,
    peakDate,
    peakCtr,
    currentCtr,
    daysFromPeak,
    estimatedExhaustion,
    factors,
    recommendation,
  };
}

/**
 * 여러 소재의 피로도를 배치로 계산
 */
export function calculateBatchFatigue(
  creatives: Array<{ id: string; dailyMetrics: DailyMetric[]; creativeAge: number }>
): Map<string, FatigueOutput> {
  const results = new Map<string, FatigueOutput>();

  for (const creative of creatives) {
    const fatigue = calculateFatigueIndex({
      dailyMetrics: creative.dailyMetrics,
      creativeAge: creative.creativeAge,
    });
    results.set(creative.id, fatigue);
  }

  return results;
}

/**
 * 피로도 상태별 소재 분류
 */
export function categorizeFatigueStatus(
  creatives: Array<{ id: string; fatigueIndex: number; trend: PerformanceTrend }>
): {
  healthy: string[];
  warning: string[];
  critical: string[];
  exhausted: string[];
} {
  const result = {
    healthy: [] as string[],
    warning: [] as string[],
    critical: [] as string[],
    exhausted: [] as string[],
  };

  for (const creative of creatives) {
    if (creative.trend === 'EXHAUSTED' || creative.fatigueIndex >= 80) {
      result.exhausted.push(creative.id);
    } else if (creative.fatigueIndex >= 70) {
      result.critical.push(creative.id);
    } else if (creative.fatigueIndex >= 50) {
      result.warning.push(creative.id);
    } else {
      result.healthy.push(creative.id);
    }
  }

  return result;
}
