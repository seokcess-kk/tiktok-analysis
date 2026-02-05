/**
 * Anomaly Detector Module
 * AI 기반 이상 탐지 모듈
 *
 * 광고 성과 데이터의 비정상적인 패턴을 감지하고
 * 원인 분석 및 대응 방안을 제시합니다.
 */

import { generateCompletion } from '../client';
import { insightPrompts } from '../prompts/insight';
import { InsightsResponseSchema, type Insight } from '../schemas/insight.schema';

export interface MetricsSnapshot {
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
}

export interface AnomalyThresholds {
  cpaChange: number;      // CPA 변화율 임계값 (%)
  ctrChange: number;      // CTR 변화율 임계값 (%)
  impressionDrop: number; // 노출 감소 임계값 (%)
  spendVelocity: number;  // 예산 소진 속도 임계값 (%)
  roasDrop: number;       // ROAS 하락 임계값 (%)
}

export interface AnomalyDetectionInput {
  accountId: string;
  accountName: string;
  currentMetrics: MetricsSnapshot;
  previousMetrics: MetricsSnapshot;
  dailyBudget?: number;
  thresholds?: Partial<AnomalyThresholds>;
}

export interface DetectedAnomaly {
  type: 'CPA_SPIKE' | 'CTR_DROP' | 'IMPRESSION_DROP' | 'SPEND_VELOCITY' | 'ROAS_DROP' | 'OTHER';
  severity: 'WARNING' | 'CRITICAL';
  metric: string;
  currentValue: number;
  previousValue: number;
  changePercent: number;
  threshold: number;
}

// 기본 임계값
const DEFAULT_THRESHOLDS: AnomalyThresholds = {
  cpaChange: 30,      // CPA 30% 이상 급등
  ctrChange: 20,      // CTR 20% 이상 급락
  impressionDrop: 50, // 노출 50% 이상 급감
  spendVelocity: 150, // 예산 소진 150% 이상
  roasDrop: 30,       // ROAS 30% 이상 하락
};

/**
 * 변화율 계산
 */
function calculateChangePercent(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

/**
 * 규칙 기반 이상 탐지 (빠른 탐지용)
 */
export function detectAnomaliesRuleBased(
  input: AnomalyDetectionInput
): DetectedAnomaly[] {
  const { currentMetrics, previousMetrics, dailyBudget } = input;
  const thresholds = { ...DEFAULT_THRESHOLDS, ...input.thresholds };
  const anomalies: DetectedAnomaly[] = [];

  // 1. CPA 급등 체크
  const cpaChange = calculateChangePercent(currentMetrics.cpa, previousMetrics.cpa);
  if (cpaChange >= thresholds.cpaChange) {
    anomalies.push({
      type: 'CPA_SPIKE',
      severity: cpaChange >= thresholds.cpaChange * 1.5 ? 'CRITICAL' : 'WARNING',
      metric: 'CPA',
      currentValue: currentMetrics.cpa,
      previousValue: previousMetrics.cpa,
      changePercent: cpaChange,
      threshold: thresholds.cpaChange,
    });
  }

  // 2. CTR 급락 체크
  const ctrChange = calculateChangePercent(currentMetrics.ctr, previousMetrics.ctr);
  if (ctrChange <= -thresholds.ctrChange) {
    anomalies.push({
      type: 'CTR_DROP',
      severity: ctrChange <= -thresholds.ctrChange * 1.5 ? 'CRITICAL' : 'WARNING',
      metric: 'CTR',
      currentValue: currentMetrics.ctr,
      previousValue: previousMetrics.ctr,
      changePercent: ctrChange,
      threshold: thresholds.ctrChange,
    });
  }

  // 3. 노출 급감 체크
  const impressionChange = calculateChangePercent(
    currentMetrics.impressions,
    previousMetrics.impressions
  );
  if (impressionChange <= -thresholds.impressionDrop) {
    anomalies.push({
      type: 'IMPRESSION_DROP',
      severity: 'CRITICAL',
      metric: 'Impressions',
      currentValue: currentMetrics.impressions,
      previousValue: previousMetrics.impressions,
      changePercent: impressionChange,
      threshold: thresholds.impressionDrop,
    });
  }

  // 4. 예산 소진 속도 체크
  if (dailyBudget && dailyBudget > 0) {
    const spendRate = (currentMetrics.spend / dailyBudget) * 100;
    // 하루 중 절반도 안 지났는데 예산의 70% 이상 소진
    const hourOfDay = new Date().getHours();
    const expectedSpendRate = (hourOfDay / 24) * 100;
    const spendVelocity = spendRate / (expectedSpendRate || 1) * 100;

    if (spendVelocity >= thresholds.spendVelocity) {
      anomalies.push({
        type: 'SPEND_VELOCITY',
        severity: spendVelocity >= thresholds.spendVelocity * 1.3 ? 'CRITICAL' : 'WARNING',
        metric: 'Spend Velocity',
        currentValue: spendRate,
        previousValue: expectedSpendRate,
        changePercent: spendVelocity - 100,
        threshold: thresholds.spendVelocity,
      });
    }
  }

  // 5. ROAS 급락 체크
  const roasChange = calculateChangePercent(currentMetrics.roas, previousMetrics.roas);
  if (roasChange <= -thresholds.roasDrop && previousMetrics.roas > 0) {
    anomalies.push({
      type: 'ROAS_DROP',
      severity: roasChange <= -thresholds.roasDrop * 1.5 ? 'CRITICAL' : 'WARNING',
      metric: 'ROAS',
      currentValue: currentMetrics.roas,
      previousValue: previousMetrics.roas,
      changePercent: roasChange,
      threshold: thresholds.roasDrop,
    });
  }

  return anomalies;
}

/**
 * AI 기반 이상 탐지 (심층 분석용)
 */
export async function detectAnomaliesWithAI(
  input: AnomalyDetectionInput
): Promise<Insight[]> {
  const { currentMetrics, previousMetrics, thresholds } = input;
  const mergedThresholds = { ...DEFAULT_THRESHOLDS, ...thresholds };

  const data = {
    currentMetrics: {
      spend: Math.round(currentMetrics.spend),
      impressions: currentMetrics.impressions,
      clicks: currentMetrics.clicks,
      conversions: currentMetrics.conversions,
      ctr: Number(currentMetrics.ctr.toFixed(2)),
      cvr: Number(currentMetrics.cvr.toFixed(2)),
      cpa: Math.round(currentMetrics.cpa),
      roas: Number(currentMetrics.roas.toFixed(2)),
    },
    previousMetrics: {
      spend: Math.round(previousMetrics.spend),
      impressions: previousMetrics.impressions,
      clicks: previousMetrics.clicks,
      conversions: previousMetrics.conversions,
      ctr: Number(previousMetrics.ctr.toFixed(2)),
      cvr: Number(previousMetrics.cvr.toFixed(2)),
      cpa: Math.round(previousMetrics.cpa),
      roas: Number(previousMetrics.roas.toFixed(2)),
    },
    thresholds: {
      cpaChangeThreshold: mergedThresholds.cpaChange,
      ctrChangeThreshold: mergedThresholds.ctrChange,
      impressionDropThreshold: mergedThresholds.impressionDrop,
      roasDropThreshold: mergedThresholds.roasDrop,
    },
  };

  const result = await generateCompletion(
    insightPrompts.anomalyDetection.system,
    insightPrompts.anomalyDetection.user(data),
    InsightsResponseSchema,
    { temperature: 0.2 }
  );

  return result.insights;
}

/**
 * 하이브리드 이상 탐지 (규칙 + AI 결합)
 */
export async function detectAnomalies(
  input: AnomalyDetectionInput
): Promise<{
  ruleBasedAnomalies: DetectedAnomaly[];
  aiInsights: Insight[];
  hasAnomalies: boolean;
  overallSeverity: 'NONE' | 'WARNING' | 'CRITICAL';
}> {
  // 1. 빠른 규칙 기반 탐지
  const ruleBasedAnomalies = detectAnomaliesRuleBased(input);

  // 2. 이상이 감지된 경우에만 AI 분석 수행 (비용 최적화)
  let aiInsights: Insight[] = [];
  if (ruleBasedAnomalies.length > 0) {
    try {
      aiInsights = await detectAnomaliesWithAI(input);
    } catch (error) {
      console.error('AI anomaly detection failed:', error);
      // AI 실패 시에도 규칙 기반 결과는 반환
    }
  }

  // 3. 전체 심각도 판단
  const hasCritical =
    ruleBasedAnomalies.some((a) => a.severity === 'CRITICAL') ||
    aiInsights.some((i) => i.severity === 'CRITICAL');
  const hasWarning =
    ruleBasedAnomalies.length > 0 || aiInsights.length > 0;

  let overallSeverity: 'NONE' | 'WARNING' | 'CRITICAL' = 'NONE';
  if (hasCritical) overallSeverity = 'CRITICAL';
  else if (hasWarning) overallSeverity = 'WARNING';

  return {
    ruleBasedAnomalies,
    aiInsights,
    hasAnomalies: ruleBasedAnomalies.length > 0 || aiInsights.length > 0,
    overallSeverity,
  };
}

/**
 * 이상 탐지 결과를 사람이 읽기 쉬운 형태로 변환
 */
export function formatAnomalyReport(
  anomalies: DetectedAnomaly[]
): string {
  if (anomalies.length === 0) {
    return '현재 감지된 이상 징후가 없습니다.';
  }

  const typeLabels: Record<string, string> = {
    CPA_SPIKE: 'CPA 급등',
    CTR_DROP: 'CTR 급락',
    IMPRESSION_DROP: '노출 급감',
    SPEND_VELOCITY: '예산 과소진',
    ROAS_DROP: 'ROAS 하락',
    OTHER: '기타 이상',
  };

  const lines = anomalies.map((a) => {
    const severityIcon = a.severity === 'CRITICAL' ? '🚨' : '⚠️';
    const changeDir = a.changePercent >= 0 ? '↑' : '↓';
    return `${severityIcon} ${typeLabels[a.type]}: ${a.metric} ${Math.abs(a.changePercent).toFixed(1)}% ${changeDir} (${a.previousValue.toFixed(2)} → ${a.currentValue.toFixed(2)})`;
  });

  return lines.join('\n');
}

/**
 * 시계열 데이터에서 이상 패턴 탐지 (트렌드 기반)
 */
export function detectTrendAnomalies(
  data: Array<{ date: string; value: number }>,
  metric: string
): DetectedAnomaly[] {
  if (data.length < 3) return [];

  const anomalies: DetectedAnomaly[] = [];
  const values = data.map((d) => d.value);

  // 이동 평균 계산 (3일)
  const movingAvg = values.map((_, i) => {
    if (i < 2) return values[i];
    return (values[i] + values[i - 1] + values[i - 2]) / 3;
  });

  // 표준편차 계산
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const stdDev = Math.sqrt(
    values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length
  );

  // 최근 값이 이동평균에서 2 표준편차 이상 벗어나면 이상
  const latestValue = values[values.length - 1];
  const latestMovingAvg = movingAvg[movingAvg.length - 1];
  const deviation = Math.abs(latestValue - latestMovingAvg);

  if (deviation > stdDev * 2) {
    const changePercent = ((latestValue - latestMovingAvg) / latestMovingAvg) * 100;
    anomalies.push({
      type: 'OTHER',
      severity: deviation > stdDev * 3 ? 'CRITICAL' : 'WARNING',
      metric,
      currentValue: latestValue,
      previousValue: latestMovingAvg,
      changePercent,
      threshold: stdDev * 2,
    });
  }

  return anomalies;
}
