/**
 * 조기경보 시스템 모듈
 *
 * 성과 하락 추세 감지 및 리스크 스코어 계산
 */

import { config } from '@/lib/config';

// ============================================================
// 타입 정의
// ============================================================

export interface DailyMetricPoint {
  date: Date;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr?: number;
  cpa?: number;
  roas?: number;
}

export interface TrendAnalysis {
  slope: number;
  direction: 'RISING' | 'STABLE' | 'DECLINING';
  confidence: number;
  projectedValue: number;
}

export interface RiskAssessment {
  riskScore: number; // 0-100
  riskLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  factors: RiskFactor[];
  prediction: {
    metric: string;
    currentValue: number;
    projectedValue: number;
    daysToThreshold: number | null;
  }[];
}

export interface RiskFactor {
  factor: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
  contribution: number; // 0-100
}

export interface EarlyWarning {
  entityId: string;
  entityType: 'ACCOUNT' | 'CAMPAIGN' | 'ADGROUP' | 'AD';
  entityName: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  type: 'CPA_SPIKE' | 'CTR_DROP' | 'IMPRESSION_DROP' | 'ROAS_DROP' | 'SPEND_VELOCITY' | 'TREND_DECLINE';
  title: string;
  message: string;
  riskAssessment: RiskAssessment;
  detectedAt: Date;
  recommendedAction: string;
}

// ============================================================
// 추세 분석
// ============================================================

/**
 * 선형 회귀로 추세 분석
 */
export function analyzeTrend(values: number[]): TrendAnalysis {
  if (values.length < 2) {
    return {
      slope: 0,
      direction: 'STABLE',
      confidence: 0,
      projectedValue: values[0] ?? 0,
    };
  }

  const n = values.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  let sumYY = 0;

  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumXX += i * i;
    sumYY += values[i] * values[i];
  }

  const denominator = n * sumXX - sumX * sumX;
  if (denominator === 0) {
    return {
      slope: 0,
      direction: 'STABLE',
      confidence: 0,
      projectedValue: values[n - 1],
    };
  }

  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;

  // R² 계산 (신뢰도)
  const yMean = sumY / n;
  let ssTotal = 0;
  let ssResidual = 0;

  for (let i = 0; i < n; i++) {
    const predicted = slope * i + intercept;
    ssTotal += Math.pow(values[i] - yMean, 2);
    ssResidual += Math.pow(values[i] - predicted, 2);
  }

  const rSquared = ssTotal > 0 ? 1 - ssResidual / ssTotal : 0;
  const confidence = Math.max(0, Math.min(100, rSquared * 100));

  // D+3 예측값
  const projectedValue = slope * (n + 2) + intercept;

  // 방향 결정
  const slopeThreshold = config.analytics.segment.trendSlopeThreshold;
  let direction: 'RISING' | 'STABLE' | 'DECLINING';

  if (slope > Math.abs(slopeThreshold)) {
    direction = 'RISING';
  } else if (slope < slopeThreshold) {
    direction = 'DECLINING';
  } else {
    direction = 'STABLE';
  }

  return {
    slope,
    direction,
    confidence,
    projectedValue: Math.max(0, projectedValue),
  };
}

// ============================================================
// 리스크 평가
// ============================================================

/**
 * 일별 메트릭에서 리스크 평가
 */
export function assessRisk(
  dailyMetrics: DailyMetricPoint[],
  options: {
    benchmarkCpa?: number;
    benchmarkCtr?: number;
    conversionValue?: number;
  } = {}
): RiskAssessment {
  const benchmarkCpa = options.benchmarkCpa ?? config.analytics.benchmarks.cpa;
  const benchmarkCtr = options.benchmarkCtr ?? config.analytics.benchmarks.ctr;
  const conversionValue = options.conversionValue ?? config.analytics.defaultConversionValue;

  const factors: RiskFactor[] = [];
  const predictions: RiskAssessment['prediction'] = [];

  if (dailyMetrics.length < 3) {
    return {
      riskScore: 0,
      riskLevel: 'LOW',
      factors: [{ factor: 'INSUFFICIENT_DATA', severity: 'LOW', description: '분석에 필요한 데이터 부족', contribution: 0 }],
      prediction: [],
    };
  }

  // ROAS 추세 분석
  const roasValues = dailyMetrics.map((m) => {
    if (m.spend === 0) return 0;
    return (m.conversions * conversionValue) / m.spend;
  });
  const roasTrend = analyzeTrend(roasValues);

  if (roasTrend.direction === 'DECLINING' && roasTrend.confidence > 50) {
    const severity = roasTrend.slope < -0.2 ? 'HIGH' : 'MEDIUM';
    factors.push({
      factor: 'ROAS_DECLINE',
      severity,
      description: `ROAS 하락 추세 (기울기: ${roasTrend.slope.toFixed(3)})`,
      contribution: severity === 'HIGH' ? 30 : 20,
    });

    predictions.push({
      metric: 'ROAS',
      currentValue: roasValues[roasValues.length - 1],
      projectedValue: roasTrend.projectedValue,
      daysToThreshold: estimateDaysToThreshold(roasValues, config.analytics.segment.killRoasThreshold, roasTrend.slope),
    });
  }

  // CPA 추세 분석
  const cpaValues = dailyMetrics.map((m) => {
    if (m.conversions === 0) return benchmarkCpa * 3; // 전환 없으면 높은 값
    return m.spend / m.conversions;
  });
  const cpaTrend = analyzeTrend(cpaValues);

  if (cpaTrend.direction === 'RISING' && cpaTrend.confidence > 50) {
    const currentCpa = cpaValues[cpaValues.length - 1];
    const cpaRatio = currentCpa / benchmarkCpa;
    const severity = cpaRatio > 2 ? 'HIGH' : cpaRatio > 1.5 ? 'MEDIUM' : 'LOW';

    factors.push({
      factor: 'CPA_INCREASE',
      severity,
      description: `CPA 상승 추세 (현재: ${Math.round(currentCpa)}원, 벤치마크: ${benchmarkCpa}원)`,
      contribution: severity === 'HIGH' ? 25 : 15,
    });

    predictions.push({
      metric: 'CPA',
      currentValue: currentCpa,
      projectedValue: cpaTrend.projectedValue,
      daysToThreshold: estimateDaysToThreshold(cpaValues, benchmarkCpa * 2, cpaTrend.slope, true),
    });
  }

  // CTR 추세 분석
  const ctrValues = dailyMetrics.map((m) => {
    if (m.impressions === 0) return 0;
    return (m.clicks / m.impressions) * 100;
  });
  const ctrTrend = analyzeTrend(ctrValues);

  if (ctrTrend.direction === 'DECLINING' && ctrTrend.confidence > 50) {
    const currentCtr = ctrValues[ctrValues.length - 1];
    const ctrRatio = currentCtr / benchmarkCtr;
    const severity = ctrRatio < 0.5 ? 'HIGH' : ctrRatio < 0.7 ? 'MEDIUM' : 'LOW';

    factors.push({
      factor: 'CTR_DECLINE',
      severity,
      description: `CTR 하락 추세 (현재: ${currentCtr.toFixed(2)}%, 벤치마크: ${benchmarkCtr}%)`,
      contribution: severity === 'HIGH' ? 20 : 10,
    });

    predictions.push({
      metric: 'CTR',
      currentValue: currentCtr,
      projectedValue: Math.max(0, ctrTrend.projectedValue),
      daysToThreshold: estimateDaysToThreshold(ctrValues, benchmarkCtr * 0.5, ctrTrend.slope),
    });
  }

  // 노출수 급감 체크
  const impressionValues = dailyMetrics.map((m) => m.impressions);
  const avgImpressions = impressionValues.reduce((a, b) => a + b, 0) / impressionValues.length;
  const recentImpressions = impressionValues.slice(-3).reduce((a, b) => a + b, 0) / 3;

  if (avgImpressions > 0 && recentImpressions < avgImpressions * 0.5) {
    factors.push({
      factor: 'IMPRESSION_DROP',
      severity: 'HIGH',
      description: `노출수 급감 (평균 대비 ${((recentImpressions / avgImpressions) * 100).toFixed(0)}%)`,
      contribution: 25,
    });
  }

  // 리스크 스코어 계산
  const totalContribution = factors.reduce((sum, f) => sum + f.contribution, 0);
  const riskScore = Math.min(100, totalContribution);

  let riskLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  if (riskScore >= 60) {
    riskLevel = 'HIGH';
  } else if (riskScore >= 30) {
    riskLevel = 'MEDIUM';
  } else {
    riskLevel = 'LOW';
  }

  return {
    riskScore,
    riskLevel,
    factors,
    prediction: predictions,
  };
}

/**
 * 임계값 도달까지 예상 일수 계산
 */
function estimateDaysToThreshold(
  values: number[],
  threshold: number,
  slope: number,
  ascending: boolean = false
): number | null {
  if (slope === 0) return null;

  const currentValue = values[values.length - 1];

  if (ascending) {
    // 값이 증가하여 임계값에 도달하는 경우 (CPA 등)
    if (currentValue >= threshold || slope <= 0) return null;
    const days = (threshold - currentValue) / slope;
    return days > 0 && days < 30 ? Math.ceil(days) : null;
  } else {
    // 값이 감소하여 임계값 이하로 떨어지는 경우 (ROAS 등)
    if (currentValue <= threshold || slope >= 0) return null;
    const days = (currentValue - threshold) / Math.abs(slope);
    return days > 0 && days < 30 ? Math.ceil(days) : null;
  }
}

// ============================================================
// 경보 생성
// ============================================================

/**
 * 조기경보 생성
 */
export function generateWarnings(
  entities: Array<{
    id: string;
    type: 'ACCOUNT' | 'CAMPAIGN' | 'ADGROUP' | 'AD';
    name: string;
    dailyMetrics: DailyMetricPoint[];
  }>,
  options: {
    benchmarkCpa?: number;
    benchmarkCtr?: number;
    conversionValue?: number;
  } = {}
): EarlyWarning[] {
  const warnings: EarlyWarning[] = [];

  for (const entity of entities) {
    const assessment = assessRisk(entity.dailyMetrics, options);

    if (assessment.riskLevel === 'LOW') continue;

    // 가장 심각한 요인 선택
    const primaryFactor = assessment.factors.sort((a, b) => b.contribution - a.contribution)[0];
    if (!primaryFactor) continue;

    const severity = assessment.riskLevel === 'HIGH' ? 'CRITICAL' : 'WARNING';

    let type: EarlyWarning['type'];
    let title: string;
    let message: string;
    let recommendedAction: string;

    switch (primaryFactor.factor) {
      case 'ROAS_DECLINE':
        type = 'ROAS_DROP';
        title = 'ROAS 하락 경고';
        message = `${entity.name}의 ROAS가 지속적으로 하락하고 있습니다.`;
        recommendedAction = '소재 교체 또는 타겟팅 조정을 검토하세요.';
        break;
      case 'CPA_INCREASE':
        type = 'CPA_SPIKE';
        title = 'CPA 급등 경고';
        message = `${entity.name}의 CPA가 벤치마크를 초과하여 상승 중입니다.`;
        recommendedAction = '입찰가 조정 또는 비효율 타겟 제외를 검토하세요.';
        break;
      case 'CTR_DECLINE':
        type = 'CTR_DROP';
        title = 'CTR 하락 경고';
        message = `${entity.name}의 CTR이 지속적으로 하락하고 있습니다.`;
        recommendedAction = '소재 피로도 점검 및 신규 소재 테스트를 권장합니다.';
        break;
      case 'IMPRESSION_DROP':
        type = 'IMPRESSION_DROP';
        title = '노출수 급감 경고';
        message = `${entity.name}의 노출수가 평균 대비 크게 감소했습니다.`;
        recommendedAction = '입찰가, 예산, 타겟팅 설정을 확인하세요.';
        break;
      default:
        type = 'TREND_DECLINE';
        title = '성과 하락 경고';
        message = `${entity.name}의 전반적인 성과가 하락하고 있습니다.`;
        recommendedAction = '종합적인 캠페인 점검이 필요합니다.';
    }

    // D+3 예측 정보 추가
    const prediction = assessment.prediction.find((p) => p.daysToThreshold !== null);
    if (prediction) {
      message += ` 현재 추세가 지속되면 약 ${prediction.daysToThreshold}일 후 위험 수준에 도달할 수 있습니다.`;
    }

    warnings.push({
      entityId: entity.id,
      entityType: entity.type,
      entityName: entity.name,
      severity,
      type,
      title,
      message,
      riskAssessment: assessment,
      detectedAt: new Date(),
      recommendedAction,
    });
  }

  // 심각도 순 정렬
  return warnings.sort((a, b) => {
    const severityOrder = { CRITICAL: 0, WARNING: 1, INFO: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
}
