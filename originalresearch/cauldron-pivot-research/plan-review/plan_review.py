"""Jev stress-test of the combined Cauldron Astro plan after the REA work.

Bounded run: append-only ledger, refuses to rerun, stops on first error, no retries,
spend capped in code. Jev supplies judgments; decisions (yes / no / review) are made here.
"""
import hashlib, json, re, urllib.request
from pathlib import Path

ROOT = Path(__file__).parent
MODEL = 'jev-1.14.0'
RATE = 0.042          # USD per million input tokens (docs.typesafe.ai/models, checked 6 Nov 2026)
CAP = 0.50            # USD hard cap for this run
RESERVE = 0.005       # USD reserved per request before sending
YES, NO = 0.7, 0.3
CA = Path('/Users/habibi/hermes/apps-codebases/cauldron-astro')

# ---------------------------------------------------------------- brief
BRIEF = {
    'product': 'Cauldron Astro: a free, fully open-source desktop application for designing and building real Astro websites.',
    'user': 'Billy, a creative director who is not a developer. He builds his websites in Astro and values speed, accessibility and good design taste. The app must be functionally useful, usable, responsive at every window size and good-looking.',
    'interaction': 'Visual editing and agent interaction have equal prominence and work on the same Astro project and the same current selection. The app has an integrated agent that uses the agent tools and model access the user already has (for example Claude Code, Codex or Hermes), and it can also be operated by those external agents. A Cauldron model API key is not required. Optional bring-your-own-key is undecided.',
    'locked_decisions': [
        'Electron is the application framework for the first version.',
        'Visual editing and agent interaction have equal prominence.',
        'Cauldron stays fully free and open source.',
        'Real Astro project files are the source of truth.',
        'The old Cauldron prototype-and-handoff workflow is obsolete and is not preserved.',
        'Mac downloads are initially unsigned, with documented first-launch approval, because there is no Apple Developer account.',
    ],
    'stage': 'Planning only. Nothing is being built yet; the plan will be walked through step by step with Billy first.',
}

# ---------------------------------------------------------------- evidence (exact excerpts, with provenance)
EV = {
 'stacki_licence': 'Stacki repository flowtricks/stacki at commit 363b044 (version 1.0.12) has an MIT LICENSE file: "Permission is hereby granted, free of charge, to any person obtaining a copy of this software ... to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies".',
 'stacki_runtime_worked': 'Hands-on test of Stacki 1.0.12 against a real Astro 7.3.8 project: opened and previewed the project; editing a component heading changed src/pages/index.astro and the live preview, and Undo restored both; an external change to the page appeared in editor and preview and survived a later visual edit and its undo; changing a style value changed src/styles/global.css and the preview, and undo restored the exact bytes when nothing else had changed; New page created src/pages/contact.astro; the site built with npm run build; windows of 1440x900, 1100x800 and 1024x640 kept their controls with no horizontal overflow. Integrated agent operation, release packaging and large projects were not tested.',
 'stacki_css_defect': 'Reproduced in the running Stacki app: (1) visually changed .hero max-width from 780px to 720px; (2) externally changed the unrelated footer padding from 40px to 56px in the same stylesheet; (3) waited until the preview showed 56px; (4) pressed Undo. Stacki restored the hero width to 780px and reset the footer padding to 40px, removing the external change. The UI still reported all changes saved.',
 'stacki_preview_defect': 'In the running Stacki app, New page wrote contact.astro and opened /contact, but the embedded preview stayed on a 404 page. A later request to /contact returned HTTP 200 while the embedded view still showed 404. Clicking Reload preview then showed the page. The cause was not traced.',
 'stacki_layout': 'At a 1024px window width, Stacki fixed navigation and inspector panels leave only 398px for the preview. There is no spare permanent column for an equally prominent agent conversation.',
 'stacki_style_code': "Stacki 1.0.12 compiled code. styleSourceHandlers.js:67-71: ipcMain.handle('style:writeFile', async (_event, { filePath, css }) => { const abs = assertInProject(filePath); writeProjectText(abs, css); return { ok: true }; }). ipcPayloads.js:419 accepts only filePath and css. documentWrites.js:42-45: function writeProjectText(file, text, expectedSource) { ... const report = expectedSource === undefined ? host.documents.writeCurrent(file, text) : host.documents.writeText(file, text, digestOf(expectedSource)); ... }. documentActors.js:163-175: writeCurrent re-reads the current file on disk and treats it as the base for the submitted text. The general source save src:writeText (ipcPayloads.js:415, styleSourceHandlers.js:115-118) also carries only the new text.",
 'stacki_page_code': "Stacki 1.0.12 compiled code. pageHandlers.js:69-75: page:read returns the parsed page plus snapshot.checksum. pageHandlers.js:87-94: ipcMain.handle('page:edit', async (_event, { pagePath, authoredChecksum, edit }) => { ... const report = documents.submitEdit(pagePath, { authoredChecksum, gone }, (base) => buildEdit(edit, base)); if (report.tag !== 'applied') return { ok: false, error: pageEditError(pagePath, report) }; ... }). The reply includes the new checksum and the inverse operations used by Undo.",
 'stacki_preview_frames': "Stacki 1.0.12 main.js:280-288: webPreferences: { preload: RUNTIME_PATHS.preload, contextIsolation: true, nodeIntegration: false, // Run the preload in preview iframes too, so they can report their page height ... nodeIntegrationInSubFrames: true }. The preload guards for preview frames were not verified.",
 'stacki_release': 'The official Stacki download (GitHub release v0.0.23, April 2026) package.json: "name": "stacki", "version": "0.0.23", "license": "UNLICENSED", "private": true. Its main process and renderer contain zero occurrences of "astro"; it saves .html entry files. index.js:4248-4252: function writeProjectFile(filePath, content) { ... fs.writeFileSync(filePath, content, "utf-8"); ... } with no version check. No packaged release exists of the Astro editor (1.0.12).',
 'sitereal_licence': 'Sitereal software licence (Aufwind Rosebrock & Runnebaum GbR, updated 12 October 2026): "sitereal is paid software ... and it is not open source." Under "What you may not do": "modify, adapt or create derivative works of it, or incorporate parts of it into another product; decompile, disassemble or otherwise reverse-engineer it, except to the extent that mandatory law expressly permits". "The application, its source code ... are and remain our property". The licence states it comes into force when you install or use the application.',
 'sitereal_merge_code': "Sitereal 1.0.2 shipped engine.mjs. HELD_DIR = '.sitereal/held'; BASE_DIR = '.sitereal/base'. write(full, content) (38598-38637): reads the file on disk, compares its hash with the recorded hash of what Sitereal last wrote; if the disk changed outside Sitereal it calls merge(); merge (38568-38596) reads the stored base, runs mergeText(base, ours, theirs), checks the merged .astro or .json still parses, writes the result and stores a new base; if a recorded file was deleted outside it is held in .sitereal/held instead of being recreated. Paths that link outside the project are refused.",
 'sitereal_merge_policy': "Sitereal 1.0.2 engine.mjs merge3 (35522-35532): when both sides changed the same lines differently and no resolver is given, it keeps the 'theirs' side and counts a conflict. Generated writes call mergeText(base, canvasOutput, disk), so the disk side wins overlapping changes. The direct file save (49353-49355) calls mergeText(base, disk, submitted), so the submitted side wins; that caller does not inspect the conflict count.",
 'sitereal_agent_runs': "Sitereal 1.0.2 engine.mjs agentWrite/closeRun (49682-49719): when an agent session writes, a run is opened with a snapshot of the project; after 15 seconds of quiet the run is closed, the changed pages and settings are listed, and an 'agent-run' event with a label is sent to the UI. applyRun (49721-49751): for undo or redo it compares the current state of each changed part with the expected state; if later work changed it, it returns the conflicting parts instead of applying, unless force is set.",
 'sitereal_mcp_code': "Sitereal 1.0.2 mcp.mjs (41459-41467): reads a page, then posts the updated page to /api/page with the revision from that read, then reads it back. Tools include a page outline (one line per node) and targeted node and CSS-rule edits. engine.mjs (57478-57487): list saves with a stale base return HTTP 409 'changed after this was read - nothing was saved'. The engine listens on 127.0.0.1 and checks host, origin and a session token on each request.",
 'zeku_terms': 'Zeku terms (David V. Kimball, updated 28 September 2026): "Zeku is licensed, not sold." A paid licence lets you use Zeku under the terms. No source licence is granted. The terms do not mention reverse engineering. Zeku is a Tauri (Rust) application.',
 'zeku_conflict_code': "Zeku 0.1.31 recovered frontend: when files change on disk, function C6 rereads each open tab; if the tab has no unsaved edits the editor is replaced with the disk text; if it has unsaved edits that differ, a conflict {path, mine, theirs} is recorded. The dialog reads: 'Changed in two places. Another program changed this entry while you had unsaved edits. Nothing has been written yet. Keeping your version saves it over the file; using the version on disk replaces what is in the editor.' Buttons: 'Use the version on disk', 'Keep my version'.",
 'zeku_other_code': "Zeku 0.1.31 recovered frontend: a 10-second interval saves unsaved active content through a recovery call (timestamp, original path, text, reason) outside the content file; recovery is discarded when disk already matches. The app reads Astro schemas with read_astro_schemas and tracks schemasSynced/schemasStale, offering to update field types when stale. Before pull or publish it saves and blocks if tabs remain unsaved. Preview start polls every 600 ms and distinguishes starting, ready, stopped and failed. Native Rust write and Git code was not decompiled.",
 'hyperframes': 'The installed HyperFrames desktop app declares integrations for Claude Code, Codex, Antigravity, OpenCode, Hermes, Copilot, Grok and OpenClaw, with per-agent event and session handling, selected-element context, and running/failed/finished status. Only the declarations were inspected; integrations were not exercised. Reuse rights for its code are unverified.',
}

# ---------------------------------------------------------------- part 1: claims
CLAIMS = [
 ('c_stacki_mit', 'Stacki 1.0.12 source code may be copied and modified in a free open-source project.', ['stacki_licence'], 'true'),
 ('c_css_root_cause', 'Stacki stylesheet saves do not send the version of the file the edit was based on, so a stale stylesheet can replace newer changes on disk.', ['stacki_style_code', 'stacki_css_defect'], 'true'),
 ('c_source_same_gap', 'Stacki general source-file saves have the same missing-version gap as stylesheet saves.', ['stacki_style_code'], 'true'),
 ('c_page_versioned', 'Stacki page edits are checked against the version they were based on before being written.', ['stacki_page_code'], 'true'),
 ('c_release_unusable', 'The official Stacki download is not a suitable source of reusable code for Cauldron.', ['stacki_release'], 'true'),
 ('c_preview_frames', 'In Stacki, the preload script runs inside the preview frames that show the user\'s website.', ['stacki_preview_frames'], 'true'),
 ('c_sitereal_merge', 'Sitereal keeps a stored base copy of files it writes and merges outside edits against it.', ['sitereal_merge_code'], 'true'),
 ('c_sitereal_policy_differs', 'Sitereal resolves overlapping conflicts differently depending on which save path is used.', ['sitereal_merge_policy'], 'true'),
 ('c_sitereal_agent_undo', 'Sitereal groups agent changes into runs and refuses to undo a run when later work changed the same parts, unless forced.', ['sitereal_agent_runs'], 'true'),
 ('c_sitereal_no_reuse', 'Sitereal code may not be incorporated into Cauldron.', ['sitereal_licence'], 'true'),
 ('c_zeku_choice', 'Zeku asks the user to choose between their version and the disk version when a file with unsaved edits changes on disk.', ['zeku_conflict_code'], 'true'),
 # negative controls: plausible but not supported by the supplied evidence
 ('x_stacki_css_safe', 'Stacki stylesheet undo safely preserves unrelated external edits.', ['stacki_css_defect', 'stacki_style_code'], 'false'),
 ('x_sitereal_lossless', 'Sitereal never loses work when two changes conflict.', ['sitereal_merge_policy'], 'false'),
 ('x_preview_cause', 'The Stacki new-page 404 is caused by Astro registering new routes late.', ['stacki_preview_defect'], 'false'),
 ('x_zeku_atomic', 'Zeku writes files atomically and is protected against write races.', ['zeku_other_code'], 'false'),
 ('x_release_mit', 'The official Stacki 0.0.23 download is MIT-licensed open source.', ['stacki_release'], 'false'),
]

def noul(text, yes, no):
    return {'type': 'noul', 'instructions': text, 'criteria': {'true': yes, 'false': no}}

CLAIM_QS = {
 'supported': noul('Does `evidence` directly support `claim` as written?',
                   'The supplied excerpts state or directly show what the claim says.',
                   'The excerpts do not show it, show the opposite, or the claim adds a cause or guarantee the excerpts do not state.'),
 'goes_beyond': noul('Does `claim` assert more than `evidence` shows?',
                     'The claim adds a guarantee, cause, scope or generalisation that the excerpts do not establish.',
                     'Everything in the claim is stated or shown in the excerpts.'),
}

# ---------------------------------------------------------------- part 2: plan elements and alternatives
PLAN = {
 'p_fork_stacki': ('Start Cauldron Astro as a fork of the MIT Stacki repository at commit 363b044, keeping its licence and attribution. Keep its Astro project opening, live preview, source-aware page editing, selection, style controls and undo machinery.', ['stacki_licence', 'stacki_runtime_worked', 'stacki_release']),
 'p_safe_saves': ('Before any agent work, make stylesheet and general source saves carry the version they were based on, through forward saves and Undo/Redo. Refuse or merge when the disk no longer matches. Add a regression test: visual CSS edit, then an unrelated outside CSS edit, then Undo; the outside edit must survive.', ['stacki_css_defect', 'stacki_style_code']),
 'p_preview_refresh': ('Fix the new-page preview so a created page shows without a manual reload, after tracing the actual cause with a test.', ['stacki_preview_defect']),
 'p_preview_isolation': ('Audit and restrict what the preview frames can access, so a user\'s website or third-party scripts in it cannot use the editor\'s internal bridge. Give preview frames only a minimal height-reporting channel.', ['stacki_preview_frames']),
 'p_shared_actions': ('Create one set of project actions (read the selection, read a page outline with its version, targeted element edits, CSS rule edits, create page) used by the visual controls, the integrated agent and external agents alike. Every write states the version it was based on; stale writes return a clear conflict instead of saving.', ['stacki_page_code', 'sitereal_mcp_code']),
 'p_agent_runs': ('Group each agent\'s changes into a run with a plain summary of which pages and files changed. Allow undoing a whole run; refuse when later work changed the same parts, and show what conflicts.', ['sitereal_agent_runs']),
 'p_agent_panel': ('Add an agent conversation panel with equal prominence to the visual editor, using resizable and collapsible panels so both fit at small window sizes. It runs the agent tool the user already has with the current selection as context, keeps the session going between messages, and shows running, failed and finished states. Make one agent work end to end before adding others.', ['stacki_layout', 'hyperframes']),
 'p_external_access': ('Expose the same project actions to external agents through a local MCP server bound to 127.0.0.1 with a per-project session token, plus small install guides per agent tool.', ['sitereal_mcp_code', 'hyperframes']),
 'p_outside_edits': ('When a file changes on disk: merge automatically only when the changes do not overlap; otherwise keep both versions and ask the user to choose, never silently discarding either. Use one written conflict policy for every save path, with tests.', ['sitereal_merge_code', 'sitereal_merge_policy', 'zeku_conflict_code']),
 'p_recovery': ('Save unsaved edits to a recovery area outside the project every few seconds, offer them back after a crash, and clear them only after a verified save.', ['zeku_other_code']),
 'p_content_forms': ('Edit content collections through forms built from the project\'s Astro schemas, showing when the schema information is out of date, with raw editing as a fallback.', ['zeku_other_code']),
 'p_design_package': ('Provide a structured design-direction package: chosen references, typography, colour and spacing tokens, curated licence-compatible sections, and good and bad examples with reasons. Both the visual editor and the agent use it.', []),
 'p_output_checks': ('Build the real Astro site and run measured checks: responsive overflow, keyboard navigation, automated accessibility, broken links and performance under stated conditions. Keep advisory visual critique separate from measured results.', ['stacki_runtime_worked']),
 'p_git_publish': ('Show changed files and publish through the user\'s own Git remote. Block pull or publish while files have unsaved edits. Never commit or push without the user asking.', ['zeku_other_code']),
 'p_distribution': ('Ship an unsigned Mac download with first-launch instructions, and test it on a separate Mac. The Astro editor has never been packaged, so packaging is a task in its own right.', ['stacki_release']),
 'p_clean_room': ('Treat Sitereal and Zeku as idea references only. Write Cauldron\'s own behaviour specifications in plain words; do not use their extracted code or code excerpts while implementing, and keep their extracted files out of the Cauldron repository.', ['sitereal_licence', 'zeku_terms']),
 'p_byok_later': ('Decide on optional bring-your-own-key only after the integrated and external agent paths work, based on actual need.', []),
}
ALTS = {
 'a_from_scratch': ('Build a new Electron Astro editor from scratch instead of starting from Stacki.', ['stacki_licence', 'stacki_runtime_worked']),
 'a_agent_first': ('Build the integrated agent panel first and fix the stylesheet and source save problems afterwards.', ['stacki_css_defect', 'stacki_style_code']),
 'a_engine_rewrite': ('Before other work, restructure Stacki into a separate per-project background engine process serving both the window and external agents.', ['sitereal_mcp_code', 'stacki_runtime_worked']),
 'a_copy_sitereal': ('Copy Sitereal\'s merge and agent-run code into Cauldron to save time.', ['sitereal_licence', 'sitereal_merge_code']),
 'a_release_base': ('Base Cauldron on the official Stacki 0.0.23 download.', ['stacki_release']),
 'a_tauri': ('Switch to Tauri, as Zeku uses, for a smaller app.', ['zeku_terms']),
 'a_direct_files': ('Let agents rewrite whole files directly and have the editor reload, without shared versioned actions.', ['stacki_css_defect', 'stacki_page_code']),
 'a_all_agents': ('Support all eight agent tools listed by HyperFrames at first release.', ['hyperframes']),
}
EXPECT_FIT = {k: 'yes' for k in PLAN} | {'a_from_scratch': None, 'a_agent_first': 'no', 'a_engine_rewrite': None,
              'a_copy_sitereal': 'no', 'a_release_base': 'no', 'a_tauri': 'no', 'a_direct_files': 'no', 'a_all_agents': None}

ELEM_QS = {
 'fits_brief': noul('Does `proposal` advance the product described in `brief` while staying within `brief.locked_decisions`?',
                    'It moves towards the described app and conflicts with none of the locked decisions.',
                    'It works against the described app, or it contradicts a locked decision.'),
 'evidenced_gap': noul('Does `proposal` address a problem or need shown in `evidence` or stated in `brief`?',
                       'A specific defect, missing capability or stated requirement is addressed.',
                       'No problem or need in the supplied material is addressed by it.'),
 'restricted_reuse': noul('Does `proposal` depend on copying code from a source that `evidence` says may not be reused or incorporated?',
                          'It requires copying code or files whose licence or terms in the evidence do not allow reuse.',
                          'It reuses only permitted code, or it reuses no outside code.'),
 'assumes_unproven': noul('Does `proposal` treat something untested as already working?',
                          'It relies on a capability the evidence shows was untested or broken as if it already works.',
                          'It plans the needed work or test instead of assuming the result.'),
 'testable': noul('Can the outcome of `proposal` be checked on a real Astro project or a real app build?',
                  'There is a concrete action or observable result that can be exercised.',
                  'It only states intentions, positioning or taste without a checkable result.'),
}

# ---------------------------------------------------------------- part 3: order
ORDER = [  # (earlier, later, expected 'true' if later must wait for earlier)
 ('p_safe_saves', 'p_agent_panel', 'true'),
 ('p_safe_saves', 'p_external_access', 'true'),
 ('p_shared_actions', 'p_agent_panel', 'true'),
 ('p_shared_actions', 'p_external_access', 'true'),
 ('p_shared_actions', 'p_agent_runs', 'true'),
 ('p_preview_isolation', 'p_agent_panel', 'true'),
 ('p_fork_stacki', 'p_safe_saves', 'true'),
 ('p_design_package', 'p_safe_saves', 'false'),
 ('p_distribution', 'p_safe_saves', 'false'),
 ('p_byok_later', 'p_agent_panel', 'false'),
]
ORDER_Q = lambda a, b: noul(f'Must the work in `plan.{a}` be finished before the work in `plan.{b}` can be built and used safely?',
                            f'`plan.{b}` would be unsafe, broken or have to be redone if built before `plan.{a}` is finished.',
                            f'`plan.{b}` can be built and used safely without `plan.{a}` being finished first.')

# ---------------------------------------------------------------- part 4: coverage
REQS = [
 ('r_equal', 'visual editing and agent interaction with equal prominence on the same selection', 'true'),
 ('r_integrated', 'an integrated agent that uses the agent tools the user already has', 'true'),
 ('r_external', 'operation by external agents such as Claude Code, Codex or Hermes', 'true'),
 ('r_nokey', 'no requirement for a Cauldron model API key', 'true'),
 ('r_real_astro', 'editing real Astro project files as the source of truth', 'true'),
 ('r_no_loss', 'protection against losing the user\'s or an agent\'s edits', 'true'),
 ('r_responsive_app', 'an app layout that works at every window size', 'true'),
 ('r_taste', 'help with good design taste', 'true'),
 ('r_quality', 'measured accessibility and speed checks on the built site', 'true'),
 ('r_content', 'editing site content such as blog posts', 'true'),
 ('r_publish', 'publishing the site', 'true'),
 ('r_mac', 'downloadable on a Mac without an Apple Developer account', 'true'),
 ('r_foss', 'remaining free and open source, including licence-safe reuse', 'true'),
 ('r_good_looking', 'a good-looking, visually polished app interface of its own', None),
 ('r_windows', 'tested Windows and Linux releases', None),
 # negative controls
 ('x_cloud', 'a hosted cloud service with user accounts and paid subscriptions', 'false'),
 ('x_mobile', 'a native phone app for editing sites', 'false'),
]
REQ_Q = lambda text: noul(f'Does `plan` include work that delivers {text}?',
                          'At least one plan item clearly delivers this.',
                          'No plan item delivers this; it is missing or only implied.')

# ---------------------------------------------------------------- build jobs
def jobs():
    out = []
    for cid, claim, keys, _ in CLAIMS:
        out.append({'id': cid, 'part': 'claims', 'payload': {'model': MODEL,
            'state': {'claim': claim, 'evidence': {k: EV[k] for k in keys}}, 'questions': CLAIM_QS}})
    for pid, (text, keys) in {**PLAN, **ALTS}.items():
        out.append({'id': pid, 'part': 'elements', 'payload': {'model': MODEL,
            'state': {'brief': BRIEF, 'proposal': text, 'evidence': {k: EV[k] for k in keys}}, 'questions': ELEM_QS}})
    plan_state = {k: v[0] for k, v in PLAN.items()}
    out.append({'id': 'order', 'part': 'order', 'payload': {'model': MODEL,
        'state': {'brief': BRIEF, 'plan': plan_state},
        'questions': {f'{a}__{b}': ORDER_Q(a, b) for a, b, _ in ORDER}}})
    out.append({'id': 'coverage', 'part': 'coverage', 'payload': {'model': MODEL,
        'state': {'plan': plan_state}, 'questions': {rid: REQ_Q(t) for rid, t, _ in REQS}}})
    return out

def decide(p):
    return 'yes' if p > YES else 'no' if p < NO else 'review'

def screen(text):
    assert not re.search(r'(sk-[A-Za-z0-9]{20,}|Bearer\s+\S{20,}|ts_[A-Za-z0-9]{20,})', text), 'possible secret in payload'

def main():
    ledger = ROOT / 'ledger.jsonl'
    assert not ledger.exists(), 'results already exist; refusing to rerun'
    js = jobs()
    assert len(js) * RESERVE <= CAP, 'reserve exceeds cap'
    for j in js:
        screen(json.dumps(j['payload']))
        for q in j['payload']['questions'].values():
            assert q['type'] == 'noul'
    (ROOT / 'inputs.json').write_text(json.dumps(js, indent=1))
    env = Path('/Users/habibi/.hermes/profiles/claudia/.env').read_text()
    key = re.search(r'(?m)^(?:export\s+)?TYPESAFE_API_KEY\s*=\s*(.*?)\s*$', env).group(1).strip('"\'')
    tokens = 0
    for j in js:
        raw = json.dumps(j['payload']).encode()
        row = {'id': j['id'], 'part': j['part'], 'request_sha256': hashlib.sha256(raw).hexdigest()}
        try:
            req = urllib.request.Request('https://api.typesafe.ai/v1/systemone', data=raw, method='POST',
                headers={'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json'})
            with urllib.request.urlopen(req, timeout=90) as r:
                res = json.load(r)
            assert res['model'] == MODEL and set(res['answers']) == set(j['payload']['questions'])
            for a in res['answers'].values():
                assert a['type'] == 'noul' and 0 <= a['noul'] <= 1
            tokens += res['usage']['input_tokens']
            row['response'] = res
        except Exception as e:
            row['error'] = type(e).__name__ + ': ' + str(e)[:200]
            with ledger.open('a') as f: f.write(json.dumps(row) + '\n')
            raise SystemExit('Stopped on first error: ' + row['error'])
        with ledger.open('a') as f: f.write(json.dumps(row) + '\n')
        spent = tokens * RATE / 1e6
        assert spent + RESERVE <= CAP, 'cap reached'
        print(j['id'], {k: round(v['noul'], 3) for k, v in res['answers'].items()}, flush=True)
    summary = {'requests': len(js), 'input_tokens': tokens, 'estimated_usd': round(tokens * RATE / 1e6, 5),
               'cap_usd': CAP, 'model': MODEL}
    (ROOT / 'run-summary.json').write_text(json.dumps(summary, indent=2))
    print(summary)

if __name__ == '__main__':
    main()
