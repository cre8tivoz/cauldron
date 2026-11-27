# Contributing to Cauldron

G'day. Thanks for having a look.

Cauldron is a small, open-source Mac app for designing and building real Astro websites. You open or create a site, ask a built-in agent to work on it, tune the result on a live canvas, then publish it. The site stays ordinary Astro files in your own folder — it builds without Cauldron, and always will.

This is the front door for three kinds of people: someone who has never opened a terminal, a designer or tinkerer who is happy in HTML and CSS, and a developer who wants to dig into the code. Pick the bit that fits and skip the rest.

## Where we most want help

In this order:

1. **The built-in component library.** The biggest area by a mile. Most pieces were custom-built and there is plenty left to build out.
2. **The front-end UI.** The rail system, menus and the inspector.
3. **Design taste.** How the app judges and tunes a site's look.
4. **The interactive canvas.**
5. **SEO panel fine-tuning.**

Anything else useful is still welcome — these are just the places where a contribution lands deepest.

## Never opened a terminal? Start here

### Getting the app

- Download the Apple Silicon build from [GitHub Releases](https://github.com/cre8tivoz/cauldron/releases/latest). The file is called `Cauldron-darwin-arm64-<version>.zip`.
- Cauldron is **unsigned and not notarised**, so macOS will most likely block it the first time you open it. That's expected, not a virus.
- Unzip the download and move **`Cauldron.app`** into your **Applications** folder.
- Try to open `Cauldron.app`. If macOS says the developer cannot be verified, dismiss the dialog.
- Open **System Settings → Privacy & Security**, scroll down to the Cauldron notice, click **Open Anyway**, then confirm **Open**.

After that first launch, it opens like any other app. No terminal required.

### Reporting a bug so it actually gets fixed

Open an issue in [GitHub Issues](https://github.com/cre8tivoz/cauldron/issues) on this repo. You don't need a ticket, an invite, or anyone's permission. A good bug report has:

1. **What you did** — the steps, in order, so someone can follow along.
2. **What you expected to happen.**
3. **What you saw instead** — be specific. "It broke" is hard to act on; "the preview went blank after I clicked Compare widths" is gold.
4. **The version** — in Cauldron, open the **Cauldron** menu and choose **About Cauldron**. The version number is in that panel.
5. **A screenshot**, if you have one handy.

If you can make the problem happen twice, say so. That tells us it's a real bug and not a one-off hiccup.

Copy this into a new issue and fill in the blanks:

```text
Title: Preview goes blank after Compare widths

What I did:
1. Opened my site in Cauldron.
2. Clicked Compare widths.

Expected: all three widths side by side.
Saw: the preview went blank and stayed blank until I reloaded.

Version: <number from Cauldron menu > About Cauldron>
Happens every time: yes
```

### Proposing a component without writing code

You don't need to write a line of code. Open a **Component suggestion** issue (the template asks the right questions) with:

- A screenshot of the component, or a link to a reference website that has one.
- What it is — a pricing block, a program grid, a footer, whatever it might be.
- Why it's nice and where you'd use it.
- Whether it needs real interaction (a slider, a menu) or just sits there looking good.

"Have a look at the table near the bottom of this site; I'd love that as a section" is a perfectly good issue. That's enough for us to build it as plain Astro. For example:

```text
Title: Component idea — programme schedule grid

Reference: https://example.com/ (the timetable about halfway down)
Screenshot: attached
What it is: a two-column grid of sessions with time, title and speaker
Interaction needed? no — just layout and type
Why: would suit a small conference or workshop site
```

Don't worry if you can't describe the CSS. A picture and a plain-English description do the job.

## Designers and tinkerers

If you can edit HTML and CSS, you can contribute here.

### The component library

The library lives in `src/main/library-pieces.ts`. Each piece is **plain Astro markup plus its own CSS**, built from the site's tokens, with a live preview in the app's component browser.

The whole job — the piece contract, a worked example, how to prove it, and the list of things that get a piece rejected — is in [docs/contributing/components.md](docs/contributing/components.md). What's already built is in [docs/reference/library-catalogue.md](docs/reference/library-catalogue.md).

Ground rules for a new piece:

- **Keep it plain Astro.** It must work with JavaScript off unless the interaction _is_ the point — a slider or a menu, for example. Even then, the content should still be there without the script.
- **Text hits 4.5:1 contrast** against the site's own tokens. Don't pick colours out of thin air: use the direction's tokens and check the pair.
- **No one-sided coloured accent bars.** A thick coloured bar down one edge of a card, callout or nav item is out. Use an even border or a tinted background instead.
- Use the site's spacing and type scales. Keep hover and focus-visible states visible. Don't nest cards in cards, and don't use emoji in place of icons.

### Editing a site by hand

Open a site in Cauldron and edit the generated `.astro` files in any editor you like. They're normal files in your own folder, not locked away inside the app. [`docs/adr/0007`](docs/adr/0007-library-components-are-copied-into-the-site.md) explains why library components are copied into the site rather than linked from a shared package: the site stays yours and keeps working without Cauldron.

### Words and decisions

`GLOSSARY.md` fixes the product words. **Site** versus **Project** is the one that trips people up — the home screen manages Projects, while the workspace edits a Site. `docs/adr/` explains why things are built the way they are; have a read before proposing something that cuts against an existing decision.

Keep docs and UI text in plain Australian English: colour, licence, behaviour, organise. Warm and direct beats corporate fog every time.

And the behaviour bar is simple: **don't be a dickhead**. Be decent and helpful in issues and pull requests. The details are in [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md).

## Developers

### Get running

You need **Node.js 26.13** (see `.nvmrc`) and **npm 12**. `pnpm` is optional — Cauldron uses it automatically for shared site dependencies when it's installed, and falls back to `npm` when it isn't.

```bash
git clone https://github.com/cre8tivoz/cauldron.git
cd cauldron
npm install
npm start
```

Rough map of the repo, so you know where to point your editor:

- `src/main/` — Electron main process: Astro dev server, preview host, agent actions, taste checks, quality and publishing.
- `src/components/` — the React editor interface: Agent panel, Inspector, rail screens, canvas, SEO and Quality panels.
- `scripts/` — unit suites, the packaged-app checks and smoke checks.
- `docs/adr/` — the architecture decisions, worth reading before a big change.

### Checks

```bash
npm run check       # typecheck + oxlint/oxfmt + unit tests
npm run verify:mac  # check + packaged Mac smoke verification
```

`npm run check` runs `tsc --noEmit`, lint and formatting, then the unit suites. `npm run verify:mac` runs that and then packages and smoke-launches the Mac app. If you can't run the Mac part — say, you're not on a Mac — say so plainly in your report.

Want Git to run `npm run check` before every commit? Opt in once per checkout:

```bash
npm run hooks:install
```

### Packaged-app suites

After `npm run package`, these exercise the real app rather than unit-level code:

```bash
npm run test:app:shell   # real packaged app over CDP: no-site states, creating a project
npm run test:projects    # real Astro installs through the shared store, then a real dev server
npm run test:library:ui  # real packaged app over CDP: the component browser
```

`test:app:shell` and `test:library:ui` drive the real `Cauldron.app` over CDP. `test:projects` is a real-workflow proof: two genuine Astro projects installed into one shared store, a second offline install reusing it, and a dev server started under a restricted PATH. If you touch a rail, menu or inspector behaviour, these are the checks that catch what unit tests miss.

**`npm run package` does not type-check.** electron-vite strips types without checking them, so a package can exit 0 with type errors in it. Run `npm run typecheck` or `npm run check` before packaging, and don't read `PACKAGE=0` as proof the code compiles.

## How contributions work

- Issues live in [GitHub Issues](https://github.com/cre8tivoz/cauldron/issues) on this repo. You don't need a ticket, an invite, or permission to open an issue or a PR.
- One idea per pull request. Small PRs get merged fast.
- In the PR, say what you changed and what you ran to check it.
- The maintainer reviews and merges; CI must be green.
- By contributing you agree your work is **MIT**, same as the repo — see [`LICENSE`](LICENSE).

For why things are built the way they are, see `docs/adr/`. For product words, see `GLOSSARY.md`. For behaviour, see [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md).

Happy tinkering.
