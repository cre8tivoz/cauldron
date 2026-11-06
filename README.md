# Cauldron

Cauldron is a free Mac app for building websites with [Astro](https://astro.build). You design and edit the site visually, an AI agent works alongside you, and everything it makes is ordinary Astro code — yours, in your own folder, no lock-in.

It's open source and free, and it stays that way.

**It's early days.** Right now Cauldron opens a window and that's about it. There's no editor to use yet and no download. This repository is where it's being built, in public.

## Try it

You'll need [Node.js](https://nodejs.org) 26.13 and npm 12.

```bash
npm install
npm start
```

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
