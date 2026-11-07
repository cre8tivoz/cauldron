# Source safety result

**Atomic create:** `createFileAtomic` in `files.ts` writes a unique exclusive temp sibling, publishes with `linkSync` (EEXIST refuses overwrite), and unlinks the temp in `finally`, including partial-write failures. `writeSource` re-checks source containment after `mkdirSync`, then uses the helper.

**Created-file scope:** `Change.root` records the creating site root (optional for old records). History undo/redo refuse created files outside the root immediately before deletion/recreation, and redo re-checks after `mkdirSync`. `index.ts` supplies `site.root` on every created record.

**Tests:** added symlinked-ancestor swap tests for undo and redo, plus temp-cleanup assertion. Existing rootless created tests still pass.

`npm run check` green: typecheck, lint, 108 checks.

No model runs, commits, installs, or AGENTS.md changes.
