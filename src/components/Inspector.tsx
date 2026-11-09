import { useEffect, useState } from 'react';
import { ChevronDownIcon } from './Icons';

type Props = {
  direction: CauldronDirectionSummary | null;
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

/** Which style properties can use the direction's tokens, and how they map (plan 4.2). */
const TOKEN_STYLES: Record<
  string,
  (
    direction: CauldronDirectionSummary,
  ) => Array<{ label: string; value: string }>
> = {
  color: (direction) =>
    Object.entries(direction.colours).map(([name, value]) => ({
      label: `${name} ${value}`,
      value: `var(--cauldron-c-${name})`,
    })),
  'background-color': (direction) =>
    Object.entries(direction.colours).map(([name, value]) => ({
      label: `${name} ${value}`,
      value: `var(--cauldron-c-${name})`,
    })),
  'font-family': (direction) => [
    {
      label: `display — ${direction.fonts.display}`,
      value: 'var(--cauldron-font-display)',
    },
    {
      label: `body — ${direction.fonts.body}`,
      value: 'var(--cauldron-font-body)',
    },
    ...(direction.fonts.detail
      ? [
          {
            label: `detail — ${direction.fonts.detail}`,
            value: 'var(--cauldron-font-detail)',
          },
        ]
      : []),
  ],
  'font-size': (direction) =>
    direction.typeScale.map((size, index) => ({
      label: `size-${index + 1} · ${size}px`,
      value: `var(--cauldron-size-${index + 1})`,
    })),
  padding: (direction) =>
    direction.spacing.map((step, index) => ({
      label: `space-${index} · ${step}px`,
      value: `var(--cauldron-space-${index})`,
    })),
  margin: (direction) =>
    direction.spacing.map((step, index) => ({
      label: `space-${index} · ${step}px`,
      value: `var(--cauldron-space-${index})`,
    })),
  gap: (direction) =>
    direction.spacing.map((step, index) => ({
      label: `space-${index} · ${step}px`,
      value: `var(--cauldron-space-${index})`,
    })),
  'border-radius': (direction) =>
    direction.radii.map((radius, index) => ({
      label: `radius-${index} · ${radius}px`,
      value: `var(--cauldron-radius-${index})`,
    })),
};

export function Inspector({
  direction,
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
  const [textOpen, setTextOpen] = useState(true);
  const [stylesOpen, setStylesOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(true);

  useEffect(() => {
    setText(selection?.text ?? '');
    setExtraStyles([]);
  }, [selection?.id, selection?.text]);

  if (!selection) {
    return (
      <div className="inspector-container">
        <div className="pane-header">
          <span className="inspector-eyebrow">ELEMENT</span>
        </div>
        <div className="pane-body">
          <div className="inspector-empty-state">
            <span className="inspector-empty-icon" aria-hidden="true">
              ↖
            </span>
            <p className="hint">
              Click any element in the live preview to inspect and edit its
              typography, spacing, tokens, and content.
            </p>
          </div>
        </div>
      </div>
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

  // Determine current color for swatch display
  const currentColor =
    selection.style.color ||
    (direction?.colours ? Object.values(direction.colours)[0] : '#2a1712');

  return (
    <div className="inspector-container">
      {/* Element Header */}
      <div className="inspector-header-block">
        <div className="inspector-eyebrow-row">
          <span className="inspector-eyebrow">ELEMENT</span>
        </div>
        <div className="inspector-title-row">
          <h2 className="inspector-element-tag">&lt;{selection.name}&gt;</h2>
        </div>
        <div className="file-line inspector-file-bar">
          <span className="mono inspector-file-name" title={selection.file}>
            {selection.file}
          </span>
          <span className="inspector-line-no">
            line {selection.line}:{selection.column}
          </span>
        </div>
      </div>

      <div className="pane-body inspector-scroll-body">
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

        {/* Collapsible Text Section */}
        <section className="inspector-accordion-section">
          <button
            type="button"
            className="inspector-section-toggle"
            onClick={() => setTextOpen((v) => !v)}
            aria-expanded={textOpen}
          >
            <ChevronDownIcon size={12} />
            <strong>Text</strong>
          </button>

          {textOpen ? (
            <div className="inspector-section-content">
              {selection.textEditable ? (
                <div className="field inspector-text-field">
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
                    className="inspector-textarea"
                  />
                  <div className="field-caption">
                    <span className="hint">⌘Enter to save</span>
                  </div>
                </div>
              ) : (
                <p className="hint">
                  This element holds other child elements. Select the text
                  inside it directly to edit.
                </p>
              )}
            </div>
          ) : null}
        </section>

        {/* Collapsible Styles Section (2-Column Horizontal Rows) */}
        <section className="inspector-accordion-section">
          <button
            type="button"
            className="inspector-section-toggle"
            onClick={() => setStylesOpen((v) => !v)}
            aria-expanded={stylesOpen}
          >
            <ChevronDownIcon size={12} />
            <strong>Styles</strong>
          </button>

          {stylesOpen ? (
            <div className="inspector-section-content">
              {direction ? (
                <div className="inspector-styles-grid">
                  {Object.keys(TOKEN_STYLES).map((property) => {
                    const isColorProp =
                      property === 'color' || property === 'background-color';
                    const tokenOptions = TOKEN_STYLES[property](direction);
                    const matchingInline = selection.style[property];

                    return (
                      <div
                        className="inspector-grid-row"
                        key={`token-${property}`}
                      >
                        <label
                          htmlFor={`token-${property}`}
                          className="inspector-row-label"
                        >
                          {property}
                        </label>
                        <div className="inspector-row-control">
                          {isColorProp ? (
                            <span
                              className="color-swatch-badge"
                              style={{
                                background: matchingInline || currentColor,
                              }}
                              aria-hidden="true"
                            />
                          ) : null}
                          <select
                            id={`token-${property}`}
                            defaultValue=""
                            className="inspector-row-select"
                            onChange={(event) => {
                              if (event.target.value !== '')
                                onApplyStyle({
                                  [property]: event.target.value,
                                });
                              event.target.value = '';
                            }}
                          >
                            <option value="">
                              {matchingInline || 'Choose token…'}
                            </option>
                            {tokenOptions.map((token) => (
                              <option key={token.value} value={token.value}>
                                {token.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : null}

              {/* Explicit inline styles */}
              {styleEntries.length > 0 ? (
                <div
                  className="inspector-styles-grid"
                  style={{ marginTop: 10 }}
                >
                  {styleEntries.map(([name, value]) => (
                    <div className="inspector-grid-row" key={name}>
                      <label
                        htmlFor={`style-${name}`}
                        className="inspector-row-label"
                      >
                        {name}
                      </label>
                      <div className="inspector-row-control">
                        <input
                          id={`style-${name}`}
                          defaultValue={value}
                          className="inspector-row-input"
                          onChange={(event) =>
                            onDraft(`style:${name}`, event.target.value)
                          }
                          onBlur={(event) => {
                            if (event.target.value !== value) {
                              onApplyStyle({ [name]: event.target.value });
                            }
                          }}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter')
                              event.currentTarget.blur();
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              {/* Extra added style rows */}
              {extraStyles.length > 0 ? (
                <div
                  className="inspector-styles-grid"
                  style={{ marginTop: 10 }}
                >
                  {extraStyles.map((name) => (
                    <div className="inspector-grid-row" key={name}>
                      <label
                        htmlFor={`style-new-${name}`}
                        className="inspector-row-label"
                      >
                        {name}
                      </label>
                      <div className="inspector-row-control">
                        <input
                          id={`style-new-${name}`}
                          placeholder="value"
                          className="inspector-row-input"
                          onChange={(event) =>
                            onDraft(`style:${name}`, event.target.value)
                          }
                          onBlur={(event) => {
                            if (event.target.value.trim() !== '') {
                              onApplyStyle({ [name]: event.target.value });
                            }
                          }}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter')
                              event.currentTarget.blur();
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              {/* Add a style picker */}
              <div className="inspector-add-style-row">
                <label htmlFor="add-style" className="inspector-add-label">
                  Add a style
                </label>
                <div className="inspector-select-wrap">
                  <select
                    id="add-style"
                    value=""
                    className="inspector-add-select"
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
                  <ChevronDownIcon size={12} />
                </div>
              </div>
            </div>
          ) : null}
        </section>

        {/* Collapsible Settings (Attributes) Section */}
        <section className="inspector-accordion-section">
          <button
            type="button"
            className="inspector-section-toggle"
            onClick={() => setSettingsOpen((v) => !v)}
            aria-expanded={settingsOpen}
          >
            <ChevronDownIcon size={12} />
            <strong>Settings</strong>
          </button>

          {settingsOpen ? (
            <div className="inspector-section-content">
              {selection.attributes.length === 0 ? (
                <p className="hint">No attributes on this element.</p>
              ) : null}

              <div className="inspector-styles-grid">
                {selection.attributes.map((attribute) => (
                  <div
                    className="inspector-grid-row"
                    key={`attr-row-${attribute.name}`}
                  >
                    <label
                      htmlFor={`attr-${attribute.name}`}
                      className="inspector-row-label"
                    >
                      {attribute.name}
                    </label>
                    <div className="inspector-row-control">
                      <input
                        id={`attr-${attribute.name}`}
                        defaultValue={attribute.value}
                        className="inspector-row-input"
                        onChange={(event) =>
                          onDraft(
                            `attribute:${attribute.name}`,
                            event.target.value,
                          )
                        }
                        onBlur={(event) => {
                          if (event.target.value !== attribute.value) {
                            onApplyAttribute(
                              attribute.name,
                              event.target.value,
                            );
                          }
                        }}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') event.currentTarget.blur();
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Add setting row */}
              <div className="inspector-add-setting-box">
                <label
                  htmlFor="new-attribute"
                  className="inspector-row-label"
                  style={{ marginBottom: 6, display: 'block' }}
                >
                  Add a setting
                </label>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    id="new-attribute"
                    placeholder="name"
                    value={newAttribute}
                    className="inspector-row-input"
                    style={{ flex: 1 }}
                    onChange={(event) => setNewAttribute(event.target.value)}
                  />
                  <input
                    placeholder="value"
                    value={newValue}
                    className="inspector-row-input"
                    style={{ flex: 1.4 }}
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
          ) : null}
        </section>
      </div>
    </div>
  );
}
