import { useState } from 'react';

type Props = {
  site: CauldronSite | null;
  direction: CauldronDirectionSummary | null;
  onBack: () => void;
  onOpenDesign: () => void;
};

/**
 * Measured checks on the built site (plan 4.4), kept separate from checks that
 * could not run and from design opinion, plus the plain-English feedback box
 * that hands the fixes to the agent.
 */
export function QualityPanel({ site, direction, onBack, onOpenDesign }: Props) {
  const [report, setReport] = useState<QualityReport | null>(null);
  const [running, setRunning] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [tool, setTool] = useState<'claude' | 'codex' | 'hermes'>('claude');
  const [message, setMessage] = useState<string | null>(null);

  const run = async () => {
    setRunning(true);
    setMessage(null);
    const result = await window.cauldron.qualityRun({});
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
      tool,
      request: feedback.trim(),
    });
    setMessage(
      result.ok
        ? `Sent to ${tool}. Watch the Agent column for progress, then run the checks again.`
        : (result.problem ?? 'The agent could not start.'),
    );
  };

  const failures =
    report?.findings.filter(
      (finding) => finding.kind === 'measured' && finding.status === 'fail',
    ) ?? [];
  const unverified =
    report?.findings.filter((finding) => finding.kind === 'failure') ?? [];
  const opinions =
    report?.findings.filter((finding) => finding.kind === 'opinion') ?? [];
  const passes =
    report?.findings.filter(
      (finding) => finding.kind === 'measured' && finding.status === 'pass',
    ) ?? [];
  // Kept apart on purpose: what the agent's run wrote, and the site as a whole.
  const changeResults = [...failures, ...unverified].filter(
    (finding) => finding.scope === 'change',
  );
  const siteResults = [...failures, ...unverified].filter(
    (finding) => finding.scope !== 'change',
  );
  const notice = (finding: QualityFinding) => (
    <div className="notice bad" key={finding.id} style={{ marginBottom: 8 }}>
      <strong>{finding.label}</strong>
      {finding.page ? ` · ${finding.page}` : ''}
      {finding.width ? ` at ${finding.width}px` : ''}
      <div className="hint">{finding.detail}</div>
    </div>
  );

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
          No design direction is set, so type, font and taste checks are
          skipped.
          <div className="notice-actions">
            <button className="button" type="button" onClick={onOpenDesign}>
              Choose a direction
            </button>
          </div>
        </div>
      ) : null}
      {report && !report.built ? (
        <div className="notice bad" role="alert" style={{ marginTop: 12 }}>
          <strong>
            The site does not build, so there is nothing to measure yet.
          </strong>
          {report.buildLog ? (
            <pre
              className="build-log mono"
              style={{
                marginTop: 8,
                padding: 8,
                background: 'rgba(0, 0, 0, 0.2)',
                borderRadius: 4,
                overflowX: 'auto',
                fontSize: 11,
                lineHeight: 1.4,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                maxHeight: 280,
              }}
            >
              {report.buildLog}
            </pre>
          ) : null}
        </div>
      ) : message ? (
        <div className="notice" style={{ marginTop: 12 }}>
          {message}
        </div>
      ) : null}

      {report ? (
        <>
          <h3 style={{ fontSize: 13, marginTop: 18 }}>
            {failures.length === 0
              ? unverified.length
                ? `${unverified.length} checks could not run`
                : 'Everything measured passes'
              : `${failures.length} to fix`}
          </h3>
          {changeResults.length > 0 ? (
            <>
              <h4 style={{ fontSize: 13, margin: '12px 0 8px' }}>
                The agent&rsquo;s changes
              </h4>
              {changeResults.map(notice)}
            </>
          ) : null}
          {siteResults.length > 0 ? (
            <>
              <h4 style={{ fontSize: 13, margin: '12px 0 8px' }}>
                The whole site
              </h4>
              {siteResults.map(notice)}
            </>
          ) : null}

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

          {opinions.length > 0 ? (
            <>
              <h3 style={{ fontSize: 13, marginTop: 18 }}>Design opinions</h3>
              <p className="hint" style={{ marginTop: 0 }}>
                Judgements, not measurements. Nothing here is a pass or a fail.
              </p>
              {opinions.map((finding) => (
                <div
                  className="notice"
                  key={finding.id}
                  style={{ marginBottom: 8 }}
                >
                  <strong>{finding.label}</strong>
                  {finding.page ? ` · ${finding.page}` : ''}
                  <div className="hint">{finding.detail}</div>
                </div>
              ))}
            </>
          ) : null}

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
            <select
              className="button"
              aria-label="Agent to apply the feedback"
              value={tool}
              onChange={(event) =>
                setTool(event.target.value as 'claude' | 'codex' | 'hermes')
              }
            >
              <option value="claude">Claude Code</option>
              <option value="codex">Codex</option>
              <option value="hermes">Hermes</option>
            </select>
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
            <button
              className="button"
              type="button"
              onClick={() => void run()}
              disabled={running}
            >
              Run the checks again
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
