import { useCallback, useEffect, useState } from 'react';

type Props = {
  site: CauldronSite | null;
  onBack: () => void;
};

/**
 * Content editing (plan 3.4): a form built from the site's own content definitions,
 * a warning when the file has moved on, and plain-text editing as the fallback.
 */
export function ContentPanel({ site, onBack }: Props) {
  const [collections, setCollections] = useState<CauldronCollection[]>([]);
  const [openFile, setOpenFile] = useState<string | null>(null);
  const [entry, setEntry] = useState<CauldronEntry | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [asText, setAsText] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const load = useCallback(async () => {
    const result = await window.cauldron.collections();
    setCollections(result.collections);
  }, []);

  useEffect(() => {
    void load();
  }, [load, site?.root]);

  const open = async (file: string) => {
    setProblem(null);
    setSaved(null);
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

  const keepDraft = (field: string, value: string | null) => {
    if (entry && openFile)
      void window.cauldron.contentDraft({
        file: openFile,
        field,
        value,
        baseHash: entry.hash,
        schemaHash: entry.schemaHash,
      });
  };
  const save = async (change: Record<string, string>) => {
    if (!openFile || !entry) return;
    setProblem(null);
    const result = await window.cauldron.saveEntry({
      file: openFile,
      baseHash: entry.hash,
      change: { ...change, schemaHash: entry.schemaHash },
    });
    if (!result.ok) {
      setProblem(
        `${result.problem ?? 'That could not be saved.'} Reload the entry to see the current file.`,
      );
      return;
    }
    keepDraft(change.field ?? 'text', null);
    setSaved('Saved.');
    await open(openFile);
  };

  return (
    <div className="pane-body" style={{ overflowY: 'auto', padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>Content</h2>
        <span className="hint">
          Forms built from this site's own content definitions.
        </span>
        <span className="spacer" />
        <button className="button" type="button" onClick={onBack}>
          Back to the site
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

      <div
        style={{
          display: 'flex',
          gap: 20,
          marginTop: 16,
          alignItems: 'flex-start',
        }}
      >
        <div style={{ width: 260, flex: '0 0 260px' }}>
          {collections.length === 0 ? (
            <p className="hint">This site has no content collections.</p>
          ) : null}
          {collections.map((collection) => (
            <div key={collection.name} style={{ marginBottom: 14 }}>
              <h3 style={{ fontSize: 13, margin: '0 0 6px' }}>
                {collection.name}
              </h3>
              {collection.entries.length === 0 ? (
                <p className="hint">No entries.</p>
              ) : null}
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {collection.entries.map((item) => (
                  <li key={item.file}>
                    <button
                      className="button quiet"
                      type="button"
                      style={{
                        width: '100%',
                        justifyContent: 'flex-start',
                        marginBottom: 2,
                        background:
                          openFile === item.file
                            ? 'var(--accent-soft)'
                            : 'transparent',
                      }}
                      onClick={() => void open(item.file)}
                    >
                      {item.id}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {!entry ? (
            <p className="hint">Choose an entry to edit.</p>
          ) : (
            <>
              <div className="file-line">
                <span className="mono">{entry.file}</span>
              </div>

              <div className="notice-actions" style={{ marginBottom: 12 }}>
                <button
                  className={asText === null ? 'button' : 'button primary'}
                  type="button"
                  onClick={() => setAsText(null)}
                  aria-pressed={asText === null}
                >
                  Form
                </button>
                <button
                  className={asText !== null ? 'button' : 'button primary'}
                  type="button"
                  onClick={() => setAsText(entry.text)}
                  aria-pressed={asText !== null}
                >
                  Edit as plain text
                </button>
              </div>

              {asText !== null ? (
                <>
                  <textarea
                    rows={18}
                    value={asText}
                    onChange={(event) => {
                      setAsText(event.target.value);
                      keepDraft('text', event.target.value);
                    }}
                    style={{
                      width: '100%',
                      fontFamily:
                        'ui-monospace, SFMono-Regular, Menlo, monospace',
                      fontSize: 12.5,
                      background: 'var(--panel-sunken)',
                      color: 'var(--text)',
                      border: '1px solid var(--hairline)',
                      borderRadius: 8,
                      padding: 10,
                    }}
                    aria-label="Entry text"
                  />
                  <div className="notice-actions">
                    <button
                      className="button primary"
                      type="button"
                      onClick={() => void save({ text: asText })}
                    >
                      Save the text
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {currentCollection?.fields.map((field) => {
                    const plainTextOnly =
                      field.type === 'unknown' ||
                      (field.type === 'list' && !field.options);
                    return (
                      <div className="field" key={field.name}>
                        <label htmlFor={`content-${field.name}`}>
                          {field.name}
                          {field.optional ? ' (optional)' : ''}
                        </label>
                        {field.options ? (
                          <select
                            id={`content-${field.name}`}
                            value={values[field.name] ?? ''}
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
                            onChange={(event) => {
                              setValues((current) => ({
                                ...current,
                                [field.name]: event.target.value,
                              }));
                              keepDraft(field.name, event.target.value);
                            }}
                          />
                        )}
                        <span className="notice-actions">
                          {plainTextOnly ? (
                            <button
                              className="button"
                              type="button"
                              onClick={() => setAsText(entry.text)}
                            >
                              Edit as plain text
                            </button>
                          ) : (
                            <button
                              className="button"
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
                        </span>
                      </div>
                    );
                  })}
                  {currentCollection &&
                  currentCollection.fields.length === 0 ? (
                    <p className="hint">
                      No fields were found in this collection's definition. Use
                      plain-text editing.
                    </p>
                  ) : null}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
