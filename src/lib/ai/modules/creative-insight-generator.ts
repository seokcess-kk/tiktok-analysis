/**
 * Creative Insight Generator
 * 개별 소재에 대한 AI 인사이트 생성 모듈
 */

import { generateCompletion } from '../client';
import {
  CreativeInsightsResponseSchema,
  type CreativeInsight,
} from '../schemas/creative-insight.schema';
import type { PerformanceTrend } from '@/lib/analytics/fatigue-calculator';

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
}

export interface DailyMetric {
  date: string;
  impressions: number;
  ctr: number;
  cvr: number;
  cpa: number;
}

export interface CreativeAnalysisContext {
  creative: {
    id: string;
    name?: string;
    type: 'VIDEO' | 'IMAGE' | 'CAROUSEL';
    duration?: number;
    tags?: string[];
    daysActive: number;
  };
  metrics: {
    current: Partial<CreativeMetrics>;
    previous?: Partial<CreativeMetrics>;
    trend: DailyMetric[];
  };
  fatigue: {
    index: number;
    trend: PerformanceTrend;
    estimatedExhaustion?: Date | null;
    daysFromPeak?: number | null;
  };
  accountBenchmark: {
    avgCtr: number;
    avgCvr: number;
    avgCpa: number;
    avgRoas: number;
    topPerformerCtr: number;
    topPerformerRoas: number;
  };
}

const systemPrompt = `당신은 TikTok 광고 소재 분석 전문가입니다.
개별 소재의 성과 데이터를 분석하여 구체적이고 실행 가능한 인사이트를 제공합니다.

분석 관점:
1. PERFORMANCE: CTR, CVR, CPA, ROAS 등 핵심 지표 평가
2. FATIGUE: 소재 피로도 및 수명 분석, 교체 시점 판단
3. COMPARISON: 계정 평균 및 Top 소재 대비 성과 비교
4. OPTIMIZATION: 개선 가능한 영역 식별 및 구체적 조치 제안

severity 기준:
- INFO: 정보 제공 (성과 좋음, 현 상태 유지)
- WARNING: 주의 필요 (성과 하락, 곧 조치 필요)
- CRITICAL: 즉시 조치 필요 (심각한 문제, 긴급)

응답 형식 (JSON):
{
  "insights": [{
    "type": "PERFORMANCE" | "FATIGUE" | "OPTIMIZATION" | "COMPARISON",
    "severity": "INFO" | "WARNING" | "CRITICAL",
    "title": "인사이트 제목 (20자 이내)",
    "summary": "핵심 요약 (2문장, 100자 이내)",
    "details": {
      "metrics": [{ "name": "지표명", "value": 수치, "benchmark": 기준값, "status": "ABOVE"|"BELOW"|"AVERAGE" }],
      "trends": [{ "metric": "지표명", "direction": "UP"|"DOWN"|"STABLE", "changePercent": 변화율 }],
      "comparison": { "accountAverage": 계정평균, "creativeValue": 소재값, "percentile": 백분위 }
    },
    "recommendations": ["권장 조치 1", "권장 조치 2"]
  }]
}

최소 2개, 최대 4개의 인사이트를 생성하세요.
가장 중요한 인사이트를 먼저 배치하세요.`;

function buildUserPrompt(context: CreativeAnalysisContext): string {
  const { creative, metrics, fatigue, accountBenchmark } = context;

  return `## 소재 정보
- ID: ${creative.id}
- 유형: ${creative.type}
- 운영 기간: ${creative.daysActive}일
${creative.duration ? `- 영상 길이: ${creative.duration}초` : ''}
${creative.tags?.length ? `- 태그: ${creative.tags.join(', ')}` : ''}

## 현재 성과
- 지출: ${metrics.current.spend?.toLocaleString()}원
- 노출: ${metrics.current.impressions?.toLocaleString()}회
- 클릭: ${metrics.current.clicks?.toLocaleString()}회
- 전환: ${metrics.current.conversions?.toLocaleString()}건
- CTR: ${metrics.current.ctr?.toFixed(2)}%
- CVR: ${metrics.current.cvr?.toFixed(2)}%
- CPA: ${metrics.current.cpa?.toLocaleString()}원
- ROAS: ${metrics.current.roas?.toFixed(2)}x

## 피로도 현황
- 피로도 지수: ${fatigue.index}/100 (${fatigue.index >= 80 ? '심각' : fatigue.index >= 60 ? '주의' : fatigue.index >= 40 ? '보통' : '양호'})
- 성과 추세: ${fatigue.trend === 'RISING' ? '상승' : fatigue.trend === 'STABLE' ? '안정' : fatigue.trend === 'DECLINING' ? '하락' : '소진'}
${fatigue.daysFromPeak ? `- 피크 이후: ${fatigue.daysFromPeak}일 경과` : ''}
${fatigue.estimatedExhaustion ? `- 예상 소진일: ${new Date(fatigue.estimatedExhaustion).toLocaleDateString('ko-KR')}` : ''}

## 계정 벤치마크 (비교 기준)
- 평균 CTR: ${accountBenchmark.avgCtr.toFixed(2)}%
- 평균 CVR: ${accountBenchmark.avgCvr.toFixed(2)}%
- 평균 CPA: ${accountBenchmark.avgCpa.toLocaleString()}원
- 평균 ROAS: ${accountBenchmark.avgRoas.toFixed(2)}x
- Top 소재 CTR: ${accountBenchmark.topPerformerCtr.toFixed(2)}%
- Top 소재 ROAS: ${accountBenchmark.topPerformerRoas.toFixed(2)}x

## 최근 7일 추이
${metrics.trend.slice(-7).map(t => `${t.date}: CTR ${t.ctr.toFixed(2)}%, CVR ${t.cvr.toFixed(2)}%, CPA ${t.cpa.toLocaleString()}원`).join('\n')}

이 소재에 대한 인사이트를 생성해주세요.
성과 수준, 피로도 상태, 계정 내 위치를 종합적으로 분석해주세요.`;
}

/**
 * 개별 소재에 대한 인사이트 생성
 */
export async function generateCreativeInsights(
  context: CreativeAnalysisContext
): Promise<CreativeInsight[]> {
  const result = await generateCompletion(
    systemPrompt,
    buildUserPrompt(context),
    CreativeInsightsResponseSchema,
    { temperature: 0.3 }
  );

  return result.insights;
}

/**
 * Fallback 인사이트 생성 (AI 실패 시)
 */
export function generateFallbackInsights(
  context: CreativeAnalysisContext
): CreativeInsight[] {
  const insights: CreativeInsight[] = [];
  const { metrics, fatigue, accountBenchmark } = context;

  // 1. 성과 인사이트
  const ctrRatio = (metrics.current.ctr || 0) / accountBenchmark.avgCtr;
  if (ctrRatio >= 1.2) {
    insights.push({
      type: 'PERFORMANCE',
      severity: 'INFO',
      title: 'CTR 상위 소재',
      summary: `이 소재의 CTR은 ${metrics.current.ctr?.toFixed(2)}%로 계정 평균(${accountBenchmark.avgCtr.toFixed(2)}%) 대비 ${((ctrRatio - 1) * 100).toFixed(0)}% 높습니다.`,
      details: {
        metrics: [{
          name: 'CTR',
          value: metrics.current.ctr || 0,
          benchmark: accountBenchmark.avgCtr,
          status: 'ABOVE',
        }],
      },
      recommendations: ['예산 증액 검토', '유사 소재 제작 고려'],
    });
  } else if (ctrRatio < 0.8) {
    insights.push({
      type: 'PERFORMANCE',
      severity: 'WARNING',
      title: 'CTR 개선 필요',
      summary: `이 소재의 CTR은 ${metrics.current.ctr?.toFixed(2)}%로 계정 평균 대비 ${((1 - ctrRatio) * 100).toFixed(0)}% 낮습니다. 썸네일 또는 첫 3초 개선을 권장합니다.`,
      details: {
        metrics: [{
          name: 'CTR',
          value: metrics.current.ctr || 0,
          benchmark: accountBenchmark.avgCtr,
          status: 'BELOW',
        }],
      },
      recommendations: ['썸네일 교체 테스트', '후킹 포인트 강화'],
    });
  }

  // 2. 피로도 인사이트
  if (fatigue.index >= 80) {
    insights.push({
      type: 'FATIGUE',
      severity: 'CRITICAL',
      title: '소재 교체 필요',
      summary: `피로도 ${fatigue.index}%로 소재 수명이 거의 다했습니다. 즉시 대체 소재를 준비하세요.`,
      details: {
        trends: [{
          metric: '피로도',
          direction: 'UP',
          changePercent: fatigue.index,
        }],
      },
      recommendations: ['신규 소재 즉시 교체', '기존 소재 예산 축소'],
    });
  } else if (fatigue.index >= 60) {
    insights.push({
      type: 'FATIGUE',
      severity: 'WARNING',
      title: '소재 교체 준비',
      summary: `피로도 ${fatigue.index}%로 곧 성과 하락이 예상됩니다. 대체 소재를 준비하세요.`,
      details: {
        trends: [{
          metric: '피로도',
          direction: 'UP',
          changePercent: fatigue.index,
        }],
      },
      recommendations: ['대체 소재 제작 착수', '성과 모니터링 강화'],
    });
  }

  // 3. ROAS 인사이트
  const roasRatio = (metrics.current.roas || 0) / accountBenchmark.avgRoas;
  if (roasRatio >= 1.3) {
    insights.push({
      type: 'COMPARISON',
      severity: 'INFO',
      title: 'ROAS 우수 소재',
      summary: `ROAS ${metrics.current.roas?.toFixed(2)}x로 계정 평균 대비 ${((roasRatio - 1) * 100).toFixed(0)}% 높은 우수 소재입니다.`,
      details: {
        comparison: {
          accountAverage: accountBenchmark.avgRoas,
          creativeValue: metrics.current.roas || 0,
          percentile: Math.min(95, Math.round(roasRatio * 50)),
        },
      },
      recommendations: ['예산 확대 권장', '이 소재 스타일 벤치마킹'],
    });
  }

  return insights.slice(0, 4); // 최대 4개
}
