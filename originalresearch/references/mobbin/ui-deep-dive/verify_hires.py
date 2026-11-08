"""Verify key claims against high-resolution Mobbin screenshots (Gemini 3.8 Flash, direct call)."""
import json, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from gemini_analyse import ask

HI = Path(__file__).parent / 'hires'
COMMON = ("Transcribe exactly; quote visible text verbatim. If text is not legible, say 'not legible' instead of guessing. "
          "Also give the image's apparent layout proportions as percentages of the width. Answer in short markdown bullets.")
CHECKS = {
 'lovable_chat': 'List every visible element of the chat panel: step/tool rows (exact text and icons), summary text, version card text, input-box controls and their labels, and the preview top-bar controls.',
 'framer_agent_tab': 'Is there a right-panel tab switcher between an Agent mode and a Style mode? Quote the tab labels, the chat input placeholder and any model selector text. Describe the left panel tabs.',
 'webflow_breakpoints': 'Quote the breakpoint bar contents: icons, any pixel readout, and any text explaining which widths an edit affects. Describe any drag handles on the preview edges.',
 'cofounder_change_summary': 'Quote the change summary card verbatim: headings (e.g. what shipped / verified) and bullet items, and any buttons.',
 'lindy_progress': 'Quote the task step list verbatim, including status icons (done / running) and any terminal or log toggles.',
 'magnific_connect': 'Quote the names of every agent/tool option shown (e.g. tabs or pills), the step instructions, any endpoint/URL and button labels. State explicitly whether the word "Hermes" appears.',
 'replit_conflict': 'Quote the dialog title, body text, any listed categories of what will be affected, and the button labels with their visual emphasis.',
 'lovable_quality': 'Quote the category scores and the issue rows, including any "fix" buttons, verbatim.',
}

def main():
    out = []
    for name, q in CHECKS.items():
        img = next(HI.glob(name + '.*'))
        try:
            text = ask(img, q + '\n\n' + COMMON)
        except Exception as e:
            sys.exit(f'Stopped at {name}: {type(e).__name__}: {str(e)[:200]}')
        out.append(f'## {name}\n\nFile: `hires/{img.name}`\n\n{text}\n')
        print('done', name, flush=True)
    (HI / 'verification.md').write_text('# High-resolution verification (Gemini 3.8 Flash)\n\n' + '\n'.join(out))

if __name__ == '__main__':
    main()
