import { ipcRenderer } from 'electron';

// The only things a previewed page can tell Cauldron: how tall it is, and what was clicked.
// Nothing here gives the page any power over the app or the files.

let picking = true;

// Astro 6 moves its annotations into the toolbar's private WeakMap after load.
// Preserve the compiler's original annotations under our own DOM names first;
// never restore Astro's names or interfere with its toolbar.
const annotations = ['data-astro-source-file', 'data-astro-source-loc'];
const preserve = (element: Element) => {
  for (const attribute of annotations) {
    const value = element.getAttribute(attribute);
    if (value)
      element.setAttribute(attribute.replace('astro', 'cauldron'), value);
  }
};
new MutationObserver((records) => {
  for (const record of records) {
    if (record.type === 'attributes') {
      const element = record.target as Element;
      const attribute = record.attributeName!;
      const value = element.getAttribute(attribute) ?? record.oldValue;
      if (value)
        element.setAttribute(attribute.replace('astro', 'cauldron'), value);
    } else {
      for (const node of record.addedNodes) {
        if (!(node instanceof Element)) continue;
        preserve(node);
        node.querySelectorAll('[data-astro-source-file]').forEach(preserve);
      }
    }
  }
}).observe(document, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: annotations,
  attributeOldValue: true,
});

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

      const element = target.closest(
        '[data-cauldron-source-file], [data-astro-source-file]',
      );
      if (!element) {
        ipcRenderer.send('preview:report', { kind: 'pick', payload: null });
        return;
      }
      const loc =
        element.getAttribute('data-cauldron-source-loc') ??
        element.getAttribute('data-astro-source-loc') ??
        '';
      const [line, column] = loc.split(':').map((value) => Number(value));
      ipcRenderer.send('preview:report', {
        kind: 'pick',
        payload: {
          file:
            element.getAttribute('data-cauldron-source-file') ??
            element.getAttribute('data-astro-source-file'),
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
