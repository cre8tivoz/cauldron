# Cauldron v1 — source pointers and issue index

> **Historical record — not current.** Kept for provenance only. Status claims in this file ("done", "verified", "complete") were true at best when written and several have since been found wrong. The current state and work list is [`fablefixes.md`](../../fablefixes.md); the rules and scope are in [`AGENTS.md`](../../AGENTS.md).

Status: rescue-complete (9 Nov 2026)
Execution: tickets 11–32 and the P0–P3 rescue checklist in [RESCUE-PLAN.md](../../docs/history/RESCUE-PLAN.md) are complete under Billy's authorisation (9 Nov 2026, commit `11ace4db493727f3bc3cfbfbba2a6bc2a943d5ee`). His reviewed PeNtA design verdict is closed. Ticket 30 is complete using the GitHub Actions clean macOS runner (`separate-mac-launch`) for second-Mac validation per Billy's decision (no second physical Mac available). See [docs/cauldron-retro.md](../../docs/cauldron-retro.md) for all rescue surprises and lessons learned. Earlier execution notes below are historical.

## Authority

1. Billy's latest instructions and original Obsidian `WEB BUILDER IDEAS.md`.
2. The agreed [24-item plan](../../../cauldron-astro/CAULDRON-ASTRO-PLAN.md), [starter set](../../../cauldron-astro/design/STARTER-SET.md), and [approved taste checks](../../../cauldron-astro/design/camillo/taste-tests.md).
3. The application's [ADRs](../../docs/adr/) and [glossary](../../GLOSSARY.md).
4. [UI research](../../../cauldron-astro/CAULDRON-UI-RESEARCH.md): recorded decisions govern; research suggestions do not grant extra scope.
5. [Checkpoint results and current issue/risk register](../../docs/plan-verification.md).

This file points at the existing requirements. The research cache stays outside the application repository. Do not reconstruct requirements from a model's summary, declare new defaults approved, or treat an earlier green assertion count as complete acceptance.

## Local finding records

The local Markdown tracker was configured during setup. Its ticket directory was absent until this audit. Original finding records 00–10 under `issues/` record the discovered gaps and remain `needs-triage`; they do not establish earlier ticket-driven implementation. The approved child tickets below provide the repair and verification breakdown in the same tracker. Application development remains paused. Each future implementation needs authorisation, exact plan references, required acceptance evidence, and a status update when verified. No parent finding is closed by publishing child tickets.

- 00 — process and traceability
- 01 — core save/recovery evidence
- 02 — shared actions and agent support
- 03 — Before/After and whole-run undo
- 04 — workspace and selection context
- 05 — content definitions/fallback
- 06 — approved taste criteria
- 07 — all nine library checks
- 08 — real-brief blind proof
- 09 — publishing/Mac release
- 10 — shutdown/build risks

Release depends on all applicable acceptance evidence, including the measured results and Billy's blind judgement in 4.5. An open investigation need not wait on that later judgement. Implementation may resume only when Billy authorises it.

## Approved repair and verification tickets

Billy approved tickets **11–30** and the separate retrospective safeguard **31** through the to-tickets approval form. These child tickets link back to the original findings **00–10**, which remain unchanged. The agreed plan still defines scope; the [review](../../docs/cauldron-code-review.md) establishes faults and missing evidence. Other [retrospective](../../docs/cauldron-retro.md) proposals do not become authorised environment changes merely by being mentioned.

**Application development remains paused.** Readiness labels do not resume implementation. Start with content-file corruption (**11**) and unsafe/incomplete run undo (**12**) when implementation is explicitly resumed. Follow each ticket's actual blocking links; numerical order is not an additional dependency. Billy authorised ticket **11** on 7 Nov 2026; it is done and development is paused again.

**Agreed batch order (Billy, 7 Nov 2026).** The remaining tickets are worked in four batches, one commit each, with the same conventions as ticket 11 (red-green regression tests, orchestrator verification, a completion record per ticket):

1. Protect people's work: **31, 12, 13, 14, 15, 16**.
2. One set of editing actions and all three agents: **17, 18, 19, 20, 21**.
3. Design taste and quality: **23, 24, 25, 27, 28**. The two real-brief comparisons use contrasting designs from Billy's Obsidian notes or `website-designs` (not the WDLsite or rudeboycoffee test sites); Claudia shows Billy the picks before building.
4. Publish and ship: **22, 26**, then Billy's blind judgement **29**, then **30**.

Each batch needs Billy's go-ahead. Batches 1 and 2 are done (7 Nov 2026); development is paused until Billy approves batch 3. Ticket **29** requires Billy's blind judgement and is `ready-for-human`; the other approved tickets are `ready-for-agent` subject to their blockers and the implementation pause.

### Protect people's work

- [11: Save content without damaging the file](issues/11-save-content-without-damaging-the-file.md)
- [12: Undo an agent run without losing other work](issues/12-undo-an-agent-run-without-losing-other-work.md)
- [13: Recover every unsaved edit after a crash](issues/13-recover-every-unsaved-edit-after-a-crash.md)
- [14: Make failures visible wherever they happen](issues/14-make-failures-visible-wherever-they-happen.md)
- [15: Verify consistent safe saving across the editor](issues/15-verify-consistent-safe-saving-across-the-editor.md)
- [16: Publish safely and retry a failed upload](issues/16-publish-safely-and-retry-a-failed-upload.md)

### Complete the shared agent workflow

- [17: Use the same checked editing actions everywhere](issues/17-use-the-same-checked-editing-actions-everywhere.md)
- [18: Prove Claude works through the repaired app](issues/18-prove-claude-works-through-the-repaired-app.md)
- [19: Finish and prove Codex support](issues/19-finish-and-prove-codex-support.md)
- [20: Finish and prove Hermes support](issues/20-finish-and-prove-hermes-support.md)
- [21: Show the changes an agent run actually made](issues/21-show-the-changes-an-agent-run-actually-made.md)
- [22: Verify the agreed desktop workspace](issues/22-verify-the-agreed-desktop-workspace.md)

### Prove design quality

- [23: Make quality measurements and feedback reliable](issues/23-make-quality-measurements-and-feedback-reliable.md)
- [24: Verify taste and design-direction compliance](issues/24-verify-taste-and-design-direction-compliance.md)
- [25: Prove all five library components work](issues/25-prove-all-five-library-components-work.md)
- [26: Resolve or clearly account for shutdown and build risks](issues/26-resolve-or-clearly-account-for-shutdown-and-build-risks.md)

### Complete the release proof

- [27: Build and measure the first real-brief comparison](issues/27-build-and-measure-the-first-real-brief-comparison.md)
- [28: Build and measure the second real-brief comparison](issues/28-build-and-measure-the-second-real-brief-comparison.md)
- [29: Complete the blind judgement and design proof](issues/29-complete-the-blind-judgement-and-design-proof.md)
- [30: Verify the final Mac download and first launch](issues/30-verify-the-final-mac-download-and-first-launch.md)

### Separately approved workflow safeguard & project lifecycle restoration

- [31: Block local commits when existing checks fail](issues/31-block-local-commits-when-existing-checks-fail.md)
- [32: Restore project workflow](issues/32-restore-project-workflow.md)

Each ticket records its result, completion checks, dependencies, source findings and evidence requirements. Repairs retain regression tests that fail before the fix and pass afterwards. Record durable proof in the project without credentials or complete disposable sites. No parent finding is closed by publishing these tickets.
