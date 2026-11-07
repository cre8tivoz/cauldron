# 30: Verify the final Mac download and first launch

**What to build:** The final unsigned Mac build has exercised first-launch instructions and an accurate release-readiness record.

**Blocked by:** [14: Make failures visible wherever they happen](14-make-failures-visible-wherever-they-happen.md), [16: Publish safely and retry a failed upload](16-publish-safely-and-retry-a-failed-upload.md), [19: Finish and prove Codex support](19-finish-and-prove-codex-support.md), [20: Finish and prove Hermes support](20-finish-and-prove-hermes-support.md), [21: Show the changes an agent run actually made](21-show-the-changes-an-agent-run-actually-made.md), [22: Verify the agreed desktop workspace](22-verify-the-agreed-desktop-workspace.md), [26: Resolve or clearly account for shutdown and build risks](26-resolve-or-clearly-account-for-shutdown-and-build-risks.md), [29: Complete the blind judgement and design proof](29-complete-the-blind-judgement-and-design-proof.md)

**Status:** ready-for-agent

**Parent findings:** [09: publishing and mac release](09-publishing-and-mac-release.md)

**Plan:** 5.2; final v1 acceptance

**Execution:** Billy approved ticket publication, including safeguard 31. Application development remains paused until explicitly resumed. Readiness does not start work.

## Acceptance criteria

- [ ] Build from the final verified revision, preserve the separate-Mac download/unpack/launch evidence and exercise the manual unsigned first-launch instructions.
- [ ] Verify applicable agreed requirements against their exact evidence; retain any unresolved failure or risk explicitly.
- [ ] Keep the blind-comparison release gate and all applicable acceptance work intact.
- [ ] Preparing a download or recording readiness does not itself authorise publishing a release or making the repository public.
- [ ] For any confirmed bug fixed here, retain a permanent regression test that fails before the fix and passes afterwards.
- [ ] Record the exercised user-path results and exact revision; satisfy the existing project checks before committing. Distinguish failures, blocked work and unverified behaviour.

## Sources and boundaries

- [Agreed development plan](../../../../cauldron-astro/CAULDRON-ASTRO-PLAN.md): the numbered requirements above.
- [Whole-repository review](../../../docs/cauldron-code-review.md): evidence of the relevant faults and remaining acceptance work.
- [Retrospective](../../../docs/cauldron-retro.md): regression-test and evidence guidance; other environment changes require their own approval.

Use the existing implementation and tracker. Preserve the original sites, settled decisions and accepted scope. No speculative restructuring, additional features or weaker assertions. Keep parent finding records unchanged; completion evidence belongs with this child ticket.

## Comments

Ticket breakdown approved by Billy through the to-tickets approval form. Implementation has not started.
