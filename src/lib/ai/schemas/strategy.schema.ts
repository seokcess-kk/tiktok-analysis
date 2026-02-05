import { z } from 'zod';

export const ActionItemSchema = z.object({
  action: z.string(),
  target: z.string(),
  targetId: z.string(),
  currentValue: z.string().optional(),
  suggestedValue: z.string(),
  reason: z.string(),
});

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

export type Strategy = z.infer<typeof StrategySchema>;
export type ActionItem = z.infer<typeof ActionItemSchema>;
export type ExpectedImpact = z.infer<typeof ExpectedImpactSchema>;
