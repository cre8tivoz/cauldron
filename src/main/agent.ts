import { spawn, type ChildProcess } from 'node:child_process';
import type { DesignDirection } from './directions';
import { tasteRulesText } from './tastes';

export type AgentTool = 'claude' | 'codex' | 'hermes';

export type AgentEvent =
  | { type: 'session'; sessionId: string }
  | { type: 'text'; text: string; delta?: boolean }
  | { type: 'tool'; name: string; paths?: string[] }
  | { type: 'status'; text: string }
  | { type: 'done'; text: string }
  | { type: 'error'; text: string };

export type AgentHandle = { cancel: () => void };

export type PromptContext = {
  request: string;
  siteName: string;
  direction: DesignDirection | null;
  selection: {
    file: string;
    line: number;
    column: number;
    name: string;
    text: string;
  } | null;
  catalogue: Array<{ name: string; what: string }>;
};

/**
 * The agent's instructions: what the site is, what it must look like, what it may
 * change, and what was selected. Taste rules and the direction go on every job
 * (plan 4.1 and 4.2), before the agent does anything.
 */
export function buildPrompt(context: PromptContext): string {
  const direction = context.direction;
  const directionBlock = direction
    ? `## This site's design direction: ${direction.name}

${direction.character}

Colours: ${Object.entries(direction.colours)
        .map(([name, value]) => `${name} ${value}`)
        .join(', ')}
Display font: ${direction.fonts.display.family}. Body font: ${direction.fonts.body.family}.
Type sizes (rem): ${direction.typeScale.map((size) => size / 16).join(', ')}
Spacing steps (rem): ${direction.spacing.map((step) => step / 16).join(', ')}
Radii (px): ${direction.radii.join(', ')}
Motion: ${direction.motion.quick} and ${direction.motion.settle}, ${direction.motion.easing}, nothing under prefers-reduced-motion.

The full document is in cauldron/DESIGN.md and the CSS variables are in cauldron/tokens.css.
Use var(--cauldron-c-…), var(--cauldron-size-…), var(--cauldron-space-…) and var(--cauldron-radius-…) for every colour, size,
spacing and corner. Do not hard-code any of them. Watch out for: ${direction.watch}`
    : 'No design direction has been chosen for this site yet.';

  const selectionBlock = context.selection
    ? `## What is selected right now

<${context.selection.name}> in ${context.selection.file} at line ${context.selection.line}:${context.selection.column}.
Its text reads: ${JSON.stringify(context.selection.text)}`
    : 'Nothing is selected.';

  const catalogue = context.catalogue
    .map((action) => `- ${action.name}: ${action.what}`)
    .join('\n');

  return `You are working inside a real Astro site through Cauldron, a design-aware desktop builder.
Site: ${context.siteName}. The site's own files are the truth, and the person is watching a live preview.

${directionBlock}

## Taste rules — these are not optional
${tasteRulesText()}

When the direction deliberately breaks one of these, the direction wins; say so in your reply and
explain the risk in one sentence.

## What you may use
The same actions the interface uses:
${catalogue}

Prefer editing the site's existing files with its own tokens and components over adding new
libraries. Do not install packages without saying so first.

${selectionBlock}

## The job
${context.request}

When you finish, reply with a short summary: which files you changed, and anything you deliberately
did not do.`;
}

/**
 * A tool call, with any file paths it names (Claude's Edit, Write, MultiEdit and
 * NotebookEdit tools). A run treats these as the agent's own files (plan 2.2).
 */
function toolEvent(name: string, input: unknown): AgentEvent {
  const paths: string[] = [];
  if (input && typeof input === 'object' && !Array.isArray(input)) {
    for (const key of ['file_path', 'notebook_path']) {
      const value = (input as Record<string, unknown>)[key];
      if (typeof value === 'string' && value) paths.push(value);
    }
  }
  return paths.length > 0
    ? { type: 'tool', name, paths }
    : { type: 'tool', name };
}

function normaliseClaude(line: string): AgentEvent[] {
  const events: AgentEvent[] = [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(line);
  } catch {
    return events;
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
    return events;
  const item = parsed as {
    type?: string;
    subtype?: string;
    session_id?: string;
    result?: string;
    api_error?: string;
    api_error_status?: number;
    error?: string;
    message?: {
      content?: Array<{
        type?: string;
        text?: string;
        name?: string;
        input?: unknown;
      }>;
    };
  };

  if (item.session_id)
    events.push({ type: 'session', sessionId: item.session_id });
  // Claude and Hermes both send plain text events, with slightly different shapes.
  if (
    item.type === 'text' &&
    typeof (item as { text?: string }).text === 'string'
  ) {
    events.push({
      type: 'text',
      text: (item as { text: string }).text,
      delta: true,
    });
  }
  if (
    item.type === 'tool_use' &&
    typeof (item as { name?: string }).name === 'string'
  )
    events.push(
      toolEvent(
        (item as { name: string }).name,
        (item as { input?: unknown }).input,
      ),
    );
  if (item.type === 'assistant' && item.message?.content) {
    for (const block of item.message.content) {
      if (block.type === 'text' && block.text)
        events.push({ type: 'text', text: block.text });
      if (block.type === 'tool_use' && block.name)
        events.push(toolEvent(block.name, block.input));
    }
  }
  if (item.type === 'result') {
    const asText = (item as { text?: string }).text;
    const exitCode = (item as { exit_code?: number }).exit_code;
    if (typeof exitCode === 'number' && exitCode !== 0) {
      events.push({
        type: 'error',
        text:
          asText || item.error || `The agent stopped with code ${exitCode}.`,
      });
      return events;
    }
    if (
      typeof asText === 'string' &&
      !item.api_error &&
      (!item.subtype || item.subtype === 'success')
    ) {
      events.push({ type: 'done', text: asText });
      return events;
    }
    // A finished turn that reports an API error never did the work: say so.
    if (item.api_error || (item.subtype && item.subtype !== 'success')) {
      events.push({
        type: 'error',
        text: item.result || item.api_error || 'The agent could not run.',
      });
      return events;
    }
    if (typeof item.result === 'string')
      events.push({ type: 'done', text: item.result });
  }
  return events;
}

function normaliseJsonLines(line: string): AgentEvent[] {
  const events: AgentEvent[] = [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(line);
  } catch {
    return events;
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
    return events;
  const item = parsed as Record<string, unknown> & {
    msg?: Record<string, unknown>;
    session_id?: string;
  };
  if (typeof item.session_id === 'string')
    events.push({ type: 'session', sessionId: item.session_id });

  if (item.type === 'thread.started' && typeof item.thread_id === 'string')
    events.push({ type: 'session', sessionId: item.thread_id });
  const message = (item.item ?? item.msg ?? item) as Record<string, unknown>;
  const type = String(message.type ?? item.type ?? '');
  if (type.includes('session') && typeof message.id === 'string') {
    events.push({ type: 'session', sessionId: message.id });
  }
  const text =
    (typeof message.message === 'string' && message.message) ||
    (typeof message.text === 'string' && message.text) ||
    (typeof message.content === 'string' && message.content) ||
    '';
  if (text) events.push({ type: 'text', text });
  const name = (typeof message.name === 'string' && message.name) || '';
  if (name) events.push({ type: 'tool', name });
  if (type.includes('error') || type.includes('failed'))
    events.push({
      type: 'error',
      text:
        text ||
        (item.error as { message?: string } | undefined)?.message ||
        'The agent reported an error.',
    });
  return events;
}

export function runAgent(options: {
  tool: AgentTool;
  root: string;
  prompt: string;
  sessionId?: string;
  mcp?: { url: string; code: string };
  onEvent: (event: AgentEvent) => void;
}): AgentHandle {
  const { tool, root, prompt, sessionId, onEvent } = options;

  let command: string;
  let args: string[];

  if (tool === 'claude') {
    command = 'claude';
    args = [
      '-p',
      prompt,
      '--output-format',
      'stream-json',
      '--verbose',
      '--permission-mode',
      'acceptEdits',
    ];
    if (options.mcp)
      args.push(
        '--mcp-config',
        JSON.stringify({
          mcpServers: {
            cauldron: {
              type: 'http',
              url: options.mcp.url,
              headers: { 'x-cauldron-code': options.mcp.code },
            },
          },
        }),
        '--allowedTools',
        'mcp__cauldron__*',
      );
    if (sessionId) args.push('--resume', sessionId);
  } else if (tool === 'codex') {
    command = 'codex';
    args = [
      'exec',
      prompt,
      '--json',
      '-C',
      root,
      '--skip-git-repo-check',
      '--sandbox',
      'workspace-write',
    ];
    if (sessionId)
      args = [
        'exec',
        'resume',
        sessionId,
        prompt,
        '--json',
        '--skip-git-repo-check',
      ];
  } else {
    command = 'hermes';
    args = ['chat', '-q', prompt, '--format', 'stream-json', '-Q'];
    if (sessionId) args.push('--resume', sessionId);
  }

  const child: ChildProcess = spawn(command, args, {
    cwd: root,
    env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const parse = tool === 'codex' ? normaliseJsonLines : normaliseClaude;
  let terminal: Extract<AgentEvent, { type: 'done' | 'error' }> | null = null;
  let saidSomething = '';
  let buffer = '';
  let cancelled = false;
  const consume = (line: string) => {
    if (!line.trim()) return;
    const events = parse(line);
    for (const event of events) {
      if (event.type === 'done' || event.type === 'error') {
        if (terminal?.type !== 'error') terminal = event;
      } else {
        if (event.type === 'text')
          saidSomething = event.delta ? saidSomething + event.text : event.text;
        onEvent(event);
      }
    }
  };
  child.stdout?.setEncoding('utf8');
  child.stdout?.on('data', (chunk: string) => {
    buffer += chunk;
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) consume(line);
  });
  child.stderr?.setEncoding('utf8');
  let stderr = '';
  child.stderr?.on('data', (chunk: string) => {
    stderr = (stderr + chunk).slice(-2000);
    if (chunk.trim()) onEvent({ type: 'status', text: chunk.trim() });
  });
  child.on('error', (error) => {
    terminal = {
      type: 'error',
      text: `${command} could not start: ${error.message}`,
    };
  });
  // close follows stdout/stderr draining; a result event is not proof the process exited.
  child.on('close', (code) => {
    consume(buffer);
    if (cancelled) onEvent({ type: 'error', text: 'Cancelled.' });
    else if (terminal?.type === 'error') onEvent(terminal);
    else if (code !== 0)
      onEvent({
        type: 'error',
        text: `${command} stopped with code ${code ?? 'unknown'}. ${stderr.trim()}`,
      });
    else
      onEvent(
        terminal ?? {
          type: 'done',
          text: saidSomething || `${command} finished.`,
        },
      );
  });

  return {
    cancel: () => {
      cancelled = true;
      child.kill('SIGTERM');
      setTimeout(() => {
        if (child.exitCode === null) child.kill('SIGKILL');
      }, 2000).unref();
    },
  };
}
