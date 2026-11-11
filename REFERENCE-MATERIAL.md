# Original reference material

Billy moved the original research and related evaluation material into this checkout and explicitly requested that it travel with the repository. The material is preserved under [`originalresearch/`](originalresearch/), including folders hidden by its historical `.gitignore`.

Start with [`AGENTS.md`](AGENTS.md) for current product scope and the [Cauldron Linear project](https://linear.app/witchdaddy/project/cauldron-cb61ac6bc02b) for the work list. These originals establish provenance and let the next agent challenge the handoff; they are not current completion claims or permission to copy studied application code into Cauldron. Historical `AGENTS.md`, `CLAUDE.md` and skill files inside the references describe those sources, not the active app's instructions. Original third-party licences are retained.

## Included

- Original plans, UI research, assessments, decisions, design proposals and superseded proposals.
- `cauldron-pivot-research/`, including original Jev inputs, judgments and evidence maps.
- `evaluation/`, including runtime screenshots, logs, reverse-engineering analyses, extracted reference files, evaluation source and plan-review evidence.
- `references/`, including source snapshots, source/licence manifests, design references and catalogues.
- Original supporting skill documents and internal relative symlinks. Nested repositories are stored as actual source files, not unresolvable embedded Git links; their `.git` histories stay local.

The [transfer manifest](docs/rescue/reference-upload-manifest.json) lists every included entry, byte size, SHA-256, Git blob and mode, and every excluded folder/file. It records **24,555 reference entries**, including **55 symlinks**. Material is preserved as reference, including original formatting and obsolete claims; it has not been rewritten to agree with the rescue assessment.

## Explicit exceptions

Billy selected **“Keep only the oversized installers local; push all other research.”** GitHub's per-file limit prevents ordinary Git storage of:

- `originalresearch/evaluation/rea-stacki/Stacki-0.0.23-universal.dmg` — 206,998,124 bytes.
- `originalresearch/evaluation/rea-sitereal/sitereal-1.0.2-arm64.dmg` — 126,914,402 bytes.

Both remain untouched locally. Also excluded: dependency/cache folders, nested `.git` metadata, the evaluation browser session (cookies/storage), and the external evaluation `node_modules` symlink. Evaluation settings, recents, thumbnails, authored source, analyses and screenshots are included.

Two upstream reference files contained credential-like literals. Their Git copies redact those values; the manifest records source and uploaded hashes, redaction counts and reasons:

- `references/source/pages-cms/.env.local.example`: private-key block replaced with an explicit redaction marker.
- `references/source/superdesign/src/services/customAgentService.ts`: two hard-coded bearer literals replaced with an explicit redaction marker.

Those local originals are unchanged, so this checkout intentionally shows differences against those two sanitised Git copies. They were not authenticated, rotated or deleted. Obvious synthetic keys in upstream unit tests remain intact. A static scan is not a guarantee that every possible secret format was recognised.

## Working with the archive

Application formatting excludes `originalresearch/` via `.prettierignore`; this preserves historical material rather than mass-reformatting it. The archive's original ignore rules are also preserved. Already committed reference files are available in a fresh clone, including the formerly ignored directories. Future additions under those directories may require explicit, reviewed staging. Never stage dependency folders, sessions or the two oversized installers to get around that review. Do not use a broad `git add` to replace the two redacted Git blobs with their unchanged local originals.
