import { useEffect, useState } from 'react';
import { PageOutline } from './PageOutline';
import { AssetTray } from './AssetTray';
import {
  STYLE_TOKEN_GROUPS,
  describeTokenValue,
  isTokenSelected,
  tokenChoicesFor,
} from '../inspector-tokens';
import {
  EDITING_LAYERS,
  layerStylesFor,
  type EditingLayer,
} from '../responsive-layer';

type Props = {
  site?: CauldronSite | null;
  currentPage?: string;
  direction: CauldronDirectionSummary | null;
  selection: CauldronSelection | null;
  editingLayer: EditingLayer;
  onEditingLayerChange: (layer: EditingLayer) => void;
  conflict: { file: string; reason: string; operation: unknown } | null;
  onApplyText: (value: string) => void;
  onApplyAttribute: (name: string, value: string | null) => void;
  onApplyStyle: (
    properties: Record<string, string>,
    layer?: EditingLayer,
  ) => void;
  onKeepMine: () => void;
  onUseDisk: () => void;
  onDraft: (field: string, value: string) => void;
  onNavigateToLibrary?: (targetPage: string) => void;
};

export function Inspector({
  site,
  currentPage = '/',
  direction,
  selection,
  editingLayer,
  onEditingLayerChange,
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

  const activeLayerStyles = selection
    ? layerStylesFor(selection, editingLayer)
    : {};
  const styleEntries: Array<[string, string]> =
    Object.entries(activeLayerStyles);
  const activeLayerSpec =
    EDITING_LAYERS.find((layer) => layer.id === editingLayer) ??
    EDITING_LAYERS[0];
  const visibleAttributes = selection
    ? selection.attributes.filter((attr) => attr.name !== 'data-cauldron-r')
    : [];

  return (
    <div className="inspector-container">
      {/* 3-Way Inspector Tabs */}
      <div
        className="inspector-nav-tabs"
        style={{
          display: 'flex',
          borderBottom: '1px solid var(--hairline)',
          background: 'var(--panel)',
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
            color: tab === 'element' ? 'var(--text)' : 'var(--muted)',
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
            color: tab === 'outline' ? 'var(--text)' : 'var(--muted)',
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
            color: tab === 'assets' ? 'var(--text)' : 'var(--muted)',
            cursor: 'pointer',
          }}
        >
          Photos
        </button>
      </div>

      {tab === 'outline' ? (
        <PageOutline
          site={site ?? null}
          currentPage={currentPage}
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
                      <span className="hint">
                        ⌘Enter to save · or double-click on the canvas
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="hint">
                    {selection.textEditReason ??
                      'This element holds other child elements. Select the text inside it directly to edit.'}
                  </p>
                )}
              </div>
            </section>

            {/* Styles Section */}
            <section className="inspector-accordion-section">
              <div className="inspector-section-heading">Styles</div>
              <div className="inspector-section-content">
                <div
                  className="inspector-layer-bar"
                  role="group"
                  aria-label="Editing layer"
                >
                  {EDITING_LAYERS.map((layer) => {
                    const count =
                      layer.id === 'base'
                        ? 0
                        : Object.keys(
                            selection.responsiveStyles?.[layer.id] ?? {},
                          ).length;
                    return (
                      <button
                        key={layer.id}
                        type="button"
                        className="inspector-layer-btn"
                        aria-pressed={editingLayer === layer.id}
                        title={
                          layer.mediaQuery
                            ? `Edit styles inside @media ${layer.mediaQuery}`
                            : 'Edit base styles for all widths'
                        }
                        onClick={() => onEditingLayerChange(layer.id)}
                      >
                        <span>{layer.shortLabel}</span>
                        {count > 0 ? (
                          <span className="inspector-layer-count">{count}</span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
                {activeLayerSpec.mediaQuery ? (
                  <div className="inspector-layer-note">
                    <span>
                      Writes to{' '}
                      <code className="mono">
                        @media {activeLayerSpec.mediaQuery}
                      </code>{' '}
                      in <code className="mono">cauldron/responsive.css</code> —
                      independent of preview width.
                    </span>
                    {styleEntries.length > 0 ? (
                      <button
                        type="button"
                        className="inspector-layer-clear"
                        onClick={() => {
                          const cleared: Record<string, string> = {};
                          for (const [prop] of styleEntries) cleared[prop] = '';
                          onApplyStyle(cleared, editingLayer);
                        }}
                      >
                        Clear overrides
                      </button>
                    ) : null}
                  </div>
                ) : null}

                {direction ? (
                  <div className="inspector-token-groups">
                    {STYLE_TOKEN_GROUPS.map((group) => (
                      <div
                        className="inspector-token-group"
                        key={group.heading}
                      >
                        <div className="inspector-token-group-title">
                          {group.heading}
                        </div>
                        {group.rows.map((row) => {
                          const choices = tokenChoicesFor(
                            row.property,
                            direction,
                          );
                          const currentVal = activeLayerStyles[row.property];
                          const badge = describeTokenValue(
                            row.property,
                            currentVal,
                            direction,
                          );

                          return (
                            <div
                              className="inspector-token-row"
                              key={row.property}
                            >
                              <div className="inspector-token-row-head">
                                <span className="inspector-row-label">
                                  {row.label}
                                </span>
                                {badge ? (
                                  <span
                                    className="inspector-token-badge mono"
                                    title={currentVal}
                                  >
                                    {badge}
                                  </span>
                                ) : null}
                              </div>

                              {row.kind === 'swatch' ? (
                                <div
                                  className="inspector-swatch-grid"
                                  role="group"
                                  aria-label={`${row.label} colour tokens`}
                                >
                                  {choices.map((choice) => {
                                    const active = isTokenSelected(
                                      currentVal,
                                      choice.value,
                                    );
                                    return (
                                      <button
                                        key={choice.value}
                                        type="button"
                                        className="inspector-swatch-btn"
                                        aria-label={`${row.label} colour: ${choice.title}`}
                                        aria-pressed={active}
                                        title={choice.title}
                                        style={{
                                          backgroundColor: choice.swatch,
                                        }}
                                        onClick={() =>
                                          onApplyStyle(
                                            {
                                              [row.property]: choice.value,
                                            },
                                            editingLayer,
                                          )
                                        }
                                      />
                                    );
                                  })}
                                </div>
                              ) : (
                                <div
                                  className="inspector-pill-strip"
                                  role="group"
                                  aria-label={`${row.label} tokens`}
                                >
                                  {choices.map((choice) => {
                                    const active = isTokenSelected(
                                      currentVal,
                                      choice.value,
                                    );
                                    return (
                                      <button
                                        key={choice.value}
                                        type="button"
                                        className="inspector-token-pill"
                                        aria-pressed={active}
                                        title={choice.title}
                                        onClick={() =>
                                          onApplyStyle(
                                            {
                                              [row.property]: choice.value,
                                            },
                                            editingLayer,
                                          )
                                        }
                                      >
                                        {choice.shortLabel}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                ) : null}

                {/* Explicit style overrides for the active layer */}
                {styleEntries.length > 0 ? (
                  <div className="inspector-inline-overrides">
                    <div className="inspector-token-group-title">
                      {editingLayer === 'base'
                        ? 'Inline overrides'
                        : `${activeLayerSpec.label} overrides`}
                    </div>
                    <div className="inspector-styles-grid">
                      {styleEntries.map(([name, value]) => (
                        <div
                          className="inspector-grid-row"
                          key={`${selection.id}:${editingLayer}:${name}:${value}`}
                        >
                          <label
                            htmlFor={`style-${editingLayer}-${name}`}
                            className="inspector-row-label"
                          >
                            {name}
                          </label>
                          <div className="inspector-row-control">
                            <input
                              id={`style-${editingLayer}-${name}`}
                              defaultValue={value}
                              className="inspector-row-input"
                              onChange={(event) => {
                                if (editingLayer === 'base') {
                                  onDraft(`style:${name}`, event.target.value);
                                }
                              }}
                              onBlur={(event) => {
                                if (event.target.value !== value) {
                                  onApplyStyle(
                                    { [name]: event.target.value },
                                    editingLayer,
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
                {visibleAttributes.length === 0 ? (
                  <p className="hint">No attributes on this element.</p>
                ) : null}

                <div className="inspector-styles-grid">
                  {visibleAttributes.map((attribute) => (
                    <div
                      className="inspector-grid-row"
                      key={`${selection.id}:attr:${attribute.name}:${attribute.value}`}
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
