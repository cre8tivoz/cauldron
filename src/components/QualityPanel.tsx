import { useState } from 'react';
import { CheckCircleIcon, ChevronDownIcon, WarningTriangleIcon } from './Icons';

type Props = {
  site: CauldronSite | null;
  direction: CauldronDirectionSummary | null;
  onBack: () => void;
  onOpenDesign: () => void;
};

/**
 * Quality Report matching Sunday Table quality report mockup:
 * 2-column split layout (N to fix warning rows with coral accent bar + expanded Passing checks
 * with green circle checkmark icons on left; Measured table + Design direction swatch card on right).
 */
export function QualityPanel({ site, direction, onBack, onOpenDesign }: Props) {
  const [report, setReport] = useState<QualityReport | null>(null);
  const [running, setRunning] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [tool, setTool] = useState<'claude' | 'codex' | 'hermes'>('claude');
  const [message, setMessage] = useState<string | null>(null);
  const [passesOpen, setPassesOpen] = useState(true);

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

  const changeResults = [...failures, ...unverified].filter(
    (finding) => finding.scope === 'change',
  );
  const siteResults = [...failures, ...unverified].filter(
    (finding) => finding.scope !== 'change',
  );

  const renderFailingRow = (finding: QualityFinding) => (
    <div className="notice bad quality-failure-card" key={finding.id}>
      <div className="failure-card-left">
        <WarningTriangleIcon size={18} color="#e05e46" />
        <div className="failure-title-group">
          <strong className="failure-label">{finding.label}</strong>
          <span className="failure-loc">
            {finding.page ? ` / ${finding.page}` : ''}
            {finding.width ? ` at ${finding.width}px` : ''}
          </span>
        </div>
      </div>
      <div className="failure-card-right hint">{finding.detail}</div>
    </div>
  );

  const directionSwatches = direction?.colours
    ? Object.entries(direction.colours).slice(0, 5)
    : [];

  return (
    <div
      className="pane-body quality-panel-container"
      style={{ overflowY: 'auto', padding: 24 }}
    >
      {/* Top Header & Subheader Bar */}
      <div className="quality-header-bar">
        <div className="quality-title-group">
          <h2 className="quality-heading">Quality</h2>
          <span className="quality-subtitle">
            The real build, measured at 375, 768 and 1280px.
          </span>
          <div className="quality-context-line">
            <span className="quality-site-page">
              {site?.name || 'Sunday Table'} / Homepage
            </span>
            <span className="quality-divider" aria-hidden="true">
              ·
            </span>
            <span className="quality-direction-pairing">
              {direction
                ? `${direction.name} · ${direction.fonts.display} + ${direction.fonts.body}`
                : 'No direction chosen'}
            </span>
          </div>
        </div>

        <div className="quality-header-actions">
          <button
            className="button primary run-checks-btn"
            type="button"
            onClick={() => void run()}
            disabled={!site || running}
          >
            <span>➤</span>
            <span>{running ? 'Checking…' : 'Run the checks'}</span>
          </button>
          <button
            className="button back-to-site-btn"
            type="button"
            onClick={onBack}
          >
            ← Back to the site
          </button>
        </div>
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

      {/* 2-Column Split Body */}
      {report ? (
        <div className="quality-split-layout">
          {/* Left Column: N to fix + Passing checks + Feedback */}
          <div className="quality-main-column">
            {/* N to fix Section */}
            <div className="quality-section-block">
              <h3 className="quality-section-heading">
                {failures.length === 0
                  ? unverified.length
                    ? `${unverified.length} checks could not run`
                    : 'Everything measured passes'
                  : `${failures.length} to fix`}
              </h3>

              {changeResults.length > 0 ? (
                <div className="quality-failures-group">
                  <h4 className="failures-scope-title">
                    The agent&rsquo;s changes
                  </h4>
                  {changeResults.map(renderFailingRow)}
                </div>
              ) : null}

              {siteResults.length > 0 ? (
                <div className="quality-failures-group">
                  <h4 className="failures-scope-title">The whole site</h4>
                  {siteResults.map(renderFailingRow)}
                </div>
              ) : null}
            </div>

            {/* Passing checks Section (expanded by default) */}
            <div className="quality-section-block">
              <details
                open={passesOpen}
                onToggle={(e) =>
                  setPassesOpen((e.target as HTMLDetailsElement).open)
                }
                className="passing-checks-details"
              >
                <summary className="passing-checks-summary">
                  <ChevronDownIcon size={12} />
                  <strong>Passing checks</strong>
                </summary>

                <ul className="hint passing-checks-list">
                  {passes.map((finding) => (
                    <li key={finding.id} className="passing-check-row">
                      <CheckCircleIcon size={16} color="#38a169" />
                      <span className="passing-check-text">
                        <strong>{finding.label}</strong>
                        {finding.page ? ` · ${finding.page}` : ''}
                        {finding.width ? ` at ${finding.width}px` : ''} —{' '}
                        {finding.detail}
                      </span>
                    </li>
                  ))}
                </ul>
              </details>
              <p className="hint" style={{ marginTop: 6, fontSize: 11 }}>
                Measured results describe this build.
              </p>
            </div>

            {/* Opinions if any */}
            {opinions.length > 0 ? (
              <div className="quality-section-block">
                <h3 className="quality-section-heading">Design opinions</h3>
                <p className="hint" style={{ marginTop: 0 }}>
                  Judgements, not measurements. Nothing here is a pass or a
                  fail.
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
              </div>
            ) : null}

            {/* Feedback for the agent */}
            <div className="quality-feedback-card">
              <h3 className="quality-feedback-title">Feedback for the agent</h3>
              <p className="quality-feedback-subtitle">
                In plain English — “tighter spacing”, “make the header bolder”.
              </p>

              <div className="field" style={{ margin: '12px 0' }}>
                <textarea
                  id="quality-feedback"
                  rows={3}
                  value={feedback}
                  onChange={(event) => setFeedback(event.target.value)}
                  placeholder="Fix the navigation overflow at 375px and add useful alt text to the café photograph. Keep the Long Lunch design direction."
                  className="quality-feedback-textarea"
                />
              </div>

              <div className="quality-feedback-actions-row">
                <button
                  className="button primary send-feedback-btn"
                  type="button"
                  onClick={() => void sendFeedback()}
                  disabled={!feedback.trim()}
                >
                  <span>➤</span>
                  <span>Send to the agent</span>
                </button>

                <button
                  className="button quiet-pill-btn"
                  type="button"
                  onClick={() =>
                    setFeedback(
                      failures.length === 0
                        ? 'Look over the page and improve anything that feels generic.'
                        : `Please fix these measured problems, one at a time: ${failures
                            .map(
                              (finding) =>
                                `${finding.label} (${finding.detail})`,
                            )
                            .join('; ')}`,
                    )
                  }
                >
                  Use the failing checks
                </button>

                <div className="feedback-agent-picker">
                  <select
                    className="feedback-agent-select"
                    aria-label="Agent to apply the feedback"
                    value={tool}
                    onChange={(event) =>
                      setTool(
                        event.target.value as 'claude' | 'codex' | 'hermes',
                      )
                    }
                  >
                    <option value="claude">Claude Code</option>
                    <option value="codex">Codex</option>
                    <option value="hermes">Hermes</option>
                  </select>
                  <ChevronDownIcon size={12} />
                </div>

                <button
                  className="button quiet-pill-btn"
                  type="button"
                  onClick={() => void run()}
                  disabled={running}
                >
                  Run the checks again
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Measured Table + Design direction Card */}
          <aside className="quality-sidebar-column">
            {/* Measured Summary Table */}
            <div className="quality-sidebar-card">
              <h3 className="sidebar-card-title">Measured</h3>
              <table className="measured-summary-table">
                <tbody>
                  {report.measured.map((item) => (
                    <tr key={item.label} className="measured-table-row">
                      <td className="measured-row-label">{item.label}</td>
                      <td className="measured-row-value mono">{item.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Design direction Card */}
            {direction ? (
              <div className="quality-sidebar-card design-direction-summary-card">
                <h3 className="sidebar-card-title">Design direction</h3>
                <div className="quality-direction-swatches-row">
                  {directionSwatches.map(([name, value]) => (
                    <span
                      key={name}
                      title={`${name}: ${value}`}
                      className="quality-direction-swatch"
                      style={{ background: value }}
                    />
                  ))}
                </div>
                <strong className="quality-direction-card-title">
                  {direction.name}
                </strong>
                <p className="quality-direction-card-desc">
                  {direction.character}
                </p>
              </div>
            ) : null}
          </aside>
        </div>
      ) : null}
    </div>
  );
}
