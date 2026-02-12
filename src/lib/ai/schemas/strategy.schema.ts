import { z } from 'zod';

// AI가 숫자 또는 문자열로 반환할 수 있으므로 모두 허용하고 문자열로 변환
const stringOrNumber = z.union([z.string(), z.number()]).transform((val) => String(val));

export const ActionItemSchema = z.object({
  action: z.string(),
  target: z.string(),
  targetId: z.string(),
  currentValue: stringOrNumber.optional(),
  suggestedValue: stringOrNumber,
  reason: z.string(),
});

// 변환 후 출력 타입 (문자열로 변환됨)
export type ActionItem = {
  action: string;
  target: string;
  targetId: string;
  currentValue?: string;
  suggestedValue: string;
  reason: string;
};

export const ExpectedImpactSchema = z.object({
  metric: z.string(),
  currentValue: z.number(),
  expectedValue: z.number(),
  changePercent: z.number(),
  confidence: z.number().min(0).max(100),
});

export const StrategySchema = z.object({
  type: z.enum(['BUDGET', 'CAMPAIGN', 'TARGETING', 'CREATIVE', 'BIDDING']),
  priority: z.enum(['HIGH', 'MEDIUM', 'LOW']),
  title: z.string().max(100),
  description: z.string().max(500),
  actionItems: z.array(ActionItemSchema),
  expectedImpact: ExpectedImpactSchema,
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']),
  estimatedEffort: z.string(),
});

export const StrategiesResponseSchema = z.object({
  strategies: z.array(StrategySchema),
});

// z.infer 대신 명시적 타입 정의 (transform 후 출력 타입)
export type ExpectedImpact = {
  metric: string;
  currentValue: number;
  expectedValue: number;
  changePercent: number;
  confidence: number;
};

export type Strategy = {
  type: 'BUDGET' | 'CAMPAIGN' | 'TARGETING' | 'CREATIVE' | 'BIDDING';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  description: string;
  actionItems: ActionItem[];
  expectedImpact: ExpectedImpact;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  estimatedEffort: string;
};
