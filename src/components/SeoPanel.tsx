import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { normalizeSiteRoute } from '../status-bar';

const TITLE_RECOMMENDED_MAX = 60;
const DESCRIPTION_RECOMMENDED_MAX = 160;

type Props = {
  site: CauldronSite | null;
  currentPage?: string;
  onBack: () => void;
};

type FormValues = CauldronSeoValues;

const EMPTY_VALUES: FormValues = {
  title: '',
  description: '',
  image: '',
  imageAlt: '',
  noindex: false,
};

function valuesFromDetail(detail: CauldronSeoEntryDetail): FormValues {
  return {
    title: detail.fields.title.value,
    description: detail.fields.description.value,
    image: detail.fields.image.value,
    imageAlt: detail.fields.imageAlt.value,
    noindex: detail.fields.noindex.value,
  };
}

function storageLabel(detail: CauldronSeoEntryDetail): string {
  if (detail.storage === 'layout-props') {
    return detail.layoutFile
      ? `Layout props in ${detail.file} (rendered by ${detail.layoutFile})`
      : `Layout props in ${detail.file}`;
  }
  if (detail.storage === 'frontmatter') {
    return `Frontmatter in ${detail.file}`;
  }
  return `Literal <head> tags in ${detail.file}`;
}

export function SeoPanel({ site, currentPage = '/', onBack }: Props) {
  const [entries, setEntries] = useState<CauldronSeoEntrySummary[]>([]);
  const [publicImages, setPublicImages] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [detail, setDetail] = useState<CauldronSeoEntryDetail | null>(null);
  const [values, setValues] = useState<FormValues>(EMPTY_VALUES);
  const [saving, setSaving] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  const formHeadingId = useId();
  const titleId = useId();
  const titleHelpId = useId();
  const descId = useId();
  const descHelpId = useId();
  const imageId = useId();
  const imageHelpId = useId();
  const imageListId = useId();
  const imageAltId = useId();
  const imageAltHelpId = useId();
  const noindexId = useId();
  const noindexHelpId = useId();

  const selectedFileRef = useRef<string | null>(null);
  selectedFileRef.current = selectedFile;
  const dirtyRef = useRef(false);
  const listRequestIdRef = useRef(0);
  const readRequestIdRef = useRef(0);

  const openEntry = useCallback(
    async (file: string, preserveNotice = false) => {
      const reqId = ++readRequestIdRef.current;
      setProblem(null);
      setConflict(false);
      if (!preserveNotice) setSavedNotice(null);
      const res = await window.cauldron.seoRead(file);
      if (readRequestIdRef.current !== reqId) return;
      if ('problem' in res) {
        setProblem(res.problem);
        return;
      }
      setSelectedFile(file);
      setDetail(res);
      setValues(valuesFromDetail(res));
    },
    [],
  );

  const refreshList = useCallback(
    async (preferFile?: string | null) => {
      const reqId = ++listRequestIdRef.current;
      const res = await window.cauldron.seoList();
      if (listRequestIdRef.current !== reqId) return;
      setEntries(res.entries);
      setPublicImages(res.images);
      if (res.entries.length === 0) {
        readRequestIdRef.current += 1;
        setSelectedFile(null);
        setDetail(null);
        setValues(EMPTY_VALUES);
        return;
      }
      const normalizedRoute = normalizeSiteRoute(currentPage);
      const target =
        (preferFile && res.entries.find((e) => e.file === preferFile)?.file) ||
        res.entries.find((e) => e.route === normalizedRoute)?.file ||
        res.entries[0].file;
      await openEntry(target, Boolean(preferFile));
    },
    [currentPage, openEntry],
  );

  useEffect(() => {
    if (!site?.root) return;
    void refreshList();
  }, [refreshList, site?.root]);

  const dirty = useMemo(() => {
    if (!detail) return false;
    const base = valuesFromDetail(detail);
    return (
      values.title !== base.title ||
      values.description !== base.description ||
      values.image !== base.image ||
      values.imageAlt !== base.imageAlt ||
      values.noindex !== base.noindex
    );
  }, [detail, values]);
  dirtyRef.current = dirty;

  // Re-read from disk on window focus when no unsaved edits are in progress,
  // so edits made in an external editor show up immediately.
  useEffect(() => {
    const onFocus = () => {
      if (!site?.root || dirtyRef.current) return;
      void refreshList(selectedFileRef.current);
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refreshList, site?.root]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!detail || saving) return;

    const base = valuesFromDetail(detail);
    const changes: Partial<FormValues> = {};
    if (!detail.fields.title.locked && values.title !== base.title) {
      changes.title = values.title;
    }
    if (
      !detail.fields.description.locked &&
      values.description !== base.description
    ) {
      changes.description = values.description;
    }
    if (!detail.fields.image.locked && values.image !== base.image) {
      changes.image = values.image;
    }
    if (!detail.fields.imageAlt.locked && values.imageAlt !== base.imageAlt) {
      changes.imageAlt = values.imageAlt;
    }
    if (!detail.fields.noindex.locked && values.noindex !== base.noindex) {
      changes.noindex = values.noindex;
    }

    if (Object.keys(changes).length === 0) {
      setSavedNotice('No changes to save.');
      return;
    }

    setSaving(true);
    setProblem(null);
    setConflict(false);
    setSavedNotice(null);
    try {
      const res = await window.cauldron.seoSave({
        file: detail.file,
        baseHash: detail.hash,
        changes,
      });
      if (!res.ok) {
        if (res.conflict) {
          setConflict(true);
        }
        setProblem(res.problem ?? 'Could not save SEO changes.');
        return;
      }
      if (res.entry) {
        setDetail(res.entry);
        setValues(valuesFromDetail(res.entry));
      }
      const listed = await window.cauldron.seoList();
      setEntries(listed.entries);
      setPublicImages(listed.images);
      setSavedNotice(`Saved SEO changes to ${detail.file}.`);
    } catch (error) {
      setProblem(
        error instanceof Error ? error.message : 'Could not save SEO changes.',
      );
    } finally {
      setSaving(false);
    }
  };

  const pageEntries = entries.filter((e) => e.kind === 'page');
  const contentEntries = entries.filter((e) => e.kind === 'content');
  const totalIssues = entries.reduce(
    (sum, item) => sum + item.issues.length,
    0,
  );

  const previewTitle =
    values.title.trim() ||
    detail?.fields.title.inherited ||
    site?.name ||
    'Untitled page';
  const previewDescription =
    values.description.trim() ||
    detail?.fields.description.inherited ||
    'Add a concise 1–160 character description to control how this page appears in search results.';
  const previewPath = detail?.route ?? `/${detail?.file ?? ''}`;
  const previewImage =
    values.image.trim() || detail?.fields.image.inherited || '';
  const titleLength = values.title.trim().length;
  const descLength = values.description.trim().length;

  return (
    <div
      className="pane-body seo-panel-container"
      style={{ overflowY: 'auto', padding: 24 }}
    >
      <div className="content-header-bar">
        <div className="content-title-group">
          <h2 className="content-heading">SEO</h2>
          <span className="content-subtitle">
            Search and social metadata written straight into this site&apos;s
            own files — never a hidden store.
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

      {problem ? (
        <div className="notice bad" role="alert">
          <strong>{conflict ? 'Changed on disk.' : 'Could not save.'}</strong>{' '}
          {problem}
          {conflict && detail ? (
            <div className="notice-actions">
              <button
                className="button primary"
                type="button"
                onClick={() => void openEntry(detail.file)}
              >
                Reload from disk
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="seo-status-region" role="status" aria-live="polite">
        {savedNotice ? <div className="notice good">{savedNotice}</div> : null}
      </div>

      <div className="seo-split-workspace">
        {/* Left Route Audit Sidebar */}
        <aside className="seo-audit-sidebar" aria-label="Pages and SEO audit">
          <div className="seo-audit-header">
            <span className="collections-sidebar-header">PAGES AUDIT</span>
            <span className="seo-audit-pill">
              {totalIssues === 0
                ? 'All clear'
                : `${totalIssues} issue${totalIssues === 1 ? '' : 's'}`}
            </span>
          </div>

          {pageEntries.length === 0 && contentEntries.length === 0 ? (
            <p className="hint">No pages found in this site yet.</p>
          ) : null}

          {pageEntries.length > 0 ? (
            <div className="seo-audit-group">
              <div className="seo-audit-group-label">Pages</div>
              <ul className="seo-audit-list">
                {pageEntries.map((item) => {
                  const active = item.file === selectedFile;
                  return (
                    <li key={item.file}>
                      <button
                        type="button"
                        className={`seo-audit-item${active ? ' active' : ''}`}
                        aria-current={active ? 'true' : undefined}
                        onClick={() => void openEntry(item.file)}
                      >
                        <div className="seo-audit-item-top">
                          <span className="seo-audit-route mono">
                            {item.label}
                          </span>
                          {item.noindex ? (
                            <span className="seo-tag seo-tag-muted">
                              noindex
                            </span>
                          ) : item.issues.length === 0 ? (
                            <span className="seo-tag seo-tag-ok">Ready</span>
                          ) : (
                            <span className="seo-tag seo-tag-warn">
                              {item.issues.length}{' '}
                              {item.issues.length === 1 ? 'gap' : 'gaps'}
                            </span>
                          )}
                        </div>
                        <span className="seo-audit-sub">
                          {item.title || 'Untitled page'}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}

          {contentEntries.length > 0 ? (
            <div className="seo-audit-group">
              <div className="seo-audit-group-label">Content entries</div>
              <ul className="seo-audit-list">
                {contentEntries.map((item) => {
                  const active = item.file === selectedFile;
                  return (
                    <li key={item.file}>
                      <button
                        type="button"
                        className={`seo-audit-item${active ? ' active' : ''}`}
                        aria-current={active ? 'true' : undefined}
                        onClick={() => void openEntry(item.file)}
                      >
                        <div className="seo-audit-item-top">
                          <span className="seo-audit-route mono">
                            {item.label}
                          </span>
                          {item.issues.length === 0 ? (
                            <span className="seo-tag seo-tag-ok">Ready</span>
                          ) : (
                            <span className="seo-tag seo-tag-warn">
                              {item.issues.length}{' '}
                              {item.issues.length === 1 ? 'gap' : 'gaps'}
                            </span>
                          )}
                        </div>
                        <span className="seo-audit-sub">
                          {item.title || item.file}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
        </aside>

        {/* Main SEO Form + Live Search & Social Previews */}
        <section className="seo-editor-column">
          {!detail ? (
            <p className="hint">Select a page on the left to edit its SEO.</p>
          ) : (
            <div className="seo-editor-grid">
              <form
                className="seo-form"
                aria-labelledby={formHeadingId}
                onSubmit={(e) => void handleSubmit(e)}
              >
                <div className="seo-form-head">
                  <div>
                    <h3 id={formHeadingId} className="seo-entry-heading">
                      {detail.label}
                    </h3>
                    <p className="seo-storage-caption mono">
                      {storageLabel(detail)}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="button"
                    onClick={() => void openEntry(detail.file)}
                  >
                    Reload
                  </button>
                </div>

                <fieldset className="seo-fieldset">
                  <legend className="seo-legend">Search snippet</legend>

                  <div className="seo-field">
                    <div className="seo-label-row">
                      <label htmlFor={titleId} className="seo-label">
                        Page title
                      </label>
                      <span
                        className={`seo-counter mono${
                          titleLength > TITLE_RECOMMENDED_MAX ? ' over' : ''
                        }`}
                      >
                        {titleLength} / {TITLE_RECOMMENDED_MAX}
                        {titleLength > TITLE_RECOMMENDED_MAX ? ' · Long' : ''}
                      </span>
                    </div>
                    <input
                      id={titleId}
                      name="title"
                      type="text"
                      className="seo-input"
                      value={values.title}
                      disabled={Boolean(detail.fields.title.locked)}
                      placeholder={
                        detail.fields.title.inherited
                          ? `Inherited: ${detail.fields.title.inherited}`
                          : 'Short, specific page title (up to 60 characters)'
                      }
                      aria-describedby={titleHelpId}
                      onChange={(e) =>
                        setValues((prev) => ({
                          ...prev,
                          title: e.target.value,
                        }))
                      }
                    />
                    <span id={titleHelpId} className="seo-help">
                      {detail.fields.title.locked
                        ? `Locked: ${detail.fields.title.locked}.`
                        : 'Shown in browser tabs and Google search results. Aim for 1–60 characters.'}
                    </span>
                  </div>

                  <div className="seo-field">
                    <div className="seo-label-row">
                      <label htmlFor={descId} className="seo-label">
                        Meta description
                      </label>
                      <span
                        className={`seo-counter mono${
                          descLength > DESCRIPTION_RECOMMENDED_MAX
                            ? ' over'
                            : ''
                        }`}
                      >
                        {descLength} / {DESCRIPTION_RECOMMENDED_MAX}
                        {descLength > DESCRIPTION_RECOMMENDED_MAX
                          ? ' · Long'
                          : ''}
                      </span>
                    </div>
                    <textarea
                      id={descId}
                      name="description"
                      rows={3}
                      className="seo-textarea"
                      value={values.description}
                      disabled={Boolean(detail.fields.description.locked)}
                      placeholder={
                        detail.fields.description.inherited
                          ? `Inherited: ${detail.fields.description.inherited}`
                          : 'One or two sentences summarising this page (1–160 characters)'
                      }
                      aria-describedby={descHelpId}
                      onChange={(e) =>
                        setValues((prev) => ({
                          ...prev,
                          description: e.target.value,
                        }))
                      }
                    />
                    <span id={descHelpId} className="seo-help">
                      {detail.fields.description.locked
                        ? `Locked: ${detail.fields.description.locked}.`
                        : 'Summary shown under the title in search and social cards. Recommended 1–160 characters.'}
                    </span>
                  </div>
                </fieldset>

                <fieldset className="seo-fieldset">
                  <legend className="seo-legend">Social sharing</legend>

                  <div className="seo-field">
                    <label htmlFor={imageId} className="seo-label">
                      Share image path or URL
                    </label>
                    <input
                      id={imageId}
                      name="image"
                      type="text"
                      list={publicImages.length > 0 ? imageListId : undefined}
                      className="seo-input mono"
                      autoCorrect="off"
                      autoCapitalize="none"
                      spellCheck={false}
                      value={values.image}
                      disabled={Boolean(detail.fields.image.locked)}
                      placeholder={
                        detail.fields.image.inherited
                          ? `Inherited: ${detail.fields.image.inherited}`
                          : '/images/share-card.jpg or https://example.com/share.jpg'
                      }
                      aria-describedby={imageHelpId}
                      onChange={(e) =>
                        setValues((prev) => ({
                          ...prev,
                          image: e.target.value,
                        }))
                      }
                    />
                    {publicImages.length > 0 ? (
                      <datalist id={imageListId}>
                        {publicImages.map((imgPath) => (
                          <option key={imgPath} value={imgPath} />
                        ))}
                      </datalist>
                    ) : null}
                    <span id={imageHelpId} className="seo-help">
                      {detail.fields.image.locked
                        ? `Locked: ${detail.fields.image.locked}.`
                        : 'Written as og:image. Use a site path starting with / or a full https:// URL.'}
                    </span>
                  </div>

                  <div className="seo-field">
                    <label htmlFor={imageAltId} className="seo-label">
                      Share image alt text
                    </label>
                    <input
                      id={imageAltId}
                      name="imageAlt"
                      type="text"
                      className="seo-input"
                      value={values.imageAlt}
                      disabled={Boolean(detail.fields.imageAlt.locked)}
                      placeholder={
                        detail.fields.imageAlt.inherited
                          ? `Inherited: ${detail.fields.imageAlt.inherited}`
                          : 'Describe what is shown in the share image'
                      }
                      aria-describedby={imageAltHelpId}
                      onChange={(e) =>
                        setValues((prev) => ({
                          ...prev,
                          imageAlt: e.target.value,
                        }))
                      }
                    />
                    <span id={imageAltHelpId} className="seo-help">
                      {detail.fields.imageAlt.locked
                        ? `Locked: ${detail.fields.imageAlt.locked}.`
                        : 'Written as og:image:alt. Required by Quality checks whenever a share image is set.'}
                    </span>
                  </div>
                </fieldset>

                <fieldset className="seo-fieldset">
                  <legend className="seo-legend">Search indexing</legend>

                  <div className="seo-checkbox-row">
                    <input
                      id={noindexId}
                      name="noindex"
                      type="checkbox"
                      className="seo-checkbox"
                      checked={values.noindex}
                      disabled={Boolean(detail.fields.noindex.locked)}
                      aria-describedby={noindexHelpId}
                      onChange={(e) =>
                        setValues((prev) => ({
                          ...prev,
                          noindex: e.target.checked,
                        }))
                      }
                    />
                    <label htmlFor={noindexId} className="seo-checkbox-label">
                      Hide this page from search engines (noindex, nofollow)
                    </label>
                  </div>
                  <span id={noindexHelpId} className="seo-help">
                    {detail.fields.noindex.locked
                      ? `Locked: ${detail.fields.noindex.locked}.`
                      : 'Adds <meta name="robots" content="noindex, nofollow" /> when enabled.'}
                  </span>
                </fieldset>

                <div className="seo-form-actions">
                  <button
                    type="submit"
                    className="button primary"
                    disabled={saving}
                  >
                    {saving ? 'Saving…' : 'Save SEO changes'}
                  </button>
                  {dirty ? <span className="hint">Unsaved changes</span> : null}
                </div>
              </form>

              {/* Live Previews */}
              <div className="seo-preview-column">
                <div className="seo-preview-card">
                  <div className="seo-preview-eyebrow">
                    GOOGLE SEARCH PREVIEW
                  </div>
                  <div className="seo-serp-url">
                    {(site?.name ?? 'yoursite.example')
                      .toLowerCase()
                      .replace(/\s+/g, '')}
                    .com{previewPath}
                  </div>
                  <div className="seo-serp-title">
                    {previewTitle.slice(0, 68)}
                    {previewTitle.length > 68 ? '…' : ''}
                  </div>
                  <div className="seo-serp-desc">
                    {previewDescription.slice(0, 165)}
                    {previewDescription.length > 165 ? '…' : ''}
                  </div>
                  {values.noindex ? (
                    <div className="seo-serp-noindex">
                      Hidden from search results (noindex)
                    </div>
                  ) : null}
                </div>

                <div className="seo-preview-card">
                  <div className="seo-preview-eyebrow">SOCIAL SHARE CARD</div>
                  <div className="seo-social-card">
                    <div className="seo-social-media">
                      {previewImage ? (
                        <span className="seo-social-media-path mono">
                          {previewImage}
                        </span>
                      ) : (
                        <span className="hint">No share image set</span>
                      )}
                    </div>
                    <div className="seo-social-body">
                      <div className="seo-social-domain">
                        {site?.name ?? 'Your site'}
                      </div>
                      <div className="seo-social-title">{previewTitle}</div>
                      <div className="seo-social-desc">
                        {previewDescription.slice(0, 120)}
                        {previewDescription.length > 120 ? '…' : ''}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
