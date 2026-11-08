// electron/previewClient/morphNodes.ts
function stripTemplateMarkers(root) {
  const gone = root.querySelectorAll("template[data-avb-s],template[data-avb-e]");
  for (let i = 0; i < gone.length; i++) {
    const node = gone[i];
    if (node) {
      node.remove();
    }
  }
}
var isAnchor = (node) => {
  const comment = node !== void 0 && asComment(node) ? node : void 0;
  return comment !== void 0 && /^avb-[sed]:/.test(comment.data);
};
var MORPH_LIMITS = { domDepthMax: 512 };
var isStamp = (node) => {
  const comment = node !== void 0 && asComment(node) ? node : void 0;
  return comment !== void 0 && comment.data.startsWith("avb-d:");
};
var asElement = (node) => node.nodeType === 1;
var asText = (node) => node.nodeType === 3;
var asComment = (node) => node.nodeType === 8;
var asDocument = (node) => node.nodeType === 9;

// shared/properties/previewRoute.ts
var DEFAULTS_ROUTE = /^\/__avb\/preview\?defaults=[a-f0-9-]{36}$/;
var URL_CHARS_MAX = 4096;
function defaultsPreviewTransition(previous, next) {
  const before = previewURL(previous);
  const after = previewURL(next);
  if (!before || !after || before.origin !== after.origin) {
    return false;
  }
  return DEFAULTS_ROUTE.test(before.pathname + before.search) || DEFAULTS_ROUTE.test(after.pathname + after.search);
}
function parsePreviewRoute(input, current) {
  if (!input || typeof input !== "object" || !("type" in input) || !("url" in input)) {
    return void 0;
  }
  if (input.type !== "avb:preview-route" || typeof input.url !== "string") {
    return void 0;
  }
  if (!defaultsPreviewTransition(current, input.url)) {
    return void 0;
  }
  const next = previewURL(input.url);
  return next ? next.pathname + next.search + "#avb-design" : void 0;
}
function previewURL(value) {
  if (value.length > URL_CHARS_MAX) {
    return void 0;
  }
  try {
    const url = new URL(value);
    if (url.protocol === "http:" || url.protocol === "https:") {
      return url;
    }
    return void 0;
  } catch {
    return void 0;
  }
}

// electron/previewClient/morphBudget.ts
var OverCap = class extends Error {
  reason;
  constructor(reason) {
    super(`the canvas patch is over its cap (${reason})`);
    this.reason = reason;
  }
};
var morphWorkLeft = AVB_PREVIEW_LIMITS.previewMorphWorkMax;
function refillMorphWork() {
  morphWorkLeft = AVB_PREVIEW_LIMITS.previewMorphWorkMax;
}
function spendMorphWork(cells) {
  if (morphWorkLeft < cells) {
    throw new OverCap("diff-over-cap");
  }
  morphWorkLeft -= cells;
}
function checkMarkerCap(root) {
  let markers = 0;
  const stack = [root];
  while (stack.length) {
    const parent = stack.pop();
    if (!parent) {
      break;
    }
    for (let node = parent.firstChild; node; node = node.nextSibling) {
      if (asComment(node) && /^avb-s:/.test(node.data)) {
        markers++;
        if (markers > AVB_PREVIEW_LIMITS.previewMarkersMax) {
          throw new OverCap("markers-over-cap");
        }
      } else if (asElement(node)) {
        stack.push(node);
      }
    }
  }
}

// electron/previewClient/morphAnchors.ts
function previewHost(hash) {
  return hash === "#avb-design" ? "stacki" : "browser";
}
function stripAnchors(root) {
  const gone = [];
  const walk = (parent, depth) => {
    if (depth > MORPH_LIMITS.domDepthMax) {
      throw new Error("the page nests deeper than the patch walks");
    }
    for (let node = parent.firstChild; node; node = node.nextSibling) {
      if (asComment(node) && isAnchor(node)) {
        gone.push(node);
      } else if (asElement(node)) {
        walk(node, depth + 1);
      }
    }
  };
  walk(root, 0);
  for (const node of gone) {
    node.remove();
  }
}
function stripPreviewInstrumentation(root) {
  stripAnchors(root);
  const marked = root.querySelectorAll("[data-avb-p],[data-avb-d]");
  for (let index = 0; index < marked.length; index += 1) {
    marked[index]?.removeAttribute("data-avb-p");
    marked[index]?.removeAttribute("data-avb-d");
  }
}
function syncAnchors(liveRoot, serverRoot) {
  stripAnchors(liveRoot);
  const blank = (node) => asText(node) ? node.data.trim() === "" : false;
  const sameKind = (left, right) => {
    if (left.nodeType !== right.nodeType) {
      return false;
    }
    if (right.nodeType !== 1) {
      return true;
    }
    return asElement(left) && asElement(right) && left.tagName === right.tagName;
  };
  const walk = (live, server, depth) => {
    if (depth > MORPH_LIMITS.domDepthMax) {
      throw new Error("the page nests deeper than the patch walks");
    }
    let cursor = live.firstChild;
    for (let sv = server.firstChild; sv; sv = sv.nextSibling) {
      const marker = asComment(sv) && isAnchor(sv) ? sv : void 0;
      if (marker) {
        if (!isStamp(marker)) {
          live.insertBefore(document.createComment(marker.data), cursor);
        }
        continue;
      }
      if (blank(sv)) {
        continue;
      }
      let candidate = cursor;
      while (candidate && (blank(candidate) || !sameKind(candidate, sv))) {
        candidate = candidate.nextSibling;
      }
      if (!candidate) {
        continue;
      }
      if (asElement(candidate) && asElement(sv)) {
        walk(candidate, sv, depth + 1);
      }
      cursor = candidate.nextSibling;
    }
  };
  walk(liveRoot, serverRoot, 0);
}
function syncStamps(liveDocument, serverDocument) {
  const gone = [];
  const found = [];
  const collect = (root, into) => {
    const stack = [root];
    while (stack.length) {
      const parent = stack.pop();
      if (!parent) {
        break;
      }
      for (let node = parent.firstChild; node; node = node.nextSibling) {
        if (asComment(node) && isStamp(node)) {
          into(node);
        } else if (asElement(node)) {
          stack.push(node);
        }
      }
    }
  };
  collect(liveDocument, (comment) => gone.push(comment));
  collect(serverDocument, (comment) => found.push(comment.data));
  for (const node of gone) {
    node.remove();
  }
  for (const data of found) {
    liveDocument.appendChild(liveDocument.createComment(data));
  }
}

// electron/previewClient/morphPatch.ts
var pinned = (node) => {
  if (!asElement(node)) {
    return false;
  }
  return node.tagName === "NOSCRIPT" || node.tagName === "TEMPLATE" || node.tagName === "SCRIPT" && !!node.getAttribute("src") || node.tagName === "STYLE" && node.hasAttribute("data-vite-dev-id");
};
var keyOf = (node) => {
  if (node !== void 0 && asElement(node)) {
    return node.getAttribute("id") || void 0;
  }
  return void 0;
};
function keyFor(node) {
  if (asElement(node)) {
    return "e:" + node.tagName + "#" + (keyOf(node) || "");
  }
  return asComment(node) ? "c" : "t";
}
function diffChildren(before, after) {
  const beforeCount = before.length;
  const afterCount = after.length;
  const ops = [];
  let i = 0;
  let j = 0;
  while (i < beforeCount && j < afterCount && before[i] === after[j]) {
    ops.push([0, i++, j++]);
  }
  const start = i;
  const dp = [];
  if (i < beforeCount && j < afterCount) {
    spendMorphWork((beforeCount - start + 1) * (afterCount - start + 1));
    for (let row = 0; row <= beforeCount - start; row++) {
      dp.push(new Int32Array(afterCount - start + 1));
    }
    for (let row = beforeCount - start - 1; row >= 0; row--) {
      const currentRow = dp[row];
      const next = dp[row + 1];
      if (!currentRow || !next) {
        continue;
      }
      for (let col = afterCount - start - 1; col >= 0; col--) {
        currentRow[col] = before[row + start] === after[col + start] ? (next[col + 1] ?? 0) + 1 : Math.max(next[col] ?? 0, currentRow[col + 1] ?? 0);
      }
    }
  }
  while (i < beforeCount && j < afterCount) {
    if (before[i] === after[j]) {
      ops.push([0, i++, j++]);
      continue;
    }
    if ((dp[i - start + 1]?.[j - start] ?? 0) >= (dp[i - start]?.[j - start + 1] ?? 0)) {
      ops.push([-1, i++, -1]);
    } else {
      ops.push([1, -1, j++]);
    }
  }
  while (i < beforeCount) {
    ops.push([-1, i++, -1]);
  }
  while (j < afterCount) {
    ops.push([1, -1, j++]);
  }
  return ops;
}
function Ambiguous(what) {
  return new Error("cannot line up " + what + " with the live page");
}
var classesOf = (node) => (node.getAttribute("class") || "").split(/\s+/).filter(Boolean);
function keepsClassesOf(live, serverNode) {
  const want = classesOf(serverNode);
  if (!want.length) {
    return live.classList.length === 0;
  }
  for (const className of want) {
    if (!live.classList.contains(className)) {
      return false;
    }
  }
  return true;
}
function findLive(from, serverNode) {
  let loose = void 0;
  if (!asElement(serverNode)) {
    for (let node = from; node; node = node.nextSibling ?? void 0) {
      if (isAnchor(node)) {
        continue;
      }
      if (node.nodeType === serverNode.nodeType) {
        return node;
      }
    }
    return void 0;
  }
  const key = keyOf(serverNode);
  for (let node = from; node; node = node.nextSibling ?? void 0) {
    if (isAnchor(node)) {
      continue;
    }
    if (!asElement(node)) {
      continue;
    }
    if (node.tagName !== serverNode.tagName) {
      continue;
    }
    if (key !== void 0) {
      if (keyOf(node) === key) {
        return node;
      }
      continue;
    }
    if (keepsClassesOf(node, serverNode)) {
      return node;
    }
    if (!loose) {
      loose = node;
    }
  }
  return loose;
}
function patchClass(live, previous, next) {
  const before = (previous.getAttribute("class") || "").split(/\s+/).filter(Boolean);
  const after = (next.getAttribute("class") || "").split(/\s+/).filter(Boolean);
  for (const className of before) {
    if (after.indexOf(className) === -1) {
      live.classList.remove(className);
    }
  }
  for (const className of after) {
    if (before.indexOf(className) === -1) {
      live.classList.add(className);
    }
  }
}
function patchAttrs(live, previous, next) {
  const want = next.attributes;
  for (let i = 0; i < want.length; i++) {
    const attribute = want[i];
    if (!attribute) {
      continue;
    }
    if (previous.getAttribute(attribute.name) === attribute.value) {
      continue;
    }
    if (attribute.name === "class") {
      patchClass(live, previous, next);
    } else {
      live.setAttribute(attribute.name, attribute.value);
    }
  }
  const had = previous.attributes;
  for (let i = had.length - 1; i >= 0; i--) {
    const attribute = had[i];
    if (!attribute) {
      continue;
    }
    if (next.hasAttribute(attribute.name)) {
      continue;
    }
    if (attribute.name === "class") {
      patchClass(live, previous, next);
    } else {
      live.removeAttribute(attribute.name);
    }
  }
}
function patchNode(live, previous, next) {
  if (previous.isEqualNode(next)) {
    return;
  }
  if (live.nodeType === 3 || live.nodeType === 8) {
    const liveText = asText(live) ? live : asComment(live) ? live : void 0;
    const previousData = (asText(previous) ? previous : asComment(previous) ? previous : void 0)?.data;
    const nextData = (asText(next) ? next : asComment(next) ? next : void 0)?.data;
    if (liveText && previousData !== void 0 && nextData !== void 0 && previousData !== nextData && liveText.data === previousData) {
      liveText.data = nextData;
    }
    return;
  }
  if (!asElement(live) || pinned(live)) {
    return;
  }
  if (!asElement(previous) || !asElement(next)) {
    return;
  }
  patchAttrs(live, previous, next);
  patchChildren(live, previous, next);
}
function patchChildren(liveParent, previousParent, nextParent) {
  const before = [];
  for (let node = previousParent.firstChild; node; node = node.nextSibling) {
    before.push(node);
  }
  const after = [];
  for (let node = nextParent.firstChild; node; node = node.nextSibling) {
    after.push(node);
  }
  let live = liveParent.firstChild;
  const locate = (serverNode) => {
    const target = findLive(live ?? void 0, serverNode);
    if (!target) {
      throw Ambiguous(describe(serverNode));
    }
    return target;
  };
  for (const [kind, i, j] of diffChildren(before.map(keyFor), after.map(keyFor))) {
    if (kind === 0) {
      const previousNode = before[i];
      const nextNode = after[j];
      if (previousNode === void 0 || nextNode === void 0) {
        throw Ambiguous("index gap in diff");
      }
      const target = locate(previousNode);
      patchNode(target, previousNode, nextNode);
      live = target.nextSibling;
    } else if (kind === -1) {
      const previousNode = before[i];
      if (previousNode === void 0) {
        throw Ambiguous("index gap in diff");
      }
      const target = locate(previousNode);
      if (live === target) {
        live = target.nextSibling;
      }
      const removal = asElement(target) ? target : asText(target) ? target : asComment(target) ? target : void 0;
      removal?.remove();
    } else {
      const nextNode = after[j];
      if (nextNode !== void 0) {
        liveParent.insertBefore(document.importNode(nextNode, true), live);
      }
    }
  }
}
var describe = (node) => {
  if (asElement(node)) {
    return "<" + node.tagName.toLowerCase() + ">";
  }
  if (asComment(node)) {
    return "marker " + node.data;
  }
  return "text";
};

// electron/previewClient/morphAssets.ts
function isStyleModule(source) {
  return /[?&]astro&type=style|\.(css|s[ac]ss|less|pcss|styl)(\?|$)/.test(source || "");
}
function scriptsOf(page) {
  const out = [];
  const list = page.getElementsByTagName("script");
  for (let i = 0; i < list.length; i++) {
    const script = list[i];
    if (!script) {
      continue;
    }
    const source = script.getAttribute("src") || "";
    if (isStyleModule(source)) {
      continue;
    }
    let attrs = Array.from(script.attributes, (attribute) => [attribute.name, attribute.value]);
    attrs = attrs.sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0);
    out.push({
      src: source,
      type: script.getAttribute("type") || "",
      attrs,
      signature: JSON.stringify([attrs, script.textContent])
    });
  }
  return out;
}
function addedScripts(previousDocument2, nextDocument) {
  const before = scriptsOf(previousDocument2);
  const after = scriptsOf(nextDocument);
  const had = new Set(before.map((script) => script.signature));
  const added = [];
  let i = 0;
  for (const script of after) {
    if (script.signature === before[i]?.signature) {
      i++;
    } else {
      if (had.has(script.signature) || !script.src) {
        return void 0;
      }
      added.push(script);
    }
  }
  return i === before.length ? added : void 0;
}
var loadedScripts = /* @__PURE__ */ new Set();
function noteScripts(page) {
  for (const { src: source } of scriptsOf(page)) {
    if (source) {
      loadedScripts.add(source);
    }
  }
}
function runScripts(added) {
  for (const { src: source, attrs } of added) {
    if (!source || loadedScripts.has(source)) {
      continue;
    }
    loadedScripts.add(source);
    const element = document.createElement("script");
    element.async = false;
    for (const [name, value] of attrs) {
      element.setAttribute(name, value);
    }
    document.head.appendChild(element);
  }
}
var loadedStyles = /* @__PURE__ */ new Set();
function noteStyles(page) {
  const list = page.getElementsByTagName("script");
  for (let i = 0; i < list.length; i++) {
    const script = list[i];
    if (!script) {
      continue;
    }
    const source = script.getAttribute("src");
    if (source !== null && isStyleModule(source)) {
      loadedStyles.add(source);
    }
  }
}
function loadStyles(page) {
  const list = page.getElementsByTagName("script");
  for (let i = 0; i < list.length; i++) {
    const script = list[i];
    if (!script) {
      continue;
    }
    const source = script.getAttribute("src");
    if (source === null || !isStyleModule(source) || loadedStyles.has(source)) {
      continue;
    }
    loadedStyles.add(source);
    const element = document.createElement("script");
    element.type = "module";
    element.src = source;
    document.head.appendChild(element);
  }
}
function refreshDevStyles(previous, next) {
  const before = devStyleTexts(previous);
  const fresh = devStyleTexts(next);
  const live = document.querySelectorAll("style[data-vite-dev-id]");
  for (let i = 0; i < live.length; i++) {
    const style = live[i];
    const id = style?.getAttribute("data-vite-dev-id") ?? "";
    const text = fresh.get(id);
    if (style === void 0 || text === void 0) {
      continue;
    }
    if (before.get(id) === text) {
      continue;
    }
    if (style.textContent !== text) {
      style.textContent = text;
    }
  }
}
function devStyleTexts(page) {
  const texts = /* @__PURE__ */ new Map();
  const served = page.querySelectorAll("style[data-vite-dev-id]");
  for (let i = 0; i < served.length; i++) {
    const id = served[i]?.getAttribute("data-vite-dev-id");
    if (id !== null && id !== void 0) {
      texts.set(id, served[i]?.textContent ?? "");
    }
  }
  return texts;
}

// electron/previewClient/morphClient.ts
var host = previewHost(location.hash);
if (host === "browser") {
  stripPreviewInstrumentation(document);
}
function fetchDocument(initialHTML, signal) {
  const rendering = initialHTML === void 0 ? fetch(location.href, { cache: "no-store", ...signal ? { signal } : {} }).then((response) => {
    const html404 = response.status === 404 && response.headers.get("content-type")?.includes("text/html");
    if (!response.ok && !html404) {
      throw new Error("dev server answered " + response.status);
    }
    return response.text();
  }) : Promise.resolve(initialHTML);
  return rendering.then((html) => {
    const withAnchors = new DOMParser().parseFromString(html, "text/html");
    withAnchors.getElementById("studio-render-baseline")?.remove();
    stripTemplateMarkers(withAnchors);
    const clone = withAnchors.cloneNode(true);
    if (!asDocument(clone)) {
      throw new Error("cloned rendering is not a document");
    }
    const clean = clone;
    stripAnchors(clean);
    return { withAnchors, clean };
  });
}
function initialRendering() {
  const element = document.getElementById("studio-render-baseline");
  if (!element) {
    return void 0;
  }
  const value = JSON.parse(element.textContent || "null");
  element.remove();
  return typeof value === "string" ? value : void 0;
}
var previousDocument = void 0;
var ready = host === "stacki" ? fetchDocument(initialRendering()).then(
  (fetched) => {
    previousDocument = fetched.clean;
    noteStyles(fetched.clean);
    noteScripts(fetched.clean);
  },
  () => {
    previousDocument = void 0;
  }
) : Promise.resolve();
function reloadFor(reason) {
  try {
    window.parent.postMessage({ type: "avb:preview-reload", reason }, "*");
  } catch {
  }
  location.reload();
}
var busy = false;
var again = false;
var pushedHTML;
var pushReady = false;
var fallbackTimer;
var activePull;
var renderDeadline;
function clearFallback() {
  clearTimeout(fallbackTimer);
  fallbackTimer = void 0;
  renderDeadline = void 0;
}
function requestUpdate() {
  if (!pushReady) {
    clearTimeout(fallbackTimer);
    fallbackTimer = void 0;
    void update();
  } else if (!fallbackTimer) {
    fallbackTimer = setTimeout(() => {
      fallbackTimer = void 0;
      void update();
    }, 1500);
  }
}
document.addEventListener("studio:render-push", (event) => {
  pushReady = event instanceof CustomEvent && event.detail === true;
  if (!pushReady && fallbackTimer !== void 0) {
    clearFallback();
    void update();
  }
});
document.addEventListener("studio:render-pending", () => {
  if (!pushReady || renderDeadline !== void 0) {
    return;
  }
  renderDeadline = performance.now() + 2e4;
  clearTimeout(fallbackTimer);
  fallbackTimer = setTimeout(() => {
    clearFallback();
    void update();
  }, 2e4);
});
document.addEventListener("studio:render-html", (event) => {
  if (!(event instanceof CustomEvent) || typeof event.detail !== "string" || event.detail.length > 4e6) {
    return;
  }
  clearFallback();
  pushedHTML = event.detail;
  activePull?.abort();
  void update();
});
document.addEventListener("studio:render-fallback", () => {
  clearFallback();
  void update();
});
document.dispatchEvent(new window.Event("studio:render-listening"));
async function update() {
  if (busy) {
    again = true;
    return;
  }
  busy = true;
  let pull;
  try {
    await ready;
    if (!previousDocument) {
      throw new Error("no baseline rendering to compare against");
    }
    const html = pushedHTML;
    pushedHTML = void 0;
    if (html !== void 0) {
      again = false;
    }
    const renderingURL = location.href;
    pull = html === void 0 ? new AbortController() : void 0;
    activePull = pull;
    const next = await fetchDocument(html, pull?.signal);
    if (pushedHTML === void 0 && location.href === renderingURL) {
      applyRendering(next);
    } else {
      again = true;
    }
  } catch (error) {
    if (pull?.signal.aborted) {
      again = true;
    } else {
      console.error("[stacki] could not patch the page, reloading:", error);
      reloadFor(error instanceof OverCap ? error.reason : "patch-failed");
      return;
    }
  } finally {
    activePull = void 0;
    busy = false;
  }
  if (again) {
    again = false;
    void update();
  }
}
function applyRendering(next) {
  if (!previousDocument) {
    throw new Error("no baseline rendering to compare against");
  }
  checkMarkerCap(next.withAnchors);
  const added = addedScripts(previousDocument, next.clean);
  if (added === void 0) {
    reloadFor("scripts-changed");
    return;
  }
  refillMorphWork();
  const liveRoot = document.documentElement;
  const previousRoot = previousDocument.documentElement;
  const nextRoot = next.clean.documentElement;
  if (!liveRoot || !previousRoot || !nextRoot) {
    throw new Error("missing <html> in one of the renderings");
  }
  patchAttrs(liveRoot, previousRoot, nextRoot);
  patchChildren(document.head, previousDocument.head, next.clean.head);
  patchChildren(document.body, previousDocument.body, next.clean.body);
  const renderedBefore = previousDocument;
  previousDocument = next.clean;
  loadStyles(next.clean);
  refreshDevStyles(renderedBefore, next.clean);
  runScripts(added);
  const liveBody = document.body;
  const serverBody = next.withAnchors.body;
  if (!liveBody || !serverBody) {
    throw new Error("missing <body> in one of the renderings");
  }
  syncAnchors(liveBody, serverBody);
  syncStamps(document, next.withAnchors);
  document.dispatchEvent(new CustomEvent("avb:morphed", { detail: next.withAnchors }));
}
if (import.meta.hot) {
  import.meta.hot.on("avb:page-changed", () => {
    if (host === "stacki") {
      requestUpdate();
    } else {
      location.reload();
    }
  });
}
window.addEventListener("message", (event) => {
  if (host === "browser") {
    return;
  }
  const data = event.data;
  if (event.source === window.parent) {
    const route = parsePreviewRoute(data, location.href);
    if (route && route !== location.pathname + location.search + location.hash) {
      pushedHTML = void 0;
      clearFallback();
      activePull?.abort();
      history.replaceState(history.state, "", route);
      document.dispatchEvent(new Event("avb:preview-route"));
      void update();
      return;
    }
  }
  if (typeof data === "object" && data !== null && "type" in data && data["type"] === "avb:patch-now") {
    requestUpdate();
  }
});
