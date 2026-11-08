#!/usr/bin/env python3
"""Static catalogue checks; not a substitute for rendered accessibility testing."""
import colorsys
import json
import re
from html.parser import HTMLParser
from pathlib import Path

HERE = Path(__file__).resolve().parent
text = (HERE / 'catalogue.html').read_text()
picks = json.loads((HERE.parent / 'starter-library.json').read_text())['picks']
css = re.search(r'<style>(.*?)</style>', text, re.S).group(1)

class Parser(HTMLParser):
    def __init__(self):
        super().__init__(); self.stack = []; self.ids = []; self.sections = {}; self.nested_cards = []
    def handle_starttag(self, tag, attrs):
        a = dict(attrs); ident = a.get('id'); classes = set(a.get('class', '').split())
        if ident: self.ids.append(ident)
        card = 'card' in classes
        if card and any(node[2] for node in self.stack): self.nested_cards.append(ident or tag)
        if tag == 'article' and ident in {p['id'] for p in picks}: self.sections[ident] = False
        if re.fullmatch(r'h[1-6]', tag):
            for _, itemid, _ in self.stack:
                if itemid in self.sections: self.sections[itemid] = True
        if tag not in {'meta','link','input','hr','br','img','source','area','embed','wbr','param','track','col','base'}:
            self.stack.append((tag, ident, card))
    def handle_endtag(self, tag):
        for i in range(len(self.stack)-1,-1,-1):
            if self.stack[i][0] == tag:
                self.stack = self.stack[:i]; break
p = Parser(); p.feed(text)
results = []
def check(name, passed, detail): results.append((name, passed, detail))
ids = [x['id'] for x in picks]
check('All 35 ids exactly once', len(ids)==35 and all(p.ids.count(i)==1 for i in ids), f'{sum(p.ids.count(i)==1 for i in ids)}/{len(ids)} exact matches')
check('Each piece has a heading', len(p.sections)==35 and all(p.sections.values()), f'{sum(p.sections.values())}/35; hidden semantic headings count for navigation')
banned = re.findall(r'\b(?:Inter|Roboto|Arial|system-ui)\b', css, re.I)
check('No banned fonts in CSS', not banned, str(banned))
check('No pure black', not re.search(r'#000(?:000)?\b|rgb\(\s*0\s*,\s*0\s*,\s*0\s*\)', css, re.I), 'CSS scan')
gradients = re.findall(r'(?:linear|radial|repeating-linear|repeating-radial)-gradient\(([^()]*)\)', css, re.I)
def hue(h):
    h=h.lstrip('#'); h=''.join(c*2 for c in h) if len(h)==3 else h
    return colorsys.rgb_to_hsv(*(int(h[i:i+2],16)/255 for i in (0,2,4)))[0]*360
bad=[]
for g in gradients:
    stops=re.findall(r'#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b',g)
    hues=[hue(x) for x in stops]
    if len(hues)>=2 and all(210<=v<=290 for v in hues): bad.append(g)
check('No blue–purple gradients', not bad, f'{len(gradients)} gradients scanned for hex stops; {len(bad)} flagged')
def luminance(h):
    rgb=[int(h[i:i+2],16)/255 for i in (1,3,5)]
    v=[x/12.92 if x<=.04045 else ((x+.055)/1.055)**2.4 for x in rgb]
    return .2126*v[0]+.7152*v[1]+.0722*v[2]
def contrast(a,b):
    a,b=sorted((luminance(a),luminance(b)),reverse=True)
    return (a+.05)/(b+.05)
# Explicit body text/background combinations used; gradient-backed text is on an opaque surface.
pairs=[('#1E1C19','#F7F5F0'),('#1E1C19','#ffffff'),('#F7F5F0','#1E1C19'),('#F7F5F0','#574238'),('#A13F33','#F7F5F0'),('#A13F33','#ffffff')]
ratios=[contrast(a,b) for a,b in pairs]
check('Declared body colour pairs >= 4.5:1', all(x>=4.5 for x in ratios), '; '.join(f'{a}/{b}: {r:.2f}:1' for (a,b),r in zip(pairs,ratios)))
check('No detectable nested card classes', not p.nested_cards, 'DOM class=card nesting only; visual card treatments need human/computed-style review')
check('Reduced motion rule present', 'prefers-reduced-motion:reduce' in css, 'Static presence check only')
report='# Catalogue static check\n\n'+'\n'.join(f'- {"PASS" if ok else "FAIL"}: **{name}** — {detail}' for name,ok,detail in results)+'\n\nScope: static source inspection, not a browser render, axe audit, complete computed-colour audit, or keyboard test. Contrast checks cover declared text/background pairs, not every computed pixel; decorative illustrations and maps are excluded. Gradient detection covers literal hex stops. Nested-card check detects only explicit `card` class nesting.\n'
(HERE/'check-report.md').write_text(report)
print(report)
raise SystemExit(0 if all(ok for _,ok,_ in results) else 1)
