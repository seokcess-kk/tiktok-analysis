/**
 * Insight Generator Module
 * AI 기반 인사이트 생성 모듈
 *
 * GPT를 사용하여 광고 성과 데이터를 분석하고
 * 마케터가 즉시 활용 가능한 인사이트를 생성합니다.
 */

import { generateCompletion } from '../client';
import { insightPrompts, type DailyInsightData } from '../prompts/insight';
import { InsightsResponseSchema, type Insight } from '../schemas/insight.schema';

export interface PerformanceMetrics {
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

export interface MetricsTrend {
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  cpa: number;
}

export interface CreativeSummary {
  id: string;
  name: string;
  type: string;
  metrics: Partial<PerformanceMetrics>;
  fatigueIndex?: number;
}

export interface CampaignSummary {
  id: string;
  name: string;
  status: string;
  objective: string;
  budget: number;
  metrics: Partial<PerformanceMetrics>;
}

export interface InsightContext {
  account: {
    id: string;
    name: string;
    industry: string;
  };
  metrics: {
    current: PerformanceMetrics;
    previous: PerformanceMetrics;
    trend: MetricsTrend[];
  };
  creatives: CreativeSummary[];
  campaigns: CampaignSummary[];
}

/**
 * 메트릭 변화율 계산
 */
function calculateChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

/**
 * 메트릭 데이터 포맷팅
 */
function formatMetrics(metrics: PerformanceMetrics): Record<string, number> {
  return {
    spend: Math.round(metrics.spend),
    impressions: metrics.impressions,
    clicks: metrics.clicks,
    conversions: metrics.conversions,
    ctr: Number(metrics.ctr.toFixed(2)),
    cvr: Number(metrics.cvr.toFixed(2)),
    cpc: Math.round(metrics.cpc),
    cpm: Math.round(metrics.cpm),
    cpa: Math.round(metrics.cpa),
    roas: Number(metrics.roas.toFixed(2)),
  };
}

/**
 * 트렌드 데이터 포맷팅
 */
function formatTrend(trend: MetricsTrend[]): Record<string, number | string>[] {
  return trend.map((t) => ({
    date: t.date,
    spend: Math.round(t.spend),
    ctr: Number(t.ctr.toFixed(2)),
    cpa: Math.round(t.cpa),
  }));
}

/**
 * 일간 인사이트 생성
 */
export async function generateDailyInsight(context: InsightContext): Promise<Insight[]> {
  const data: DailyInsightData = {
    accountName: context.account.name,
    industry: context.account.industry,
    currentMetrics: formatMetrics(context.metrics.current),
    previousMetrics: formatMetrics(context.metrics.previous),
    trend: formatTrend(context.metrics.trend),
    topCreatives: context.creatives.slice(0, 5).map((c) => ({
      name: c.name,
      metrics: c.metrics,
    })),
    campaigns: context.campaigns.map((c) => ({
      name: c.name,
      status: c.status,
      metrics: { budget: c.budget, ...c.metrics },
    })),
  };

  const result = await generateCompletion(
    insightPrompts.dailySummary.system,
    insightPrompts.dailySummary.user(data),
    InsightsResponseSchema,
    { temperature: 0.3 }
  );

  return result.insights;
}

/**
 * 특정 기간 인사이트 생성
 */
export async function generatePeriodInsight(
  context: InsightContext,
  periodLabel: string
): Promise<Insight[]> {
  const systemPrompt = `당신은 TikTok 광고 성과 분석 전문가입니다.
주어진 데이터를 분석하여 마케터가 즉시 활용할 수 있는 인사이트를 제공합니다.

분석 원칙:
1. 데이터 기반 분석만 수행 (추측 금지)
2. 변화의 원인을 논리적으로 추론
3. 실행 가능한 제안 포함
4. 비전문가도 이해할 수 있는 언어 사용

응답 형식 (JSON):
{
  "insights": [{
    "type": "TREND",
    "severity": "INFO" | "WARNING" | "CRITICAL",
    "title": "제목 (100자 이내)",
    "summary": "핵심 요약 (3문장 이내)",
    "keyFindings": [{
      "finding": "발견 내용",
      "impact": "POSITIVE" | "NEGATIVE" | "NEUTRAL",
      "metric": "관련 지표명",
      "change": 변화율(숫자)
    }],
    "recommendations": ["권장 조치 1", "권장 조치 2"]
  }]
}`;

  const userPrompt = `
## 분석 대상
- 계정: ${context.account.name}
- 업종: ${context.account.industry}
- 분석 기간: ${periodLabel}

## 기간 성과
${JSON.stringify(formatMetrics(context.metrics.current), null, 2)}

## 이전 기간 대비
${JSON.stringify(formatMetrics(context.metrics.previous), null, 2)}

## 추이 데이터
${JSON.stringify(formatTrend(context.metrics.trend), null, 2)}

## 주요 캠페인
${JSON.stringify(
  context.campaigns.map((c) => ({
    name: c.name,
    status: c.status,
    budget: c.budget,
  })),
  null,
  2
)}

위 데이터를 분석하여 ${periodLabel} 핵심 인사이트를 생성해주세요.
주요 트렌드 변화와 성과 요인에 집중해주세요.
`;

  const result = await generateCompletion(
    systemPrompt,
    userPrompt,
    InsightsResponseSchema,
    { temperature: 0.3 }
  );

  return result.insights;
}

/**
 * 소재 중심 인사이트 생성
 */
export async function generateCreativeInsight(
  context: InsightContext
): Promise<Insight[]> {
  const systemPrompt = `당신은 TikTok 광고 소재 분석 전문가입니다.
소재별 성과 데이터를 분석하여 크리에이티브 최적화 인사이트를 제공합니다.

분석 포인트:
1. Top 소재 성공 요인 분석
2. 저성과 소재 문제점 파악
3. 피로도 높은 소재 경고
4. 신규 소재 제작 방향 제안

응답 형식 (JSON):
{
  "insights": [{
    "type": "CREATIVE",
    "severity": "INFO" | "WARNING" | "CRITICAL",
    "title": "제목",
    "summary": "요약",
    "keyFindings": [{
      "finding": "발견 내용",
      "impact": "POSITIVE" | "NEGATIVE" | "NEUTRAL",
      "metric": "지표명",
      "change": 수치
    }],
    "recommendations": ["권장 조치"]
  }]
}`;

  const userPrompt = `
## 계정 정보
- 계정: ${context.account.name}
- 업종: ${context.account.industry}

## 소재 성과 데이터
${JSON.stringify(
  context.creatives.map((c) => ({
    name: c.name,
    type: c.type,
    ctr: c.metrics.ctr,
    cvr: c.metrics.cvr,
    spend: c.metrics.spend,
    fatigueIndex: c.fatigueIndex,
  })),
  null,
  2
)}

## 전체 계정 평균
- 평균 CTR: ${context.metrics.current.ctr.toFixed(2)}%
- 평균 CVR: ${context.metrics.current.cvr.toFixed(2)}%
- 평균 CPA: ${Math.round(context.metrics.current.cpa)}원

위 데이터를 분석하여 소재 최적화 인사이트를 생성해주세요.
특히 고성과 소재의 공통점과 저성과 소재의 문제점에 집중해주세요.
`;

  const result = await generateCompletion(
    systemPrompt,
    userPrompt,
    InsightsResponseSchema,
    { temperature: 0.4 }
  );

  return result.insights;
}

/**
 * 예측 인사이트 생성
 */
export async function generatePredictionInsight(
  context: InsightContext
): Promise<Insight[]> {
  const systemPrompt = `당신은 광고 성과 예측 전문가입니다.
과거 데이터 트렌드를 기반으로 향후 성과를 예측하고 선제적 조치를 제안합니다.

예측 포인트:
1. 현재 추세 유지 시 예상 성과
2. 위험 요소 사전 감지
3. 기회 요소 발굴
4. 선제적 대응 전략

응답 형식 (JSON):
{
  "insights": [{
    "type": "PREDICTION",
    "severity": "INFO" | "WARNING",
    "title": "제목",
    "summary": "예측 요약",
    "keyFindings": [{
      "finding": "예측 내용",
      "impact": "POSITIVE" | "NEGATIVE" | "NEUTRAL",
      "metric": "지표명",
      "change": 예상 변화율
    }],
    "recommendations": ["선제적 조치"]
  }]
}`;

  const userPrompt = `
## 계정 정보
- 계정: ${context.account.name}
- 업종: ${context.account.industry}

## 최근 트렌드 데이터 (7일)
${JSON.stringify(formatTrend(context.metrics.trend), null, 2)}

## 현재 성과
${JSON.stringify(formatMetrics(context.metrics.current), null, 2)}

## 소재 피로도 현황
${JSON.stringify(
  context.creatives
    .filter((c) => c.fatigueIndex && c.fatigueIndex > 50)
    .map((c) => ({
      name: c.name,
      fatigueIndex: c.fatigueIndex,
    })),
  null,
  2
)}

위 데이터의 트렌드를 분석하여 향후 예측 인사이트를 생성해주세요.
특히 잠재적 위험 요소와 기회 요소에 집중해주세요.
`;

  const result = await generateCompletion(
    systemPrompt,
    userPrompt,
    InsightsResponseSchema,
    { temperature: 0.4 }
  );

  return result.insights;
}

/**
 * 종합 인사이트 생성 (여러 유형 조합)
 */
export async function generateComprehensiveInsights(
  context: InsightContext
): Promise<{
  daily: Insight[];
  creative: Insight[];
  prediction: Insight[];
}> {
  const [daily, creative, prediction] = await Promise.all([
    generateDailyInsight(context),
    generateCreativeInsight(context),
    generatePredictionInsight(context),
  ]);

  return { daily, creative, prediction };
}
