import { useEffect, useState } from 'react';
import type { CauldronAiProvider, CauldronAiStatus } from '../cauldron-types';

const PROVIDERS: Array<{
  id: CauldronAiProvider;
  label: string;
  hint: string;
}> = [
  {
    id: 'openrouter',
    label: 'OpenRouter',
    hint: 'One key for models from Anthropic, OpenAI, Google and others.',
  },
  { id: 'anthropic', label: 'Anthropic', hint: 'Claude models.' },
  { id: 'openai', label: 'OpenAI', hint: 'GPT models.' },
  {
    id: 'ollama',
    label: 'Ollama (on this computer)',
    hint: 'Free and offline. Needs Ollama running; no key.',
  },
];

/**
 * Settings for the "Your AI key" agent (WDL-243). The key is handed to the main
 * process once and never comes back: this panel only learns whether one is saved.
 */
export function AiKeySettings({ disabled }: { disabled: boolean }) {
  const [status, setStatus] = useState<CauldronAiStatus | null>(null);
  const [model, setModel] = useState('');
  const [key, setKey] = useState('');
  const [busy, setBusy] = useState(false);
  // Open until the person closes it, so a confirmation never vanishes on save.
  const [open, setOpen] = useState<boolean | null>(null);
  const [note, setNote] = useState<{ text: string; good: boolean } | null>(
    null,
  );

  useEffect(() => {
    void window.cauldron.aiStatus().then((next) => {
      setStatus(next);
      setModel(next.settings.model);
      setOpen(!next.keys[next.settings.provider]);
    });
  }, []);

  if (!status) return null;
  const provider = status.settings.provider;
  const info = PROVIDERS.find((item) => item.id === provider) ?? PROVIDERS[0];
  const takesKey = provider !== 'ollama';
  const saved = status.keys[provider];

  const apply = (
    result:
      | { ok: true; status: CauldronAiStatus }
      | { ok: false; problem: string },
    good?: string,
  ) => {
    if (result.ok) {
      setStatus(result.status);
      setModel(result.status.settings.model);
      if (good) setNote({ text: good, good: true });
    } else setNote({ text: result.problem, good: false });
  };

  const run = async (work: () => Promise<void>) => {
    setBusy(true);
    setNote(null);
    try {
      await work();
    } finally {
      setBusy(false);
    }
  };

  return (
    <details
      className="ai-key-settings"
      open={open ?? !saved}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary>
        {info.label} · {status.settings.model} ·{' '}
        {saved ? (takesKey ? 'key saved' : 'no key needed') : 'no key yet'}
      </summary>

      <label className="ai-key-field">
        <span>Provider</span>
        <select
          aria-label="AI provider"
          value={provider}
          disabled={disabled || busy}
          onChange={(event) =>
            void run(async () =>
              apply(
                await window.cauldron.aiSettings({
                  provider: event.target.value,
                  model: '',
                }),
              ),
            )
          }
        >
          {PROVIDERS.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </label>
      <p className="hint">{info.hint}</p>

      <label className="ai-key-field">
        <span>Model</span>
        <input
          aria-label="Model id"
          value={model}
          spellCheck={false}
          disabled={disabled || busy}
          onChange={(event) => setModel(event.target.value)}
          onBlur={() => {
            if (model.trim() === status.settings.model) return;
            void run(async () =>
              apply(
                await window.cauldron.aiSettings({ provider, model }),
                'Model saved.',
              ),
            );
          }}
        />
      </label>

      {takesKey ? (
        <label className="ai-key-field">
          <span>Key</span>
          <input
            aria-label={`${info.label} key`}
            type="password"
            autoComplete="off"
            spellCheck={false}
            value={key}
            placeholder={saved ? 'Saved in your keychain' : 'Paste your key'}
            disabled={disabled || busy}
            onChange={(event) => setKey(event.target.value)}
          />
        </label>
      ) : null}

      <div className="ai-key-actions">
        {takesKey ? (
          <button
            type="button"
            className="button primary"
            disabled={disabled || busy || !key.trim()}
            onClick={() =>
              void run(async () => {
                const result = await window.cauldron.aiSaveKey(provider, key);
                if (result.ok) setKey('');
                apply(result, 'Key saved in your keychain.');
              })
            }
          >
            Save key
          </button>
        ) : null}
        <button
          type="button"
          className="button"
          disabled={disabled || busy || !saved}
          onClick={() =>
            void run(async () => {
              const result = await window.cauldron.aiTest();
              setNote(
                result.ok
                  ? { text: `${info.label} answered. Ready to go.`, good: true }
                  : { text: result.problem ?? 'The test failed.', good: false },
              );
            })
          }
        >
          {busy ? 'Working…' : 'Test'}
        </button>
        {takesKey && saved ? (
          <button
            type="button"
            className="button quiet"
            disabled={disabled || busy}
            onClick={() =>
              void run(async () =>
                apply(
                  await window.cauldron.aiRemoveKey(provider),
                  'Key removed.',
                ),
              )
            }
          >
            Remove key
          </button>
        ) : null}
      </div>

      {!status.keychain && takesKey ? (
        <p className="notice bad">
          This computer has no keychain Cauldron can use, so keys cannot be
          saved.
        </p>
      ) : null}
      {note ? (
        <p className={`notice ${note.good ? 'good' : 'bad'}`} role="status">
          {note.text}
        </p>
      ) : null}
    </details>
  );
}
