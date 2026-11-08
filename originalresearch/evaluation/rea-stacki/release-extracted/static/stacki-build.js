#!/usr/bin/env node

/**
 * Stacki Build — Compiles .page.js and .component.js source files into static HTML.
 *
 * Usage:
 *   node stacki-build.js          Build the project in the current directory
 *   node stacki-build.js [path]   Build a specific project
 *
 * Zero dependencies. Just Node.js.
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync, copyFileSync } from 'fs'
import { dirname, extname, join, relative, resolve } from 'path'

// ─── Constants ───

const SOURCE_DIR = 'source'
const PUBLIC_DIR = 'public'
const COMPONENTS_DIR = 'components'

const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif', '.bmp', '.ico', '.svg', '.tif', '.tiff',
  '.mp4', '.webm', '.ogg', '.mov', '.m4v', '.avi', '.mkv',
  '.mp3', '.wav', '.aac', '.flac', '.m4a', '.oga',
  '.woff', '.woff2', '.ttf', '.otf', '.eot',
  '.pdf', '.zip',
])

// ─── JS File Parsing ───

function extractBalancedBraces(source, startIndex) {
  let depth = 0
  let inString = null
  let escaped = false

  for (let i = startIndex; i < source.length; i++) {
    const ch = source[i]
    if (escaped) { escaped = false; continue }
    if (ch === '\\') { escaped = true; continue }
    if (inString) { if (ch === inString) inString = null; continue }
    if (ch === '"' || ch === "'") { inString = ch; continue }
    if (ch === '{') depth++
    else if (ch === '}') { depth--; if (depth === 0) return source.slice(startIndex, i + 1) }
  }
  return null
}

function normalizeJsObjectToJson(js) {
  return js
    .replace(/,\s*([\]}])/g, '$1')
    .replace(/(?<=(?:^|[{,])\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/gm, '"$1":')
}

function extractComponentExport(source) {
  const m = source.match(/export\s+const\s+component\s*=\s*\{/)
  if (!m) return null
  const json = extractBalancedBraces(source, m.index + m[0].length - 1)
  if (!json) return null
  try { return JSON.parse(normalizeJsObjectToJson(json)) } catch { return null }
}

function extractTemplateExport(source) {
  const m = source.match(/export\s+const\s+template\s*=\s*`/)
  if (!m) return null
  let i = m.index + m[0].length
  let out = ''
  while (i < source.length) {
    if (source[i] === '\\' && i + 1 < source.length) {
      const next = source[i + 1]
      if (next === '`') { out += '`'; i += 2 }
      else if (next === '\\') { out += '\\'; i += 2 }
      else if (next === '$') { out += '$'; i += 2 }
      else { out += source[i] + next; i += 2 }
    } else if (source[i] === '`') {
      return out.trim()
    } else {
      out += source[i]; i++
    }
  }
  return null
}

// ─── Component Loading ───

function loadComponents(sourceDir) {
  const dir = join(sourceDir, COMPONENTS_DIR)
  if (!existsSync(dir) || !statSync(dir).isDirectory()) return new Map()

  const components = new Map()
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.component.js')) continue
    const name = entry.name.replace(/\.component\.js$/, '')
    const content = readFileSync(join(dir, entry.name), 'utf-8')
    const meta = extractComponentExport(content)
    const template = extractTemplateExport(content)
    if (!meta || template === null) { console.warn(`  Warning: Could not parse ${entry.name}`); continue }
    components.set(name, { name, metadata: meta.stackiComponent || meta, template })
  }
  return components
}

// ─── HTML Tag Matching ───

function findNextTag(html, tagName, startIndex) {
  const openPattern = new RegExp(`<${tagName}(\\s[^>]*)?\\/?>`, 'gi')
  openPattern.lastIndex = startIndex
  const m = openPattern.exec(html)
  if (!m) return null

  const fullMatch = m[0]
  const selfClosing = fullMatch.endsWith('/>')
  const attrsRaw = m[1] || ''
  const start = m.index
  const innerStart = start + fullMatch.length

  if (selfClosing) {
    return { tag: tagName, attrs: parseAttrs(attrsRaw), selfClosing: true, start, end: innerStart, innerStart, innerEnd: innerStart }
  }

  const innerEnd = findClosingTag(html, tagName, innerStart)
  if (innerEnd === -1) return null
  const end = innerEnd + `</${tagName}>`.length
  return { tag: tagName, attrs: parseAttrs(attrsRaw), selfClosing: false, start, end, innerStart, innerEnd }
}

function findClosingTag(html, tagName, fromIndex) {
  const openRe = new RegExp(`<${tagName}(?:\\s[^>]*)?>`, 'gi')
  const closeRe = new RegExp(`</${tagName}>`, 'gi')
  let depth = 1
  let i = fromIndex

  while (depth > 0 && i < html.length) {
    openRe.lastIndex = i
    closeRe.lastIndex = i
    const openMatch = openRe.exec(html)
    const closeMatch = closeRe.exec(html)

    if (!closeMatch) return -1

    if (openMatch && openMatch.index < closeMatch.index && !openMatch[0].endsWith('/>')) {
      depth++
      i = openMatch.index + openMatch[0].length
    } else {
      depth--
      if (depth === 0) return closeMatch.index
      i = closeMatch.index + closeMatch[0].length
    }
  }
  return -1
}

function parseAttrs(raw) {
  const attrs = {}
  const re = /([a-zA-Z_:@][\w:.-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|(\S+)))?/g
  let m
  while ((m = re.exec(raw)) !== null) {
    attrs[m[1]] = m[2] ?? m[3] ?? m[4] ?? ''
  }
  return attrs
}

// ─── Component Resolution ───

function isPascalCase(tag) {
  return tag.length > 0 && tag[0] >= 'A' && tag[0] <= 'Z'
}

/**
 * Resolve all PascalCase component tags in the HTML to their expanded templates.
 */
function resolveAllComponents(html, components) {
  let safety = 0
  while (safety++ < 50) {
    let changed = false
    let searchFrom = 0

    // Find any PascalCase tag that matches a known component
    for (const [name] of components) {
      searchFrom = 0
      while (true) {
        const match = findNextTag(html, name, searchFrom)
        if (!match) break

        const innerHTML = match.selfClosing ? '' : html.slice(match.innerStart, match.innerEnd)
        const resolved = resolveComponentInstance(components.get(name), match.attrs, innerHTML, components)

        html = html.slice(0, match.start) + resolved + html.slice(match.end)
        searchFrom = match.start + resolved.length
        changed = true
      }
    }

    if (!changed) break
  }
  return html
}

function resolveComponentInstance(component, instanceAttrs, innerHTML, allComponents) {
  let html = component.template
  const props = component.metadata.props || []

  for (const prop of props) {
    const value = instanceAttrs[prop.key] !== undefined
      ? instanceAttrs[prop.key]
      : (prop.defaultValue !== undefined && prop.defaultValue !== null ? String(prop.defaultValue) : '')

    html = html.split(`{${prop.key}}`).join(value)

    if (prop.type === 'link') {
      html = html.split(`{${prop.key}.href}`).join(value)
      html = html.split(`{${prop.key}.target}`).join(instanceAttrs.target || '_self')
    }
  }

  // Resolve nested components
  html = resolveAllComponents(html, allComponents)

  // Inject slot content
  const slotContent = parseSlotContent(innerHTML)
  if (Object.keys(slotContent).length > 0) {
    html = injectSlots(html, slotContent)
  }

  return html
}

function parseSlotContent(innerHTML) {
  const slots = {}
  const trimmed = innerHTML.trim()
  if (!trimmed) return slots

  let remaining = trimmed
  let searchFrom = 0

  while (true) {
    const match = findNextTag(remaining, 'stacki-slot', searchFrom)
    if (!match) break
    const slotId = match.attrs['slot-id'] || 'default'
    slots[slotId] = remaining.slice(match.innerStart, match.innerEnd)
    remaining = remaining.slice(0, match.start) + remaining.slice(match.end)
  }

  const leftover = remaining.trim()
  if (leftover && !slots.default) {
    slots.default = leftover
  }

  return slots
}

function injectSlots(html, slotContent) {
  let result = html
  let searchFrom = 0

  while (true) {
    const match = findNextTag(result, 'stacki-slot', searchFrom)
    if (!match) break
    const slotId = match.attrs['slot-id'] || 'default'
    const content = slotContent[slotId]
    if (content !== undefined) {
      result = result.slice(0, match.start) + content + result.slice(match.end)
      searchFrom = match.start + content.length
    } else {
      searchFrom = match.end
    }
  }

  return result
}

// ─── File Walking ───

function walkSourceFiles(dirPath, rootPath, exclude) {
  const files = []
  for (const entry of readdirSync(dirPath, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue
    if (exclude && exclude.has(entry.name)) continue
    const fullPath = join(dirPath, entry.name)
    if (entry.isDirectory()) {
      files.push(...walkSourceFiles(fullPath, rootPath, null))
    } else {
      files.push({ path: fullPath, relativePath: relative(rootPath, fullPath) })
    }
  }
  return files
}

// ─── Main ───

function compile(projectPath) {
  const root = resolve(projectPath)

  if (!existsSync(root) || !statSync(root).isDirectory()) {
    console.error(`Error: "${root}" is not a valid directory`)
    process.exit(1)
  }

  const sourceDir = join(root, SOURCE_DIR)
  const publicDir = join(root, PUBLIC_DIR)

  if (!existsSync(sourceDir) || !statSync(sourceDir).isDirectory()) {
    console.error(`Error: No "${SOURCE_DIR}/" directory found in "${root}"`)
    console.error('Make sure your project has a source/ directory with .page.js and .component.js files.')
    process.exit(1)
  }

  console.log(`\nStacki Build`)
  console.log(`  Source: ${sourceDir}`)
  console.log(`  Output: ${publicDir}\n`)

  const components = loadComponents(sourceDir)
  if (components.size > 0) {
    console.log(`  Components: ${[...components.keys()].join(', ')}`)
  }

  mkdirSync(publicDir, { recursive: true })

  const sourceFiles = walkSourceFiles(sourceDir, sourceDir, new Set([COMPONENTS_DIR]))
  let pageCount = 0
  let fileCount = 0

  for (const file of sourceFiles) {
    if (file.relativePath.endsWith('.component.js')) continue

    const outputRelativePath = file.relativePath.endsWith('.page.js')
      ? file.relativePath.replace(/\.page\.js$/, '.html')
      : file.relativePath

    const outputPath = join(publicDir, outputRelativePath)
    mkdirSync(dirname(outputPath), { recursive: true })

    if (file.relativePath.endsWith('.page.js')) {
      const content = readFileSync(file.path, 'utf-8')
      const template = extractTemplateExport(content)
      if (template === null) {
        console.warn(`  Warning: Could not parse ${file.relativePath}`)
        continue
      }

      const resolvedHtml = resolveAllComponents(template, components)
      writeFileSync(outputPath, resolvedHtml, 'utf-8')
      pageCount++
      console.log(`  ${file.relativePath} → ${outputRelativePath}`)
    } else if (BINARY_EXTENSIONS.has(extname(file.relativePath).toLowerCase())) {
      copyFileSync(file.path, outputPath)
      fileCount++
    } else {
      writeFileSync(outputPath, readFileSync(file.path, 'utf-8'), 'utf-8')
      fileCount++
    }
  }

  console.log(`\n  Done! ${pageCount} page(s) compiled, ${fileCount} file(s) copied.\n`)
}

// ─── CLI ───

const args = process.argv.slice(2)

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Stacki Build — Compile .page.js and .component.js into static HTML.

Usage:
  node stacki-build.js              Build the project in the current directory
  node stacki-build.js [path]       Build a specific project

The compiler reads from source/ and writes to public/.
`)
} else {
  compile(args[0] || process.cwd())
}
