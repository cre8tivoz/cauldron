"""Analyse Mobbin contact sheets with Gemini 3.8 Flash (Billy's Google AI Studio key).
Used because the in-session vision tool keeps the provider it started with. One request per sheet;
answers saved per angle; stops on first error; the key is never printed."""
import base64, json, re, sys, urllib.request
from pathlib import Path

ROOT = Path(__file__).parent
MODEL = 'gemini-3.8-flash'
ENV = Path('/Users/habibi/.hermes/profiles/claudia/.env').read_text()
KEY = re.search(r'(?m)^(?:export\s+)?GOOGLE_API_KEY\s*=\s*(.*?)\s*$', ENV).group(1).strip('"\'')

PRODUCT = ("Context: Cauldron Astro is a free, open-source Electron desktop app for designing and building real Astro websites. "
           "Visual editing (live preview of the real site, element selection, style/content inspector) and an AI agent chat panel have EQUAL prominence "
           "and share the current selection. The user is a creative director, not a developer. The app must be fully responsive to window-size changes "
           "(big monitor down to a narrow window) and must look and behave like an expensive, high-end professional application while being free, so polish "
           "has to come from craft and a design system rather than paid assets. The current base editor leaves only 398px of preview at a 1024px window and has no room for chat.")

RULES = ("Rules: the image is a contact sheet of low-resolution Mobbin screenshots; each tile is labelled top-left with an index number and app name; "
         "tiles may be cropped at the bottom. Describe only what you can actually see and say plainly when something is unreadable or a tile is off-topic. "
         "Label any colour values as approximate. Do not invent features. Be concrete: components, positions, proportions, states, wording.\n"
         "Answer in markdown with: 1) a short section per tile; 2) 'Best 2-3' as index + app with why; 3) 'Borrow for Cauldron' as concrete patterns, each mapped "
         "to the Cauldron screen or feature it serves; 4) 'Avoid'.")

FOCUS = {
 'editor_workspace': 'Focus: panel layout (left/centre/right/top), approximate panel width shares, preview framing, top bar, inspector density, premium vs cheap signals. Which layout keeps the preview large while giving an AI chat equal space?',
 'framer_focus': 'Focus: how Framer arranges, groups and hides panels; breakpoints on canvas; top toolbar; collapsed/focused states; craft details (greys, hairlines, radii, type sizes, icon style, selection colour, spacing). What makes it feel expensive?',
 'agent_chat_preview': 'Focus: chat side and width share; message styling; how AI actions, tool steps and file changes appear inside the chat; the input box (attachments, model picker, modes, element-select button); preview controls; status/progress indicators. Best patterns for equal visual/agent prominence.',
 'selection_toolbar': 'Focus: how a selected element is shown on the canvas (outline, handles, label), floating contextual toolbars and what actions they offer, and any "ask AI about this element" entry point.',
 'device_preview': 'Focus: how desktop/tablet/phone breakpoints are switched and displayed (toggles, width readouts, side-by-side frames, custom widths), and how clearly the current breakpoint is communicated.',
 'compact_editor_canva_ios': 'Focus: this is the small-screen evidence. How does a complex editor fit a narrow screen: bottom toolbars, sheets, tabs, what is hidden, how the canvas is prioritised, how properties are reached. Translate into rules for a desktop app window that becomes narrow.',
 'compact_editor_weak': 'Focus: these iOS results may be off-topic; say which (if any) show useful small-screen editing or chat patterns.',
 'craft_linear': 'Focus: Linear as the benchmark for premium craft: greys and layering, hairline borders, type scale and weights, density, icon style, sidebar treatment, empty space, status chips, keyboard hints. List specific, reproducible details.',
 'change_review': 'Focus: how changes are summarised (file list, diff, checkpoints, version history), how accept/reject/undo/restore is offered, and how understandable it is to a non-developer. Best pattern for showing "what the agent changed on my website" with one-click undo of a whole agent run.',
 'agent_progress': 'Focus: how an AI agent shows a running task: steps, tool activity, running/failed/done states, time, cancel, and how technical it is. Best pattern for a non-developer.',
 'conflict_dialogs': 'Focus: wording and button hierarchy of unsaved-changes and conflict warnings; which make a risky choice feel safe and clear. Map to a "keep my version / use the version on disk" dialog.',
 'agent_connect': 'Focus: how setup for connecting an external tool/agent/API is presented (steps, code snippets, copy buttons, status, tokens). Best pattern for a non-developer connecting Claude Code, Codex or Hermes to a local app.',
 'command_palette': 'Focus: command palette structure: grouping, shortcuts shown, recent items, AI entry, visual craft. Best model for a builder app palette.',
 'publish': 'Focus: publish/deploy dialogs: what is shown before going live (changes, destination, status), button hierarchy, success/failure states. Best pattern for publishing through the user\'s own Git with changed files listed.',
 'site_styles': 'Focus: how site-wide fonts, colours and spacing are chosen and previewed (presets, swatches, live preview, pairing). Best model for a design-direction panel.',
 'section_library': 'Focus: how prebuilt sections are browsed and added (categories, thumbnails, previews, add/replace actions, placement). Best model for a licence-safe section library.',
 'content_forms': 'Focus: how blog/CMS items are edited (field types, grouping, rich text, images, SEO, status/draft), and how a schema-driven form could look. Best model for editing Astro content collections.',
 'project_home': 'Focus: home/recent-projects screens (thumbnails, create/open actions, sorting, empty states, craft). Best model for opening or creating an Astro project.',
 'quality_report': 'Focus: how audits/reports show scores and issues (grouping, severity, fixes, links to the problem), and which avoid vanity scores. Best model for measured accessibility/speed/layout checks on a built site.',
}

def ask(image: Path, question: str) -> str:
    img = base64.b64encode(image.read_bytes()).decode()
    body = {'contents': [{'parts': [{'text': question}, {'inline_data': {'mime_type': 'image/jpeg', 'data': img}}]}]}
    req = urllib.request.Request(f'https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent?key={KEY}',
                                 data=json.dumps(body).encode(), headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=180) as r:
        d = json.load(r)
    return ''.join(p.get('text', '') for p in d['candidates'][0]['content']['parts'])

def main(angles):
    out = ROOT / 'analysis'; out.mkdir(exist_ok=True)
    data = {d['angle']: d for d in json.loads((ROOT / 'searches.json').read_text())}
    for a in angles:
        target = out / f'{a}.md'
        if target.exists():
            print('skip (exists)', a); continue
        tiles = ', '.join(f"{i} {s['app']}" for i, s in enumerate(data[a]['screens']))
        q = f"{PRODUCT}\n\nSheet: {a} (search: \"{data[a]['query']}\"). Tiles: {tiles}.\n{FOCUS[a]}\n\n{RULES}"
        try:
            text = ask(ROOT / 'contact-sheets' / f'{a}.jpg', q)
        except Exception as e:
            sys.exit(f'Stopped at {a}: {type(e).__name__}: {str(e)[:200]}')
        links = '\n'.join(f"- {i} {s['app']}: {s['mobbin_url']}" for i, s in enumerate(data[a]['screens']))
        target.write_text(f"# {a}\n\nModel: {MODEL} (direct Google AI Studio call). Search: \"{data[a]['query']}\"\n\n## Mobbin links\n{links}\n\n## Analysis\n{text}\n")
        print('done', a, len(text), flush=True)

if __name__ == '__main__':
    main(sys.argv[1:] or list(FOCUS))
