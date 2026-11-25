import { PlayIcon, StopIcon } from './Icons';
import { formatPreviewHost, formatStatusMessage } from '../status-bar';

type Props = {
  message: string;
  url: string | null;
  running: boolean;
  site: CauldronSite | null;
  busy: boolean;
  onTogglePreview: () => void;
};

export function StatusBar({
  message,
  url,
  running,
  site,
  busy,
  onTogglePreview,
}: Props) {
  const host = formatPreviewHost(url);
  const displayMessage = formatStatusMessage(message, running, url);

  return (
    <footer className="statusbar" role="status" aria-label="Status bar">
      <span className="status-message">{displayMessage}</span>
      <span className="spacer" />
      <span className="status-right">
        {site ? (
          running ? (
            <span className="status-live">
              <span className="status-dot green" aria-hidden="true">
                ●
              </span>
              <span>Preview · {host}</span>
              <button
                type="button"
                className="status-action-btn"
                onClick={onTogglePreview}
                disabled={busy}
                title="Stop preview server"
              >
                <StopIcon size={10} />
                <span>Stop</span>
              </button>
            </span>
          ) : (
            <span className="status-live">
              <span className="status-dot muted" aria-hidden="true">
                ○
              </span>
              <span>Preview stopped</span>
              <button
                type="button"
                className="status-action-btn"
                onClick={onTogglePreview}
                disabled={busy}
                title="Start preview server"
              >
                <PlayIcon size={10} />
                <span>Start preview</span>
              </button>
            </span>
          )
        ) : null}
      </span>
    </footer>
  );
}
