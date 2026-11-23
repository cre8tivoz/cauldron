# Cauldron SEO panel — proposal

**Summary (read this first)**

Starquix's current SEO panel does not have a hidden SEO store. It reads and writes the site's own Astro files: a page's `<head>`, its layout's props, or the frontmatter of a post. That is the part worth pinching. It also has an older, abandoned Yjs SEO model with fields like `keywords`, `ogType` and per-page sitemap toggles — that is the part to leave behind. My proposal: a small SEO view in Cauldron that edits title, description, share image and noindex as frontmatter props on the page and matching meta tags in the layout, using the existing `readSource`/`writeSource` hash-checked actions. No new store, no config writes in v1.

## What Starquix actually does (verified in the code)

There are two SEO systems in the repo. Only one is live in the panel:

- **Live, files-truth:** `app/src/components/SeoPanel/SeoPanel.tsx:14` uses `usePageSeo` (`app/src/components/SeoPanel/usePageSeo.ts:18`), which calls `loadPageSeo` / `savePageSeo` (`app/src/store/seo/seoFiles.ts:33,43`). The engine is `app/src/store/seo/headSeo.ts`.
- **Legacy Yjs store:** `app/src/store/seo/types.ts:17-53` defines a big `SeoPageData` with `keywords`, `ogType`, `twitterCardType`, `robotsAdvanced`, per-page `generateSitemap` / `generateRobotsTxt`. `app/src/store/seo/seoCompleteness.ts:30-74` scores that old model. Note: `keywords` appears **only** here (`types.ts:23,62`), not in the live page fields. The brief mentions keywords and per-page sitemap toggles; those are legacy. The live panel treats sitemap/robots as **site-wide** settings (`app/src/components/SeoPanel/sections/SiteSection.tsx:57-61`).

**Live per-page fields** — `title`, `description`, `image`, `imageAlt`, `noindex`, `canonical`, `shareTitle`, `shareDescription` (`app/src/store/seo/headSeo.ts:23-24`, mapping at `:45-86`). The panel groups them into Search (title, description), Sharing (image, imageAlt, share title, share description), Indexing (noindex, canonical), StructuredData and Site (`SeoPanel.tsx:34-45`).

**Where writes land.** This is the useful bit. `readPageSeo` builds a "chain" from the page file through its layout to a head component — up to three layout hops and one component hop (`headSeo.ts:201-262`). For each field `homeOf` decides where the value lives (`:403-465`), then `editPageSeo` writes it (`:739-868`):

1. Page has its own `<head>` → literal tag edited in place: `<title>`, `<meta name="description" content="…">`, `<meta property="og:image" …>`, `<link rel="canonical" …>` (`headSeo.ts:799-812`, `:843-853`). A missing `<head>` is added on first edit (`:833-839`).
2. Layout owns the `<head>` and takes props → the value is written as an **attribute on the page's `<Layout …>` tag** (`headSeo.ts:814-821`). The layout's meta tag reads the prop.
3. Layout hard-codes a literal → the layout tag is rewritten to `{p ?? old}` (or `{p ? "noindex, nofollow" : old}` for `noindex`), the layout learns the new prop, and the page sets it (`connectValue` at `headSeo.ts:774-781`, `feed` at `:763-773`). This is how a **shared layout** is handled: every other page still renders the old value because of the `?? old` fallback. The edit touches both files in one batch, one undo.
4. Dynamic route (`[slug].astro`) → the value goes into the **post's frontmatter** (`headSeo.ts:501-504`, `:756-758`), with keys `title`, `description`, `ogImage`, `ogImageAlt`, `noindex`, `canonical`, `ogTitle`, `ogDescription`. A field the collection schema does not declare is added to `src/content.config.*` in the same batch, otherwise a strict schema would strip it (`seoFiles.ts:51-66`).
5. Share image starting with `/` is turned into an absolute URL using the site address (`seoFiles.ts:44-49`).

**Site-level writes.** Favicon, language, site name and X handle are written into **every head in the project** in one batch (`seoFiles.ts:135-141`, `headSeo.ts:972-1009`); the UI shows "Mixed — value" when heads disagree (`SiteSection.tsx:42-47`). Site address is `site:` in `astro.config.*` (`siteConfig.ts:51-87`). Sitemap is `@astrojs/sitemap` imported and added to `integrations` in `astro.config.*` plus a dependency in `package.json`; a `Sitemap:` line is managed in `public/robots.txt` (`siteConfig.ts:11-12,89-119,146-153`, `seoFiles.ts:143-169`). Sitemap refuses to turn on before the site address is set (`seoFiles.ts:165`).

**Reading it back.** `usePageSeo` re-reads the files after every filesystem scan, so its own writes, undo and outside edits all show up (`usePageSeo.ts:40-47`); `save` takes a snapshot, writes one field and bumps a nonce to force a re-read (`:57-66`). A separate one-off SSR fetch shows what search engines actually see (`seoFiles.ts:69-95`). The AI tools `read_page_seo` / `update_page_seo` call exactly the same engine, so the panel and agent agree (`app/src/ai/tools/localSeoTools.ts:30-71`).

**Validation.** Title max 60 and description max 160 (`app/src/store/seo/pageSeoScore.ts:17-18`) surface as a "Long" badge and character counter (`SeoTextField.tsx:36-54`), not a hard block. Missing description is a scored to-do, weighted 3 (`pageSeoScore.ts:25-41`). Canonical must start with `https://` (`headSeo.ts:746`); site address must look like a URL (`siteConfig.ts:62-68`). Fields commit on blur or Enter, one write per edit, never per keystroke (`SeoTextField.tsx:17-35`).

## Cauldron today (the anchors)

- Rail is Sites / Content / Components / Design / Quality / Publishing (`src/App.tsx:862-926`). Panels receive the open `site` and call `window.cauldron.*` (`src/components/ContentPanel.tsx:5-12,34-55`); the generic bridge is `runAction` (`src/preload.ts:113-118`).
- File IO: `readSource`, `writeSource`, `listPages`, `resolvePageFile` (`src/main/actions.ts:176-252,254-276,341-353`). Every write states the exact `baseHash`; a changed file is refused with a conflict, never clobbered (`:242-251`). Allowed paths are `.astro` under `src/pages`, `src/layouts`, `src/components` and `.css` under `src/styles` (`:160-172`). **`astro.config.*`, `package.json` and `public/robots.txt` are not writable through this path.** That decides the v1 scope.
- Frontmatter parse/save already exists for content entries (`src/main/content.ts:276-318,321-360`).
- Quality uses `Finding` / `Report` with status `pass | fail | unknown | info` (`src/main/quality.ts:49-72`) and already checks build, page load, alt text, language, heading order and internal links (`:755-1067`), triggered by `window.cauldron.qualityRun` (`src/preload.ts:235-236`).

## Proposal

**Where it lives.** Add one rail button "SEO" after Content (`App.tsx` rail block), rendering a new `src/components/SeoPanel.tsx`. It uses `NoSiteGate` like the other panels and takes the selected page from the same source the Content view uses. A rail item is better than burying SEO in Quality: SEO is edited per page, alongside content, while Quality stays a report.

**Fields in v1 (and only these).** Title, description, share image URL, share image alt, and noindex. Canonical and the site-level fields follow in v2 — canonical needs a site address to be useful, and site-level writes need a new safe config-write path (see below). Do **not** add keywords, ogType, twitter card type or per-page sitemap toggles: they are the legacy Starquix model and carry no ranking benefit worth the code.

**Exact file each field is written to, for a plain Astro site.**

- Page with a layout (every Cauldron starter: `src/layouts/Base.astro`, which already takes `title` and renders `<title>{title}</title>`, `src/main/templates.ts:100-130`): write the values as **props on the page's layout tag**, which is Starquix's own route for `.astro` pages (`headSeo.ts:814-821`). For example `src/pages/about.astro` becomes:
  ```astro
  <Base
    title="About us"
    description="What our studio does"
    image="/uploads/about-share.png"
    imageAlt="The team at work"
  >
  ```
  and `src/layouts/Base.astro` declares those props and renders them in its `<head>`: `<meta name="description" content={description} />`, `{image && <meta property="og:image" content={new URL(image, Astro.site ?? Astro.url).href} />}`, `{imageAlt && <meta property="og:image:alt" content={imageAlt} />}`, `{noindex && <meta name="robots" content="noindex, nofollow" />}`. (A `layout:` frontmatter key only applies to Markdown pages; Markdown and content-collection entries take the same fields as frontmatter.)
- Page without a layout: write literal tags into that page's own `<head>` — same tag text as above but with the value inlined.
- A shared layout is never rewritten to a page-specific literal. If a layout already hard-codes a title, v1 refuses that field with a clear "set by code in <file>:<line>" message rather than silently changing every page. The Starquix `connect` trick (rewrite to `{p ?? old}`) is v2 — it is clever but it edits a file shared by other pages, so it needs an undo story first.
- Site address, sitemap, robots.txt, favicon and X handle are **out of v1**: `writeSource` cannot reach `astro.config.mjs` / `package.json` / `public/robots.txt` (`actions.ts:160-172`). Doing them properly means adding a new narrowly-scoped action with the same hash-check rule. That is a separate PR.

**How it reads the current value back.** Reuse the `readSource` + hash pattern: read the page file, read the props on its layout tag (or the frontmatter, for Markdown/content entries, with the existing parser in `content.ts:276-318`), then read the layout it imports and check its `<head>` for the corresponding meta tags. Show the page's own value as editable; if it is absent but the layout has a literal, show that as a grey "inherited" placeholder rather than an editable value. Re-read on window focus and after a write, so an outside edit is visible. No state is kept in a renderer store — the file is the only source of truth.

**How it avoids a hidden store.** Every save is one `writeSource` call with the `baseHash` from the matching `readSource` (`actions.ts:195-252`). Nothing is written to a Yjs map or a settings file. If the hash has changed, show the conflict and offer "reload from disk" — the same pattern `ContentPanel` already uses (`ContentPanel.tsx:57-70`).

**Ties into Quality.** Add three site-wide findings to `checkSite` (`quality.ts:732+`), all `kind: 'measured'`:

- `seo-title`: each page has a non-empty `<title>` (fail lists routes).
- `seo-description`: each page has a description between 1 and 160 characters (the Starquix `DESCRIPTION_MAX`, `pageSeoScore.ts:18`).
- `seo-share-image`: pages intended to be shared have an `og:image` with alt text (weight 2 + 1 in Starquix's score, `pageSeoScore.ts:31-32`).
  Use `listPages` (`actions.ts:254-276`) as the page list. Keep them in the existing measured group so they show in the same report; do not add a new score of Starquix's weighted percentages — that complexity is not needed.

**What to reuse from Starquix (and what not to).**

- Reuse the _idea_ and the field set: `app/src/store/seo/headSeo.ts:23-24,45-86` (field → tag/prop mapping, including the `Astro.site` URL handling) and `app/src/store/seo/pageSeoScore.ts:17-18` (length limits).
- Reuse the chain idea in a much smaller form: resolve page → layout → `<head>` before reading or writing (`headSeo.ts:203-262`).
- Reuse the "one field, one write, re-read after" interaction (`usePageSeo.ts:57-66`, `SeoTextField.tsx:17-35`).
- Reuse the quality weighting only as a hint for which checks matter (`pageSeoScore.ts:25-41`).
- **Do not copy** the 1,060-line `headSeo.ts` splice engine, the Yjs store and its migration (`app/src/store/migrations/migrateLayoutPropsToSeo.ts:11-42`), the legacy `types.ts` / `seoCompleteness.ts`, the structured-data editor, the post-schema auto-declaration, the Tailwind-styled components, or the Starquix name, logo and assets (licence permits the code, the brief forbids the branding).

**First PR slice (small, shippable).**

1. `src/main/seo.ts` — `readPageSeo(root, page)` and `writePageSeo(root, page, field, value, baseHash)` built on `readSource` / `writeSource` / `resolvePageFile`; covers the five v1 fields; refuses layout-owned literals.
2. Preload + IPC channels for those two functions, following `src/preload.ts:113-118`.
3. `src/components/SeoPanel.tsx` with five `Label | Input | Save` rows, matching `ContentPanel`'s row style, wired to the rail button in `App.tsx:873-882`.
4. One quality finding: `seo-description` in `quality.ts`, plus a unit test using the existing fixtures.
5. Tests for hash conflict, frontmatter round-trip, and layout-literal refusal. No config writes, no undo stack, no AI tools in this PR.

## Open questions (genuine decisions)

- ~~What does the starter look like?~~ Answered (checked 24 Nov): every starter ships `src/layouts/Base.astro` taking `title`. The first save of a description, share image or noindex adds the matching prop and `<head>` tag to `Base.astro` once, in the same write batch.
- Should `noindex` be a boolean frontmatter key (`noindex: true`) or always written as a `robots` meta tag? Boolean is cleaner but a strict content schema may reject it; the existing content save path is string-based (`content.ts:321-360`).
- Does the first PR include the Quality finding, or is that a second PR? It depends on whether `checkSite` can cheaply read source while the built site is being checked.
