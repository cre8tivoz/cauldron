import { ipcRenderer } from 'electron';

// The only things a previewed page can tell Cauldron: how tall it is, and what was clicked.
// Nothing here gives the page any power over the app or the files.

let picking = true;

ipcRenderer.on('preview:mode', (_event, on: boolean) => {
  picking = Boolean(on);
});

function cssPath(element: Element): string {
  const parts: string[] = [];
  let node: Element | null = element;
  while (node && node.nodeType === 1 && parts.length < 8) {
    const parent: Element | null = node.parentElement;
    if (!parent) {
      parts.unshift(node.tagName.toLowerCase());
      break;
    }
    const index = Array.from(parent.children).indexOf(node) + 1;
    parts.unshift(`${node.tagName.toLowerCase()}:nth-child(${index})`);
    node = parent;
  }
  return parts.join(' > ');
}

function reportHeight(): void {
  const height = Math.max(
    document.body?.scrollHeight ?? 0,
    document.documentElement?.scrollHeight ?? 0,
  );
  ipcRenderer.send('preview:report', { kind: 'height', payload: height });
}

window.addEventListener('DOMContentLoaded', () => {
  reportHeight();
  new ResizeObserver(reportHeight).observe(document.documentElement);

  document.addEventListener(
    'click',
    (event) => {
      if (!picking) return;
      const target = event.target as Element | null;
      if (!target || target.nodeType !== 1) return;
      event.preventDefault();
      event.stopPropagation();

      const element = target.closest('[data-astro-source-file]');
      if (!element) {
        ipcRenderer.send('preview:report', { kind: 'pick', payload: null });
        return;
      }
      const loc = element.getAttribute('data-astro-source-loc') ?? '';
      const [line, column] = loc.split(':').map((value) => Number(value));
      ipcRenderer.send('preview:report', {
        kind: 'pick',
        payload: {
          file: element.getAttribute('data-astro-source-file'),
          line,
          column,
          name: element.tagName.toLowerCase(),
          path: cssPath(element),
          url: window.location.href,
        },
      });
    },
    true,
  );
});
