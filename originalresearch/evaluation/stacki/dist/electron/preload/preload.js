"use strict";

// shared/core/assert.ts
function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

// electron/preload/frameBasics.ts
var PRELOAD_LIMITS = { domDepthMax: 512, cssRuleDepthMax: 64 };
var PROBE_ATTR = "data-avb-probe";
var isElement = (node) => node.nodeType === 1;
var isComment = (node) => node.nodeType === 8;
var isText = (node) => node.nodeType === 3;
var isChildNode = (node) => "remove" in node && typeof node["remove"] === "function";

// electron/preload/styleInheritance.ts
var INHERITED = /* @__PURE__ */ new Set([
  "accent-color",
  "border-collapse",
  "border-spacing",
  "caption-side",
  "caret-color",
  "color",
  "color-scheme",
  "cursor",
  "direction",
  "empty-cells",
  "fill",
  "fill-opacity",
  "fill-rule",
  "font",
  "font-family",
  "font-feature-settings",
  "font-kerning",
  "font-language-override",
  "font-optical-sizing",
  "font-palette",
  "font-size",
  "font-size-adjust",
  "font-stretch",
  "font-style",
  "font-synthesis",
  "font-synthesis-small-caps",
  "font-synthesis-style",
  "font-synthesis-weight",
  "font-variant",
  "font-variant-alternates",
  "font-variant-caps",
  "font-variant-east-asian",
  "font-variant-ligatures",
  "font-variant-numeric",
  "font-variant-position",
  "font-variation-settings",
  "font-weight",
  "hyphens",
  "image-rendering",
  "letter-spacing",
  "line-break",
  "line-height",
  "list-style",
  "list-style-image",
  "list-style-position",
  "list-style-type",
  "orphans",
  "overflow-wrap",
  "paint-order",
  "pointer-events",
  "quotes",
  "ruby-align",
  "ruby-position",
  "stroke",
  "stroke-dasharray",
  "stroke-dashoffset",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-miterlimit",
  "stroke-opacity",
  "stroke-width",
  "tab-size",
  "text-align",
  "text-align-last",
  "text-combine-upright",
  "text-emphasis",
  "text-emphasis-color",
  "text-emphasis-position",
  "text-emphasis-style",
  "text-indent",
  "text-orientation",
  "text-rendering",
  "text-shadow",
  "text-transform",
  "text-underline-position",
  "text-wrap",
  "text-wrap-mode",
  "text-wrap-style",
  "visibility",
  "white-space",
  "white-space-collapse",
  "widows",
  "word-break",
  "word-spacing",
  "word-wrap",
  "writing-mode",
  "-webkit-font-smoothing",
  "-webkit-text-fill-color",
  "-webkit-text-size-adjust",
  "-webkit-text-stroke",
  "-webkit-text-stroke-color",
  "-webkit-text-stroke-width"
]);
function inheritedProperty(property) {
  return INHERITED.has(property);
}

// electron/preload/frameAuthoredStyles.ts
var STYLE_LIMITS = { rulesMax: 2e4, propertiesMax: 512, workMax: 2e5 };
var registrations = /* @__PURE__ */ new Map();
var prefix = `--stacki-inspect-${Math.random().toString(36).slice(2)}-`;
function inspectAuthoredProperties(element, properties) {
  const empty = { values: {}, sources: {} };
  if (typeof window.CSS?.registerProperty !== "function") {
    return empty;
  }
  if (properties.length === 0 || properties.length > STYLE_LIMITS.propertiesMax) {
    return empty;
  }
  const styles = authoredStyles(element);
  if (styles === void 0) {
    return empty;
  }
  if (styles.declarations.length * properties.length * 2 > STYLE_LIMITS.workMax) {
    return empty;
  }
  const values = [];
  const patches = /* @__PURE__ */ new Map();
  const names = properties.map((property) => ({ property, probe: registeredProbe(property) }));
  try {
    for (const { property, probe } of names) {
      if (probe !== void 0) {
        for (const style of styles.declarations) {
          const declaration = sourceDeclaration(style, property);
          if (declaration.value) {
            const token = probeToken(declaration.value, values.length);
            values.push(declaration.value);
            const patch = patches.get(style) ?? authoredPatch(style);
            patches.set(style, patch);
            for (const name of [probe.inherited, probe.local]) {
              const value = name === probe.local ? localToken(token, property) : token;
              style.setProperty(name, value, declaration.priority);
              patch.probes.add(name);
            }
          }
        }
      }
    }
    assert(patches.size <= styles.declarations.length, "Each declaration has one saved original");
    assert(values.length * 2 <= STYLE_LIMITS.workMax, "Authored probe writes are bounded");
    return inspectProbeResults(element, names, values);
  } finally {
    restoreAuthoredStyles(patches, styles.inline);
  }
}
function localToken(token, property) {
  const keyword = token.trim().toLowerCase();
  if (keyword === "inherit") {
    return "initial";
  }
  if (keyword === "unset" && inheritedProperty(property)) {
    return "initial";
  }
  return token;
}
function inspectProbeResults(element, names, declarations) {
  const computed = getComputedStyle(element);
  const values = {};
  const sources = {};
  for (const { property, probe } of names) {
    if (probe === void 0) {
      continue;
    }
    const token = computed.getPropertyValue(probe.inherited).trim();
    const index = /^\d+$/.test(token) ? Number(token) : -1;
    if (Number.isSafeInteger(index) && declarations[index] !== void 0) {
      values[property] = declarations[index];
      sources[property] = probeSource(element, probe.local, token);
    }
  }
  return { values, sources };
}
function probeSource(element, name, token) {
  let ancestor = element;
  for (let depth = 0; depth < PRELOAD_LIMITS.domDepthMax; depth += 1) {
    if (ancestor === void 0) {
      return void 0;
    }
    if (getComputedStyle(ancestor).getPropertyValue(name).trim() === token) {
      return ancestor;
    }
    ancestor = ancestor.parentElement ?? void 0;
  }
  return void 0;
}
function authoredPatch(style) {
  return { text: style.cssText, all: style.getPropertyValue("all") !== "", probes: /* @__PURE__ */ new Set() };
}
function restoreAuthoredStyles(patches, inline) {
  assert(patches.size <= STYLE_LIMITS.workMax, "Authored probe cleanup is bounded");
  for (const [style, patch] of patches) {
    assert(patch.probes.size > 0, "A saved declaration was probed");
    for (const name of patch.probes) {
      style.removeProperty(name);
    }
    if (patch.all) {
      if (style.cssText !== patch.text) {
        style.cssText = patch.text;
      }
    }
  }
  for (const { element, text: text2 } of inline) {
    if (element.getAttribute("style") !== text2) {
      element.setAttribute("style", text2);
    }
  }
}
function authoredStyleMutation(record2) {
  if (record2.attributeName !== "style") {
    return false;
  }
  if (!(record2.target instanceof Element)) {
    return false;
  }
  const normalize = (text2) => {
    const style = document.createElement("span").style;
    style.cssText = text2.replace(new RegExp(`${prefix}\\d+\\s*:[^;]*;?`, "g"), "");
    return style.cssText;
  };
  return normalize(record2.oldValue ?? "") === normalize(record2.target.getAttribute("style") ?? "");
}
function registeredProbe(property) {
  const known = registrations.get(property);
  if (known !== void 0) {
    return known;
  }
  if (registrations.size >= STYLE_LIMITS.propertiesMax) {
    return void 0;
  }
  if (property.startsWith("--")) {
    return void 0;
  }
  if (typeof window.CSS?.registerProperty !== "function") {
    return void 0;
  }
  const probe = {
    inherited: `${prefix}${registrations.size * 2}`,
    local: `${prefix}${registrations.size * 2 + 1}`
  };
  window.CSS.registerProperty({
    name: probe.inherited,
    syntax: "*",
    inherits: inheritedProperty(property)
  });
  window.CSS.registerProperty({ name: probe.local, syntax: "*", inherits: false });
  registrations.set(property, probe);
  return probe;
}
function probeToken(value, index) {
  switch (value.trim().toLowerCase()) {
    case "inherit":
    case "initial":
    case "unset":
    case "revert":
    case "revert-layer":
      return value;
    default:
      return String(index);
  }
}
function authoredDeclaration(style, property) {
  return { value: style.getPropertyValue(property), priority: style.getPropertyPriority(property) };
}
function sourceDeclaration(style, property) {
  const declared = authoredDeclaration(style, property);
  if (property === "direction" || property === "unicode-bidi" || property.startsWith("--")) {
    return declared;
  }
  const reset = authoredDeclaration(style, "all");
  if (!reset.value) {
    return declared;
  }
  if (!declared.value) {
    return reset;
  }
  if (declared.priority !== reset.priority) {
    return declared.priority === "important" ? declared : reset;
  }
  const properties = Array.from(style);
  return properties.indexOf(property) > properties.indexOf("all") ? declared : reset;
}
function sheetRules(sheet) {
  try {
    return sheet.cssRules;
  } catch {
    return void 0;
  }
}
function authoredStyles(element) {
  const styles = [];
  const sheets = [...Array.from(document.styleSheets), ...document.adoptedStyleSheets].filter((sheet) => {
    const owner = sheet.ownerNode;
    return !(owner instanceof Element && /^avb-(design-style|vh-override)$/.test(owner.id));
  });
  if (sheets.length > STYLE_LIMITS.rulesMax) {
    return void 0;
  }
  const pending = [];
  for (const sheet of sheets) {
    const rules = sheetRules(sheet);
    if (rules === void 0) {
      return void 0;
    }
    if (pending.length + rules.length > STYLE_LIMITS.rulesMax) {
      return void 0;
    }
    pending.push(...Array.from(rules));
  }
  for (let index = 0; index < pending.length; index += 1) {
    const rule = pending[index];
    assert(rule !== void 0, "The rule queue index is in bounds");
    if (rule instanceof CSSStyleRule) {
      styles.push(rule.style);
    }
    if (typeof CSSNestedDeclarations !== "undefined") {
      if (rule instanceof CSSNestedDeclarations) {
        styles.push(rule.style);
      }
    }
    const children = authoredChildRules(rule);
    if (children === void 0) {
      return void 0;
    }
    if (pending.length + children.length > STYLE_LIMITS.rulesMax) {
      return void 0;
    }
    pending.push(...Array.from(children));
  }
  const inline = [];
  let ancestor = element;
  for (let depth = 0; ancestor !== void 0; depth += 1) {
    if (depth >= PRELOAD_LIMITS.domDepthMax) {
      return void 0;
    }
    if (ancestor instanceof HTMLElement || ancestor instanceof SVGElement) {
      const text2 = ancestor.getAttribute("style");
      if (text2 !== null) {
        styles.push(ancestor.style);
        inline.push({ element: ancestor, text: text2 });
      }
    }
    ancestor = ancestor.parentElement ?? void 0;
  }
  return { declarations: styles, inline };
}
function authoredChildRules(rule) {
  if (rule instanceof CSSImportRule) {
    return rule.styleSheet ? sheetRules(rule.styleSheet) : [];
  }
  if (rule instanceof CSSGroupingRule) {
    return rule.cssRules;
  }
  if (rule instanceof CSSStyleRule) {
    return rule.cssRules;
  }
  return [];
}

// electron/preload/frameRegions.ts
var regions = /* @__PURE__ */ new Map();
var trackedPaths = [];
var activeScope = "";
var inScope = (nodePath) => activeScope ? nodePath.startsWith(activeScope) : !nodePath.includes("|");
var focusPath = "";
var focusOcc = 0;
var isLive = (run) => {
  const content = run.filter((node) => isElement(node) || isText(node) && node.textContent.trim() !== "");
  if (content.length > 0) {
    return content.some((node) => node.isConnected);
  }
  return run.some((node) => node.isConnected);
};
var focusCache;
function resetFocusCache() {
  focusCache = void 0;
}
function setTracking(next) {
  trackedPaths = next.paths;
  activeScope = next.scope;
  focusPath = next.focus;
  focusOcc = next.occurrence;
}
var focusRoots = () => {
  if (focusCache !== void 0) {
    return focusCache.roots;
  }
  focusCache = { roots: void 0 };
  if (focusPath) {
    const runs = (regions.get(focusPath) || []).filter(isLive);
    if (runs.length) {
      focusCache = { roots: runs[focusOcc] || runs[0] };
    } else {
      const places = taggedPlaces(focusPath);
      const one = places[focusOcc] || places[0];
      if (one) {
        focusCache = { roots: [one.el] };
      }
    }
  }
  return focusCache.roots;
};
var inFocus = (node) => {
  const roots = focusRoots();
  if (!roots) {
    return true;
  }
  return roots.some((root) => root === node || root.nodeType === 1 && root.contains(node));
};
var runsOf = (nodePath) => {
  const runs = regions.get(nodePath);
  if (!runs) {
    return runs;
  }
  const live = runs.filter(isLive);
  return focusRoots() ? live.filter((run) => run.some(inFocus)) : live;
};
var mapped = false;
var announceMapped = () => {
  mapped = true;
  try {
    window.parent.postMessage({ type: "avb:canvas-ready" }, "*");
  } catch {
  }
  announceRender();
};
var STAMP_PREFIX = "avb-d:";
var STAMP_ATTRIBUTE = "data-avb-d";
var STAMPS_MAX = 2e4;
var MANIFEST_FILES_MAX = 512;
var renderToken = void 0;
var renderStamps;
var renderSeq = 0;
function canvasTextSourceMatches(file, checksum) {
  return renderStamps?.some((stamp) => stamp.file === file && stamp.checksum === checksum) ?? false;
}
var readManifest = () => {
  const byFile = /* @__PURE__ */ new Map();
  let stamps = 0;
  const record2 = (data) => {
    stamps += 1;
    if (stamps > STAMPS_MAX) {
      return false;
    }
    if (!data.startsWith(STAMP_PREFIX)) {
      return true;
    }
    const rest = data.slice(STAMP_PREFIX.length);
    const checksum = rest.slice(0, 64);
    const file = rest.slice(65);
    if (!/^[0-9a-f]{64}$/.test(checksum) || rest[64] !== ":" || !file) {
      return true;
    }
    const seen = byFile.get(file);
    if (seen !== void 0 && seen !== checksum) {
      return false;
    }
    byFile.set(file, checksum);
    return true;
  };
  const stack = [document];
  while (stack.length) {
    const parent = stack.pop();
    if (!parent) {
      break;
    }
    for (let node = parent.firstChild; node; node = node.nextSibling) {
      if (isElement(node)) {
        const carried = node.getAttribute(STAMP_ATTRIBUTE);
        if (carried !== null) {
          if (STAMPS_MAX * (65 + 1024) < carried.length) {
            return void 0;
          }
          const tokens = carried.split("\n").filter(Boolean);
          if (STAMPS_MAX < tokens.length) {
            return void 0;
          }
          for (const token of tokens) {
            if (!record2(token)) {
              return void 0;
            }
          }
        }
        stack.push(node);
        continue;
      }
      if (!isComment(node) || !node.data.startsWith(STAMP_PREFIX)) {
        continue;
      }
      if (!record2(node.data)) {
        return void 0;
      }
    }
  }
  if (byFile.size > MANIFEST_FILES_MAX) {
    return void 0;
  }
  return [...byFile.keys()].sort((left, right) => left < right ? -1 : left === right ? 0 : 1).map((file) => ({ file, checksum: byFile.get(file) ?? "" }));
};
var announceRender = () => {
  renderSeq += 1;
  const seq = renderSeq;
  renderToken = void 0;
  renderStamps = void 0;
  const stamps = readManifest();
  const subtle = globalThis.crypto?.subtle;
  if (!stamps || !subtle) {
    return;
  }
  const canonical = stamps.map((stamp) => `${stamp.checksum} ${stamp.file}
`).join("");
  subtle.digest("SHA-256", new TextEncoder().encode(canonical)).then(
    (digest2) => {
      if (seq !== renderSeq) {
        return;
      }
      const bytes = Array.from(new Uint8Array(digest2));
      renderToken = bytes.map((byte) => byte.toString(16).padStart(2, "0")).join("");
      renderStamps = stamps;
      reportRender();
    },
    () => {
    }
  );
};
function reportRender() {
  if (renderToken === void 0 || renderStamps === void 0) {
    return;
  }
  try {
    window.parent.postMessage({ type: "avb:render", token: renderToken, stamps: renderStamps }, "*");
  } catch {
  }
}
var PATH_ATTR = "data-avb-p";
var pathsOf = (element) => (element.getAttribute(PATH_ATTR) || "").split(" ").filter(Boolean);
var ourTags = /* @__PURE__ */ new WeakMap();
var nsOf = (element) => {
  const out = /* @__PURE__ */ new Map();
  for (const nodePath of pathsOf(element)) {
    const bar = nodePath.indexOf("|");
    if (bar === -1) {
      continue;
    }
    const file = nodePath.slice(0, bar + 1);
    const inner = nodePath.slice(bar + 1);
    const had = out.get(file);
    if (had === void 0 || inner.length < had.length) {
      out.set(file, inner);
    }
  }
  return out;
};
var nsParent = (element, file, inner) => {
  let up = taggedAncestor(element);
  while (up) {
    const theirs = nsOf(up).get(file);
    if (theirs !== void 0 && inner.startsWith(`${theirs}.`)) {
      return up;
    }
    up = taggedAncestor(up);
  }
  return void 0;
};
var taggedAncestor = (element) => element.parentElement?.closest(`[${PATH_ATTR}]`) ?? void 0;
var rodeIn = (element, path) => {
  const mine = ourTags.get(element);
  const written = pathsOf(element).filter((nodePath) => !mine?.has(nodePath));
  const at = written.indexOf(path);
  return at > 0 && written.slice(0, at).some((nodePath) => nodePath.includes("|"));
};
var promoteInstanceTags = () => {
  for (const element of Array.from(document.querySelectorAll(`[${PATH_ATTR}]`))) {
    const page = pathsOf(element).filter((nodePath) => !nodePath.includes("|") && rodeIn(element, nodePath));
    if (!page.length) {
      continue;
    }
    const ns = nsOf(element);
    if (!ns.size) {
      continue;
    }
    let file = void 0;
    for (const [candidateFile, inner] of ns) {
      if (!nsParent(element, candidateFile, inner)) {
        file = void 0;
        break;
      }
      if (!file) {
        file = candidateFile;
      }
    }
    if (!file) {
      continue;
    }
    let at = element;
    let innerOf = nsOf(at).get(file);
    let up = innerOf === void 0 ? void 0 : nsParent(at, file, innerOf);
    while (up) {
      at = up;
      innerOf = nsOf(at).get(file);
      up = innerOf === void 0 ? void 0 : nsParent(at, file, innerOf);
    }
    if (at === element) {
      continue;
    }
    for (const nodePath of page) {
      addPath(at, nodePath);
    }
  }
};
var addPath = (element, nodePath) => {
  const list2 = pathsOf(element);
  if (list2.includes(nodePath)) {
    return;
  }
  list2.push(nodePath);
  element.setAttribute(PATH_ATTR, list2.join(" "));
  let mine = ourTags.get(element);
  if (!mine) {
    ourTags.set(element, mine = /* @__PURE__ */ new Set());
  }
  mine.add(nodePath);
};
var elementsWithPath = (nodePath) => {
  const all = Array.from(elementsTaggedForPath(nodePath)).filter((element) => pathsOf(element).includes(nodePath) && inFocus(element));
  return all.filter((element) => !all.some((other) => other !== element && other.contains(element)));
};
var allElementsWithPath = (nodePath, countMax) => {
  const all = [];
  const tagged = elementsTaggedForPath(nodePath);
  for (let index = 0; index < tagged.length; index += 1) {
    const element = tagged.item(index);
    if (!element) {
      continue;
    }
    if (!pathsOf(element).includes(nodePath)) {
      continue;
    }
    all.push(element);
    if (all.length > countMax) {
      return void 0;
    }
  }
  return all.filter((element) => !all.some((other) => other !== element && other.contains(element)));
};
function elementsTaggedForPath(nodePath) {
  const selector = /[^A-Za-z0-9_./:|@-]/.test(nodePath) ? `[${PATH_ATTR}]` : `[${PATH_ATTR}~="${nodePath}"]`;
  return document.querySelectorAll(selector);
}
var markerPath = (node, kind) => {
  if (isComment(node)) {
    const tag = `avb-${kind}:`;
    return node.data.startsWith(tag) ? node.data.slice(tag.length) : void 0;
  }
  if (isElement(node) && node.tagName === "TEMPLATE") {
    return node.getAttribute(`data-avb-${kind}`) ?? void 0;
  }
  return void 0;
};
var collectRegions = () => {
  pruneRegions();
  const { starts, markers } = findMarkers();
  const collected = /* @__PURE__ */ new Map();
  const fresh = /* @__PURE__ */ new Map();
  for (const start2 of starts) {
    const nodePath = markerPath(start2, "s");
    if (nodePath === void 0) {
      continue;
    }
    const run = runAfter(start2, nodePath);
    let set = collected.get(nodePath);
    if (!set) {
      set = /* @__PURE__ */ new Set();
      collected.set(nodePath, set);
    }
    for (const node of run) {
      set.add(node);
    }
    recordRun(fresh, nodePath, run);
  }
  replaceRuns(fresh, collected);
  untagStale(collected);
  for (const node of markers) {
    if (isChildNode(node)) {
      node.remove();
    }
  }
  promoteInstanceTags();
  focusCache = void 0;
};
var pruneRegions = () => {
  for (const [nodePath, runs] of regions) {
    const live = runs.filter(isLive);
    if (live.length) {
      regions.set(nodePath, live);
    } else {
      regions.delete(nodePath);
    }
  }
};
var findMarkers = () => {
  const starts = [];
  const markers = [];
  const visit = (parent, depth) => {
    if (depth > PRELOAD_LIMITS.domDepthMax) {
      return;
    }
    for (let node = parent.firstChild; node; node = node.nextSibling) {
      const isStart = markerPath(node, "s") !== void 0;
      if (isStart) {
        starts.push(node);
      }
      if (isStart || markerPath(node, "e") !== void 0) {
        markers.push(node);
      }
      if (isElement(node)) {
        visit(node, depth + 1);
      }
    }
  };
  visit(document, 0);
  return { starts, markers };
};
var runAfter = (start2, nodePath) => {
  let end = void 0;
  for (let node = start2.nextSibling; node; node = node.nextSibling) {
    if (markerPath(node, "e") === nodePath) {
      end = node;
      break;
    }
  }
  const run = [];
  for (let node = start2.nextSibling; node && node !== end; node = node.nextSibling) {
    if (!end) {
      break;
    }
    run.push(node);
    if (isElement(node) && node.tagName !== "TEMPLATE") {
      addPath(node, nodePath);
    }
  }
  return run;
};
var recordRun = (fresh, nodePath, run) => {
  const runs = fresh.get(nodePath) ?? [];
  if (!fresh.has(nodePath)) {
    fresh.set(nodePath, runs);
  }
  const again = runs.findIndex((other) => other.some((node) => run.includes(node)));
  if (again >= 0) {
    runs[again] = run;
  } else {
    runs.push(run);
  }
  if (run.length > 0) {
    assert(runs.includes(run), "recordRun: a collected run is recorded for its path");
  }
};
var replaceRuns = (fresh, collected) => {
  const claimed = /* @__PURE__ */ new Set();
  for (const nodes of collected.values()) {
    for (const node of nodes) {
      claimed.add(node);
    }
  }
  for (const [nodePath, runs] of regions) {
    if (fresh.has(nodePath)) {
      continue;
    }
    const kept = runs.filter((run) => !run.some((node) => claimed.has(node)));
    if (kept.length === runs.length) {
      continue;
    }
    if (kept.length > 0) {
      regions.set(nodePath, kept);
    } else {
      regions.delete(nodePath);
    }
    collected.set(nodePath, new Set(kept.flat()));
  }
  for (const [nodePath, runs] of fresh) {
    regions.set(nodePath, runs);
  }
  for (const [nodePath, runs] of fresh) {
    assert(regions.get(nodePath) === runs, "replaceRuns: a path collected this pass holds only this pass runs");
  }
  for (const runs of regions.values()) {
    assert(runs.length > 0, "replaceRuns: a recorded path has at least one run");
  }
};
var untagStale = (collected) => {
  for (const element of Array.from(document.querySelectorAll(`[${PATH_ATTR}]`))) {
    const mine = ourTags.get(element);
    const kept = pathsOf(element).filter((nodePath) => !mine?.has(nodePath) || !collected.has(nodePath) || (collected.get(nodePath)?.has(element) ?? false));
    if (kept.length === pathsOf(element).length) {
      continue;
    }
    for (const nodePath of pathsOf(element)) {
      if (!kept.includes(nodePath)) {
        mine?.delete(nodePath);
      }
    }
    if (kept.length) {
      element.setAttribute(PATH_ATTR, kept.join(" "));
    } else {
      element.removeAttribute(PATH_ATTR);
    }
  }
};
var addNode = (acc, node, depth = 0) => {
  if (!node.isConnected) {
    return acc;
  }
  if (depth > PRELOAD_LIMITS.domDepthMax) {
    return acc;
  }
  let rect = void 0;
  if (isElement(node)) {
    if (node.tagName === "TEMPLATE") {
      return acc;
    }
    rect = node.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
      let grown = acc;
      for (const child of Array.from(node.childNodes)) {
        grown = addNode(grown, child, depth + 1);
      }
      return grown;
    }
  } else if (isComment(node)) {
    return acc;
  } else if (isText(node) && node.textContent.trim()) {
    const range = document.createRange();
    range.selectNode(node);
    rect = range.getBoundingClientRect();
  }
  if (!rect || rect.width === 0 && rect.height === 0) {
    return acc;
  }
  if (!acc) {
    return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom };
  }
  return {
    left: Math.min(acc.left, rect.left),
    top: Math.min(acc.top, rect.top),
    right: Math.max(acc.right, rect.right),
    bottom: Math.max(acc.bottom, rect.bottom)
  };
};
var toRect = (box) => ({
  x: box.left,
  y: box.top,
  w: box.right - box.left,
  h: box.bottom - box.top
});
var taggedPlaces = (nodePath) => {
  const out = [];
  for (const element of elementsWithPath(nodePath)) {
    const acc = addNode(void 0, element);
    if (acc) {
      out.push({ el: element, rect: toRect(acc) });
    }
  }
  const real = out.filter((place) => place.rect.w > 0 && place.rect.h > 0);
  return real.length ? real : out;
};

// electron/preload/inlineText.ts
var INLINE_LIMITS = { childrenMax: 4096, containersMax: 256, descendantsMax: 4096 };
function inlinePlace(nodePath) {
  const dot = nodePath.lastIndexOf(".");
  if (dot <= 0) {
    return void 0;
  }
  const parent = nodePath.slice(0, dot);
  const digits = nodePath.slice(dot + 1);
  if (!/^\d+$/.test(digits)) {
    return void 0;
  }
  const index = Number(digits);
  if (!Number.isSafeInteger(index)) {
    return void 0;
  }
  assert(parent.length > 0, "An inline place has a parent path");
  assert(index >= 0, "An inline place has a non-negative index");
  return { parent, index };
}
function inlineTextRuns(nodePath) {
  const place = inlinePlace(nodePath);
  if (!place) {
    return [];
  }
  const containers = parentContainers(place.parent).slice(0, INLINE_LIMITS.containersMax);
  const out = [];
  for (const container of containers) {
    const run = textInContainer(container, place);
    if (run.length > 0) {
      out.push(run);
    }
  }
  return out;
}
function parentContainers(parent) {
  const fromRuns = (runsOf(parent) ?? []).flatMap((run) => run.filter(isElement));
  return fromRuns.length ? fromRuns : elementsWithPath(parent);
}
function siblingIndex(element, parent) {
  const prefix2 = parent + ".";
  for (const token of pathsOf(element)) {
    if (token.startsWith(prefix2)) {
      const place = inlinePlace(token);
      if (place?.parent === parent) {
        return place.index;
      }
    }
  }
  return void 0;
}
function runHost(container, parent) {
  const tagged = container.querySelectorAll("[data-avb-p]");
  const count = Math.min(tagged.length, INLINE_LIMITS.descendantsMax);
  for (let at = 0; at < count; at += 1) {
    const element = tagged.item(at);
    assert(element !== null, "A tagged descendant within the count exists");
    if (siblingIndex(element, parent) !== void 0) {
      return element.parentElement ?? void 0;
    }
  }
  return container;
}
function textInContainer(container, place) {
  const host = runHost(container, place.parent);
  if (!host) {
    return [];
  }
  const children = Array.from(host.childNodes);
  if (children.length > INLINE_LIMITS.childrenMax) {
    return [];
  }
  let before = -1;
  let gap = [];
  for (const child of children) {
    const index = isElement(child) ? siblingIndex(child, place.parent) : void 0;
    if (index === void 0) {
      if (before === place.index - 1) {
        if (isText(child)) {
          if (child.data.trim()) {
            gap.push(child);
          }
        }
      }
      continue;
    }
    if (before === place.index - 1) {
      return index === place.index + 1 ? gap : [];
    }
    if (index <= before) {
      return [];
    }
    before = index;
    gap = [];
  }
  return before === place.index - 1 ? gap : [];
}
function inlineTextPathAt(parent, x, y) {
  if (typeof document.caretRangeFromPoint !== "function") {
    return void 0;
  }
  const range = document.caretRangeFromPoint(x, y);
  const text2 = range?.startContainer;
  if (!text2 || !isText(text2) || !text2.data.trim() || !text2.parentElement) {
    return void 0;
  }
  if (!textHoldsPoint(text2, x, y)) {
    return void 0;
  }
  const index = unmarkedIndex(text2, parent);
  return index === void 0 ? void 0 : `${parent}.${index}`;
}
function textHoldsPoint(text2, x, y) {
  const range = document.createRange();
  range.selectNodeContents(text2);
  for (const box of Array.from(range.getClientRects())) {
    if (x >= box.left && x <= box.right && y >= box.top && y <= box.bottom) {
      return true;
    }
  }
  return false;
}
function unmarkedIndex(text2, parent) {
  const host = text2.parentElement;
  assert(host !== null, "A text under the pointer has an element");
  const children = Array.from(host.childNodes);
  if (children.length > INLINE_LIMITS.childrenMax) {
    return void 0;
  }
  let before = -1;
  let tagged = 0;
  let index;
  for (const child of children) {
    const sibling = isElement(child) ? siblingIndex(child, parent) : void 0;
    if (child === text2) {
      index = before + 1;
    } else if (sibling !== void 0) {
      tagged += 1;
      if (index !== void 0) {
        return tagged > 0 && sibling === index + 1 ? index : void 0;
      }
      if (sibling <= before) {
        return void 0;
      }
      before = sibling;
    }
  }
  return index !== void 0 && tagged > 0 ? index : void 0;
}

// electron/preload/framePseudo.ts
var PSEUDO_PLACES_MAX = 64;
var PSEUDO_PROPERTIES_MAX = 1024;
var SHEET_ID = "avb-pseudo-measure";
function rectsForPseudo(nodePath, pseudo) {
  const out = [];
  for (const element of placesOf(nodePath)) {
    if (out.length < PSEUDO_PLACES_MAX) {
      const box = measurePseudo(element, pseudo);
      if (box !== void 0) {
        out.push(toRect(box));
      }
    }
  }
  assert(out.length <= PSEUDO_PLACES_MAX, "rectsForPseudo: places are capped");
  return out;
}
function placesOf(nodePath) {
  const elements = [];
  for (const run of runsOf(nodePath) ?? []) {
    const element = run.find((node) => isElement(node) && node.tagName !== "TEMPLATE");
    if (element !== void 0 && element.isConnected) {
      elements.push(element);
    }
  }
  return elements.length > 0 ? elements : elementsWithPath(nodePath);
}
function measurePseudo(host, pseudo) {
  const style = window.getComputedStyle(host, `::${pseudo}`);
  if (!drawn(style)) {
    return void 0;
  }
  ensureSheet();
  const standIn = document.createElement("span");
  standIn.setAttribute(PROBE_ATTR, pseudo);
  const count = Math.min(style.length, PSEUDO_PROPERTIES_MAX);
  for (let index = 0; index < count; index++) {
    const name = style.item(index);
    standIn.style.setProperty(name, style.getPropertyValue(name), "important");
  }
  standIn.style.setProperty("pointer-events", "none", "important");
  standIn.textContent = contentText(style.content);
  if (pseudo === "before") {
    host.insertBefore(standIn, host.firstChild);
  } else {
    host.appendChild(standIn);
  }
  const rect = standIn.getBoundingClientRect();
  standIn.remove();
  assert(!standIn.isConnected, "measurePseudo: the stand-in is gone");
  if (rect.width === 0 && rect.height === 0) {
    return void 0;
  }
  return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom };
}
function drawn(style) {
  if (style.display === "none") {
    return false;
  }
  return style.content !== "none" && style.content !== "normal" && style.content !== "";
}
function contentText(content) {
  const parts = content.match(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g) ?? [];
  return parts.map((part) => part.slice(1, -1).replace(/\\(.)/g, "$1")).join("");
}
function ensureSheet() {
  if (document.getElementById(SHEET_ID) !== null) {
    return;
  }
  const sheet = document.createElement("style");
  sheet.id = SHEET_ID;
  sheet.setAttribute(PROBE_ATTR, "");
  sheet.textContent = `:has(> [${PROBE_ATTR}="before"])::before{display:none!important}:has(> [${PROBE_ATTR}="after"])::after{display:none!important}`;
  (document.head ?? document.documentElement).appendChild(sheet);
  assert(document.getElementById(SHEET_ID) === sheet, "ensureSheet: the sheet is in place");
}

// shared/page/pseudoPath.ts
function splitPseudoPath(path) {
  const match = /^(.+)::(before|after)$/.exec(path);
  if (match === null) {
    return void 0;
  }
  const nodePath = match[1] ?? "";
  const pseudo = match[2] === "before" ? "before" : "after";
  assert(nodePath.length > 0, "splitPseudoPath: the node path is not empty");
  return { nodePath, pseudo };
}

// electron/preload/frameMeasure.ts
var rectsFromDescendants = (nodePath) => {
  const prefix2 = nodePath + ".";
  let best = Infinity;
  const paths = [];
  for (const key of regions.keys()) {
    if (!key.startsWith(prefix2)) {
      continue;
    }
    const depth = key.split(".").length;
    if (depth < best) {
      best = depth;
      paths.length = 0;
    }
    if (depth === best) {
      paths.push(key);
    }
  }
  let acc = void 0;
  for (const key of paths) {
    for (const run of runsOf(key) || []) {
      for (const node of run) {
        acc = addNode(acc, node);
      }
    }
  }
  return acc ? [toRect(acc)] : void 0;
};
var withoutHollow = (list2) => {
  const real = list2.filter((rect) => rect.w > 0 && rect.h > 0);
  return real.length ? real : list2;
};
var rectsForInlineText = (nodePath) => {
  const out = [];
  for (const run of inlineTextRuns(nodePath)) {
    let acc = void 0;
    for (const node of run) {
      acc = addNode(acc, node);
    }
    if (acc) {
      out.push(toRect(acc));
    }
  }
  return out;
};
var rectsForPath = (nodePath) => {
  const pseudo = splitPseudoPath(nodePath);
  if (pseudo !== void 0) {
    const boxes = rectsForPseudo(pseudo.nodePath, pseudo.pseudo);
    return boxes.length > 0 ? boxes : void 0;
  }
  const runs = runsOf(nodePath);
  if (!runs) {
    const places = taggedPlaces(nodePath);
    if (places.length) {
      return places.map((place) => place.rect);
    }
    const inline = rectsForInlineText(nodePath);
    return inline.length ? inline : rectsFromDescendants(nodePath);
  }
  const out = [];
  for (const run of runs) {
    let acc = void 0;
    for (const node of run) {
      acc = addNode(acc, node);
    }
    if (acc) {
      out.push(toRect(acc));
    }
  }
  if (runs.length === 1) {
    let acc = (runs[0] || []).reduce((grown, node) => addNode(grown, node), void 0);
    for (const element of elementsWithPath(nodePath)) {
      acc = addNode(acc, element);
    }
    if (acc) {
      return [toRect(acc)];
    }
  }
  if (out.length) {
    return out;
  }
  const tagged = elementsWithPath(nodePath);
  if (tagged.length) {
    for (const element of tagged) {
      const acc = addNode(void 0, element);
      if (acc) {
        out.push(toRect(acc));
      }
    }
    const real = withoutHollow(out);
    if (real.length) {
      return real;
    }
  }
  return rectsFromDescendants(nodePath);
};
var STACKI_CLASSES = /* @__PURE__ */ new Set(["stacki-opened", "stacki-designer", "stacki-preview"]);
var ownClasses = (element) => Array.from(element.classList).filter((className) => !STACKI_CLASSES.has(className));
var classesForPath = (nodePath) => {
  const out = [];
  for (const run of runsOf(nodePath) || []) {
    const element = run.find((node) => isElement(node) && node.tagName !== "TEMPLATE");
    if (element) {
      out.push(ownClasses(element));
    }
  }
  if (!out.length) {
    for (const element of elementsWithPath(nodePath)) {
      out.push(ownClasses(element));
    }
  }
  return out;
};
var SIDES = ["top", "right", "bottom", "left"];
var gapChildRects = (element) => {
  const kids = [];
  for (const child of Array.from(element.children)) {
    if (child.tagName === "TEMPLATE") {
      continue;
    }
    const rect = child.getBoundingClientRect();
    if (rect.width <= 0 && rect.height <= 0) {
      continue;
    }
    const cd = window.getComputedStyle(child).display;
    if (cd === "none" || cd === "contents") {
      continue;
    }
    kids.push(rect);
  }
  return kids;
};
var visualRows = (kids) => {
  const byTop = [...kids].sort((left, right) => left.top - right.top || left.left - right.left);
  const rows = [];
  for (const rect of byTop) {
    const row = rows[rows.length - 1];
    const overlaps = row && rect.top < row.bottom - 1 && rect.bottom > row.top + 1;
    if (overlaps) {
      row.items.push(rect);
      row.top = Math.min(row.top, rect.top);
      row.bottom = Math.max(row.bottom, rect.bottom);
    } else {
      rows.push({ top: rect.top, bottom: rect.bottom, items: [rect] });
    }
  }
  return rows;
};
var columnGapBands = (rows, colGap) => {
  const bands = [];
  for (const row of rows) {
    const across = [...row.items].sort((left, right) => left.left - right.left);
    for (let i = 1; i < across.length; i++) {
      const previous = across[i - 1];
      const next = across[i];
      if (!previous || !next) {
        continue;
      }
      const space = next.left - previous.right;
      const width = Math.min(space, colGap);
      if (width <= 0.5) {
        continue;
      }
      bands.push({
        axis: "column",
        x: previous.right,
        y: row.top,
        w: width,
        h: row.bottom - row.top
      });
    }
  }
  return bands;
};
var rowGapBands = (rows, rowGap) => {
  const bands = [];
  for (let i = 1; i < rows.length; i++) {
    const previous = rows[i - 1];
    const next = rows[i];
    if (!previous || !next) {
      continue;
    }
    const space = next.top - previous.bottom;
    const height = Math.min(space, rowGap);
    if (height <= 0.5) {
      continue;
    }
    const span = [...previous.items, ...next.items];
    const left = Math.min(...span.map((rect) => rect.left));
    const right = Math.max(...span.map((rect) => rect.right));
    bands.push({ axis: "row", x: left, y: previous.bottom, w: right - left, h: height });
  }
  return bands;
};
var gapBandsFor = (element, cs) => {
  const display = cs.display;
  if (!/(^|\s)(flex|grid|inline-flex|inline-grid)$/.test(display)) {
    return [];
  }
  const colGap = parseFloat(cs.columnGap) || 0;
  const rowGap = parseFloat(cs.rowGap) || 0;
  if (colGap <= 0 && rowGap <= 0) {
    return [];
  }
  const kids = gapChildRects(element);
  if (kids.length < 2) {
    return [];
  }
  const rows = visualRows(kids);
  return [...colGap > 0 ? columnGapBands(rows, colGap) : [], ...rowGap > 0 ? rowGapBands(rows, rowGap) : []];
};
var spacingForPath = (nodePath) => {
  const out = [];
  for (const run of runsOf(nodePath) || []) {
    const element = run.find((node) => isElement(node) && node.tagName !== "TEMPLATE");
    if (element) {
      out.push(element);
    }
  }
  if (!out.length) {
    out.push(...elementsWithPath(nodePath));
  }
  return out.map((element) => {
    try {
      const cs = window.getComputedStyle(element);
      const box = (kind) => Object.fromEntries(SIDES.map((side) => [side, parseFloat(cs.getPropertyValue(`${kind}-${side}`)) || 0]));
      const rootFont = parseFloat(window.getComputedStyle(document.documentElement).fontSize) || 16;
      const units = {
        em: parseFloat(cs.fontSize) || rootFont,
        rem: rootFont,
        vw: window.innerWidth / 100,
        vh: window.innerHeight / 100
      };
      const gaps = gapBandsFor(element, cs);
      return { padding: box("padding"), margin: box("margin"), gaps, units };
    } catch {
      return void 0;
    }
  });
};
var THIN = 3;
var THIN_SLACK = 5;
var thinCache = void 0;
function resetThinCache() {
  thinCache = void 0;
}
var thinTargets = () => {
  if (thinCache) {
    return thinCache;
  }
  thinCache = [];
  for (const element of Array.from(document.querySelectorAll(`[${PATH_ATTR}]`))) {
    if (!inFocus(element)) {
      continue;
    }
    const nodePath = pathsOf(element).find(inScope);
    if (!nodePath) {
      continue;
    }
    const rect = element.getBoundingClientRect();
    if (rect.width < 1 && rect.height < 1) {
      continue;
    }
    if (rect.height > THIN && rect.width > THIN) {
      continue;
    }
    thinCache.push({ path: nodePath, el: element, box: rect });
  }
  return thinCache;
};
var thinAt = (x, y, best) => {
  let hit = void 0;
  let hitDepth = best ? best.split(".").length : 0;
  for (const target of thinTargets()) {
    if (best && !target.path.startsWith(best + ".")) {
      continue;
    }
    const depth = target.path.split(".").length;
    if (depth <= hitDepth) {
      continue;
    }
    const box = target.box;
    if (x < box.left - THIN_SLACK || x > box.right + THIN_SLACK) {
      continue;
    }
    if (y < box.top - THIN_SLACK || y > box.bottom + THIN_SLACK) {
      continue;
    }
    hit = target;
    hitDepth = depth;
  }
  return hit;
};

// electron/preload/frameReports.ts
var lastSentRects = {};
var sendRects = () => {
  if (!trackedPaths.length) {
    return;
  }
  const rects = {};
  const classes = {};
  const spacing = {};
  for (const nodePath of trackedPaths) {
    rects[nodePath] = rectsForPath(nodePath);
    classes[nodePath] = classesForPath(nodePath);
    spacing[nodePath] = spacingForPath(nodePath);
  }
  lastSentRects = rects;
  window.parent.postMessage(
    {
      type: "avb:rects",
      rects,
      classes,
      spacing
    },
    "*"
  );
};
var MOVE_SLACK = 0.5;
var STILL_FRAMES = 20;
var LOOK_EVERY = 200;
var boxesMoved = (before, now) => {
  if (!before || !now || before.length !== now.length) {
    return true;
  }
  for (let i = 0; i < now.length; i++) {
    for (const key of ["x", "y", "w", "h"]) {
      if (Math.abs((before[i]?.[key] ?? 0) - (now[i]?.[key] ?? 0)) > MOVE_SLACK) {
        return true;
      }
    }
  }
  return false;
};
var trackedMoved = () => {
  for (const nodePath of trackedPaths) {
    if (!lastSentRects[nodePath]) {
      continue;
    }
    if (boxesMoved(lastSentRects[nodePath], rectsForPath(nodePath))) {
      return true;
    }
  }
  return false;
};
var following = false;
var stillFor = 0;
var followMotion = () => {
  if (!trackedPaths.length) {
    following = false;
    return;
  }
  if (trackedMoved()) {
    stillFor = 0;
    resetThinCache();
    resetFocusCache();
    sendRects();
  } else if (++stillFor >= STILL_FRAMES) {
    following = false;
    return;
  }
  requestAnimationFrame(followMotion);
};
var watchMotion = () => {
  if (following || !trackedPaths.length || !trackedMoved()) {
    return;
  }
  following = true;
  stillFor = 0;
  requestAnimationFrame(followMotion);
};
var lastRenderedKey = "";
var lastRendered = [];
var sendRendered = () => {
  const rendered = [];
  const seen = /* @__PURE__ */ new Set();
  for (const nodePath of regions.keys()) {
    if (!inScope(nodePath)) {
      continue;
    }
    let live = false;
    for (const run of runsOf(nodePath) || []) {
      for (const node of run) {
        if (!node.isConnected) {
          continue;
        }
        if (isElement(node) && node.tagName !== "TEMPLATE") {
          live = true;
        } else if (isText(node) && node.textContent !== null && node.textContent.trim()) {
          live = true;
        }
        if (live) {
          break;
        }
      }
      if (live) {
        break;
      }
    }
    if (!live && elementsWithPath(nodePath).length) {
      live = true;
    }
    if (live) {
      rendered.push(nodePath);
      seen.add(nodePath);
    }
  }
  for (const element of Array.from(document.querySelectorAll(`[${PATH_ATTR}]`))) {
    if (!inFocus(element)) {
      continue;
    }
    for (const nodePath of pathsOf(element)) {
      if (inScope(nodePath) && !seen.has(nodePath)) {
        rendered.push(nodePath);
        seen.add(nodePath);
      }
    }
  }
  lastRendered = rendered;
  sendStates(rendered);
  const key = rendered.join("\n");
  if (key === lastRenderedKey) {
    return;
  }
  lastRenderedKey = key;
  window.parent.postMessage({ type: "avb:rendered-nodes", paths: rendered }, "*");
};
var lastStatesKey = "";
var firstElementFor = (nodePath) => {
  for (const run of runsOf(nodePath) || []) {
    const element = run.find((node) => isElement(node) && node.tagName !== "TEMPLATE");
    if (element && element.isConnected) {
      return element;
    }
  }
  return elementsWithPath(nodePath)[0] || void 0;
};
var drawsPseudo = (element, pseudo) => {
  const style = window.getComputedStyle(element, pseudo);
  return style.content !== "none" && style.content !== "normal" && style.content !== "" && style.display !== "none";
};
var drawnBefore = /* @__PURE__ */ new Set();
var drawnAfter = /* @__PURE__ */ new Set();
var drawsPseudoAt = (nodePath, pseudo) => (pseudo === "before" ? drawnBefore : drawnAfter).has(nodePath);
var sendStates = (rendered) => {
  const hidden = [];
  const inert = [];
  const before = [];
  const after = [];
  for (const nodePath of rendered) {
    const element = firstElementFor(nodePath);
    if (!element) {
      continue;
    }
    try {
      const cs = window.getComputedStyle(element);
      if (cs.display === "none") {
        hidden.push(nodePath);
      }
      if (cs.pointerEvents === "none") {
        inert.push(nodePath);
      }
      if (drawsPseudo(element, "::before")) {
        before.push(nodePath);
      }
      if (drawsPseudo(element, "::after")) {
        after.push(nodePath);
      }
    } catch {
    }
  }
  drawnBefore = new Set(before);
  drawnAfter = new Set(after);
  const key = `${hidden.join(" ")}|${inert.join(" ")}|${before.join(" ")}|${after.join(" ")}`;
  if (key === lastStatesKey) {
    return;
  }
  lastStatesKey = key;
  window.parent.postMessage({ type: "avb:node-states", hidden, inert, before, after }, "*");
};
var lastClassKey = "";
function forgetReportedKeys() {
  lastRenderedKey = "";
  lastStatesKey = "";
  lastClassKey = "";
}
var sendClasses = () => {
  const out = {};
  for (const nodePath of regions.keys()) {
    if (!inScope(nodePath)) {
      continue;
    }
    const list2 = classesForPath(nodePath)[0];
    if (list2 && list2.length) {
      out[nodePath] = list2;
    }
  }
  for (const element of Array.from(document.querySelectorAll(`[${PATH_ATTR}]`))) {
    const own = ownClasses(element);
    if (!own.length || !inFocus(element)) {
      continue;
    }
    for (const nodePath of pathsOf(element)) {
      if (inScope(nodePath) && !out[nodePath]) {
        out[nodePath] = own;
      }
    }
  }
  const key = JSON.stringify(out);
  if (key === lastClassKey) {
    return;
  }
  lastClassKey = key;
  window.parent.postMessage({ type: "avb:node-classes", classes: out }, "*");
};
var SCROLL_MARGIN = 24;
var revealTop = (top, height, viewportHeight, scrollTop) => {
  assert(Number.isFinite(top), "revealTop: the box has a top");
  assert(Number.isFinite(height), "revealTop: the box has a height");
  assert(viewportHeight >= 0, "revealTop: the viewport has a height");
  if (top >= SCROLL_MARGIN && top + height <= viewportHeight - SCROLL_MARGIN) {
    return scrollTop;
  }
  const offset = height >= viewportHeight - SCROLL_MARGIN * 2 ? SCROLL_MARGIN : Math.floor((viewportHeight - height) / 2);
  const target = Math.max(0, Math.round(scrollTop + top - offset));
  assert(target >= 0, "revealTop: a scroll position is never negative");
  return target;
};
var scrollPathIntoView = (nodePath, occ) => {
  const rects = rectsForPath(nodePath);
  if (!rects || !rects.length) {
    return;
  }
  const rect = rects[occ] ?? rects[0];
  if (!rect) {
    return;
  }
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
  const top = revealTop(rect.y, rect.h, viewportHeight, window.scrollY);
  if (top === window.scrollY) {
    return;
  }
  window.scrollTo({ top, behavior: "smooth" });
  finishReveal(top);
};
var REVEAL_CHECK_MS = 100;
var REVEAL_CHECKS_MAX = 10;
var revealWatch;
var finishReveal = (target) => {
  assert(target >= 0, "finishReveal: a scroll target is never negative");
  clearTimeout(revealWatch);
  let last = window.scrollY;
  let checks = 0;
  const check = () => {
    checks += 1;
    assert(checks <= REVEAL_CHECKS_MAX, "finishReveal: the watch is bounded");
    const now = window.scrollY;
    const arrived = Math.abs(now - target) <= 1;
    if (arrived) {
      revealWatch = void 0;
      return;
    }
    const awayFromTarget = Math.abs(now - target) > Math.abs(last - target) + 1;
    if (awayFromTarget) {
      revealWatch = void 0;
      return;
    }
    if (now === last || checks === REVEAL_CHECKS_MAX) {
      revealWatch = void 0;
      window.scrollTo({ top: target, behavior: "instant" });
      return;
    }
    last = now;
    revealWatch = setTimeout(check, REVEAL_CHECK_MS);
  };
  revealWatch = setTimeout(check, REVEAL_CHECK_MS);
};
var UNRENDERED = /* @__PURE__ */ new Set(["TEMPLATE", "SCRIPT", "STYLE", "LINK", "META", "TITLE"]);
var openedRoots = () => (focusRoots() || []).filter((node) => isElement(node) && !UNRENDERED.has(node.tagName));
var openedEls = [];
var paintOpened = () => {
  const next = openedRoots();
  if (next.length === openedEls.length && next.every((element, i) => element === openedEls[i])) {
    return;
  }
  for (const element of openedEls) {
    if (!next.includes(element)) {
      element.classList.remove("stacki-opened");
    }
  }
  for (const element of next) {
    element.classList.add("stacki-opened");
  }
  openedEls = next;
};
var rectsQueued = false;
var pageQueued = false;
var queueRects = (pageToo = false) => {
  resetThinCache();
  resetFocusCache();
  pageQueued = pageQueued || pageToo;
  if (rectsQueued) {
    return;
  }
  rectsQueued = true;
  requestAnimationFrame(() => {
    rectsQueued = false;
    const page = pageQueued;
    pageQueued = false;
    paintOpened();
    sendRects();
    if (page) {
      sendRendered();
      sendClasses();
    }
  });
};
var settleTimer;
var remeasure = () => {
  queueRects(true);
  clearTimeout(settleTimer);
  settleTimer = setTimeout(() => queueRects(true), 120);
};
var STATES_INTERVAL_MS = 250;
var styleSettleTimer;
var statesTimer;
var statesReadMs = Number.NEGATIVE_INFINITY;
var readStates = () => {
  statesReadMs = performance.now();
  sendStates(lastRendered);
};
var remeasureStyles = () => {
  queueRects();
  clearTimeout(styleSettleTimer);
  styleSettleTimer = setTimeout(() => queueRects(), 120);
  clearTimeout(statesTimer);
  const sinceMs = performance.now() - statesReadMs;
  statesTimer = setTimeout(readStates, Math.max(0, STATES_INTERVAL_MS - sinceMs));
};
var ownElement = (node) => {
  if (!isElement(node)) {
    return false;
  }
  if (node.id === "avb-design-style" || node.id === "avb-vh-override") {
    return true;
  }
  return node.hasAttribute(PROBE_ATTR);
};
var ownNode = (node) => {
  if (isComment(node)) {
    return /^avb-[se]:/.test(node.data);
  }
  return ownElement(node);
};
var classTokens = (value) => new Set((value ?? "").split(/\s+/).filter((token) => token !== ""));
var ownClassChange = (record2) => {
  if (!isElement(record2.target)) {
    return false;
  }
  const before = classTokens(record2.oldValue ?? void 0);
  const after = classTokens(record2.target.getAttribute("class") ?? void 0);
  for (const token of [...before, ...after]) {
    if (before.has(token) !== after.has(token) && !STACKI_CLASSES.has(token)) {
      return false;
    }
  }
  return true;
};
var withoutViewportHeight = (style) => (style ?? "").replace(/--avb-vh:[^;]*;?\s*/g, "").trim();
var ownAttributeChange = (record2) => {
  const target = record2.target;
  if (ownElement(target) || record2.attributeName === PATH_ATTR) {
    return true;
  }
  if (record2.attributeName === "class") {
    return ownClassChange(record2);
  }
  if (authoredStyleMutation(record2)) {
    return true;
  }
  if (record2.attributeName === "style" && target === document.documentElement) {
    const now = withoutViewportHeight(document.documentElement.getAttribute("style") ?? void 0);
    return withoutViewportHeight(record2.oldValue ?? void 0) === now;
  }
  return false;
};
var insideHead = (node) => !!document.head && document.head.contains(node);
var recordKind = (record2) => {
  if (record2.type === "attributes") {
    if (ownAttributeChange(record2)) {
      return "none";
    }
    if (insideHead(record2.target)) {
      return "css";
    }
    return record2.attributeName === "class" ? "page" : "css";
  }
  if (record2.type === "characterData") {
    const parent = record2.target.parentNode;
    if (parent !== null && ownElement(parent)) {
      return "none";
    }
    return insideHead(record2.target) ? "css" : "page";
  }
  const nodes = [...Array.from(record2.addedNodes), ...Array.from(record2.removedNodes)];
  if (ownElement(record2.target) || nodes.every(ownNode)) {
    return "none";
  }
  return insideHead(record2.target) ? "css" : "page";
};
var mutationKind = (records) => {
  let kind = "none";
  for (const record2 of records) {
    const next = recordKind(record2);
    if (next === "page") {
      return "page";
    }
    if (next === "css") {
      kind = "css";
    }
  }
  return kind;
};
var occurrenceOf = (path, target) => {
  const runs = runsOf(path);
  if (runs && runs.length > 1) {
    for (let i = 0; i < runs.length; i++) {
      const run = runs[i];
      if (!run) {
        continue;
      }
      for (const node of run) {
        if (!node.isConnected) {
          continue;
        }
        if (node === target) {
          return i;
        }
        if (node.nodeType === 1 && target !== void 0 && node.contains(target)) {
          return i;
        }
      }
    }
    return 0;
  }
  const places = taggedPlaces(path);
  if (places.length > 1) {
    for (let i = 0; i < places.length; i++) {
      const place = places[i];
      if (!place) {
        continue;
      }
      const element = place.el;
      if (element === target) {
        return i;
      }
      if (target !== void 0 && element.contains(target)) {
        return i;
      }
    }
  }
  return 0;
};

// electron/preload/frameInteraction.ts
var canvas = location.hash.includes("avb-design");
var mode = "select";
var gesture;
var DRAG_DISTANCE_PX = 6;
function canvasSelects() {
  return canvas && mode === "select";
}
function trackCanvas() {
  canvas = true;
}
function setCanvasInteraction(next) {
  canvas = true;
  mode = next;
  gesture = void 0;
  const style = document.getElementById("avb-design-style");
  if (style instanceof HTMLStyleElement) {
    style.disabled = !canvasSelects();
  }
}
function canvasDragged() {
  return gesture?.dragged ?? false;
}
function trackCanvasGesture() {
  window.addEventListener(
    "pointerdown",
    (event) => {
      gesture = event.button === 0 ? { x: event.clientX, y: event.clientY, dragged: false } : void 0;
    },
    true
  );
  window.addEventListener(
    "pointermove",
    (event) => {
      if (gesture) {
        if (Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) >= DRAG_DISTANCE_PX) {
          gesture.dragged = true;
        }
      }
    },
    true
  );
  window.addEventListener(
    "pointercancel",
    () => {
      gesture = void 0;
    },
    true
  );
}

// electron/preload/frameTextMatch.ts
function matchCanvasText(target, clicked) {
  const parents = elementsWithPath(target.parent).filter((parent2) => parent2.contains(clicked));
  const parent = parents.find((outer) => parents.every((inner) => inner === outer || !outer.contains(inner)));
  if (!parent || target.kind === "element" && parent.localName !== target.tag) {
    return void 0;
  }
  let ancestor = clicked;
  for (let depth = 0; ancestor && ancestor !== parent && depth < 32; depth++) {
    if (pathsOf(ancestor).some((path) => target.siblings.includes(path))) {
      return void 0;
    }
    ancestor = ancestor.parentElement ?? void 0;
  }
  if (target.segment !== void 0) {
    return segmentMatch(parent, target, target.segment);
  }
  const mapped2 = (runsOf(target.path) ?? []).filter((run) => run.length > 0 && run.every((node) => node.isConnected && parent.contains(node)));
  const exact = mapped2.filter((run) => run.every((node) => node instanceof Text));
  if (exact.length === 1) {
    const nodes = exact[0]?.filter((node) => node instanceof Text) ?? [];
    if (sameText(nodes, target.value)) {
      return { nodes, element: parent };
    }
  }
  if (target.siblings.some((path) => elementsWithPath(path).filter((element) => parent.contains(element)).length !== 1)) {
    return void 0;
  }
  let scope = clicked;
  for (let depth = 0; scope && depth < 32; depth++) {
    const matches = textGroups(scope, target).filter((nodes) => sameText(nodes, target.value));
    if (matches.length === 1 && matches[0]) {
      return { nodes: matches[0], element: scope };
    }
    if (scope === parent || matches.length > 1) {
      return void 0;
    }
    if (textBoundaryOf(scope, target) === "component") {
      return void 0;
    }
    scope = scope.parentElement ?? void 0;
  }
  return void 0;
}
function segmentMatch(parent, target, segment) {
  const walker = document.createTreeWalker(parent, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  for (let index = 0; node && index < segment && index < 1e3; index++) {
    node = walker.nextNode();
  }
  if (!(node instanceof Text) || !sameText([node], target.value)) {
    return void 0;
  }
  return { nodes: [node], element: parent };
}
function textGroups(parent, target) {
  const groups = [[]];
  const queue = Array.from(parent.childNodes).reverse();
  let count = 0;
  while (queue.length > 0 && count++ < 1e3) {
    const node = queue.pop();
    if (node === "break") {
      groups.push([]);
    } else if (node instanceof Text) {
      groups[groups.length - 1]?.push(node);
    } else if (node instanceof Element) {
      const boundary = textBoundaryOf(node, target);
      switch (boundary) {
        case "authored":
          groups.push([]);
          break;
        case "component":
          groups.push([]);
          queue.push("break", ...Array.from(node.childNodes).reverse());
          break;
        case "transparent":
          queue.push(...Array.from(node.childNodes).reverse());
          break;
        default: {
          const exhaustive = boundary;
          return exhaustive;
        }
      }
    }
  }
  assert(count <= 1001, "The text run walk stays within its node bound");
  return queue.length ? [] : groups.filter((nodes) => nodes.length > 0);
}
function textBoundaryOf(element, target) {
  const paths = pathsOf(element);
  const namespace = target.parent.slice(0, target.parent.lastIndexOf("|") + 1);
  const authored = paths.some((path) => {
    if (path === target.parent || path === target.path) {
      return false;
    }
    if (target.kind === "element" || target.siblings.includes(path)) {
      return true;
    }
    return path.slice(0, path.lastIndexOf("|") + 1) === namespace;
  });
  if (authored) {
    return "authored";
  }
  if (target.kind === "element") {
    return ["SPAN", "DIV"].includes(element.tagName) ? "transparent" : "authored";
  }
  if (["SCRIPT", "STYLE", "TEXTAREA", "SELECT", "SVG"].includes(element.tagName)) {
    return "authored";
  }
  if (paths.includes(target.parent) || paths.includes(target.path)) {
    return "transparent";
  }
  return paths.length > 0 ? "component" : "transparent";
}
function sameText(nodes, expected) {
  const actual = nodes.map((node) => node.data).join("");
  const normalize = (value) => value.replace(/[\t\r\n ]+/g, " ").trim();
  return normalize(actual) === normalize(expected);
}
function canvasTextRect(match) {
  const first = match.nodes[0];
  const last = match.nodes.at(-1);
  if (!first || !last) {
    return void 0;
  }
  const range = document.createRange();
  range.setStartBefore(first);
  range.setEndAfter(last);
  return range.getBoundingClientRect();
}

// shared/core/brand.ts
var DIGEST_RE = /^[0-9a-f]{64}$/;
function toDigest(value) {
  if (!DIGEST_RE.test(value)) {
    throw new Error("Digest: expected 64 lowercase hex characters");
  }
  return value;
}

// shared/core/limits.ts
var LIMITS = {
  /** Nodes in one page tree. A 50k-line page is already a code-view page. */
  treeNodesMax: 2e4,
  /** Nesting depth of one page tree. Hand-written markup rarely exceeds 20. */
  treeDepthMax: 64,
  /** Length of a tag or component name. */
  tagNameCharsMax: 128,
  /** Length of a single attribute name or value. */
  attrCharsMax: 8192,
  /** Attributes on one tag. */
  attrsPerNodeMax: 256,
  /** Text/comment/raw payload of one node, in UTF-16 code units. */
  nodeValueCharsMax: 1e6,
  /** Entries of each kind in a project scan (pages, layouts, components). */
  scanEntriesMax: 1e4,
  /** Folders listed by a project scan. */
  scanFoldersMax: 2e3,
  /** Props on one component schema. */
  propSchemaFieldsMax: 512,
  /** Literal options on one union-typed prop. */
  propOptionsMax: 256,
  /** Import declarations in one frontmatter block. */
  importsMax: 256,
  /** Length of one IPC payload string field. */
  ipcFieldCharsMax: 1e7,
  /** Length of one path crossing a boundary: Windows' extended-length limit. */
  ipcPathCharsMax: 32768,
  /** Items in one array or keys in one object crossing a boundary. */
  ipcItemsMax: 1e5,
  /** Nesting depth of one structured value crossing a boundary. */
  ipcDepthMax: 128,
  /** TextMate highlighting is synchronous CPU work after grammar startup. */
  syntaxHighlightCharsMax: 1e6,
  // Editor core (plan §8). The projection reuses treeNodesMax and treeDepthMax:
  // a projected node is a page-tree node, so one name keeps one meaning.
  /** Bytes of one source file. Merged up from electron/lib/mainLimits.ts so the
   * renderer, the actor and the disk readers answer to one number. */
  sourceBytesMax: 10 * 1024 * 1024,
  /** Intents accepted by one document actor and not yet terminal. Past this,
   * submission returns `backpressured`; the persistence layer holds the draft. */
  intentsPendingMax: 64,
  /** UTF-8 bytes of every string an intent carries, summed. A code patch or a
   * `rewrite-text` may rewrite a whole file's content, so the bound is the file
   * bound itself. */
  intentPayloadBytesMax: 10 * 1024 * 1024,
  /** Splices one intent may plan, and sites one multi-span operation may name.
   * A loop rename in a generated page touches hundreds of sites, not millions. */
  splicesPerIntentMax: 4096,
  /** Work units one diff may spend, and each span mapping through it: one unit
   * is one byte comparison or one frontier cell (shared/engine/diff.ts). A 10 MB file
   * with a small edit costs about 4·10⁷ — both directions scan it once — so the
   * bound admits the largest file and refuses quadratic blow-ups. Exhaustion is
   * a `resource-limit` rejection, never a silent fallback. */
  diffWorkMax: 5e7,
  /** Edit distance (bytes deleted plus bytes inserted) one diff searches to.
   * The frontiers it keeps grow with its square: 2·(D + 1)² 32-bit cells, about
   * 34 MB at this bound. An external change larger than this, racing a pending
   * intent, rejects with `resource-limit`; the renderer re-authors against the
   * refreshed snapshot, where no diff is needed. */
  diffDistanceMax: 2048,
  /** Document actors one host keeps (electron/documents/documentActors.ts). An actor
   * holds only its snapshot between intents, so the least recently used idle
   * one is dropped past this bound and re-reads the disk on its next intent. */
  documentActorsMax: 512,
  /** Snapshot bytes all of one host's actors retain together. Without it, 512
   * actors could each hold a 10 MB file; past it, idle actors are dropped. */
  documentBytesRetainedMax: 64 * 1024 * 1024,
  /** Parses one actor may have in flight: the current read plus one newer. */
  parseTasksInFlightMax: 2,
  /** Snapshots one actor retains: the committed one plus the candidate under
   * verification. Pending intents keep only their authored preconditions. */
  snapshotsRetainedMax: 2,
  /** Earlier snapshots a host keeps per actor (step 6): the bytes the renderer
   * authored an edit against, once the actor's own writes or an outside one
   * replaced them. The renderer keeps authoring against the page it shows
   * until a save lands with nothing newer typed, so a run of saves under a
   * busy keyboard needs as many as the commit log holds. Past either bound,
   * such an edit is refused, never guessed, and the page asks to be reloaded. */
  authoredSnapshotsMax: 16,
  /** Bytes of those earlier snapshots per actor, so sixteen copies of a 10 MB
   * page never pile up; the oldest go first. */
  authoredBytesRetainedMax: 16 * 1024 * 1024,
  /** Commits a host remembers per actor — the bytes before, the bytes after,
   * the splices between — so an edit authored before the actor's own recent
   * writes is rebased exactly, without a diff (shared/engine/rebase.ts). */
  commitLogEntriesMax: 16,
  /** Undo entries one session keeps (the renderer's history; step 6 moves the
   * bound here from a literal in App.tsx, where it was already 100). */
  undoEntriesMax: 100,
  /** Files one watcher tick may mark dirty. Events coalesce into a set, so the
   * bound caps a burst like `git checkout`, not the event count. */
  watcherFilesPerTickMax: 1024,
  /** Source markers one preview render may carry — one per projected node. The
   * frame counts the stamps of one render against it too (every rendered copy
   * of a component stamps once), and the morph reloads past it (step 7). */
  previewMarkersMax: 2e4,
  /** Work one canvas patch may spend lining up the old and new renderings: one
   * unit per cell of the child-list matrices it builds (electron/previewClient/morphClient.ts)
   * — a list of 2 000 children changed in the middle is 4·10⁶ cells, 16 MB of
   * Int32. Past it the canvas reloads, and says why, instead of freezing the
   * editor on a page too big to diff (step 7). */
  previewMorphWorkMax: 4e6,
  /** Distinct files one preview render's manifest may name: the page, its
   * layouts and every component that rendered (shared/page/previewToken.ts). A
   * render past it has no token, and its events are refused. */
  previewManifestFilesMax: 512,
  /** UTF-16 units of one project-relative path in a preview stamp. */
  previewStampPathCharsMax: 1024,
  /** Diagnostics one parse-error projection carries, and the length of each. */
  diagnosticsMax: 64,
  diagnosticCharsMax: 4096
};

// shared/core/record.ts
function toRecord(input) {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return void 0;
  }
  return input;
}
function toArray(input) {
  if (!Array.isArray(input)) {
    return void 0;
  }
  return input;
}

// shared/core/boundary.ts
var BOUNDARY_LIMITS = {
  textLengthMax: LIMITS.ipcFieldCharsMax,
  pathLengthMax: LIMITS.ipcPathCharsMax,
  itemsMax: LIMITS.ipcItemsMax,
  depthMax: LIMITS.ipcDepthMax
};
function text(input) {
  if (typeof input !== "string") {
    throw new Error("Expected string");
  }
  if (input.length > BOUNDARY_LIMITS.textLengthMax) {
    throw new Error("String exceeds limit");
  }
  return input;
}
function pathText(input) {
  const value = text(input);
  if (value.length > BOUNDARY_LIMITS.pathLengthMax) {
    throw new Error("Path exceeds limit");
  }
  if (value.includes("\0")) {
    throw new Error("Path contains NUL");
  }
  return value;
}
function digest(input) {
  if (typeof input !== "string") {
    throw new Error("Expected digest string");
  }
  return toDigest(input);
}
function optional(parse) {
  return (input) => input === void 0 ? void 0 : parse(input);
}
function list(parse) {
  return (input) => {
    const values = toArray(input);
    if (!values) {
      throw new Error("Expected array");
    }
    if (values.length > BOUNDARY_LIMITS.itemsMax) {
      throw new Error("Array exceeds limit");
    }
    return values.map(parse);
  };
}
function record(input) {
  const value = toRecord(input);
  if (!value) {
    throw new Error("Expected object");
  }
  if (Object.keys(value).length > BOUNDARY_LIMITS.itemsMax) {
    throw new Error("Object exceeds limit");
  }
  return value;
}
function object(shape) {
  return (input) => {
    const source = record(input);
    const result = {};
    for (const [key, parse] of Object.entries(shape)) {
      const value = parse(source[key]);
      if (value !== void 0) {
        result[key] = value;
      }
    }
    return result;
  };
}

// shared/properties/canvasText.ts
var CANVAS_TEXT_LIMIT = 1e4;
var CANVAS_TARGET_LIMIT = 2e3;
function canvasTextValue(input) {
  const value = text(input);
  if (value.length > CANVAS_TEXT_LIMIT) {
    throw new Error("Canvas text exceeds limit");
  }
  return value;
}
function parseCanvasTextCatalog(input) {
  const data = record(input);
  if (data["type"] !== "avb:text-catalog") {
    throw new Error("Expected canvas text catalog");
  }
  const targets = list(parseTarget)(data["targets"]);
  if (targets.length > CANVAS_TARGET_LIMIT) {
    throw new Error("Too many canvas text targets");
  }
  return {
    type: "avb:text-catalog",
    session: pathText(data["session"]),
    file: pathText(data["file"]),
    checksum: digest(data["checksum"]),
    targets
  };
}
function parseTarget(input) {
  const data = record(input);
  if (data["kind"] !== "element" && data["kind"] !== "component") {
    throw new Error("Expected text container kind");
  }
  if (typeof data["nested"] !== "boolean") {
    throw new Error("Expected nested text flag");
  }
  const siblings = list(pathText)(data["siblings"]);
  if (siblings.length > 100) {
    throw new Error("Too many protected text siblings");
  }
  return {
    kind: data["kind"],
    tag: pathText(data["tag"]),
    siblings,
    key: pathText(data["key"]),
    path: pathText(data["path"]),
    parent: pathText(data["parent"]),
    value: canvasTextValue(data["value"]),
    label: pathText(data["label"]),
    nested: data["nested"],
    ...data["scope"] === void 0 ? {} : { scope: pathText(data["scope"]) },
    ...data["from"] === void 0 ? {} : { from: parseFrom(data["from"]) },
    ...data["segment"] === void 0 ? {} : { segment: parseSegment(data["segment"]) }
  };
}
function parseFrom(input) {
  if (input !== "slot" && input !== "prop") {
    throw new Error("Expected where canvas text comes from");
  }
  return input;
}
function parseSegment(input) {
  if (typeof input !== "number" || !Number.isSafeInteger(input)) {
    throw new Error("Expected a text segment index");
  }
  if (input < 0 || input >= CANVAS_TEXT_LIMIT) {
    throw new Error("Text segment index out of range");
  }
  return input;
}
var FOLDABLE = /[\t\r\n ]/;
function canvasTextFolded(text2, offset) {
  if (!Number.isSafeInteger(offset) || offset < 0 || offset > text2.length) {
    throw new Error("Canvas text offset is outside its text");
  }
  let count = 0;
  let started = false;
  let inSpace = false;
  assert(offset <= text2.length, "A folded offset lies inside its text");
  for (let index = 0; index < offset; index += 1) {
    if (FOLDABLE.test(text2.charAt(index))) {
      if (started && !inSpace) {
        count += 1;
      }
      inSpace = true;
    } else {
      started = true;
      inSpace = false;
      count += 1;
    }
  }
  assert(count <= offset, "Folding never adds characters");
  return count;
}

// shared/properties/canvasTextOverlay.ts
var CANVAS_FOCUS_PATHS_MAX = 256;
function parseCanvasTextFocus(input) {
  const data = record(input);
  if (data["type"] !== "avb:text-focus") {
    return void 0;
  }
  const paths = list(pathText)(data["paths"]);
  if (paths.length > CANVAS_FOCUS_PATHS_MAX) {
    throw new Error("Canvas text focus exceeds limit");
  }
  return { type: "avb:text-focus", paths: paths.filter((path) => path !== "") };
}
function parseCanvasTextClose(input) {
  const data = record(input);
  if (data["type"] !== "avb:text-close") {
    return void 0;
  }
  if (data["action"] !== "apply" && data["action"] !== "cancel") {
    throw new Error("Expected text editing close action");
  }
  return { session: pathText(data["session"]), action: data["action"] };
}

// electron/preload/frameTextSelection.ts
function textSelection(nodes, range) {
  const selection = window.getSelection();
  const current = range ?? (selection?.rangeCount ? selection.getRangeAt(0) : void 0);
  if (!current) {
    return void 0;
  }
  const start2 = textOffset(nodes, current.startContainer, current.startOffset);
  const end = textOffset(nodes, current.endContainer, current.endOffset);
  if (start2 === void 0 || end === void 0 || start2 > end) {
    return void 0;
  }
  return { start: start2, end };
}
function selectTextOffsets(nodes, offsets) {
  const first = positionAt(nodes, offsets.start);
  const last = positionAt(nodes, offsets.end);
  if (!first || !last) {
    return;
  }
  const range = document.createRange();
  range.setStart(first.node, first.offset);
  range.setEnd(last.node, last.offset);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}
function placeTextCaret(nodes, event) {
  const offsets = caretOffsetsAt(nodes, event.clientX, event.clientY) ?? caretBesideText(nodes, event);
  if (offsets) {
    selectTextOffsets(nodes, offsets);
  }
}
function caretOffsetsAt(nodes, x, y) {
  const range = document.caretRangeFromPoint(x, y);
  return range ? textSelection(nodes, range) : void 0;
}
function caretBesideText(nodes, event) {
  const first = nodes[0];
  const last = nodes.at(-1);
  if (!first || !last) {
    return void 0;
  }
  const range = document.createRange();
  range.setStart(first, 0);
  range.setEnd(last, last.length);
  const box = range.getBoundingClientRect();
  const x = Math.min(Math.max(event.clientX, box.left + 1), box.right - 1);
  const y = Math.min(Math.max(event.clientY, box.top + 1), box.bottom - 1);
  return caretOffsetsAt(nodes, x, y);
}
function textEditorRoot(match) {
  let root = match.nodes[0]?.parentElement;
  for (let depth = 0; root && depth < 32; depth++) {
    if (match.nodes.every((node) => root?.contains(node))) {
      return root instanceof HTMLElement ? root : void 0;
    }
    root = root.parentElement;
  }
  return void 0;
}
function textOffset(nodes, container, offset) {
  let total = 0;
  for (const node of nodes) {
    if (container === node) {
      return offset <= node.length ? total + offset : void 0;
    }
    const children = node.parentNode?.childNodes;
    if (container === node.parentNode && children) {
      const index = Array.from(children).indexOf(node);
      if (offset === index) {
        return total;
      }
      if (offset === index + 1) {
        return total + node.length;
      }
    }
    total += node.length;
  }
  return void 0;
}
function positionAt(nodes, offset) {
  let remaining = offset;
  for (const node2 of nodes) {
    if (remaining <= node2.length) {
      return { node: node2, offset: remaining };
    }
    remaining -= node2.length;
  }
  const node = nodes.at(-1);
  return node ? { node, offset: node.length } : void 0;
}

// electron/preload/frameTextBuffer.ts
function createTextBuffer(root, nodes, changed = () => {
}) {
  const structure = captureStructure(root, nodes);
  if (!structure) {
    return void 0;
  }
  const original = nodes.map((node) => node.data);
  let rendered = original;
  let history = [{ texts: original, selection: { start: 0, end: 0 } }];
  let index = 0;
  const intact = () => structure.intact() && nodes.every((node, position) => node.data === rendered[position]);
  const write = (texts) => {
    writeTexts(nodes, texts);
    rendered = texts;
  };
  const remember = (selection) => {
    history = [...history.slice(0, index + 1), { texts: rendered, selection }].slice(-64);
    index = history.length - 1;
  };
  return {
    intact,
    value: () => rendered.join("") === original.join("") ? void 0 : rendered.join(""),
    length: () => rendered.join("").length,
    // The original words back; `keep` shows the typed ones again once a save is checked.
    restore: () => closeTextBuffer(original, rendered, { intact, write }),
    replace: (range, text2) => {
      if (!intact() || rendered.join("").length - (range.end - range.start) + text2.length > CANVAS_TEXT_LIMIT) {
        return;
      }
      history = history.map((entry, position) => position === index ? { texts: entry.texts, selection: range } : entry);
      write(replaceText(rendered, range, text2));
      const selection = { start: range.start + text2.length, end: range.start + text2.length };
      remember(selection);
      selectTextOffsets(nodes, selection);
      changed(rendered.join(""));
    },
    composition: () => {
      const texts = nodes.map((node) => node.data);
      if (!structure.intact() || texts.join("").length > CANVAS_TEXT_LIMIT) {
        return false;
      }
      rendered = texts;
      changed(rendered.join(""));
      return true;
    },
    remember,
    rollbackNative: () => {
      structure.restore();
      write(rendered);
    },
    history: (direction) => {
      const next = index + (direction === "undo" ? -1 : 1);
      const state = history[next];
      if (intact() && state) {
        index = next;
        write(state.texts);
        selectTextOffsets(nodes, state.selection);
        changed(rendered.join(""));
      }
    }
  };
}
function closeTextBuffer(original, typed, buffer) {
  const restored = restoreTextBuffer(original, buffer.intact, buffer.write);
  assert(!restored || buffer.intact(), "A restored buffer is intact");
  return { restored, keep: () => void restoreTextBuffer(typed, buffer.intact, buffer.write) };
}
function restoreTextBuffer(texts, intact, write) {
  if (!intact()) {
    return false;
  }
  write(texts);
  return true;
}
function replaceText(texts, range, insert) {
  assert(Number.isSafeInteger(range.start), "Text selection start must be an integer");
  assert(Number.isSafeInteger(range.end), "Text selection end must be an integer");
  assert(range.start >= 0, "Text selection start must not be negative");
  assert(range.end >= range.start, "Text selection must be ordered");
  assert(range.end <= texts.join("").length, "Text selection must stay inside its segment");
  let position = 0;
  let inserted = false;
  return texts.map((text2) => {
    const start2 = position;
    position += text2.length;
    if (position < range.start || start2 > range.end) {
      return text2;
    }
    const prefix2 = text2.slice(0, Math.max(0, range.start - start2));
    const suffix = text2.slice(Math.max(0, range.end - start2));
    const replacement = inserted ? "" : insert;
    inserted = true;
    return prefix2 + replacement + suffix;
  });
}
function captureStructure(root, nodes) {
  assert(nodes.length > 0, "Text editing requires a matched text node");
  assert(
    nodes.every((node) => root.contains(node)),
    "Text nodes must belong to the editor"
  );
  const pending = [root];
  const structure = [];
  for (let count = 0; pending.length && count < 1e3; count++) {
    const node = pending.pop();
    if (!node) {
      break;
    }
    if (node.childNodes.length + pending.length + structure.length > 1e3) {
      return void 0;
    }
    const children = Array.from(node.childNodes);
    structure.push({ node, children, text: node instanceof Text ? node.data : void 0 });
    pending.push(...children);
  }
  if (pending.length) {
    return void 0;
  }
  return {
    intact: () => structure.every(
      ({ node, children, text: text2 }) => node.isConnected && children.length === node.childNodes.length && children.every((child, position) => node.childNodes[position] === child) && (text2 === void 0 || node instanceof Text && nodes.includes(node) || node.textContent === text2)
    ),
    restore: () => {
      for (const { node, children, text: text2 } of structure) {
        if (node instanceof Element && (node.childNodes.length !== children.length || children.some((child, position) => node.childNodes[position] !== child))) {
          node.replaceChildren(...children);
        }
        if (node instanceof Text && text2 !== void 0 && !nodes.includes(node)) {
          node.data = text2;
        }
      }
    }
  };
}
function writeTexts(nodes, texts) {
  for (const [position, node] of nodes.entries()) {
    const value = texts[position];
    if (value !== void 0 && node.data !== value) {
      node.data = value;
    }
  }
}

// electron/preload/frameTextNativeEvents.ts
function installNativeTextEvents(options) {
  const controller = new AbortController();
  const listener = { capture: true, signal: controller.signal };
  const composing = installCompositionEvents(options, listener);
  const owns = (event) => event.target instanceof Node && options.root.contains(event.target);
  window.addEventListener(
    "keydown",
    (event) => {
      if (owns(event)) {
        nativeTextKey(options, event);
      }
    },
    listener
  );
  window.addEventListener(
    "beforeinput",
    (event) => {
      if (!owns(event) || !(event instanceof InputEvent)) {
        return;
      }
      event.stopImmediatePropagation();
      if (composing.beforeInput()) {
        return;
      }
      event.preventDefault();
      nativeTextInput(options, event);
    },
    listener
  );
  window.addEventListener("paste", (event) => nativeTextPaste(options, event), listener);
  window.addEventListener("cut", (event) => nativeTextCut(options, event), listener);
  options.root.addEventListener("blur", () => options.finish("apply"), listener);
  window.addEventListener("blur", () => options.finish("apply"), { signal: controller.signal });
  return () => controller.abort();
}
function installCompositionEvents(options, listener) {
  let composing = false;
  let nativePending = false;
  const owns = (event) => event.target instanceof Node && options.root.contains(event.target);
  window.addEventListener(
    "input",
    (event) => {
      if (!owns(event)) {
        return;
      }
      event.stopImmediatePropagation();
      if (!composing || !options.buffer.composition()) {
        if (nativePending) {
          options.buffer.rollbackNative();
        }
        options.finish("cancel");
      }
      nativePending = false;
    },
    listener
  );
  window.addEventListener(
    "compositionstart",
    (event) => {
      if (owns(event)) {
        composing = !!textSelection(options.nodes) && options.buffer.intact();
        if (!composing) {
          options.finish("cancel");
        }
      }
    },
    listener
  );
  window.addEventListener(
    "compositionend",
    (event) => {
      if (owns(event)) {
        composing = false;
        const selection = textSelection(options.nodes);
        if (selection && options.buffer.composition()) {
          options.buffer.remember(selection);
        } else {
          options.finish("cancel");
        }
      }
    },
    listener
  );
  return {
    beforeInput: () => {
      nativePending = composing && !!textSelection(options.nodes) && options.buffer.intact();
      return nativePending;
    }
  };
}
function nativeTextKey(options, event) {
  event.stopImmediatePropagation();
  if (event.isComposing) {
    return;
  }
  const modifier = event.metaKey || event.ctrlKey;
  const key = event.key.toLowerCase();
  if (modifier && key === "a") {
    event.preventDefault();
    selectTextOffsets(options.nodes, { start: 0, end: options.buffer.length() });
  } else if (modifier && (key === "z" || key === "y")) {
    event.preventDefault();
    options.buffer.history(event.shiftKey || key === "y" ? "redo" : "undo");
  } else if (event.key === "Escape" || event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    options.finish(event.key === "Escape" ? "cancel" : "apply");
  }
}
function nativeTextInput(options, event) {
  if (event.inputType === "historyUndo" || event.inputType === "historyRedo") {
    options.buffer.history(event.inputType === "historyUndo" ? "undo" : "redo");
    return;
  }
  const ranges = event.getTargetRanges();
  if (ranges.length > 1) {
    return;
  }
  const expands = event.inputType.startsWith("delete") || event.inputType === "insertReplacementText";
  const range = textSelection(options.nodes, expands ? ranges[0] : void 0);
  if (!range) {
    return;
  }
  if (event.inputType.startsWith("delete") && event.inputType !== "deleteByDrag") {
    options.buffer.replace(range, "");
  } else if (["insertText", "insertReplacementText"].includes(event.inputType)) {
    if (typeof event.data === "string") {
      options.buffer.replace(range, event.data);
    }
  } else if (event.inputType === "insertLineBreak" || event.inputType === "insertParagraph") {
    options.buffer.replace(range, "\n");
  }
}
function nativeTextPaste(options, event) {
  if (!(event.target instanceof Node) || !options.root.contains(event.target)) {
    return;
  }
  event.preventDefault();
  event.stopImmediatePropagation();
  const selection = textSelection(options.nodes);
  const text2 = event.clipboardData?.getData("text/plain");
  if (selection && text2 !== void 0) {
    options.buffer.replace(selection, text2);
  }
}
function nativeTextCut(options, event) {
  if (!(event.target instanceof Node) || !options.root.contains(event.target)) {
    return;
  }
  event.preventDefault();
  event.stopImmediatePropagation();
  const selection = textSelection(options.nodes);
  if (selection && event.clipboardData) {
    const text2 = options.nodes.map((node) => node.data).join("");
    event.clipboardData.setData("text/plain", text2.slice(selection.start, selection.end));
    options.buffer.replace(selection, "");
  }
}

// electron/preload/frameTextNative.ts
var editingRoot;
var stylesheet;
function isCanvasTextEditing(target) {
  return target instanceof Node && !!editingRoot?.contains(target);
}
function openNativeText(match, event, changed, done) {
  const root = textEditorRoot(match);
  if (!root || match.nodes.map((node) => node.data).join("").length > 1e4) {
    return void 0;
  }
  const buffer = createTextBuffer(root, match.nodes, changed);
  if (!buffer) {
    return void 0;
  }
  const attributes = ["contenteditable", "data-avb-text-editor"].map((name) => ({
    name,
    value: root.getAttribute(name)
  }));
  let closed = false;
  const finish = (action) => {
    if (closed) {
      return;
    }
    closed = true;
    cleanup();
    clearNativeTextSelection(root);
    const value = action === "apply" ? buffer.value() : void 0;
    const { restored, keep } = buffer.restore();
    for (const attribute of attributes) {
      if (attribute.value === null) {
        root.removeAttribute(attribute.name);
      } else {
        root.setAttribute(attribute.name, attribute.value);
      }
    }
    editingRoot = void 0;
    root.blur();
    done({ value, restored, keep });
  };
  installNativeTextStyle(root);
  root.setAttribute("contenteditable", "true");
  root.setAttribute("data-avb-text-editor", "");
  editingRoot = root;
  const cleanup = installNativeTextEvents({ root, nodes: match.nodes, buffer, finish });
  root.focus({ preventScroll: true });
  placeTextCaret(match.nodes, event);
  return {
    finish,
    intact: buffer.intact,
    contains: (click) => {
      const range = document.caretRangeFromPoint(click.clientX, click.clientY);
      return isCanvasTextEditing(click.target) && !!range && !!textSelection(match.nodes, range);
    }
  };
}
function clearNativeTextSelection(root) {
  const selection = window.getSelection();
  if (!selection) {
    return;
  }
  if (root.contains(selection.anchorNode) || root.contains(selection.focusNode)) {
    selection.removeAllRanges();
  }
}
function installNativeTextStyle(root) {
  const whitespace = getComputedStyle(root).whiteSpace;
  if (!stylesheet) {
    stylesheet = new CSSStyleSheet();
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, stylesheet];
  }
  stylesheet.replaceSync(
    `[data-avb-text-editor] { outline: none !important; caret-color: auto !important; white-space: ${whitespace} !important; }[data-avb-text-editor], [data-avb-text-editor] * { cursor: text !important; }`
  );
}

// electron/preload/frameTextSession.ts
function createCanvasTextSession(post2) {
  let catalog;
  let active;
  let typing;
  let focus = /* @__PURE__ */ new Set();
  const finish = (action) => active?.editor.finish(action);
  return {
    catalog: () => catalog,
    focus: () => focus,
    // The selected node's page path.
    editing: () => active ? typing?.key : void 0,
    editingElement: () => active ? typing?.element : void 0,
    contains: (event) => active?.editor.contains(event) ?? false,
    dismiss: () => finish("apply"),
    reconcile: () => {
      if (active && stale(active)) {
        finish("cancel");
      }
    },
    receive: (input) => {
      const request = readCanvasTextRequest(input);
      if (!request) {
        return;
      }
      if (request.kind === "focus") {
        focus = new Set(request.value.paths);
        return;
      }
      if (request.kind === "close") {
        if (active?.catalog.session === request.value.session) {
          finish(request.value.action);
        }
        return;
      }
      if (catalog?.session !== request.value.session) {
        finish("cancel");
      }
      catalog = request.value;
    },
    open: (target, match, event) => {
      finish("apply");
      const current = catalog;
      if (!current) {
        return;
      }
      const scope = { session: current.session, key: target.key };
      const stopSelection = reportTextSelection(match.nodes, scope, post2);
      const editor = openNativeText(
        match,
        event,
        (value) => post2({ type: "avb:text-draft", session: current.session, key: target.key, value }),
        (result) => {
          active = void 0;
          stopSelection();
          commitCanvasText({ catalog: current, target, match }, result, post2);
          post2({ type: "avb:text-inactive", session: current.session });
        }
      );
      if (editor) {
        active = { catalog: current, editor };
        typing = { key: target.key, element: match.element };
        post2({ type: "avb:text-active", session: current.session, key: target.key });
      } else {
        stopSelection();
        post2({ type: "avb:text-refused", message: "This text cannot be edited safely." });
      }
    }
  };
}
function stale(active) {
  if (!active.editor.intact()) {
    return true;
  }
  return !canvasTextSourceMatches(active.catalog.file, active.catalog.checksum);
}
function reportTextSelection(nodes, scope, post2) {
  let last = "";
  const report3 = () => {
    const offsets = textSelection(nodes);
    const selection = window.getSelection();
    let range = void 0;
    const text2 = nodes.map((node) => node.data).join("");
    const start2 = offsets ? canvasTextFolded(text2, offsets.start) : 0;
    const end = offsets ? canvasTextFolded(text2, offsets.end) : 0;
    if (start2 < end && selection?.rangeCount) {
      const box = selection.getRangeAt(0).getBoundingClientRect();
      const rect = { x: box.left, y: box.top, w: box.width, h: box.height };
      range = { start: start2, end, rect };
    }
    const next = range ? JSON.stringify(range) : "none";
    if (next !== last) {
      last = next;
      post2({ type: "avb:text-selection", ...scope, ...range ? { range } : {} });
    }
  };
  document.addEventListener("selectionchange", report3);
  return () => {
    document.removeEventListener("selectionchange", report3);
    if (last !== "" && last !== "none") {
      post2({ type: "avb:text-selection", ...scope });
    }
  };
}
function commitCanvasText(entry, result, post2) {
  const { value, restored } = result;
  if (value === void 0 || value === entry.target.value) {
    return;
  }
  if (!restored || !matchCanvasText(entry.target, entry.match.element) || !canvasTextSourceMatches(entry.catalog.file, entry.catalog.checksum)) {
    post2({
      type: "avb:text-refused",
      message: "The page changed while editing. The text was not saved; select it again."
    });
    return;
  }
  post2({ type: "avb:text-save", session: entry.catalog.session, key: entry.target.key, value });
  result.keep();
}
function readCanvasTextRequest(input) {
  try {
    const focus = parseCanvasTextFocus(input);
    if (focus) {
      return { kind: "focus", value: focus };
    }
    const close = parseCanvasTextClose(input);
    if (close) {
      return { kind: "close", value: close };
    }
    return { kind: "catalog", value: parseCanvasTextCatalog(input) };
  } catch {
    return void 0;
  }
}

// electron/preload/frameTextMarks.ts
var MATCHES_MAX = 200;
function installTextMarks(source) {
  const layer = document.createElement("div");
  layer.setAttribute("data-avb-text-marks", "");
  layer.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:2147483646;contain:strict;";
  let frame = 0;
  let pointer;
  let picked;
  let reported = "";
  const draw = () => {
    frame = 0;
    const shown = markedNow(source);
    const editing = source.editing();
    const typing = shown.some(({ target }) => target.key === editing);
    picked = typing ? editing : shown.some(({ target }) => target.key === picked) ? picked : void 0;
    const at = pointer;
    const hover = at ? shown.find(({ element }) => holds(element, at)) : void 0;
    const chosen = shown.find(({ target }) => target.key === picked);
    if (!layer.isConnected) {
      document.documentElement.appendChild(layer);
    }
    layer.replaceChildren(...shown.filter((match) => match !== hover && match !== chosen).map(({ element }) => dashedMark(element.getBoundingClientRect())));
    const message = { type: "avb:text-marks", hover: report(hover), picked: report(chosen) };
    const text2 = JSON.stringify(message);
    if (text2 !== reported) {
      reported = text2;
      source.post(message);
    }
  };
  const schedule = () => {
    if (!frame) {
      frame = requestAnimationFrame(draw);
    }
  };
  window.addEventListener("pointermove", (event) => {
    pointer = { x: event.clientX, y: event.clientY };
    schedule();
  });
  window.addEventListener("pointerout", (event) => {
    if (event.relatedTarget === null) {
      pointer = void 0;
      schedule();
    }
  });
  window.addEventListener(
    "click",
    (event) => {
      const at = { x: event.clientX, y: event.clientY };
      picked = markedNow(source).find(({ element }) => holds(element, at))?.target.key;
      schedule();
    },
    true
  );
  window.addEventListener("scroll", schedule, true);
  window.addEventListener("resize", schedule);
  document.addEventListener("avb:morphed", schedule);
  return schedule;
}
function markedNow(source) {
  const focus = source.focus();
  if (!source.visible()) {
    return [];
  }
  const editing = source.editing();
  const element = source.editingElement();
  const typed = source.catalog()?.targets.find((target) => target.key === editing);
  const typing = typed && element && marked(typed, focus) ? [{ target: typed, element }] : [];
  const others = matchesWhere(source.catalog(), (target) => marked(target, focus) && target.key !== editing);
  return [...typing, ...others].filter((match) => !pathsOf(match.element).includes(match.target.scope ?? ""));
}
function dashedMark(box) {
  const mark = document.createElement("div");
  mark.style.cssText = `position:absolute;left:${box.left}px;top:${box.top}px;width:${box.width}px;height:${box.height}px;border:1px dashed #30c158;border-radius:2px;box-sizing:border-box;`;
  return mark;
}
function report(match) {
  if (!match) {
    return void 0;
  }
  const box = match.element.getBoundingClientRect();
  return { x: box.left, y: box.top, w: box.width, h: box.height, ...labelOf(match.element) };
}
function labelOf(element) {
  const files = pathsOf(element).flatMap((path) => {
    const at = path.lastIndexOf("|");
    return at > 0 ? [path.slice(0, at)] : [];
  });
  const owner = files[0];
  if (owner !== void 0 && new Set(files).size > 1) {
    const name = owner.slice(owner.lastIndexOf("/") + 1).replace(/\.astro$/, "");
    return { label: name, kind: "component" };
  }
  return { label: element.classList[0] ?? element.localName, kind: "text" };
}
function matchesWhere(catalog, accept) {
  const found = [];
  const seen = /* @__PURE__ */ new Set();
  for (const target of catalog?.targets ?? []) {
    if (!accept(target)) {
      continue;
    }
    for (const parent of elementsWithPath(target.parent)) {
      if (found.length >= MATCHES_MAX) {
        return found;
      }
      if (!withinScope(parent, target)) {
        continue;
      }
      const match = matchCanvasText(target, wordsIn(parent, target) ?? parent);
      const element = match?.element;
      if (!element || seen.has(element) || !hasBox(element)) {
        continue;
      }
      seen.add(element);
      found.push({ target, element });
    }
  }
  assert(found.length <= MATCHES_MAX, "Marked text stays within its bound");
  return found;
}
function wordsIn(parent, target) {
  const words = folded(target.value);
  const walker = document.createTreeWalker(parent, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  for (let count = 0; node && count < 2e3; count++) {
    if (folded(node.textContent ?? "") === words) {
      return node.parentElement ?? void 0;
    }
    node = walker.nextNode();
  }
  return void 0;
}
function folded(text2) {
  return text2.replace(/\s+/g, " ").trim();
}
function hasBox(element) {
  const box = element.getBoundingClientRect();
  return box.width > 0 && box.height > 0;
}
function holds(element, point) {
  const box = element.getBoundingClientRect();
  return point.x >= box.left && point.x <= box.right && point.y >= box.top && point.y <= box.bottom;
}
function marked(target, focus) {
  if (target.from === void 0 || target.scope === void 0) {
    return false;
  }
  return focus.has(target.scope);
}
function withinScope(element, target) {
  if (target.scope === void 0) {
    return true;
  }
  let ancestor = element;
  for (let depth = 0; ancestor && depth < 64; depth++) {
    if (pathsOf(ancestor).includes(target.scope)) {
      return true;
    }
    ancestor = ancestor.parentElement ?? void 0;
  }
  return false;
}

// electron/preload/frameText.ts
function installCanvasText(post2, selects, select) {
  const session = createCanvasTextSession(post2);
  const redrawMarks = installTextMarks({
    catalog: session.catalog,
    editing: session.editing,
    editingElement: session.editingElement,
    focus: session.focus,
    visible: selects,
    post: post2
  });
  window.addEventListener("message", (event) => {
    if (event.source !== window.parent) {
      return;
    }
    session.receive(event.data);
    redrawMarks();
  });
  const click = (event) => {
    if (session.contains(event)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    session.dismiss();
    redrawMarks();
    if (event.type !== "dblclick") {
      return;
    }
    const catalog = session.catalog();
    if (!selects() || canvasDragged() || !catalog || !(event.target instanceof Element)) {
      return;
    }
    const hit = findTextHit(catalog, event);
    if (!hit) {
      return;
    }
    event.preventDefault();
    event.stopImmediatePropagation();
    if (!canvasTextSourceMatches(catalog.file, catalog.checksum)) {
      post2({
        type: "avb:text-refused",
        message: "Text editing is waiting for the current source render."
      });
      return;
    }
    select(hit.target, hit.match.element);
    session.open(hit.target, hit.match, event);
    redrawMarks();
  };
  window.addEventListener("click", click, true);
  window.addEventListener("dblclick", click, true);
  window.addEventListener("scroll", session.dismiss, true);
  window.addEventListener("resize", session.dismiss);
  document.addEventListener("avb:morphed", session.reconcile);
}
function findTextHit(catalog, event) {
  if (!(event.target instanceof Element)) {
    return void 0;
  }
  const ancestors = /* @__PURE__ */ new Set();
  let innermost;
  let element = event.target;
  for (let depth = 0; element && depth < 32; depth++) {
    const paths = pathsOf(element);
    for (const path of paths) {
      ancestors.add(path);
    }
    if (!innermost && paths.length) {
      innermost = new Set(paths);
    }
    element = element.parentElement ?? void 0;
  }
  let nearest;
  for (const target of catalog.targets) {
    if (!ancestors.has(target.parent)) {
      continue;
    }
    if (target.scope !== void 0 && !ancestors.has(target.scope)) {
      continue;
    }
    const match = matchCanvasText(target, event.target);
    const box = match && canvasTextRect(match);
    if (!box || !match) {
      continue;
    }
    const distance = distanceToBox(box, event.clientX, event.clientY);
    if (distance === 0) {
      return { target, match };
    }
    if (!innermost?.has(target.parent)) {
      continue;
    }
    if (!nearest || distance < nearest.distance) {
      nearest = { hit: { target, match }, distance };
    }
  }
  return nearest?.hit;
}
function distanceToBox(box, x, y) {
  const dx = Math.max(box.left - x, 0, x - box.right);
  const dy = Math.max(box.top - y, 0, y - box.bottom);
  return Math.hypot(dx, dy);
}

// electron/preload/preloadBridge.ts
var import_electron = require("electron");
var invoke = (channel) => (...args) => import_electron.ipcRenderer.invoke(channel, args[0]);
function exposeBridge() {
  import_electron.contextBridge.exposeInMainWorld("avb", {
    ...projectBridge(),
    ...cmsBridge(),
    ...dataBridge(),
    ...pageBridge(),
    ...terminalBridge(),
    ...eventBridge()
  });
}
function cmsBridge() {
  return {
    cmsConnections: invoke("cmsConnections:list"),
    saveCmsConnection: invoke("cmsConnections:save"),
    removeCmsConnection: invoke("cmsConnections:remove"),
    sanityLogin: invoke("cmsConnections:sanityLogin"),
    remoteCollections: invoke("cmsRemote:collections"),
    remoteDocuments: invoke("cmsRemote:documents"),
    remoteDocument: invoke("cmsRemote:document"),
    remoteTemplate: invoke("cmsRemote:template"),
    writeRemoteDocument: invoke("cmsRemote:write"),
    remoteReferenceOptions: invoke("cmsRemote:references"),
    actOnRemoteDocument: invoke("cmsRemote:act"),
    remoteHistory: invoke("cmsRemote:history"),
    restoreRemoteRevision: invoke("cmsRemote:restore"),
    uploadRemoteAsset: invoke("cmsRemote:upload"),
    linkPreview: invoke("cmsRemote:linkPreview"),
    createRemoteDocument: invoke("cmsRemote:create"),
    deleteRemoteDocuments: invoke("cmsRemote:delete"),
    moveRemoteDocument: invoke("cmsRemote:move")
  };
}
function projectBridge() {
  return {
    platform: process.platform,
    createDefaultsCanvas: invoke("project:createDefaultsCanvas"),
    removeDefaultsCanvas: invoke("project:removeDefaultsCanvas"),
    publishStart: invoke("publish:start"),
    publishState: invoke("publish:state"),
    publishAvailability: invoke("publish:availability"),
    publishedSiteURL: invoke("publish:siteURL"),
    publishingRepositories: invoke("publish:repository"),
    discoverPublishing: invoke("publish:discover"),
    publishingAccount: invoke("publish:account"),
    projectMetadata: invoke("project:metadata"),
    writeProjectMetadata: invoke("project:writeMetadata"),
    studioStatus: invoke("studio:status"),
    installStudio: invoke("studio:install"),
    // Project:
    openProjectDialog: invoke("project:openDialog"),
    createAstroProject: invoke("project:createAstro"),
    parentDialog: invoke("project:parentDialog"),
    createStarter: invoke("project:createStarter"),
    scanProject: invoke("project:scan"),
    listProjectClasses: invoke("project:classes"),
    watchProject: invoke("watch:start"),
    // Assets (public/)
    listAssets: invoke("assets:list"),
    pickUploadAssets: invoke("assets:pickUpload"),
    uploadAssets: invoke("assets:upload"),
    moveAsset: invoke("assets:move"),
    convertAsset: invoke("assets:convert"),
    renameAsset: invoke("assets:rename"),
    deleteAsset: invoke("assets:delete"),
    mkdirAssets: invoke("assets:mkdir"),
    readAssetText: invoke("assets:readText"),
    writeAssetText: invoke("assets:writeText"),
    // The source file an imported symbol is defined in — data files, consts,
    // anything the page pulls values from.
    readSymbolSource: invoke("src:readSymbol"),
    resolveSourcePath: invoke("src:resolvePath"),
    assetDimensions: invoke("assets:dimensions"),
    readSourceText: invoke("src:readText"),
    writeSourceText: invoke("src:writeText"),
    // OS drag-and-drop: resolve a DOM File to its filesystem path.
    getFilePath: (file) => {
      try {
        return import_electron.webUtils.getPathForFile(file);
      } catch {
        return "path" in file && typeof file["path"] === "string" ? file["path"] : void 0;
      }
    },
    onAssetsChanged: (callback) => {
      const listener = () => callback();
      import_electron.ipcRenderer.on("assets:changed", listener);
      return () => import_electron.ipcRenderer.removeListener("assets:changed", listener);
    },
    // ⇧⌘C — the canvas selection as file:line pointers, for an AI chat.
    copySelection: invoke("selection:copy")
  };
}
function dataBridge() {
  return {
    // CMS (JSON data under src/)
    listCms: invoke("cms:list"),
    readCms: invoke("cms:read"),
    writeCms: invoke("cms:write"),
    createCms: invoke("cms:create"),
    deleteCms: invoke("cms:delete"),
    cmsUsage: invoke("cms:usage"),
    cmsAssetRef: invoke("cms:assetRef"),
    resolveImport: invoke("project:resolveImport"),
    cmsMeta: invoke("cms:meta"),
    contentConfig: invoke("content:config"),
    // Variables (CSS custom properties)
    cssVariables: invoke("css:variables"),
    setCssVariable: invoke("css:setVariable"),
    moveCssVariables: invoke("css:moveVariables"),
    addCssVariables: invoke("css:addVariables"),
    renameCssVariables: invoke("css:renameVariables"),
    setCssSectionTitle: invoke("css:setSectionTitle"),
    removeCssSection: invoke("css:removeSection"),
    addCssSection: invoke("css:addSection"),
    moveCssHeading: invoke("css:moveHeading"),
    onCssChanged: (callback) => {
      const listener = () => callback();
      import_electron.ipcRenderer.on("css:changed", listener);
      return () => import_electron.ipcRenderer.removeListener("css:changed", listener);
    },
    contentCollections: invoke("content:collections"),
    contentEntries: invoke("content:entries"),
    writeContentEntry: invoke("content:writeEntry"),
    validateContentEntry: invoke("content:validate"),
    contentTargets: invoke("content:targets"),
    contentRenamePlan: invoke("content:renamePlan"),
    renameContentEntry: invoke("content:rename"),
    contentRemoteRead: invoke("content:remoteRead"),
    contentRemoteEdit: invoke("content:remoteEdit"),
    setCmsMeta: invoke("cms:setMeta"),
    onCmsChanged: (callback) => {
      const listener = () => callback();
      import_electron.ipcRenderer.on("cms:changed", listener);
      return () => import_electron.ipcRenderer.removeListener("cms:changed", listener);
    },
    // Recent projects:
    listRecents: invoke("recents:list"),
    addRecent: invoke("recents:add"),
    removeRecent: invoke("recents:remove"),
    refreshThumb: invoke("recents:refreshThumb")
  };
}
function pageBridge() {
  return {
    // Pages:
    readPage: invoke("page:read"),
    parsePageSource: invoke("page:parse"),
    editPage: invoke("page:edit"),
    editPageBatch: invoke("page:editBatch"),
    previewPageEdit: invoke("page:previewEdit"),
    createPage: invoke("page:create"),
    deletePage: invoke("page:delete"),
    movePage: invoke("page:move"),
    createPageFolder: invoke("pagefolder:create"),
    renamePageFolder: invoke("pagefolder:rename"),
    deletePageFolder: invoke("pagefolder:delete"),
    importPathFor: invoke("page:importPathFor"),
    rebaseImport: invoke("page:rebaseImport"),
    createComponent: invoke("component:create"),
    discardComponent: invoke("component:discard"),
    componentProperties: invoke("component:properties"),
    editComponentProperties: invoke("component:editProperties"),
    revertComponentProperties: invoke("component:revertProperties"),
    componentUsage: invoke("component:usage"),
    dynamicPaths: invoke("page:dynamicPaths"),
    injectedRoutes: invoke("project:injectedRoutes"),
    sampleEntry: invoke("content:sampleEntry"),
    sampleValue: invoke("content:sampleValue"),
    // Dev server:
    startDevServer: invoke("dev:start"),
    stopDevServer: invoke("dev:stop"),
    diagnoseDev: invoke("dev:diagnose"),
    probeDevPage: invoke("dev:probe"),
    // Style panel targets:
    listStyleFiles: invoke("style:listFiles"),
    listAstroStyleFiles: invoke("style:listAstroStyles"),
    readStyleFile: invoke("style:readFile"),
    writeStyleFile: invoke("style:writeFile"),
    selectorUsage: invoke("style:selectorUsage"),
    removeSelectors: invoke("style:removeSelectors"),
    restoreSelectors: invoke("style:restoreSelectors"),
    // Git:
    gitInfo: invoke("git:info"),
    ghStatus: invoke("git:ghStatus"),
    gitInit: invoke("git:init"),
    gitCheckout: invoke("git:checkout"),
    previewAtCommit: invoke("preview:atCommit"),
    previewStop: invoke("preview:stop"),
    checkPreview: invoke("preview:check"),
    gitLog: invoke("git:log"),
    gitCommitDiff: invoke("git:commitDiff"),
    gitAllFiles: invoke("git:allFiles"),
    gitStatus: invoke("git:status"),
    gitWorktrees: invoke("git:worktrees"),
    gitPark: invoke("git:park"),
    gitUnpark: invoke("git:unpark"),
    gitMerge: invoke("git:merge"),
    gitResolveMerge: invoke("git:resolveMerge"),
    gitDeleteBranch: invoke("git:deleteBranch"),
    gitCommit: invoke("git:commit"),
    gitRestoreFile: invoke("git:restoreFile"),
    gitRestoreProject: invoke("git:restoreProject"),
    gitPush: invoke("git:push"),
    gitPull: invoke("git:pull"),
    gitIncoming: invoke("git:incoming"),
    gitRepositories: invoke("git:repositories"),
    gitClone: invoke("git:clone"),
    gitConnect: invoke("git:connect"),
    gitPublish: invoke("git:publish"),
    openExternal: invoke("shell:openExternal"),
    // Dev only: the project to reopen after a "Reload All Code" relaunch.
    pendingProject: invoke("project:pending"),
    closeProject: invoke("project:close")
  };
}
function terminalBridge() {
  return {
    // Terminal (node-pty). Keystrokes and render acks are `send`, not `invoke`:
    // they're high-frequency and one-way, so they shouldn't pay for a round trip.
    startTerminal: invoke("terminal:start"),
    resizeTerminal: invoke("terminal:resize"),
    closeTerminal: invoke("terminal:close"),
    terminalInput: (id, data) => import_electron.ipcRenderer.send("terminal:input", { id, data }),
    terminalAck: (id, count) => import_electron.ipcRenderer.send("terminal:ack", { id, count }),
    terminalClipboardImage: (bytes, mime) => import_electron.ipcRenderer.invoke("terminal:clipboardImage", { bytes, mime }),
    onTerminalData: (callback) => {
      const listener = (_event, data) => callback(data);
      import_electron.ipcRenderer.on("terminal:data", listener);
      return () => import_electron.ipcRenderer.removeListener("terminal:data", listener);
    },
    onTerminalExit: (callback) => {
      const listener = (_event, data) => callback(data);
      import_electron.ipcRenderer.on("terminal:exit", listener);
      return () => import_electron.ipcRenderer.removeListener("terminal:exit", listener);
    },
    onTerminalProcess: (callback) => {
      const listener = (_event, data) => callback(data);
      import_electron.ipcRenderer.on("terminal:process", listener);
      return () => import_electron.ipcRenderer.removeListener("terminal:process", listener);
    }
  };
}
function eventBridge() {
  return {
    onStudioProgress: (callback) => {
      const listener = (_event, data) => callback(data);
      import_electron.ipcRenderer.on("studio:progress", listener);
      return () => import_electron.ipcRenderer.removeListener("studio:progress", listener);
    },
    // Events:
    onPageMaybeChanged: (callback) => {
      const listener = (_event, data) => callback(data);
      import_electron.ipcRenderer.on("page:maybe-changed", listener);
      return () => import_electron.ipcRenderer.removeListener("page:maybe-changed", listener);
    },
    onDevLog: (callback) => {
      const listener = (_event, data) => callback(data);
      import_electron.ipcRenderer.on("dev:log", listener);
      return () => import_electron.ipcRenderer.removeListener("dev:log", listener);
    },
    onPreviewFailed: (callback) => {
      const listener = (_event, data) => callback(data);
      import_electron.ipcRenderer.on("dev:preview-failed", listener);
      return () => import_electron.ipcRenderer.removeListener("dev:preview-failed", listener);
    },
    onDevExit: (callback) => {
      const listener = (_event, data) => callback(data);
      import_electron.ipcRenderer.on("dev:exit", listener);
      return () => import_electron.ipcRenderer.removeListener("dev:exit", listener);
    },
    onProgress: (callback) => {
      const listener = (_event, data) => callback(data);
      import_electron.ipcRenderer.on("progress", listener);
      return () => import_electron.ipcRenderer.removeListener("progress", listener);
    },
    // Live output from `npm create astro@latest`, shown in the new-project wizard.
    onCreateLog: (callback) => {
      const listener = (_event, chunk) => callback(chunk);
      import_electron.ipcRenderer.on("create:log", listener);
      return () => import_electron.ipcRenderer.removeListener("create:log", listener);
    },
    onFsChanged: (callback) => {
      const listener = (_event, data) => callback(data);
      import_electron.ipcRenderer.on("fs:changed", listener);
      return () => import_electron.ipcRenderer.removeListener("fs:changed", listener);
    },
    // App preferences — read once on load; the menu pushes changes as they happen.
    settings: invoke("settings:get"),
    setPreference: invoke("settings:set"),
    // Application menu events (macOS menu accelerators never reach the DOM)
    onMenu: (channel, callback) => {
      const listener = (_event, data) => callback(data);
      import_electron.ipcRenderer.on(`menu:${channel}`, listener);
      return () => import_electron.ipcRenderer.removeListener(`menu:${channel}`, listener);
    },
    nativeCopy: invoke("native:copy"),
    nativePaste: invoke("native:paste"),
    nativeUndo: invoke("native:undo"),
    nativeRedo: invoke("native:redo")
  };
}

// electron/preload/frameDesign.ts
function markFrameMode() {
  const stackiMode = location.hash.includes("avb-design") ? "stacki-designer" : "stacki-preview";
  const markMode = () => document.documentElement?.classList.add(stackiMode);
  markMode();
  document.addEventListener("readystatechange", markMode);
  window.addEventListener("DOMContentLoaded", markMode);
}
function listenForDesign() {
  trackCanvasGesture();
  showDesignCursor();
  makeNavigationInert();
  forwardModifiers();
  window.addEventListener("keydown", forwardShortcut, true);
}
function showDesignCursor() {
  const injectDesignStyle = () => {
    if (document.getElementById("avb-design-style")) {
      return;
    }
    const style = document.createElement("style");
    style.id = "avb-design-style";
    style.disabled = !canvasSelects();
    style.textContent = "*, *::before, *::after { cursor: default !important; }";
    (document.head || document.documentElement)?.appendChild(style);
  };
  if (document.readyState === "loading") {
    window.addEventListener("DOMContentLoaded", injectDesignStyle);
  } else {
    injectDesignStyle();
  }
}
function makeNavigationInert() {
  window.addEventListener(
    "click",
    (event) => {
      if (!canvasSelects()) {
        return;
      }
      const anchor = event.target instanceof Element ? event.target.closest("a[href]") : void 0;
      if (anchor) {
        event.preventDefault();
      }
    },
    true
  );
  window.addEventListener(
    "submit",
    (event) => {
      if (canvasSelects()) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    },
    true
  );
  window.addEventListener(
    "mousedown",
    (event) => {
      if (!canvasSelects()) {
        return;
      }
      if (isCanvasTextEditing(event.target)) {
        return;
      }
      if (event.button !== 0) {
        return;
      }
      event.preventDefault();
      window.focus();
    },
    true
  );
}
function forwardModifiers() {
  let held = { shiftKey: false, altKey: false };
  const tellModifiers = (event) => {
    const next = { shiftKey: !!event.shiftKey, altKey: !!event.altKey };
    if (next.shiftKey === held.shiftKey && next.altKey === held.altKey) {
      return;
    }
    held = next;
    try {
      window.parent.postMessage({ type: "avb:modifiers", ...held }, "*");
    } catch {
    }
  };
  window.addEventListener("keydown", tellModifiers, true);
  window.addEventListener("keyup", tellModifiers, true);
  window.addEventListener("blur", () => tellModifiers({ shiftKey: false, altKey: false }));
}
function forwardShortcut(event) {
  if (isPreviewKey(event)) {
    if (!eventInField(event)) {
      event.preventDefault();
      try {
        window.parent.postMessage({ type: "avb:shortcut", name: "preview" }, "*");
      } catch {
      }
    }
    return;
  }
  if (!canvasSelects()) {
    return;
  }
  const mod = event.metaKey || event.ctrlKey;
  if (mod && ["f", "e", "k"].includes(event.key.toLowerCase())) {
    event.preventDefault();
    try {
      window.parent.postMessage({ type: "avb:shortcut", name: "insert" }, "*");
    } catch {
    }
    return;
  }
  if (eventInField(event)) {
    return;
  }
  if (!mod && !event.altKey && !event.shiftKey && ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
    event.preventDefault();
    try {
      window.parent.postMessage({ type: "avb:shortcut", name: "arrow", key: event.key }, "*");
    } catch {
    }
    return;
  }
  const isDelete = !mod && !event.altKey && (event.key === "Delete" || event.key === "Backspace");
  const isDuplicate = mod && !event.altKey && !event.shiftKey && event.key.toLowerCase() === "d";
  const isClassJump = mod && !event.altKey && !event.shiftKey && event.key === "Enter";
  const isProperties = !mod && !event.altKey && !event.shiftKey && event.key.toLowerCase() === "k";
  const isGuide = !mod && !event.altKey && event.shiftKey && event.key.toLowerCase() === "g";
  const isClose = !mod && !event.altKey && !event.shiftKey && event.key === "Escape";
  if (isDelete || isDuplicate || isClassJump || isProperties || isGuide || isClose) {
    event.preventDefault();
    try {
      window.parent.postMessage({ type: "avb:shortcut", name: "key", key: event.key, meta: mod }, "*");
    } catch {
    }
  }
}
function isPreviewKey(event) {
  if (!event.altKey) {
    return false;
  }
  if (event.metaKey || event.ctrlKey || event.shiftKey) {
    return false;
  }
  return event.code === "KeyP";
}
function eventInField(event) {
  const target = event.target;
  return target instanceof window.HTMLElement && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable);
}

// shared/properties/canvasInteraction.ts
function parseCanvasInteraction(input) {
  if (typeof input !== "object" || input === null) {
    return void 0;
  }
  if (!("type" in input) || input.type !== "avb:interaction") {
    return void 0;
  }
  if ("mode" in input && (input.mode === "select" || input.mode === "interact")) {
    return input.mode;
  }
  return void 0;
}

// electron/preload/framePendingDelete.ts
var PENDING_DELETE_ATTR = "data-avb-pending-delete";
var PENDING_ELEMENTS_MAX = 1024;
var PENDING_CLEAR_MS = 5e3;
var PENDING_MARKS_MAX = 4096;
var stylesheet2;
var clearTimer;
var hiddenFrom;
function hidePendingDelete(path) {
  const elements = pendingElements(path);
  if (elements.length === 0) {
    return;
  }
  installPendingStyle();
  hiddenFrom ??= sourceStamps();
  for (const element of elements) {
    element.setAttribute(PENDING_DELETE_ATTR, "");
  }
  clearTimeout(clearTimer);
  clearTimer = setTimeout(clearPendingDeletes, PENDING_CLEAR_MS);
}
function settlePendingDeletes() {
  if (hiddenFrom === void 0) {
    return;
  }
  if (sourceStamps() !== hiddenFrom) {
    clearPendingDeletes();
  }
}
function clearPendingDeletes() {
  clearTimeout(clearTimer);
  clearTimer = void 0;
  hiddenFrom = void 0;
  const marked2 = document.querySelectorAll(`[${PENDING_DELETE_ATTR}]`);
  const count = Math.min(marked2.length, PENDING_MARKS_MAX);
  for (let index = 0; index < count; index += 1) {
    marked2.item(index)?.removeAttribute(PENDING_DELETE_ATTR);
  }
}
function sourceStamps() {
  const stamped = document.querySelectorAll(`[${STAMP_ATTRIBUTE}]`);
  const count = Math.min(stamped.length, PENDING_MARKS_MAX);
  const stamps = [];
  for (let index = 0; index < count; index += 1) {
    stamps.push(stamped.item(index)?.getAttribute(STAMP_ATTRIBUTE) ?? "");
  }
  return stamps.join(" ");
}
function pendingElements(path) {
  const tagged = allElementsWithPath(path, PENDING_ELEMENTS_MAX) ?? [];
  const marked2 = (runsOf(path) ?? []).flatMap((run) => run.filter(isElement));
  return [.../* @__PURE__ */ new Set([...tagged, ...marked2])].slice(0, PENDING_ELEMENTS_MAX);
}
function installPendingStyle() {
  if (stylesheet2) {
    return;
  }
  stylesheet2 = new CSSStyleSheet();
  stylesheet2.replaceSync(`[${PENDING_DELETE_ATTR}] { display: none !important; }`);
  document.adoptedStyleSheets = [...document.adoptedStyleSheets, stylesheet2];
}

// electron/preload/frameStyleSources.ts
function queryAuthoredStyles(element, properties, target) {
  const inspection = inspectAuthoredProperties(element, properties);
  const inheritedSources = {};
  for (const [property, source] of Object.entries(inspection.sources)) {
    if (source === void 0) {
      continue;
    }
    if (target === "element" && source === element) {
      continue;
    }
    const classes = ownClasses(source);
    const label = source.id ? `#${source.id}` : classes.map((name) => `.${name}`).join("");
    const path = pathsOf(source).filter(inScope).sort((first, second) => second.length - first.length)[0];
    inheritedSources[property] = {
      label: label || source.tagName.toLowerCase(),
      ...path === void 0 ? {} : { path }
    };
  }
  return { authoredProps: inspection.values, inheritedSources };
}

// shared/properties/pageMetadata.ts
function parsePageType(input) {
  const value = pathText(input);
  if (!/^[a-z][a-z0-9._:-]{0,127}$/i.test(value)) {
    throw new Error("Invalid Open Graph type");
  }
  return value;
}
function parsePageImage(input) {
  const value = pathText(input);
  if (/^\/(?!\/)/.test(value)) {
    if (!value.includes("\\")) {
      return value;
    }
  }
  const url = new URL(value);
  if (url.protocol !== "http:") {
    if (url.protocol !== "https:") {
      throw new Error("Page image must use HTTP or HTTPS");
    }
  }
  if (url.username || url.password) {
    throw new Error("Page image must not contain credentials");
  }
  return url.href;
}

// electron/preload/framePageMetadata.ts
function renderedPageType(document2) {
  const type = document2.querySelector('meta[property="og:type"]')?.getAttribute("content");
  if (!type) {
    return void 0;
  }
  try {
    return parsePageType(type);
  } catch {
    return void 0;
  }
}
function renderedPageImage(document2) {
  const image = document2.querySelector('meta[property="og:image"]')?.getAttribute("content") ?? document2.querySelector('meta[name="twitter:image"]')?.getAttribute("content");
  if (!image) {
    return void 0;
  }
  if (image.length > BOUNDARY_LIMITS.pathLengthMax) {
    return void 0;
  }
  try {
    const url = new URL(parsePageImage(new URL(image, document2.baseURI).href));
    const canonical = document2.querySelector('link[rel="canonical"]')?.getAttribute("href");
    const pageURL = new URL(canonical ?? document2.URL, document2.baseURI);
    if (url.origin === pageURL.origin) {
      return parsePageImage(`${url.pathname}${url.search}${url.hash}`);
    }
    if (url.origin === new URL(document2.URL).origin) {
      return parsePageImage(`${url.pathname}${url.search}${url.hash}`);
    }
    return parsePageImage(url.href);
  } catch {
    return void 0;
  }
}

// shared/properties/pageText.ts
var parsePageText = object({ title: optional(text), description: optional(text) });

// electron/preload/framePageText.ts
function renderedPageText(document2) {
  const title = document2.querySelector('meta[property="og:title"]')?.getAttribute("content") ?? document2.querySelector("title")?.textContent ?? void 0;
  const description = document2.querySelector('meta[name="description"]')?.getAttribute("content") ?? document2.querySelector('meta[property="og:description"]')?.getAttribute("content") ?? void 0;
  return parsePageText({
    title: renderedPageTextBounded(title),
    description: renderedPageTextBounded(description)
  });
}
function renderedPageTextBounded(value) {
  if (value === void 0) {
    return void 0;
  }
  return value.length <= BOUNDARY_LIMITS.textLengthMax ? value : void 0;
}

// electron/preload/frameViewportUnits.ts
var LITERALS = `"(?:\\\\.|[^"\\\\])*"|'(?:\\\\.|[^'\\\\])*'|url\\([^)]*\\)`;
var DIMENSION = "(?<![\\w-])([-+]?(?:\\d*\\.)?\\d+(?:e[-+]?\\d+)?)(?:s|l|d)?vh\\b";
var VIEWPORT_UNITS = new RegExp(`(${LITERALS})|${DIMENSION}`, "gi");
function freezeViewportValue(value) {
  return value.replace(VIEWPORT_UNITS, (match, literal, amount) => {
    if (literal !== void 0 || amount === void 0) {
      return match;
    }
    return `calc(${amount} * var(--avb-vh))`;
  });
}
function parseViewportHeight(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return void 0;
  }
  return value > 0 && value <= 3e4 ? value : void 0;
}

// electron/preload/frameViewportInline.ts
var INLINE_ELEMENTS_MAX = 2e4;
var INLINE_PROPERTIES_MAX = 512;
function freezeInlineViewport(report3) {
  freezeInlineTree(document.documentElement);
  new MutationObserver((records) => {
    assert(records.length <= INLINE_ELEMENTS_MAX, "Viewport: inline mutation limit exceeded");
    let changed = false;
    for (const record2 of records) {
      if (record2.type === "attributes" && record2.target instanceof Element) {
        changed = freezeInlineElement(record2.target) || changed;
      } else {
        assert(record2.addedNodes.length <= INLINE_ELEMENTS_MAX, "Viewport: added node limit");
        for (const node of Array.from(record2.addedNodes)) {
          if (node instanceof Element) {
            changed = freezeInlineTree(node) || changed;
          }
        }
      }
    }
    if (changed) {
      report3();
    }
  }).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["style"],
    childList: true,
    subtree: true
  });
}
function freezeInlineTree(root) {
  const elements = root.querySelectorAll("[style]");
  assert(elements.length <= INLINE_ELEMENTS_MAX, "Viewport: inline element limit exceeded");
  let changed = freezeInlineElement(root);
  for (const element of Array.from(elements)) {
    changed = freezeInlineElement(element) || changed;
  }
  return changed;
}
function freezeInlineElement(element) {
  const view = element.ownerDocument.defaultView;
  if (!view) {
    return false;
  }
  if (!(element instanceof view.HTMLElement || element instanceof view.SVGElement)) {
    return false;
  }
  const style = element.style;
  assert(style.length <= INLINE_PROPERTIES_MAX, "Viewport: inline property limit exceeded");
  let changed = false;
  for (let index = 0; index < style.length; index++) {
    const property = style.item(index);
    const value = style.getPropertyValue(property);
    const next = freezeViewportValue(value);
    if (next !== value) {
      style.setProperty(property, next, style.getPropertyPriority(property));
      changed = true;
    }
  }
  return changed;
}

// electron/preload/frameViewport.ts
var report2 = () => {
  try {
    const body = document.body;
    let height;
    if (body) {
      const styles = getComputedStyle(body);
      height = body.offsetTop + body.scrollHeight + (parseFloat(styles.marginBottom) || 0);
    } else {
      height = document.documentElement.scrollHeight;
    }
    window.parent.postMessage({ type: "avb:page-height", height: Math.ceil(height) }, "*");
  } catch {
  }
};
var overrideElement = void 0;
var rewriteTimer;
var filterRule = (rule, depth) => {
  if (depth > PRELOAD_LIMITS.cssRuleDepthMax) {
    return "";
  }
  if (asImport(rule)) {
    return filterImportRule(rule, depth);
  }
  if (asStyleLike(rule)) {
    return filterStyleRule(rule, depth);
  }
  if (rule instanceof CSSGroupingRule && rule.cssRules.length) {
    const inner = filterRules(rule.cssRules, depth + 1);
    if (!inner) {
      return "";
    }
    const head = rule.cssText.slice(0, rule.cssText.indexOf("{"));
    return head + "{\n" + inner + "}\n";
  }
  return "";
};
var filterRules = (rules, depth) => {
  let out = "";
  for (let ri = 0; ri < rules.length; ri++) {
    const child = rules[ri];
    if (child) {
      out += filterRule(child, depth);
    }
  }
  return out;
};
var filterImportRule = (rule, depth) => {
  if (!rule.styleSheet) {
    importsPending = true;
    return "";
  }
  let inner = "";
  try {
    inner = filterRules(rule.styleSheet.cssRules, depth + 1);
  } catch {
    return "";
  }
  if (!inner) {
    return "";
  }
  const layer = /\blayer\(([^)]*)\)/i.exec(rule.cssText || "");
  if (!layer) {
    return inner;
  }
  const layerBody = layer[1] ?? "";
  return `@layer ${layerBody.trim()} {
${inner}}
`;
};
var filterStyleRule = (rule, depth) => {
  let nested = "";
  if (rule instanceof CSSGroupingRule && rule.cssRules.length) {
    nested = filterRules(rule.cssRules, depth + 1);
  }
  let decls = "";
  for (let di = 0; di < rule.style.length; di++) {
    const prop = rule.style.item(di);
    const value = rule.style.getPropertyValue(prop);
    const prio = rule.style.getPropertyPriority(prop);
    const frozenValue = freezeViewportValue(value);
    const hasVh = frozenValue !== value;
    const isFixed = prop === "position" && /fixed/.test(value);
    if (!hasVh && !isFixed) {
      continue;
    }
    const newValue = isFixed ? "absolute" : frozenValue;
    decls += `${prop}: ${newValue}${prio ? " !important" : ""}; `;
  }
  if (!decls && !nested) {
    return "";
  }
  const selector = selectorOf(rule);
  return `${selector} { ${decls}${nested ? "\n" + nested : ""}}
`;
};
var asImport = (rule) => rule.type === 3 || "styleSheet" in rule && !!rule["styleSheet"];
var asStyleLike = (rule) => {
  if (!("style" in rule) || !rule["style"]) {
    return false;
  }
  const selectorText = "selectorText" in rule ? rule["selectorText"] : void 0;
  const keyText = "keyText" in rule ? rule["keyText"] : void 0;
  return !!(selectorText || keyText);
};
var selectorOf = (rule) => {
  const selectorText = "selectorText" in rule ? rule.selectorText : void 0;
  const keyText = "keyText" in rule ? rule.keyText : void 0;
  return selectorText || keyText || "";
};
var importsPending = false;
var importRetries = 0;
var rewriteSheets = () => {
  if (!document.head) {
    return;
  }
  importsPending = false;
  let css = "html, body { height: auto !important; }\n";
  const sheets = document.styleSheets;
  for (let si = 0; si < sheets.length; si++) {
    const sheet = sheets[si];
    if (!sheet) {
      continue;
    }
    if (sheet.ownerNode === overrideElement) {
      continue;
    }
    let rules;
    try {
      rules = sheet.cssRules;
    } catch {
      continue;
    }
    css += filterRules(rules, 0);
  }
  if (!overrideElement) {
    overrideElement = document.createElement("style");
    overrideElement.id = "avb-vh-override";
  }
  if (overrideElement.textContent !== css) {
    overrideElement.textContent = css;
  }
  if (document.head.lastElementChild !== overrideElement) {
    document.head.appendChild(overrideElement);
  }
  if (importsPending && importRetries < 25) {
    importRetries += 1;
    setTimeout(rewriteSheets, 120);
  }
};
var scheduleRewrite = () => {
  clearTimeout(rewriteTimer);
  rewriteTimer = setTimeout(() => {
    rewriteSheets();
    report2();
  }, 100);
};
var frozen = false;
var freezeViewportHeight = (value) => {
  const px = parseViewportHeight(value);
  if (px === void 0) {
    return;
  }
  document.documentElement.style.setProperty("--avb-vh", px / 100 + "px");
  if (!frozen) {
    frozen = true;
    rewriteSheets();
    freezeInlineViewport(report2);
    window.addEventListener("load", scheduleRewrite);
    new MutationObserver(scheduleRewrite).observe(document.head || document.documentElement, {
      childList: true,
      subtree: true
    });
  }
  report2();
};

// electron/preload/frameGuide.ts
var GUIDE_VARIABLES = {
  margin: "--site-margin",
  gutter: "--site-gutter",
  widthMax: "--max-width-main"
};
var COLUMN_COUNT_PATTERN = /^\d{1,3}$/;
var MENU_VARIABLES_MAX = 5;
var MENU_VARIABLE_CHARS_MAX = 64;
var MENU_VARIABLE_PATTERN = /^--[A-Za-z0-9_-]+$/;
var lastSent = "";
var measureQueued = false;
var menuVariables = [];
var post = () => void 0;
function startGuide(send) {
  post = send;
  queueGuide();
  window.addEventListener("load", queueGuide);
  window.addEventListener("resize", queueGuide);
  document.addEventListener("avb:morphed", queueGuide);
  watchStyles();
  return { receive: receiveGuideMessage };
}
function receiveGuideMessage(data) {
  if (messageType(data) === "avb:guide-variables") {
    menuVariables = parseMenuVariables(data);
    lastSent = "";
    queueGuide();
  }
}
function watchStyles() {
  try {
    new MutationObserver(queueGuide).observe(document.head, {
      childList: true,
      subtree: true,
      characterData: true
    });
    new ResizeObserver(queueGuide).observe(document.documentElement);
  } catch {
  }
}
function queueGuide() {
  if (measureQueued) {
    return;
  }
  measureQueued = true;
  requestAnimationFrame(() => {
    measureQueued = false;
    sendGuide();
  });
}
function sendGuide() {
  const body = document.body;
  if (!body) {
    return;
  }
  const message = measureGuide(body);
  const key = JSON.stringify(message);
  if (key === lastSent) {
    return;
  }
  lastSent = key;
  try {
    post(message);
  } catch {
  }
}
function measureGuide(body) {
  const root = document.documentElement;
  const rootStyle = getComputedStyle(root);
  return {
    type: "avb:guide",
    viewportWidth: root.clientWidth,
    rootFontSize: Number.parseFloat(rootStyle.fontSize),
    margin: lengthOf(body, rootStyle, GUIDE_VARIABLES.margin),
    gutter: lengthOf(body, rootStyle, GUIDE_VARIABLES.gutter),
    widthMax: lengthOf(body, rootStyle, GUIDE_VARIABLES.widthMax),
    variables: Object.fromEntries(menuVariables.map((name) => [name, lengthOf(body, rootStyle, name)])),
    // The same names read as a column count: a whole number on :root.
    counts: Object.fromEntries(menuVariables.map((name) => [name, countOf(rootStyle.getPropertyValue(name))]))
  };
}
function lengthOf(body, rootStyle, variable) {
  const declared = rootStyle.getPropertyValue(variable).trim();
  if (declared === "" || declared === "none") {
    return void 0;
  }
  const probe = appendProbe(body, `width:var(${variable})`);
  try {
    const width = probe.getBoundingClientRect().width;
    return Number.isFinite(width) ? width : void 0;
  } finally {
    probe.remove();
  }
}
function appendProbe(body, style) {
  const probe = document.createElement("div");
  probe.setAttribute(PROBE_ATTR, "");
  probe.setAttribute(
    "style",
    "position:absolute;left:0;top:0;height:0;margin:0;padding:0;border:0;box-sizing:content-box;visibility:hidden;pointer-events:none;" + style
  );
  body.appendChild(probe);
  return probe;
}
function countOf(declared) {
  const value = declared.trim();
  return COLUMN_COUNT_PATTERN.test(value) ? Number.parseInt(value, 10) : void 0;
}
function messageType(input) {
  if (typeof input !== "object" || input === null) {
    return void 0;
  }
  return "type" in input ? input.type : void 0;
}
function parseMenuVariables(input) {
  if (typeof input !== "object" || input === null) {
    return [];
  }
  const names = "names" in input ? input.names : void 0;
  if (!Array.isArray(names)) {
    return [];
  }
  if (names.length > MENU_VARIABLES_MAX) {
    return [];
  }
  const valid = names.filter(isMenuVariable);
  return valid.length === names.length ? valid : [];
}
function isMenuVariable(name) {
  if (typeof name !== "string") {
    return false;
  }
  if (name.length > MENU_VARIABLE_CHARS_MAX) {
    return false;
  }
  return MENU_VARIABLE_PATTERN.test(name);
}

// electron/preload/pseudoHit.ts
var PSEUDO_CANDIDATES_MAX = 8;
function pseudoAt(x, y, candidates) {
  assert(Number.isFinite(x), "pseudoAt: x is a finite number");
  assert(Number.isFinite(y), "pseudoAt: y is a finite number");
  assert(candidates.length <= PSEUDO_CANDIDATES_MAX, "pseudoAt: candidates are capped");
  for (let index = 0; index < candidates.length; index++) {
    const candidate = candidates[index];
    assert(candidate !== void 0, "pseudoAt: the index is inside the list");
    if (candidate.after !== void 0 && boxHolds(candidate.after, x, y)) {
      return { index, pseudo: "after" };
    }
    if (candidate.before !== void 0 && boxHolds(candidate.before, x, y)) {
      return { index, pseudo: "before" };
    }
  }
  return void 0;
}
function boxAt(offset, hostLeft, hostTop) {
  assert(offset.left <= offset.right, "boxAt: the offset box is not inverted horizontally");
  assert(offset.top <= offset.bottom, "boxAt: the offset box is not inverted vertically");
  return { left: offset.left + hostLeft, top: offset.top + hostTop, right: offset.right + hostLeft, bottom: offset.bottom + hostTop };
}
function boxHolds(box, x, y) {
  if (box.right <= box.left) {
    return false;
  }
  if (box.bottom <= box.top) {
    return false;
  }
  if (x < box.left) {
    return false;
  }
  if (x > box.right) {
    return false;
  }
  if (y < box.top) {
    return false;
  }
  return y <= box.bottom;
}

// electron/preload/framePseudoTarget.ts
var measured = [];
function forgetPseudoBoxes() {
  measured = [];
}
function pseudoTargetAt(nodePath, target, x, y) {
  const candidates = candidatesFor(nodePath, target);
  if (candidates.length === 0) {
    return void 0;
  }
  const kept = new Map(measured.map((entry) => [entry.host, entry]));
  const fresh = candidates.map((candidate) => {
    const held = kept.get(candidate.host);
    return held !== void 0 && held.path === candidate.path ? held : measureHost(candidate);
  });
  measured = fresh;
  const boxes = fresh.map((entry) => placed(entry));
  const hit = pseudoAt(x, y, boxes);
  if (hit === void 0) {
    return void 0;
  }
  const winner = candidates[hit.index];
  assert(winner !== void 0, "pseudoTargetAt: the hit names a candidate");
  assert(drawsPseudoAt(winner.path, hit.pseudo), "pseudoTargetAt: only a drawn pseudo-element is hit");
  return { path: winner.path, pseudo: hit.pseudo };
}
function candidatesFor(nodePath, target) {
  const out = [];
  const hit = hitCandidate(target);
  const resolvedHost = hostOf(nodePath, target);
  const resolved = resolvedHost === void 0 ? void 0 : { path: nodePath, host: resolvedHost };
  const ordered = orderInnermostFirst(hit, resolved);
  for (const candidate of ordered) {
    if (drawsAny(candidate.path)) {
      out.push(candidate);
    }
  }
  assert(out.length <= PSEUDO_CANDIDATES_MAX, "candidatesFor: candidates are capped");
  return out;
}
function orderInnermostFirst(hit, resolved) {
  if (hit === void 0) {
    return resolved === void 0 ? [] : [resolved];
  }
  if (resolved === void 0) {
    return [hit];
  }
  if (hit.host === resolved.host) {
    return [resolved];
  }
  return hit.host.contains(resolved.host) ? [resolved, hit] : [hit, resolved];
}
function hitCandidate(target) {
  const tagged = target instanceof Element ? target.closest(`[${PATH_ATTR}]`) : void 0;
  if (tagged === void 0 || tagged === null) {
    return void 0;
  }
  if (!inFocus(tagged)) {
    return void 0;
  }
  const path = pathsOf(tagged).find(inScope);
  return path === void 0 ? void 0 : { path, host: tagged };
}
function hostOf(nodePath, target) {
  if (target === void 0) {
    return void 0;
  }
  for (const run of runsOf(nodePath) ?? []) {
    for (const node of run) {
      if (isElement(node) && node.isConnected && node.contains(target)) {
        return node;
      }
    }
  }
  return elementsWithPath(nodePath).find((element) => element.contains(target));
}
function drawsAny(nodePath) {
  if (drawsPseudoAt(nodePath, "before")) {
    return true;
  }
  return drawsPseudoAt(nodePath, "after");
}
function measureHost(candidate) {
  const origin = candidate.host.getBoundingClientRect();
  const relative = (pseudo) => {
    if (!drawsPseudoAt(candidate.path, pseudo)) {
      return void 0;
    }
    const box = measurePseudo(candidate.host, pseudo);
    return box === void 0 ? void 0 : boxAt(box, -origin.left, -origin.top);
  };
  return { path: candidate.path, host: candidate.host, before: relative("before"), after: relative("after") };
}
function placed(entry) {
  const origin = entry.host.getBoundingClientRect();
  const at = (pseudo, offset) => {
    if (offset === void 0) {
      return void 0;
    }
    return drawsPseudoAt(entry.path, pseudo) ? boxAt(offset, origin.left, origin.top) : void 0;
  };
  return { before: at("before", entry.before), after: at("after", entry.after) };
}

// electron/preload/frameTargets.ts
function enterDesignMode() {
  trackCanvas();
}
var lastHover;
var nodeAt = (target, x, y) => {
  const tagged = taggedFor(target, x, y);
  const anyTag = target instanceof Element ? target.closest(`[${PATH_ATTR}]`) : void 0;
  const best = deepestRegionAt(target, x, y, tagged && pathsOf(tagged).find(inScope));
  if (best && x !== void 0 && y !== void 0) {
    const pseudo = pseudoTargetAt(best, target, x, y);
    if (pseudo) {
      return { path: pseudo.path, occurrence: occurrenceOf(pseudo.path, target), outside: false, pseudo: pseudo.pseudo };
    }
  }
  if (x !== void 0 && y !== void 0) {
    const thin = thinAt(x, y, best);
    if (thin) {
      return { path: thin.path, occurrence: occurrenceOf(thin.path, thin.el), outside: false, pseudo: void 0 };
    }
  }
  if (best && x !== void 0 && y !== void 0) {
    const text2 = inlineTextPathAt(best, x, y);
    if (text2) {
      return { path: text2, occurrence: occurrenceOf(best, target), outside: false, pseudo: void 0 };
    }
  }
  return {
    path: best,
    occurrence: best ? occurrenceOf(best, target) : 0,
    outside: !best && !!anyTag,
    pseudo: void 0
  };
};
var EDGE = 1;
var holdsPoint = (element, x, y) => {
  if (x === void 0 || y === void 0) {
    return true;
  }
  const rect = element.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) {
    return true;
  }
  return x >= rect.left - EDGE && x <= rect.right + EDGE && y >= rect.top - EDGE && y <= rect.bottom + EDGE;
};
var taggedFor = (target, x, y) => {
  let tagged = target instanceof Element ? target.closest(`[${PATH_ATTR}]`) ?? void 0 : void 0;
  while (x !== void 0 && tagged && !holdsPoint(tagged, x, y)) {
    tagged = taggedAncestor(tagged);
  }
  while (tagged !== void 0 && !(inFocus(tagged) && pathsOf(tagged).some(inScope))) {
    tagged = taggedAncestor(tagged);
  }
  return tagged;
};
var deepestRegionAt = (target, x, y, tagPath) => {
  let best = tagPath;
  let bestDepth = best ? best.split(".").length : -1;
  for (const nodePath of regions.keys()) {
    if (!inScope(nodePath)) {
      continue;
    }
    const runs = runsOf(nodePath) || [];
    const depth = nodePath.split(".").length;
    if (depth <= bestDepth) {
      continue;
    }
    for (const run of runs) {
      const hit = run.some((node) => node.isConnected && node.nodeType === 1 && (node === target || target !== void 0 && node.contains(target)));
      if (hit) {
        if (x !== void 0 && !run.some((node) => isElement(node) && holdsPoint(node, x, y))) {
          break;
        }
        best = nodePath;
        bestDepth = depth;
        break;
      }
    }
  }
  return best;
};
var targetAt = (event) => (event.clientX || event.clientY ? document.elementFromPoint(event.clientX, event.clientY) : void 0) || (event.target instanceof window.Node ? event.target : void 0);
var nodeAtEvent = (event) => event.clientX || event.clientY ? nodeAt(targetAt(event), event.clientX, event.clientY) : nodeAt(targetAt(event));
var startOutlines = () => {
  document.addEventListener("avb:morphed", () => {
    collectRegions();
    announceMapped();
    queueRects(true);
  });
  collectRegions();
  announceMapped();
  if (!regions.size) {
    return;
  }
  window.addEventListener("scroll", () => queueRects(), true);
  window.addEventListener("resize", remeasure);
  new MutationObserver((records) => {
    const kind = mutationKind(records);
    if (kind === "page") {
      remeasure();
    } else if (kind === "css") {
      remeasureStyles();
    }
  }).observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeOldValue: true,
    characterData: true
  });
  try {
    const ro = new ResizeObserver(remeasureStyles);
    ro.observe(document.documentElement);
    if (document.body) {
      ro.observe(document.body);
    }
  } catch {
  }
  lookForMotion();
  listenForPointer();
  listenForContextMenu();
};
var lookForMotion = () => {
  const look = setInterval(watchMotion, LOOK_EVERY);
  if (typeof look === "object" && look !== null && "unref" in look && typeof look["unref"] === "function") {
    look["unref"]();
  }
};
var listenForPointer = () => {
  document.addEventListener("mousemove", (event) => {
    const { path: nodePath, occurrence, pseudo } = nodeAtEvent(event);
    if (lastHover === void 0 || nodePath !== lastHover.path || occurrence !== lastHover.occurrence || pseudo !== lastHover.pseudo) {
      lastHover = { path: nodePath, occurrence, pseudo };
      postLocated("avb:hover-node", { path: nodePath, occurrence, ...pseudoField(pseudo) });
    }
  });
  document.documentElement.addEventListener("mouseleave", startOutlinesClearHover);
  window.addEventListener(
    "dblclick",
    (event) => {
      if (!canvasSelects()) {
        return;
      }
      event.preventDefault();
      event.stopImmediatePropagation();
      const { path: nodePath, occurrence } = nodeAtEvent(event);
      postLocated("avb:open-node", { path: nodePath || void 0, occurrence });
    },
    true
  );
  window.addEventListener(
    "click",
    (event) => {
      if (!canvasSelects()) {
        return;
      }
      event.preventDefault();
      event.stopImmediatePropagation();
      if (canvasDragged()) {
        return;
      }
      forgetPseudoBoxes();
      const { path: nodePath, occurrence, outside, pseudo } = nodeAtEvent(event);
      postLocated("avb:click-node", {
        path: nodePath || void 0,
        occurrence,
        outside: !!outside,
        ...pseudoField(pseudo)
      });
    },
    true
  );
};
function listenForContextMenu() {
  document.addEventListener(
    "contextmenu",
    (event) => {
      if (!canvasSelects()) {
        return;
      }
      event.preventDefault();
      event.stopImmediatePropagation();
      const { path, occurrence, outside } = nodeAtEvent(event);
      postLocated("avb:context-node", {
        path: path || void 0,
        occurrence,
        outside: !!outside,
        left: event.clientX,
        top: event.clientY
      });
    },
    true
  );
}
function startOutlinesClearHover() {
  forgetPseudoBoxes();
  if (lastHover === void 0 || lastHover.path !== void 0) {
    lastHover = { path: void 0, occurrence: 0, pseudo: void 0 };
    postLocated("avb:hover-node", { path: void 0, occurrence: 0 });
  }
}
function pseudoField(pseudo) {
  return pseudo === void 0 ? {} : { pseudo };
}
function postLocated(type, located) {
  window.parent.postMessage({ type, ...located, token: renderToken }, "*");
}

// electron/preload/frameQueries.ts
var lastQuestion;
var elementsForPath = (nodePath) => {
  const out = [];
  for (const run of runsOf(nodePath) || []) {
    for (const node of run) {
      if (!isElement(node)) {
        continue;
      }
      if (!node.isConnected || node.tagName === "TEMPLATE") {
        continue;
      }
      out.push(node);
    }
  }
  for (const element of elementsWithPath(nodePath)) {
    if (!out.includes(element)) {
      out.push(element);
    }
  }
  if (!out.length) {
    const first = Array.from(document.querySelectorAll(`[${PATH_ATTR}]`)).find((element) => pathsOf(element).some((x) => x.startsWith(nodePath + ".")));
    if (first) {
      out.push(first);
    }
  }
  return out;
};
var identityOf = (element) => ({
  tag: element.tagName.toLowerCase(),
  id: element.id || void 0,
  classes: ownClasses(element),
  attributes: Object.fromEntries(
    Array.from(element.attributes).filter((attribute) => !attribute.name.startsWith("data-avb-")).map((attribute) => [attribute.name, attribute.value])
  )
});
var recordPayload = (x) => typeof x === "object" && x !== null;
function listenForQueries() {
  document.addEventListener("avb:morphed", () => setTimeout(settlePendingDeletes, 0));
  window.addEventListener("message", (event) => {
    if (event.source !== window.parent) {
      return;
    }
    const data = event.data;
    if (!recordPayload(data)) {
      return;
    }
    const interaction = parseCanvasInteraction(data);
    if (interaction !== void 0) {
      setCanvasInteraction(interaction);
      return;
    }
    if (data["type"] === "avb:query" && typeof data["id"] === "number") {
      answerQuery(data, data["id"]);
      return;
    }
    if (data["type"] === "avb:class-patch") {
      applyClassPatch(data);
      return;
    }
    if (data["type"] === "avb:request-render") {
      reportRender();
      return;
    }
    if (data["type"] === "avb:resend-reports") {
      forgetReportedKeys();
      sendRendered();
      sendClasses();
      return;
    }
    if (data["type"] === "avb:hide-pending") {
      hidePending(data["path"]);
      return;
    }
    guideFrame?.receive(data);
    if (data["type"] === "avb:track" && Array.isArray(data["paths"])) {
      track(data, data["paths"]);
    }
    if (data["type"] === "avb:scroll-to" && typeof data["path"] === "string") {
      scrollPathIntoView(data["path"], typeof data["occ"] === "number" ? data["occ"] : 0);
    }
    if (data["type"] === "avb:set-vh" && typeof data["px"] === "number") {
      freezeViewportHeight(data["px"]);
    }
  });
}
function hidePending(input) {
  let path;
  try {
    path = pathText(input);
  } catch {
    return;
  }
  hidePendingDelete(path);
  sendRects();
}
var CLASS_PATCH_NAMES_MAX = 64;
var CLASS_PATCH_OCCURRENCES_MAX = 1024;
function applyClassPatch(data) {
  let path;
  let add;
  let remove;
  try {
    path = pathText(data["path"]);
    add = list(text)(data["add"]);
    remove = list(text)(data["remove"]);
  } catch {
    return;
  }
  if (add.length + remove.length > CLASS_PATCH_NAMES_MAX) {
    return;
  }
  if ([...add, ...remove].some((name) => !name || name.length > 256 || /\s/.test(name))) {
    return;
  }
  const elements = allElementsWithPath(path, CLASS_PATCH_OCCURRENCES_MAX);
  if (!elements) {
    return;
  }
  for (const element of elements) {
    for (const name of remove) {
      element.classList.remove(name);
    }
    for (const name of add) {
      element.classList.add(name);
    }
  }
  sendClasses();
  sendRects();
}
var answerQuery = (data, id) => {
  if (data["pageText"] === true) {
    window.parent.postMessage({ type: "avb:query-result", id, found: true, pageText: renderedPageText(document) }, "*");
    return;
  }
  if (data["pageMetadata"] === true) {
    window.parent.postMessage(
      {
        type: "avb:query-result",
        id,
        found: true,
        pageImage: renderedPageImage(document),
        pageType: renderedPageType(document)
      },
      "*"
    );
    return;
  }
  const path = typeof data["path"] === "string" ? data["path"] : "";
  const els = path ? elementsForPath(path) : [];
  const styleHost = els[0] ?? answerQueryTextHost(path, data["textParentPath"]);
  const wanted = (Array.isArray(data["compute"]) ? data["compute"] : []).filter((value) => typeof value === "string");
  const host = styleHost ?? document.documentElement;
  const computed = wanted.length && host ? computeValues(host, wanted) : {};
  const props = Array.isArray(data["props"]) ? data["props"] : [];
  const computedProps = props.length && styleHost ? computeProperties(styleHost, props) : {};
  const selectors = (Array.isArray(data["selectors"]) ? data["selectors"] : []).filter((value) => typeof value === "string");
  const matched = {};
  for (const selector of selectors) {
    try {
      matched[selector] = els.some((element) => element.matches(selector));
    } catch {
      matched[selector] = void 0;
    }
  }
  window.parent.postMessage(
    {
      type: "avb:query-result",
      id,
      ready: mapped,
      found: styleHost !== void 0,
      computed,
      computedProps,
      ...styleHost ? queryAuthoredStyles(
        styleHost,
        props.filter((prop) => typeof prop === "string"),
        els[0] ? "element" : "text"
      ) : {},
      identity: els[0] ? identityOf(els[0]) : void 0,
      matched
    },
    "*"
  );
};
function answerQueryTextHost(path, parent) {
  const runs = runsOf(path) ?? [];
  if (runs.length > LIMITS.treeNodesMax) {
    return void 0;
  }
  let visited = 0;
  for (const run of runs) {
    for (const node of run) {
      visited += 1;
      if (visited > LIMITS.treeNodesMax) {
        return void 0;
      }
      if (isText(node)) {
        if (node.isConnected) {
          if (node.data.trim().length > 0) {
            return node.parentElement ?? void 0;
          }
        }
      }
    }
  }
  return runs.length === 0 ? answerQueryTextParent(path, parent) : void 0;
}
function answerQueryTextParent(path, input) {
  if (input === void 0) {
    return void 0;
  }
  let parent;
  try {
    parent = pathText(input);
  } catch {
    return void 0;
  }
  if (!path.startsWith(`${parent}.`)) {
    return void 0;
  }
  if (!/^\d+$/.test(path.slice(parent.length + 1))) {
    return void 0;
  }
  return elementsWithPath(parent)[0];
}
var computeValues = (host, wanted) => {
  const computed = {};
  const probe = document.createElement("span");
  probe.setAttribute(PROBE_ATTR, "");
  probe.setAttribute("style", "position:absolute;width:0;height:0;visibility:hidden");
  host.appendChild(probe);
  for (const value of wanted) {
    try {
      probe.style.color = "rgb(1, 2, 3)";
      probe.style.color = value;
      computed[value] = probe.style.color === "rgb(1, 2, 3)" ? void 0 : getComputedStyle(probe).color;
    } catch {
      computed[value] = void 0;
    }
  }
  probe.remove();
  return computed;
};
var computeProperties = (element, props) => {
  const computedProps = {};
  const designStyle = document.getElementById("avb-design-style");
  const designSheet = designStyle instanceof HTMLStyleElement ? designStyle : void 0;
  try {
    if (designSheet) {
      designSheet.disabled = true;
    }
    const cs = getComputedStyle(element);
    for (const prop of props) {
      if (typeof prop !== "string") {
        continue;
      }
      computedProps[prop] = cs.getPropertyValue(prop) || void 0;
    }
  } catch {
  } finally {
    if (designSheet) {
      designSheet.disabled = false;
    }
  }
  return computedProps;
};
var track = (data, paths) => {
  enterDesignMode();
  setTracking({
    paths: paths.filter((nodePath) => typeof nodePath === "string"),
    scope: typeof data["scope"] === "string" ? data["scope"] : "",
    focus: typeof data["focus"] === "string" ? data["focus"] : "",
    occurrence: typeof data["focusOcc"] === "number" ? data["focusOcc"] : 0
  });
  resetFocusCache();
  resetThinCache();
  paintOpened();
  sendRects();
  const question = `${activeScope}|${focusPath}|${focusOcc}`;
  if (question !== lastQuestion) {
    lastQuestion = question;
    forgetReportedKeys();
    sendRendered();
    sendClasses();
  }
};
var guideFrame;
var start = () => {
  report2();
  startOutlines();
  guideFrame = startGuide((message) => window.parent.postMessage(message, "*"));
  try {
    window.parent.postMessage({ type: "avb:navigated", path: location.pathname + location.search }, "*");
  } catch {
  }
  try {
    const ro = new ResizeObserver(report2);
    ro.observe(document.documentElement);
    if (document.body) {
      ro.observe(document.body);
    }
  } catch {
  }
  window.addEventListener("load", report2);
};
function startWhenReady() {
  if (document.readyState === "loading") {
    window.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
}

// electron/preload/preload.ts
if (!process.isMainFrame) {
  const post2 = (message) => window.parent.postMessage(message, "*");
  installCanvasText(post2, canvasSelects, (target, element) => {
    if (target.from === "prop") {
      return;
    }
    post2({
      type: "avb:click-node",
      path: target.parent,
      outside: false,
      occurrence: occurrenceOf(target.parent, element),
      token: renderToken
    });
  });
  markFrameMode();
  listenForDesign();
  listenForQueries();
  startWhenReady();
} else {
  exposeBridge();
}
