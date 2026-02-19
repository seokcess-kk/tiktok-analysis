import OpenAI from 'openai';
import { z } from 'zod';

// Lazy-loaded OpenAI client to avoid build-time errors
let openaiInstance: OpenAI | null = null;

// Retry 설정
const MAX_RETRIES = 3;
const INITIAL_DELAY = 1000; // 1초

// 모델 타입 정의
export type AIModelType = 'gpt-4o' | 'gpt-4o-mini';
export type TaskComplexity = 'low' | 'medium' | 'high';

// 작업 복잡도별 모델 매핑
const MODEL_BY_COMPLEXITY: Record<TaskComplexity, AIModelType> = {
  low: 'gpt-4o-mini',    // 간단한 분류, 요약
  medium: 'gpt-4o-mini', // 일반 분석
  high: 'gpt-4o',        // 복잡한 전략, 예측
};

// 작업 유형별 기본 복잡도 매핑
export const TASK_COMPLEXITY: Record<string, TaskComplexity> = {
  'daily-summary': 'medium',
  'anomaly-detection': 'low',
  'trend-analysis': 'medium',
  'creative-analysis': 'medium',
  'prediction': 'high',
  'budget-strategy': 'high',
  'targeting-strategy': 'high',
  'creative-strategy': 'medium',
  'bidding-strategy': 'medium',
  'comprehensive-strategy': 'high',
};

/**
 * 복잡도에 따른 모델 선택
 */
export function selectModel(complexity?: TaskComplexity, taskType?: string): AIModelType {
  // 명시적 복잡도가 주어진 경우
  if (complexity) {
    return MODEL_BY_COMPLEXITY[complexity];
  }

  // 작업 유형으로 복잡도 추론
  if (taskType && taskType in TASK_COMPLEXITY) {
    return MODEL_BY_COMPLEXITY[TASK_COMPLEXITY[taskType]];
  }

  // 기본값: gpt-4o-mini (비용 절감)
  return 'gpt-4o-mini';
}

function getOpenAI(): OpenAI {
  if (!openaiInstance) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    openaiInstance = new OpenAI({
      apiKey,
      timeout: 30000, // 30초 timeout
      maxRetries: 0, // 직접 retry 로직 사용
    });
  }
  return openaiInstance;
}

export interface AIRequestOptions {
  model?: AIModelType;
  complexity?: TaskComplexity;
  taskType?: string;
  temperature?: number;
  maxTokens?: number;
  retries?: number;
}

/**
 * Retry 로직을 적용한 함수 래퍼
 * Rate limit(429) 또는 서버 오류(500, 503) 시 재시도
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  retries: number = MAX_RETRIES
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Rate limit 또는 일시적 오류인 경우에만 재시도
      const isRetryable =
        error instanceof OpenAI.APIError &&
        (error.status === 429 || error.status === 500 || error.status === 503);

      if (!isRetryable || attempt === retries - 1) {
        console.error(`[AI Client] Final error after ${attempt + 1} attempts:`, lastError.message);
        throw lastError;
      }

      const delay = INITIAL_DELAY * Math.pow(2, attempt);
      console.log(`[AI Client] Retry attempt ${attempt + 1}/${retries} after ${delay}ms (${lastError.message})`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

export async function generateCompletion<T>(
  systemPrompt: string,
  userPrompt: string,
  schema: z.ZodType<T>,
  options: AIRequestOptions = {}
): Promise<T> {
  const {
    model,
    complexity,
    taskType,
    temperature = 0.3,
    maxTokens = 4096,
    retries = MAX_RETRIES,
  } = options;

  // 모델 선택: 명시적 model > 복잡도 > 작업 유형 > 기본값
  const selectedModel = model || selectModel(complexity, taskType);

  const openai = getOpenAI();

  return withRetry(async () => {
    console.log(`[AI Client] Sending request to ${selectedModel}...`);

    const response = await openai.chat.completions.create({
      model: selectedModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature,
      max_tokens: maxTokens,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0].message.content;

    if (!content) {
      throw new Error('AI response is empty');
    }

    try {
      const parsed = JSON.parse(content);
      const validated = schema.parse(parsed);
      console.log('[AI Client] Response parsed and validated successfully');
      return validated;
    } catch (error) {
      // Zod 에러 객체를 안전하게 로깅
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[AI Client] Response parsing error:', errorMessage);
      console.error('[AI Client] Raw content:', content.substring(0, 500));
      throw new Error(`Failed to parse AI response: ${errorMessage}`);
    }
  }, retries);
}

export async function generateStreamingCompletion(
  systemPrompt: string,
  userPrompt: string,
  options: AIRequestOptions = {}
): Promise<AsyncIterable<string>> {
  const { model, complexity, taskType, temperature = 0.3, maxTokens = 4096 } = options;

  const selectedModel = model || selectModel(complexity, taskType);
  const openai = getOpenAI();

  const stream = await openai.chat.completions.create({
    model: selectedModel,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature,
    max_tokens: maxTokens,
    stream: true,
  });

  return {
    async *[Symbol.asyncIterator]() {
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          yield content;
        }
      }
    },
  };
}

// Export getter for external use if needed
export { getOpenAI as openai };
