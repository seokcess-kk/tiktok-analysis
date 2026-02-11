import { z } from 'zod';

// 소재별 인사이트 스키마
export const CreativeInsightSchema = z.object({
  type: z.enum(['PERFORMANCE', 'FATIGUE', 'OPTIMIZATION', 'COMPARISON']),
  severity: z.enum(['INFO', 'WARNING', 'CRITICAL']),
  title: z.string().max(50),
  summary: z.string().max(200),
  details: z.object({
    metrics: z.array(z.object({
      name: z.string(),
      value: z.number(),
      benchmark: z.number(),
      status: z.enum(['ABOVE', 'BELOW', 'AVERAGE']),
    })).optional(),
    trends: z.array(z.object({
      metric: z.string(),
      direction: z.enum(['UP', 'DOWN', 'STABLE']),
      changePercent: z.number(),
    })).optional(),
    comparison: z.object({
      accountAverage: z.number(),
      creativeValue: z.number(),
      percentile: z.number(),
    }).optional(),
  }),
  recommendations: z.array(z.string()),
});

export const CreativeInsightsResponseSchema = z.object({
  insights: z.array(CreativeInsightSchema),
});

// 소재별 전략 스키마
export const CreativeStrategySchema = z.object({
  type: z.enum(['SCALE', 'OPTIMIZE', 'REPLACE', 'TEST']),
  priority: z.enum(['HIGH', 'MEDIUM', 'LOW']),
  title: z.string().max(50),
  description: z.string().max(300),
  actionItems: z.array(z.object({
    action: z.string(),
    reason: z.string(),
    expectedImpact: z.string(),
  })),
  estimatedImpact: z.object({
    metric: z.string(),
    changePercent: z.number(),
    confidence: z.number().min(0).max(100),
  }),
});

export const CreativeStrategiesResponseSchema = z.object({
  strategies: z.array(CreativeStrategySchema),
});

// 타입 추출
export type CreativeInsight = z.infer<typeof CreativeInsightSchema>;
export type CreativeInsightsResponse = z.infer<typeof CreativeInsightsResponseSchema>;
export type CreativeStrategy = z.infer<typeof CreativeStrategySchema>;
export type CreativeStrategiesResponse = z.infer<typeof CreativeStrategiesResponseSchema>;
