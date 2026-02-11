/**
 * Creative Strategy Advisor
 * 소재별 전략 생성 모듈
 */

import { generateCompletion } from '../client';
import {
  CreativeStrategiesResponseSchema,
  type CreativeStrategy,
  type CreativeInsight,
} from '../schemas/creative-insight.schema';
import type { CreativeAnalysisContext } from './creative-insight-generator';

export interface CreativeStrategyContext {
  creative: CreativeAnalysisContext;
  insights: CreativeInsight[];
  existingStrategies?: { type: string; title: string }[];
}

const systemPrompt = `당신은 TikTok 광고 소재 전략 전문가입니다.
인사이트를 기반으로 실행 가능한 전략을 제안합니다.

전략 유형:
1. SCALE: 고성과 소재 확장 (예산 증액, 노출 확대, 유사 소재 제작)
2. OPTIMIZE: 소재 최적화 (타겟팅 조정, 시간대 최적화, 텍스트 개선)
3. REPLACE: 소재 교체 (신규 소재 준비, 기존 소재 중지, 리프레시)
4. TEST: A/B 테스트 (변형 테스트, 새로운 컨셉 시도)

priority 기준:
- HIGH: 즉시 실행 권장 (매출/효율에 큰 영향)
- MEDIUM: 1주일 내 실행 권장
- LOW: 여유 있을 때 실행

응답 형식 (JSON):
{
  "strategies": [{
    "type": "SCALE" | "OPTIMIZE" | "REPLACE" | "TEST",
    "priority": "HIGH" | "MEDIUM" | "LOW",
    "title": "전략 제목 (30자 이내)",
    "description": "전략 설명 (3문장, 150자 이내)",
    "actionItems": [{
      "action": "구체적 조치 (20자 이내)",
      "reason": "이유 (30자 이내)",
      "expectedImpact": "예상 효과 (20자 이내)"
    }],
    "estimatedImpact": {
      "metric": "개선 지표명",
      "changePercent": 예상 개선율(숫자),
      "confidence": 신뢰도(0-100)
    }
  }]
}

인사이트를 기반으로 1-3개의 전략을 생성하세요.
가장 효과적인 전략을 먼저 배치하세요.`;

function buildUserPrompt(context: CreativeStrategyContext): string {
  const { creative, insights, existingStrategies } = context;
  const { creative: creativeInfo, metrics, fatigue } = creative;

  return `## 소재 정보
- ID: ${creativeInfo.id}
- 유형: ${creativeInfo.type}
- 운영 기간: ${creativeInfo.daysActive}일

## 현재 성과
- CTR: ${metrics.current.ctr?.toFixed(2)}%
- CVR: ${metrics.current.cvr?.toFixed(2)}%
- CPA: ${metrics.current.cpa?.toLocaleString()}원
- ROAS: ${metrics.current.roas?.toFixed(2)}x

## 피로도: ${fatigue.index}/100 (${fatigue.trend})

## 분석된 인사이트
${insights.map((insight, i) => `
${i + 1}. [${insight.type}] ${insight.title} (${insight.severity})
   ${insight.summary}
   권장: ${insight.recommendations.join(', ')}
`).join('\n')}

${existingStrategies?.length ? `
## 이미 생성된 전략 (중복 방지)
${existingStrategies.map(s => `- [${s.type}] ${s.title}`).join('\n')}
` : ''}

인사이트를 기반으로 이 소재에 대한 전략을 제안해주세요.
각 인사이트에 대응하는 구체적이고 실행 가능한 전략을 우선순위와 함께 제시해주세요.`;
}

/**
 * 소재별 전략 생성
 */
export async function generateCreativeStrategies(
  context: CreativeStrategyContext
): Promise<CreativeStrategy[]> {
  const result = await generateCompletion(
    systemPrompt,
    buildUserPrompt(context),
    CreativeStrategiesResponseSchema,
    { temperature: 0.4 }
  );

  return result.strategies;
}

/**
 * Fallback 전략 생성 (AI 실패 시)
 */
export function generateFallbackStrategies(
  context: CreativeStrategyContext
): CreativeStrategy[] {
  const strategies: CreativeStrategy[] = [];
  const { creative, insights } = context;
  const { fatigue, metrics, accountBenchmark } = creative;

  // 피로도 기반 전략
  if (fatigue.index >= 80) {
    strategies.push({
      type: 'REPLACE',
      priority: 'HIGH',
      title: '소재 즉시 교체',
      description: `피로도 ${fatigue.index}%로 소재 수명이 다했습니다. 신규 소재로 즉시 교체하여 성과 하락을 방지하세요.`,
      actionItems: [
        { action: '신규 소재 교체', reason: '피로도 한계 도달', expectedImpact: 'CTR 회복' },
        { action: '기존 소재 중지', reason: '추가 손실 방지', expectedImpact: '예산 절감' },
      ],
      estimatedImpact: { metric: 'CTR', changePercent: 30, confidence: 75 },
    });
  } else if (fatigue.index >= 60) {
    strategies.push({
      type: 'REPLACE',
      priority: 'MEDIUM',
      title: '대체 소재 준비',
      description: `피로도 ${fatigue.index}%로 2주 내 교체가 필요합니다. 미리 대체 소재를 준비하세요.`,
      actionItems: [
        { action: '대체 소재 제작', reason: '교체 대비', expectedImpact: '연속성 확보' },
        { action: '성과 모니터링', reason: '교체 시점 판단', expectedImpact: '최적 타이밍' },
      ],
      estimatedImpact: { metric: 'CTR', changePercent: 20, confidence: 70 },
    });
  }

  // 성과 기반 전략
  const ctrRatio = (metrics.current.ctr || 0) / accountBenchmark.avgCtr;
  const roasRatio = (metrics.current.roas || 0) / accountBenchmark.avgRoas;

  if (ctrRatio >= 1.2 && roasRatio >= 1.2 && fatigue.index < 60) {
    strategies.push({
      type: 'SCALE',
      priority: 'HIGH',
      title: '고성과 소재 확장',
      description: `CTR과 ROAS가 모두 평균 이상인 우수 소재입니다. 예산을 증액하여 더 많은 성과를 확보하세요.`,
      actionItems: [
        { action: '예산 20% 증액', reason: 'ROAS 우수', expectedImpact: '전환 20% 증가' },
        { action: '유사 소재 제작', reason: '성공 패턴 복제', expectedImpact: '리스크 분산' },
      ],
      estimatedImpact: { metric: 'Conversions', changePercent: 20, confidence: 80 },
    });
  } else if (ctrRatio < 0.8) {
    strategies.push({
      type: 'OPTIMIZE',
      priority: 'MEDIUM',
      title: 'CTR 개선 최적화',
      description: `CTR이 평균 이하입니다. 썸네일과 첫 3초 구간을 개선하여 클릭률을 높이세요.`,
      actionItems: [
        { action: '썸네일 A/B 테스트', reason: 'CTR 개선', expectedImpact: 'CTR 15% 상승' },
        { action: '후킹 포인트 강화', reason: '주목도 향상', expectedImpact: '이탈률 감소' },
      ],
      estimatedImpact: { metric: 'CTR', changePercent: 15, confidence: 65 },
    });
  }

  // 인사이트 기반 추가 전략
  const criticalInsights = insights.filter(i => i.severity === 'CRITICAL');
  if (criticalInsights.length > 0 && strategies.length < 3) {
    strategies.push({
      type: 'TEST',
      priority: 'MEDIUM',
      title: '개선 테스트 실행',
      description: '분석된 문제점을 개선한 변형 소재로 A/B 테스트를 실행하세요.',
      actionItems: [
        { action: '변형 소재 제작', reason: '문제점 개선', expectedImpact: '성과 검증' },
        { action: 'A/B 테스트 설정', reason: '효과 측정', expectedImpact: '최적안 도출' },
      ],
      estimatedImpact: { metric: 'Overall', changePercent: 10, confidence: 60 },
    });
  }

  return strategies.slice(0, 3);
}
