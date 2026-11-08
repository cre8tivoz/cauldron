#!/usr/bin/env python3
"""WCAG 2 relative luminance ratios for Cauldron's proposed accents."""
COLORS = {
    'Moss': {'light': '#37643A', 'dark': '#9DD89E'},
    'Cobalt': {'light': '#3159A0', 'dark': '#A7C1FF'},
    'Coral': {'light': '#A13F33', 'dark': '#FFA99A'},
}
SURFACES = {'light': {'canvas': '#F3F3F4', 'panel': '#FFFFFF'},
            'dark': {'canvas': '#0B0B0C', 'panel': '#111214'}}
TEXT = {'light': '#FFFFFF', 'dark': '#111214'}

def luminance(hexcode):
    channels = [int(hexcode[i:i+2], 16) / 255 for i in (1, 3, 5)]
    linear = [v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4 for v in channels]
    return sum(x * y for x, y in zip(linear, (0.2126, 0.7152, 0.0722)))

def contrast(a, b):
    lo, hi = sorted((luminance(a), luminance(b)))
    return (hi + 0.05) / (lo + 0.05)

for name, themes in COLORS.items():
    for theme, accent in themes.items():
        canvas, panel = SURFACES[theme].values()
        values = contrast(accent, canvas), contrast(accent, panel), contrast(TEXT[theme], accent)
        assert min(values[:2]) >= 3 and values[2] >= 4.5
        print(f'{name:7} {theme:5} {accent} canvas={values[0]:.2f}:1 panel={values[1]:.2f}:1 button={values[2]:.2f}:1 focus canvas/panel={values[0]:.2f}/{values[1]:.2f}:1')
