# Stacki hands-on evaluation

> **Superseded framing (6 Nov 2026):** Cauldron is our own application, not a fork or adaptation of Stacki ([ADR 0001](docs/adr/0001-own-application-not-a-fork.md)). Where this document recommends adapting or building on Stacki, read it as evidence of what works and what breaks. The findings stand; the "use Stacki as the foundation" conclusion does not.

## Historical verdict — foundation recommendation superseded by ADR 0001

**Proceed with Stacki as the Cauldron Astro foundation candidate, with stylesheet write/undo safety as the first repair gate.** Real-project execution supports reusing its Astro editor and preview. Integrated agent chat remains new work. No production-ready claim is warranted from this evaluation.

Evaluated source: `363b044f284c7875dfb674913d22a814b9ca62e2`, Stacki 1.0.12. A separate local checkout lives in `evaluation/stacki/`; original reference repositories and old Cauldron OS were not changed. No fixes, commits, pushes, deployments or packaged releases were made.

## Method and boundaries

**Later static follow-up:** REA has also been run against this exact local build's compiled application files, and against the official 0.0.23 download. See [STACKI-REA-ASSESSMENT.md](STACKI-REA-ASSESSMENT.md). It confirms the stylesheet defect's root cause: `style:writeFile` drops the version the edit was based on, so Undo applies an old stylesheet over newer disk changes. The general source save has the same gap. The official download is an older `UNLICENSED` HTML-only app, so it is not a reuse source. This follow-up did not rerun the GUI or repair the defects.

- Reviewed installation/build hooks, then installed development dependencies and built the Electron application in the evaluation checkout.
- Installed the separate `studio` dependencies after one targeted suite failed because its Astro test dependency was missing. Re-ran all six targeted suites successfully.
- Used a disposable filesystem-backed Astro 7.3.8 project in `evaluation/site/`. Its node_modules symlink reuses the evaluation studio installation; independent build means running Astro's build command against this project's files, not using the visual editor to emit a site.
- Opened the actual Electron window, using a dedicated `evaluation/user-data/` profile with usage counts disabled.
- Automated its rendered controls through local CDP. The test launcher supplied the disposable folder as the native picker result; the native folder picker itself was not tested. Project validation, project opening, watcher, preview process, renderer and desktop IPC were real.
- Resize measurements used native `window.resizeTo`, with CDP device emulation cleared and Puppeteer's default viewport disabled. Screenshots are actual native window sizes.
- External changes were filesystem edits made by the evaluator, simulating an external agent. No integrated model or external agent client was connected.
- Closed the evaluation window and terminated its exact Electron process after testing. Verified that both the debugging port (9334) and preview port (49104) were closed.

## Confirmed working

- **Build:** `npm run build` completed. Vite warned about large bundles; no build error.
- **Targeted suites:** documentActors, styleWrites, selection, roundtripCorpus, astroSaveRace and pageSender all passed after studio dependency installation. This was not the full repository gate.
- **Open and preview:** opened the disposable project through Open from folder and rendered its Astro page with selection controls available.
- **Component editing:** selecting Hero and editing its heading through Settings changed `src/pages/index.astro` and the live rendered h1. Undo restored both.
- **External page edits:** an external change to the heading appeared in both editor and preview. A later visual subtitle edit and its undo preserved the external heading.
- **CSS editing:** changing the Hero maximum width through Style changed `src/styles/global.css` and the computed preview width. In the no-external-change case, undo restored the exact stylesheet bytes.
- **Source preservation in this fixture:** the original configuration, layout, Hero component, Services component and stylesheet matched their initial contents after ordinary undo. The index retained only the intended external heading edit; page creation added contact. This does not establish losslessness for arbitrary Astro projects.
- **Page creation:** New page created `src/pages/contact.astro` using the existing BaseLayout. See preview problem below.
- **Independent site build:** `npm --prefix evaluation/site run build` emitted both `/index.html` and `/contact/index.html` successfully.
- **Native resizing:** tested 1440×900, 1100×800 and the 1024×640 minimum. No document-level horizontal overflow; Publish remained on screen. The preview area shrank from 814px to 474px to 398px as the fixed side panels retained their allocation.
- **Phone preview:** 375px preview, 375px scroll width, one-column service cards and the expected 48px mobile Hero padding. No horizontal page overflow in this fixture.

## Confirmed defects

### 1. Stylesheet undo can discard unrelated external edits

Reproduced with the running application, without timing tricks:

1. Visually changed `.hero` maximum width from 780px to 720px and let the save finish.
2. Externally changed the unrelated `footer` padding from 40px to 56px in the same stylesheet.
3. Waited until the live preview showed the external 56px footer padding.
4. Pressed the application's Undo shortcut with the field unfocused.
5. Stacki restored Hero width to 780px **and reset footer padding to 40px**, removing the external change.

The UI still reported all changes saved. Raw before/after CSS and the observed result are in `evaluation/runtime-results.jsonl`, test `css-undo-after-external-change`.

This confirms an unsafe full-stylesheet undo path. Separately, source inspection established that forward stylesheet writes pass a `base` in the renderer but omit it at the desktop IPC boundary. This run did not independently force a stale forward-save race. Both forward saves and undo/redo need expected-version checks or safe rebasing; merely forwarding a base for forward writes will not resolve snapshot-based undo.

### 2. Newly created page remained on a 404 preview until reload

New page successfully wrote contact.astro and opened `/contact`, but the embedded preview stayed on Astro's 404 page. A later same-origin request to `/contact` returned HTTP 200 while the embedded view remained 404. Clicking Reload preview then rendered the new page successfully. Switching back to Home also worked.

This establishes a page-creation/preview-refresh problem in this environment. The precise cause has not been traced; route-registration timing is a hypothesis, not a proven diagnosis. The created page used BaseLayout without its required title prop, so its document title was empty; required layout-prop handling also deserves review.

## Usability and resource observations

The desktop layout is usable and the minimum-size window retains its controls, but fixed navigation and inspector panels leave only 398px of preview at 1024px window width. There is no spare permanent column for an equally prominent agent conversation. Cauldron needs resizable/collapsible or switchable workspace panels, with selection context shared between visual controls and chat.

One warmed-up snapshot summed the evaluation process tree's RSS at **922.8 MiB**, including Electron helpers, the preview Node process and the Node launcher. RSS can double-count shared memory; this is a diagnostic observation, not a unique-memory measurement or a performance benchmark. No long-session leak, cold-start timing or large-project benchmark was run.

Runtime logs also recorded a React `getDerivedStateFromProps` warning and Electron's development CSP warning. Packaged-release security behaviour was not tested.

## Recommended next authorised implementation step

1. Create the working Cauldron application from this foundation while preserving upstream MIT notices.
2. Add failing integration regressions for stylesheet forward-write conflicts and for undo/redo after unrelated external edits; repair the shared write/history paths and re-run the GUI reproduction.
3. Reproduce and resolve new-page preview refresh; check required layout props.
4. Shape the equal-prominence visual/agent workspace, then connect one existing-login agent end to end. External clients should use the same versioned project actions.

## Evidence

- `evaluation/install.log`, `studio-install.log`, `build.log`
- `evaluation/targeted-tests.log` — first run, missing studio dependency
- `evaluation/targeted-tests-studio.log` — six suites passed
- `evaluation/runtime-results.jsonl` — observations, source before/after and process sample
- `evaluation/site-build.log` — successful independent static build
- `evaluation/runtime.log` — desktop log
- `evaluation/evaluated-editor.png`, `visual-edit.png`, `phone-preview.png`, `window-1024x640.png`, `final-desktop.png`

The page-creation observation in the ledger has `passed: true` for file creation, followed by the separate preview follow-up. It must not be interpreted as a passing first-load preview test.
