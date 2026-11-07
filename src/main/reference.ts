import { BrowserWindow } from 'electron';
import { hashOf } from './files';
import type { DesignDirection } from './directions';

/** Plan 4.2: measure a reference URL. No source code, images or font files are copied. */
export async function directionFromUrl(
  input: string,
): Promise<DesignDirection> {
  const url = new URL(input);
  if (!['http:', 'https:'].includes(url.protocol))
    throw new Error('Use an http or https reference URL.');
  const window = new BrowserWindow({
    show: false,
    width: 1280,
    height: 900,
    webPreferences: {
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      window.loadURL(url.href),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () =>
            reject(new Error('The reference did not load within 30 seconds.')),
          30000,
        );
      }),
    ]);
    const measured = (await window.webContents.executeJavaScript(`(async () => {
      await document.fonts.ready;
      const visible = [...document.querySelectorAll('body *')].filter(el => el.getBoundingClientRect().width > 0 && getComputedStyle(el).visibility !== 'hidden');
      const css = el => getComputedStyle(el || document.body);
      const colour = value => {
        const parts = value.match(/[\\d.]+/g)?.map(Number);
        if (!parts || (parts.length > 3 && parts[3] === 0)) return null;
        return '#' + parts.slice(0,3).map(n => Math.round(n).toString(16).padStart(2, '0')).join('');
      };
      const body = css(document.body), heading = css(document.querySelector('h1,h2'));
      const button = css(document.querySelector('button,a[href]'));
      const palette = [...new Set(visible.flatMap(el => [colour(css(el).color),colour(css(el).backgroundColor)]).filter(Boolean))];
      const values = properties => [...new Set(visible.flatMap(el => properties.map(p => parseFloat(css(el)[p]))).filter(n => Number.isFinite(n) && n >= 0))].sort((a,b)=>a-b).slice(0,24);
      return { title: document.title, bg: colour(body.backgroundColor) || colour(css(document.documentElement).backgroundColor) || '#ffffff',
        ink: colour(body.color), primary: colour(button.backgroundColor) || colour(button.color), palette,
        display: heading.fontFamily.split(',')[0].replace(/["']/g,''), body: body.fontFamily.split(',')[0].replace(/["']/g,''),
        sizes: values(['fontSize']), spacing: values(['paddingTop','paddingBottom','paddingLeft','paddingRight','marginTop','marginBottom','gap']), radii: values(['borderTopLeftRadius']) };
    })()`)) as {
      title: string;
      bg: string;
      ink: string;
      primary: string;
      palette: string[];
      display: string;
      body: string;
      sizes: number[];
      spacing: number[];
      radii: number[];
    };
    const font = (family: string) => ({
      family: family.replace(/[^\w\s-]/g, ''),
      package: 'Reference font — supply your own licensed font files',
      weights: [400, 700],
    });
    return {
      id: `reference-${hashOf(url.href).slice(0, 12)}`,
      name: measured.title || url.hostname,
      forWhom: 'This site',
      learnedFrom: url.href,
      colours: {
        bg: measured.bg,
        surface: measured.bg,
        ink: measured.ink,
        primary: measured.primary,
        muted: measured.ink,
        line: measured.ink,
        accent: measured.primary,
        ...Object.fromEntries(
          measured.palette
            .slice(0, 12)
            .map((value, i) => [`reference-${i + 1}`, value]),
        ),
      },
      fonts: { display: font(measured.display), body: font(measured.body) },
      typeScale: measured.sizes,
      spacing: measured.spacing,
      radii: measured.radii,
      motion: { quick: '0ms', settle: '0ms', easing: 'linear' },
      character: `Measured colours, type, spacing and corners from ${url.href} at 1280px. This is a reference, not a copy of its layout or assets.`,
      watch:
        'Font names were measured, not licensed or downloaded. Supply licensed files or choose a starter direction before relying on those fonts.',
    };
  } finally {
    if (timer) clearTimeout(timer);
    if (!window.isDestroyed()) window.destroy();
  }
}
