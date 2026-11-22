# Contributing to Cauldron

G'day! Thanks for dropping by.

Cauldron is a small, open-source tinkering project built for fun and usefulness. There are no massive legal disclaimers or bureaucratic hoops here. The vibe is simple:

- **Don't be a dickhead.** Be decent, helpful, and respectful to everyone in issues and pull requests.
- **Contribute whatever you reckon is useful.** Bug fixes, polish, better Astro starter bits, accessibility improvements, or ideas — if it makes Cauldron nicer to use, we'd love to see it.
- **We'll get to pull requests in a timely manner.** Small, focused PRs are the quickest to review and merge.

## Running Cauldron locally

You'll need **Node.js 26.13** (see `.nvmrc`) and **npm 12**. (`pnpm` is optional — Cauldron uses it automatically if you have it installed, and falls back to `npm` if you don't.)

```bash
git clone https://github.com/cre8tivoz/cauldron.git
cd cauldron
npm install
npm start
```

## Checking your changes

Before opening a pull request, give the checks a run so we know everything still builds and passes:

```bash
npm run check       # type check, lint, formatting, and unit tests
npm run verify:mac  # runs check + packages and smoke-launches the Mac app locally
```

Once the app is packaged, these drive the **real `Cauldron.app`** over CDP, so they catch what unit tests cannot:

```bash
npm run test:app:shell     # every site screen explains itself with no site open; creating a project opens it
npm run test:projects      # real Astro installs through the shared store
npm run test:library:ui    # the component browser in the packaged app
```

If you'd like Git to run `npm run check` automatically before every commit, you can opt in to the repo's pre-commit hook:

```bash
npm run hooks:install
```

In your pull request description, a quick note on what you changed and what you ran to test it is heaps helpful.

## Handy tips

- **Plain Australian English** in the UI and docs (colour, licence, behaviour — keep it clear and jargon-free).
- **Keep sites ordinary Astro.** Anything Cauldron creates or edits should stay plain Astro files that build cleanly without Cauldron.
- **No silent failures.** If something goes wrong in the app, show a clear message so the person using it knows what happened.
- Curious why something is built a particular way? Have a look at [`docs/adr/`](docs/adr/) and [`AGENTS.md`](AGENTS.md).

## Licence

By contributing, you agree that your changes are licensed under the same [MIT licence](LICENSE) as the rest of the repo.

Happy tinkering!
