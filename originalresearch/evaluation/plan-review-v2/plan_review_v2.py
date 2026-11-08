"""Jev stress-test of the rebuilt Cauldron plan (v2: own app, design taste core).

Same harness rules as v1 (cauldron-pivot-research/plan-review/plan_review.py): append-only ledger,
refuses to rerun, stops on first error, no retries, spend capped in code. Jev supplies judgments;
decisions (yes / no / review) are made here. v1 evidence excerpts are reused unchanged.
"""
import hashlib, json, re, sys, urllib.request
from pathlib import Path

ROOT = Path(__file__).parent
sys.path.insert(0, '/Users/habibi/hermes/cauldron-pivot-research/plan-review')
import plan_review as v1  # noqa: E402  (evidence, helpers)

MODEL = v1.MODEL
RATE, CAP, RESERVE = v1.RATE, 0.50, v1.RESERVE
noul, decide, screen = v1.noul, v1.decide, v1.screen

# ---------------------------------------------------------------- brief (Billy's note + his decisions)
BRIEF = {
 'original_brief': (
  "Billy's note: 'potentially repivoting cauldron as an actually useful tool that builds astro sites with design taste, "
  "with an agent plugging in (forgoing the current way of it working which is now outdated given advancements in ai models) "
  "and weighing up the option of keeping BYOK if someone wants to work exclusively in the tool. Think how Hyperframes works "
  "now with ability for ai and agent tools to plug in.' It lists builder references (Zeku, Sveltia, Stacki 'could reverse "
  "engineer the good bits', Stageshow, Sitereal, Pages CMS 'good for cms / blog', Meno, Prosefly, Ycode, Splitleaf) and "
  "'sexy sections and components and design files that could become part of a built library or links' (Gradient Deck, "
  "mkdir.directory, Unsection, ThreeUI, Superdesign, React Bits, Subframe Motion, Prompt Motion, Design Bites, Lander blocks "
  "'fantastic resource', OriginKit), plus Templens for page-speed ideas, Design With Intent for anti-patterns and "
  "Lexington Themes as a theme factory."),
 'product': 'Cauldron: a free, open-source Electron desktop app for designing and building real Astro websites that look genuinely good. Its purpose is a library of reusable sections, components and design files, built from Billy\'s design references, that people drop into their own site to build it.',
 'user': 'Billy, a creative director who is not a developer, and people like him. They value speed, accessibility and design taste.',
 'locked_decisions': [
  'Cauldron is its own application, written from scratch in the empty repository cre8tivoz/cauldron. It is not a fork of Stacki or any other product.',
  'Researched products and their code are studied as reference only; no code from them is copied into Cauldron. This includes Billy\'s earlier app Cauldron OS, whose taste layer is rewritten fresh.',
  'MIT licence. Electron, with React and TypeScript for the interface.',
  'Version one has three core pillars: visual editing, the agent, and built-in design taste. Taste is not deferred to a later release.',
  'Visual editing and the agent have equal prominence and work on the same site and the same selection.',
  'Real Astro files are the source of truth. The old Cauldron OS prototype-and-handoff workflow is retired.',
  'The agent uses tools the user already has; Claude Code is the first agent wired end to end. No Cauldron model API key is needed. Bring-your-own-key is parked until after the first Mac release.',
  'Shared actions run inside the app in version one; outside agents can edit a site only while Cauldron is open.',
  'Library components are copied into the site as its own editable files, and converted to plain Astro, keeping React only where a component genuinely needs interaction.',
  'Design directions use the latest Open Design systems, not the out-of-date copy in Cauldron OS.',
  'When a site\'s chosen design direction clashes with a taste rule, the direction wins, but Cauldron explains why it may not be the best approach, with evidence and a recommendation.',
  'Workspace: agent column on the left, live preview centre, visual controls right; desktop window sizes only, smallest 1280 x 800; follows the Mac light/dark setting. Camillo leads the app\'s look and curates the library; Billy approves.',
  'Version one includes content editing, publishing through the user\'s own Git repository, and a Before/After compare for agent runs.',
  'Version one ships only if Cauldron wins a blind comparison judged by Billy.',
  'Mac downloads are unsigned at first. Windows and Linux are parked until after the first Mac release.',
 ],
 'stage': 'Planning only. Nothing is built yet.',
}

# ---------------------------------------------------------------- evidence: v1 excerpts plus new ones
EV = dict(v1.EV)
EV.update({
 'cauldron_os_taste': 'Cauldron OS README (Billy\'s MIT app, cre8tivoz/cauldron-os, v0.50). "Taste guardrails that avoid generic AI UI sludge: default Inter/Roboto, pure black, nested cards, and tired blue gradients." Master Brain layer: "Impeccable Taste | Adds design anti-patterns and premium UI mandates"; "Design Reference Selector | Pulls brand DNA from local Open Design DESIGN.md systems and Refero style references"; "URL Research Sweep | Scrapes the dedicated reference URL ... for CSS variables, fonts, colours, and layout patterns". "A local quality pass scores accessibility, hierarchy, spacing, contrast, and semantic HTML before you critique it. Give natural-language feedback (\'make the header bolder\', \'tighter spacing\') and Cauldron regenerates the prototype in-place." Its outputs were HTML + AlpineJS prototypes and scaffolds, not edits to an existing Astro site.',
 'open_design': 'Open Design repository nexu-io/open-design, latest commit 87a4f91 (6 Nov 2026), cloned into references/open-design: 152 design-system folders each with a DESIGN.md. Cauldron OS imported 150 in June 2026; compared with that copy, 4 systems are new and 9 have changed. LICENSE is the Apache License 2.0: "each Contributor hereby grants to You a perpetual, worldwide, non-exclusive, no-charge, royalty-free, irrevocable copyright license to reproduce, prepare Derivative Works of, publicly display, publicly perform, sublicense, and distribute the Work and such Derivative Works" and "(a) You must give any other recipients of the Work or Derivative Works a copy of this License; and (b) You must cause any modified files to carry prominent notices stating that You changed the files".',
 'reactbits_licence': 'React Bits LICENSE.md: "MIT + Commons Clause License Condition v1.0" ... "You may use this Software, including for any commercial purpose, so long as you do not sell, sublicense, or redistribute the components themselves-whether alone, in a bundle, or as a ported version."',
 'library_licences': 'Licence status of the library sources in the research catalogue: ThreeUI community source: MIT LICENSE (Copyright 2026 Meng To); premium catalogue not included. Design Bites: MIT. OriginKit agent plugin: MIT; its hosted catalogue and assets have separate rights. Superdesign skill: MIT, separate from the mixed-licence Superdesign app. Gradient Deck: design gallery, no blanket asset reuse permission. mkdir.directory and Unsection: galleries, links and extracts retained only. Lander blocks: Figma blocks gallery; individual design and asset terms need checking. Subframe Motion and Prompt Motion: no reusable source repository verified. Lexington Themes: paid themes; no paid material downloaded.',
 'claude_code': 'Claude Code 2.1.318 installed on Billy\'s Mac. Its --help lists "-p/--print" for non-interactive use, "--output-format=stream-json" for streamed output, "-c, --continue" and "--resume <session-id>" to continue conversations, "--mcp-config" to load MCP servers, and "--allowedTools / --disallowedTools". Not yet exercised from Cauldron.',
 'test_sites': 'Billy\'s Astro sites on disk: website-designs/WDLsite (Astro ^7.3.5, 11 pages, 3 components, git, last edited Oct 2026, no content collections) and website-designs/rudeboycoffee (Astro ^6.4.0, 6 pages, 1 content collection, Tailwind, git). Stacki was only tested on a disposable Astro 7.3.8 practice site.',
})

# ---------------------------------------------------------------- part 1: claims
CLAIMS = [c for c in v1.CLAIMS if c[0] in (
  'c_css_root_cause', 'c_source_same_gap', 'c_page_versioned', 'c_preview_frames', 'c_sitereal_merge',
  'c_sitereal_policy_differs', 'c_sitereal_agent_undo', 'c_sitereal_no_reuse', 'c_zeku_choice',
  'x_stacki_css_safe', 'x_sitereal_lossless', 'x_preview_cause')] + [
 ('c_cos_taste', 'Cauldron OS added design anti-patterns and premium UI rules to generation and let the user pick a design reference first.', ['cauldron_os_taste'], 'true'),
 ('c_cos_critique', 'Cauldron OS scored accessibility, hierarchy, spacing and contrast, and applied plain-language critique.', ['cauldron_os_taste'], 'true'),
 ('c_od_reuse', 'The Open Design systems may be included in an MIT-licensed app if the Apache licence and change notices are kept.', ['open_design'], 'true'),
 ('c_od_newer', 'The Open Design systems have changed since the copy imported into Cauldron OS.', ['open_design'], 'true'),
 ('c_rb_no_bundle', 'React Bits components may not be redistributed as part of a bundled component library.', ['reactbits_licence'], 'true'),
 ('c_claude_headless', 'The installed Claude Code offers non-interactive runs, streamed output, conversation resume and MCP configuration.', ['claude_code'], 'true'),
 # negative controls
 ('x_rb_free', 'React Bits components can be freely bundled and redistributed in another component library.', ['reactbits_licence'], 'false'),
 ('x_od_mit', 'The Open Design systems are MIT-licensed.', ['open_design'], 'false'),
 ('x_gd_reuse', 'Gradient Deck grants permission to reuse its designs as library content.', ['library_licences'], 'false'),
 ('x_cos_astro', 'Cauldron OS edited existing Astro sites in place.', ['cauldron_os_taste'], 'false'),
 ('x_claude_tested', 'Claude Code has already been tested working inside Cauldron.', ['claude_code'], 'false'),
]

# ---------------------------------------------------------------- part 2: plan elements and alternatives
PLAN = {
 'p_repo': ('Set up the empty cre8tivoz/cauldron repository from scratch: MIT licence, README, a bare Electron app with React and TypeScript that opens a window, and automatic checks on every change.', []),
 'p_reference_rule': ('Keep all research outside the Cauldron repository. Use it to understand how things work and what broke, then write Cauldron\'s own code without copying from studied products.', ['sitereal_licence', 'stacki_licence']),
 'p_test_sites': ('Test Cauldron from its first working build against copies of real sites (WDLsite first, then rudeboycoffee, which has a content collection), never the originals.', ['test_sites', 'stacki_runtime_worked']),
 'p_open_preview': ('Open a folder, confirm it is an Astro site, and start its live preview automatically; if dependencies are missing, say so and ask rather than installing silently.', ['stacki_runtime_worked']),
 'p_select_edit': ('Select an element by clicking it in the preview, then edit its text, settings and styles; changes land in the real Astro files and appear in the preview.', ['stacki_runtime_worked', 'stacki_page_code']),
 'p_versioned_saves': ('Every page, style and source save, and every Undo and Redo, carries the version of the file it started from; if the file changed since, merge or ask, never overwrite. Test: style change, unrelated outside edit to the same file, Undo; the outside edit must survive.', ['stacki_css_defect', 'stacki_style_code', 'stacki_page_code']),
 'p_outside_edits': ('When a file changes on disk, merge automatically only when changes do not overlap; otherwise keep both and ask the user to choose. One written rule for every save path, with tests.', ['sitereal_merge_code', 'sitereal_merge_policy', 'zeku_conflict_code']),
 'p_preserve_shape': ('Leave anything Cauldron does not understand in a file exactly as written, tested on the real test sites rather than assumed.', ['stacki_runtime_worked', 'test_sites']),
 'p_recovery': ('Save unsaved edits to a recovery area outside the site every few seconds and offer them back after a crash.', ['zeku_other_code']),
 'p_new_page': ('A newly created page shows in the preview without a manual reload, verified with a test.', ['stacki_preview_defect']),
 'p_preview_isolation': ('Give the website preview only a minimal reporting channel, so a site or a script an agent adds to it can never reach editing powers.', ['stacki_preview_frames']),
 'p_shared_actions': ('One set of actions inside the app (read selection, read page outline with version, edit element, edit CSS rule, create page) used by the visual controls, the agent panel and outside agents; every change states its base version and stale changes are refused with a clear message.', ['stacki_page_code', 'sitereal_mcp_code']),
 'p_agent_runs': ('Group each agent job into a run with a plain summary of changed pages and files, undoable in one step unless later work changed the same parts; a Before/After toggle in the preview highlights what the run changed.', ['sitereal_agent_runs']),
 'p_workspace': ('Workspace with the agent column on the left, live preview centre and visual controls right, with resizable, collapsible panels at desktop window sizes down to 1280 x 800, following the Mac light/dark setting; Camillo designs the look from the Mobbin research and Billy approves.', ['stacki_layout']),
 'p_agent_panel': ('Agent panel that runs Claude Code with the selected element as context, keeps the conversation going and shows running, finished and failed; one agent end to end before adding more; it may not change files until versioned saves and shared actions exist.', ['claude_code', 'hyperframes']),
 'p_external_access': ('Offer the same actions to outside agents through a local MCP connection on this computer only, with a per-site access code, while Cauldron is open; each tool is tested before support is claimed.', ['sitereal_mcp_code', 'claude_code']),
 'p_content_forms': ('Content editing through forms built from the site\'s Astro content definitions, warning when they are out of date, with plain-text editing as a fallback.', ['zeku_other_code']),
 'p_taste_rules': ('Always-on taste rules carried by every agent job: avoid the generic AI look (default fonts, pure black, cards inside cards, tired blue gradients) and insist on spacing, type, states and small interactions. If a site\'s direction clashes with a rule, the direction wins but Cauldron explains why it may not be best, with evidence and a recommendation. Rewritten fresh, informed by Cauldron OS.', ['cauldron_os_taste']),
 'p_direction': ('A design direction for every site, chosen from the latest Open Design systems (Apache notice kept), a Refero search, or fonts, colours and layout pulled from a reference URL; saved inside the site as design tokens plus a design document the agent reads on every job; visual controls offer those tokens first.', ['open_design', 'cauldron_os_taste']),
 'p_library': ('The component library at the heart of Cauldron: reusable sections, components and design files from Billy\'s design references, dropped into a site with previews and add or replace. Components are copied into the site as its own files, converted to plain Astro with React only where interaction needs it, shaped by the site\'s direction, and included as code only where the licence allows. Launch with a starter set across the main section types, picked by Camillo and approved by Billy.', ['library_licences', 'reactbits_licence']),
 'p_quality': ('Build the actual site and measure layout overflow at phone/tablet/desktop sizes, keyboard use, automated accessibility, broken links and speed; then check type scale, spacing rhythm, contrast and hierarchy against the site\'s direction; plain-language critique goes to the agent to apply; measured results stay separate from opinion.', ['cauldron_os_taste', 'stacki_runtime_worked']),
 'p_blind_test': ('Proof for version one: two contrasting real briefs, each built once by Claude Code alone and once by Claude Code inside Cauldron; Billy judges blind; Cauldron\'s versions must win and pass the measured checks, or version one does not ship.', ['claude_code']),
 'p_publish': ('Show changed pages and publish through the user\'s own Git repository; no publishing with unsaved edits, and nothing committed without the user asking.', ['zeku_other_code']),
 'p_distribution': ('An unsigned Mac download with first-launch instructions, tested on a separate Mac.', []),
 'p_parked': ('Park Windows and Linux releases and bring-your-own-key until after the first Mac release.', []),
}
ALTS = {
 'a_fork_stacki': ('Fork the MIT Stacki repository and build Cauldron on top of its code.', ['stacki_licence', 'stacki_runtime_worked']),
 'a_taste_later': ('Ship a visual editor with the agent first and add design taste and the component library in a later release.', ['cauldron_os_taste']),
 'a_copy_sitereal': ('Copy Sitereal\'s merge and agent-run code into Cauldron to save time.', ['sitereal_licence', 'sitereal_merge_code']),
 'a_bundle_reactbits': ('Bundle React Bits components into Cauldron\'s component library.', ['reactbits_licence']),
 'a_linked_package': ('Link library components from a shared Cauldron package that updates centrally, instead of copying them into the site.', []),
 'a_keep_react': ('Keep every library component in React, its original framework.', ['library_licences']),
 'a_old_designs': ('Use the 150 design systems already copied into Cauldron OS in June instead of sourcing the latest.', ['open_design']),
 'a_agent_first': ('Let the agent panel change files before versioned saves and shared actions exist.', ['stacki_css_defect', 'stacki_style_code']),
 'a_engine': ('Run shared actions in a separate background engine per site so outside agents can work while Cauldron is closed.', ['sitereal_mcp_code']),
 'a_all_agents': ('Support all eight agent tools listed by HyperFrames at first release.', ['hyperframes']),
}
EXPECT_FIT = {k: 'yes' for k in PLAN} | {
 'a_fork_stacki': 'no', 'a_taste_later': 'no', 'a_copy_sitereal': 'no', 'a_bundle_reactbits': 'no',
 'a_linked_package': 'no', 'a_keep_react': 'no', 'a_old_designs': 'no', 'a_agent_first': 'no',
 'a_engine': 'no', 'a_all_agents': None}
ELEM_QS = dict(v1.ELEM_QS)
ELEM_QS['fits_brief'] = noul('Does `proposal` advance the product described in `brief` while staying within every item in `brief.locked_decisions`?',
                             'It moves towards the described app and conflicts with none of the locked decisions.',
                             'It works against the described app, or it contradicts any locked decision.')

# ---------------------------------------------------------------- part 3: order
ORDER = [
 ('p_versioned_saves', 'p_agent_panel', 'true'),
 ('p_shared_actions', 'p_agent_panel', 'true'),
 ('p_shared_actions', 'p_external_access', 'true'),
 ('p_shared_actions', 'p_agent_runs', 'true'),
 ('p_preview_isolation', 'p_agent_panel', 'true'),
 ('p_taste_rules', 'p_agent_panel', 'true'),
 ('p_direction', 'p_library', 'true'),
 ('p_library', 'p_blind_test', 'true'),
 ('p_quality', 'p_blind_test', 'true'),
 ('p_repo', 'p_open_preview', 'true'),
 # controls: no real dependency
 ('p_distribution', 'p_versioned_saves', 'false'),
 ('p_publish', 'p_taste_rules', 'false'),
 ('p_parked', 'p_agent_panel', 'false'),
]
ORDER_Q = v1.ORDER_Q

# ---------------------------------------------------------------- part 4: coverage
REQS = [
 ('r_taste_core', 'built-in design taste as a core part of version one', 'true'),
 ('r_library', 'a library of reusable sections and components, built from Billy\'s design references, that people drop into their site', 'true'),
 ('r_latest_designs', 'design directions from the latest, not out-of-date, design systems', 'true'),
 ('r_proof', 'a test proving the design taste actually improves results', 'true'),
 ('r_equal', 'visual editing and agent interaction with equal prominence on the same selection', 'true'),
 ('r_agent_plugin', 'agent tools the user already has plugging into the app, without a Cauldron API key', 'true'),
 ('r_external', 'operation by outside agents', 'true'),
 ('r_real_astro', 'editing real Astro files as the source of truth', 'true'),
 ('r_no_loss', 'protection against losing the user\'s or an agent\'s edits', 'true'),
 ('r_content', 'editing site content such as blog posts', 'true'),
 ('r_publish', 'publishing the site', 'true'),
 ('r_quality', 'measured accessibility and speed checks on the built site', 'true'),
 ('r_good_looking', 'a good-looking, visually polished app interface of its own', 'true'),
 ('r_mac', 'a Mac download without an Apple Developer account', 'true'),
 ('r_foss', 'remaining free and open source, with licence-safe reuse', 'true'),
 # negative controls
 ('x_cloud', 'a hosted cloud service with user accounts and paid subscriptions', 'false'),
 ('x_mobile', 'a native phone app for editing sites', 'false'),
 ('x_windows', 'tested Windows and Linux releases in version one', 'false'),
]
REQ_Q = v1.REQ_Q

# ---------------------------------------------------------------- build and run
def jobs():
    out = []
    for cid, claim, keys, _ in CLAIMS:
        out.append({'id': cid, 'part': 'claims', 'payload': {'model': MODEL,
            'state': {'claim': claim, 'evidence': {k: EV[k] for k in keys}}, 'questions': v1.CLAIM_QS}})
    for pid, (text, keys) in {**PLAN, **ALTS}.items():
        out.append({'id': pid, 'part': 'elements', 'payload': {'model': MODEL,
            'state': {'brief': BRIEF, 'proposal': text, 'evidence': {k: EV[k] for k in keys}}, 'questions': ELEM_QS}})
    plan_state = {k: v[0] for k, v in PLAN.items()}
    out.append({'id': 'order', 'part': 'order', 'payload': {'model': MODEL,
        'state': {'brief': BRIEF, 'plan': plan_state},
        'questions': {f'{a}__{b}': ORDER_Q(a, b) for a, b, _ in ORDER}}})
    out.append({'id': 'coverage', 'part': 'coverage', 'payload': {'model': MODEL,
        'state': {'brief': BRIEF, 'plan': plan_state}, 'questions': {rid: REQ_Q(t) for rid, t, _ in REQS}}})
    return out

def main(dry=False):
    ledger = ROOT / 'ledger.jsonl'
    assert not ledger.exists(), 'results already exist; refusing to rerun'
    js = jobs()
    assert len(js) * RESERVE <= CAP, 'reserve exceeds cap'
    for j in js:
        screen(json.dumps(j['payload']))
        for q in j['payload']['questions'].values():
            assert q['type'] == 'noul'
    (ROOT / 'inputs.json').write_text(json.dumps(js, indent=1))
    print('jobs', len(js), 'questions', sum(len(j['payload']['questions']) for j in js))
    if dry:
        return
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
    main(dry='--dry' in sys.argv)
