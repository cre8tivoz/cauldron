# Cauldron rescue plan — start here

**Owner:** the agent taking over from Claudia. **Requested by Billy:** 8 November 2026.
**Baseline app revision:** `e144e1f46c96b19b9dc5fbd6a037b1764de031ac`, `main`, `cre8tivoz/cauldron`.
**State:** NOT FUNCTIONALLY ACCEPTED. This document is a handoff, not a repair or release claim.

## 1. The job

Deliver a working Mac desktop application for designing and building real Astro websites. The person opens **Cauldron**, creates or opens a project, asks its built-in agent to work, sees the resulting site, and can edit, review, undo and publish it. The person must not need a separate agent UI or terminal to nurse the workflow along.

Visual editing, the built-in agent and built-in design taste are all core. Design taste is not a substitute for a working editor. The site remains ordinary, independently buildable Astro files in the person's folder. Preserve the existing implementation where sound; this is a rescue, not a rewrite or redesign.

**Completion means every section works through the delivered app.** A green suite, an implemented backend, a good-looking generated demonstration, or a `done` ticket is not that result. Start with the demonstrated failure below, then complete the section-by-section walkthrough in §5. Preserve existing safety protections while making the product usable.

## 2. One authority, with history preserved

This plan is the current rescue execution order and consolidated acceptance checklist, authorised by Billy's handoff request. It reconciles rather than silently replaces the original functional requirements. Resolve any genuinely new product choice with Billy; do not invent a deferral.

Read in this order:

1. This document, including the failure and section checklist.
2. [Original numbered specification snapshot](docs/rescue/original-plan.md), [approved taste criteria](docs/rescue/approved-taste-tests.md), and [original starter content](docs/rescue/original-starter-set.md). These are historical snapshots; the amendments below control conflicting scope/status text.
3. Relevant [ADRs](docs/adr/) and [glossary](GLOSSARY.md), then actual source and current user-path evidence.
4. [Corrected Jev audit](docs/rescue/evidence/audit-report.md), [requirement/evidence ledger](docs/rescue/evidence/requirements.json), [audit corrections](docs/rescue/evidence/correction-record.md), and [documentation inventory](docs/rescue/evidence/documentation-inventory.json). They are evidence assessments, not an automated certificate of functionality.
5. Existing [.scratch/cauldron-v1/spec.md](.scratch/cauldron-v1/spec.md) and tickets only for implementation history and focused evidence. Retrospective findings 00–10 and `docs/plan-verification.md` describe an earlier checkpoint; later tickets 11–32 contain repairs. Read both before repeating an old gap.

### Settled amendments and boundaries

- **New project, open existing, persistent project library/recents, shared dependency storage are mandatory.** Their omission from the numbered plan was an error, not permission to omit them. Ticket 32 restored them; their reliability is still subject to real use.
- **Built-in chat drives installed Claude Code, Codex and Hermes in the background.** Their internal local action connection is implementation plumbing. Reverse control from other agent applications is outside v1 despite original plan 3.3 wording. BYOK, Windows/Linux, a cloud platform and eight-agent support are also outside v1.
- **Design judgement is closed.** The original win-both blind gate was not met: PeNtA won, Moretti lost. Billy subsequently accepted the reviewed PeNtA iteration with its three corrections carried into normal guidance. Do not demand another Moretti win, blind comparison or regeneration. This was design acceptance, not whole-product acceptance.
- Original seven directions were subsequently enriched and extended to ten, including Componine, Niki Studio and Henry From Online. Preserve those changes and the approved five-piece starter library; do not replace them with generic templates or expand the catalogue to avoid fixing it.
- The app uses **Source Sans 3, Coral, system light/dark**, agent left / preview centre / inspector right; minimum desktop window **1280 × 800**. Responsive _websites_ at phone/tablet/desktop widths remain required. A phone-sized app layout is not v1.
- Research recommendations such as project-card thumbnails are not automatically new requirements. Do not let polish block the specified usable project library.
- Historical pause/limited-batch instructions remain provenance, not the current rescue order. This handoff authorises planning and transfer; the receiving agent must work under Billy's actual implementation authorisation, not assume permission to deploy, rotate credentials, rewrite history or alter unrelated projects.

## 3. What is actually known

### Confirmed current failure — first priority

Billy used the delivered app to create **tinydogs**, then asked Codex: **“Design a site for a boutique breeder called tiny dogs”**. Project location on this Mac:
`/Users/habibi/Documents/OPENAI PROJECTS/tinydogs/Tiny dogs`.

- Creation worked. Billy reported multiple failure messages, an Astro font-import error and no usable preview.
- `src/layouts/Base.astro:2–4` imports `@fontsource/playfair-display/500.css` and `@fontsource/jost/400.css`, `500.css`.
- The site's `package.json` declares only `astro: 7.4.7`; neither font package exists in its installed dependencies.
- An unchanged APFS copy at `~/.hermes/profiles/claudia/cache/scratch/tinydogs-diagnosis/site` reproduces `npm run build` exit **1**: `Rolldown failed to resolve import "@fontsource/playfair-display/500.css"`.
- Actual stored Codex run `run-1794138419087` says `status: finished`, `problems: []`, `4 files changed`. On this Mac its record is under `~/Library/Application Support/Cauldron/runs/c805630eb824/`.
- `src/main/index.ts`, baseline lines 1787–1814, `finishAgentRun`: reloads preview, collects locations, finishes the run; an agent error note marks failure, but there is no mandatory build/render-health success gate. A location-collection problem can simply discard highlights.

**Confirmed defects:** generated code references unavailable packages; completion records fail to reflect the broken site. **Not established:** every other error Billy saw, whether preview has an additional independent failure, or that the font error explains every inactive section. Discover those errors instead of stopping after removing one import. No repair was made during the audit.

### Existing work worth retaining, not blindly redoing

There are recorded packaged-app proofs for all three agent adapters, real-file editing, version-aware saves, merge/refusal, whole-run undo, Before/After, SIGKILL recovery, content saves, library insertion, taste checks and publish retry. These are not absent merely because an earlier audit said so. See later tickets 11–29.

Issue 32 records create/open/reopen, recents persistence, install cancellation/recovery, shared pnpm store/offline reuse, embedded child-view capture and one read-only Codex reply. Its 71-check run preceded final small picker/discard corrections; subsequent focused renderer regressions passed. These facts do **not** establish successful new-project generation, as tinydogs demonstrates.

The library evidence includes an unresolved intermittent Tab-reach failure (68/69 on one site); do not call it zero failures. Publishing proof used local bare remotes, not hosted authentication. Hermes proof included a fixed connection-pickup wait, not an actual readiness handshake. Native Finder/menu interactions and manual second-Mac first launch remain unverified. Older successful proofs need targeted checking where rescued paths change, not automatic invalidation by age.

Jev `jev-1.14.0` was genuinely called. The first audit misread historical gaps as current; the corrected audit reconciled later tickets. Its broad positive coverage labels must remain subordinate to Billy's actual failed workflow. Model probabilities are not app tests or a completion percentage.

## 4. Priority order for the receiving agent

Use this order. Work in bounded slices, keeping one short execution record in §8. Do not create another competing grooming document or ticket hierarchy.

### P0 — Make an ordinary generated project work, and tell the truth when it does not

**Start:** reproduce tinydogs from a disposable copy through the same packaged-app workflow, not a separately scaffolded demo. Inspect actual project files, saved run, agent events, preview errors and app messages. Preserve Billy's original and establish the exact bundle/revision being exercised.

**Repair the class of failure:**

- Trace the chosen direction's font guidance → generated import → manifest/installed packages → actual Astro rendering. Honour direction fonts without generating unresolved imports. A prompt-only request to “be careful” is not a reliable boundary.
- Handle required new dependencies using an explicit, visible, consent-respecting path and the project's package manager. Declining must remain safe and understandable. Avoid silent installs, arbitrary package-manager conversions, disabling the selected typography requirement or hard-coding a tinydogs-only exception. Choose the smallest complete implementation after tracing the existing preparation/actions paths.
- Distinguish agent process completion from successful site generation/validation. A site-changing run that breaks the build/preview must expose the actual error in both UI and persisted history; no blank `problems` success record. Preserve legitimate read-only/no-change replies and cancellation states.
- Show build/render failure where the user is working, recover controls, retain the failure until resolved, and offer the appropriate retry/recovery. A dev server listening or returning an Astro error page is not a working preview. Build checks must use the site's real package manager/build configuration; SSR/adapter projects must not be incorrectly validated as static-only.
- Identify and resolve the remaining tinydogs failure messages. Inspect bridge/IPC, runtime PATH, selected project and asynchronous state at the exact failing boundary. Do not assume they are all font errors.

**Finish P0 only when:** the ordinary create → direction → agent generation → rendered home and second page works from the packaged UI; a new missing-import failure is also visibly detected and persisted accurately, then recovery restores the preview. Verify the rendered child view itself. Keep actual source, logs and file changes; do not replace them with simulated successful outputs. A fixed disposable tinydogs site alone does not repair Cauldron.

Likely entry points (verify current definitions): `src/main/agent.ts`, `directions.ts`, `dependencies.ts`, `index.ts`, `site.ts`, `preview.ts`, `runs.ts`, `src/components/AgentPanel.tsx`, `src/App.tsx`.

### P1 — Complete the real project lifecycle and build/edit loop

Once P0 works, execute Projects, Build, agent/run review and safe saves in §5 as one ordinary session. Open an existing _unprepared_ Astro project as well as the new project; exercise install consent and cancel/retry; restart/reopen from recents. Check a path containing spaces (tinydogs does), normal GUI launch environment, missing/moved folders and project switching with unsaved edits. Verify shared storage through two projects, not a setting label.

Then make a visual text/style change, a new page, an agent edit with a follow-up, Before/After and undo, including a real outside edit. Keep content and visual unsaved state protected through tab/project changes and failure recovery. Verify all three installed-agent integrations with bounded file-changing work; reuse existing valid evidence where its path is unchanged, but do not substitute the previous read-only Codex reply for generation proof.

**Finish P1 only when:** creation is no longer the only useful action; the user can open, build, edit, resume, review, undo and reopen without terminal intervention or data loss. If a CLI is genuinely unavailable, show actionable setup information and explicitly retain that support path as blocked, not passed.

### P2 — Make every remaining product section usable, not merely present

Walk Design, Library, Content, Quality and Publish in §5. Repair faults found through those controls, including integration with the rescued agent/preview lifecycle. Do not generate more showpiece sites instead. Preserve the approved design/taste bar and link-only licence boundaries.

Investigate the library's intermittent keyboard failure once in the real component and host context; fix a reproduced defect or retain the exact unresolved limitation. Do not weaken assertions or label a forced programmatic focus as Tab reachability. Keep measured failures separate from subjective taste.

**Finish P2 only when:** each section completes its visible primary operation, produces the right actual file/state changes and returns to a working preview; wrong inputs and failures leave usable controls and an intelligible message. A section that cannot complete is an open rescue item, even if its ticket says done.

### P3 — Deliver one coherent, correctly identified build

After the functional loop and all section rows work, build one candidate. Exercise that actual bundle, with fresh app data, under ordinary GUI launch conditions. Include native Finder selection and menu/shortcut interaction, not just an injected path. Ask only for the foreground interaction Billy has not authorised the agent to perform; do not interrupt his desktop unasked.

Verify unsigned download/unzip/Open Anyway instructions on a second Mac with a human/tester. Automated CI fresh-Mac launch is already proven but does not establish that manual Gatekeeper flow. Hosted publishing/authentication needs a disposable, authorised repository; local bare-remote proof must remain labelled as such. Do not create external accounts or publish Billy's test site to satisfy this row.

Record source commit, artifact path, SHA-256, actual exercised journeys, known limitations and remaining blockers. Align README and active rescue status; retain historical evidence rather than rewriting it as current. Do not distribute an older ZIP under a newer completion claim.

**Finish P3 only when:** the delivered artifact, not just the checkout, meets the full agreed walkthrough. If a human-only check remains pending, say so and stop short of “release-ready”.

## 5. Whole-product acceptance — every section must work

Status for every row starts **TO EXERCISE ON RESCUED CANDIDATE**, not “missing implementation”. Record PASS / FAILED / BLOCKED, exact operation and evidence once done. There is no aggregate assertion count that overrides a failed row.

| Section / journey                        | What the person must actually be able to do                                                                                                                               | Observable result / failure behaviour                                                                                                                                                                      | Original scope                            |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| **Projects — new**                       | Choose name/location, create a real Astro site, consent to preparation, cancel/retry, enter the editor                                                                    | Own files appear at chosen location; correct manager/shared store; generated project renders, not just a blank scaffold; existing destination is not overwritten                                           | Restored core requirement; 1.1; ticket 32 |
| **Projects — existing/recents**          | Native Open and open-by-path; prepare an uninstalled project; restart/reopen either site; handle moved folder; remove recent                                              | Persistent library, no unnecessary reinstall, visible errors, controls recover; removing recent never deletes site; no silent manager migration                                                            | Restored core requirement; 1.1            |
| **Shared dependencies**                  | Prepare two independent projects into the shared pnpm store                                                                                                               | Actual reuse/offline evidence and correct per-project resolutions; distinguish APFS clones from byte savings; existing npm/yarn projects retain their manager, do not promise universal deduplication      | Restored core requirement                 |
| **Build/preview/navigation**             | See actual site, navigate home/new page, reload/toggle preview, return from every tool tab                                                                                | Child view renders, bounds track layout, no persistent 404 or overlay on tool panels; Astro error page is a failure; actionable recovery                                                                   | 1.1, 1.7, 3.1                             |
| **Visual editor/inspector**              | Pick element; change text, attributes/settings and style using tokens; save                                                                                               | Real corresponding Astro/CSS changes, live preview update, unknown syntax preserved; refused unsupported operation explained                                                                               | 1.2, 1.5                                  |
| **Save/history/conflicts**               | Undo/redo, outside non-overlapping edit, overlapping conflict with keep-mine/use-disk                                                                                     | Outside work survives, stale writes cannot overwrite it, one conflict rule across visual/source/content/shared actions; no lost buffers on navigation                                                      | 1.3–1.5, 2.1                              |
| **Recovery**                             | Type unsaved visual/content changes, crash/restart, restore or discard                                                                                                    | Correct source provenance, recoverable content, no stale saved drafts; corrupt recovery data is visible and cannot silently permit unsafe publish                                                          | 1.6                                       |
| **Agent chat — each supported tool**     | Claude Code, Codex and Hermes each edit real files from built-in chat, receive selection/direction, continue conversation, show progress, cancel and recover from failure | Actual shared actions/file changes, truthful lifecycle/history, no separate agent UI; broken generated site is not presented as a successful outcome; no approval-bypass launch                            | 2.1, 3.2                                  |
| **Run review / Before–After**            | Inspect changed files/pages, show/hide comparison of text/style/add/remove, undo whole run                                                                                | Correct highlighting and exact permitted restoration; later owner edits protected; failed/cancelled/no-change runs labelled correctly                                                                      | 2.2                                       |
| **Design**                               | Browse/select existing enriched directions; import a reference URL; revisit saved selection                                                                               | Site-owned tokens and DESIGN.md, inspector and every agent job use them; fonts actually resolve/load; exceptions explained; blocked URL is an error, not fabricated extraction                             | 4.1–4.2                                   |
| **Library**                              | Browse five built-in pieces/previews and external links; add, replace, undo in suitable pages on both site copies                                                         | Own editable plain-Astro component files; correct imports; no owner-file overwrite/orphan output; direction adopted; licences retained; replacement undo restores prior files                              | 4.3; approved nine criteria               |
| **Content**                              | Discover site's collections, edit/save fields, fallback to plain text for unsupported schema; revisit after schema change                                                 | Valid authored content preserved; stale schema cannot corrupt data; save/conflict/undo/recovery/publish guard consistent; no-collections site shows a useful honest state                                  | 3.4, 1.3–1.6                              |
| **Quality / feedback**                   | Build and check current output; inspect failures; send plain feedback to the agent and view resulting change                                                              | Overflow at 375/768/1280, accessibility/keyboard/focus, broken links, speed and direction checks; no checks pretended after failed build; measured evidence distinct from opinion and old host-site faults | 4.1–4.4                                   |
| **Publish**                              | Review changes, explicitly commit/upload, fail upload then retry without another commit                                                                                   | Every unsaved buffer blocks publish; only site's own repo; clear local commit vs upload states; remote matches intended commit; hosted auth separately evidenced                                           | 5.1                                       |
| **App shell / menus / errors**           | Use native New/Open/Projects shortcuts, resize/collapse at 1280×800 and larger, switch light/dark, traverse sections with keyboard                                        | Readable Coral/Source Sans 3 interface; preview does not block panels; state/selection stay coherent; errors visible and logged; busy states recover                                                       | 0.1, 3.1, UI decisions                    |
| **Preview trust boundary**               | View an ordinary or hostile site without granting it editor authority                                                                                                     | Website cannot call editing IPC, reach Node/editor bridge or escape project paths; preserve sender/path guards during preview repairs                                                                      | 1.8                                       |
| **Distribution / independent ownership** | Download/open identified candidate on another Mac; build generated site without Cauldron                                                                                  | Honest unsigned instructions and correct artifact; project not coupled to app runtime; first-launch setup limitations explicit                                                                             | 0.1–0.3, 4.3, 5.2                         |

Historical proofs are useful starting points, not reason to skip a currently failing control. A not-applicable Content row on a site with no collections requires an honest empty-state check and a second suitable fixture for positive editing. Likewise test library replace on a suitable category rather than inventing a UI operation unsupported by the chosen piece.

## 6. Keep verification in service of the product

1. Work from the real failing user journey. Inspect source and errors first; make the smallest complete repair.
2. Reuse existing test seams and proof tooling. Add a focused regression for a demonstrated bug, not a new test framework or one new giant harness per task.
3. Exercise the repaired operation through real rendered controls → preload/IPC → backend → actual files → actual preview/persistence. Label direct-backend, injected-bridge and shell-smoke evidence separately. Parent-window screenshots may omit the child WebContentsView: inspect the child itself, never fabricate a composite as proof.
4. Run the existing mandatory `npm run check` and `npm run smoke` commit gate. It is a gate, not product acceptance. Avoid repeatedly rebuilding unchanged bundles and rerunning unrelated suites or paid providers. One meaningful operation can cover related rows if recorded explicitly.
5. Verify negative behaviour that matters (cancel, missing import, stale write, invalid path, failed upload) alongside success. The goal is a usable recovery, not accumulating red/green counts.
6. End each slice with the visible result, exact revision/bundle and the remaining problem. If the app still cannot do the job, the slice is not a product completion even when tests pass.

## 7. Safe working setup and handoff facts

- Repo: `/Users/habibi/hermes/apps-codebases/cauldron`; remote `https://github.com/cre8tivoz/cauldron.git`. Verify actual branch/HEAD/status before work; two Finder `.DS_Store` files were pre-existing and must not be staged. Remote was private when checked for this handoff; the original plan's “public” label is historical.
- Read `.nvmrc` and `package.json`; baseline Node is 26.13.0, npm 12.2.2. On this Mac source `~/.nvm/nvm.sh`, `nvm use 26.13.0`, set `NODE_ENV=development`. No dependency installs or version changes are authorised by a planning task.
- Use the actual packaged binary under `out/Cauldron-darwin-arm64/Cauldron.app/Contents/MacOS/Cauldron`; build/pack commands are in package.json. Last delivered repair ZIP: `~/hermes/cauldron-builds/Cauldron-darwin-arm64-0.0.1-issue32.zip`, SHA-256 `9d80823791fe9683fe3db06ff2477884967c659f334ca96240f0779e9d7ddd21`. This is the failing baseline, NOT a fixed build. CI run `42476500982` green establishes checks/package/automated fresh-Mac launch, not product functionality.
- Each app test gets a fresh `CAULDRON_TEST_USER_DATA` scratch folder; restart tests reuse that one folder. Read existing `CAULDRON_BACKGROUND_TEST` support before background runs. Native dialog checks require actual authorised interaction. Do not open/activate desktop apps while Billy is working without permission.
- Preserve tinydogs and originals `~/hermes/website-designs/WDLsite`, `~/hermes/website-designs/rudeboycoffee`, and `~/hermes/cauldron-test-sites`. Make new disposable copies under the active scratch directory. Copies of rudeboycoffee contain a real Git remote: remove/repoint copied Git metadata before publish tests; never push the original or a copied live remote.
- Shared store: `~/Library/Application Support/Cauldron/pnpm-store`; previous issue-32 evidence: `~/hermes/cauldron-builds/issue32-proof/`. General packaged proofs are recorded in their tickets. Scratch paths can expire; absence of a raw artifact means evidence unavailable, not a fabricated fresh pass.
- Existing signed-in CLIs only; Codex is the lower-usage default for initial file-changing reproduction. Claude/Hermes still need their promised supported paths. No Ollama, fake models/servers, global agent-config edits, credential rotation or approval bypass. Hermes uses the dedicated `cauldron` profile; respect existing settings and inspect any connection-readiness failure rather than adding another arbitrary timeout.
- The handoff includes source/spec evidence inside this repo so a fresh agent can start without access to this Mac's Obsidian vault. Local original brief/research paths in the inventory are provenance, not prerequisites for the consolidated acceptance checklist. No API keys or user credentials are in the handoff evidence.

## 8. Receiving-agent execution record

Maintain this compact record here; do not launch another ticket-writing programme. Add a row per completed repair slice, updating its state in place. Link actual evidence under a small repo-local evidence location as needed; exclude secrets, node_modules, generated caches and unrelated private data.

| Slice                                     | State                                              | Result / evidence                                        | Remaining                                                    |
| ----------------------------------------- | -------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------ |
| P0: tinydogs / generation health          | OPEN — failure reproduced, no repair               | Baseline missing fonts + misleading finished record (§3) | Other failure messages and complete repair                   |
| P1: lifecycle / build / agent / safe edit | OPEN — existing proofs, not rescue acceptance      | Issue 32 and tickets 11–22                               | Exercise connected journey after P0; repair failures         |
| P2: all remaining sections                | OPEN — existing implementations and bounded proofs | Tickets 23–29; §5 checklist                              | Every control/section usable in rescued app                  |
| P3: identified distribution               | OPEN — automated CI launch only                    | Baseline artifact and CI identified (§7)                 | Candidate walkthrough, native interactions, human second Mac |

For each changed slice record: original failure; root cause actually established; smallest change; real app operation and observed result; focused regression; exact source revision and artifact; unresolved limitations. Do not copy old counts into a fresh PASS.

## 9. Accountability and final stopping rule

Claudia's delivery failed Billy in specific ways:

- Claimed release readiness from incomplete ticket coverage, package/CI launch and attractive generated output, while core product entry/lifecycle requirements were omitted or broken.
- Narrowed project entry to an existing prepared folder, losing New/recents/shared-store requirements; then treated completion against that narrowed plan as product completion.
- Emphasised design demonstrations and test totals over the complete normal user workflow, spending substantial time and usage without delivering a dependable desktop product.
- Delivered a repair with genuine bounded proofs, but still no established ordinary generation success; tinydogs then failed, with missing font dependencies and a misleading finished/no-problems record.
- Allowed stale, conflicting status documentation. The first Jev audit compounded that by using old findings as current; review corrected those claims. Neither an audit nor Jev endorsement establishes runtime success.

These were false or unsupported completion assurances, not defects Billy imagined. The exact cause of every earlier error and any model-switch explanation remain unknown; do not invent them to complete the narrative.

**Stop only when the whole product checklist works in the identified delivered app, or report an explicit blocker.** Preserve Billy's accepted design decisions and safety requirements. Do not call it finished because the plan is written, code exists, all tickets are checked, one showcase looks good, or a number of assertions passed. This handoff itself performs no application repair.
