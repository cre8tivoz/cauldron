import { useCallback, useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { PREVIEW_VIEWPORTS, type PreviewViewport } from '../preview-viewport';
import {
  COMPARE_WIDTHS,
  computeCompareFrames,
  minimumStageWidth,
} from '../preview-compare';

type Props = {
  stageRef: RefObject<HTMLDivElement | null>;
  site: CauldronSite | null;
  running: boolean;
  viewport: PreviewViewport;
  onViewportChange: (viewport: PreviewViewport) => void;
  compare: boolean;
  onCompareChange: (compare: boolean) => void;
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
  viewport,
  onViewportChange,
  compare,
  onCompareChange,
  onOpen,
}: Props) {
  const slotRefs = useRef<(HTMLDivElement | null)[]>([]);
  // Three true widths need about 630px of stage because Chromium will not scale
  // below a quarter. Under that the native frames would be wider than their
  // columns and could not be clipped by CSS, so the stage asks for room instead.
  const [tooNarrow, setTooNarrow] = useState(false);

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
  }, []);

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

  return (
    <div className="stage-wrap">
      {site ? (
        <div className="stage-toolbar">
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
                ? 'Start the preview to see the site.'
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
