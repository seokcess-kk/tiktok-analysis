/**
 * Strategy Advisor Module
 * AI 기반 전략 제안 모듈
 *
 * 광고 성과 데이터를 분석하여 실행 가능한 전략을 생성합니다.
 */

import { generateCompletion } from '../client';
import {
  strategyPrompts,
  type BudgetStrategyData,
  type CreativeStrategyData,
} from '../prompts/strategy';
import {
  StrategiesResponseSchema,
  type Strategy,
} from '../schemas/strategy.schema';

export interface CampaignDetail {
  id: string;
  name: string;
  objective: string;
  budget: number;
  budgetMode: string;
  status: string;
  metrics: {
    spend: number;
    impressions: number;
    clicks: number;
    conversions: number;
    ctr: number;
    cvr: number;
    cpa: number;
    roas: number;
  };
}

export interface CreativeDetail {
  id: string;
  name: string;
  type: string;
  tags: string[];
  metrics: {
    spend: number;
    impressions: number;
    clicks: number;
    conversions: number;
    ctr: number;
    cvr: number;
    cpa: number;
  };
  fatigue?: {
    index: number;
    trend: string;
  };
}

export interface StrategyContext {
  account: {
    id: string;
    name: string;
    industry: string;
  };
  campaigns: CampaignDetail[];
  creatives: CreativeDetail[];
  constraints?: {
    maxBudgetChange?: number;
    targetRoas?: number;
    excludeCampaigns?: string[];
  };
}

/**
 * 총 예산 계산
 */
function calculateTotalBudget(campaigns: CampaignDetail[]): number {
  return campaigns.reduce((sum, c) => sum + c.budget, 0);
}

/**
 * 상위 성과 소재 추출
 */
function getTopPerformers(creatives: CreativeDetail[], limit = 5) {
  return [...creatives]
    .sort((a, b) => {
      // ROAS or CTR 기준 정렬
      const aScore = a.metrics.ctr * (a.metrics.cvr || 1);
      const bScore = b.metrics.ctr * (b.metrics.cvr || 1);
      return bScore - aScore;
    })
    .slice(0, limit)
    .map((c) => ({
      id: c.id,
      commonTraits: c.tags || [],
    }));
}

/**
 * 하위 성과 소재 추출
 */
function getBottomPerformers(creatives: CreativeDetail[], limit = 5) {
  return [...creatives]
    .filter((c) => c.metrics.spend > 0) // 지출이 있는 소재만
    .sort((a, b) => {
      const aScore = a.metrics.ctr * (a.metrics.cvr || 1);
      const bScore = b.metrics.ctr * (b.metrics.cvr || 1);
      return aScore - bScore;
    })
    .slice(0, limit)
    .map((c) => ({
      id: c.id,
      issues: identifyCreativeIssues(c),
    }));
}

/**
 * 소재 문제점 식별
 */
function identifyCreativeIssues(creative: CreativeDetail): string[] {
  const issues: string[] = [];

  if (creative.metrics.ctr < 0.5) {
    issues.push('낮은 클릭률 (0.5% 미만)');
  }
  if (creative.metrics.cvr < 1.0) {
    issues.push('낮은 전환율 (1% 미만)');
  }
  if (creative.fatigue && creative.fatigue.index > 70) {
    issues.push('높은 피로도 (70% 이상)');
  }
  if (creative.fatigue?.trend === 'DECLINING') {
    issues.push('성과 하락 추세');
  }
  if (creative.metrics.spend > 0 && creative.metrics.conversions === 0) {
    issues.push('전환 없는 지출');
  }

  return issues.length > 0 ? issues : ['특별한 이슈 없음'];
}

/**
 * 예산 최적화 전략 생성
 */
export async function generateBudgetStrategy(
  context: StrategyContext
): Promise<Strategy[]> {
  const data: BudgetStrategyData = {
    currentBudget: calculateTotalBudget(context.campaigns),
    campaignPerformance: context.campaigns.map((c) => ({
      id: c.id,
      name: c.name,
      budget: c.budget,
      spend: c.metrics.spend,
      roas: c.metrics.roas,
      cpa: c.metrics.cpa,
    })),
    constraints: context.constraints || {},
  };

  const result = await generateCompletion(
    strategyPrompts.budgetOptimization.system,
    strategyPrompts.budgetOptimization.user(data),
    StrategiesResponseSchema,
    { temperature: 0.4 }
  );

  return result.strategies;
}

/**
 * 소재 최적화 전략 생성
 */
export async function generateCreativeStrategy(
  context: StrategyContext
): Promise<Strategy[]> {
  const data: CreativeStrategyData = {
    creatives: context.creatives.map((c) => ({
      id: c.id,
      type: c.type,
      metrics: c.metrics,
      fatigue: c.fatigue,
      tags: c.tags,
    })),
    topPerformers: getTopPerformers(context.creatives),
    bottomPerformers: getBottomPerformers(context.creatives),
  };

  const result = await generateCompletion(
    strategyPrompts.creativeOptimization.system,
    strategyPrompts.creativeOptimization.user(data),
    StrategiesResponseSchema,
    { temperature: 0.5 }
  );

  return result.strategies;
}

/**
 * 타겟팅 최적화 전략 생성
 */
export async function generateTargetingStrategy(
  context: StrategyContext
): Promise<Strategy[]> {
  const systemPrompt = `당신은 광고 타겟팅 최적화 전문가입니다.
캠페인 성과 데이터를 분석하여 타겟팅 개선 전략을 제안합니다.

분석 포인트:
1. 고성과 타겟 그룹 확대
2. 저성과 타겟 제외
3. 유사 타겟(Lookalike) 활용
4. 관심사/행동 타겟 조정

응답 형식 (JSON):
{
  "strategies": [{
    "type": "TARGETING",
    "priority": "HIGH" | "MEDIUM" | "LOW",
    "title": "전략 제목",
    "description": "설명",
    "actionItems": [{
      "action": "액션",
      "target": "대상",
      "targetId": "ID",
      "currentValue": "현재값",
      "suggestedValue": "제안값",
      "reason": "이유"
    }],
    "expectedImpact": {
      "metric": "지표",
      "currentValue": 현재값,
      "expectedValue": 예상값,
      "changePercent": 변화율,
      "confidence": 신뢰도
    },
    "difficulty": "EASY" | "MEDIUM" | "HARD",
    "estimatedEffort": "예상 소요 시간"
  }]
}`;

  const userPrompt = `
## 계정 정보
- 계정: ${context.account.name}
- 업종: ${context.account.industry}

## 캠페인별 성과
${JSON.stringify(
  context.campaigns.map((c) => ({
    name: c.name,
    objective: c.objective,
    ctr: c.metrics.ctr,
    cvr: c.metrics.cvr,
    cpa: c.metrics.cpa,
    roas: c.metrics.roas,
  })),
  null,
  2
)}

위 데이터를 분석하여 타겟팅 최적화 전략을 제안해주세요.
`;

  const result = await generateCompletion(
    systemPrompt,
    userPrompt,
    StrategiesResponseSchema,
    { temperature: 0.4 }
  );

  return result.strategies;
}

/**
 * 입찰 전략 생성
 */
export async function generateBiddingStrategy(
  context: StrategyContext
): Promise<Strategy[]> {
  const systemPrompt = `당신은 광고 입찰 전략 전문가입니다.
캠페인 성과와 경쟁 환경을 분석하여 입찰 최적화 전략을 제안합니다.

입찰 전략 유형:
1. 자동 입찰 vs 수동 입찰
2. 입찰가 조정
3. 입찰 전략 변경 (최저 비용, 비용 상한, ROAS 목표)
4. 시간대별 입찰 조정

응답 형식 (JSON):
{
  "strategies": [{
    "type": "BIDDING",
    "priority": "HIGH" | "MEDIUM" | "LOW",
    "title": "전략 제목",
    "description": "설명",
    "actionItems": [...],
    "expectedImpact": {...},
    "difficulty": "EASY" | "MEDIUM" | "HARD",
    "estimatedEffort": "예상 소요 시간"
  }]
}`;

  const userPrompt = `
## 캠페인 입찰 현황
${JSON.stringify(
  context.campaigns.map((c) => ({
    name: c.name,
    budget: c.budget,
    spend: c.metrics.spend,
    cpa: c.metrics.cpa,
    roas: c.metrics.roas,
    impressions: c.metrics.impressions,
  })),
  null,
  2
)}

## 제약 조건
- 목표 ROAS: ${context.constraints?.targetRoas || '미지정'}

위 데이터를 분석하여 입찰 최적화 전략을 제안해주세요.
`;

  const result = await generateCompletion(
    systemPrompt,
    userPrompt,
    StrategiesResponseSchema,
    { temperature: 0.4 }
  );

  return result.strategies;
}

/**
 * 종합 전략 생성 (모든 유형)
 */
export async function generateComprehensiveStrategies(
  context: StrategyContext
): Promise<{
  budget: Strategy[];
  creative: Strategy[];
  targeting: Strategy[];
  bidding: Strategy[];
  all: Strategy[];
}> {
  const [budget, creative, targeting, bidding] = await Promise.all([
    generateBudgetStrategy(context),
    generateCreativeStrategy(context),
    generateTargetingStrategy(context),
    generateBiddingStrategy(context),
  ]);

  // 전체 전략을 우선순위로 정렬
  const all = [...budget, ...creative, ...targeting, ...bidding].sort((a, b) => {
    const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  return { budget, creative, targeting, bidding, all };
}

/**
 * 특정 인사이트 기반 전략 생성
 */
export async function generateStrategyFromInsight(
  context: StrategyContext,
  insight: {
    type: string;
    title: string;
    summary: string;
    keyFindings: Array<{ finding: string; metric: string; change: number }>;
  }
): Promise<Strategy[]> {
  const systemPrompt = `당신은 광고 최적화 전문가입니다.
주어진 인사이트를 기반으로 실행 가능한 전략을 제안합니다.

인사이트 유형에 따른 전략:
- ANOMALY: 이상 상황 해결을 위한 즉각적 조치
- TREND: 트렌드 활용/대응 전략
- CREATIVE: 소재 관련 전략
- DAILY_SUMMARY: 일상적 최적화 전략

응답 형식 (JSON):
{
  "strategies": [{
    "type": "BUDGET" | "CAMPAIGN" | "TARGETING" | "CREATIVE" | "BIDDING",
    "priority": "HIGH" | "MEDIUM" | "LOW",
    "title": "전략 제목",
    "description": "설명",
    "actionItems": [...],
    "expectedImpact": {...},
    "difficulty": "EASY" | "MEDIUM" | "HARD",
    "estimatedEffort": "예상 소요 시간"
  }]
}`;

  const userPrompt = `
## 인사이트 정보
- 유형: ${insight.type}
- 제목: ${insight.title}
- 요약: ${insight.summary}

## 주요 발견
${JSON.stringify(insight.keyFindings, null, 2)}

## 현재 캠페인 현황
${JSON.stringify(
  context.campaigns.slice(0, 5).map((c) => ({
    name: c.name,
    budget: c.budget,
    cpa: c.metrics.cpa,
    roas: c.metrics.roas,
  })),
  null,
  2
)}

위 인사이트를 해결하거나 활용하기 위한 구체적인 전략을 제안해주세요.
`;

  const result = await generateCompletion(
    systemPrompt,
    userPrompt,
    StrategiesResponseSchema,
    { temperature: 0.4 }
  );

  return result.strategies;
}

/**
 * 전략 우선순위 재계산
 */
export function reprioritizeStrategies(
  strategies: Strategy[],
  context: {
    urgentMetrics?: string[];
    excludeTypes?: string[];
  }
): Strategy[] {
  return strategies
    .filter((s) => !context.excludeTypes?.includes(s.type))
    .map((s) => {
      // 긴급 메트릭 관련 전략은 우선순위 상향
      if (
        context.urgentMetrics?.some(
          (m) => s.expectedImpact.metric.toLowerCase().includes(m.toLowerCase())
        )
      ) {
        return {
          ...s,
          priority: 'HIGH' as const,
        };
      }
      return s;
    })
    .sort((a, b) => {
      const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
}
