/**
 * AI 프롬프트 템플릿 - 공통 요소 정의
 *
 * 모든 AI 프롬프트에서 재사용되는 공통 템플릿입니다.
 * 새로운 프롬프트 추가 시 이 템플릿을 활용하세요.
 */

// ============================================================
// 기본 역할 정의
// ============================================================

export const ROLES = {
  /**
   * TikTok 광고 성과 분석 전문가
   */
  ANALYST: `당신은 TikTok 광고 성과 분석 전문가입니다.
데이터 기반의 객관적인 분석과 실행 가능한 권장사항을 제공합니다.
한국어로 응답하며, 마케터가 바로 활용할 수 있는 인사이트를 제공합니다.`,

  /**
   * 예산 최적화 전문가
   */
  BUDGET_OPTIMIZER: `당신은 광고 예산 최적화 전문가입니다.
ROI를 극대화하기 위한 데이터 기반 예산 배분 전략을 제안합니다.
리스크를 최소화하면서 테스트 가능한 단위로 전략을 제안합니다.`,

  /**
   * 소재 최적화 전문가
   */
  CREATIVE_OPTIMIZER: `당신은 광고 소재 최적화 전문가입니다.
소재 성과 데이터를 분석하여 크리에이티브 전략을 제안합니다.
성공 요인을 추출하고 구체적인 개선 방안을 제시합니다.`,

  /**
   * 이상 탐지 전문가
   */
  ANOMALY_DETECTOR: `당신은 광고 성과 이상 탐지 전문가입니다.
주어진 데이터에서 비정상적인 패턴을 감지하고 원인을 분석합니다.
각 이상에 대해 심각도를 판단하고 권장 조치를 제안합니다.`,
} as const;

// ============================================================
// 분석 원칙
// ============================================================

export const ANALYSIS_PRINCIPLES = `
분석 원칙:
1. 데이터 기반 분석만 수행 (추측 금지)
2. 변화의 원인을 논리적으로 추론
3. 실행 가능한 제안 포함
4. 비전문가도 이해할 수 있는 언어 사용
`;

export const STRATEGY_PRINCIPLES = `
전략 수립 원칙:
1. 데이터 기반 의사결정
2. 리스크 최소화 (급격한 변경 지양)
3. 테스트 가능한 단위로 제안
4. 예상 임팩트 수치화
`;

// ============================================================
// 이상 탐지 임계값
// ============================================================

export const ANOMALY_THRESHOLDS = {
  CPA_SPIKE: 30,      // CPA 30% 이상 급등
  CTR_DROP: 20,       // CTR 20% 이상 급락
  IMPRESSION_DROP: 50, // 노출수 50% 이상 급감
  SPEND_VELOCITY: 150, // 예산 소진 속도 150% 이상
  ROAS_DROP: 30,      // ROAS 30% 이상 하락
} as const;

// ============================================================
// 응답 스키마 템플릿
// ============================================================

export const RESPONSE_SCHEMAS = {
  /**
   * 인사이트 응답 형식
   */
  INSIGHT: `{
  "insights": [{
    "type": "DAILY_SUMMARY" | "ANOMALY" | "TREND" | "CREATIVE" | "PREDICTION",
    "severity": "INFO" | "WARNING" | "CRITICAL",
    "title": "제목 (100자 이내)",
    "summary": "핵심 요약 (3문장 이내)",
    "keyFindings": [{
      "finding": "발견 내용",
      "impact": "POSITIVE" | "NEGATIVE" | "NEUTRAL",
      "metric": "관련 지표명",
      "change": 변화율(숫자),
      "evidence": "근거"
    }],
    "rootCause": [{
      "factor": "요인",
      "contribution": 기여도(0-100),
      "evidence": "근거"
    }],
    "recommendations": ["권장 조치 1", "권장 조치 2"]
  }]
}`,

  /**
   * 전략 응답 형식
   */
  STRATEGY: `{
  "strategies": [{
    "type": "BUDGET" | "CAMPAIGN" | "TARGETING" | "CREATIVE" | "BIDDING",
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
      "confidence": 신뢰도(0-100)
    },
    "difficulty": "EASY" | "MEDIUM" | "HARD",
    "estimatedEffort": "예상 소요 시간"
  }]
}`,
} as const;

// ============================================================
// 프롬프트 빌더 헬퍼
// ============================================================

/**
 * 시스템 프롬프트 조합
 */
export function buildSystemPrompt(
  role: keyof typeof ROLES,
  principles?: string,
  responseSchema?: keyof typeof RESPONSE_SCHEMAS,
  additionalContext?: string
): string {
  const parts: string[] = [ROLES[role]];

  if (principles) {
    parts.push(principles);
  }

  if (additionalContext) {
    parts.push(additionalContext);
  }

  if (responseSchema) {
    parts.push(`\n응답 형식 (JSON):\n${RESPONSE_SCHEMAS[responseSchema]}`);
  }

  return parts.join('\n\n');
}

/**
 * 데이터 포맷팅 헬퍼
 */
export function formatMetricsForPrompt(
  metrics: Record<string, number | string>,
  indent = 2
): string {
  return JSON.stringify(metrics, null, indent);
}

/**
 * 목록 데이터 포맷팅
 */
export function formatListForPrompt(
  items: unknown[],
  indent = 2
): string {
  return JSON.stringify(items, null, indent);
}

// ============================================================
// 타입 정의
// ============================================================

export type RoleType = keyof typeof ROLES;
export type ResponseSchemaType = keyof typeof RESPONSE_SCHEMAS;
export type AnomalyThresholdType = keyof typeof ANOMALY_THRESHOLDS;
