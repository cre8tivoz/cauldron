# Issue tracker: Local Markdown

> **Historical record — not current.** Kept for provenance only. Status claims in this file ("done", "verified", "complete") were true at best when written and several have since been found wrong. The current work list is the [Cauldron Linear project](https://linear.app/witchdaddy/project/cauldron-cb61ac6bc02b); the rules and scope are in [`AGENTS.md`](../../AGENTS.md).

Issues and specs for this repo live as markdown files in `.scratch/`.

## Current effort

`.scratch/cauldron-v1/spec.md` links the agreed source documents and the retrospective finding records under `issues/`. These records were created during the documentation audit after checkpoint `82fc6c6`. Earlier implementation had no local tickets; do not backdate these records or imply it followed a ticket frontier. All records currently have `Status: needs-triage`; implementation remains paused. The consolidated requirement/evidence and issue/risk register is `docs/plan-verification.md`.

## Conventions

- One feature per directory: `.scratch/<feature-slug>/`
- The spec is `.scratch/<feature-slug>/spec.md`
- Implementation issues are one file per ticket at `.scratch/<feature-slug>/issues/<NN>-<slug>.md`, numbered from `01`, never a single combined tickets file
- Triage state is recorded as a `Status:` line near the top of each issue file (see `triage-labels.md` for the role strings)
- Comments and conversation history append to the bottom of the file under a `## Comments` heading

## When a skill says "publish to the issue tracker"

Create a new file under `.scratch/<feature-slug>/` (creating the directory if needed).

## When a skill says "fetch the relevant ticket"

Read the file at the referenced path. The user will normally pass the path or the issue number directly.

## Wayfinding operations

Used by `/wayfinder`. The **map** is a file with one **child** file per ticket.

- **Map**: `.scratch/<effort>/map.md` (the Notes / Decisions-so-far / Fog body).
- **Child ticket**: `.scratch/<effort>/issues/NN-<slug>.md`, numbered from `01`, with the question in the body. A `Type:` line records the ticket type (`research`/`prototype`/`grilling`/`task`); a `Status:` line records `claimed`/`resolved`.
- **Blocking**: a `Blocked by: NN, NN` line near the top. A ticket is unblocked when every file it lists is `resolved`.
- **Frontier**: scan `.scratch/<effort>/issues/` for files that are open, unblocked, and unclaimed; first by number wins.
- **Claim**: set `Status: claimed` and save before any work.
- **Resolve**: append the answer under an `## Answer` heading, set `Status: resolved`, then append a context pointer (gist + link) to the map's Decisions-so-far in `map.md`.
