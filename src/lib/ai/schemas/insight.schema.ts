import { z } from 'zod';

export const KeyFindingSchema = z.object({
  finding: z.string(),
  impact: z.enum(['POSITIVE', 'NEGATIVE', 'NEUTRAL']),
  metric: z.string(),
  change: z.number(),
  evidence: z.string().optional(),
});

export const RootCauseSchema = z.object({
  factor: z.string(),
  contribution: z.number().min(0).max(100),
  evidence: z.string(),
});

export const InsightSchema = z.object({
  type: z.enum(['DAILY_SUMMARY', 'ANOMALY', 'TREND', 'CREATIVE', 'PREDICTION']),
  severity: z.enum(['INFO', 'WARNING', 'CRITICAL']),
  title: z.string().max(100),
  summary: z.string().max(500),
  keyFindings: z.array(KeyFindingSchema).max(5),
  rootCause: z.array(RootCauseSchema).optional(),
  recommendations: z.array(z.string()).max(3),
});

export const InsightsResponseSchema = z.object({
  insights: z.array(InsightSchema),
});

export type Insight = z.infer<typeof InsightSchema>;
export type KeyFinding = z.infer<typeof KeyFindingSchema>;
export type RootCause = z.infer<typeof RootCauseSchema>;
