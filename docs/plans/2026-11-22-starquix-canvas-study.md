# Starquix canvas study and Cauldron's first step (WDL-244)

**Status, 22 Nov 2026:** the first step is built and merged — PR #42, squash
`b714c2e`, shipped in the installed 0.10.0 build. Compare widths renders the open
page at 375 / 768 / 1280 at once, read-only, verified at 373 / 765 / 1277 CSS px.
Four review findings were fixed before merge: frames are refused on a stage under
~630px, a resize repositions without reloading, comparison starts from the page
being viewed rather than the site root, and genuine load failures are recorded
instead of being mistaken for dev-server aborts. Still open on the ticket:
drag-to-reorder, inline text editing, click-to-select inside a compare frame, and
breakpoint-specific edits.

Studied 22 Nov 2026 from `https://github.com/Mayhopar/Starquix` at commit `5a6240e`
(MIT, v0.0.2, 2,695 files). The clone lives in the research folder at
`~/hermes/cauldronresearchbackup/references/source/starquix` and is not a
dependency, submodule or vendored copy.

Billy's ruling on reuse (22 Nov 2026): MIT code may be reused in Cauldron with
attribution where it fits. No Starquix code was copied for this step — their canvas
is React + Yjs + Tailwind class strings, Cauldron's is plain CSS, tokens and native
Electron views — but the implementation below was informed by reading theirs, and
their licence is recorded in `THIRD_PARTY_NOTICES.md` terms if that changes.

## What they actually ship

Their `docs/decisions.md` argues for "6 Breakpoint Viewports" so you can "see
responsive design at once — no switching between viewport sizes". **The code does
not do that.** `app/src/components/Canvas/Canvas.tsx` renders exactly one
`<ViewportFrame breakpoint={currentBreakpoint}>`, and `BreakpointBar.tsx` is a
dropdown over `base 375 / sm 640 / md 768 / lg 1024 / xl 1280 / 2xl 1536` with
keyboard shortcuts 1–6, plus a separate device-height menu. Single frame, switch
to change width.

That matters for us: side-by-side breakpoints are unbuilt territory in both apps.
Copying their layout was never an option because it does not exist.

## Techniques worth having

**Editing layer ≠ viewport layer.** `BreakpointContext.tsx` tracks two separate
things: `viewportBreakpoint` (how wide the frame is) and `activeBreakpoint` (which
responsive layer your edits write into). A comment records the bug they shipped and
reverted: the editing layer used to auto-follow the frame, so a restored `lg` frame
kept resurrecting `lg:` overrides on reload. Overrides are now opt-in. If we add
breakpoint-specific edits, these must be two pieces of state, not one.

**The preview owns scanning, the app owns selection.** Their iframe bridge script
walks the DOM and posts typed messages (`RECTS_UPDATED`, `RECT_UPDATED`,
`TEXT_SELECTION_CHANGED`, `SCREENSHOT_CAPTURED`, `SOURCE_CHANGED`, ~20 types), and
the app keeps selection state and paints an overlay (`data-sq-selection-highlight`).
Cauldron already has the same split through `pickMode` over IPC; our version is
simpler because the app owns the window.

**Selection as a set with a primary.** `SelectionContext.tsx` is ~1,370 lines and
carries the invariants as tests: adding dedupes and never adds the primary,
selecting a different element collapses the set, `clearAdditionalSelections` keeps
the primary, selecting the primary away promotes the earliest extra, "infra" keys
are refused. If we do multi-select, those are the cases worth writing first.

**Drag is one `DndContext` with typed drag sources.** `types/drag.ts` enumerates
`gutter-handle`, `layers-panel`, `pages-panel`, `assets-panel`, and gutter ids are
prefixed `gutter:<elementKey>` so one handler can tell them apart. Layer reordering
is `@dnd-kit/sortable` with static row geometry captured at drag start, because
`over.rect` moves under the pointer.

**Source keys, not injected ids.** They identify elements by `file:line:column`,
which survives HMR and avoids polluting the user's markup with ids. Cauldron writes
`data-cauldron-*` attributes instead; theirs is cleaner for round-tripping, ours is
easier for the agent to reason about. Worth revisiting only if HMR starts losing
selections.

## What we deliberately do not take

- **Yjs/CRDT state.** Their whole app is a collaborative document with custom undo
  and a Vite plugin writing files. Cauldron is single-user and local; the main
  process already owns file writes. Adopting a CRDT would be a rewrite for a
  benefit nobody has asked for.
- **Tailwind class-string editing.** Their edits are class names; ours are tokens.
- Nothing at all from their analytics or update-check paths.

## This step: compare widths, read-only

What this PR adds, and why it is this small:

- `src/preview-compare.ts` — pure geometry. Three columns (375 / 768 / 1280). Each
  frame keeps its **CSS width at the breakpoint** and is scaled to fit with the
  page zoom factor, so media queries fire at the width they were designed for; a
  column wider than the breakpoint is never upscaled, because a 375px phone blown
  up to 900px lies about type size.
- `src/main/preview-compare.ts` — a `PreviewCompare` class holding one
  `WebContentsView` per frame, sharing the preview's locked-down partition and
  security configuration. It is a **separate class from `Preview`**, not a mode
  inside it: `Preview` carries click-to-select, height reporting and thumbnail
  capture, all of which assume exactly one view, and the working single-preview
  path is not worth risking for a read-only feature.
- `PreviewStage` grows a **Compare widths** toggle and three slots; the renderer
  measures its own columns and sends rectangles, so a window resize moves native
  views without touching React state.
- The single preview is set to zero bounds while comparing, so it cannot cover the
  frames.

Deliberately not in this PR: selection inside the frames, editing, drag, syncing
scroll position between columns, more than three widths, and any change to the
single-preview behaviour when compare is off.

## Next steps on WDL-244

1. Click-to-select inside a compare frame (route the pick to the frame under the
   pointer; the main preview keeps its own).
2. Drag-to-reorder sections on the canvas, using their typed-drag-source approach.
3. Inline text editing on the page.
4. Breakpoint-specific edits, which is where their two-layers lesson applies.
