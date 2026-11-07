import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { app } from 'electron';
import type { ActionRequest, ActionResult } from './actions';

/**
 * The local connection for outside agents (plan 3.3). It speaks MCP over HTTP on
 * this computer only, needs a per-site code, and offers the same actions as the
 * interface. Nothing is exposed to the network.
 */

export type McpOptions = {
  root: string;
  siteName: string;
  run: (request: ActionRequest) => ActionResult;
  readSelection: () => unknown;
  readDesign: () => unknown;
  /** Harness hook: records every tool call an outside agent makes (ticket 18). */
  record?: (call: { name: string; args: Record<string, unknown> }) => void;
};

export type McpHandle = {
  url: string;
  code: string;
  port: number;
  close: () => void;
};

/** What outside agents asked the Cauldron connection for (plan 3.3). */
export type McpCall = { tool: string; ok: boolean; at: number };
const calls: McpCall[] = [];

export function mcpCalls(): McpCall[] {
  return [...calls];
}

function recordCall(tool: string, ok: boolean): void {
  calls.push({ tool, ok, at: Date.now() });
}

type ToolDefinition = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
};

function codeStore(): Record<string, string> {
  const file = path.join(app.getPath('userData'), 'mcp-codes.json');
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8')) as Record<string, string>;
  } catch {
    return {};
  }
}

export function accessCodeFor(root: string): string {
  const store = codeStore();
  if (store[root]) return store[root];
  const code = crypto.randomBytes(12).toString('base64url');
  store[root] = code;
  const file = path.join(app.getPath('userData'), 'mcp-codes.json');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(store, null, 2), 'utf8');
  return code;
}

const target = {
  type: 'object',
  properties: {
    file: { type: 'string', description: 'File, relative to the site root.' },
    line: { type: 'number' },
    column: { type: 'number' },
    name: { type: 'string', description: 'Element tag name, e.g. h1.' },
  },
  required: ['file', 'line', 'column', 'name'],
};

export function toolsFor(siteName: string): ToolDefinition[] {
  return [
    {
      name: 'list_pages',
      description: `List the pages in ${siteName}.`,
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'read_page_outline',
      description:
        'Read the headings of one page, with the file it lives in, each heading’s line and column, and the file hash the edit actions expect.',
      inputSchema: {
        type: 'object',
        properties: { page: { type: 'string', description: 'e.g. /about/' } },
        required: ['page'],
      },
    },
    {
      name: 'read_selection',
      description: 'What the person has selected in Cauldron right now.',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'read_design',
      description: "The site's design direction and tokens.",
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'edit_element_text',
      description:
        "Change one element's text. baseHash is the hash of the file the position came from; if the file has moved on, the change is refused or merged, never silently overwritten.",
      inputSchema: {
        type: 'object',
        properties: {
          target,
          value: { type: 'string' },
          baseHash: { type: 'string' },
        },
        required: ['target', 'value', 'baseHash'],
      },
    },
    {
      name: 'edit_element_attribute',
      description: 'Change one attribute on an element.',
      inputSchema: {
        type: 'object',
        properties: {
          target,
          attribute: { type: 'string' },
          value: { type: 'string' },
          baseHash: { type: 'string' },
        },
        required: ['target', 'attribute', 'value', 'baseHash'],
      },
    },
    {
      name: 'edit_element_style',
      description: 'Set inline CSS properties on one element.',
      inputSchema: {
        type: 'object',
        properties: {
          target,
          properties: {
            type: 'object',
            additionalProperties: { type: 'string' },
          },
          baseHash: { type: 'string' },
        },
        required: ['target', 'properties', 'baseHash'],
      },
    },
    {
      name: 'edit_css_rule',
      description: 'Set one declaration inside a CSS rule in a stylesheet.',
      inputSchema: {
        type: 'object',
        properties: {
          file: { type: 'string' },
          selector: { type: 'string' },
          property: { type: 'string' },
          value: { type: 'string' },
          baseHash: { type: 'string' },
        },
        required: ['file', 'selector', 'property', 'value', 'baseHash'],
      },
    },
    {
      name: 'create_page',
      description: 'Create a new .astro page in the site.',
      inputSchema: {
        type: 'object',
        properties: {
          page: {
            type: 'string',
            description: 'Address without a leading slash, e.g. about',
          },
          title: { type: 'string' },
        },
        required: ['page', 'title'],
      },
    },
  ];
}

function toRequest(
  name: string,
  args: Record<string, unknown>,
): ActionRequest | null {
  switch (name) {
    case 'list_pages':
      return { action: 'listPages' };
    case 'read_page_outline':
      return { action: 'readPageOutline', page: String(args.page ?? '') };
    case 'edit_element_text':
      return {
        action: 'editElementText',
        target: args.target as ActionRequest extends { target: infer T }
          ? T
          : never,
        value: String(args.value ?? ''),
        baseHash: String(args.baseHash ?? ''),
      };
    case 'edit_element_attribute':
      return {
        action: 'editElementAttribute',
        target: args.target as never,
        name: String(args.attribute ?? ''),
        value: args.value === undefined ? null : String(args.value),
        baseHash: String(args.baseHash ?? ''),
      };
    case 'edit_element_style':
      return {
        action: 'editElementStyle',
        target: args.target as never,
        properties: (args.properties ?? {}) as Record<string, string>,
        baseHash: String(args.baseHash ?? ''),
      };
    case 'edit_css_rule':
      return {
        action: 'editCssRule',
        file: String(args.file ?? ''),
        selector: String(args.selector ?? ''),
        property: String(args.property ?? ''),
        value: String(args.value ?? ''),
        baseHash: String(args.baseHash ?? ''),
      };
    case 'create_page':
      return {
        action: 'createPage',
        page: String(args.page ?? ''),
        title: String(args.title ?? ''),
      };
    default:
      return null;
  }
}

export function startMcpServer(options: McpOptions): Promise<McpHandle> {
  const code = accessCodeFor(options.root);
  const tools = toolsFor(options.siteName);

  const server = http.createServer((request, response) => {
    const send = (status: number, payload: unknown) => {
      const body = JSON.stringify(payload);
      response.writeHead(status, {
        'content-type': 'application/json',
        'content-length': Buffer.byteLength(body),
      });
      response.end(body);
    };

    const url = new URL(request.url ?? '/', 'http://127.0.0.1');
    const given =
      request.headers['x-cauldron-code'] ?? url.searchParams.get('code');

    if (request.method !== 'POST' || url.pathname !== '/mcp') {
      send(404, { error: 'Use POST /mcp' });
      return;
    }
    if (given !== code) {
      send(401, { error: 'Missing or wrong access code for this site.' });
      return;
    }

    let raw = '';
    request.setEncoding('utf8');
    request.on('data', (chunk: string) => {
      raw += chunk;
      if (raw.length > 1_000_000) request.destroy();
    });
    request.on('end', () => {
      let message: {
        id?: unknown;
        method?: string;
        params?: Record<string, unknown>;
      };
      try {
        message = JSON.parse(raw);
      } catch {
        send(400, {
          jsonrpc: '2.0',
          id: null,
          error: { code: -32700, message: 'Bad JSON' },
        });
        return;
      }

      if (!message || typeof message !== 'object' || Array.isArray(message)) {
        send(400, {
          jsonrpc: '2.0',
          id: null,
          error: {
            code: -32600,
            message: 'Expected a JSON-RPC request object.',
          },
        });
        return;
      }
      const id = message.id ?? null;
      const reply = (result: unknown) =>
        send(200, { jsonrpc: '2.0', id, result });
      const fail = (code_: number, text: string) =>
        send(200, {
          jsonrpc: '2.0',
          id,
          error: { code: code_, message: text },
        });

      switch (message.method) {
        case 'initialize':
          reply({
            protocolVersion: '2025-06-18',
            capabilities: { tools: {} },
            serverInfo: { name: 'cauldron', version: '0.0.1' },
            instructions: `Cauldron is editing ${options.siteName}. Read the design direction before changing anything.`,
          });
          return;
        case 'notifications/initialized':
          response.writeHead(202).end();
          return;
        case 'ping':
          reply({});
          return;
        case 'tools/list':
          reply({ tools });
          return;
        case 'tools/call': {
          const params = message.params ?? {};
          const name = String(params.name ?? '');
          const args = (params.arguments ?? {}) as Record<string, unknown>;
          options.record?.({ name, args });

          if (name === 'read_selection') {
            recordCall(name, true);
            reply({
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(options.readSelection(), null, 2),
                },
              ],
            });
            return;
          }
          if (name === 'read_design') {
            recordCall(name, true);
            reply({
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(options.readDesign(), null, 2),
                },
              ],
            });
            return;
          }

          const actionRequest = toRequest(name, args);
          if (!actionRequest) {
            fail(-32602, `Unknown tool: ${name}`);
            return;
          }
          try {
            const result = options.run(actionRequest);
            recordCall(name, Boolean(result.ok));
            reply({
              content: [
                { type: 'text', text: JSON.stringify(result, null, 2) },
              ],
              isError: !result.ok,
            });
          } catch (error) {
            console.error('Outside-agent action failed:', error);
            reply({
              content: [
                {
                  type: 'text',
                  text: `The action was refused: ${(error as Error).message}`,
                },
              ],
              isError: true,
            });
          }
          return;
        }
        default:
          fail(-32601, `Unknown method: ${message.method ?? ''}`);
      }
    });
  });

  return new Promise((resolve, reject) => {
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      resolve({
        url: `http://127.0.0.1:${port}/mcp`,
        code,
        port,
        close: () => server.close(),
      });
    });
  });
}
