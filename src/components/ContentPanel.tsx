import { useCallback, useEffect, useState } from 'react';
import { ChevronDownIcon } from './Icons';

type Props = {
  site: CauldronSite | null;
  /** Reports whether the open entry has typed changes that are not saved yet. */
  onUnsavedChange: (dirty: boolean) => void;
  onBack: () => void;
};

/**
 * Content Editor matching Cauldron content editor for Sunday Table mockup:
 * Left COLLECTIONS pill sidebar, large entry title, and 3-column horizontal
 * `Label | Input | Save` field rows.
 */
export function ContentPanel({ site, onUnsavedChange, onBack }: Props) {
  const [collections, setCollections] = useState<CauldronCollection[]>([]);
  const [openFile, setOpenFile] = useState<string | null>(null);
  const [entry, setEntry] = useState<CauldronEntry | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [asText, setAsText] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [conflict, setConflict] = useState<Record<string, string> | null>(null);

  const load = useCallback(async () => {
    const result = await window.cauldron.collections();
    setCollections(result.collections);
    // If no entry is open yet and there is an entry available, select the first one
    if (
      result.collections.length > 0 &&
      result.collections[0].entries.length > 0
    ) {
      const firstFile = result.collections[0].entries[0].file;
      void window.cauldron.entry(firstFile).then((entryRes) => {
        if ('hash' in entryRes) {
          setOpenFile(firstFile);
          setEntry(entryRes);
          setValues(entryRes.values);
        }
      });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, site?.root]);

  const open = async (file: string) => {
    setProblem(null);
    setSaved(null);
    setConflict(null);
    const result = await window.cauldron.entry(file);
    if ('problem' in result) {
      setProblem(result.problem);
      return;
    }
    setOpenFile(file);
    setEntry(result);
    setValues(result.values);
    setAsText(null);
  };

  const currentCollection = collections.find((collection) =>
    collection.entries.some((item) => item.file === openFile),
  );

  // Typed form values and typed plain text both count as unsaved (plan 5.1).
  const dirty =
    entry !== null &&
    (asText !== null
      ? asText !== entry.text
      : Object.keys({ ...entry.values, ...values }).some(
          (field) => (values[field] ?? '') !== (entry.values[field] ?? ''),
        ));

  useEffect(() => {
    onUnsavedChange(dirty);
    return () => onUnsavedChange(dirty);
  }, [dirty, onUnsavedChange]);

  const keepDraft = (field: string, value: string | null) => {
    if (entry && openFile)
      void window.cauldron
        .contentDraft({
          file: openFile,
          field,
          value,
          baseHash: entry.hash,
          schemaHash: entry.schemaHash,
        })
        .catch((error: unknown) => {
          const message = `That change could not be kept as a draft: ${
            error instanceof Error ? error.message : String(error)
          }`;
          console.error(message);
          setProblem(message);
        });
  };

  const save = async (change: Record<string, string>, keepMine = false) => {
    if (!openFile || !entry) return;
    setProblem(null);
    setSaved(null);
    const result = await window.cauldron.saveEntry({
      file: openFile,
      baseHash: entry.hash,
      change: { ...change, schemaHash: entry.schemaHash },
      keepMine,
    });
    if (!result.ok) {
      if (result.conflict) {
        setConflict(change);
        return;
      }
      setProblem(
        `${result.problem ?? 'That could not be saved.'} Reload the entry to see the current file.`,
      );
      return;
    }
    setConflict(null);
    keepDraft(change.field ?? 'text', null);
    // Reload first: opening an entry clears the last message, and the
    // confirmation must survive it.
    await open(openFile);
    setSaved(
      result.conflictCopy
        ? `Saved. The disk version was kept as a copy: ${result.conflictCopy}`
        : "Saved to the site's content file.",
    );
  };

  const useDisk = async () => {
    if (!openFile || !conflict) return;
    keepDraft(conflict.field ?? 'text', null);
    setConflict(null);
    await open(openFile);
  };

  const displayTitle =
    values.title ||
    entry?.values.title ||
    (openFile
      ? openFile
          .split('/')
          .pop()
          ?.replace(/\.[^.]+$/, '')
      : '') ||
    'Content Entry';

  return (
    <div
      className="pane-body content-panel-container"
      style={{ overflowY: 'auto', padding: 24 }}
    >
      {/* Header bar */}
      <div className="content-header-bar">
        <div className="content-title-group">
          <h2 className="content-heading">Content</h2>
          <span className="content-subtitle">
            Forms built from this site's own content definitions.
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

      {!site ? <p className="hint">Open a site first.</p> : null}

      {problem ? (
        <div className="notice bad" style={{ marginTop: 12 }} role="alert">
          {problem}
        </div>
      ) : null}

      {saved ? (
        <div className="notice good" style={{ marginTop: 12 }}>
          {saved}
        </div>
      ) : null}

      {conflict ? (
        <div className="notice bad" style={{ marginTop: 12 }} role="alert">
          <strong>Changed on disk.</strong> This entry changed since the form
          was opened. Nothing was overwritten.
          <div className="notice-actions">
            <button
              className="button primary"
              type="button"
              onClick={() => void save(conflict, true)}
            >
              Keep mine
            </button>
            <button
              className="button"
              type="button"
              onClick={() => void useDisk()}
            >
              Use the disk version
            </button>
          </div>
        </div>
      ) : null}

      <div className="content-split-workspace">
        {/* Left COLLECTIONS Sidebar */}
        <aside
          className="collections-sidebar"
          aria-label="Collections and entries"
        >
          <div className="collections-sidebar-header">COLLECTIONS</div>

          {collections.length === 0 ? (
            <p className="hint">This site has no content collections.</p>
          ) : null}

          {collections.map((collection) => (
            <div key={collection.name} className="collection-group">
              <div className="collection-group-title">
                <ChevronDownIcon size={12} />
                <span>
                  {collection.name.charAt(0).toUpperCase() +
                    collection.name.slice(1)}
                </span>
              </div>

              {collection.entries.length === 0 ? (
                <p className="hint" style={{ paddingLeft: 16 }}>
                  No entries.
                </p>
              ) : null}

              <ul className="collection-entries-list">
                {collection.entries.map((item) => {
                  const isSelected = openFile === item.file;
                  return (
                    <li key={item.file} className="collection-entry-item">
                      <button
                        className={`entry-pill-btn ${isSelected ? 'selected-entry-pill' : ''}`}
                        type="button"
                        onClick={() => void open(item.file)}
                      >
                        {item.id}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </aside>

        {/* Right Entry Editor Pane */}
        <main className="entry-editor-pane">
          {!entry ? (
            <div className="entry-empty-state">
              <p className="hint">Choose an entry from the sidebar to edit.</p>
            </div>
          ) : (
            <>
              {/* File Path Bar */}
              <div className="entry-file-path-bar">
                <span className="mono">{entry.file}</span>
              </div>

              {/* Form / Plain text Toggle */}
              <div className="entry-view-toggle-bar">
                <button
                  className={`toggle-tab-btn ${asText === null ? 'active-tab' : ''}`}
                  type="button"
                  onClick={() => setAsText(null)}
                  aria-pressed={asText === null}
                >
                  Form
                </button>
                <button
                  className={`toggle-tab-btn ${asText !== null ? 'active-tab' : ''}`}
                  type="button"
                  onClick={() => setAsText(entry.text)}
                  aria-pressed={asText !== null}
                >
                  Edit as plain text
                </button>
              </div>

              <div className="entry-content-divider" />

              {/* Dynamic Entry Heading */}
              <h2 className="entry-large-heading">{displayTitle}</h2>

              {asText !== null ? (
                <div className="plain-text-editor-wrap">
                  <textarea
                    rows={18}
                    value={asText}
                    onChange={(event) => {
                      setAsText(event.target.value);
                      keepDraft('text', event.target.value);
                    }}
                    className="plain-text-textarea"
                    aria-label="Entry text"
                  />
                  <div className="notice-actions" style={{ marginTop: 12 }}>
                    <button
                      className="button primary"
                      type="button"
                      onClick={() => void save({ text: asText })}
                    >
                      Save the text
                    </button>
                  </div>
                </div>
              ) : (
                /* 3-Column Horizontal Field Rows: Label | Input | Save Button */
                <div className="entry-fields-grid">
                  {(currentCollection?.fields ?? []).map((field) => {
                    const plainTextOnly =
                      field.type === 'unknown' ||
                      (field.type === 'list' && !field.options);
                    const labelText = `${field.name.toUpperCase()}${field.optional ? ' (OPTIONAL)' : ''}`;

                    return (
                      <div className="horizontal-field-row" key={field.name}>
                        {/* Column 1: Uppercase Label */}
                        <label
                          htmlFor={`content-${field.name}`}
                          className="field-row-label"
                        >
                          {labelText}
                        </label>

                        {/* Column 2: Full-Width Input */}
                        <div className="field-row-input-wrap">
                          {field.options ? (
                            <div className="content-select-wrapper">
                              <select
                                id={`content-${field.name}`}
                                value={values[field.name] ?? ''}
                                className="content-field-select"
                                onChange={(event) => {
                                  setValues((current) => ({
                                    ...current,
                                    [field.name]: event.target.value,
                                  }));
                                  keepDraft(field.name, event.target.value);
                                }}
                              >
                                <option value="">—</option>
                                {field.options.map((option) => (
                                  <option key={option} value={option}>
                                    {option}
                                  </option>
                                ))}
                              </select>
                              <ChevronDownIcon size={12} />
                            </div>
                          ) : plainTextOnly ? (
                            <span className="hint">
                              This field needs plain-text editing to keep its
                              structure.
                            </span>
                          ) : (
                            <input
                              id={`content-${field.name}`}
                              type={
                                field.type === 'number'
                                  ? 'number'
                                  : field.type === 'date'
                                    ? 'date'
                                    : 'text'
                              }
                              value={values[field.name] ?? ''}
                              className="content-field-input"
                              onChange={(event) => {
                                setValues((current) => ({
                                  ...current,
                                  [field.name]: event.target.value,
                                }));
                                keepDraft(field.name, event.target.value);
                              }}
                            />
                          )}
                        </div>

                        {/* Column 3: Save Button */}
                        <div className="field-row-action">
                          {plainTextOnly ? (
                            <button
                              className="button content-save-pill-btn"
                              type="button"
                              onClick={() => setAsText(entry.text)}
                            >
                              Edit as plain text
                            </button>
                          ) : (
                            <button
                              className="button primary content-save-pill-btn"
                              type="button"
                              onClick={() =>
                                void save({
                                  field: field.name,
                                  value: values[field.name] ?? '',
                                })
                              }
                            >
                              Save {field.name}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <p className="hint">
                Each field is saved to the site's content file when you press
                its Save button. Use plain-text editing for the entry's full
                Markdown.
              </p>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
