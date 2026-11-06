# Cauldron

A free, open-source Mac app for designing and building real Astro websites, with design taste built in. Visual editing and an AI agent work side by side on the same site.

**Status:** setup. The app window, decisions, checks and licence are in place. The editor comes next; nothing in it works yet.

## Run it

Requires Node.js 26.13 (see `.nvmrc`) and npm 12.

```bash
npm install
npm start
```

## Checks

```bash
npm run check   # type check and lint
npm run smoke   # package the app, then open it hidden and confirm it renders
```

Both run automatically on every push and pull request.

## What's where

| Path              | What it is                                                    |
| ----------------- | ------------------------------------------------------------- |
| `src/main.ts`     | The app itself: window, menu, single instance                 |
| `src/app-menu.ts` | The Mac menu                                                  |
| `src/preload.ts`  | The small, fixed set of facts the interface can ask for       |
| `src/App.tsx`     | The interface                                                 |
| `src/site.ts`     | _(next)_ Site detection and live preview                      |
| `docs/adr/`       | Decisions, and why                                            |
| `GLOSSARY.md`     | The words we use, so we mean the same thing                   |
| `build/icon.icns` | App icon. Provisional; replace when the real mark is designed |
| `AGENTS.md`       | How an agent should work in this repository                   |

## Rules that matter

- Design taste is core, not decoration (`docs/adr/0005`).
- Nothing is copied from a studied product; reading for understanding only (`docs/adr/0002`).
- Cauldron's own app code is ours. Licensed library components may be bundled with credit (`docs/adr/0008`).
- Nothing is installed without asking.

## Built with

Electron 45, React 19 and TypeScript 7, packaged with Electron Forge. Interface font is Source Sans 3 (SIL Open Font License).

## Licence

MIT. See [LICENSE](LICENSE).
