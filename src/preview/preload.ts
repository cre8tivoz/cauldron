import { ipcRenderer } from 'electron';
import { computeDropMarkerY, computeDropTarget } from '../canvas-drag';

// The previewed page never gets editor or filesystem powers (AGENTS.md Rule 8).
// This isolated preload only observes clicks, hover, inline-text intent, and
// section-reorder intent, reporting them to the main process which validates
// and executes every change through Cauldron's hash-checked write pipeline.

let picking = true;
let isCompareFrame = false;
let hoveredEl: Element | null = null;
let selectedEl: Element | null = null;
let editingEl: HTMLElement | null = null;
let editingOriginalText = '';
let editingUserTouched = false;
let selectionMeta: {
  path: string;
  textEditable: boolean;
  textEditReason?: string;
} | null = null;
let pageSections: {
  file: string;
  sections: Array<{
    index: number;
    tag: string;
    name: string;
    line: number;
    column: number;
  }>;
} | null = null;

// Astro (6 and later) moves its annotations into the toolbar's private WeakMap after load.
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

const SINGLE_LINE_TAGS = new Set([
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'a',
  'button',
  'span',
  'strong',
  'em',
  'small',
  'label',
  'dt',
  'li',
]);

const NON_TEXT_TAGS = new Set([
  'img',
  'svg',
  'video',
  'audio',
  'canvas',
  'iframe',
  'input',
  'textarea',
  'select',
  'hr',
  'br',
  'picture',
]);

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

function sourceOf(
  element: Element,
): { file: string; line: number; column: number; name: string } | null {
  const file =
    element.getAttribute('data-cauldron-source-file') ??
    element.getAttribute('data-astro-source-file');
  const loc =
    element.getAttribute('data-cauldron-source-loc') ??
    element.getAttribute('data-astro-source-loc') ??
    '';
  const [line, column] = loc.split(':').map((value) => Number(value));
  if (!file || !line || !column) return null;
  return { file, line, column, name: element.tagName.toLowerCase() };
}

function isCanvasUiNode(node: EventTarget | null): boolean {
  return (
    node instanceof Element && Boolean(node.closest('[data-cauldron-ui="1"]'))
  );
}

function ensureOverlayStyle(): void {
  if (document.querySelector('style[data-cauldron-ui="1"]')) return;
  const style = document.createElement('style');
  style.setAttribute('data-cauldron-ui', '1');
  style.textContent = `
    [data-cauldron-hover="1"] {
      outline: 1.5px dashed rgba(200, 75, 49, 0.78) !important;
      outline-offset: 2px !important;
    }
    [data-cauldron-selected="1"] {
      outline: 2px solid #c84b31 !important;
      outline-offset: 2px !important;
    }
    [data-cauldron-editing="1"] {
      outline: 2px solid #e05e46 !important;
      outline-offset: 3px !important;
      border-radius: 3px;
      cursor: text !important;
    }
    html[data-cauldron-dragging="1"],
    html[data-cauldron-dragging="1"] * {
      cursor: grabbing !important;
      -webkit-user-select: none !important;
      user-select: none !important;
    }
  `;
  (document.head ?? document.documentElement).appendChild(style);
}

let pillEl: HTMLDivElement | null = null;
let dropLineEl: HTMLDivElement | null = null;
let activeDrag: {
  pointerId: number;
  fromIndex: number;
  elements: Element[];
  rects: Array<{ top: number; height: number; left: number; width: number }>;
  target: { insertSlot: number; toIndex: number } | null;
} | null = null;

function removeDropLine(): void {
  if (dropLineEl) {
    dropLineEl.remove();
    dropLineEl = null;
  }
}

function showDropLine(y: number, left: number, width: number): void {
  if (!dropLineEl) {
    dropLineEl = document.createElement('div');
    dropLineEl.setAttribute('data-cauldron-ui', '1');
    dropLineEl.style.cssText = [
      'position: fixed',
      'height: 3px',
      'background: #e05e46',
      'border-radius: 999px',
      'box-shadow: 0 0 0 2px rgba(224, 94, 70, 0.25)',
      'pointer-events: none',
      'z-index: 2147483646',
    ].join(';');
    document.body.appendChild(dropLineEl);
  }
  dropLineEl.style.top = `${Math.max(2, y - 1)}px`;
  dropLineEl.style.left = `${Math.max(8, left)}px`;
  dropLineEl.style.width = `${Math.max(40, width)}px`;
}

function resolveSectionElements(): Array<{ index: number; element: Element }> {
  if (!pageSections || pageSections.sections.length === 0) return [];
  const candidates = Array.from(
    document.querySelectorAll(
      '[data-cauldron-source-file], [data-astro-source-file]',
    ),
  );
  const mainEl = document.querySelector('main');
  const fallbackChildren = mainEl
    ? Array.from(mainEl.children).filter(
        (child) => !child.hasAttribute('data-cauldron-ui'),
      )
    : Array.from(document.querySelectorAll('body > section, body > article'));

  const resolved: Array<{ index: number; element: Element }> = [];
  const used = new Set<Element>();
  for (const sec of pageSections.sections) {
    const isComponent = /^[A-Z]/.test(sec.tag);
    const wantedTag = sec.tag.toLowerCase();
    const exact =
      candidates.find((el) => {
        if (used.has(el)) return false;
        const src = sourceOf(el);
        if (!src || src.file !== pageSections!.file || src.line !== sec.line) {
          return false;
        }
        if (!isComponent && el.tagName.toLowerCase() !== wantedTag) {
          return false;
        }
        return src.column === sec.column;
      }) ??
      candidates.find((el) => {
        if (used.has(el) || isComponent) return false;
        const src = sourceOf(el);
        return (
          src !== null &&
          src.file === pageSections!.file &&
          src.line === sec.line &&
          el.tagName.toLowerCase() === wantedTag
        );
      });
    const fallback = fallbackChildren[sec.index] ?? null;
    const element =
      exact ??
      (fallback &&
      !used.has(fallback) &&
      fallback.tagName.toLowerCase() !== 'main'
        ? fallback
        : null);
    if (element && !used.has(element)) {
      used.add(element);
      resolved.push({ index: sec.index, element });
    }
  }
  return resolved;
}

function sectionIndexForElement(element: Element | null): number | null {
  if (!element) return null;
  const resolved = resolveSectionElements();
  for (const entry of resolved) {
    if (entry.element === element || entry.element.contains(element)) {
      return entry.index;
    }
  }
  return null;
}

function removePill(): void {
  if (pillEl) {
    pillEl.remove();
    pillEl = null;
  }
}

function makePillButton(
  label: string,
  title: string,
  onClick: (event: MouseEvent) => void,
): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = label;
  btn.title = title;
  btn.setAttribute('data-cauldron-ui', '1');
  btn.style.cssText = [
    'appearance: none',
    'border: 0',
    'background: rgba(255,255,255,0.12)',
    'color: #ffffff',
    'font: 600 11px/1 -apple-system, BlinkMacSystemFont, sans-serif',
    'padding: 4px 7px',
    'border-radius: 4px',
    'cursor: pointer',
    'white-space: nowrap',
  ].join(';');
  btn.addEventListener('click', (event) => {
    if (!event.isTrusted) return;
    event.preventDefault();
    event.stopPropagation();
    onClick(event);
  });
  return btn;
}

function pickElement(element: Element | null): void {
  if (selectedEl && selectedEl !== element) {
    selectedEl.removeAttribute('data-cauldron-selected');
  }
  selectedEl = element;
  if (!element) {
    removePill();
    ipcRenderer.send('preview:report', { kind: 'pick', payload: null });
    return;
  }
  element.setAttribute('data-cauldron-selected', '1');
  const src = sourceOf(element);
  if (!src) {
    removePill();
    ipcRenderer.send('preview:report', { kind: 'pick', payload: null });
    return;
  }
  ipcRenderer.send('preview:report', {
    kind: 'pick',
    payload: {
      ...src,
      path: cssPath(element),
      url: window.location.href,
    },
  });
  renderSelectionPill();
}

function canInlineEditElement(element: Element): element is HTMLElement {
  if (isCompareFrame || !(element instanceof HTMLElement)) return false;
  if (NON_TEXT_TAGS.has(element.tagName.toLowerCase())) return false;
  const path = cssPath(element);
  if (selectionMeta && selectionMeta.path === path) {
    return selectionMeta.textEditable;
  }
  return element.children.length === 0;
}

function finishInlineEdit(commit: boolean): void {
  const el = editingEl;
  if (!el) return;
  const userTouched = editingUserTouched;
  editingEl = null;
  editingUserTouched = false;
  const src = sourceOf(el);
  const nextText = (el.textContent ?? '').trim();
  el.removeAttribute('contenteditable');
  el.removeAttribute('data-cauldron-editing');
  if (!commit || !userTouched) {
    el.textContent = editingOriginalText;
    renderSelectionPill();
    return;
  }
  if (src && nextText !== editingOriginalText.trim()) {
    ipcRenderer.send('preview:report', {
      kind: 'inline-text',
      payload: {
        ...src,
        value: nextText,
        url: window.location.href,
      },
    });
  }
  renderSelectionPill();
}

function beginInlineEdit(element: HTMLElement): void {
  if (isCompareFrame || !picking) return;
  if (editingEl && editingEl !== element) {
    finishInlineEdit(true);
  }
  if (!canInlineEditElement(element)) return;
  editingEl = element;
  editingOriginalText = element.textContent ?? '';
  editingUserTouched = false;
  try {
    element.setAttribute('contenteditable', 'plaintext-only');
  } catch {
    element.setAttribute('contenteditable', 'true');
  }
  element.setAttribute('data-cauldron-editing', '1');
  element.focus();
  const selection = window.getSelection();
  if (selection) {
    const range = document.createRange();
    range.selectNodeContents(element);
    selection.removeAllRanges();
    selection.addRange(range);
  }
  renderSelectionPill();
}

function cancelCanvasDrag(): void {
  activeDrag = null;
  document.documentElement.removeAttribute('data-cauldron-dragging');
  removeDropLine();
}

function startCanvasSectionDrag(
  event: PointerEvent,
  handle: HTMLElement,
  fromIndex: number,
): void {
  if (!event.isTrusted || event.button !== 0 || isCompareFrame || activeDrag) {
    return;
  }
  const resolved = resolveSectionElements();
  if (resolved.length < 2) return;
  const elements = resolved.map((entry) => entry.element);
  const rects = elements.map((el) => {
    const rect = el.getBoundingClientRect();
    return {
      top: rect.top,
      height: rect.height,
      left: rect.left,
      width: rect.width,
    };
  });
  event.preventDefault();
  event.stopPropagation();
  try {
    handle.setPointerCapture(event.pointerId);
  } catch {
    // Capture may not be available in synthetic events.
  }
  document.documentElement.setAttribute('data-cauldron-dragging', '1');
  activeDrag = {
    pointerId: event.pointerId,
    fromIndex,
    elements,
    rects,
    target: null,
  };
}

function renderSelectionPill(): void {
  removePill();
  if (isCompareFrame || !picking || !selectedEl || !selectedEl.isConnected) {
    return;
  }
  const rect = selectedEl.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return;

  const pill = document.createElement('div');
  pill.setAttribute('data-cauldron-ui', '1');
  const top =
    rect.top > 34
      ? rect.top - 30
      : Math.min(window.innerHeight - 34, rect.top + 6);
  const left = Math.max(6, Math.min(window.innerWidth - 260, rect.left));
  pill.style.cssText = [
    'position: fixed',
    `top: ${Math.round(top)}px`,
    `left: ${Math.round(left)}px`,
    'display: inline-flex',
    'align-items: center',
    'gap: 4px',
    'padding: 3px 6px',
    'border-radius: 6px',
    'background: #1c1d21',
    'border: 1px solid #c84b31',
    'color: #ffffff',
    'box-shadow: 0 4px 14px rgba(0,0,0,0.35)',
    'font: 600 11px/1 -apple-system, BlinkMacSystemFont, sans-serif',
    'z-index: 2147483647',
  ].join(';');

  const tagBadge = document.createElement('span');
  tagBadge.setAttribute('data-cauldron-ui', '1');
  tagBadge.textContent = `<${selectedEl.tagName.toLowerCase()}>`;
  tagBadge.style.cssText = 'color: #ffa99a; padding: 0 3px;';
  pill.appendChild(tagBadge);

  if (editingEl === selectedEl) {
    const hint = document.createElement('span');
    hint.setAttribute('data-cauldron-ui', '1');
    hint.textContent = SINGLE_LINE_TAGS.has(selectedEl.tagName.toLowerCase())
      ? 'Enter to save · Esc to cancel'
      : '⌘Enter to save · Esc to cancel';
    hint.style.cssText = 'color: #d4d6dc; font-weight: 500; padding: 0 4px;';
    pill.appendChild(hint);
    document.body.appendChild(pill);
    pillEl = pill;
    return;
  }

  const parentSource = selectedEl.parentElement?.closest(
    '[data-cauldron-source-file], [data-astro-source-file]',
  );
  if (parentSource && parentSource !== selectedEl) {
    pill.appendChild(
      makePillButton('↑ Parent', 'Select parent element', () => {
        pickElement(parentSource);
      }),
    );
  }

  if (canInlineEditElement(selectedEl)) {
    const targetEl = selectedEl;
    pill.appendChild(
      makePillButton('Edit text', 'Edit text inline (or double-click)', () => {
        beginInlineEdit(targetEl);
      }),
    );
  }

  const sectionIndex = sectionIndexForElement(selectedEl);
  const totalSections = pageSections?.sections.length ?? 0;
  if (sectionIndex !== null && totalSections > 1) {
    const dragBtn = document.createElement('button');
    dragBtn.type = 'button';
    dragBtn.textContent = '⠿ Move section';
    dragBtn.title = 'Drag up or down to reorder this section';
    dragBtn.setAttribute('data-cauldron-ui', '1');
    dragBtn.style.cssText = [
      'appearance: none',
      'border: 0',
      'background: rgba(200,75,49,0.28)',
      'color: #ffffff',
      'font: 600 11px/1 -apple-system, BlinkMacSystemFont, sans-serif',
      'padding: 4px 7px',
      'border-radius: 4px',
      'cursor: grab',
      'touch-action: none',
      '-webkit-user-select: none',
      'user-select: none',
      'white-space: nowrap',
    ].join(';');
    dragBtn.addEventListener('pointerdown', (event) => {
      startCanvasSectionDrag(event, dragBtn, sectionIndex);
    });
    pill.appendChild(dragBtn);
  }

  document.body.appendChild(pill);
  pillEl = pill;
}

ipcRenderer.on('preview:compare-frame', (_event, flag: boolean) => {
  isCompareFrame = Boolean(flag);
  if (isCompareFrame) removePill();
});

ipcRenderer.on('preview:mode', (_event, on: boolean) => {
  picking = Boolean(on);
  if (!picking) {
    if (editingEl) finishInlineEdit(false);
    if (hoveredEl) {
      hoveredEl.removeAttribute('data-cauldron-hover');
      hoveredEl = null;
    }
    if (selectedEl) {
      selectedEl.removeAttribute('data-cauldron-selected');
    }
    cancelCanvasDrag();
    removePill();
  } else {
    renderSelectionPill();
  }
});

ipcRenderer.on(
  'preview:selection-meta',
  (
    _event,
    meta: {
      path: string;
      textEditable: boolean;
      textEditReason?: string;
    } | null,
  ) => {
    selectionMeta = meta;
    renderSelectionPill();
  },
);

ipcRenderer.on(
  'preview:sections',
  (
    _event,
    data: {
      file: string;
      sections: Array<{
        index: number;
        tag: string;
        name: string;
        line: number;
        column: number;
      }>;
    } | null,
  ) => {
    pageSections = data;
    renderSelectionPill();
  },
);

function reportHeight(): void {
  if (isCompareFrame) return;
  const height = Math.max(
    document.body?.scrollHeight ?? 0,
    document.documentElement?.scrollHeight ?? 0,
  );
  ipcRenderer.send('preview:report', { kind: 'height', payload: height });
}

window.addEventListener('DOMContentLoaded', () => {
  ensureOverlayStyle();
  reportHeight();
  new ResizeObserver(reportHeight).observe(document.documentElement);

  window.addEventListener('scroll', () => renderSelectionPill(), {
    passive: true,
  });
  window.addEventListener('resize', () => renderSelectionPill(), {
    passive: true,
  });

  document.addEventListener(
    'pointermove',
    (event) => {
      if (activeDrag && event.pointerId === activeDrag.pointerId) {
        if (!event.isTrusted) return;
        event.preventDefault();
        const target = computeDropTarget(
          event.clientY,
          activeDrag.rects,
          activeDrag.fromIndex,
        );
        activeDrag.target = target;
        if (!target) {
          removeDropLine();
          return;
        }
        const y = computeDropMarkerY(target.insertSlot, activeDrag.rects);
        const refRect =
          activeDrag.rects[
            Math.min(target.insertSlot, activeDrag.rects.length - 1)
          ];
        showDropLine(y, refRect.left, refRect.width);
        return;
      }

      if (
        !event.isTrusted ||
        !picking ||
        editingEl ||
        isCanvasUiNode(event.target)
      )
        return;
      const target = event.target as Element | null;
      const candidate =
        target?.closest(
          '[data-cauldron-source-file], [data-astro-source-file]',
        ) ?? null;
      if (candidate === hoveredEl) return;
      if (hoveredEl) hoveredEl.removeAttribute('data-cauldron-hover');
      hoveredEl = candidate;
      if (hoveredEl && hoveredEl !== selectedEl) {
        hoveredEl.setAttribute('data-cauldron-hover', '1');
      }
    },
    true,
  );

  document.addEventListener(
    'pointerup',
    (event) => {
      if (!event.isTrusted) return;
      if (!activeDrag || event.pointerId !== activeDrag.pointerId) return;
      const { fromIndex, target } = activeDrag;
      cancelCanvasDrag();
      if (target && target.toIndex !== fromIndex) {
        ipcRenderer.send('preview:report', {
          kind: 'reorder-sections',
          payload: {
            fromIndex,
            toIndex: target.toIndex,
            url: window.location.href,
          },
        });
      }
    },
    true,
  );

  document.addEventListener(
    'pointercancel',
    (event) => {
      if (!event.isTrusted) return;
      if (activeDrag && event.pointerId === activeDrag.pointerId) {
        cancelCanvasDrag();
      }
    },
    true,
  );

  document.addEventListener(
    'input',
    (event) => {
      if (!event.isTrusted || !editingEl) return;
      const target = event.target as Node | null;
      if (target && (target === editingEl || editingEl.contains(target))) {
        editingUserTouched = true;
      }
    },
    true,
  );

  document.addEventListener(
    'click',
    (event) => {
      if (!event.isTrusted || !picking) return;
      if (isCanvasUiNode(event.target)) return;
      const target = event.target as Element | null;
      if (!target || target.nodeType !== 1) return;
      if (editingEl && (editingEl === target || editingEl.contains(target))) {
        return;
      }
      if (editingEl) finishInlineEdit(true);
      event.preventDefault();
      event.stopPropagation();

      const element = target.closest(
        '[data-cauldron-source-file], [data-astro-source-file]',
      );
      pickElement(element);
    },
    true,
  );

  document.addEventListener(
    'dblclick',
    (event) => {
      if (
        !event.isTrusted ||
        !picking ||
        isCompareFrame ||
        isCanvasUiNode(event.target)
      ) {
        return;
      }
      const target = event.target as Element | null;
      if (!target || target.nodeType !== 1) return;
      const element = target.closest(
        '[data-cauldron-source-file], [data-astro-source-file]',
      );
      if (!element || !canInlineEditElement(element)) return;
      event.preventDefault();
      event.stopPropagation();
      if (selectedEl !== element) pickElement(element);
      beginInlineEdit(element);
    },
    true,
  );

  document.addEventListener(
    'keydown',
    (event) => {
      if (!event.isTrusted) return;
      if (activeDrag && event.key === 'Escape') {
        event.preventDefault();
        cancelCanvasDrag();
        return;
      }
      if (!editingEl) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        finishInlineEdit(false);
        return;
      }
      const isSingleLine = SINGLE_LINE_TAGS.has(
        editingEl.tagName.toLowerCase(),
      );
      if (
        event.key === 'Enter' &&
        (isSingleLine || event.metaKey || event.ctrlKey)
      ) {
        event.preventDefault();
        event.stopPropagation();
        finishInlineEdit(true);
      }
    },
    true,
  );

  document.addEventListener(
    'focusout',
    (event) => {
      if (!event.isTrusted) return;
      if (editingEl && event.target === editingEl) {
        finishInlineEdit(true);
      }
    },
    true,
  );
});
