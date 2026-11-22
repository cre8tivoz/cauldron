# Third-party notices

Cauldron's code is MIT (see `LICENSE`). This file records every third-party work
whose code, look or structure has been taken into this repository, as required by
`docs/adr/0002` and `docs/adr/0003`.

Where something was only _read_ — studied to understand how a problem is solved —
it is listed at the bottom as reference and carries no licence obligation. Naming a
studied project here is not a claim that any of its code is present.

## Code or look in this repository

### ThreeUI Community

- Copyright (c) 2026 Meng To
- Licence: MIT
- What was taken: the visual look of the section-library pieces in
  `src/main/library.ts` (and the pieces built on it), rewritten as plain Astro.
- https://threeui.com

Everything else in the component library is Cauldron's own work, written from
scratch against the taste rules in `docs/adr/0005` and `docs/adr/0008`.

## Studied, not copied

Kept in the research folder (`~/hermes/cauldronresearchbackup`), never a
dependency, submodule or vendored copy.

- **Starquix** — https://github.com/Mayhopar/Starquix, MIT, commit `5a6240e`
  (v0.0.2, 22 Nov 2026). Read for the canvas, SEO panel, bring-your-own-key
  handling and platform builds. The canvas study is
  `docs/plans/2026-11-22-starquix-canvas-study.md`. No Starquix code is in this
  repository; Compare widths is our own implementation on native Electron views.
  If that changes, the MIT notice above applies to whatever is taken.
- **React Bits**, **OriginKit**, **Superdesign**, **Design Bites** — discovery
  leads for library ideas; credited in the library UI as sources of ideas, with
  no code taken.

If you add code from another project, add it to the first section of this file in
the same pull request, with its copyright line and licence.
