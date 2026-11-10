type Props = {
  message: string;
  url: string | null;
  running: boolean;
  siteName?: string | null;
};

export function StatusBar({ message, url, running, siteName }: Props) {
  const host = url ? url.replace(/^https?:\/\//, '') : 'localhost:4321';

  return (
    <footer className="statusbar" role="status" aria-label="Status bar">
      <span className="status-message">{message}</span>
      <span className="spacer" />
      <span className="status-right">
        {running ? (
          <span className="status-live">
            <span className="status-dot green" aria-hidden="true">
              ●
            </span>
            <span>Preview running · {host}</span>
          </span>
        ) : siteName ? (
          <span className="status-live">
            <span className="status-dot green" aria-hidden="true">
              ●
            </span>
            <span>{siteName}</span>
          </span>
        ) : null}
      </span>
    </footer>
  );
}
