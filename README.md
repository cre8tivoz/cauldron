# Cauldron

Cauldron is a free Mac app (Apple Silicon, v0.10) for building websites with [Astro](https://astro.build). You design and edit the site visually, an AI agent works alongside you, and everything it makes is ordinary Astro code — yours, in your own folder, no lock-in.

It's open source (MIT) and free, and it stays that way.

**Status: v0.10 (`0.10.0`) public MIT repository.** Type check, lint, unit suites, smoke launch, and CI macOS build/launch checks pass; work is tracked in the [Cauldron Linear project](https://linear.app/witchdaddy/project/cauldron-cb61ac6bc02b). Rules and scope for contributors are in [AGENTS.md](AGENTS.md).

## Download (unsigned Mac build)

Download **`Cauldron-darwin-arm64-0.10.0.zip`** from [GitHub Releases](https://github.com/cre8tivoz/cauldron/releases), or build it locally from source (`Node.js` 26.13, `npm` 12):

```bash
npm install
npm run make   # produces out/make/zip/darwin/arm64/Cauldron-darwin-arm64-0.10.0.zip
```

> **Unsigned macOS app — First launch:**
> Cauldron is distributed **unsigned and not notarised** (no Apple Developer certificate). On first launch, macOS Gatekeeper may block `Cauldron.app`:
>
> 1. Unzip `Cauldron-darwin-arm64-0.10.0.zip` and move **`Cauldron.app`** into **Applications**.
> 2. Try opening **`Cauldron.app`**. If macOS says the developer cannot be verified, dismiss the dialog.
> 3. Open **System Settings → Privacy & Security**, scroll down to the Cauldron security notice, click **Open Anyway**, and confirm **Open**.
>
> _(Note: CI builds and launches the packaged `.app` cleanly, though opening a downloaded copy by hand on a separate Mac has not been manually tested.)_

## Try it from source

You'll need [Node.js](https://nodejs.org) 26.13 (`npm` 12 ships with Node; `pnpm` is optional and used automatically when installed).

```bash
npm install
npm start
```

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
