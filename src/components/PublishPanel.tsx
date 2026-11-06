import { useEffect, useState } from 'react';

type Props = {
  site: CauldronSite | null;
  onBack: () => void;
};

/** Publishing through the site's own Git repository (plan 5.1, 5.2). */
export function PublishPanel({ site, onBack }: Props) {
  const [state, setState] = useState<Awaited<
    ReturnType<CauldronApi['repoState']>
  > | null>(null);
  const [build, setBuild] = useState<{
    zip: string | null;
    instructions: string;
  } | null>(null);
  const [message, setMessage] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void window.cauldron.repoState().then(setState);
    void window.cauldron.macBuild().then(setBuild);
  }, [site?.root]);

  const send = async (push: boolean) => {
    setBusy(true);
    setResult(null);
    const outcome = await window.cauldron.publish({ message, push });
    setBusy(false);
    setResult(
      outcome.ok
        ? (outcome.message ?? 'Published.')
        : `${outcome.problem ?? 'That did not go through.'}${outcome.details ? `\n${outcome.details}` : ''}`,
    );
    if (outcome.ok) setState(await window.cauldron.repoState());
  };

  return (
    <div className="pane-body" style={{ overflowY: 'auto', padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>Publishing</h2>
        <span className="hint">
          Through the site's own Git repository. Nothing is committed unless you
          ask.
        </span>
        <span className="spacer" />
        <button className="button" type="button" onClick={onBack}>
          Back to the site
        </button>
      </div>

      {!site ? (
        <p className="hint" style={{ marginTop: 12 }}>
          Open a site first.
        </p>
      ) : null}

      {state && !state.isRepo ? (
        <div className="notice" style={{ marginTop: 12 }}>
          This site is not a Git repository yet, so there is nothing to publish
          to.
        </div>
      ) : null}

      {state?.isRepo ? (
        <>
          <p className="hint" style={{ marginTop: 12 }}>
            Branch <strong>{state.branch}</strong> · last commit “
            {state.lastCommit}”
            {state.hasRemote
              ? ' · has a remote'
              : ' · no remote (commits stay local)'}
          </p>

          <h3 style={{ fontSize: 13, marginTop: 16 }}>
            {state.changes.length} changed file(s)
          </h3>
          <ul className="hint mono" style={{ paddingLeft: 18, marginTop: 6 }}>
            {state.changes.map((change) => (
              <li key={change.file}>
                {change.status} {change.file}
              </li>
            ))}
          </ul>

          {state.changes.length > 0 ? (
            <>
              <div className="field" style={{ marginTop: 12 }}>
                <label htmlFor="commit-message">Commit message</label>
                <input
                  id="commit-message"
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="Tighten the header spacing"
                />
              </div>
              <div className="notice-actions">
                <button
                  className="button primary"
                  type="button"
                  disabled={busy || message.trim() === ''}
                  onClick={() => void send(false)}
                >
                  Commit
                </button>
                {state.hasRemote ? (
                  <button
                    className="button"
                    type="button"
                    disabled={busy || message.trim() === ''}
                    onClick={() => void send(true)}
                  >
                    Commit and push
                  </button>
                ) : null}
              </div>
            </>
          ) : (
            <p className="hint">Nothing has changed since the last commit.</p>
          )}
        </>
      ) : null}

      {result ? (
        <div
          className="notice"
          style={{ marginTop: 12, whiteSpace: 'pre-wrap' }}
        >
          {result}
        </div>
      ) : null}

      <h3 style={{ fontSize: 13, marginTop: 24 }}>Mac download</h3>
      <p className="hint">
        {build?.zip
          ? `A ready-to-hand-over build: ${build.zip}`
          : 'No build yet. Run “npm run make” in the Cauldron repository to produce the zip.'}
      </p>
      <pre
        className="hint mono"
        style={{
          background: 'var(--panel-sunken)',
          border: '1px solid var(--hairline)',
          borderRadius: 8,
          padding: 10,
          whiteSpace: 'pre-wrap',
        }}
      >
        {build?.instructions ?? ''}
      </pre>
    </div>
  );
}
