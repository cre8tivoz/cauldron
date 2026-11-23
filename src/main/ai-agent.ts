import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import {
  generateText,
  jsonSchema,
  stepCountIs,
  streamText,
  tool,
  type LanguageModel,
  type ModelMessage,
  type ToolSet,
} from 'ai';
import type { AgentEvent, AgentHandle } from './agent';
import type { AiProvider, AiSettings } from './ai-keys';

/**
 * The built-in chat on the person's own AI key (WDL-243). Runs in the main
 * process, so the key never reaches the renderer, and it edits the site only
 * through the same checked actions Claude Code, Codex and Hermes get over
 * Cauldron's connection. Every change is therefore part of a run, and undoable.
 *
 * Provider wiring and failure classification follow Starquix (MIT,
 * app/src/ai/AIService.ts `createModelInstance`, app/src/ai/failure.ts):
 * Anthropic natively, OpenAI natively, OpenRouter and Ollama through their
 * OpenAI-compatible chat endpoints.
 */

export const PROVIDER_BASE_URLS: Record<
  Exclude<AiProvider, 'anthropic' | 'openai'>,
  string
> = {
  openrouter: 'https://openrouter.ai/api/v1',
  ollama: 'http://localhost:11434/v1',
};

export type ModelOptions = {
  /** Injected in tests; production uses the platform fetch. */
  fetch?: typeof globalThis.fetch;
  /** Packaged-app acceptance only: point every provider at a local stand-in. */
  baseURL?: string;
};

export function createModel(
  settings: AiSettings,
  key: string | null,
  options: ModelOptions = {},
): LanguageModel {
  const { fetch } = options;
  switch (settings.provider) {
    case 'anthropic':
      return createAnthropic({
        apiKey: key ?? '',
        fetch,
        ...(options.baseURL ? { baseURL: options.baseURL } : {}),
      })(settings.model);
    case 'openai':
      return createOpenAI({
        apiKey: key ?? '',
        fetch,
        ...(options.baseURL ? { baseURL: options.baseURL } : {}),
      })(settings.model);
    case 'openrouter':
      return createOpenAI({
        apiKey: key ?? '',
        baseURL: options.baseURL ?? PROVIDER_BASE_URLS.openrouter,
        // OpenRouter asks apps to identify themselves; no personal data.
        headers: {
          'HTTP-Referer': 'https://github.com/cre8tivoz/cauldron',
          'X-Title': 'Cauldron',
        },
        fetch,
      }).chat(settings.model);
    case 'ollama':
      return createOpenAI({
        apiKey: 'ollama',
        baseURL: options.baseURL ?? PROVIDER_BASE_URLS.ollama,
        fetch,
      }).chat(settings.model);
  }
}

export type AiFailure =
  | 'authorization'
  | 'credits'
  | 'rate-limit'
  | 'connection'
  | 'model'
  | 'unknown';

/** Only structured provider evidence is classified; exception text is never shown. */
export function classifyAiFailure(error: unknown): AiFailure {
  const seen = new Set<object>();
  const pending: unknown[] = [error];
  while (pending.length) {
    const value = pending.pop();
    if (!value || typeof value !== 'object' || seen.has(value)) continue;
    seen.add(value);
    const e = value as {
      statusCode?: unknown;
      status?: unknown;
      cause?: unknown;
      lastError?: unknown;
      errors?: unknown;
      code?: unknown;
    };
    const status = typeof e.statusCode === 'number' ? e.statusCode : e.status;
    if (status === 401 || status === 403) return 'authorization';
    if (status === 402) return 'credits';
    if (status === 429) return 'rate-limit';
    if (status === 404) return 'model';
    if (
      typeof status === 'number' &&
      (status === 0 || (status >= 500 && status <= 599))
    )
      return 'connection';
    if (
      e.code === 'ECONNREFUSED' ||
      e.code === 'ECONNRESET' ||
      e.code === 'ENOTFOUND' ||
      e.code === 'ETIMEDOUT'
    )
      return 'connection';
    pending.push(e.cause, e.lastError);
    if (Array.isArray(e.errors)) pending.push(...e.errors);
  }
  return 'unknown';
}

export function aiFailureCopy(failure: AiFailure, provider: string): string {
  switch (failure) {
    case 'authorization':
      return `${provider} did not accept the key. Check it in the agent settings, or paste a new one.`;
    case 'credits':
      return `${provider} needs more credit on your account for this request.`;
    case 'rate-limit':
      return `${provider}'s request limit was reached. Wait a minute, or choose another model.`;
    case 'model':
      return `${provider} does not recognise that model id. Check the spelling in the agent settings.`;
    case 'connection':
      return `Cauldron could not reach ${provider}. Check your connection${provider.startsWith('Ollama') ? ' and that Ollama is running' : ''}.`;
    default:
      return 'The AI request could not finish. Anything it already changed is in this run, and can be undone.';
  }
}

export type ToolDefinition = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
};

export type ToolResult = { ok: boolean; text: string };

export const KEY_AGENT_MAX_STEPS = 24;

/** Turns kept per site: enough for follow-ups, bounded for cost. */
export const KEY_HISTORY_LIMIT = 40;

/**
 * Keep the last `limit` messages, starting at a person's message so a tool
 * result is never sent without the tool call that asked for it.
 */
export function trimHistory(
  messages: ModelMessage[],
  limit = KEY_HISTORY_LIMIT,
): ModelMessage[] {
  const kept = messages.slice(-limit);
  const start = kept.findIndex((message) => message.role === 'user');
  return start < 0 ? [] : kept.slice(start);
}

export function runKeyAgent(options: {
  model: LanguageModel;
  providerLabel: string;
  prompt: string;
  tools: ToolDefinition[];
  call: (name: string, args: Record<string, unknown>) => Promise<ToolResult>;
  onEvent: (event: AgentEvent) => void;
  maxSteps?: number;
  /** Earlier turns with this site, so follow-ups make sense (like --resume). */
  history?: ModelMessage[];
  /** Called once a turn completes, with the conversation to keep. */
  onComplete?: (messages: ModelMessage[]) => void;
}): AgentHandle {
  const controller = new AbortController();
  let settled = false;
  const finish = (event: AgentEvent) => {
    if (settled) return;
    settled = true;
    options.onEvent(event);
  };

  const tools: ToolSet = {};
  for (const definition of options.tools) {
    tools[definition.name] = tool({
      description: definition.description,
      inputSchema: jsonSchema(definition.inputSchema as never),
      execute: async (input: unknown) => {
        const result = await options.call(
          definition.name,
          (input ?? {}) as Record<string, unknown>,
        );
        return result.text;
      },
    });
  }

  const userTurn: ModelMessage = { role: 'user', content: options.prompt };

  void (async () => {
    let reply = '';
    try {
      const result = streamText({
        model: options.model,
        messages: [...(options.history ?? []), userTurn],
        tools,
        stopWhen: stepCountIs(options.maxSteps ?? KEY_AGENT_MAX_STEPS),
        abortSignal: controller.signal,
        maxRetries: 1,
      });
      for await (const part of result.fullStream) {
        if (settled) return;
        switch (part.type) {
          case 'text-delta':
            reply += part.text;
            options.onEvent({ type: 'text', text: part.text, delta: true });
            break;
          case 'tool-call': {
            const input = (part.input ?? {}) as { file?: unknown };
            options.onEvent({
              type: 'tool',
              name: part.toolName,
              ...(typeof input.file === 'string'
                ? { paths: [input.file] }
                : {}),
            });
            break;
          }
          case 'error':
            throw part.error;
          case 'abort':
            finish({ type: 'error', text: 'Cancelled.' });
            return;
        }
      }
      const response = await result.response;
      options.onComplete?.(
        trimHistory([
          ...(options.history ?? []),
          userTurn,
          ...response.messages,
        ]),
      );
      finish({ type: 'done', text: reply });
    } catch (error) {
      if (controller.signal.aborted) {
        finish({ type: 'error', text: 'Cancelled.' });
        return;
      }
      const failure = classifyAiFailure(error);
      // Status only: provider errors can echo request headers.
      console.error(`Key agent failed: ${failure}`);
      finish({
        type: 'error',
        text: aiFailureCopy(failure, options.providerLabel),
      });
    }
  })();

  return { cancel: () => controller.abort() };
}

/** One tiny request that proves the key, the model id and the route all work. */
export async function testModel(
  model: LanguageModel,
  providerLabel: string,
): Promise<{ ok: true } | { ok: false; failure: AiFailure; problem: string }> {
  try {
    await generateText({
      model,
      prompt: 'Reply with the single word: ready',
      maxOutputTokens: 16,
      maxRetries: 0,
      abortSignal: AbortSignal.timeout(30_000),
    });
    return { ok: true };
  } catch (error) {
    const failure = classifyAiFailure(error);
    return {
      ok: false,
      failure,
      problem: aiFailureCopy(failure, providerLabel),
    };
  }
}
