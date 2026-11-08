# Mobbin UI deep dive — Cauldron Astro (in progress)

**Status (6 Nov 2026):** complete. The write-up is `../../../CAULDRON-UI-RESEARCH.md`. The notes below record how the analysis was unblocked.

The analysis ran on Gemini 3.8 Flash through Billy's Google AI Studio key, called directly by `gemini_analyse.py` and `verify_hires.py`. The in-session vision tool kept the provider it started with, so it couldn't be used. Billy set `auxiliary.vision` to `gemini` / `gemini-3.8-flash` himself; that setting applies from the next session.

Mobbin collection: "Cauldron Astro — UI research" (private), id `5d511baf-5e36-4493-8171-e50f80dfaa37`, 113 screens.

## Done
- 19 Mobbin search angles, 116 real product screens. Metadata, Mobbin links and preview paths are in `searches.json`.
- One labelled contact sheet per angle in `contact-sheets/`. Each tile shows its index and app name.

Angles: editor_workspace, framer_focus, agent_chat_preview, selection_toolbar, device_preview, compact_editor_canva_ios, compact_editor_weak, craft_linear, change_review, agent_progress, conflict_dialogs, agent_connect, command_palette, publish, site_styles, section_library, content_forms, project_home, quality_report.

## Blocked
Image analysis runs through OpenAI Codex (`auxiliary.vision`: `openai-codex` / `gpt-6-luna`; delegation: `gpt-6.1-terra`). The Codex quota returned HTTP 429, "retry after 3931s", at about 22:58 AEDT. Credentials are valid. Nothing was changed in config.

## Next
1. Analyse the sheets in three groups:
   - workspace: editor_workspace, framer_focus, agent_chat_preview, selection_toolbar, device_preview, compact_editor_canva_ios, craft_linear
   - agent and safety: change_review, agent_progress, conflict_dialogs, agent_connect, command_palette, publish
   - content and design: site_styles, section_library, content_forms, project_home, quality_report, compact_editor_weak
2. Download high-resolution images (`image_url`) for the top picks; re-analyse them for exact proportions and craft details.
3. Write `CAULDRON-UI-RESEARCH.md`: reference → pattern → Cauldron screen → avoid; a responsive layout spec (panel priorities at each window width); "expensive on a free budget" craft rules; and the Obsidian copy.
