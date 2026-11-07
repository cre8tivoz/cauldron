#!/usr/bin/env node
/**
 * FIXTURE provider, not a model. This stands in for the `claude` CLI so the
 * app path (agent panel -> runAgent -> the site's MCP connection -> shared
 * actions -> run/undo) can be exercised without a provider account. It speaks
 * Claude Code's stream-json shape, calls Cauldron's real MCP server, and writes
 * files through its own Edit tool.
 *
 * Every check it feeds is labelled FIXTURE. It never claims to be Claude.
 *
 * Modes, chosen by a marker in the job's request:
 *   SLOW          never finishes, ignores SIGTERM (cancellation evidence)
 *   FAIL_EXIT     a partial turn, then exit code 7 (failure evidence)
 *   FAIL_ISERROR  Claude's real shape for an expired login: subtype "success",
 *                 is_error true, exit 0 (must never be reported as success)
 *   anything else a normal job: read design and selection over MCP, edit the
 *                 selected element, write one file with the Edit tool.
 */
import fs from 'node:fs';

const argv = process.argv.slice(2);
const arg = (name) => {
  const index = argv.indexOf(name);
  return index >= 0 ? argv[index + 1] : undefined;
};
const prompt = arg('-p') ?? '';
const resumeId = arg('--resume');
const sessionId = resumeId ?? `standin-${Date.now()}`;
const emit = (value) => process.stdout.write(`${JSON.stringify(value)}\n`);
const text = (body) =>
  emit({
    type: 'assistant',
    message: { content: [{ type: 'text', text: body }] },
    session_id: sessionId,
  });
const tool = (name, input) =>
  emit({
    type: 'assistant',
    message: { content: [{ type: 'tool_use', name, input }] },
    session_id: sessionId,
  });

const stateFile = process.env.CAULDRON_STANDIN_STATE;
const marker = process.env.CAULDRON_STANDIN_MARKER ?? 'Cauldron proof';
const readState = () => {
  try {
    return JSON.parse(fs.readFileSync(stateFile, 'utf8'));
  } catch {
    return {};
  }
};

emit({ type: 'system', subtype: 'init', session_id: sessionId });
emit({ type: 'status', text: 'fixture provider starting' });

if (prompt.includes('SLOW')) {
  process.on('SIGTERM', () => {});
  text('Working slowly, as asked.');
  setInterval(() => {}, 1000);
} else if (prompt.includes('FAIL_EXIT')) {
  text('Part way through.');
  process.stderr.write('fixture provider failed on purpose\n');
  process.exit(7);
} else if (prompt.includes('FAIL_ISERROR')) {
  text('Not logged in · Please run /login');
  emit({
    type: 'result',
    subtype: 'success',
    is_error: true,
    result: 'Not logged in · Please run /login',
    terminal_reason: 'api_error',
    session_id: sessionId,
  });
} else {
  const server = JSON.parse(arg('--mcp-config') ?? '{}').mcpServers?.cauldron;
  if (!server) {
    text('No Cauldron connection was given to me.');
    emit({
      type: 'result',
      subtype: 'error_during_execution',
      session_id: sessionId,
    });
    process.exit(1);
  }
  let nextId = 1;
  const call = async (method, params) => {
    const response = await fetch(server.url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...server.headers },
      body: JSON.stringify({ jsonrpc: '2.0', id: nextId++, method, params }),
    });
    return response.json();
  };
  const use = async (name, args) => {
    tool(`mcp__cauldron__${name}`, args);
    const reply = await call('tools/call', { name, arguments: args });
    const body = reply.result?.content?.[0]?.text ?? '';
    let value = null;
    try {
      value = JSON.parse(body);
    } catch {
      value = body;
    }
    if (reply.result?.isError) throw new Error(`${name} refused: ${body}`);
    return value;
  };

  try {
    await call('initialize', {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: { name: 'cauldron-fixture-provider', version: '0.0.1' },
    });
    const pages = await use('list_pages', {});
    await use('read_design', {});
    const selection = await use('read_selection', {});

    if (resumeId) {
      const remembered = readState()[resumeId];
      text(
        remembered
          ? `From earlier in this conversation: the heading text was "${remembered.marker}", set in ${remembered.file}.`
          : 'I have no memory of an earlier job.',
      );
      emit({
        type: 'result',
        subtype: 'success',
        result: remembered?.marker ?? 'no memory',
        session_id: sessionId,
      });
    } else if (!selection) {
      text('Nothing is selected, so I cannot edit the selection.');
      emit({
        type: 'result',
        subtype: 'success',
        result: `nothing selected; ${pages.pages?.length ?? 0} pages`,
        session_id: sessionId,
      });
    } else {
      text(`Editing the selected <${selection.name}> in ${selection.file}.`);
      await use('edit_element_text', {
        target: {
          file: selection.file,
          line: selection.line,
          column: selection.column,
          name: selection.name,
        },
        value: marker,
        baseHash: selection.baseHash,
      });
      const note = 'src/proof-note.txt';
      fs.writeFileSync(note, `fixture provider wrote this\n`);
      tool('Edit', {
        file_path: note,
        old_string: '',
        new_string: 'fixture provider wrote this\n',
      });
      text(`Changed ${selection.file} and wrote ${note}.`);
      const state = readState();
      state[sessionId] = { marker, file: selection.file };
      if (stateFile) fs.writeFileSync(stateFile, JSON.stringify(state));
      emit({
        type: 'result',
        subtype: 'success',
        result: `The heading now reads "${marker}".`,
        session_id: sessionId,
      });
    }
  } catch (error) {
    text(`The fixture provider could not finish: ${error.message}`);
    emit({
      type: 'result',
      subtype: 'error_during_execution',
      result: error.message,
      session_id: sessionId,
    });
    process.exit(1);
  }
}
