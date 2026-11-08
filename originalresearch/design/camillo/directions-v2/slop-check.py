#!/usr/bin/env python3
"""Static checks for the Cauldron direction board; not a browser audit."""
import colorsys
import json
import re
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent
page = (ROOT / 'preview.html').read_text(encoding='utf-8')
directions = json.loads((ROOT / 'directions.json').read_text(encoding='utf-8'))['directions']
style = re.search(r'<style>(.*?)</style>', page, re.S).group(1)
banned = {'#2563eb', '#3b82f6', '#7c3aed', '#6366f1', '#4f46e5'}

def contrast(foreground, background):
    def lum(c):
        rgb = [int(c[i:i+2], 16) / 255 for i in (1, 3, 5)]
        v = [x / 12.92 if x <= .04045 else ((x + .055) / 1.055) ** 2.4 for x in rgb]
        return .2126*v[0] + .7152*v[1] + .0722*v[2]
    a, b = sorted((lum(foreground), lum(background)))
    return (b + .05) / (a + .05)

def blue_purple(hexcolour):
    rgb = [int(hexcolour[i:i+2], 16) / 255 for i in (1, 3, 5)]
    h, s, v = colorsys.rgb_to_hsv(*rgb)
    return 210 <= h*360 <= 290 and s > .15

def gradient_failures(css):
    errors = []
    # This board has no gradients; recognise flat, literal hex stops if added.
    for gradient in re.findall(r'(?:linear|radial|conic)-gradient\([^)]*\)', css, re.I):
        stops = re.findall(r'#[0-9a-fA-F]{6}\b', gradient)
        if len(stops) < 2:
            errors.append('unresolved gradient: ' + gradient)
        elif all(blue_purple(c) for c in stops):
            errors.append('blue-purple gradient: ' + gradient)
    return errors

class BoardParser(HTMLParser):
    def __init__(self):
        super().__init__(); self.stack=[]; self.current=None; self.ids=[]; self.nested=[]
    def handle_starttag(self, tag, attrs):
        attrs=dict(attrs); classes=set(attrs.get('class','').split())
        if tag == 'article' and 'data-direction' in attrs:
            self.current=attrs['data-direction']; self.ids.append(self.current)
        # Heuristic only: class names conventionally used for card treatments.
        card=any(re.search(r'(^|[-_])(card|panel|tile)([-_]|$)', c, re.I) for c in classes)
        if card and any(v for _, v in self.stack): self.nested.append(self.current or 'board')
        if tag not in {'meta','link','img','input','br','hr','source','wbr'}: self.stack.append((tag,card))
    def handle_startendtag(self,tag,attrs): pass
    def handle_endtag(self,tag):
        for i in range(len(self.stack)-1,-1,-1):
            if self.stack[i][0] == tag:
                self.stack=self.stack[:i]; break
        if tag == 'article': self.current=None

parser=BoardParser(); parser.feed(page)
font_issue = re.findall(r'(?:font-family\s*:[^;}]*|font\s*:[^;}]*|--(?:body|display)\s*:[^;"}]*)',page,re.I)
font_issue = [v for v in font_issue if re.search(r'\b(?:Inter|Roboto|Arial|system-ui)\b',v,re.I)]
black_issue = bool(re.search(r'#[0]{6}\b|#[0]{3}\b|rgb\(\s*0\s*[, ]\s*0\s*[, ]\s*0\s*\)', page, re.I))
accent_issue = sorted(c for c in banned if c in page.lower())
gradient_issue = gradient_failures(style)
lines=['# Automated slop check', '', 'Static token and source checks; not computed browser styles. WCAG contrast uses unrounded sRGB ratios.', '', '| Direction | body / bg | body / surface | muted / bg | muted / surface | large / bg | button | Result |', '|---|---:|---:|---:|---:|---:|---:|---|']
all_ok=True
for d in directions:
    t=d['tokens']; c=t['colours']; ratios=[contrast(c['text'],c['bg']),contrast(c['text'],c['surface']),contrast(c['muted_text'],c['bg']),contrast(c['muted_text'],c['surface']),contrast(c['text'],c['bg']),contrast(c['accent_on'],c['accent'])]
    issues=[]
    if min(ratios[:4]) < 4.5: issues.append('body contrast')
    if ratios[4] < 3: issues.append('large contrast')
    if ratios[5] < 4.5: issues.append('button contrast')
    if 'light_theme' in t:
        l=t['light_theme']
        if min(contrast(l['text'],l['bg']),contrast(l['text'],l['surface']),contrast(l['muted_text'],l['bg']),contrast(l['muted_text'],l['surface']),contrast(l['accent_on'],l['accent'])) < 4.5: issues.append('alternate light theme contrast')
    section=re.search(r'<article class="site '+re.escape(d['id'])+r'".*?</article>',page,re.S)
    if not section: issues.append('missing preview')
    else:
        for key,val in c.items():
            if val.lower() not in section.group(0).lower(): issues.append('token not present: '+key)
        for font in t['fonts']['display'],t['fonts']['body']:
            if font not in section.group(0): issues.append('font not present: '+font)
    if d['id'] in parser.nested: issues.append('nested named cards')
    if font_issue: issues.append('banned font in CSS')
    if black_issue: issues.append('pure black in HTML/CSS')
    if accent_issue: issues.append('banned accent in HTML/CSS')
    if gradient_issue: issues.append('gradient issue')
    all_ok &= not issues
    lines.append('| '+d['name']+' | '+' | '.join(f'{r:.2f}:1' for r in ratios)+' | '+('PASS' if not issues else 'FAIL: '+', '.join(issues))+' |')
lines += ['', '## Source checks', '', f'- Directions present: {len(parser.ids)}; unique: {len(set(parser.ids))}; expected: {len(directions)}.', f'- Banned chosen fonts in CSS/font declarations: {font_issue or "none"}.', f'- Pure black literal in HTML/CSS: {"FAIL" if black_issue else "none"}.', f'- Banned accent literal in HTML/CSS: {accent_issue or "none"}.', f'- Blue–purple or unresolved gradients in stylesheet: {gradient_issue or "none"}.', f'- Nested card/panel/tile class names: {parser.nested or "none"}. This heuristic does not compute actual borders, shadows or radius.', '', '## Scope and limitations', '', 'Ratios test token pairs used by the preview: primary and muted text on both page and surface, large text on page, and action text on accent. Alternate light theme is checked if supplied. They do not prove every rendered text node or background: no browser, inherited styles, compositing, focus indicator, font loading, overflow, mobile layout or manual AI-look review is assessed. The source scan does not recognise every colour syntax, computed CSS, dynamically injected style, or every form of nesting. A passing report is not a pass of taste tests 4.1 and 4.2.', '']
if len(parser.ids)!=len(directions) or len(set(parser.ids))!=len(directions): all_ok=False
(ROOT/'slop-report.md').write_text('\n'.join(lines),encoding='utf-8')
print('\n'.join(lines[:len(directions)+6]))
print('\nOverall:', 'PASS' if all_ok else 'FAIL')
raise SystemExit(0 if all_ok else 1)
