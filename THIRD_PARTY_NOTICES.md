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

### Starquix

- Copyright (c) 2026 Oleg Maykhopar and Nikita Osadchiy
- Licence: MIT
- What was taken (`WDL-243`, Your AI key): the provider wiring (Anthropic and
  OpenAI natively, OpenRouter and Ollama through their OpenAI-compatible chat
  endpoints) and the status-based failure classifier, adapted in
  `src/main/ai-agent.ts` from `app/src/ai/AIService.ts` and `app/src/ai/failure.ts`;
  and the rule that a secret is refused when the OS keychain cannot encrypt it,
  adapted in `src/main/ai-keys.ts` from `desktop/src/main.mjs`. Cauldron keeps the
  key in the main process; Starquix's renderer-side storage of its AI settings
  was deliberately not taken.
- https://github.com/Mayhopar/Starquix (commit `5a6240e`)

## Images

### Design-direction photographs

- Files: `src/assets/directions/*.webp` (one per direction; each filename names
  the brief it was made from).
- Made on 22 Nov 2026 with Black Forest Labs' FLUX.2 [klein] 9B image model,
  through fal.ai. They are AI-generated, not stock or third-party photographs.

## Studied, not copied

Kept in the research folder (`~/hermes/cauldronresearchbackup`), never a
dependency, submodule or vendored copy.

- **Starquix** — https://github.com/Mayhopar/Starquix, MIT, commit `5a6240e`
  (v0.0.2, 22 Nov 2026). Read for the canvas, SEO panel, bring-your-own-key
  handling and platform builds. The canvas study is
  `docs/plans/2026-11-22-starquix-canvas-study.md`. Compare widths is our own
  implementation on native Electron views; the code taken for Your AI key is
  listed in the first section.
- **React Bits**, **OriginKit**, **Superdesign**, **Design Bites** — discovery
  leads for library ideas; credited in the library UI as sources of ideas, with
  no code taken.

If you add code from another project, add it to the first section of this file in
the same pull request, with its copyright line and licence.
