import { useEffect, useState } from 'react';
import { GitBranchIcon } from './Icons';

type Props = {
  site: CauldronSite | null;
  /** Edits typed in the window that have not reached recovery storage yet. */
  unsavedBuffers: number;
  onBack: () => void;
};

/**
 * Publishing panel:
 * 2-column Git review layout (left: project title, branch badge, changed file rows with [M],
 * commit controls; right: Repository summary table + Your site stays yours).
 */
export function PublishPanel({ site, unsavedBuffers, onBack }: Props) {
  const [state, setState] = useState<Awaited<
    ReturnType<CauldronApi['repoState']>
  > | null>(null);
  const [message, setMessage] = useState('');
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deployingHost, setDeployingHost] = useState<
    'cloudflare' | 'vercel' | 'github' | null
  >(null);
  const deploying = deployingHost !== null;
  const [deployResult, setDeployResult] = useState<{
    ok: boolean;
    host?: 'cloudflare' | 'vercel' | 'github';
    message: string;
    url?: string;
    isAuthError?: boolean;
  } | null>(null);

  useEffect(() => {
    void window.cauldron.repoState().then(setState);
  }, [site?.root]);

  const send = async (push: boolean) => {
    setBusy(true);
    setResult(null);
    try {
      const outcome = await window.cauldron.publish({
        message,
        push,
        unsavedBuffers,
      });
      const commit =
        outcome.ok && outcome.commit
          ? outcome.commit
          : !outcome.ok && (outcome.committed ?? 0) > 0
            ? `Committed ${outcome.committed} file(s) locally.`
            : '';
      const upload = outcome.ok && outcome.upload ? outcome.upload : '';
      if (outcome.ok) {
        setResult({
          ok: true,
          text: [commit, upload].filter(Boolean).join('\n'),
        });
        setMessage('');
      } else {
        setResult({
          ok: false,
          text: [
            commit,
            `${outcome.problem ?? 'That did not go through.'}${outcome.details ? `\n${outcome.details}` : ''}`,
          ]
            .filter(Boolean)
            .join('\n'),
        });
      }
      // Always re-read: a commit can succeed while its upload fails, and the
      // list must not keep showing files that are already committed.
      try {
        setState(await window.cauldron.repoState());
      } catch (refreshErr) {
        const refreshMessage =
          refreshErr instanceof Error ? refreshErr.message : String(refreshErr);
        console.error(
          `[publishing] Could not refresh repository status after publish: ${refreshMessage}`,
          refreshErr,
        );
        setResult((current) => ({
          ok: current?.ok ?? false,
          text: [
            current?.text,
            `Could not refresh the repository file list (${refreshMessage}). The list shown below may be out of date.`,
          ]
            .filter(Boolean)
            .join('\n'),
        }));
      }
    } catch (err) {
      setResult({
        ok: false,
        text: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setBusy(false);
    }
  };

  const handleExportStatic = async () => {
    setExporting(true);
    setDeployResult(null);
    try {
      const res = await window.cauldron.exportStatic();
      if (res.ok) {
        setDeployResult({
          ok: true,
          message: `Static site built into ${res.distPath ?? 'dist/'}. Opened folder in Finder.`,
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

  const handleDeployHost = async (host: 'cloudflare' | 'vercel' | 'github') => {
    setDeployingHost(host);
    setDeployResult(null);
    const labels = {
      cloudflare: 'Cloudflare Pages',
      vercel: 'Vercel',
      github: 'GitHub Pages',
    } as const;
    try {
      const res =
        host === 'cloudflare'
          ? await window.cauldron.deployCloudflare(site?.name)
          : host === 'vercel'
            ? await window.cauldron.deployVercel(site?.name)
            : await window.cauldron.deployGitHubPages(site?.name);
      if (res.ok) {
        setDeployResult({
          ok: true,
          host,
          message: res.url
            ? `Deployed successfully to ${labels[host]}!`
            : (res.note ??
              `Deployed, but ${labels[host]} didn't report the address — check your dashboard.`),
          url: res.url,
        });
      } else {
        setDeployResult({
          ok: false,
          host,
          message: res.problem ?? `${labels[host]} deployment failed.`,
          isAuthError: Boolean(res.isAuthError),
        });
      }
      setState(await window.cauldron.repoState());
    } catch (e) {
      setDeployResult({
        ok: false,
        host,
        message: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setDeployingHost(null);
    }
  };

  const projectName = site?.name ?? 'No site open';

  // Export and static hosting do not need Git, so this card is shown for any open
  // site, not only a Git repository.
  const productionCard = (
    <div className="publish-sidebar-card" style={{ marginTop: 14 }}>
      <h3 className="sidebar-card-title">Production & Hosting</h3>
      <p
        style={{
          fontSize: 12,
          color: 'var(--muted)',
          margin: '4px 0 12px 0',
          lineHeight: 1.4,
        }}
      >
        1-click export to pure static HTML/CSS, or deploy directly to Cloudflare
        Pages, Vercel, or GitHub Pages.
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
          {exporting ? 'Building dist/…' : 'Build Static Site (dist/)'}
        </button>
        <button
          type="button"
          className="button primary"
          disabled={exporting || deploying}
          onClick={() => void handleDeployHost('cloudflare')}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            fontSize: 12,
          }}
        >
          {deployingHost === 'cloudflare'
            ? 'Deploying to Cloudflare…'
            : 'Deploy to Cloudflare Pages'}
        </button>
        <button
          type="button"
          className="button"
          disabled={exporting || deploying}
          onClick={() => void handleDeployHost('vercel')}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            fontSize: 12,
          }}
        >
          {deployingHost === 'vercel'
            ? 'Deploying to Vercel…'
            : 'Deploy to Vercel'}
        </button>
        <button
          type="button"
          className="button"
          disabled={exporting || deploying}
          onClick={() => void handleDeployHost('github')}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            fontSize: 12,
          }}
        >
          {deployingHost === 'github'
            ? 'Deploying to GitHub Pages…'
            : 'Deploy to GitHub Pages'}
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
          {!deployResult.ok && deployResult.isAuthError && (
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
                Setup Required
              </span>
              <span
                style={{
                  fontSize: 10,
                  color: 'var(--muted)',
                  lineHeight: 1.35,
                }}
              >
                {deployResult.host === 'vercel' ? (
                  <>
                    To deploy directly to Vercel, run{' '}
                    <code className="mono">npx vercel login</code> in your
                    terminal or configure{' '}
                    <code className="mono">VERCEL_TOKEN</code> in your
                    environment. Your static site is built and ready locally.
                  </>
                ) : deployResult.host === 'github' ? (
                  <>
                    To deploy directly to GitHub Pages, install{' '}
                    <code className="mono">gh</code> and run{' '}
                    <code className="mono">gh auth login</code> in your
                    terminal. Your static site is built and ready locally.
                  </>
                ) : (
                  <>
                    To deploy directly to Cloudflare Pages, run{' '}
                    <code className="mono">npx wrangler login</code> in your
                    terminal or configure{' '}
                    <code className="mono">CLOUDFLARE_API_TOKEN</code> in your
                    environment. Your static site is built and ready locally.
                  </>
                )}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );

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

      {site && state && !state.isRepo ? (
        <div className="publish-sidebar-column" style={{ maxWidth: 480 }}>
          {productionCard}
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
                // Only that a remote is set up; whether it can be reached is
                // known only when a push is tried.
                <span className="repo-remote-pill remote-local">
                  <span>
                    {state.remote
                      ? `Remote: ${state.remote}`
                      : 'Several remotes, none chosen'}
                  </span>
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
                className={`notice ${result.ok ? 'good' : 'bad'}`}
                role={result.ok ? 'status' : 'alert'}
                style={{ marginTop: 14, whiteSpace: 'pre-wrap' }}
              >
                {result.text}
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
                      {state.remote ??
                        (state.hasRemote ? 'several, none chosen' : 'none')}
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

            {productionCard}
          </aside>
        </div>
      ) : null}
    </div>
  );
}
