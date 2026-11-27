# Roadmap

Cauldron is a free, unsigned Mac app, currently at version 0.150.0. This is a short account of where work is going, not a schedule. There are no dates, percentages or promises here. If you want the reason behind a decision, read `docs/adr/` first.

## Now

### The component library

This is the biggest area by a mile, and the one where help lands deepest. A person can already add plain-Astro pieces to a page, see them in a live preview at desktop and phone widths, search them, and undo the change. Most pieces were custom-built and there is plenty left to build.

The browser in `src/components/LibraryPanel.tsx` offers nine pills: **Featured**, **All**, and seven real categories. The counts below come from the pieces returned to that panel from `src/main/library.ts` and `src/main/library-pieces.ts`:

| Category     | Pieces |
| ------------ | ------ |
| Text effects | 3      |
| Backgrounds  | 3      |
| Cards        | 3      |
| Galleries    | 2      |
| Navigation   | 3      |
| Buttons      | 2      |
| Sections     | 4      |

That is 20 pieces across the seven categories. The Featured view holds 8 of them; All holds all 25 (the 20 catalogue pieces plus the five starters). The five older starter pieces — editorial intro, newsletter footer, glowing call to action, heading reveal and woven cloth background — carry their own single-word categories, so they turn up under All and search rather than under Featured or the seven named pills. Sorting those out is part of the work, not a hidden feature.

What's in the way: every piece is written by hand as its own Astro file with scoped CSS, checked against the site's tokens and the taste rules. It must work with JavaScript off unless the interaction is the point, and even then the content must still be in the HTML. A new piece needs a live preview, a description, a licence line, and a check that text clears 4.5:1 on the direction's own colours. `CONTRIBUTING.md` sets out the ground rules, including the ban on one-sided coloured accent bars. Reused code needs a permissive licence and an entry in `THIRD_PARTY_NOTICES.md`; references are studied, not copied.

### The front-end UI

The rail system, menus and inspector are the next place to put effort. These are the React parts of the app, not the generated sites; `docs/adr/0004` records why the split exists. Changes here need the packaged-app checks, because unit tests miss broken menus and inspectors.

### The interactive canvas

Selection and editing on the live preview is in use and still has rough edges. Work here should keep the boundary in `AGENTS.md` intact: a site shown in the preview gets no editing powers over the app.

### SEO panel fine-tuning

The SEO panel edits titles, descriptions, share images and noindex in the site's own Astro and Markdown files, with live search and social previews. The remaining work is refinement of those checks and previews, not a separate SEO product.

### Design taste

The checks in `src/main/taste-check.ts` and `src/main/contrast.ts` are the measuring side. Work here means finding the rule that is giving a wrong answer and fixing the rule, not loosening a threshold to make a report green. `AGENTS.md` is explicit about that.

## How this list is kept

GitHub Issues on this repo is the tracker. Anyone can open an issue, comment and send a pull request; there is no ticket system to apply to. Older exploratory planning documents are gone from the repository, and the ones in Git history are background, not a work list.

## Next

### Windows and Linux builds

Cauldron is Mac-only today, and `AGENTS.md` says not to add half-finished platform code. This item means real release builds for Windows and Linux, with packaging and a packaged-app smoke check for each, not a few conditionals in the build script. CI already runs a Linux smoke check; that is a check, not a release. The Mac keychain holds AI keys now, so credential storage would need an answer on the other systems before the build could be called finished.

### One-click Netlify

One-click deploy already exists for Cloudflare Pages, Vercel and GitHub Pages, driven by the person's own local credentials (`src/main/publishing.ts`). Netlify would be a fourth option along the same lines: build the static site, call the Netlify CLI, pull the address out of its output, and say plainly what went wrong when it fails. In the way: that deployment path and its failure messages do not exist yet. A deploy that returns no address has to report that it may have gone through, not claim success.

### Live Unsplash and Pexels stock search

The asset tray already has a disabled search box and a "COMING SOON" panel with this exact label. `src/main/assets.ts` says the curated placeholder photos were removed because they could not be verified, and the list is empty. This item means a real, verified API search that can credit photographers accurately and copy images into the site's own `public/images/` folder. In the way: the API integration and the attribution data behind it. Drag-and-drop and local upload already work, so the app is usable without this.

## Not planned

### App-store distribution

Cauldron is distributed as an unsigned Apple Silicon zip on GitHub Releases: `Cauldron-darwin-arm64-<version>.zip`. The README walks through the first-launch "Open Anyway" steps. There is no plan to submit it to the Mac App Store or another app store.

### Code signing and notarisation

There is no Apple Developer certificate, so the build is neither signed nor notarised. `AGENTS.md` records this as settled: don't plan it and don't open work for it. Gatekeeper friction at first launch is the known trade-off for a free MIT build people can download and inspect.

### A cloud-hosted version

Sites, recents, run history and preview thumbnails stay on the person's Mac, and the app has no telemetry. Hosting the editor would mean holding people's site folders and credentials and would change that promise. It isn't on the list.

### Third-party apps driving Cauldron

There is no plan to turn Cauldron into a platform that other apps build on, with a public API or an SDK. The app does have a local MCP connection, described in `src/main/mcp.ts`, that lets an outside agent on the same Mac call the same checked actions with a per-site code. It listens on this computer only and is not exposed to the network. Extending that into a network service or a third-party integration programme is not planned.

## How to help

Start with `CONTRIBUTING.md`. It covers bug reports, editing a site by hand, the checks to run before a pull request, and the behaviour bar.

You don't need to write code. Open an issue on [GitHub Issues](https://github.com/cre8tivoz/cauldron/issues) and choose the **Component suggestion** issue form. A screenshot or a link to a real site, a plain description of the piece, and whether it needs interaction is enough to start. One idea per pull request, and say what you ran to check it.
