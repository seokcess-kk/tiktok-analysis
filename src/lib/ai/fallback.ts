/**
 * AI Fallback Module
 *
 * OpenAI API 키가 없거나 API 호출 실패 시 규칙 기반으로 인사이트/전략 생성
 */

export interface MetricData {
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  cpa: number;
  roas: number;
}

export interface FallbackInsight {
  type: 'DAILY_SUMMARY' | 'ANOMALY' | 'TREND' | 'CREATIVE' | 'PREDICTION';
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  title: string;
  summary: string;
  keyFindings: Array<{
    finding: string;
    impact: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
    metric: string;
    change: number;
  }>;
  recommendations: string[];
}

export interface FallbackStrategy {
  type: 'BUDGET' | 'CAMPAIGN' | 'TARGETING' | 'CREATIVE' | 'BIDDING';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  description: string;
  expectedImpact: {
    metric: string;
    changePercent: number;
  };
}

/**
 * 메트릭 변화율 계산
 */
function calculateChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

/**
 * 규칙 기반 인사이트 생성
 */
export function generateFallbackInsights(
  currentMetrics: MetricData,
  previousMetrics: MetricData,
  accountName: string
): FallbackInsight[] {
  const insights: FallbackInsight[] = [];

  const changes = {
    spend: calculateChange(currentMetrics.spend, previousMetrics.spend),
    ctr: calculateChange(currentMetrics.ctr, previousMetrics.ctr),
    cpa: calculateChange(currentMetrics.cpa, previousMetrics.cpa),
    roas: calculateChange(currentMetrics.roas, previousMetrics.roas),
    conversions: calculateChange(currentMetrics.conversions, previousMetrics.conversions),
  };

  // 1. Daily Summary 인사이트
  const keyFindings: FallbackInsight['keyFindings'] = [];

  if (Math.abs(changes.spend) > 10) {
    keyFindings.push({
      finding: `지출 ${changes.spend > 0 ? '증가' : '감소'}`,
      impact: changes.spend > 20 ? 'NEGATIVE' : changes.spend < -10 ? 'POSITIVE' : 'NEUTRAL',
      metric: 'Spend',
      change: Math.round(changes.spend),
    });
  }

  if (Math.abs(changes.roas) > 5) {
    keyFindings.push({
      finding: `ROAS ${changes.roas > 0 ? '상승' : '하락'}`,
      impact: changes.roas > 0 ? 'POSITIVE' : 'NEGATIVE',
      metric: 'ROAS',
      change: Math.round(changes.roas),
    });
  }

  if (Math.abs(changes.cpa) > 10) {
    keyFindings.push({
      finding: `CPA ${changes.cpa > 0 ? '상승' : '하락'}`,
      impact: changes.cpa < 0 ? 'POSITIVE' : 'NEGATIVE',
      metric: 'CPA',
      change: Math.round(changes.cpa),
    });
  }

  insights.push({
    type: 'DAILY_SUMMARY',
    severity: 'INFO',
    title: `${accountName} 일일 성과 요약`,
    summary: `전일 대비 ROAS ${changes.roas > 0 ? '+' : ''}${changes.roas.toFixed(1)}%, CPA ${changes.cpa > 0 ? '+' : ''}${changes.cpa.toFixed(1)}% 변동. ${keyFindings.length > 0 ? keyFindings.map(f => f.finding).join(', ') + '.' : '전반적으로 안정적입니다.'}`,
    keyFindings,
    recommendations: [
      changes.roas > 10 ? '고성과 캠페인 예산 증액 검토' : '캠페인 최적화 검토',
      changes.cpa > 15 ? '타겟팅 또는 소재 점검 필요' : '현재 전략 유지',
    ],
  });

  // 2. Anomaly 인사이트 (급격한 변화 감지)
  if (changes.cpa > 30) {
    insights.push({
      type: 'ANOMALY',
      severity: 'CRITICAL',
      title: 'CPA 급등 감지 - 즉시 확인 필요',
      summary: `CPA가 전일 대비 ${changes.cpa.toFixed(1)}% 급등했습니다. 전환 추적 또는 랜딩페이지 문제를 점검하세요.`,
      keyFindings: [{
        finding: 'CPA 급등',
        impact: 'NEGATIVE',
        metric: 'CPA',
        change: Math.round(changes.cpa),
      }],
      recommendations: [
        '전환 추적 픽셀 정상 작동 확인',
        '랜딩페이지 로딩 속도 점검',
        '캠페인 예산 일시 감액 검토',
      ],
    });
  }

  if (changes.ctr < -25) {
    insights.push({
      type: 'ANOMALY',
      severity: 'WARNING',
      title: 'CTR 급락 감지',
      summary: `CTR이 전일 대비 ${Math.abs(changes.ctr).toFixed(1)}% 하락했습니다. 소재 피로도 또는 타겟팅 문제를 점검하세요.`,
      keyFindings: [{
        finding: 'CTR 급락',
        impact: 'NEGATIVE',
        metric: 'CTR',
        change: Math.round(changes.ctr),
      }],
      recommendations: [
        '소재 피로도 점검',
        '새로운 크리에이티브 테스트',
        '타겟 오디언스 재검토',
      ],
    });
  }

  if (changes.roas < -20) {
    insights.push({
      type: 'ANOMALY',
      severity: 'CRITICAL',
      title: 'ROAS 급락 감지 - 즉시 확인 필요',
      summary: `ROAS가 전일 대비 ${Math.abs(changes.roas).toFixed(1)}% 하락했습니다. 캠페인 효율성 점검이 필요합니다.`,
      keyFindings: [{
        finding: 'ROAS 급락',
        impact: 'NEGATIVE',
        metric: 'ROAS',
        change: Math.round(changes.roas),
      }],
      recommendations: [
        '저성과 캠페인 일시 중지 검토',
        '입찰 전략 재검토',
        '타겟팅 세분화',
      ],
    });
  }

  // 3. Trend 인사이트 (긍정적 추세)
  if (changes.roas > 15 && changes.conversions > 10) {
    insights.push({
      type: 'TREND',
      severity: 'INFO',
      title: '긍정적 성과 추세 감지',
      summary: `ROAS와 전환수가 동시에 상승하는 긍정적 추세입니다. 현재 전략을 유지하고 확장을 검토하세요.`,
      keyFindings: [
        {
          finding: 'ROAS 상승',
          impact: 'POSITIVE',
          metric: 'ROAS',
          change: Math.round(changes.roas),
        },
        {
          finding: '전환수 증가',
          impact: 'POSITIVE',
          metric: 'Conversions',
          change: Math.round(changes.conversions),
        },
      ],
      recommendations: [
        '고성과 캠페인 예산 증액',
        '성공 요인 분석 및 다른 캠페인 적용',
      ],
    });
  }

  return insights;
}

/**
 * 규칙 기반 전략 생성
 */
export function generateFallbackStrategies(
  currentMetrics: MetricData,
  previousMetrics: MetricData
): FallbackStrategy[] {
  const strategies: FallbackStrategy[] = [];

  const changes = {
    roas: calculateChange(currentMetrics.roas, previousMetrics.roas),
    cpa: calculateChange(currentMetrics.cpa, previousMetrics.cpa),
    ctr: calculateChange(currentMetrics.ctr, previousMetrics.ctr),
  };

  // ROAS가 높으면 예산 증액 전략
  if (currentMetrics.roas > 2.5 || changes.roas > 10) {
    strategies.push({
      type: 'BUDGET',
      priority: changes.roas > 20 ? 'HIGH' : 'MEDIUM',
      title: '고성과 캠페인 예산 증액 권장',
      description: `현재 ROAS ${currentMetrics.roas.toFixed(2)}x로 효율적입니다. 예산 증액으로 더 많은 전환을 확보할 수 있습니다.`,
      expectedImpact: {
        metric: 'Conversions',
        changePercent: 15,
      },
    });
  }

  // CPA가 높아지면 타겟팅 전략
  if (changes.cpa > 20) {
    strategies.push({
      type: 'TARGETING',
      priority: changes.cpa > 30 ? 'HIGH' : 'MEDIUM',
      title: '타겟팅 재검토 필요',
      description: `CPA가 상승 추세입니다. 타겟 오디언스 세분화 또는 제외 타겟 설정을 검토하세요.`,
      expectedImpact: {
        metric: 'CPA',
        changePercent: -15,
      },
    });
  }

  // CTR이 낮아지면 소재 전략
  if (changes.ctr < -15 || currentMetrics.ctr < 1) {
    strategies.push({
      type: 'CREATIVE',
      priority: changes.ctr < -25 ? 'HIGH' : 'MEDIUM',
      title: '소재 교체 권장',
      description: `CTR이 하락하고 있습니다. 새로운 크리에이티브로 교체하여 사용자 관심을 회복하세요.`,
      expectedImpact: {
        metric: 'CTR',
        changePercent: 20,
      },
    });
  }

  // 기본 전략 (데이터가 적을 때)
  if (strategies.length === 0) {
    strategies.push({
      type: 'CAMPAIGN',
      priority: 'LOW',
      title: '캠페인 모니터링 유지',
      description: `현재 성과가 안정적입니다. 정기적인 모니터링을 계속하면서 기회를 탐색하세요.`,
      expectedImpact: {
        metric: 'ROAS',
        changePercent: 5,
      },
    });
  }

  return strategies;
}

/**
 * OpenAI API 사용 가능 여부 확인
 */
export function isOpenAIAvailable(): boolean {
  return !!process.env.OPENAI_API_KEY;
}
