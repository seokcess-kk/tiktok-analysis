import OpenAI from 'openai';
import { z } from 'zod';

// Lazy-loaded OpenAI client to avoid build-time errors
let openaiInstance: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openaiInstance) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    openaiInstance = new OpenAI({ apiKey });
  }
  return openaiInstance;
}

export interface AIRequestOptions {
  temperature?: number;
  maxTokens?: number;
}

export async function generateCompletion<T>(
  systemPrompt: string,
  userPrompt: string,
  schema: z.ZodType<T>,
  options: AIRequestOptions = {}
): Promise<T> {
  const { temperature = 0.3, maxTokens = 4096 } = options;

  const openai = getOpenAI();

  const response = await openai.chat.completions.create({
    model: 'gpt-4o', // GPT-5.2 사용 시 모델명 변경
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
    return schema.parse(parsed);
  } catch (error) {
    console.error('AI Response parsing error:', error);
    console.error('Raw content:', content);
    throw new Error('Failed to parse AI response');
  }
}

export async function generateStreamingCompletion(
  systemPrompt: string,
  userPrompt: string,
  options: AIRequestOptions = {}
): Promise<AsyncIterable<string>> {
  const { temperature = 0.3, maxTokens = 4096 } = options;

  const openai = getOpenAI();

  const stream = await openai.chat.completions.create({
    model: 'gpt-4o',
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
