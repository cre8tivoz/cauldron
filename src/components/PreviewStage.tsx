import { useCallback, useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { PREVIEW_VIEWPORTS, type PreviewViewport } from '../preview-viewport';
import {
  COMPARE_WIDTHS,
  computeCompareFrames,
  minimumStageWidth,
} from '../preview-compare';
import { PlusIcon, ReloadIcon } from './Icons';

type Props = {
  stageRef: RefObject<HTMLDivElement | null>;
  site: CauldronSite | null;
  running: boolean;
  currentPage: string;
  pages: Array<{ page: string; file: string }>;
  viewport: PreviewViewport;
  onViewportChange: (viewport: PreviewViewport) => void;
  compare: boolean;
  onCompareChange: (compare: boolean) => void;
  onOpenPage: (pageRoute: string) => void;
  onNewPage: (page: { path: string; title: string }) => void;
  onReload: () => void;
  onOpen: () => void;
};

/**
 * The preview itself is a separate, locked-down view that sits over this area.
 * This element only reserves the space and reports where it is.
 *
 * Compare mode is the same idea three times over: each column is an empty slot
 * the native views are placed over, measured here so a window resize only ever
 * moves native views rather than round-tripping through React state.
 */
export function PreviewStage({
  stageRef,
  site,
  running,
  currentPage,
  pages,
  viewport,
  onViewportChange,
  compare,
  onCompareChange,
  onOpenPage,
  onNewPage,
  onReload,
  onOpen,
}: Props) {
  const slotRefs = useRef<(HTMLDivElement | null)[]>([]);
  // Three true widths need about 630px of stage because Chromium will not scale
  // below a quarter. Under that the native frames would be wider than their
  // columns and could not be clipped by CSS, so the stage asks for room instead.
  const [tooNarrow, setTooNarrow] = useState(false);
  const [makingPage, setMakingPage] = useState(false);
  const [pagePath, setPagePath] = useState('');
  const [pageTitle, setPageTitle] = useState('');
  const pagePathRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setMakingPage(false);
    setPagePath('');
    setPageTitle('');
  }, [site?.root]);

  useEffect(() => {
    if (makingPage) pagePathRef.current?.focus();
  }, [makingPage]);

  const addPage = () => {
    if (pagePath.trim() === '') return;
    onNewPage({ path: pagePath.trim(), title: pageTitle.trim() });
    setMakingPage(false);
    setPagePath('');
    setPageTitle('');
  };

  const reportFrames = useCallback(() => {
    const stage = stageRef.current;
    const fits = !stage || stage.clientWidth >= minimumStageWidth();
    setTooNarrow(!fits);
    if (!fits) {
      // No frames at all: leaving stale views up would overlap the panels.
      void window.cauldron.setCompareFrames([]).catch(() => undefined);
      return;
    }
    const slots = slotRefs.current.map((slot) =>
      slot ? slot.getBoundingClientRect() : null,
    );
    void window.cauldron
      .setCompareFrames(
        computeCompareFrames(
          slots.map((rect) =>
            rect
              ? {
                  left: rect.left,
                  top: rect.top,
                  width: rect.width,
                  height: rect.height,
                }
              : null,
          ),
        ),
      )
      .catch(() => undefined);
  }, [stageRef]);

  useEffect(() => {
    if (!compare || !running) {
      void window.cauldron.setCompareFrames([]).catch(() => undefined);
      return;
    }
    reportFrames();
    const slots = slotRefs.current.filter((slot): slot is HTMLDivElement =>
      Boolean(slot),
    );
    const observer = new ResizeObserver(reportFrames);
    for (const slot of slots) observer.observe(slot);
    window.addEventListener('resize', reportFrames);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', reportFrames);
      void window.cauldron.setCompareFrames([]).catch(() => undefined);
    };
  }, [compare, running, reportFrames]);

  const routeOptions = pages.some((entry) => entry.page === currentPage)
    ? pages
    : [{ page: currentPage, file: '' }, ...pages];

  return (
    <div className="stage-wrap">
      {site ? (
        <>
          <div
            className="stage-toolbar"
            role="toolbar"
            aria-label="Preview controls"
          >
            <div className="stage-toolbar-left">
              <select
                className="stage-page-select mono"
                aria-label="Current page"
                value={currentPage}
                disabled={!running}
                onChange={(event) => onOpenPage(event.target.value)}
                title="Switch preview page"
              >
                {routeOptions.map((entry) => (
                  <option key={entry.page} value={entry.page}>
                    {entry.page}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="stage-icon-btn"
                aria-label="New page"
                aria-expanded={makingPage}
                title="Create a new page"
                onClick={() => setMakingPage((open) => !open)}
              >
                <PlusIcon size={13} />
              </button>
            </div>

            <div className="stage-toolbar-center">
              <div
                className="stage-viewport-switch"
                role="group"
                aria-label="Preview width"
              >
                {PREVIEW_VIEWPORTS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    className={
                      viewport === preset.id
                        ? 'stage-viewport-btn active'
                        : 'stage-viewport-btn'
                    }
                    aria-pressed={viewport === preset.id}
                    disabled={compare}
                    onClick={() => onViewportChange(preset.id)}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className={
                  compare ? 'stage-compare-btn active' : 'stage-compare-btn'
                }
                aria-pressed={compare}
                onClick={() => onCompareChange(!compare)}
              >
                Compare widths
              </button>
            </div>

            <div className="stage-toolbar-right">
              <button
                type="button"
                className="stage-icon-btn"
                onClick={onReload}
                disabled={!running}
                aria-label="Reload preview"
                title="Reload preview"
              >
                <ReloadIcon size={14} />
              </button>
            </div>
          </div>

          {makingPage ? (
            <form
              className="stage-new-page-bar"
              onSubmit={(event) => {
                event.preventDefault();
                addPage();
              }}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  event.stopPropagation();
                  setMakingPage(false);
                }
              }}
            >
              <input
                ref={pagePathRef}
                className="stage-new-page-input"
                placeholder="about"
                value={pagePath}
                onChange={(event) => setPagePath(event.target.value)}
                aria-label="Page address"
              />
              <input
                className="stage-new-page-input"
                placeholder="Page title"
                value={pageTitle}
                onChange={(event) => setPageTitle(event.target.value)}
                aria-label="Page title"
              />
              <button
                className="button primary"
                type="submit"
                disabled={pagePath.trim() === ''}
              >
                Add page
              </button>
              <button
                className="button quiet"
                type="button"
                onClick={() => setMakingPage(false)}
              >
                Cancel
              </button>
            </form>
          ) : null}
        </>
      ) : null}
      <div
        className={compare ? 'stage stage-compared' : 'stage'}
        ref={stageRef}
      >
        {!running ? (
          <div className="stage-empty">
            <h2>{site ? 'Preview is stopped' : 'No site open'}</h2>
            <p className="hint">
              {site
                ? 'Start the preview from the status bar below to see the site.'
                : 'Open an Astro folder to begin.'}
            </p>
            {!site ? (
              <button className="button primary" type="button" onClick={onOpen}>
                Open site
              </button>
            ) : null}
          </div>
        ) : null}
        {compare && running && tooNarrow ? (
          <div className="stage-empty">
            <h2>Not enough room to compare</h2>
            <p className="hint">
              Three true widths need about {Math.round(minimumStageWidth())}px
              of preview. Widen the window or close a side panel.
            </p>
          </div>
        ) : null}
        {compare && running && !tooNarrow ? (
          <div className="stage-compare">
            {COMPARE_WIDTHS.map((preset, index) => (
              <div className="stage-compare-col" key={preset.id}>
                <div className="stage-compare-head">
                  <span className="stage-compare-name">{preset.label}</span>
                  <span className="stage-compare-width">{preset.width}px</span>
                </div>
                <div
                  className="stage-compare-slot"
                  ref={(node) => {
                    slotRefs.current[index] = node;
                  }}
                />
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
