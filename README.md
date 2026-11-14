# Cauldron

Cauldron is a free Mac app for building websites with [Astro](https://astro.build). You design and edit the site visually, an AI agent works alongside you, and everything it makes is ordinary Astro code — yours, in your own folder, no lock-in.

It's open source and free, and it stays that way.

**Status: in development, not yet released.** The foundations work, and a full audit on 9 November 2026 listed what still needs fixing. Work is tracked in the [Cauldron Linear project](https://linear.app/witchdaddy/project/cauldron-cb61ac6bc02b); the 9 November audit itself is in [fablefixes.md](fablefixes.md). Rules and scope for anyone working on the code are in [AGENTS.md](AGENTS.md).

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
verify the developer on first launch. If that happens, open
**System Settings → Privacy & Security**, find the blocked-app message, and press
**Open Anyway** (then Open). No public release has been published yet. Opening a
downloaded copy on a second Mac by hand has not been verified.

## Checks

```bash
npm run check   # type check, lint and unit tests
npm run smoke   # package the app, open it hidden, confirm it draws
```

Both run automatically on pushes to `main` and on pull requests.

## How it's made

Electron, React and TypeScript, packaged with Electron Forge. The interface uses Source Sans 3, which is free to bundle; specimen display fonts load from Google Fonts only when the Design directions screen is opened.

The thinking behind how it works — why it's built this way rather than another — is written down in [`docs/adr`](docs/adr).

## Licence

MIT. See [LICENSE](LICENSE).
