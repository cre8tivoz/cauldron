import { useCallback, useEffect, useState } from 'react';

type Props = {
  site: CauldronSite | null;
};

/**
 * Agent jobs and what they changed. Each run can be undone in one step, and the
 * Before/After toggle outlines the parts of the page the run touched (plan 2.2).
 */
export function AgentPanel({ site }: Props) {
  const [runs, setRuns] = useState<CauldronRun[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [showing, setShowing] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setRuns(await window.cauldron.runs());
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh, site?.root]);

  const toggle = async (run: CauldronRun) => {
    const next = showing === run.id ? null : run.id;
    await window.cauldron.highlight(run.id, next !== null);
    setShowing(next);
  };

  const undoRun = async (run: CauldronRun) => {
    const result = await window.cauldron.undoRun(run.id);
    if (result.ok) {
      setMessage('Run undone.');
      await refresh();
      return;
    }
    setMessage(
      result.clashes && result.clashes.length > 0
        ? `${result.problem} ${result.clashes.join(', ')}`
        : (result.problem ?? 'That run could not be undone.'),
    );
  };

  return (
    <>
      <div className="pane-header">Agent</div>
      <div className="pane-body">
        {!site ? <p className="hint">Open a site to work on it.</p> : null}

        {site && runs.length === 0 ? (
          <p className="hint">No agent runs yet.</p>
        ) : null}

        {message ? <div className="notice">{message}</div> : null}

        {runs.map((run) => (
          <div className="section" key={run.id}>
            <h3>
              {run.tool} · {run.status}
            </h3>
            <p className="hint">{run.note}</p>
            {run.files.length > 0 ? (
              <ul className="hint" style={{ margin: '6px 0', paddingLeft: 18 }}>
                {run.files.map((file) => (
                  <li key={file} className="mono">
                    {file}
                  </li>
                ))}
              </ul>
            ) : null}
            <div className="notice-actions">
              <button
                className="button"
                type="button"
                onClick={() => void toggle(run)}
                aria-pressed={showing === run.id}
                disabled={run.highlighted.length === 0}
              >
                {showing === run.id ? 'Hide changes' : 'Show changes'}
              </button>
              <button
                className="button"
                type="button"
                onClick={() => void undoRun(run)}
                disabled={run.status !== 'finished' || run.files.length === 0}
              >
                Undo this run
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
