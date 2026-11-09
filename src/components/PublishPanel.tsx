import { useEffect, useState } from 'react';
import { CheckCircleIcon, GitBranchIcon, ZipArchiveIcon } from './Icons';

type Props = {
  site: CauldronSite | null;
  /** Edits typed in the window that have not reached recovery storage yet. */
  unsavedBuffers: number;
  onBack: () => void;
};

/**
 * Publishing panel matching Publishing Review_ Git Changes and Mac Build mockup:
 * 2-column Git review layout (left: project title, branch badge, changed file rows with [M],
 * commit controls; right: Repository summary table + Your site stays yours)
 * + full-width bottom Mac download bar.
 */
export function PublishPanel({ site, unsavedBuffers, onBack }: Props) {
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
  const [exporting, setExporting] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [deployResult, setDeployResult] = useState<{
    ok: boolean;
    message: string;
    url?: string;
  } | null>(null);

  useEffect(() => {
    void window.cauldron.repoState().then(setState);
    void window.cauldron.macBuild().then(setBuild);
  }, [site?.root]);

  const send = async (push: boolean) => {
    setBusy(true);
    setResult(null);
    const outcome = await window.cauldron.publish({
      message,
      push,
      unsavedBuffers,
    });
    setBusy(false);
    const commit =
      outcome.ok && outcome.commit
        ? outcome.commit
        : !outcome.ok && (outcome.committed ?? 0) > 0
          ? `Committed ${outcome.committed} file(s) locally.`
          : '';
    const upload = outcome.ok && outcome.upload ? outcome.upload : '';
    if (outcome.ok) {
      setResult([commit, upload].filter(Boolean).join('\n'));
      setMessage('');
    } else {
      setResult(
        [
          commit,
          `${outcome.problem ?? 'That did not go through.'}${outcome.details ? `\n${outcome.details}` : ''}`,
        ]
          .filter(Boolean)
          .join('\n'),
      );
    }
    if (outcome.ok) setState(await window.cauldron.repoState());
  };

  const handleExportStatic = async () => {
    setExporting(true);
    setDeployResult(null);
    try {
      const res = await window.cauldron.exportStatic();
      if (res.ok) {
        setDeployResult({
          ok: true,
          message:
            'Static site built successfully into dist/. Opened folder in Finder.',
        });
      } else {
        setDeployResult({
          ok: false,
          message: res.problem ?? 'Static export failed.',
        });
      }
    } catch (e) {
      setDeployResult({
        ok: false,
        message: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setExporting(false);
    }
  };

  const handleDeployCloudflare = async () => {
    setDeploying(true);
    setDeployResult(null);
    try {
      const res = await window.cauldron.deployCloudflare(site?.name);
      if (res.ok && res.url) {
        setDeployResult({
          ok: true,
          message: 'Deployed successfully to Cloudflare Pages!',
          url: res.url,
        });
      } else {
        setDeployResult({
          ok: false,
          message:
            res.problem ??
            'Cloudflare Pages deployment requires Wrangler authentication or CLOUDFLARE_API_TOKEN. Static site was built to dist/.',
        });
      }
    } catch (e) {
      setDeployResult({
        ok: false,
        message: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setDeploying(false);
    }
  };

  const projectName = site?.name || 'Sunday Table';

  return (
    <div
      className="pane-body publish-panel-container"
      style={{ overflowY: 'auto', padding: 24 }}
    >
      {/* Header bar */}
      <div className="publish-header-bar">
        <div className="publish-title-group">
          <h2 className="publish-heading">Publishing</h2>
          <span className="publish-subtitle">
            Through the site's own Git repository. Nothing is committed unless
            you ask.
          </span>
        </div>
        <button
          className="button back-to-site-btn"
          type="button"
          onClick={onBack}
        >
          ← Back to the site
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

      {/* 2-Column Split Upper Layout */}
      {state?.isRepo ? (
        <div className="publish-split-layout">
          {/* Left Column: Project Heading, Status bar, Changed Files, Commit Form */}
          <div className="publish-main-column">
            <h1 className="publish-project-name">{projectName}</h1>

            {/* Status bar */}
            <div className="publish-repo-status-bar">
              <span className="repo-branch-pill">
                <GitBranchIcon size={14} />
                <strong>{state.branch}</strong>
              </span>

              {state.hasRemote ? (
                <span className="repo-remote-pill remote-connected">
                  <CheckCircleIcon size={14} color="#38a169" />
                  <span>Remote connected</span>
                </span>
              ) : (
                <span className="repo-remote-pill remote-local">
                  <span>Local repository</span>
                </span>
              )}

              <span className="repo-last-commit">
                Last commit: {state.lastCommit || 'Initial commit'}
              </span>
            </div>

            {/* Unsaved Buffer Notice */}
            {unsavedBuffers > 0 ? (
              <div
                className="notice bad unsaved-notice"
                style={{ marginTop: 14 }}
              >
                <strong>Unsaved changes.</strong> {unsavedBuffers} edit(s) are
                still being typed and have not been saved. Save or discard them
                before publishing.
              </div>
            ) : null}

            {/* N Changed files Table */}
            <div className="publish-changes-section">
              <h3 className="changed-files-heading">
                {state.changes.length} changed file
                {state.changes.length === 1 ? '' : 's'}
              </h3>

              {state.changes.length === 0 ? (
                <p className="hint">
                  {state.unpushed > 0
                    ? `Working tree is clean, with ${state.unpushed} commit(s) ready to push.`
                    : 'Nothing has changed since the last commit.'}
                </p>
              ) : (
                <div className="changed-files-table">
                  {state.changes.map((change) => {
                    const statusLetter =
                      change.status?.slice(0, 1)?.toUpperCase() || 'M';
                    const fileName =
                      change.file.split('/').pop() || change.file;

                    return (
                      <div key={change.file} className="changed-file-row">
                        <span className="file-status-badge">
                          [ {statusLetter} ]
                        </span>
                        <strong className="file-short-name">{fileName}</strong>
                        <span className="file-full-path mono">
                          {change.file}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Commit Message Box & Buttons */}
            {state.changes.length > 0 ? (
              <div className="publish-commit-box">
                <label
                  htmlFor="commit-message"
                  className="commit-message-label"
                >
                  Commit message
                </label>
                <textarea
                  id="commit-message"
                  rows={3}
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="Warm up the homepage and tighten the navigation"
                  className="commit-message-input"
                />

                <div className="commit-actions-row">
                  <button
                    className="button commit-local-btn"
                    type="button"
                    disabled={
                      busy || unsavedBuffers > 0 || message.trim() === ''
                    }
                    onClick={() => void send(false)}
                  >
                    Commit
                  </button>

                  <button
                    className="button primary commit-push-btn"
                    type="button"
                    disabled={
                      busy || unsavedBuffers > 0 || message.trim() === ''
                    }
                    onClick={() => void send(true)}
                  >
                    Commit and push
                  </button>
                </div>

                <p className="commit-caption-text">
                  Commit saves locally. Commit and push also sends changes to
                  the site's remote repository.
                </p>
              </div>
            ) : state.unpushed > 0 ? (
              <div className="publish-commit-box">
                <p className="hint">
                  The working tree is clean, but {state.unpushed} commit(s) have
                  not been uploaded yet.
                </p>
                <div className="commit-actions-row">
                  {state.hasRemote ? (
                    <button
                      className="button primary commit-push-btn"
                      type="button"
                      disabled={busy || unsavedBuffers > 0}
                      onClick={() => void send(true)}
                    >
                      Upload commits
                    </button>
                  ) : (
                    <p className="hint">
                      Add a remote in Git before uploading.
                    </p>
                  )}
                </div>
              </div>
            ) : null}

            {result ? (
              <div
                className="notice good"
                style={{ marginTop: 14, whiteSpace: 'pre-wrap' }}
              >
                {result}
              </div>
            ) : null}
          </div>

          {/* Right Column: Repository Summary + Your site stays yours */}
          <aside className="publish-sidebar-column">
            <div className="publish-sidebar-card">
              <h3 className="sidebar-card-title">Repository</h3>
              <table className="repo-summary-table">
                <tbody>
                  <tr className="repo-table-row">
                    <td className="repo-row-key">Site:</td>
                    <td className="repo-row-val">{projectName}</td>
                  </tr>
                  <tr className="repo-table-row">
                    <td className="repo-row-key">Branch:</td>
                    <td className="repo-row-val mono">{state.branch}</td>
                  </tr>
                  <tr className="repo-table-row">
                    <td className="repo-row-key">Remote:</td>
                    <td className="repo-row-val mono">
                      {state.hasRemote ? 'origin' : 'none'}
                    </td>
                  </tr>
                  <tr className="repo-table-row">
                    <td className="repo-row-key">Changes:</td>
                    <td className="repo-row-val">
                      {state.changes.length} file
                      {state.changes.length === 1 ? '' : 's'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="publish-sidebar-card stays-yours-card">
              <h3 className="stays-yours-title">Your site stays yours</h3>
              <p className="stays-yours-desc">
                Ordinary Astro files, in your own folder.
              </p>
            </div>

            {/* Cloudflare Pages & Static Export Card */}
            <div className="publish-sidebar-card" style={{ marginTop: 14 }}>
              <h3 className="sidebar-card-title">Production & Cloudflare</h3>
              <p
                style={{
                  fontSize: 12,
                  color: 'var(--muted)',
                  margin: '4px 0 12px 0',
                  lineHeight: 1.4,
                }}
              >
                1-click export to pure static HTML/CSS, or stage directly for
                Cloudflare Pages edge hosting.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button
                  type="button"
                  className="button"
                  disabled={exporting || deploying}
                  onClick={handleExportStatic}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    fontSize: 12,
                  }}
                >
                  {exporting
                    ? 'Building dist/…'
                    : '📦 Build Static Site (dist/)'}
                </button>
                <button
                  type="button"
                  className="button primary"
                  disabled={exporting || deploying}
                  onClick={handleDeployCloudflare}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    fontSize: 12,
                  }}
                >
                  {deploying
                    ? 'Deploying to Cloudflare…'
                    : '⚡ Deploy to Cloudflare Pages'}
                </button>
              </div>

              {deployResult && (
                <div
                  className={`notice ${deployResult.ok ? 'good' : 'bad'}`}
                  style={{ marginTop: 10, fontSize: 11, padding: '8px 10px' }}
                >
                  {deployResult.message}
                  {deployResult.ok && deployResult.url && (
                    <div style={{ marginTop: 6, fontWeight: 600 }}>
                      Live Edge Preview:{' '}
                      <a
                        href={deployResult.url}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          color: 'inherit',
                          textDecoration: 'underline',
                        }}
                      >
                        {deployResult.url} ↗
                      </a>
                    </div>
                  )}
                  {!deployResult.ok && (
                    <div
                      style={{
                        marginTop: 8,
                        paddingTop: 8,
                        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 4,
                      }}
                    >
                      <span
                        style={{
                          alignSelf: 'flex-start',
                          fontSize: 9,
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: 0.5,
                          padding: '1px 6px',
                          borderRadius: 4,
                          background: 'rgba(239, 68, 68, 0.2)',
                          color: '#f87171',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                        }}
                      >
                        Coming Soon / Setup Required
                      </span>
                      <span
                        style={{
                          fontSize: 10,
                          color: 'var(--muted)',
                          lineHeight: 1.35,
                        }}
                      >
                        To deploy directly to Cloudflare Pages, run{' '}
                        <code className="mono">npx wrangler login</code> in your
                        terminal or configure{' '}
                        <code className="mono">CLOUDFLARE_API_TOKEN</code> in
                        your environment. In the meantime, your static site is
                        built and ready in the{' '}
                        <code className="mono">dist/</code> folder.
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </aside>
        </div>
      ) : null}

      {/* Bottom Full-Width Mac Download Bar */}
      <div className="mac-download-fullwidth-bar">
        <div className="mac-download-left">
          <ZipArchiveIcon size={28} />
          <div className="mac-download-info">
            <strong className="mac-download-title">
              {build?.zip
                ? build.zip.split('/').pop()
                : 'Cauldron-darwin-arm64.zip'}
            </strong>
            <span className="mac-download-subtitle">
              Ready-to-hand-over Mac build
            </span>
          </div>
        </div>

        <div className="mac-download-middle mono">
          {build?.zip || 'out/make/zip/darwin/arm64/'}
        </div>

        <div className="mac-download-right">
          <span>Unzip Cauldron, then move the app to Applications.</span>
        </div>
      </div>
    </div>
  );
}
