import fs from 'node:fs';
import path from 'node:path';
import { DIRECTIONS, tokensCss, writeDirection } from './directions';
import { getTemplateFiles, STARTER_TEMPLATES } from './templates';

/**
 * Persistent recent-project library and new Astro project creation. Every
 * function takes its storage paths explicitly, so nothing here needs Electron
 * and tests can isolate their storage. Removing a recent entry never touches
 * the project on disk.
 */

export type RecentProject = {
  /** Canonical absolute path of the project folder. */
  path: string;
  name: string;
  addedAt: number;
  lastOpenedAt: number | null;
};

export type RecentLibrary = {
  projects: RecentProject[];
  /** A damaged store is reported, never silently wiped. */
  problem: string | null;
};

/** Reads the recents store. A missing file is an empty library, not an error. */
export function loadRecents(storePath: string): RecentLibrary {
  if (!fs.existsSync(storePath)) return { projects: [], problem: null };
  let raw: string;
  try {
    raw = fs.readFileSync(storePath, 'utf8');
  } catch (error) {
    return {
      projects: [],
      problem: `The project library file could not be read (${storePath}): ${error}. Fix its permissions, or remove or restore the file; your projects themselves are untouched.`,
    };
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    const validEntry = (entry: unknown): entry is RecentProject => {
      if (!entry || typeof entry !== 'object') return false;
      const item = entry as Record<string, unknown>;
      return (
        typeof item.path === 'string' &&
        item.path.length > 0 &&
        typeof item.name === 'string' &&
        typeof item.addedAt === 'number' &&
        Number.isFinite(item.addedAt) &&
        (item.lastOpenedAt === null ||
          (typeof item.lastOpenedAt === 'number' &&
            Number.isFinite(item.lastOpenedAt)))
      );
    };
    if (!Array.isArray(parsed) || !parsed.every(validEntry))
      throw new Error('not a list of complete project entries');
    return { projects: parsed as RecentProject[], problem: null };
  } catch (error) {
    return {
      projects: [],
      problem: `The project library file could not be read (${storePath}): ${error}. The file was left exactly as it is; nothing was deleted.`,
    };
  }
}

function saveRecents(storePath: string, projects: RecentProject[]): void {
  const temp = `${storePath}.cauldron-tmp`;
  fs.mkdirSync(path.dirname(storePath), { recursive: true });
  fs.writeFileSync(temp, JSON.stringify(projects, null, 2));
  fs.renameSync(temp, storePath);
}

/** The canonical, symlink-resolved form used to dedupe the same folder. */
export function canonicalProjectPath(projectPath: string): string {
  try {
    return fs.realpathSync(projectPath);
  } catch {
    const resolved = path.resolve(projectPath);
    let current = path.dirname(resolved);
    const parts = [path.basename(resolved)];
    while (current && current !== path.dirname(current)) {
      try {
        const real = fs.realpathSync(current);
        return path.join(real, ...parts);
      } catch {
        parts.unshift(path.basename(current));
        current = path.dirname(current);
      }
    }
    return resolved;
  }
}

function writeRecents(
  storePath: string,
  update: (projects: RecentProject[]) => RecentProject[] | string,
): RecentLibrary | { problem: string } {
  const library = loadRecents(storePath);
  if (library.problem) return { problem: library.problem };
  const next = update(library.projects);
  if (typeof next === 'string') return { problem: next };
  try {
    saveRecents(storePath, next);
  } catch (error) {
    return {
      problem: `The project library could not be saved (${storePath}): ${error}. Your projects themselves are untouched; the change was not written.`,
    };
  }
  return loadRecents(storePath);
}

/** Adds (or moves to the top of) the library, deduping by canonical path. */
export function addRecent(
  storePath: string,
  projectPath: string,
): RecentLibrary | { problem: string } {
  const canonical = canonicalProjectPath(projectPath);
  return writeRecents(storePath, (projects) => {
    const rest = projects.filter((entry) => entry.path !== canonical);
    const existing = projects.find((entry) => entry.path === canonical);
    rest.unshift({
      path: canonical,
      name: existing?.name ?? path.basename(canonical),
      addedAt: existing?.addedAt ?? Date.now(),
      lastOpenedAt: Date.now(),
    });
    return rest;
  });
}

/** Marks an entry as opened now and moves it to the top of the library. */
export function touchRecent(
  storePath: string,
  projectPath: string,
): RecentLibrary | { problem: string } {
  const canonical = canonicalProjectPath(projectPath);
  return writeRecents(storePath, (projects) => {
    const existing = projects.find((entry) => entry.path === canonical);
    if (!existing) return `The project ${canonical} is not in the library.`;
    return [
      { ...existing, lastOpenedAt: Date.now() },
      ...projects.filter((entry) => entry.path !== canonical),
    ];
  });
}

/**
 * Removes only the library entry. The project folder on disk is never touched.
 * The entry survives if the folder has moved, so the person still sees and can
 * remove it.
 */
export function removeRecent(
  storePath: string,
  projectPath: string,
): RecentLibrary | { problem: string } {
  const canonical = canonicalProjectPath(projectPath);
  return writeRecents(storePath, (projects) => {
    if (!projects.some((entry) => entry.path === canonical))
      return `The project ${canonical} is not in the library.`;
    return projects.filter((entry) => entry.path !== canonical);
  });
}

/** Which library entries point at folders that no longer exist. */
export function missingRecents(library: RecentProject[]): RecentProject[] {
  return library.filter((entry) => !fs.existsSync(entry.path));
}

// --- New project creation -------------------------------------------------

/** A plain, safe folder name: no separators, no dotfiles, no reserved names. */
export function validateProjectName(name: string): string | null {
  if (!name.trim()) return 'Give the project a name.';
  if (name !== name.trim()) return 'The name cannot start or end with a space.';
  if (/[/\\]/.test(name))
    return 'The name cannot contain / or \\ — it is one folder name, not a path.';
  if (name.startsWith('.')) return 'The name cannot start with a dot.';
  if (name === '.' || name === '..') return 'That is not a usable folder name.';
  // oxlint-disable-next-line no-control-regex -- control characters are exactly what is refused.
  if (/[\u0000-\u001f:]/.test(name))
    return 'The name contains a character that is not allowed in folder names.';
  if (name.length > 100) return 'The name is too long (over 100 characters).';
  return null;
}

export type CreatedProject = {
  root: string;
  name: string;
  astroVersion: string;
  /** The npm manifest name derived from the display name. */
  slug: string;
};

export type CreateProblem = { problem: string; detail: string };

/** pnpm as installed on this machine and verified for the workflow. */
export const CAULDRON_PACKAGE_MANAGER = 'pnpm@10.34.2';

/**
 * Derives an npm-manifest-safe package name from a display name. Display names
 * may keep their spaces and characters; the slug is what goes into
 * package.json (npm names must be lowercase, no spaces, limited characters).
 */
export function packageSlug(name: string): string {
  const slug = name
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^[-._]+|[-._]+$/g, '')
    .replace(/[-._]{2,}/g, '-');
  return slug || 'new-astro-site';
}

/**
 * A version string safe to pin in package.json: a plain published-looking
 * version. Anything else is refused at the create boundary, so a malformed or
 * malicious string can never reach a manifest or a template.
 */
export function validateAstroVersion(version: string): string | null {
  if (!/^\d+\.\d+\.\d+([-+.0-9A-Za-z]+)?$/.test(version))
    return 'The Astro version is not a valid published version number.';
  return null;
}

/**
 * Creates a real, ordinary, portable Astro project at `<parent>/<name>`.
 * The folder is created exclusively (a plain mkdir that fails if anything
 * already exists there — nothing is ever overwritten or written into an
 * existing folder, even under a race). No agent generation and no
 * dependencies installed here; use prepareDependencies after an explicit
 * consent step.
 */
export function createProject(options: {
  parent: string;
  name: string;
  astroVersion: string;
  template?: string;
}): { ok: true; project: CreatedProject } | CreateProblem {
  const nameProblem = validateProjectName(options.name);
  if (nameProblem) return { problem: nameProblem, detail: options.name };
  const versionProblem = validateAstroVersion(options.astroVersion);
  if (versionProblem)
    return { problem: versionProblem, detail: options.astroVersion };

  const parent = path.resolve(options.parent);
  if (!fs.existsSync(parent) || !fs.statSync(parent).isDirectory())
    return {
      problem: 'The chosen location is not an existing folder.',
      detail: parent,
    };

  // Containment: the name is one folder directly inside the chosen parent.
  const root = path.join(parent, options.name);
  if (path.dirname(root) !== parent)
    return {
      problem: 'The project folder would not sit inside the chosen location.',
      detail: root,
    };

  // Exclusive creation: `recursive: false` fails with EEXIST when something
  // (a folder, a file, or a racing process) already occupies the path, so the
  // pre-check and the mkdir together close the overwrite window. Only a
  // folder this call created is ever removed on failure.
  let ownedNewDir = false;
  try {
    fs.mkdirSync(root, { mode: 0o755 });
    ownedNewDir = true;

    const slug = packageSlug(options.name);
    const version = options.astroVersion;
    fs.writeFileSync(
      path.join(root, 'package.json'),
      `${JSON.stringify(
        {
          name: slug,
          type: 'module',
          version: '0.0.1',
          private: true,
          packageManager: CAULDRON_PACKAGE_MANAGER,
          scripts: {
            dev: 'astro dev',
            build: 'astro build',
            preview: 'astro preview',
          },
          // Pinned exactly — a new project reproduces the version the app
          // verified, it does not float.
          dependencies: { astro: version },
        },
        null,
        2,
      )}\n`,
    );
    fs.writeFileSync(
      path.join(root, 'astro.config.mjs'),
      `import { defineConfig } from 'astro/config';\n\n// https://astro.build/config\nexport default defineConfig({});\n`,
    );
    fs.writeFileSync(
      path.join(root, 'tsconfig.json'),
      `${JSON.stringify(
        {
          extends: 'astro/tsconfigs/base',
          include: ['.astro/types.d.ts', '**/*'],
          exclude: ['dist'],
        },
        null,
        2,
      )}\n`,
    );
    fs.writeFileSync(
      path.join(root, '.gitignore'),
      'node_modules/\ndist/\n.astro/\n',
    );
    fs.mkdirSync(path.join(root, 'src/pages'), { recursive: true });
    fs.mkdirSync(path.join(root, 'src/layouts'), { recursive: true });
    fs.mkdirSync(path.join(root, 'public'), { recursive: true });
    if (options.template && options.template !== 'minimal') {
      const files = getTemplateFiles(options.template, options.name);
      for (const [relPath, content] of Object.entries(files)) {
        const fullPath = path.join(root, relPath);
        fs.mkdirSync(path.dirname(fullPath), { recursive: true });
        fs.writeFileSync(fullPath, content, 'utf8');
      }
      const match = STARTER_TEMPLATES.find((t) => t.id === options.template);
      if (match && match.directionId && match.directionId !== 'minimal') {
        const dir = DIRECTIONS.find((d) => d.id === match.directionId);
        if (dir) {
          writeDirection(root, dir);
          const stylesDir = path.join(root, 'src/styles');
          fs.mkdirSync(stylesDir, { recursive: true });
          fs.writeFileSync(
            path.join(stylesDir, 'tokens.css'),
            tokensCss(dir),
            'utf8',
          );
        }
      }
    } else {
      if (options.template === 'minimal') {
        const stylesDir = path.join(root, 'src/styles');
        fs.mkdirSync(stylesDir, { recursive: true });
        fs.writeFileSync(
          path.join(stylesDir, 'tokens.css'),
          `:root {\n  --font-family: system-ui, -apple-system, sans-serif;\n}\n`,
          'utf8',
        );
      }
      // The display name is arbitrary user text. It is carried into the page as
      // data (a string in the frontmatter), never interpolated into markup, so
      // characters like < and > render as text rather than becoming markup.
      fs.writeFileSync(
        path.join(root, 'src/layouts/Base.astro'),
        `---\ninterface Props {\n  title: string;\n}\nconst { title } = Astro.props;\n---\n<!doctype html>\n<html lang="en">\n  <head>\n    <meta charset="utf-8" />\n    <meta name="viewport" content="width=device-width, initial-scale=1" />\n    <title>{title}</title>\n  </head>\n  <body>\n    <slot />\n  </body>\n</html>\n`,
      );
      fs.writeFileSync(
        path.join(root, 'src/pages/index.astro'),
        `---\nimport Base from '../layouts/Base.astro';\n\n// The project's display name, kept as data. Astro renders {projectName} as\n// plain text, so any characters it contains stay text.\nconst projectName = ${JSON.stringify(options.name)};\n---\n<Base title={projectName}>\n  <main>\n    <h1>{projectName}</h1>\n    <p>A new Astro site, ready to design.</p>\n  </main>\n</Base>\n`,
      );
    }
    const canonicalRoot = canonicalProjectPath(root);
    return {
      ok: true,
      project: {
        root: canonicalRoot,
        name: options.name,
        astroVersion: version,
        slug,
      },
    };
  } catch (error) {
    // Recoverable: remove only the half-made folder this call created. A
    // folder that already existed (or appeared in a race) is left untouched.
    if (ownedNewDir) {
      try {
        fs.rmSync(root, { recursive: true, force: true });
      } catch {
        // Leave whatever remains visible rather than hiding it.
      }
    }
    const exists = fs.existsSync(root);
    return {
      problem: exists
        ? 'The project folder could not be created. A folder already sits at that path (perhaps from another app), so nothing was touched there.'
        : 'The project folder could not be created.',
      detail: `${root}: ${error}`,
    };
  }
}
