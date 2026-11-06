import type { RefObject } from 'react';

type Props = {
  stageRef: RefObject<HTMLDivElement | null>;
  site: CauldronSite | null;
  running: boolean;
  onOpen: () => void;
};

/**
 * The preview itself is a separate, locked-down view that sits over this area.
 * This element only reserves the space and reports where it is.
 */
export function PreviewStage({ stageRef, site, running, onOpen }: Props) {
  return (
    <div className="stage-wrap">
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
