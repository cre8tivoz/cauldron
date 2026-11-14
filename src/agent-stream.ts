export type AgentTool = 'claude' | 'codex' | 'hermes';

export const AGENT_TOOL_LABELS: Record<AgentTool, string> = {
  claude: 'Claude Code',
  codex: 'Codex',
  hermes: 'Hermes',
};

export type AgentStreamLine = {
  kind: 'agent' | 'tool' | 'status' | 'error';
  text: string;
};

export type AgentStreamState = {
  lines: AgentStreamLine[];
  running: boolean;
  activePrompt: string | null;
  message: string | null;
};

export const INITIAL_AGENT_STREAM: AgentStreamState = {
  lines: [],
  running: false,
  activePrompt: null,
  message: null,
};

/** Resets live stream state when a new agent request starts. */
export function beginAgentStream(promptText: string): AgentStreamState {
  return {
    lines: [],
    running: true,
    activePrompt: promptText,
    message: null,
  };
}

/** Stops the running indicator and records a startup error message. */
export function failAgentStream(
  state: AgentStreamState,
  problem: string,
): AgentStreamState {
  return {
    ...state,
    running: false,
    message: problem,
  };
}

/** Applies a single incremental agent IPC event to the shared stream state. */
export function applyAgentStreamEvent(
  state: AgentStreamState,
  event: CauldronAgentEvent,
): AgentStreamState {
  if (event.type === 'session' || event.type === 'done') return state;
  if (event.type === 'error') {
    return {
      ...state,
      running: false,
      lines: [...state.lines, { kind: 'error', text: event.text }],
    };
  }
  if (event.type === 'tool') {
    return {
      ...state,
      lines: [...state.lines, { kind: 'tool', text: `Using ${event.name}` }],
    };
  }
  if (event.type === 'status') {
    return {
      ...state,
      lines: [...state.lines, { kind: 'status', text: event.text }],
    };
  }
  const last = state.lines.at(-1);
  if (event.delta && last?.kind === 'agent') {
    return {
      ...state,
      lines: [
        ...state.lines.slice(0, -1),
        { kind: 'agent', text: last.text + event.text },
      ],
    };
  }
  return {
    ...state,
    lines: [...state.lines, { kind: 'agent', text: event.text }],
  };
}

/** Marks the active stream finished and captures the completion note. */
export function finishAgentStream(
  state: AgentStreamState,
  note: string,
): AgentStreamState {
  return {
    ...state,
    running: false,
    message: note,
  };
}
