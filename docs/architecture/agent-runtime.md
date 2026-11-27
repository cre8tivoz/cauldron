# Agent runtime: models, keys and the edit boundary

The Agent column in Cauldron can work in two ways. Both start from the same prompt, both edit the site through the same checked actions, and both report into the same run list.

The code is in `src/main/agent.ts` (the CLI path), `src/main/ai-agent.ts` (your own key), `src/main/ai-keys.ts` and `src/main/mcp.ts`, with the UI in `src/components/AgentPanel.tsx` and `src/components/AiKeySettings.tsx`.

## Way one: drive an installed agent CLI

The picker offers Claude Code, Codex and Hermes. `runAgent()` spawns the installed binary with the working directory set to the site root, resolving it with `resolveToolPath()` first — a GUI-launched app does not inherit your terminal's `PATH`.

| Agent       | Invocation                                                                                  |
| ----------- | ------------------------------------------------------------------------------------------- |
| Claude Code | `claude -p <prompt> --output-format stream-json --verbose --permission-mode acceptEdits`    |
| Codex       | `codex exec <prompt> --json -C <site root> --skip-git-repo-check --sandbox workspace-write` |
| Hermes      | `hermes -p cauldron chat -q <prompt> --format stream-json -Q`                               |

Each is also given Cauldron's own connection to the site, so it can call the checked actions rather than editing files behind the app's back:

- **Claude** gets `--mcp-config` with an `http` server entry named `cauldron`, plus `--allowedTools mcp__cauldron__*`.
- **Codex** gets per-run config overrides — `mcp_servers.cauldron.url`, the `x-cauldron-code` header, `startup_timeout_sec=60` and `default_tools_approval_mode="approve"`. The overrides apply to that run only; your own Codex config is untouched.
- **Hermes** needs its `cauldron` profile so the connection is offered. Cauldron writes `CAULDRON_MCP_URL` and `CAULDRON_MCP_CODE` into the child environment and into that profile's `.env`.

A follow-up message resumes the same session: `--resume <sessionId>` for Claude, `codex exec resume` for Codex, `--resume` for Hermes. A spawned job is stopped after ten minutes (`DEFAULT_AGENT_TIMEOUT_MS`); Cancel and timeout both signal the process group with SIGTERM, then SIGKILL two seconds later if it has not gone.

## Way two: your own API key

The "Your AI key" option runs in the main process using the Vercel AI SDK, with the same action tools available to it. It supports OpenRouter, Anthropic and OpenAI natively, and Ollama on your own machine, which needs no key.

It runs up to 24 steps with one retry, and reports progress as it goes. A follow-up keeps up to 40 messages of history per open site, trimmed to start at a user message so a tool result is never sent without its call. That history lives in memory for the session and is never written to disk.

## Where keys live

`KeyStore` keeps two things in the app's own user-data folder, never in your site:

- `ai/settings.json` — the chosen provider and model. A missing or unreadable file falls back to OpenRouter and its default model.
- `ai/keys/<provider>.bin` — one encrypted blob per provider.

The keys directory is created with mode `0o700`, and each blob is written to a temporary file with mode `0o600` and then renamed, so a partial write never leaves a readable key behind. Encryption is Electron's `safeStorage`, reached through a small `Keychain` interface so `KeyStore` itself never handles plaintext on disk. When the OS cannot offer encryption, saving is refused rather than falling back to something weaker, and the settings panel says so.

A stored key counts as present only if it still decrypts, so a reset keychain reads as "no key". The renderer receives a status object only — provider, model, whether the keychain works, and a boolean per provider. No decrypted key ever crosses to the renderer, and failures are logged by classification (`authorization`, `credits`, `model`) rather than by provider error text, which can echo request headers.

Model ids must be a single token under 200 characters; keys must be non-empty, under 500 characters, and contain no spaces.

## The edit boundary

[ADR 0006](../adr/0006-actions-run-inside-the-app.md) is the governing decision: shared actions run inside Cauldron, so a site can only be edited while Cauldron is open. `buildPrompt()` tells the agent to make every change through Cauldron's tools, and not to drive the app's interface or invent another way in.

Those tools are offered over a local MCP server in `src/main/mcp.ts`:

- it listens on `127.0.0.1` only, on an OS-assigned port, at `POST /mcp`;
- a fresh 24-byte access code is generated per session, held in memory, and compared with `crypto.timingSafeEqual`; a missing or wrong code gets `401`;
- request bodies over 1,000,000 characters are dropped;
- a legacy world-readable `mcp-codes.json` from an earlier version is deleted at startup.

The tool set is deliberately narrow: `list_pages`, `read_page_outline`, `read_selection`, `read_design`, `edit_element_text`, `edit_element_attribute`, `edit_element_style`, `edit_css_rule`, `create_page`, and gated `read_source` / `write_source`.

Both paths — MCP for a CLI agent, direct calls for your own key — map to the same `ActionRequest` and run through `runAction()` in `src/main/actions.ts`. The protections live there, not in the tools:

- writes take a `baseHash`, and a stale hash is refused rather than merged;
- `write_source` can only create a file with an explicit null hash, using an exclusive atomic create;
- source paths are limited to `.astro` files under `src/pages`, `src/layouts` or `src/components`, and `.css` files under `src/styles`;
- there is no general filesystem tool, no package-file access, and no asset writing.

Writes through the connection are claimed for the active run, and `sharedAction()` records before and after text and hashes in history with that run's id. That is what makes a run reviewable and undoable. If an agent writes a file outside the checked actions, Cauldron works that out from the tool's file paths and from comparing the disk, and labels those files as edited outside the checked actions.

## When a run fails

Streamed output is normalised into events, and any of the following becomes an error: a non-zero exit code, an `api_error`, a non-success subtype, an error part in the stream, or Claude's `is_error: true`. That last one matters — an expired login can arrive as exit code 0 with subtype `success` and `is_error: true`, and it still counts as a failure.

`finish()` prefers a recorded error over a zero exit, and reports cancellation, timeout, spawn failure and non-zero exit as errors. A failed run is recorded as failed, the preview reloads, and the panel shows it as a failure; it is never presented as a success. `src/main/e2e.ts` proves these cases against the installed CLIs and against stand-in fixtures, including that a whole-run undo restores the files.

## What is deliberately not here

There is no telemetry, analytics or tracking. There is no cloud relay: the MCP connection binds to loopback, your key chat talks straight to the provider you chose, and deploys use your own local credentials. And there is no background engine — nothing keeps working on a site while Cauldron is closed, because that is what ADR 0006 rules out.
