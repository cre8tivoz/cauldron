# Cauldron

Cauldron is a free Mac app for building websites with [Astro](https://astro.build). You design and edit the site visually, an AI agent works alongside you, and everything it makes is ordinary Astro code — yours, in your own folder, no lock-in.

It's open source and free, and it stays that way.

**Rescued Mac test build — pending manual second-Mac Gatekeeper verification.** The P0–P3 rescue checklist in [RESCUE-PLAN.md](RESCUE-PLAN.md) has been exercised and verified on the packaged app (including ordinary site generation without unresolved `@fontsource` imports, explicit missing-package installation into the shared `pnpm` store, build/import health verification before marking a run finished, and all 17 whole-product acceptance rows). Because the build is unsigned and not notarised, manual first-launch verification on a physical second Mac (`System Settings → Privacy & Security → Open Anyway`) remains an explicit human-only check before a public release claim.

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
