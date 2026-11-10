import { useEffect, useState } from 'react';
import { PageOutline } from './PageOutline';
import { AssetTray } from './AssetTray';

type Props = {
  site?: CauldronSite | null;
  direction: CauldronDirectionSummary | null;
  selection: CauldronSelection | null;
  conflict: { file: string; reason: string; operation: unknown } | null;
  onApplyText: (value: string) => void;
  onApplyAttribute: (name: string, value: string | null) => void;
  onApplyStyle: (properties: Record<string, string>) => void;
  onKeepMine: () => void;
  onUseDisk: () => void;
  onDraft: (field: string, value: string) => void;
  onNavigateToLibrary?: (targetPage: string) => void;
};

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
  site,
  direction,
  selection,
  conflict,
  onApplyText,
  onApplyAttribute,
  onApplyStyle,
  onKeepMine,
  onUseDisk,
  onDraft,
  onNavigateToLibrary,
}: Props) {
  const [tab, setTab] = useState<'element' | 'outline' | 'assets'>('element');
  const [text, setText] = useState('');
  const [newAttribute, setNewAttribute] = useState('');
  const [newValue, setNewValue] = useState('');

  useEffect(() => {
    setText(selection?.text ?? '');
    if (selection) {
      setTab('element');
    }
  }, [selection?.id, selection?.text]);

  const commitText = () => {
    if (selection && text !== selection.text) onApplyText(text);
  };

  const styleEntries: Array<[string, string]> = selection
    ? Object.entries(selection.style)
    : [];

  // Determine current color for swatch display
  const currentColor =
    (selection && selection.style.color) ||
    (direction?.colours ? Object.values(direction.colours)[0] : '#2a1712');

  return (
    <div className="inspector-container">
      {/* 3-Way Inspector Tabs */}
      <div
        className="inspector-nav-tabs"
        style={{
          display: 'flex',
          borderBottom: '1px solid var(--hairline)',
          background: 'var(--surface, #1e1e1e)',
          flexShrink: 0,
        }}
      >
        <button
          type="button"
          onClick={() => setTab('element')}
          style={{
            flex: 1,
            padding: '7px 4px',
            fontSize: 11,
            fontWeight: 600,
            border: 'none',
            borderBottom:
              tab === 'element'
                ? '2px solid var(--accent, #3182ce)'
                : '2px solid transparent',
            background: 'transparent',
            color: tab === 'element' ? 'var(--fg, #fff)' : 'var(--muted)',
            cursor: 'pointer',
          }}
        >
          Element
        </button>
        <button
          type="button"
          onClick={() => setTab('outline')}
          style={{
            flex: 1,
            padding: '7px 4px',
            fontSize: 11,
            fontWeight: 600,
            border: 'none',
            borderBottom:
              tab === 'outline'
                ? '2px solid var(--accent, #3182ce)'
                : '2px solid transparent',
            background: 'transparent',
            color: tab === 'outline' ? 'var(--fg, #fff)' : 'var(--muted)',
            cursor: 'pointer',
          }}
        >
          Outline
        </button>
        <button
          type="button"
          onClick={() => setTab('assets')}
          style={{
            flex: 1,
            padding: '7px 4px',
            fontSize: 11,
            fontWeight: 600,
            border: 'none',
            borderBottom:
              tab === 'assets'
                ? '2px solid var(--accent, #3182ce)'
                : '2px solid transparent',
            background: 'transparent',
            color: tab === 'assets' ? 'var(--fg, #fff)' : 'var(--muted)',
            cursor: 'pointer',
          }}
        >
          Photos
        </button>
      </div>

      {tab === 'outline' ? (
        <PageOutline
          site={site ?? null}
          onNavigateToLibrary={onNavigateToLibrary}
        />
      ) : tab === 'assets' ? (
        <AssetTray
          site={site ?? null}
          direction={direction}
          selection={selection}
          onApplyAttribute={onApplyAttribute}
        />
      ) : !selection ? (
        <>
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
        </>
      ) : (
        <>
          {/* Element Header */}
          <div className="inspector-header-block">
            <div className="inspector-eyebrow-row">
              <span className="inspector-eyebrow">ELEMENT</span>
            </div>
            <div className="inspector-title-row">
              <h2 className="inspector-element-tag">
                &lt;{selection.name}&gt;
              </h2>
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

            {/* Text Section */}
            <section className="inspector-accordion-section">
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  color: 'var(--text)',
                  marginBottom: 8,
                }}
              >
                Text
              </div>
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
            </section>

            {/* Styles Section */}
            <section className="inspector-accordion-section">
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  color: 'var(--text)',
                  marginBottom: 8,
                }}
              >
                Styles
              </div>
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
              </div>
            </section>

            {/* Settings (Attributes) Section */}
            <section className="inspector-accordion-section">
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  color: 'var(--text)',
                  marginBottom: 8,
                }}
              >
                Settings
              </div>
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
                            if (event.key === 'Enter')
                              event.currentTarget.blur();
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
            </section>
          </div>
        </>
      )}
    </div>
  );
}
