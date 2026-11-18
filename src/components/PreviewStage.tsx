import type { RefObject } from 'react';
import { PREVIEW_VIEWPORTS, type PreviewViewport } from '../preview-viewport';

type Props = {
  stageRef: RefObject<HTMLDivElement | null>;
  site: CauldronSite | null;
  running: boolean;
  viewport: PreviewViewport;
  onViewportChange: (viewport: PreviewViewport) => void;
  onOpen: () => void;
};

/**
 * The preview itself is a separate, locked-down view that sits over this area.
 * This element only reserves the space and reports where it is.
 */
export function PreviewStage({
  stageRef,
  site,
  running,
  viewport,
  onViewportChange,
  onOpen,
}: Props) {
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
                onClick={() => onViewportChange(preset.id)}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      <div className="stage" ref={stageRef}>
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
      </div>
    </div>
  );
}
