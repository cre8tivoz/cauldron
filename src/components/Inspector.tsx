import { useEffect, useState } from 'react';

type Props = {
  selection: CauldronSelection | null;
  problem: string | null;
  conflict: { file: string; reason: string; operation: unknown } | null;
  onApplyText: (value: string) => void;
  onApplyAttribute: (name: string, value: string | null) => void;
  onApplyStyle: (properties: Record<string, string>) => void;
  onKeepMine: () => void;
  onUseDisk: () => void;
  onDraft: (field: string, value: string) => void;
};

const STYLE_FIELDS = [
  'color',
  'background-color',
  'font-family',
  'font-size',
  'font-weight',
  'line-height',
  'letter-spacing',
  'text-align',
  'padding',
  'margin',
  'gap',
  'border-radius',
  'border',
  'max-width',
  'display',
];

export function Inspector({
  selection,
  problem,
  conflict,
  onApplyText,
  onApplyAttribute,
  onApplyStyle,
  onKeepMine,
  onUseDisk,
  onDraft,
}: Props) {
  const [text, setText] = useState('');
  const [newAttribute, setNewAttribute] = useState('');
  const [newValue, setNewValue] = useState('');
  const [extraStyles, setExtraStyles] = useState<string[]>([]);

  useEffect(() => {
    setText(selection?.text ?? '');
    setExtraStyles([]);
  }, [selection?.id, selection?.text]);

  if (!selection) {
    return (
      <>
        <div className="pane-header">Element</div>
        <div className="pane-body">
          <p className="hint">
            Click something in the preview to edit its text, settings and
            styles. Changes are written straight into the site's own Astro
            files.
          </p>
        </div>
      </>
    );
  }

  const commitText = () => {
    if (text !== selection.text) onApplyText(text);
  };

  const styleEntries: Array<[string, string]> = Object.entries(selection.style);
  const configured = new Set([
    ...styleEntries.map(([name]) => name),
    ...extraStyles,
  ]);
  const spare = STYLE_FIELDS.filter((name) => !configured.has(name));

  return (
    <>
      <div className="pane-header">
        Element
        <span className="site-meta">&lt;{selection.name}&gt;</span>
      </div>
      <div className="pane-body">
        <div className="file-line">
          <span className="mono">{selection.file}</span>
          <span>
            line {selection.line}:{selection.column}
          </span>
        </div>

        {conflict ? (
          <div className="notice bad" role="alert">
            <strong>Changed on disk.</strong> {conflict.reason}
            <div className="notice-actions">
              <button
                className="button primary"
                type="button"
                onClick={onKeepMine}
              >
                Keep mine
              </button>
              <button className="button" type="button" onClick={onUseDisk}>
                Use the disk version
              </button>
            </div>
          </div>
        ) : null}

        {problem ? (
          <div className="notice bad" role="alert">
            {problem}
          </div>
        ) : null}

        <div className="section">
          <h3>Text</h3>
          {selection.textEditable ? (
            <div className="field">
              <textarea
                rows={4}
                value={text}
                onChange={(event) => {
                  setText(event.target.value);
                  onDraft('text', event.target.value);
                }}
                onBlur={commitText}
                onKeyDown={(event) => {
                  if (
                    event.key === 'Enter' &&
                    (event.metaKey || event.ctrlKey)
                  ) {
                    event.preventDefault();
                    commitText();
                  }
                }}
                aria-label="Element text"
              />
              <span className="hint">⌘↩ to save</span>
            </div>
          ) : (
            <p className="hint">
              This element holds other elements, so it has no text of its own.
              Select the text inside it instead.
            </p>
          )}
        </div>

        <div className="section">
          <h3>Settings</h3>
          {selection.attributes.length === 0 ? (
            <p className="hint">No settings on this element.</p>
          ) : null}
          {selection.attributes.map((attribute) => (
            <div className="field" key={attribute.name}>
              <label htmlFor={`attr-${attribute.name}`}>{attribute.name}</label>
              <input
                id={`attr-${attribute.name}`}
                defaultValue={attribute.value}
                onBlur={(event) => {
                  if (event.target.value !== attribute.value) {
                    onApplyAttribute(attribute.name, event.target.value);
                  }
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') event.currentTarget.blur();
                }}
              />
            </div>
          ))}

          <div className="field">
            <label htmlFor="new-attribute">Add a setting</label>
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                id="new-attribute"
                placeholder="name"
                value={newAttribute}
                onChange={(event) => setNewAttribute(event.target.value)}
              />
              <input
                placeholder="value"
                value={newValue}
                onChange={(event) => setNewValue(event.target.value)}
                aria-label="Setting value"
              />
              <button
                className="button"
                type="button"
                disabled={newAttribute.trim() === ''}
                onClick={() => {
                  onApplyAttribute(newAttribute.trim(), newValue);
                  setNewAttribute('');
                  setNewValue('');
                }}
              >
                Add
              </button>
            </div>
          </div>
        </div>

        <div className="section">
          <h3>Styles</h3>
          {styleEntries.length === 0 && extraStyles.length === 0 ? (
            <p className="hint">No inline styles yet. Add one below.</p>
          ) : null}

          {styleEntries.map(([name, value]) => (
            <div className="field" key={name}>
              <label htmlFor={`style-${name}`}>{name}</label>
              <input
                id={`style-${name}`}
                defaultValue={value}
                onBlur={(event) => {
                  if (event.target.value !== value) {
                    onApplyStyle({ [name]: event.target.value });
                  }
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') event.currentTarget.blur();
                }}
              />
            </div>
          ))}

          {extraStyles.map((name) => (
            <div className="field" key={name}>
              <label htmlFor={`style-new-${name}`}>{name}</label>
              <input
                id={`style-new-${name}`}
                placeholder="value"
                onBlur={(event) => {
                  if (event.target.value.trim() !== '') {
                    onApplyStyle({ [name]: event.target.value });
                  }
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') event.currentTarget.blur();
                }}
              />
            </div>
          ))}

          <div className="field">
            <label htmlFor="add-style">Add a style</label>
            <select
              id="add-style"
              value=""
              onChange={(event) => {
                const name = event.target.value;
                if (name) setExtraStyles((current) => [...current, name]);
              }}
            >
              <option value="">Choose a property…</option>
              {spare.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </>
  );
}
