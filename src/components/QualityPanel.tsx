import { useState } from 'react';

type Props = {
  site: CauldronSite | null;
  direction: CauldronDirectionSummary | null;
  onBack: () => void;
  onOpenDesign: () => void;
};

/**
 * Measured checks on the built site (plan 4.4), kept separate from opinion, plus
 * the plain-English feedback box that hands the fixes to the agent.
 */
export function QualityPanel({ site, direction, onBack, onOpenDesign }: Props) {
  const [report, setReport] = useState<QualityReport | null>(null);
  const [running, setRunning] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const run = async () => {
    setRunning(true);
    setMessage(null);
    const result = await window.cauldron.qualityRun({ pages: ['/'] });
    setRunning(false);
    setReport(result);
    if (!result.built)
      setMessage(
        'The site does not build, so there is nothing to measure yet.',
      );
  };

  const sendFeedback = async () => {
    if (feedback.trim() === '') return;
    const result = await window.cauldron.agentSend({
      tool: 'claude',
      request: feedback.trim(),
    });
    setMessage(
      result.ok
        ? 'Sent to the agent. Watch the Agent column for progress.'
        : (result.problem ?? 'The agent could not start.'),
    );
  };

  const failures =
    report?.findings.filter((finding) => finding.status === 'fail') ?? [];
  const passes =
    report?.findings.filter((finding) => finding.status === 'pass') ?? [];

  return (
    <div className="pane-body" style={{ overflowY: 'auto', padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>Quality</h2>
        <span className="hint">
          The real build, measured at 375, 768 and 1280px.
        </span>
        <span className="spacer" />
        <button
          className="button primary"
          type="button"
          onClick={() => void run()}
          disabled={!site || running}
        >
          {running ? 'Checking…' : 'Run the checks'}
        </button>
        <button className="button" type="button" onClick={onBack}>
          Back to the site
        </button>
      </div>

      {!site ? (
        <p className="hint" style={{ marginTop: 12 }}>
          Open a site first.
        </p>
      ) : null}
      {!direction && site ? (
        <div className="notice" style={{ marginTop: 12 }}>
          No design direction is set, so type and font checks are skipped.
          <div className="notice-actions">
            <button className="button" type="button" onClick={onOpenDesign}>
              Choose a direction
            </button>
          </div>
        </div>
      ) : null}
      {message ? (
        <div className="notice" style={{ marginTop: 12 }}>
          {message}
        </div>
      ) : null}

      {report ? (
        <>
          <h3 style={{ fontSize: 13, marginTop: 18 }}>
            {failures.length === 0
              ? 'Everything measured passes'
              : `${failures.length} to fix`}
          </h3>
          {failures.map((finding) => (
            <div
              className="notice bad"
              key={finding.id}
              style={{ marginBottom: 8 }}
            >
              <strong>{finding.label}</strong>
              {finding.page ? ` · ${finding.page}` : ''}
              {finding.width ? ` at ${finding.width}px` : ''}
              <div className="hint">{finding.detail}</div>
            </div>
          ))}

          <details style={{ marginTop: 10 }}>
            <summary className="hint">{passes.length} passing checks</summary>
            <ul className="hint">
              {passes.map((finding) => (
                <li key={finding.id}>
                  {finding.label}
                  {finding.page ? ` · ${finding.page}` : ''}
                  {finding.width ? ` at ${finding.width}px` : ''} —{' '}
                  {finding.detail}
                </li>
              ))}
            </ul>
          </details>

          <h3 style={{ fontSize: 13, marginTop: 18 }}>Measured</h3>
          <table className="hint" style={{ borderCollapse: 'collapse' }}>
            <tbody>
              {report.measured.map((item) => (
                <tr key={item.label}>
                  <td style={{ paddingRight: 16, color: 'var(--muted)' }}>
                    {item.label}
                  </td>
                  <td className="mono">{item.value}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3 style={{ fontSize: 13, marginTop: 18 }}>
            Feedback for the agent
          </h3>
          <div className="field">
            <label htmlFor="quality-feedback">
              In plain English — “tighter spacing”, “make the header bolder”
            </label>
            <textarea
              id="quality-feedback"
              rows={3}
              value={feedback}
              onChange={(event) => setFeedback(event.target.value)}
              placeholder="Tighten the spacing in the header and make the h1 bolder."
            />
          </div>
          <div className="notice-actions">
            <button
              className="button primary"
              type="button"
              onClick={() => void sendFeedback()}
              disabled={!feedback.trim()}
            >
              Send to the agent
            </button>
            <button
              className="button"
              type="button"
              onClick={() =>
                setFeedback(
                  failures.length === 0
                    ? 'Look over the page and improve anything that feels generic.'
                    : `Please fix these measured problems, one at a time: ${failures
                        .map(
                          (finding) => `${finding.label} (${finding.detail})`,
                        )
                        .join('; ')}`,
                )
              }
            >
              Use the failing checks
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
