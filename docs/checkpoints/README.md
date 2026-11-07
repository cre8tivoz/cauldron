# Documentation audit backup

`documentation-audit.zip` preserves the first-party Markdown documents from the sibling `cauldron-astro` research workspace, its two reference indexes, and the updated Obsidian pivot handoff. It backs up the research-side documentation alongside the application's tracked audit, instructions and local finding records.

## Contents and verification

- `cauldron-astro/`: research documents in their original relative locations, including the plan, approved taste checks, starter set, decision records and blind-test preparation.
- `obsidian/Cauldron Pivot — Initial Reference Read.md`: the updated project handoff only. Other vault notes are excluded.
- `manifest.json`: original source paths, archive member paths and SHA-256 hashes for every captured file.

These are archival copies. The original research files remain outside the application checkout and retain their existing authority. Rejected proposals remain historical and excluded from implementation. The live application audit is `../plan-verification.md`; the live local tracker is `../../.scratch/cauldron-v1/spec.md`.

No product source, dependencies, installed packages, credentials, generated builds, vendor research code or unrelated vault notes are included in the backup. Application development remains paused.
