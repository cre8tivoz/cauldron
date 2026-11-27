# Cauldron docs

Written down so nobody has to reverse-engineer it. If something here disagrees with the code, the code is right and the doc is a bug — send a pull request.

## Where to start

| If you want to…                               | Read                                                                                             |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| understand how the app is put together        | [architecture/overview.md](architecture/overview.md)                                             |
| know what it writes to disk                   | [architecture/data-and-files.md](architecture/data-and-files.md)                                 |
| see what the agent is allowed to do           | [architecture/agent-runtime.md](architecture/agent-runtime.md)                                   |
| publish a site                                | [architecture/publishing.md](architecture/publishing.md)                                         |
| know what "good" means here                   | [product/principles.md](product/principles.md)                                                   |
| know what's coming                            | [product/roadmap.md](product/roadmap.md)                                                         |
| add a component to the library                | [CONTRIBUTING.md](../CONTRIBUTING.md) and [contributing/front-end.md](contributing/front-end.md) |
| build the app's own interface                 | [contributing/front-end.md](contributing/front-end.md)                                           |
| run the tests                                 | [contributing/testing.md](contributing/testing.md)                                               |
| cut a release                                 | [contributing/releasing.md](contributing/releasing.md)                                           |
| know exactly what a site is judged on         | [reference/quality-checks.md](reference/quality-checks.md)                                       |
| see the evidence behind the component library | [reference/library-audit/README.md](reference/library-audit/README.md)                           |

## The folders

```text
docs/
├── architecture/    how it runs: processes, files, agents, publishing
├── product/         what it believes, and what's next
├── contributing/    front-end conventions, testing, releasing
├── reference/       quality checks, component library evidence
└── adr/             the decisions, and why they were made
```

### architecture/

- [overview.md](architecture/overview.md) — the three processes, the IPC bridge, the preview view, the action boundary, and a "where to change what" table.
- [data-and-files.md](architecture/data-and-files.md) — what a generated site contains, and what the app keeps in its own user-data folder.
- [agent-runtime.md](architecture/agent-runtime.md) — the built-in chat, the installed CLIs, your own API key, and how keys are protected.
- [publishing.md](architecture/publishing.md) — Git, static export, and the three one-click hosts.

### product/

- [principles.md](product/principles.md) — the rules behind the taste checks, the generated site staying ordinary Astro, and the person staying in charge.
- [roadmap.md](product/roadmap.md) — what's being worked on, what's next, and what isn't planned.

### contributing/

- [front-end.md](contributing/front-end.md) — the app's own tokens, layout and conventions, including the defects that became guard tests.
- [testing.md](contributing/testing.md) — what each suite proves, and how CI is wired.
- [releasing.md](contributing/releasing.md) — version, zip, tag, CI, release notes.

### reference/

- [quality-checks.md](reference/quality-checks.md) — every measured check a generated site goes through, with thresholds.
- [library-audit/](reference/library-audit/README.md) — how the component library is measured: contrast harness, contact sheets, and the evidence file.
- [directions-audit/](reference/directions-audit/README.md) — the same for the ten design directions.

### adr/

Architecture Decision Records. Each one explains a choice that is expensive to reverse — read the relevant record before proposing something that contradicts it. Start at [ADR 0001](adr/0001-own-application-not-a-fork.md) if you want the shape of the project.

## What used to be here

The exploratory material from before publication — the original plan, the rescue notes, the audit write-ups, and the old local ticket tracker — is not in the repository any more. It remains in Git history if you want the archaeology, and it is not a work list.
