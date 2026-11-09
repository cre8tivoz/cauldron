# Cauldron

Cauldron is a free Mac app for building websites with [Astro](https://astro.build). You design and edit the site visually, an AI agent works alongside you, and everything it makes is ordinary Astro code — yours, in your own folder, no lock-in.

It's open source and free, and it stays that way.

**Rescued Mac build — P0–P3 verified & complete visual upgrade (9 Nov 2026).** The engineering foundation and full visual design upgrade ([upgrades.md](upgrades.md)) have been implemented and verified on the packaged app: left navigation rail, TopBar icon controls, live preview indicators, conversational Agent chat bubbles and run cards, 2-column Element Inspector with live swatches, 4-column visual hero specimen cards in Design Directions with Google Fonts, 3-column component cards with live direction preview stages, collections content sidebar with 3-column field rows, 2-column split quality report, and 2-column Git publishing review with Mac download bar. Second-Mac download, unpack, and launch verification runs automatically on a clean macOS runner in GitHub Actions (`separate-mac-launch` in `.github/workflows/ci.yml`). Because the build is unsigned and not notarised, users opening a downloaded zip on macOS for the first time should use `System Settings → Privacy & Security → Open Anyway`. See [docs/cauldron-retro.md](docs/cauldron-retro.md) and [upgrades.md](upgrades.md) for lessons learned and visual verification evidence.

## Try it

You'll need [Node.js](https://nodejs.org) 26.13 and npm 12.

```bash
npm install
npm start
```

## Download (unsigned test build)

A packaged macOS (Apple silicon) zip can be built from source:

```bash
npm run make   # produces out/make/zip/darwin/arm64/Cauldron-darwin-arm64-<version>.zip
```

The build is **unsigned and not notarised**, so macOS Gatekeeper may warn that it cannot
verify the developer on first launch. If that happens, do not retry blindly: open
**System Settings → Privacy & Security**, find the blocked-app message, and press
**Open Anyway** (then Open). This is the supported macOS path for opening an unsigned,
not-notarised app you built yourself. No public release has been published yet — this
is a local test build only.

## Checks

```bash
npm run check   # type check and lint
npm run smoke   # package the app, open it hidden, confirm it draws
```

Both run automatically on every push and pull request.

## How it's made

Electron, React and TypeScript, packaged with Electron Forge. The interface uses Source Sans 3, which is free to bundle.

The thinking behind how it works — why it's built this way rather than another — is written down in [`docs/adr`](docs/adr).

## Licence

MIT. See [LICENSE](LICENSE).
