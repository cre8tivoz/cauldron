# 11: Save content without damaging the file

**What to build:** Content forms safely edit supported fields and offer plain-text editing for structures they cannot safely edit.

**Blocked by:** None (can start once implementation is authorised).

**Status:** done

**Parent findings:** [05: content definition and fallback](05-content-definition-and-fallback.md)

**Plan:** 1.5; 3.4

**Execution:** Billy approved ticket publication, including safeguard 31, then resumed development for this ticket only on 7 Nov 2026. Development pauses again after this ticket's commit.

## Acceptance criteria

- [x] Reproduce the block-list corruption before the fix, then prove the resulting file remains valid and unrelated content stays byte-for-byte intact.
- [x] Use the site’s own definitions; unsupported or nested structures stay intact and are available through the plain-text fallback.
- [x] A changed content definition or conflicting disk edit is reported without overwriting either version.
- [x] For any confirmed bug fixed here, retain a permanent regression test that fails before the fix and passes afterwards.
- [x] Record the exercised user-path results and exact revision; satisfy the existing project checks before committing. Distinguish failures, blocked work and unverified behaviour.

## Sources and boundaries

- [Agreed development plan](../../../../cauldron-astro/CAULDRON-ASTRO-PLAN.md): the numbered requirements above.
- [Whole-repository review](../../../docs/cauldron-code-review.md): evidence of the relevant faults and remaining acceptance work.
- [Retrospective](../../../docs/cauldron-retro.md): regression-test and evidence guidance; other environment changes require their own approval.

Use the existing implementation and tracker. Preserve the original sites, settled decisions and accepted scope. No speculative restructuring, additional features or weaker assertions. Keep parent finding records unchanged; completion evidence belongs with this child ticket.

## Comments

Ticket breakdown approved by Billy through the to-tickets approval form.

### Completion record — 7 Nov 2026

**Revision:** tested on the working tree on top of `e0eaaa8`; committed in the commit that marks this ticket done (`fix: save content without damaging the file`). Node 26.13.0.

**Issues found and fixed** (all in `src/main/content.ts`):

1. Block-list corruption (reproduced). A schema-less `tags:` block list was inferred as text; saving it replaced only the `tags:` line, left the list items dangling (invalid YAML) and returned `ok: true`. Fix: a value that continues onto indented or `- ` lines, or starts with `[ { > |`, is marked as needing plain-text editing and saving it is refused with the file untouched, whatever the inferred type.
2. Nested definitions leaked out. Line-based schema reading turned `name` inside a nested `author: z.object({...})` into a top-level field. Fix: only top-level members of the collection's `z.object` become fields; nested objects are marked as needing plain-text editing; definitions spanning several lines are read as one.
3. One collection took another's fields. A fixed 2,000-character window after `defineCollection` could run into the next collection's schema. Fix: the block is bounded to that collection's own `defineCollection(...)` call.
4. A field written twice was half-rewritten. Saving `title` when it appears twice changed the first and left the second. Fix: refused, use plain-text editing.
5. `$` sequences in a value spliced the file. Found by the developer subagent, then reproduced and fixed by the orchestrator because it breaks this ticket's byte-for-byte criterion: a value such as `$'` or `$&` was read as a string-replacement pattern. Fix: the new frontmatter is joined by position instead of `String.replace`.

UI (`src/components/ContentPanel.tsx`): fields that need plain-text editing show "This field needs plain-text editing to keep its structure." with an **Edit as plain text** button, in place of a Save button that could only fail.

**Regression tests** (`scripts/test-core.mjs`, each in its own temporary site): block list refused with the rest of the file intact; block list refused even when the definition says text; nested and multi-line definitions; collection without schema does not take the next one's fields; field set twice refused; dollar sequences saved literally; plain-text save refuses a stale disk edit.

**Verification evidence:**

- Red: with the original `content.ts` restored, all six bug tests failed (block list ×2, nested definitions, collection bleed, duplicate field, dollar sequences). The stale plain-text test passed before and after; it guards existing behaviour.
- Green: `npm run check` (types, lint, format, `test-core.mjs`, `test-agent.mjs`) exited 0.
- `npm run smoke` exited 0 (packaged app opened and rendered).
- Packaged app, content test on the rudeboycoffee test copy (`~/hermes/cauldron-test-sites/rudeboycoffee`, never the original): 6/6 passed, including an out-of-date form refused with nothing overwritten.
- Packaged app, content test on a scratch copy of that site with `tags: z.array(z.string()).optional()` added to the schema and a two-item block list in the first entry: 6/6 passed; a byte comparison showed only the title line changed and the tags block intact. Scratch copy deleted afterwards.
- Changed definition and conflicting disk edits: refused with the disk file unchanged (form and plain-text tests). The person's version is kept: on refusal `ContentPanel` keeps the typed values and does not clear the recovery draft (code reading).

**Limitations:**

- The new per-field hint and button were checked by type check, lint and code reading only; they were not clicked in a running app, because the existing harness cannot drive the content panel.
- Schema reading still finds a collection only through `const NAME = defineCollection(...)` with the variable named after its folder. Other layouts fall back to frontmatter inference, which now refuses structured values instead of damaging them.
- Out of scope, not acted on: a form save still adds a field the site's definition does not declare, instead of refusing it.
