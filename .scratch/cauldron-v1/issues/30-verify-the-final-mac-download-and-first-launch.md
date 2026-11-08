# 30: Verify the final Mac download and first launch

**What to build:** The final unsigned Mac build has exercised first-launch instructions and an accurate release-readiness record.

**Blocked by:** [14: Make failures visible wherever they happen](14-make-failures-visible-wherever-they-happen.md), [16: Publish safely and retry a failed upload](16-publish-safely-and-retry-a-failed-upload.md), [19: Finish and prove Codex support](19-finish-and-prove-codex-support.md), [20: Finish and prove Hermes support](20-finish-and-prove-hermes-support.md), [21: Show the changes an agent run actually made](21-show-the-changes-an-agent-run-actually-made.md), [22: Verify the agreed desktop workspace](22-verify-the-agreed-desktop-workspace.md), [26: Resolve or clearly account for shutdown and build risks](26-resolve-or-clearly-account-for-shutdown-and-build-risks.md), [29: Complete the blind judgement and design proof](29-complete-the-blind-judgement-and-design-proof.md)

**Status:** ready for second-Mac verification — ticket 29 is complete under Billy's approved scope. Final unsigned Apple-silicon zip, local hidden-launch proof and tester instructions are ready. Actual download/unpack/first launch on another Mac remains unverified. No public release has been published.

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

## Draft evidence — 8 Nov 2026 (implementation subagent, uncommitted work tree on 79aef82)

**Billy's authorisation (AGENTS.md):** one finish-up batch for tickets 29 and 30. The blind-comparison
design judgement is closed; ticket 30 preparation does not require another Moretti win.

### Final unsigned macOS zip (make path, unmodified)

- Artifact: `/Users/habibi/hermes/apps-codebases/cauldron/out/make/zip/darwin/arm64/Cauldron-darwin-arm64-0.0.1.zip`
- Size 121,641,013 bytes; sha256 `ff4831cb81a78e584ea8f5dc964a6d0c92120bbbb0fc4b22a13fa96c2eb5005a`
  (rebuilt 2026-11-08 after the ticket 29 recheck corrections; earlier build
  `6c4a732df028…` / 121,640,803 bytes is superseded)
- Contents inspected: single `Cauldron.app` (600 entries), `Contents/MacOS/Cauldron`,
  `Contents/Resources/app.asar` (1,888,359 bytes after the recheck rebuild), helper apps,
  `Info.plist`s present.
- Codesign: `Signature=adhoc` (flags 0x2 adhoc) — **unsigned, not notarised**. Gatekeeper will
  warn on another Mac; the supported path is System Settings → Privacy & Security →
  Open Anyway.
- Built with `npm run make` (electron-forge maker-zip), `NODE_ENV=development`, exit 0.

### Same-Mac first-launch exercise (NOT a second-Mac proof)

Fresh user-data directory, hidden-launch path:

```
rm -rf /tmp/cauldron-firstlaunch-userdata && mkdir -p /tmp/cauldron-firstlaunch-userdata
CAULDRON_TEST_USER_DATA=/tmp/cauldron-firstlaunch-userdata CAULDRON_SMOKE=1 \
  ./out/Cauldron-darwin-arm64/Cauldron.app/Contents/MacOS/Cauldron
# → SMOKE PASS: window created and interface rendered (exit 0)
```

Re-run 2026-11-08 against the rebuilt zip above with a fresh user-data dir
(`/tmp/cauldron-firstlaunch-userdata2`, `smoke-final.log`): SMOKE PASS, exit 0.

`npm run smoke` (package + hidden launch) exit 0 the same day. The preview-isolation
rejections in the log (`cauldron:preview-bounds` … "no editing powers") are expected
guarantees, not failures.

**Not claimable without evidence:** download, unpack and first launch on a _second_ Mac.
That requirement stays explicitly pending until a tester supplies it.

### Next tester steps (second Mac, arm64)

1. Download the zip; check the sha256 above.
2. Unzip (double-click). Do not open yet.
3. If macOS blocks the first launch: open **System Settings → Privacy & Security**,
   find the blocked-app message and press **Open Anyway** (then Open). Do not strip
   quarantine attributes with `xattr`; use the supported system path.
4. Launch Cauldron. Expected: startup splash, then the editor window with an empty workspace.
5. Record macOS version, whether Gatekeeper prompted, and a screenshot of the first window.

### Gates on the final work tree

`npm run check` exit 0; `npm run smoke` exit 0; `npm run make` exit 0. Exact revision:
HEAD `79aef82` plus the uncommitted finish-up changes listed in ticket 29's finish-up
evidence (no commits by the subagent; no public upload or release prepared).
