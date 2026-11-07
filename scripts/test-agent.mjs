// Protocol fixtures only: these tests do not call a model or claim a real agent job.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { registerHooks } from 'node:module';
registerHooks({
  load(url, context, next) {
    return next(url, {
      ...context,
      format: url.endsWith('.ts') ? 'module-typescript' : context.format,
    });
  },
  resolve(s, c, next) {
    return next(s.startsWith('.') && !path.extname(s) ? `${s}.ts` : s, c);
  },
});
const { runAgent, writeHermesConnection, hermesPickupWaitMs } =
  await import('../src/main/agent.ts');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cauldron-agent-fixtures-'));
// Never touch the real Hermes profile from a fixture run.
process.env.CAULDRON_HERMES_ENV_FILE = path.join(dir, 'hermes-profile.env');
const oldPath = process.env.PATH;
let failed = 0;
async function test(name, tool, script, verify, sessionId, options = {}) {
  const mcp = options.mcp;
  fs.writeFileSync(path.join(dir, tool), `#!${process.execPath}\n${script}\n`, {
    mode: 0o755,
  });
  process.env.PATH = `${dir}:${oldPath}`;
  try {
    const events = await new Promise((resolve, reject) => {
      const events = [];
      const timer = setTimeout(
        () => reject(new Error('Fixture timed out')),
        options.cancelAfterMs ? 9000 : 5000,
      );
      const handle = runAgent({
        tool,
        root: dir,
        prompt: 'protocol fixture',
        sessionId,
        mcp,
        onEvent(event) {
          events.push(event);
          if (event.type === 'done' || event.type === 'error') {
            clearTimeout(timer);
            resolve(events);
          }
        },
      });
      if (options.cancelAfterMs)
        setTimeout(() => handle.cancel(), options.cancelAfterMs);
    });
    verify(events);
    console.log(`PASS ${name}`);
  } catch (error) {
    failed++;
    console.error(`FAIL ${name}: ${error.message}`);
  }
}
try {
  await test(
    '3.2 API error cannot become a successful run',
    'claude',
    `console.log(JSON.stringify({type:'result',subtype:'error_during_execution',api_error:'429 limit'}));`,
    (events) => assert.equal(events.at(-1).type, 'error'),
  );
  await test(
    '2.2 Claude edit tools report the file they wrote',
    'claude',
    `console.log(JSON.stringify({type:'assistant',message:{content:[{type:'tool_use',name:'Edit',input:{file_path:'/site/src/pages/index.astro',old_string:'a',new_string:'b'}},{type:'tool_use',name:'Bash',input:{command:'ls'}}]}})); console.log(JSON.stringify({type:'result',subtype:'success',result:'done'}));`,
    (events) => {
      const tools = events.filter((event) => event.type === 'tool');
      assert.deepEqual(tools, [
        {
          type: 'tool',
          name: 'Edit',
          paths: ['/site/src/pages/index.astro'],
        },
        { type: 'tool', name: 'Bash' },
      ]);
    },
  );
  await test(
    '3.2 nonzero process exit overrides a success event',
    'claude',
    `console.log(JSON.stringify({type:'result',subtype:'success',result:'premature'})); process.exitCode=7;`,
    (events) => assert.equal(events.at(-1).type, 'error'),
  );
  await test(
    '3.2 trailing event without newline is consumed',
    'claude',
    `process.stdout.write(JSON.stringify({type:'result',subtype:'success',result:'last chunk'}));`,
    (events) => assert.equal(events.at(-1).text, 'last chunk'),
  );
  await test(
    '3.2 Codex thread id and assistant text are retained',
    'codex',
    `console.log(JSON.stringify({type:'thread.started',thread_id:'fixture-thread'})); console.log(JSON.stringify({type:'item.completed',item:{type:'agent_message',text:'hello'}}));`,
    (events) => {
      assert.ok(
        events.some(
          (e) => e.type === 'session' && e.sessionId === 'fixture-thread',
        ),
      );
      assert.ok(events.some((e) => e.type === 'text' && e.text === 'hello'));
    },
  );
  await test(
    '3.2 Codex resume uses supported CLI arguments',
    'codex',
    `if (process.argv.includes('-C')) process.exit(2); console.log(JSON.stringify({type:'item.completed',item:{type:'agent_message',text:'resumed'}}));`,
    (events) => assert.equal(events.at(-1).type, 'done'),
    'fixture-thread',
  );
  await test(
    '3.2 Codex turn failure is not hidden by exit zero',
    'codex',
    `console.log(JSON.stringify({type:'turn.failed',error:{message:'fixture API failure'}}));`,
    (events) => assert.equal(events.at(-1).type, 'error'),
  );
  // Ticket 18: real Claude Code reports an authentication failure as
  // subtype "success" with is_error true and exit code 0. That must never be a
  // successful run.
  await test(
    '3.2 an is_error result cannot become a successful run',
    'claude',
    `console.log(JSON.stringify({type:'result',subtype:'success',is_error:true,result:'Not logged in · Please run /login',terminal_reason:'api_error'}));`,
    (events) => {
      assert.equal(events.at(-1).type, 'error');
      assert.match(events.at(-1).text, /Not logged in/);
    },
  );
  // Ticket 18: a resumed job must pass the stored session id to Claude.
  await test(
    '3.2 Claude resume passes the stored session id',
    'claude',
    `const i = process.argv.indexOf('--resume'); if (i < 0 || process.argv[i + 1] !== 'fixture-session') process.exit(3); console.log(JSON.stringify({type:'result',subtype:'success',result:'resumed'}));`,
    (events) => assert.equal(events.at(-1).type, 'done'),
    'fixture-session',
  );
  // Ticket 18: cancelling must stop the process even if it ignores SIGTERM, and
  // the job must not claim success.
  await test(
    '3.2 cancel kills a process that ignores SIGTERM and reports no success',
    'claude',
    `process.on('SIGTERM', () => {}); console.log(JSON.stringify({type:'system',subtype:'init',session_id:'fixture-cancel'})); setInterval(() => {}, 1000);`,
    (events) => {
      assert.equal(events.at(-1).type, 'error');
      assert.match(events.at(-1).text, /Cancelled/);
      assert.ok(!events.some((event) => event.type === 'done'));
    },
    undefined,
    { cancelAfterMs: 300 },
  );
  const connection = {
    mcp: {
      url: 'http://127.0.0.1:5555/mcp',
      code: 'fixture-code',
    },
  };
  const argvOf = (name) => {
    const file = path.join(dir, name);
    return fs.existsSync(file) ? fs.readFileSync(file, 'utf8').split('\n') : [];
  };
  await test(
    '3.3 Codex is given the Cauldron connection for the run',
    'codex',
    `require('node:fs').writeFileSync(${JSON.stringify(path.join(dir, 'codex-argv'))}, process.argv.slice(2).join('\\n')); console.log(JSON.stringify({type:'item.completed',item:{type:'agent_message',text:'ok'}}));`,
    () => {
      const args = argvOf('codex-argv');
      assert.ok(args.includes('-c'), args.join(' '));
      assert.ok(
        args.includes('mcp_servers.cauldron.url="http://127.0.0.1:5555/mcp"'),
        args.join(' '),
      );
      assert.ok(
        args.includes(
          'mcp_servers.cauldron.http_headers={ "x-cauldron-code" = "fixture-code" }',
        ),
        args.join(' '),
      );
      assert.ok(
        args.includes(
          'mcp_servers.cauldron.default_tools_approval_mode="approve"',
        ),
        args.join(' '),
      );
    },
    undefined,
    connection,
  );
  await test(
    '3.3 a continued Codex job is given the connection too',
    'codex',
    `require('node:fs').writeFileSync(${JSON.stringify(path.join(dir, 'codex-resume-argv'))}, process.argv.slice(2).join('\\n')); console.log(JSON.stringify({type:'item.completed',item:{type:'agent_message',text:'ok'}}));`,
    () => {
      const args = argvOf('codex-resume-argv');
      assert.deepEqual(args.slice(0, 4), [
        'exec',
        'resume',
        'fixture-thread',
        'protocol fixture',
      ]);
      assert.ok(
        args.includes('mcp_servers.cauldron.url="http://127.0.0.1:5555/mcp"'),
        args.join(' '),
      );
    },
    'fixture-thread',
    connection,
  );
  await test(
    '3.3 Codex is given no connection when the app has none',
    'codex',
    `require('node:fs').writeFileSync(${JSON.stringify(path.join(dir, 'codex-bare-argv'))}, process.argv.slice(2).join('\\n')); console.log(JSON.stringify({type:'item.completed',item:{type:'agent_message',text:'ok'}}));`,
    () => {
      const args = argvOf('codex-bare-argv');
      assert.ok(!args.includes('-c'), args.join(' '));
      assert.ok(
        !args.some((arg) => arg.includes('mcp_servers')),
        args.join(' '),
      );
    },
  );
  await test(
    '3.3 Codex MCP tool calls are reported as progress',
    'codex',
    `console.log(JSON.stringify({type:'item.completed',item:{type:'mcp_tool_call',server:'cauldron',tool:'list_pages',status:'completed'}})); console.log(JSON.stringify({type:'item.completed',item:{type:'agent_message',text:'done'}}));`,
    (events) =>
      assert.ok(
        events.some(
          (event) =>
            event.type === 'tool' && event.name === 'cauldron.list_pages',
        ),
        JSON.stringify(events),
      ),
  );
  await test(
    '3.3 a Codex notice is shown without failing the run',
    'codex',
    `console.log(JSON.stringify({type:'item.completed',item:{type:'error',message:'Skill descriptions were shortened.'}})); console.log(JSON.stringify({type:'item.completed',item:{type:'agent_message',text:'done'}}));`,
    (events) => {
      assert.equal(events.at(-1).type, 'done');
      assert.ok(
        events.some(
          (event) =>
            event.type === 'status' &&
            event.text.includes('Skill descriptions were shortened.'),
        ),
        JSON.stringify(events),
      );
    },
  );
  await test(
    '3.3 a failed Codex turn is still an error',
    'codex',
    `console.log(JSON.stringify({type:'turn.failed',error:{message:'stream disconnected'}}));`,
    (events) => {
      assert.equal(events.at(-1).type, 'error');
      assert.match(events.at(-1).text, /stream disconnected/);
    },
  );
  // Ticket 20: Hermes gets the Cauldron profile, its connection and the same
  // streamed event shape. The record is what the fixture was actually handed.
  const record = path.join(dir, 'hermes-call.json');
  const hermesFixture = `
    const fs = require('node:fs');
    fs.writeFileSync(${JSON.stringify(record)}, JSON.stringify({
      argv: process.argv.slice(2),
      url: process.env.CAULDRON_MCP_URL ?? null,
      code: process.env.CAULDRON_MCP_CODE ?? null,
    }));
    console.log(JSON.stringify({type:'text',text:'fixture reply'}));
    console.log(JSON.stringify({type:'result',session_id:'fixture-hermes-session',exit_code:0,text:'fixture reply'}));
  `;
  const readRecord = () => JSON.parse(fs.readFileSync(record, 'utf8'));
  await test(
    '3.2 Hermes runs the cauldron profile with the site connection',
    'hermes',
    hermesFixture,
    (events) => {
      const call = readRecord();
      assert.equal(call.argv[0], '-p');
      assert.equal(call.argv[1], 'cauldron');
      assert.deepEqual(call.argv.slice(2, 8), [
        'chat',
        '-q',
        'protocol fixture',
        '--format',
        'stream-json',
        '-Q',
      ]);
      assert.equal(call.url, 'http://127.0.0.1:9/mcp');
      assert.equal(call.code, 'fixture-code');
      assert.equal(events.at(-1).type, 'done');
      assert.equal(events.at(-1).text, 'fixture reply');
    },
    undefined,
    { mcp: { url: 'http://127.0.0.1:9/mcp', code: 'fixture-code' } },
  );
  await test(
    '3.2 Hermes continues the conversation with --resume',
    'hermes',
    hermesFixture,
    (events) => {
      const argv = readRecord().argv;
      assert.equal(
        argv[argv.indexOf('--resume') + 1],
        'fixture-hermes-session',
      );
      assert.ok(
        events.some(
          (event) =>
            event.type === 'session' &&
            event.sessionId === 'fixture-hermes-session',
        ),
      );
    },
    'fixture-hermes-session',
    { mcp: { url: 'http://127.0.0.1:9/mcp', code: 'fixture-code' } },
  );
  await test(
    '3.2 a failing Hermes run is reported as an error',
    'hermes',
    `console.error('fixture: model unavailable'); process.exitCode = 3;`,
    (events) => {
      assert.equal(events.at(-1).type, 'error');
      assert.match(events.at(-1).text, /code 3/);
    },
    undefined,
    { mcp: { url: 'http://127.0.0.1:9/mcp', code: 'fixture-code' } },
  );
  // Ticket 20: Hermes reads the connection only from its profile's .env.
  try {
    const envFile = process.env.CAULDRON_HERMES_ENV_FILE;
    assert.match(
      fs.readFileSync(envFile, 'utf8'),
      /^CAULDRON_MCP_URL=http:\/\/127\.0\.0\.1:9\/mcp$/m,
      'a Hermes job wrote its connection into the profile file',
    );
    fs.writeFileSync(
      envFile,
      'OTHER_KEY=keep-me\nCAULDRON_MCP_URL=old\n# a comment\nCAULDRON_MCP_CODE=old\n',
    );
    writeHermesConnection('http://127.0.0.1:1234/mcp', 'new-code');
    writeHermesConnection('http://127.0.0.1:5678/mcp', 'newer-code');
    const text = fs.readFileSync(envFile, 'utf8');
    assert.ok(text.includes('OTHER_KEY=keep-me\n# a comment\n'), text);
    assert.equal(text.match(/^CAULDRON_MCP_URL=/gm).length, 1, text);
    assert.equal(text.match(/^CAULDRON_MCP_CODE=/gm).length, 1, text);
    assert.ok(text.includes('CAULDRON_MCP_URL=http://127.0.0.1:5678/mcp'));
    assert.ok(text.includes('CAULDRON_MCP_CODE=newer-code'));
    assert.equal(fs.statSync(envFile).mode & 0o777, 0o600);
    assert.equal(
      writeHermesConnection('http://127.0.0.1:5678/mcp', 'newer-code'),
      false,
      'the same connection is not rewritten',
    );
    assert.ok(hermesPickupWaitMs() > 0, 'a fresh change makes Hermes wait');
    assert.equal(hermesPickupWaitMs(Date.now() + 120_000), 0);
    const missing = path.join(dir, 'no-such-profile', '.env');
    process.env.CAULDRON_HERMES_ENV_FILE = missing;
    assert.equal(writeHermesConnection('http://x/mcp', 'c'), false);
    assert.ok(!fs.existsSync(path.dirname(missing)), 'no profile is created');
    process.env.CAULDRON_HERMES_ENV_FILE = envFile;
    console.log(
      'PASS 3.2 Hermes gets the connection in its profile file, other settings kept',
    );
  } catch (error) {
    failed += 1;
    console.log(
      `FAIL 3.2 Hermes gets the connection in its profile file, other settings kept: ${error.message}`,
    );
  }
} finally {
  process.env.PATH = oldPath;
  fs.rmSync(dir, { recursive: true, force: true });
}
process.exitCode = failed ? 1 : 0;
