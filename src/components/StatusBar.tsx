type Props = {
  message: string;
  url: string | null;
  running: boolean;
};

export function StatusBar({ message, url, running }: Props) {
  return (
    <div className="statusbar">
      <span>{message}</span>
      <span className="url">{running && url ? url : ''}</span>
    </div>
  );
}
