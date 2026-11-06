# Cauldron

A free, open-source desktop app for designing and building real Astro websites, with built-in design taste. Visual editing and an AI agent work side by side on the same site.

**Status:** early setup. This repository currently contains the bare Electron app.

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

The same checks run automatically on every push and pull request.

## Built with

Electron, React and TypeScript, packaged with Electron Forge. The interface font is Source Sans 3 (SIL Open Font License).

## Licence

MIT. See [LICENSE](LICENSE).
