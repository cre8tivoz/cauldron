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
const { runAgent } = await import('../src/main/agent.ts');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cauldron-agent-fixtures-'));
const oldPath = process.env.PATH;
let failed = 0;
async function test(name, tool, script, verify, sessionId) {
  fs.writeFileSync(path.join(dir, tool), `#!${process.execPath}\n${script}\n`, {
    mode: 0o755,
  });
  process.env.PATH = `${dir}:${oldPath}`;
  try {
    const events = await new Promise((resolve, reject) => {
      const events = [];
      const timer = setTimeout(
        () => reject(new Error('Fixture timed out')),
        5000,
      );
      runAgent({
        tool,
        root: dir,
        prompt: 'protocol fixture',
        sessionId,
        onEvent(event) {
          events.push(event);
          if (event.type === 'done' || event.type === 'error') {
            clearTimeout(timer);
            resolve(events);
          }
        },
      });
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
} finally {
  process.env.PATH = oldPath;
  fs.rmSync(dir, { recursive: true, force: true });
}
process.exitCode = failed ? 1 : 0;
