import fs from 'node:fs';
import path from 'node:path';

/**
 * Bring your own AI key (WDL-243): which provider and model the built-in chat
 * uses, and the key for it. Lives in the main process only. Keys are encrypted
 * by the operating system's keychain (Electron safeStorage) and written as one
 * `.bin` file per provider; the renderer is only ever told whether a key exists.
 *
 * Pattern adapted from Starquix (MIT, desktop/src/main.mjs `keychain`), which
 * refuses to store a secret at all when the OS cannot encrypt it.
 */

export type AiProvider = 'anthropic' | 'openai' | 'openrouter' | 'ollama';

export const AI_PROVIDERS: AiProvider[] = [
  'openrouter',
  'anthropic',
  'openai',
  'ollama',
];

export const AI_PROVIDER_LABELS: Record<AiProvider, string> = {
  openrouter: 'OpenRouter',
  anthropic: 'Anthropic',
  openai: 'OpenAI',
  ollama: 'Ollama (on this computer)',
};

/** Starting models per provider; the person can type any model id instead. */
export const DEFAULT_MODELS: Record<AiProvider, string> = {
  // Checked against each provider's own model list, 24 Nov 2026.
  openrouter: 'anthropic/claude-sonnet-5.5',
  anthropic: 'claude-sonnet-5-5',
  openai: 'gpt-6.2-sol',
  ollama: 'llama3.2',
};

export type AiSettings = { provider: AiProvider; model: string };

/** What the renderer may know: never the key, only whether one is saved. */
export type AiStatus = {
  settings: AiSettings;
  keychain: boolean;
  keys: Record<AiProvider, boolean>;
};

/** Electron's async safeStorage calls (the sync ones are deprecated in 45). */
export type Keychain = {
  isAvailable: () => Promise<boolean>;
  encrypt: (plain: string) => Promise<Buffer>;
  decrypt: (cipher: Buffer) => Promise<string>;
};

export class KeyStoreError extends Error {
  readonly code: 'no-keychain' | 'bad-key' | 'bad-provider';
  constructor(code: KeyStoreError['code'], message: string) {
    super(message);
    this.name = 'KeyStoreError';
    this.code = code;
  }
}

export function isAiProvider(value: unknown): value is AiProvider {
  return (
    typeof value === 'string' && AI_PROVIDERS.includes(value as AiProvider)
  );
}

/** Ollama runs on the person's own computer and takes no key. */
export function needsKey(provider: AiProvider): boolean {
  return provider !== 'ollama';
}

export class KeyStore {
  private readonly keysDir: string;
  private readonly settingsFile: string;
  private readonly keychain: Keychain;

  constructor(dir: string, keychain: Keychain) {
    this.keychain = keychain;
    this.keysDir = path.join(dir, 'keys');
    this.settingsFile = path.join(dir, 'settings.json');
  }

  settings(): AiSettings {
    try {
      const raw = JSON.parse(fs.readFileSync(this.settingsFile, 'utf8')) as {
        provider?: unknown;
        model?: unknown;
      };
      const provider = isAiProvider(raw.provider) ? raw.provider : 'openrouter';
      const model =
        typeof raw.model === 'string' && raw.model.trim()
          ? raw.model.trim()
          : DEFAULT_MODELS[provider];
      return { provider, model };
    } catch {
      return { provider: 'openrouter', model: DEFAULT_MODELS.openrouter };
    }
  }

  setSettings(next: { provider: unknown; model?: unknown }): AiSettings {
    if (!isAiProvider(next.provider))
      throw new KeyStoreError(
        'bad-provider',
        'Choose a provider from the list.',
      );
    const typed = typeof next.model === 'string' ? next.model.trim() : '';
    if (typed.length > 200 || /\s/.test(typed))
      throw new KeyStoreError(
        'bad-provider',
        'A model id has no spaces and is under 200 characters.',
      );
    const settings: AiSettings = {
      provider: next.provider,
      model: typed || DEFAULT_MODELS[next.provider],
    };
    fs.mkdirSync(path.dirname(this.settingsFile), { recursive: true });
    writeAtomic(this.settingsFile, `${JSON.stringify(settings, null, 2)}\n`);
    return settings;
  }

  /** A key counts only if it still decrypts: a reset keychain reads as no key. */
  async hasKey(provider: AiProvider): Promise<boolean> {
    if (!needsKey(provider)) return true;
    return (await this.readKey(provider)) !== null;
  }

  async saveKey(provider: unknown, key: unknown): Promise<void> {
    if (!isAiProvider(provider) || !needsKey(provider))
      throw new KeyStoreError('bad-provider', 'This provider takes no key.');
    const value = typeof key === 'string' ? key.trim() : '';
    if (!value || value.length > 500 || /\s/.test(value))
      throw new KeyStoreError(
        'bad-key',
        'Paste the key exactly as your provider shows it, with no spaces.',
      );
    if (!(await this.keychain.isAvailable()))
      throw new KeyStoreError(
        'no-keychain',
        'This computer has no keychain Cauldron can use, so the key was not saved.',
      );
    const cipher = await this.keychain.encrypt(value);
    fs.mkdirSync(this.keysDir, { recursive: true, mode: 0o700 });
    writeAtomic(this.keyFile(provider), cipher);
  }

  removeKey(provider: unknown): void {
    if (!isAiProvider(provider)) return;
    fs.rmSync(this.keyFile(provider), { force: true });
  }

  /** Main process only. Never send the result over IPC or into a log. */
  async readKey(provider: AiProvider): Promise<string | null> {
    if (!needsKey(provider)) return null;
    try {
      return await this.keychain.decrypt(
        fs.readFileSync(this.keyFile(provider)),
      );
    } catch {
      return null;
    }
  }

  async status(): Promise<AiStatus> {
    const keys = {} as Record<AiProvider, boolean>;
    for (const provider of AI_PROVIDERS)
      keys[provider] = await this.hasKey(provider);
    return {
      settings: this.settings(),
      keychain: await this.keychain.isAvailable(),
      keys,
    };
  }

  private keyFile(provider: AiProvider): string {
    return path.join(this.keysDir, `${provider}.bin`);
  }
}

function writeAtomic(file: string, data: string | Buffer): void {
  const temp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(temp, data, { mode: 0o600 });
  fs.renameSync(temp, file);
}
