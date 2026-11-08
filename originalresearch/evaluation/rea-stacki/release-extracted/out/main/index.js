"use strict";
const electronUpdater = require("electron-updater");
const electron = require("electron");
const fs = require("fs");
const path = require("path");
const utils = require("@electron-toolkit/utils");
const child_process = require("child_process");
const nanoid = require("nanoid");
const nodeHtmlParser = require("node-html-parser");
const csstree = require("css-tree");
const url = require("url");
function _interopNamespaceDefault(e) {
  const n = Object.create(null, { [Symbol.toStringTag]: { value: "Module" } });
  if (e) {
    for (const k in e) {
      if (k !== "default") {
        const d = Object.getOwnPropertyDescriptor(e, k);
        Object.defineProperty(n, k, d.get ? d : {
          enumerable: true,
          get: () => e[k]
        });
      }
    }
  }
  n.default = e;
  return Object.freeze(n);
}
const csstree__namespace = /* @__PURE__ */ _interopNamespaceDefault(csstree);
function normalizeProjectPagePath(path2) {
  return path2.replace(/\\/g, "/").replace(/^\/+/, "");
}
function normalizeProjectFolderPath(path2) {
  return normalizeProjectPagePath(path2).replace(/\/+$/, "");
}
function getProjectFolderPathForPage(path2) {
  const parts = normalizeProjectPagePath(path2).split("/").filter(Boolean);
  return parts.slice(0, -1).join("/");
}
function isProjectIndexPage(path2) {
  const normalized = normalizeProjectPagePath(path2);
  return /(^|\/)index\.(page\.js|html?)$/i.test(normalized);
}
function parseProjectPageStructure(text) {
  try {
    const parsed = JSON.parse(text);
    if (!parsed || !Array.isArray(parsed.nodes)) return null;
    return sanitizeNodes$4(parsed.nodes);
  } catch {
    return null;
  }
}
function mergeProjectPageStructure(htmlRelativePaths, savedNodes) {
  const normalizedHtmlPaths = [...new Set(htmlRelativePaths.map(normalizeProjectPagePath))].sort((left, right) => left.localeCompare(right));
  const folderInfo = buildFolderInfo$1(normalizedHtmlPaths);
  const sanitizedSavedNodes = sanitizeNodes$4(savedNodes || []);
  const mergedNodes = mergeNodesForFolder$1("", sanitizedSavedNodes, folderInfo);
  const changed = JSON.stringify(sanitizedSavedNodes) !== JSON.stringify(mergedNodes);
  return { nodes: mergedNodes, changed };
}
function sanitizeNodes$4(nodes) {
  return nodes.flatMap((node) => {
    if (!node || typeof node !== "object") return [];
    if (node.kind === "page" && typeof node.path === "string") {
      return [{ kind: "page", path: normalizeProjectPagePath(node.path) }];
    }
    if (node.kind === "folder" && typeof node.path === "string") {
      return [{
        kind: "folder",
        path: normalizeProjectFolderPath(node.path),
        children: sanitizeNodes$4(Array.isArray(node.children) ? node.children : [])
      }];
    }
    return [];
  });
}
function buildFolderInfo$1(htmlRelativePaths) {
  const folderInfo = /* @__PURE__ */ new Map();
  const ensureFolderInfo = (folderPath) => {
    const normalizedFolderPath = normalizeProjectFolderPath(folderPath);
    const existing = folderInfo.get(normalizedFolderPath);
    if (existing) return existing;
    const next = { childFolders: /* @__PURE__ */ new Set(), pages: /* @__PURE__ */ new Set() };
    folderInfo.set(normalizedFolderPath, next);
    return next;
  };
  ensureFolderInfo("");
  for (const rawPath of htmlRelativePaths) {
    const path2 = normalizeProjectPagePath(rawPath);
    const parts = path2.split("/").filter(Boolean);
    let parentFolderPath = "";
    for (let index = 0; index < parts.length - 1; index += 1) {
      const folderPath = parts.slice(0, index + 1).join("/");
      ensureFolderInfo(parentFolderPath).childFolders.add(folderPath);
      ensureFolderInfo(folderPath);
      parentFolderPath = folderPath;
    }
    const pageFolderPath = getProjectFolderPathForPage(path2);
    if (!(isProjectIndexPage(path2) && pageFolderPath !== "")) {
      ensureFolderInfo(pageFolderPath).pages.add(path2);
    }
  }
  return folderInfo;
}
function mergeNodesForFolder$1(folderPath, savedNodes, folderInfo) {
  const normalizedFolderPath = normalizeProjectFolderPath(folderPath);
  const currentFolderInfo = folderInfo.get(normalizedFolderPath);
  if (!currentFolderInfo) return [];
  const availableFolderPaths = new Set([...currentFolderInfo.childFolders].sort((left, right) => left.localeCompare(right)));
  const availablePagePaths = new Set([...currentFolderInfo.pages].sort((left, right) => left.localeCompare(right)));
  const merged = [];
  for (const node of savedNodes) {
    if (node.kind === "folder") {
      if (!availableFolderPaths.has(node.path)) continue;
      availableFolderPaths.delete(node.path);
      merged.push({
        kind: "folder",
        path: node.path,
        children: mergeNodesForFolder$1(node.path, node.children, folderInfo)
      });
      continue;
    }
    if (!availablePagePaths.has(node.path)) continue;
    availablePagePaths.delete(node.path);
    merged.push({ kind: "page", path: node.path });
  }
  for (const childFolderPath of [...availableFolderPaths].sort((left, right) => left.localeCompare(right))) {
    merged.push({
      kind: "folder",
      path: childFolderPath,
      children: mergeNodesForFolder$1(childFolderPath, [], folderInfo)
    });
  }
  for (const pagePath of [...availablePagePaths].sort((left, right) => left.localeCompare(right))) {
    merged.push({ kind: "page", path: pagePath });
  }
  return normalizedFolderPath === "" ? pinRootHomePageFirst(merged) : merged;
}
function pinRootHomePageFirst(nodes) {
  const homeIndex = nodes.findIndex(
    (node) => node.kind === "page" && isProjectIndexPage(node.path) && getProjectFolderPathForPage(node.path) === ""
  );
  if (homeIndex <= 0) return nodes;
  return [nodes[homeIndex], ...nodes.slice(0, homeIndex), ...nodes.slice(homeIndex + 1)];
}
function normalizeProjectAssetPath(path2) {
  return path2.replace(/\\/g, "/").replace(/^\/+/, "");
}
function normalizeProjectAssetFolderPath(path2) {
  return normalizeProjectAssetPath(path2).replace(/\/+$/, "");
}
function getProjectFolderPathForAsset(path2) {
  const parts = normalizeProjectAssetPath(path2).split("/").filter(Boolean);
  return parts.slice(0, -1).join("/");
}
function parseProjectAssetStructure(text) {
  try {
    const parsed = JSON.parse(text);
    if (!parsed || !Array.isArray(parsed.nodes)) return null;
    return sanitizeNodes$3(parsed.nodes);
  } catch {
    return null;
  }
}
function collectProjectAssetFolderPaths(nodes) {
  const folderPaths = /* @__PURE__ */ new Set();
  const visit = (entries) => {
    entries.forEach((entry) => {
      if (entry.kind !== "folder") return;
      folderPaths.add(normalizeProjectAssetFolderPath(entry.path));
      visit(entry.children);
    });
  };
  visit(sanitizeNodes$3(nodes));
  return [...folderPaths].sort((left, right) => left.localeCompare(right));
}
function mergeProjectAssetStructure(assetRelativePaths, savedNodes, assetFolderPaths = []) {
  const normalizedAssetPaths = [...new Set(assetRelativePaths.map(normalizeProjectAssetPath))].sort((left, right) => left.localeCompare(right));
  const normalizedAssetFolderPaths = [...new Set(assetFolderPaths.map(normalizeProjectAssetFolderPath))].filter(Boolean).sort((left, right) => left.localeCompare(right));
  const folderInfo = buildFolderInfo(normalizedAssetPaths);
  ensureExplicitFolders(folderInfo, normalizedAssetFolderPaths);
  const sanitizedSavedNodes = sanitizeNodes$3(savedNodes || []);
  const mergedNodes = mergeNodesForFolder("", sanitizedSavedNodes, folderInfo);
  const changed = JSON.stringify(sanitizedSavedNodes) !== JSON.stringify(mergedNodes);
  return { nodes: mergedNodes, changed };
}
function sanitizeNodes$3(nodes) {
  return nodes.flatMap((node) => {
    if (!node || typeof node !== "object") return [];
    if (node.kind === "file" && typeof node.path === "string") {
      return [{ kind: "file", path: normalizeProjectAssetPath(node.path) }];
    }
    if (node.kind === "folder" && typeof node.path === "string") {
      return [{
        kind: "folder",
        path: normalizeProjectAssetFolderPath(node.path),
        children: sanitizeNodes$3(Array.isArray(node.children) ? node.children : [])
      }];
    }
    return [];
  });
}
function buildFolderInfo(assetRelativePaths) {
  const folderInfo = /* @__PURE__ */ new Map();
  const ensureFolderInfo = (folderPath) => {
    const normalizedFolderPath = normalizeProjectAssetFolderPath(folderPath);
    const existing = folderInfo.get(normalizedFolderPath);
    if (existing) return existing;
    const next = { childFolders: /* @__PURE__ */ new Set(), files: /* @__PURE__ */ new Set() };
    folderInfo.set(normalizedFolderPath, next);
    return next;
  };
  ensureFolderInfo("");
  for (const rawPath of assetRelativePaths) {
    const path2 = normalizeProjectAssetPath(rawPath);
    const parts = path2.split("/").filter(Boolean);
    let parentFolderPath = "";
    for (let index = 0; index < parts.length - 1; index += 1) {
      const folderPath = parts.slice(0, index + 1).join("/");
      ensureFolderInfo(parentFolderPath).childFolders.add(folderPath);
      ensureFolderInfo(folderPath);
      parentFolderPath = folderPath;
    }
    ensureFolderInfo(getProjectFolderPathForAsset(path2)).files.add(path2);
  }
  return folderInfo;
}
function ensureExplicitFolders(folderInfo, folderPaths) {
  const ensureFolderInfo = (folderPath) => {
    const normalizedFolderPath = normalizeProjectAssetFolderPath(folderPath);
    const existing = folderInfo.get(normalizedFolderPath);
    if (existing) return existing;
    const next = { childFolders: /* @__PURE__ */ new Set(), files: /* @__PURE__ */ new Set() };
    folderInfo.set(normalizedFolderPath, next);
    return next;
  };
  ensureFolderInfo("");
  folderPaths.forEach((rawFolderPath) => {
    const folderPath = normalizeProjectAssetFolderPath(rawFolderPath);
    if (!folderPath) return;
    const parts = folderPath.split("/").filter(Boolean);
    let parentFolderPath = "";
    parts.forEach((part, index) => {
      const currentFolderPath = parts.slice(0, index + 1).join("/");
      ensureFolderInfo(parentFolderPath).childFolders.add(currentFolderPath);
      ensureFolderInfo(currentFolderPath);
      parentFolderPath = currentFolderPath;
    });
  });
}
function mergeNodesForFolder(folderPath, savedNodes, folderInfo) {
  const normalizedFolderPath = normalizeProjectAssetFolderPath(folderPath);
  const currentFolderInfo = folderInfo.get(normalizedFolderPath);
  if (!currentFolderInfo) return [];
  const availableFolderPaths = new Set([...currentFolderInfo.childFolders].sort((left, right) => left.localeCompare(right)));
  const availableFilePaths = new Set([...currentFolderInfo.files].sort((left, right) => left.localeCompare(right)));
  const merged = [];
  for (const node of savedNodes) {
    if (node.kind === "folder") {
      if (!availableFolderPaths.has(node.path)) continue;
      availableFolderPaths.delete(node.path);
      merged.push({
        kind: "folder",
        path: node.path,
        children: mergeNodesForFolder(node.path, node.children, folderInfo)
      });
      continue;
    }
    if (!availableFilePaths.has(node.path)) continue;
    availableFilePaths.delete(node.path);
    merged.push({ kind: "file", path: node.path });
  }
  for (const childFolderPath of [...availableFolderPaths].sort((left, right) => left.localeCompare(right))) {
    merged.push({
      kind: "folder",
      path: childFolderPath,
      children: mergeNodesForFolder(childFolderPath, [], folderInfo)
    });
  }
  for (const filePath of [...availableFilePaths].sort((left, right) => left.localeCompare(right))) {
    merged.push({ kind: "file", path: filePath });
  }
  return merged;
}
function normalizeProjectContentFolderPath(path2) {
  return path2.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
}
function parseProjectContentStructure(text) {
  try {
    const parsed = JSON.parse(text);
    if (!parsed || !Array.isArray(parsed.nodes)) return null;
    return sanitizeNodes$2(parsed.nodes);
  } catch {
    return null;
  }
}
function mergeProjectContentStructure(variableIds, savedNodes) {
  const availableVariableIds = [...new Set(variableIds.filter(Boolean))];
  const variableIdSet = new Set(availableVariableIds);
  const sanitizedSavedNodes = sanitizeNodes$2(savedNodes || []);
  const usedVariableIds = /* @__PURE__ */ new Set();
  const mergedNodes = mergeNodes$1(sanitizedSavedNodes, variableIdSet, usedVariableIds);
  const nextNodes = [
    ...mergedNodes,
    ...availableVariableIds.filter((id) => !usedVariableIds.has(id)).map((id) => ({ kind: "variable", id }))
  ];
  return {
    nodes: nextNodes,
    changed: JSON.stringify(sanitizedSavedNodes) !== JSON.stringify(nextNodes)
  };
}
function sanitizeNodes$2(nodes) {
  return nodes.flatMap((node) => {
    if (!node || typeof node !== "object") return [];
    if (node.kind === "variable" && typeof node.id === "string") {
      const id = node.id.trim();
      return id ? [{ kind: "variable", id }] : [];
    }
    if (node.kind === "folder" && typeof node.path === "string") {
      return [{
        kind: "folder",
        path: normalizeProjectContentFolderPath(node.path),
        children: sanitizeNodes$2(Array.isArray(node.children) ? node.children : [])
      }];
    }
    return [];
  });
}
function mergeNodes$1(nodes, variableIdSet, usedVariableIds) {
  const merged = [];
  for (const node of nodes) {
    if (node.kind === "folder") {
      merged.push({
        kind: "folder",
        path: node.path,
        children: mergeNodes$1(node.children, variableIdSet, usedVariableIds)
      });
      continue;
    }
    if (!variableIdSet.has(node.id) || usedVariableIds.has(node.id)) continue;
    usedVariableIds.add(node.id);
    merged.push({ kind: "variable", id: node.id });
  }
  return merged;
}
function normalizeProjectComponentFolderPath(path2) {
  return path2.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
}
function parseProjectComponentStructure(text) {
  try {
    const parsed = JSON.parse(text);
    if (!parsed || !Array.isArray(parsed.nodes)) return null;
    return sanitizeNodes$1(parsed.nodes);
  } catch {
    return null;
  }
}
function mergeProjectComponentStructure(componentIds, savedNodes) {
  const availableComponentIds = [...new Set(componentIds.filter(Boolean))];
  const componentIdSet = new Set(availableComponentIds);
  const sanitizedSavedNodes = sanitizeNodes$1(savedNodes || []);
  const usedComponentIds = /* @__PURE__ */ new Set();
  const mergedNodes = mergeNodes(sanitizedSavedNodes, componentIdSet, usedComponentIds);
  const nextNodes = [
    ...mergedNodes,
    ...availableComponentIds.filter((id) => !usedComponentIds.has(id)).map((id) => ({ kind: "component", id }))
  ];
  return {
    nodes: nextNodes,
    changed: JSON.stringify(sanitizedSavedNodes) !== JSON.stringify(nextNodes)
  };
}
function sanitizeNodes$1(nodes) {
  return nodes.flatMap((node) => {
    if (!node || typeof node !== "object") return [];
    if (node.kind === "component" && typeof node.id === "string") {
      const id = node.id.trim();
      return id ? [{ kind: "component", id }] : [];
    }
    if (node.kind === "folder" && typeof node.path === "string") {
      return [{
        kind: "folder",
        path: normalizeProjectComponentFolderPath(node.path),
        children: sanitizeNodes$1(Array.isArray(node.children) ? node.children : [])
      }];
    }
    return [];
  });
}
function mergeNodes(nodes, componentIdSet, usedComponentIds) {
  const merged = [];
  for (const node of nodes) {
    if (node.kind === "folder") {
      merged.push({
        kind: "folder",
        path: node.path,
        children: mergeNodes(node.children, componentIdSet, usedComponentIds)
      });
      continue;
    }
    if (!componentIdSet.has(node.id) || usedComponentIds.has(node.id)) continue;
    usedComponentIds.add(node.id);
    merged.push({ kind: "component", id: node.id });
  }
  return merged;
}
const COMPONENT_ROOT_TAG = "stacki-component-root";
const DEFAULT_SLOT_ELEMENT_TAG = "div";
function isComponentRootTag(tag) {
  return tag === COMPONENT_ROOT_TAG;
}
function isComponentRootElement(value) {
  return isComponentRootTag(value?.tag);
}
function sanitizeSlotElementMetadata(value) {
  if (!value || typeof value !== "object") return null;
  const slotId = typeof value.slotId === "string" ? value.slotId.trim() : "";
  const renderAsElement = typeof value.renderAsElement === "boolean" ? value.renderAsElement : false;
  return {
    ...slotId ? { slotId } : {},
    renderAsElement
  };
}
function isSlotElement(value) {
  return !!value?.slot;
}
function shouldRenderSlotAsElement(value) {
  return value?.slot?.renderAsElement === true;
}
function getSlotElementId(value) {
  const slotId = typeof value?.slot?.slotId === "string" ? value.slot.slotId.trim() : "";
  return slotId || null;
}
const COMPONENT_CLASS_PROP_ORDER_PREFIX = "__stacki_prop__:";
function normalizeClassToken(value) {
  return typeof value === "string" ? value.trim() : "";
}
function normalizeElementTagName(value) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed.replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2").replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
function normalizeClassList(value) {
  if (!Array.isArray(value)) return [];
  const result = [];
  value.forEach((entry) => {
    const normalized = normalizeClassToken(entry);
    if (!normalized || result.includes(normalized)) return;
    result.push(normalized);
  });
  return result;
}
function normalizeComponentClassOrderEntries(value) {
  if (!Array.isArray(value)) return [];
  const result = [];
  value.forEach((entry) => {
    if (typeof entry !== "string") return;
    const normalized = entry.trim();
    if (!normalized || result.includes(normalized)) return;
    result.push(normalized);
  });
  return result;
}
function splitClassValueTokens(value) {
  return value.split(/[,\s]+/).map((entry) => entry.trim()).filter(Boolean).filter((entry, index, entries) => entries.indexOf(entry) === index);
}
function normalizeComponentClassTokenList(value) {
  if (typeof value === "string") return splitClassValueTokens(value);
  if (!Array.isArray(value)) return [];
  const result = [];
  value.forEach((entry) => {
    if (typeof entry !== "string") return;
    splitClassValueTokens(entry).forEach((className) => {
      if (result.includes(className)) return;
      result.push(className);
    });
  });
  return result;
}
function buildComponentClassPropOrderEntry(propId) {
  const normalizedPropId = typeof propId === "string" ? propId.trim() : "";
  return normalizedPropId ? `${COMPONENT_CLASS_PROP_ORDER_PREFIX}${normalizedPropId}` : "";
}
function parseComponentClassPropOrderEntry(value) {
  const normalizedValue = typeof value === "string" ? value.trim() : "";
  if (!normalizedValue.startsWith(COMPONENT_CLASS_PROP_ORDER_PREFIX)) return null;
  const propId = normalizedValue.slice(COMPONENT_CLASS_PROP_ORDER_PREFIX.length).trim();
  return propId || null;
}
function getElementClassNamesInOrder(value) {
  const className = normalizeClassToken(value.className);
  const classes = normalizeClassList(value.classes);
  const canonical = className ? [className, ...classes.filter((entry) => entry !== className)] : classes;
  const preferredOrder = normalizeClassList(value.classOrder);
  if (preferredOrder.length === 0) return canonical;
  const allowedClasses = new Set(canonical);
  const orderedClasses = preferredOrder.filter((entry) => allowedClasses.has(entry));
  canonical.forEach((entry) => {
    if (orderedClasses.includes(entry)) return;
    orderedClasses.push(entry);
  });
  return orderedClasses;
}
function getElementSecondaryClassNamesInOrder(value) {
  const className = normalizeClassToken(value.className);
  const orderedClasses = getElementClassNamesInOrder(value);
  return className ? orderedClasses.filter((entry) => entry !== className) : orderedClasses;
}
function getElementClassOrderEntries(value) {
  const staticClasses = getElementClassNamesInOrder(value);
  const staticClassSet = new Set(staticClasses);
  const preferredEntries = normalizeComponentClassOrderEntries(value.componentClassOrder);
  if (preferredEntries.length === 0) return staticClasses;
  const orderedEntries = [];
  const usedStaticClasses = /* @__PURE__ */ new Set();
  const usedPropIds = /* @__PURE__ */ new Set();
  preferredEntries.forEach((entry) => {
    const propId = parseComponentClassPropOrderEntry(entry);
    if (propId) {
      if (usedPropIds.has(propId)) return;
      usedPropIds.add(propId);
      orderedEntries.push(buildComponentClassPropOrderEntry(propId));
      return;
    }
    if (!staticClassSet.has(entry) || usedStaticClasses.has(entry)) return;
    usedStaticClasses.add(entry);
    orderedEntries.push(entry);
  });
  staticClasses.forEach((className) => {
    if (usedStaticClasses.has(className)) return;
    usedStaticClasses.add(className);
    orderedEntries.push(className);
  });
  return orderedEntries;
}
function getElementRenderedClassNames(value) {
  const resolvedClasses = normalizeClassList(value.resolvedClassOrder);
  if (resolvedClasses.length > 0) return resolvedClasses;
  return getElementClassNamesInOrder(value);
}
function sanitizeComponentPropNamePart(value) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
function buildPropAttrName(prop) {
  const keyPart = sanitizeComponentPropNamePart(prop.key);
  if (!keyPart) return prop.id;
  if (prop.group) {
    const groupPart = sanitizeComponentPropNamePart(prop.group);
    return groupPart ? `${groupPart}-${keyPart}` : keyPart;
  }
  return keyPart;
}
function findPropByAttrName(props, attrName) {
  return props.find((p) => buildPropAttrName(p) === attrName);
}
const DEFAULT_COMPONENT_NUMBER_DECIMALS = 0;
const MAX_COMPONENT_NUMBER_DECIMALS = 20;
function normalizeComponentNumberValue(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}
function normalizeComponentNumberDecimals(value) {
  const normalizedValue = normalizeComponentNumberValue(value);
  if (normalizedValue === null) return DEFAULT_COMPONENT_NUMBER_DECIMALS;
  const integerValue = Math.trunc(normalizedValue);
  return Math.max(0, Math.min(MAX_COMPONENT_NUMBER_DECIMALS, integerValue));
}
function roundComponentNumberValue(value, decimals) {
  return Number(value.toFixed(normalizeComponentNumberDecimals(decimals)));
}
function getComponentNumberSettings(value) {
  if (value?.type !== "number") {
    return {
      min: null,
      max: null,
      decimals: DEFAULT_COMPONENT_NUMBER_DECIMALS
    };
  }
  const decimals = normalizeComponentNumberDecimals(value.decimals);
  const min = normalizeComponentNumberValue(value.min);
  const max = normalizeComponentNumberValue(value.max);
  const roundedMin = min === null ? null : roundComponentNumberValue(min, decimals);
  const roundedMax = max === null ? null : roundComponentNumberValue(max, decimals);
  if (roundedMin !== null && roundedMax !== null && roundedMin > roundedMax) {
    return {
      min: roundedMax,
      max: roundedMin,
      decimals
    };
  }
  return {
    min: roundedMin,
    max: roundedMax,
    decimals
  };
}
function normalizeComponentNumberPropValue(value, prop) {
  if (prop.type !== "number") return null;
  const settings = getComponentNumberSettings(prop);
  let normalizedValue = normalizeComponentNumberValue(value);
  if (normalizedValue === null && value !== prop.defaultValue) {
    normalizedValue = normalizeComponentNumberValue(prop.defaultValue);
  }
  if (normalizedValue === null) return null;
  normalizedValue = roundComponentNumberValue(normalizedValue, settings.decimals);
  if (settings.min !== null) normalizedValue = Math.max(normalizedValue, settings.min);
  if (settings.max !== null) normalizedValue = Math.min(normalizedValue, settings.max);
  return roundComponentNumberValue(normalizedValue, settings.decimals);
}
function getNormalizedComponentNumberPropDefinition(prop) {
  if (prop.type !== "number") return {};
  const settings = getComponentNumberSettings(prop);
  const normalizedDefaultValue = prop.defaultValue === void 0 ? void 0 : normalizeComponentNumberPropValue(prop.defaultValue, {
    type: "number",
    min: settings.min ?? void 0,
    max: settings.max ?? void 0,
    decimals: settings.decimals,
    defaultValue: prop.defaultValue
  }) ?? 0;
  return {
    ...settings.min !== null ? { min: settings.min } : {},
    ...settings.max !== null ? { max: settings.max } : {},
    ...settings.decimals > 0 ? { decimals: settings.decimals } : {},
    ...normalizedDefaultValue !== void 0 ? { defaultValue: normalizedDefaultValue } : {}
  };
}
function normalizeComponentLinkValue(value) {
  if (typeof value === "string") {
    return { href: value };
  }
  if (!value || typeof value !== "object") return null;
  const href = typeof value.href === "string" ? value.href : "";
  const rawTarget = typeof value.target === "string" ? value.target.trim() : "";
  const rawMode = typeof value.mode === "string" ? value.mode.trim() : "";
  const mode = rawMode === "external" || rawMode === "page" || rawMode === "section" || rawMode === "email" || rawMode === "phone" || rawMode === "file" ? rawMode : "";
  return {
    href,
    ...rawTarget ? { target: rawTarget } : {},
    ...mode ? { mode } : {}
  };
}
function normalizeComponentClassValue(value) {
  if (value === void 0 || value === null) return null;
  if (typeof value === "string" || Array.isArray(value)) {
    return {
      classes: normalizeComponentClassTokenList(value)
    };
  }
  if (!value || typeof value !== "object") return null;
  const record = value;
  if (!Object.prototype.hasOwnProperty.call(record, "classes")) return null;
  return {
    classes: normalizeComponentClassTokenList(record.classes)
  };
}
function serializeComponentClassValue(value) {
  return (normalizeComponentClassValue(value)?.classes || []).join(" ");
}
function normalizeComponentImageValue(value) {
  if (typeof value === "string") {
    return { src: value };
  }
  if (!value || typeof value !== "object") return null;
  const record = value;
  const hasKnownField = Object.prototype.hasOwnProperty.call(record, "src") || Object.prototype.hasOwnProperty.call(record, "mode");
  if (!hasKnownField) return null;
  const src = typeof record.src === "string" ? record.src : "";
  const rawMode = typeof record.mode === "string" ? record.mode.trim() : "";
  const mode = rawMode === "asset" || rawMode === "url" ? rawMode : "";
  return {
    src,
    ...mode ? { mode } : {}
  };
}
function normalizeComponentVideoValue(value) {
  return normalizeComponentImageValue(value);
}
function normalizeComponentTargetValue(value) {
  if (value === true) return "_blank";
  if (value === false) return "_self";
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (!normalized || normalized === "_self" || normalized === "self") return "_self";
  if (normalized === "_blank" || normalized === "blank") return "_blank";
  return null;
}
function normalizeComponentRenderValue(value) {
  if (value === "include" || value === "remove") return value;
  return null;
}
function sanitizeNullableStringRecord(value) {
  if (!value || typeof value !== "object") return {};
  return Object.fromEntries(
    Object.entries(value).flatMap(([key, entryValue]) => {
      if (typeof key !== "string") return [];
      if (typeof entryValue === "string") return [[key, entryValue]];
      if (entryValue === null) return [[key, null]];
      return [];
    })
  );
}
function sanitizeComponentVariantElementOverride(value) {
  if (!value || typeof value !== "object") return null;
  const record = value;
  const tag = typeof record.tag === "string" ? normalizeElementTagName(record.tag) || void 0 : void 0;
  const content = typeof record.content === "string" ? record.content : void 0;
  const renderMode = normalizeComponentRenderValue(record.renderMode);
  const attrs = sanitizeNullableStringRecord(record.attrs);
  const classAdditions = normalizeComponentClassTokenList(record.classAdditions);
  const classRemovals = normalizeComponentClassTokenList(record.classRemovals);
  if (!tag && content === void 0 && !renderMode && Object.keys(attrs).length === 0 && classAdditions.length === 0 && classRemovals.length === 0) {
    return null;
  }
  return {
    ...tag ? { tag } : {},
    ...content !== void 0 ? { content } : {},
    ...renderMode ? { renderMode } : {},
    ...Object.keys(attrs).length > 0 ? { attrs } : {},
    ...classAdditions.length > 0 ? { classAdditions } : {},
    ...classRemovals.length > 0 ? { classRemovals } : {}
  };
}
function sanitizeComponentVariantOptions(value) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((optionValue) => {
    if (!optionValue || typeof optionValue !== "object") return [];
    const optionRecord = optionValue;
    const id = typeof optionRecord.id === "string" ? optionRecord.id.trim() : "";
    const label = typeof optionRecord.label === "string" ? optionRecord.label.trim() : "";
    if (!id || !label) return [];
    const overrides = optionRecord.overrides && typeof optionRecord.overrides === "object" ? Object.fromEntries(
      Object.entries(optionRecord.overrides).flatMap(([elementId, overrideValue]) => {
        const override = sanitizeComponentVariantElementOverride(overrideValue);
        return elementId.trim() && override ? [[elementId.trim(), override]] : [];
      })
    ) : {};
    return [{
      id,
      label,
      ...Object.keys(overrides).length > 0 ? { overrides } : {}
    }];
  });
}
function getComponentVariantOptions(prop) {
  return prop.type === "variant" ? sanitizeComponentVariantOptions(prop.options) : [];
}
function findComponentVariantOption(prop, optionId) {
  const normalizedOptionId = typeof optionId === "string" ? optionId.trim() : "";
  if (!normalizedOptionId) return null;
  return getComponentVariantOptions(prop).find((option) => option.id === normalizedOptionId) || null;
}
function getComponentVariantBaseOptionId(prop) {
  const options = getComponentVariantOptions(prop);
  if (options.length === 0) return null;
  const baseOptionId = typeof prop.baseOptionId === "string" ? prop.baseOptionId.trim() : "";
  if (baseOptionId && options.some((option) => option.id === baseOptionId)) return baseOptionId;
  return options[0].id;
}
function getComponentVariantDefaultOptionId(prop) {
  if (prop.type !== "variant") return null;
  const normalizedDefaultValue = typeof prop.defaultValue === "string" ? prop.defaultValue.trim() : "";
  if (normalizedDefaultValue && findComponentVariantOption(prop, normalizedDefaultValue)) {
    return normalizedDefaultValue;
  }
  return getComponentVariantBaseOptionId(prop);
}
function sanitizeStringRecord(value) {
  if (!value || typeof value !== "object") return {};
  return Object.fromEntries(
    Object.entries(value).flatMap(([key, entryValue]) => typeof key === "string" && typeof entryValue === "string" ? [[key, entryValue]] : [])
  );
}
function sanitizeQueryStyles(value) {
  if (!value || typeof value !== "object") return {};
  return Object.fromEntries(
    Object.entries(value).flatMap(([queryId, entryValue]) => {
      const record = sanitizeStringRecord(entryValue);
      return Object.keys(record).length > 0 ? [[queryId, record]] : [];
    })
  );
}
function sanitizeComponentInstanceBinding(value) {
  if (!value || typeof value !== "object") return null;
  const componentId = typeof value.componentId === "string" ? value.componentId.trim() : "";
  if (!componentId) return null;
  const rawProps = value.props;
  const props = {};
  if (rawProps && typeof rawProps === "object") {
    Object.entries(rawProps).forEach(([key, propValue]) => {
      if (typeof propValue === "string" || typeof propValue === "number" || typeof propValue === "boolean" || propValue === null) {
        props[key] = propValue;
        return;
      }
      const isLinkValue = typeof propValue === "object" && propValue !== null && (Object.prototype.hasOwnProperty.call(propValue, "href") || Object.prototype.hasOwnProperty.call(propValue, "target"));
      if (isLinkValue) {
        const normalizedLinkValue = normalizeComponentLinkValue(propValue);
        if (normalizedLinkValue) {
          props[key] = normalizedLinkValue;
        }
        return;
      }
      const normalizedClassValue = normalizeComponentClassValue(propValue);
      if (normalizedClassValue) {
        props[key] = normalizedClassValue;
        return;
      }
      const normalizedImageValue = normalizeComponentImageValue(propValue);
      if (normalizedImageValue) {
        props[key] = normalizedImageValue;
      }
    });
  }
  const rawSlotContent = value.slotContent;
  const slotContent = {};
  if (rawSlotContent && typeof rawSlotContent === "object") {
    Object.entries(rawSlotContent).forEach(([slotId, entryValue]) => {
      const normalizedSlotId = typeof slotId === "string" ? slotId.trim() : "";
      if (!normalizedSlotId || !Array.isArray(entryValue)) return;
      const children = entryValue.map((childValue) => sanitizeSerializedEditorElement(childValue)).filter((child) => child !== null);
      if (children.length === 0) return;
      slotContent[normalizedSlotId] = children;
    });
  }
  return {
    componentId,
    props,
    ...Object.keys(slotContent).length > 0 ? { slotContent } : {}
  };
}
function sanitizeComponentAttributePropBinding(value) {
  if (!value || typeof value !== "object") return null;
  const namePropId = typeof value.namePropId === "string" ? value.namePropId.trim() : "";
  const valuePropId = typeof value.valuePropId === "string" ? value.valuePropId.trim() : "";
  if (!namePropId && !valuePropId) return null;
  return {
    ...namePropId ? { namePropId } : {},
    ...valuePropId ? { valuePropId } : {}
  };
}
function sanitizeComponentAttributePropBindingMap(value) {
  if (!value || typeof value !== "object") return {};
  return Object.fromEntries(
    Object.entries(value).flatMap(([key, entryValue]) => {
      const binding = sanitizeComponentAttributePropBinding(entryValue);
      if (!binding) return [];
      return [[key, binding]];
    })
  );
}
function sanitizeSerializedEditorElement(value) {
  if (!value || typeof value !== "object") return null;
  const record = value;
  const id = typeof record.id === "string" ? record.id : "";
  const tag = typeof record.tag === "string" ? record.tag : "";
  if (!id || !tag) return null;
  const className = typeof record.className === "string" ? record.className : "";
  const classOrder = getElementClassNamesInOrder({
    className,
    classes: record.classes,
    classOrder: record.classOrder
  });
  const componentClassOrder = getElementClassOrderEntries({
    className,
    classes: record.classes,
    classOrder,
    componentClassOrder: record.componentClassOrder
  });
  const resolvedClassOrder = normalizeClassList(record.resolvedClassOrder);
  const classes = getElementSecondaryClassNamesInOrder({
    className,
    classes: record.classes,
    classOrder
  });
  const children = Array.isArray(record.children) ? record.children.map((child) => sanitizeSerializedEditorElement(child)).filter((child) => child !== null) : [];
  const slot = sanitizeSlotElementMetadata(record.slot);
  return {
    id,
    tag,
    label: typeof record.label === "string" ? record.label : tag,
    className,
    classes,
    ...classOrder.length > 0 ? { classOrder } : {},
    styles: sanitizeStringRecord(record.styles),
    queryStyles: sanitizeQueryStyles(record.queryStyles),
    mediaStyles: {
      tablet: sanitizeStringRecord(record.mediaStyles?.tablet),
      mobileLandscape: sanitizeStringRecord(record.mediaStyles?.mobileLandscape),
      mobilePortrait: sanitizeStringRecord(record.mediaStyles?.mobilePortrait)
    },
    attrs: sanitizeStringRecord(record.attrs),
    children,
    ...typeof record.content === "string" ? { content: record.content } : {},
    ...typeof record.placeholder === "string" ? { placeholder: record.placeholder } : {},
    ...componentClassOrder.some((entry) => parseComponentClassPropOrderEntry(entry) !== null) ? { componentClassOrder } : {},
    ...resolvedClassOrder.length > 0 ? { resolvedClassOrder } : {},
    ...typeof record.componentTagPropId === "string" && record.componentTagPropId.trim() ? { componentTagPropId: record.componentTagPropId.trim() } : record.componentTagPropId === null ? { componentTagPropId: null } : {},
    ...typeof record.componentTextPropId === "string" && record.componentTextPropId.trim() ? { componentTextPropId: record.componentTextPropId.trim() } : record.componentTextPropId === null ? { componentTextPropId: null } : {},
    ...typeof record.componentRenderPropId === "string" && record.componentRenderPropId.trim() ? { componentRenderPropId: record.componentRenderPropId.trim() } : record.componentRenderPropId === null ? { componentRenderPropId: null } : {},
    ...record.componentAttributeBindings !== void 0 ? (() => {
      const componentAttributeBindings = sanitizeComponentAttributePropBindingMap(record.componentAttributeBindings);
      return Object.keys(componentAttributeBindings).length > 0 ? { componentAttributeBindings } : {};
    })() : {},
    ...record.componentInstance !== void 0 ? { componentInstance: sanitizeComponentInstanceBinding(record.componentInstance) } : {},
    ...record.componentRootRenderMode === "remove" ? { componentRootRenderMode: "remove" } : {},
    ...record.renderMode === "remove" ? { renderMode: "remove" } : {},
    ...slot ? { slot } : {}
  };
}
function sanitizeProjectPageDocuments(value) {
  if (!value || typeof value !== "object") return {};
  const entries = Object.entries(value).flatMap(([path2, documentValue]) => {
    if (!documentValue || typeof documentValue !== "object") return [];
    const docRecord = documentValue;
    const normalizedPath = typeof docRecord.path === "string" && docRecord.path.trim() ? docRecord.path.trim() : path2.trim();
    const root = sanitizeSerializedEditorElement(docRecord.root);
    if (!normalizedPath || !root) return [];
    return [[
      normalizedPath,
      {
        path: normalizedPath,
        root,
        renderedHtml: typeof docRecord.renderedHtml === "string" ? docRecord.renderedHtml : ""
      }
    ]];
  });
  return Object.fromEntries(entries);
}
function sanitizeProjectComponents(value) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const record = entry;
    const id = typeof record.id === "string" ? record.id.trim() : "";
    const name = typeof record.name === "string" ? record.name.trim() : "";
    const root = sanitizeSerializedEditorElement(record.root);
    if (!id || !name || !root) return [];
    const props = Array.isArray(record.props) ? record.props.flatMap((prop) => {
      if (!prop || typeof prop !== "object") return [];
      const propRecord = prop;
      const propId = typeof propRecord.id === "string" ? propRecord.id.trim() : "";
      const key = typeof propRecord.key === "string" ? propRecord.key.trim() : "";
      const type = propRecord.type;
      if (!propId || !key || type !== "boolean" && type !== "number" && type !== "text" && type !== "link" && type !== "image" && type !== "video" && type !== "target" && type !== "render" && type !== "class" && type !== "variant") {
        return [];
      }
      const group = typeof propRecord.group === "string" && propRecord.group.trim() ? propRecord.group.trim() : void 0;
      const tooltip = typeof propRecord.tooltip === "string" && propRecord.tooltip.trim() ? propRecord.tooltip.trim() : void 0;
      const multiline = type === "text" && typeof propRecord.multiline === "boolean" ? propRecord.multiline : void 0;
      const numberPropDefinition = type === "number" ? getNormalizedComponentNumberPropDefinition({
        type,
        min: propRecord.min,
        max: propRecord.max,
        decimals: propRecord.decimals,
        defaultValue: propRecord.defaultValue
      }) : null;
      const options = type === "variant" ? sanitizeComponentVariantOptions(propRecord.options) : [];
      if (type === "variant" && options.length === 0) return [];
      const normalizedBaseOptionId = type === "variant" ? getComponentVariantBaseOptionId({
        type,
        options,
        baseOptionId: typeof propRecord.baseOptionId === "string" ? propRecord.baseOptionId : void 0
      }) : null;
      const defaultValue = propRecord.defaultValue;
      const normalizedDefaultValue = (() => {
        if (type === "variant") {
          if (!normalizedBaseOptionId) return void 0;
          return getComponentVariantDefaultOptionId({
            type,
            options,
            baseOptionId: normalizedBaseOptionId,
            defaultValue
          }) || void 0;
        }
        if (type === "render") {
          return normalizeComponentRenderValue(defaultValue) || void 0;
        }
        if (type === "target") {
          return normalizeComponentTargetValue(defaultValue) || void 0;
        }
        if (type === "class") {
          return normalizeComponentClassValue(defaultValue) || void 0;
        }
        if (type === "number") {
          return numberPropDefinition?.defaultValue;
        }
        if (typeof defaultValue === "string" || typeof defaultValue === "number" || typeof defaultValue === "boolean" || defaultValue === null) {
          return type === "link" ? normalizeComponentLinkValue(defaultValue) : type === "image" ? normalizeComponentImageValue(defaultValue) : type === "video" ? normalizeComponentVideoValue(defaultValue) : defaultValue;
        }
        if (type === "link") {
          return normalizeComponentLinkValue(defaultValue);
        }
        if (type === "image") {
          return normalizeComponentImageValue(defaultValue);
        }
        if (type === "video") {
          return normalizeComponentVideoValue(defaultValue);
        }
        if (type === "class") {
          return normalizeComponentClassValue(defaultValue);
        }
        return void 0;
      })();
      return [{
        id: propId,
        key,
        type,
        ...group ? { group } : {},
        ...tooltip ? { tooltip } : {},
        ...multiline !== void 0 ? { multiline } : {},
        ...type === "number" && numberPropDefinition ? numberPropDefinition : {},
        ...type === "variant" ? {
          options,
          ...normalizedBaseOptionId ? { baseOptionId: normalizedBaseOptionId } : {}
        } : {},
        ...type !== "number" && normalizedDefaultValue !== void 0 ? { defaultValue: normalizedDefaultValue } : {}
      }];
    }) : [];
    const propGroups = Array.isArray(record.propGroups) ? [...new Set(
      record.propGroups.filter((g) => typeof g === "string" && g.trim().length > 0).map((g) => g.trim())
    )] : void 0;
    return [{
      id,
      name,
      root,
      props,
      ...propGroups && propGroups.length > 0 ? { propGroups } : {}
    }];
  });
}
function listToArray(list) {
  const items = [];
  if (!list) return items;
  if (typeof list.forEach === "function") {
    list.forEach((item) => items.push(item));
    return items;
  }
  let current = list.head;
  while (current) {
    items.push(current.data);
    current = current.next;
  }
  return items;
}
function safeGenerate(node) {
  try {
    return csstree__namespace.generate(node).trim();
  } catch {
    return "";
  }
}
function getAtRuleKey(atRuleChain) {
  if (atRuleChain.length === 0) return null;
  return atRuleChain.join(" || ");
}
function buildProjectVariableKey(context, selector, name, atRuleKey, declarationIndex) {
  return JSON.stringify([
    context.sourceKind,
    context.fileRelativePath,
    context.inlineStyleIndex,
    atRuleKey,
    selector,
    name,
    declarationIndex
  ]);
}
function extractInlineStyleBlocks(html) {
  const blocks = [];
  const styleRe = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
  let match;
  let index = 0;
  while ((match = styleRe.exec(html)) !== null) {
    blocks.push({ css: match[1], index });
    index += 1;
  }
  return blocks;
}
function collectProjectVariables(files) {
  const definitions = [];
  for (const file of files) {
    if (typeof file.content !== "string") continue;
    if (file.type === "css") {
      definitions.push(...collectProjectVariablesFromCssText(file.content, {
        filePath: file.path || null,
        fileRelativePath: file.relativePath,
        sourceKind: "css",
        inlineStyleIndex: null
      }));
      continue;
    }
    if (file.type !== "html") continue;
    const styleBlocks = extractInlineStyleBlocks(file.content);
    styleBlocks.forEach((styleBlock) => {
      definitions.push(...collectProjectVariablesFromCssText(styleBlock.css, {
        filePath: file.path || null,
        fileRelativePath: file.relativePath,
        sourceKind: "html-inline",
        inlineStyleIndex: styleBlock.index
      }));
    });
  }
  return definitions.sort((left, right) => left.name.localeCompare(right.name) || left.fileRelativePath.localeCompare(right.fileRelativePath) || left.selector.localeCompare(right.selector) || (left.inlineStyleIndex ?? -1) - (right.inlineStyleIndex ?? -1) || left.declarationIndex - right.declarationIndex);
}
function isRootVariableSelector(selector) {
  return selector.split(",").map((part) => part.trim().toLowerCase()).some((part) => {
    if (!part) return false;
    if (/[>+~\s]/.test(part)) return false;
    return part.includes(":root") || part.startsWith("html");
  });
}
function collectRootProjectVariables(files) {
  return collectProjectVariables(files).filter((definition) => isRootVariableSelector(definition.selector));
}
function collectRootProjectVariableInfos(files) {
  return collectRootProjectVariables(files).map((definition) => ({
    key: definition.key,
    name: definition.name,
    selector: definition.selector,
    fileRelativePath: definition.fileRelativePath,
    sourceKind: definition.sourceKind,
    inlineStyleIndex: definition.inlineStyleIndex,
    atRuleKey: definition.atRuleKey
  }));
}
function collectProjectVariablesFromCssText(css, context) {
  let ast;
  try {
    ast = csstree__namespace.parse(css);
  } catch {
    return [];
  }
  const definitions = [];
  const visitList = (list, atRuleChain) => {
    for (const node of listToArray(list)) {
      if (node.type === "Rule") {
        visitRule(node, atRuleChain);
        continue;
      }
      if (node.type === "Atrule") {
        visitAtRule(node, atRuleChain);
      }
    }
  };
  const visitRule = (node, atRuleChain) => {
    const selector = safeGenerate(node.prelude);
    if (!selector) return;
    const declarationCounts = /* @__PURE__ */ new Map();
    for (const child of listToArray(node.block?.children)) {
      if (child.type === "Declaration" && typeof child.property === "string" && child.property.startsWith("--")) {
        const value = safeGenerate(child.value);
        const atRuleKey = getAtRuleKey(atRuleChain);
        const countKey = JSON.stringify([selector, atRuleKey, child.property]);
        const declarationIndex = declarationCounts.get(countKey) ?? 0;
        declarationCounts.set(countKey, declarationIndex + 1);
        definitions.push({
          key: buildProjectVariableKey(context, selector, child.property, atRuleKey, declarationIndex),
          name: child.property,
          value,
          selector,
          filePath: context.filePath,
          fileRelativePath: context.fileRelativePath,
          sourceKind: context.sourceKind,
          inlineStyleIndex: context.inlineStyleIndex,
          atRuleChain: [...atRuleChain],
          atRuleKey,
          declarationIndex
        });
        continue;
      }
      if (child.type === "Rule") {
        visitRule(child, atRuleChain);
        continue;
      }
      if (child.type === "Atrule") {
        visitAtRule(child, atRuleChain);
      }
    }
  };
  const visitAtRule = (node, atRuleChain) => {
    if (!node.block?.children) return;
    const prelude = safeGenerate(node.prelude);
    const label = prelude ? `@${node.name} ${prelude}` : `@${node.name}`;
    visitList(node.block.children, [...atRuleChain, label]);
  };
  visitList(ast.children, []);
  return definitions;
}
function sanitizeProjectContentVariables(value) {
  if (!Array.isArray(value)) return [];
  const result = [];
  const seenIds = /* @__PURE__ */ new Set();
  value.forEach((entry) => {
    if (!entry || typeof entry !== "object") return;
    const id = typeof entry.id === "string" ? entry.id.trim() : "";
    const name = typeof entry.name === "string" ? entry.name.trim() : "";
    const rawValue = entry.value;
    if (!id || !name || seenIds.has(id)) return;
    seenIds.add(id);
    result.push({
      id,
      name,
      value: typeof rawValue === "string" ? rawValue : ""
    });
  });
  return result;
}
const VARIABLE_SOURCE_KINDS = /* @__PURE__ */ new Set(["css", "html-inline"]);
function buildProjectVariableNode(info) {
  return {
    kind: "variable",
    key: info.key,
    name: info.name,
    selector: info.selector,
    fileRelativePath: info.fileRelativePath,
    sourceKind: info.sourceKind,
    inlineStyleIndex: info.inlineStyleIndex,
    atRuleKey: info.atRuleKey
  };
}
function parseProjectVariableStructure(text) {
  try {
    const parsed = JSON.parse(text);
    if (!parsed || !Array.isArray(parsed.nodes)) return null;
    return sanitizeNodes(parsed.nodes);
  } catch {
    return null;
  }
}
function mergeProjectVariableStructure(variables, savedNodes) {
  const sanitizedSavedNodes = sanitizeNodes(savedNodes || []);
  const availableByKey = new Map(variables.map((variable) => [variable.key, variable]));
  const usedKeys = /* @__PURE__ */ new Set();
  const takeMatch = (node) => {
    const exact = availableByKey.get(node.key);
    if (exact && !usedKeys.has(exact.key)) {
      usedKeys.add(exact.key);
      return exact;
    }
    const strongSignature = getStrongMatchSignature(node);
    const strongMatches = variables.filter((variable) => !usedKeys.has(variable.key) && getStrongMatchSignature(variable) === strongSignature);
    if (strongMatches.length === 1) {
      usedKeys.add(strongMatches[0].key);
      return strongMatches[0];
    }
    const looseSignature = getLooseMatchSignature(node);
    const looseMatches = variables.filter((variable) => !usedKeys.has(variable.key) && getLooseMatchSignature(variable) === looseSignature);
    if (looseMatches.length === 1) {
      usedKeys.add(looseMatches[0].key);
      return looseMatches[0];
    }
    return null;
  };
  const mergeNodes2 = (nodes2) => nodes2.flatMap((node) => {
    if (node.kind === "group") {
      return [{
        ...node,
        children: mergeNodes2(node.children)
      }];
    }
    const match = takeMatch(node);
    return match ? [buildProjectVariableNode(match)] : [];
  });
  const mergedNodes = mergeNodes2(sanitizedSavedNodes);
  const remainingVariables = variables.filter((variable) => !usedKeys.has(variable.key)).sort(compareVariableItems).map(buildProjectVariableNode);
  const nodes = [...mergedNodes, ...remainingVariables];
  const changed = JSON.stringify(sanitizedSavedNodes) !== JSON.stringify(nodes);
  return { nodes, changed };
}
function sanitizeNodes(nodes) {
  return nodes.flatMap((node) => {
    if (!node || typeof node !== "object") return [];
    if (node.kind === "group") {
      if (typeof node.id !== "string" || typeof node.name !== "string") return [];
      return [{
        kind: "group",
        id: node.id,
        name: node.name,
        children: sanitizeNodes(Array.isArray(node.children) ? node.children : [])
      }];
    }
    if (node.kind === "variable" && typeof node.key === "string" && typeof node.name === "string" && typeof node.selector === "string" && typeof node.fileRelativePath === "string" && VARIABLE_SOURCE_KINDS.has(node.sourceKind)) {
      return [{
        kind: "variable",
        key: node.key,
        name: node.name,
        selector: node.selector,
        fileRelativePath: node.fileRelativePath,
        sourceKind: node.sourceKind,
        inlineStyleIndex: typeof node.inlineStyleIndex === "number" ? node.inlineStyleIndex : null,
        atRuleKey: typeof node.atRuleKey === "string" ? node.atRuleKey : null
      }];
    }
    return [];
  });
}
function getStrongMatchSignature(info) {
  return JSON.stringify([
    info.sourceKind,
    info.fileRelativePath,
    info.inlineStyleIndex,
    info.atRuleKey,
    info.selector,
    info.name
  ]);
}
function getLooseMatchSignature(info) {
  return JSON.stringify([
    info.sourceKind,
    info.inlineStyleIndex,
    info.atRuleKey,
    info.selector,
    info.name
  ]);
}
function compareVariableItems(left, right) {
  return left.name.localeCompare(right.name) || left.fileRelativePath.localeCompare(right.fileRelativePath) || left.selector.localeCompare(right.selector) || (left.inlineStyleIndex ?? -1) - (right.inlineStyleIndex ?? -1);
}
function parseProjectMetadata(text) {
  try {
    const parsed = JSON.parse(text);
    if (!parsed || !Array.isArray(parsed.pages) || !Array.isArray(parsed.assets)) return null;
    const pages = parseProjectPageStructure(JSON.stringify({ version: 1, nodes: parsed.pages }));
    const assets = parseProjectAssetStructure(JSON.stringify({ version: 1, nodes: parsed.assets }));
    const variables = parseProjectVariableStructure(JSON.stringify({ version: 1, nodes: Array.isArray(parsed.variables) ? parsed.variables : [] }));
    const contentStructure = parseProjectContentStructure(JSON.stringify({ version: 1, nodes: Array.isArray(parsed.contentStructure) ? parsed.contentStructure : [] }));
    const componentStructure = parseProjectComponentStructure(JSON.stringify({ version: 1, nodes: Array.isArray(parsed.componentStructure) ? parsed.componentStructure : [] }));
    if (!pages || !assets || !variables || !contentStructure || !componentStructure) return null;
    return {
      pages,
      assets,
      variables,
      content: sanitizeProjectContentVariables(parsed.content),
      contentStructure,
      components: sanitizeProjectComponents(parsed.components),
      componentStructure,
      pageDocuments: sanitizeProjectPageDocuments(parsed.pageDocuments)
    };
  } catch {
    return null;
  }
}
function stringifyProjectMetadata(pages, assets, variables, content, contentStructure, components, componentStructure, pageDocuments) {
  return `${JSON.stringify({ version: 4, pages, assets, variables, content, contentStructure, components, componentStructure, pageDocuments }, null, 2)}
`;
}
function extractComponentExport(source) {
  const match = source.match(/export\s+const\s+component\s*=\s*(\{)/);
  if (!match || match.index === void 0) return null;
  const startIndex = match.index + match[0].length - 1;
  const json = extractBalancedBraces(source, startIndex);
  if (!json) return null;
  try {
    const normalized = normalizeJsObjectToJson(json);
    return JSON.parse(normalized);
  } catch {
    return null;
  }
}
function extractTemplateExport(source) {
  const match = source.match(/export\s+const\s+template\s*=\s*`/);
  if (!match || match.index === void 0) return null;
  const startIndex = match.index + match[0].length;
  let i = startIndex;
  let result = "";
  while (i < source.length) {
    if (source[i] === "\\" && i + 1 < source.length) {
      const next = source[i + 1];
      if (next === "`") {
        result += "`";
        i += 2;
      } else if (next === "\\") {
        result += "\\";
        i += 2;
      } else if (next === "$") {
        result += "$";
        i += 2;
      } else {
        result += source[i] + source[i + 1];
        i += 2;
      }
    } else if (source[i] === "`") {
      return result.trim();
    } else {
      result += source[i];
      i++;
    }
  }
  return null;
}
function extractPageImports(source) {
  const imports = [];
  const importRegex = /import\s+(\w+)\s+from\s+['"]([^'"]+)['"]/g;
  let match;
  while ((match = importRegex.exec(source)) !== null) {
    imports.push({ name: match[1], path: match[2] });
  }
  return imports;
}
function parseComponentJsFile(source) {
  const componentObj = extractComponentExport(source);
  const template = extractTemplateExport(source);
  if (!componentObj || template === null) return null;
  return { component: componentObj, template };
}
function parsePageJsFile(source) {
  const template = extractTemplateExport(source);
  if (template === null) return null;
  return { imports: extractPageImports(source), template };
}
function serializeComponentMetadata(metadata) {
  return JSON.stringify(metadata, null, 2);
}
function buildComponentJsFile(metadata, templateHtml) {
  const metadataStr = serializeComponentMetadata(metadata);
  return `export const component = ${metadataStr}

export const template = \`
${escapeTemplateLiteral(templateHtml)}
\`
`;
}
function buildPageJsFile(usedComponents, templateHtml) {
  const importLines = usedComponents.map((entry) => {
    if (typeof entry === "string") return `import ${entry} from './components/${entry}.component.js'`;
    return `import ${entry.tagName} from './components/${entry.fileName}.component.js'`;
  }).join("\n");
  const importBlock = importLines ? `${importLines}

` : "";
  return `${importBlock}export const template = \`
${escapeTemplateLiteral(templateHtml)}
\`
`;
}
function extractBalancedBraces(source, startIndex) {
  let depth = 0;
  let inString = null;
  let escaped = false;
  for (let i = startIndex; i < source.length; i++) {
    const char = source[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === "\\") {
      escaped = true;
      continue;
    }
    if (inString) {
      if (char === inString) inString = null;
      continue;
    }
    if (char === '"' || char === "'") {
      inString = char;
      continue;
    }
    if (char === "{") depth++;
    else if (char === "}") {
      depth--;
      if (depth === 0) return source.slice(startIndex, i + 1);
    }
  }
  return null;
}
function normalizeJsObjectToJson(jsObj) {
  let result = jsObj.replace(/,\s*([\]}])/g, "$1");
  result = result.replace(
    /(?<=(?:^|[{,])\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/gm,
    '"$1":'
  );
  return result;
}
function escapeTemplateLiteral(str) {
  return str.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
}
const PROJECT_METADATA_EXTENSION$1 = ".stacki";
const LEGACY_PROJECT_ASSET_METADATA_FILE = "stacki.assets.json";
const DEFAULT_PROJECT_PAGE_FILE = "index.page.js";
const DEFAULT_PROJECT_STYLESHEET_FILE = "styles.css";
const DEFAULT_PROJECT_SCRIPT_FILE = "script.js";
const SOURCE_DIR = "source";
const PUBLIC_DIR = "public";
const SOURCE_COMPONENTS_DIR = "components";
const STACKI_SLOT_TAG = "stacki-slot";
const STACKI_SLOT_FILL_TAG = "stacki-slot-fill";
const STACKI_SLOT_LABEL_ATTR = "slot-label";
const STACKI_SLOT_RENDER_ATTR = "render-as-element";
const STACKI_SLOT_TAG_ATTR = "slot-tag";
const STACKI_SLOT_ID_ATTR = "slot-id";
const PARSE_HTML_OPTIONS = {
  comment: true,
  lowerCaseTagName: false,
  blockTextElements: { script: true, noscript: true, style: true, pre: true }
};
function isPascalCaseTag(tagName) {
  return tagName.length > 0 && tagName[0] >= "A" && tagName[0] <= "Z";
}
function toPascalCase(name) {
  return name.replace(/[-_\s]+(.)/g, (_, char) => char.toUpperCase()).replace(/^(.)/, (_, char) => char.toUpperCase());
}
const PROJECT_WATCH_MUTATION_IGNORE_MS = 2e3;
const mutedProjectFolders = /* @__PURE__ */ new Map();
const projectMetadataIconMtims = /* @__PURE__ */ new Map();
const PAGE_EXTENSIONS = /* @__PURE__ */ new Set([".html", ".htm"]);
const STYLESHEET_EXTENSIONS = /* @__PURE__ */ new Set([".css"]);
const SCRIPT_EXTENSIONS = /* @__PURE__ */ new Set([".js", ".mjs", ".cjs"]);
const IMAGE_EXTENSIONS = /* @__PURE__ */ new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif", ".bmp", ".ico", ".svg", ".tif", ".tiff"]);
const VIDEO_EXTENSIONS = /* @__PURE__ */ new Set([".mp4", ".webm", ".ogg", ".mov", ".m4v", ".avi", ".mkv"]);
const AUDIO_EXTENSIONS = /* @__PURE__ */ new Set([".mp3", ".wav", ".aac", ".flac", ".m4a", ".oga", ".ogg"]);
const FONT_EXTENSIONS = /* @__PURE__ */ new Set([".woff", ".woff2", ".ttf", ".otf", ".eot"]);
const DOCUMENT_EXTENSIONS = /* @__PURE__ */ new Set([
  ".pdf",
  ".txt",
  ".md",
  ".rtf",
  ".csv",
  ".tsv",
  ".json",
  ".xml",
  ".yml",
  ".yaml",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
  ".zip"
]);
const TEXT_DOCUMENT_EXTENSIONS = /* @__PURE__ */ new Set([
  ".txt",
  ".md",
  ".rtf",
  ".csv",
  ".tsv",
  ".json",
  ".xml",
  ".yml",
  ".yaml"
]);
const DIRECT_CONTENT_TAGS = /* @__PURE__ */ new Set([
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "p",
  "span",
  "a",
  "button",
  "label",
  "li",
  "blockquote",
  "summary",
  "code",
  "pre",
  "style",
  "script",
  "noscript",
  "address",
  "strong",
  "em",
  "small",
  "mark",
  "del",
  "ins",
  "sub",
  "sup",
  "time",
  "abbr",
  "cite",
  "q",
  "kbd",
  "samp",
  "var",
  "b",
  "i",
  "u",
  "s",
  "dfn",
  "data",
  "bdi",
  "bdo",
  "ruby",
  "rt",
  "rp",
  "figcaption",
  "legend",
  "option",
  "output",
  "progress",
  "meter",
  "dt",
  "dd",
  "caption",
  "th",
  "td",
  "textarea"
]);
const WHITESPACE_PRESERVING_TEXT_TAGS = /* @__PURE__ */ new Set(["pre", "textarea", "script", "style"]);
function isPageJsFile(fileName) {
  return fileName.endsWith(".page.js");
}
function isComponentJsFile(fileName) {
  return fileName.endsWith(".component.js");
}
function classifyProjectFileType(fileName) {
  if (isPageJsFile(fileName)) return "html";
  const ext = path.extname(fileName).toLowerCase();
  if (PAGE_EXTENSIONS.has(ext)) return "html";
  if (STYLESHEET_EXTENSIONS.has(ext)) return "css";
  if (SCRIPT_EXTENSIONS.has(ext)) return "js";
  if (IMAGE_EXTENSIONS.has(ext)) return "image";
  if (VIDEO_EXTENSIONS.has(ext)) return "video";
  if (AUDIO_EXTENSIONS.has(ext)) return "audio";
  if (FONT_EXTENSIONS.has(ext)) return "font";
  if (DOCUMENT_EXTENSIONS.has(ext)) return "document";
  return "other";
}
function isProjectMetadataFileName(fileName) {
  return !fileName.startsWith(".") && fileName.endsWith(PROJECT_METADATA_EXTENSION$1);
}
function findProjectMetadataPath(folderPath) {
  const preferredPath = path.join(folderPath, `${path.basename(folderPath).trim() || "Project"}${PROJECT_METADATA_EXTENSION$1}`);
  if (fs.existsSync(preferredPath)) return preferredPath;
  const discoveredPath = fs.readdirSync(folderPath, { withFileTypes: true }).filter((entry) => entry.isFile() && isProjectMetadataFileName(entry.name)).map((entry) => path.join(folderPath, entry.name)).sort((left, right) => left.localeCompare(right))[0];
  return discoveredPath || null;
}
function normalizeFilesystemPath(filePath) {
  const normalized = path.resolve(filePath).replace(/\\+/g, "/");
  return normalized.length > 1 ? normalized.replace(/\/+$/, "") : normalized;
}
function findOwningProjectFolder(pathLike) {
  let current = normalizeFilesystemPath(
    fs.existsSync(pathLike) && fs.statSync(pathLike).isDirectory() ? pathLike : path.dirname(pathLike)
  );
  while (true) {
    if (findProjectMetadataPath(current)) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}
function markProjectFolderMutation(pathLike) {
  const projectFolder = findOwningProjectFolder(pathLike);
  if (!projectFolder) return;
  mutedProjectFolders.set(
    projectFolder,
    Date.now() + PROJECT_WATCH_MUTATION_IGNORE_MS
  );
}
function isProjectFolderMuted(folderPath) {
  const normalizedFolderPath = normalizeFilesystemPath(folderPath);
  const mutedUntil = mutedProjectFolders.get(normalizedFolderPath);
  if (!mutedUntil) return false;
  if (mutedUntil <= Date.now()) {
    mutedProjectFolders.delete(normalizedFolderPath);
    return false;
  }
  return true;
}
function hasTextProjectFileContent(fileName, type) {
  const extension = path.extname(fileName).toLowerCase();
  if (type === "html" || type === "css" || type === "js") return true;
  if (type === "document" && TEXT_DOCUMENT_EXTENSIONS.has(extension)) return true;
  if (type === "image" && extension === ".svg") return true;
  return false;
}
function isEditableSourceFileType(type) {
  return type === "html" || type === "css" || type === "js";
}
function migrateSourceFileIfNeeded(fullPath, fileName) {
  const ext = path.extname(fileName).toLowerCase();
  if (ext !== ".html" && ext !== ".htm") return { path: fullPath, name: fileName };
  const jsName = fileName.replace(/\.html?$/i, ".page.js");
  const jsPath = path.join(path.dirname(fullPath), jsName);
  if (fs.existsSync(jsPath)) return { path: jsPath, name: jsName };
  const htmlContent = fs.readFileSync(fullPath, "utf-8");
  const pageJs = buildPageJsFile([], htmlContent.trim());
  markProjectFolderMutation(jsPath);
  fs.writeFileSync(jsPath, pageJs, "utf-8");
  markProjectFolderMutation(fullPath);
  fs.rmSync(fullPath, { force: true });
  return { path: jsPath, name: jsName };
}
function walkProjectFiles(dirPath, rootPath, acc, migrateHtml = false) {
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    if (isProjectMetadataFileName(entry.name) || entry.name === LEGACY_PROJECT_ASSET_METADATA_FILE) continue;
    if (entry.name.startsWith(".")) continue;
    if (isComponentJsFile(entry.name)) continue;
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      walkProjectFiles(fullPath, rootPath, acc, migrateHtml);
      continue;
    }
    const resolved = migrateHtml ? migrateSourceFileIfNeeded(fullPath, entry.name) : { path: fullPath, name: entry.name };
    const type = classifyProjectFileType(resolved.name);
    acc.push({
      path: resolved.path,
      relativePath: path.relative(rootPath, resolved.path),
      type,
      ...hasTextProjectFileContent(resolved.name, type) ? { content: fs.readFileSync(resolved.path, "utf-8") } : {}
    });
  }
}
function syncPublicFilesToSource(folderPath, options = {}) {
  const publicDir = path.join(folderPath, PUBLIC_DIR);
  const sourceDir = path.join(folderPath, SOURCE_DIR);
  if (!fs.existsSync(publicDir) || !fs.statSync(publicDir).isDirectory()) return false;
  if (!fs.existsSync(sourceDir) || !fs.statSync(sourceDir).isDirectory()) return false;
  const { includeEditableFiles = false, overwriteExisting = false } = options;
  let changed = false;
  const walk = (currentPublicDir, currentRelativeDir) => {
    const sourceTargetDir = currentRelativeDir ? path.join(sourceDir, currentRelativeDir) : sourceDir;
    if (!fs.existsSync(sourceTargetDir)) {
      markProjectFolderMutation(sourceTargetDir);
      fs.mkdirSync(sourceTargetDir, { recursive: true });
      changed = true;
    }
    for (const entry of fs.readdirSync(currentPublicDir, { withFileTypes: true })) {
      if (entry.name.startsWith(".")) continue;
      if (isProjectMetadataFileName(entry.name) || entry.name === LEGACY_PROJECT_ASSET_METADATA_FILE) continue;
      const publicPath = path.join(currentPublicDir, entry.name);
      const relativePath = currentRelativeDir ? path.join(currentRelativeDir, entry.name) : entry.name;
      const sourcePath = path.join(sourceDir, relativePath);
      if (entry.isDirectory()) {
        walk(publicPath, relativePath);
        continue;
      }
      const type = classifyProjectFileType(entry.name);
      if (!includeEditableFiles && isEditableSourceFileType(type)) continue;
      if (!overwriteExisting && fs.existsSync(sourcePath)) continue;
      markProjectFolderMutation(sourcePath);
      fs.mkdirSync(path.dirname(sourcePath), { recursive: true });
      fs.copyFileSync(publicPath, sourcePath);
      changed = true;
    }
  };
  walk(publicDir, "");
  return changed;
}
function chooseEntryHtmlFile(files, folderPath) {
  const htmlFiles = files.filter((file) => file.type === "html").sort((left, right) => left.relativePath.localeCompare(right.relativePath));
  if (htmlFiles.length === 0) return null;
  const exactIndexJs = htmlFiles.find((file) => /(^|\/)index\.page\.js$/i.test(file.relativePath));
  if (exactIndexJs) return exactIndexJs;
  const exactIndex = htmlFiles.find((file) => /(^|\/)index\.html?$/i.test(file.relativePath));
  if (exactIndex) return exactIndex;
  const rootLevel = htmlFiles.find((file) => path.dirname(file.path) === folderPath);
  return rootLevel || htmlFiles[0];
}
function getProjectMetadataPath(folderPath) {
  return findProjectMetadataPath(folderPath) || path.join(folderPath, `${path.basename(folderPath).trim() || "Project"}${PROJECT_METADATA_EXTENSION$1}`);
}
function resolveProjectFolderPath(pathLike) {
  const normalizedPath = path.resolve(pathLike);
  if (!fs.existsSync(normalizedPath)) return null;
  const stats = fs.statSync(normalizedPath);
  if (stats.isDirectory()) {
    return normalizedPath;
  }
  return isProjectMetadataFileName(path.basename(normalizedPath)) ? path.dirname(normalizedPath) : null;
}
function getProjectMetadataIconSource() {
  if (process.platform !== "darwin") return null;
  const developmentIconPath = path.resolve(__dirname, "../../resources/icon.png");
  if (fs.existsSync(developmentIconPath)) {
    return { kind: "image", path: developmentIconPath };
  }
  const appBundlePath = path.resolve(path.dirname(process.execPath), "../..");
  if (appBundlePath.endsWith(".app") && fs.existsSync(appBundlePath)) {
    return { kind: "fileIcon", path: appBundlePath };
  }
  return fs.existsSync(process.execPath) ? { kind: "fileIcon", path: process.execPath } : null;
}
function applyProjectMetadataFileIcon(filePath) {
  const iconSource = getProjectMetadataIconSource();
  if (!iconSource || !fs.existsSync(filePath)) return false;
  const escapedTargetPath = JSON.stringify(filePath);
  const escapedSourcePath = JSON.stringify(iconSource.path);
  const iconExpression = iconSource.kind === "image" ? `$.NSImage.alloc.initWithContentsOfFile($(${escapedSourcePath}))` : `ws.iconForFile($(${escapedSourcePath}))`;
  try {
    child_process.execFileSync(
      "/usr/bin/osascript",
      [
        "-l",
        "JavaScript",
        "-e",
        'ObjC.import("AppKit")',
        "-e",
        "const ws = $.NSWorkspace.sharedWorkspace",
        "-e",
        `const icon = ${iconExpression}`,
        "-e",
        `const ok = ws.setIconForFileOptions(icon, $(${escapedTargetPath}), 0)`,
        "-e",
        "if (!ok) $.exit(1)"
      ],
      { stdio: "ignore" }
    );
    return true;
  } catch {
    return false;
  }
}
function ensureProjectMetadataFileIcon(filePath) {
  if (process.platform !== "darwin" || !fs.existsSync(filePath)) return;
  const normalizedPath = path.resolve(filePath);
  const mtimeMs = fs.statSync(normalizedPath).mtimeMs;
  if (projectMetadataIconMtims.get(normalizedPath) === mtimeMs) return;
  if (applyProjectMetadataFileIcon(normalizedPath)) {
    projectMetadataIconMtims.set(normalizedPath, mtimeMs);
  }
}
function readProjectMetadata(folderPath) {
  const metadataPath = findProjectMetadataPath(folderPath);
  if (!metadataPath) return null;
  return parseProjectMetadata(fs.readFileSync(metadataPath, "utf-8"));
}
function normalizeProjectDocumentPath(relativePath) {
  return relativePath.replace(/\\/g, "/");
}
function getElementLabel(tag) {
  switch (tag) {
    case "h1":
      return "Heading 1";
    case "h2":
      return "Heading 2";
    case "h3":
      return "Heading 3";
    case "h4":
      return "Heading 4";
    case "h5":
      return "Heading 5";
    case "h6":
      return "Heading 6";
    case "p":
      return "Paragraph";
    case "a":
      return "Link";
    case "img":
      return "Image";
    case "div":
      return "Div";
    case "section":
      return "Section";
    case "header":
      return "Header";
    case "footer":
      return "Footer";
    case "nav":
      return "Nav";
    case "main":
      return "Main";
    case "aside":
      return "Aside";
    case "article":
      return "Article";
    case "ul":
      return "Unordered List";
    case "ol":
      return "Ordered List";
    case "li":
      return "List Item";
    case "span":
      return "Span";
    case "button":
      return "Button";
    case "input":
      return "Input";
    case "form":
      return "Form";
    case "textarea":
      return "Textarea";
    case "select":
      return "Select";
    case "table":
      return "Table";
    case "video":
      return "Video";
    case "audio":
      return "Audio";
    case "figure":
      return "Figure";
    case "blockquote":
      return "Blockquote";
    default:
      return tag.charAt(0).toUpperCase() + tag.slice(1);
  }
}
function extractLeadingComponentComment(content) {
  const match = content.match(/^<!--\s*([\s\S]*?)-->/);
  if (!match) return null;
  return {
    commentText: match[1],
    htmlContent: content.slice(match[0].length).trim()
  };
}
function parseComponentPropComment(commentText) {
  const props = [];
  const lines = commentText.split("\n");
  for (const line of lines) {
    const match = line.trim().match(/^@prop\s+(\S+)\s+(text|number|boolean|link|image|video|target|render|class)(?:\s+"([^"]*)")?(?:\s+(.+))?$/);
    if (!match) continue;
    const [, key, type, defaultValueStr, tooltip] = match;
    let defaultValue = void 0;
    if (defaultValueStr !== void 0) {
      if (type === "boolean") defaultValue = defaultValueStr === "true";
      else if (type === "number") defaultValue = Number(defaultValueStr) || 0;
      else if (type === "link") defaultValue = parseSerializedComponentLinkValue(defaultValueStr) || { href: "" };
      else if (type === "image") defaultValue = parseSerializedComponentImageValue(defaultValueStr) || { src: defaultValueStr };
      else if (type === "video") defaultValue = parseSerializedComponentVideoValue(defaultValueStr) || { src: defaultValueStr };
      else if (type === "target") defaultValue = normalizeComponentTargetValue(defaultValueStr) || "_self";
      else if (type === "render") defaultValue = normalizeComponentRenderValue(defaultValueStr) || "include";
      else if (type === "class") defaultValue = normalizeComponentClassValue(defaultValueStr) || { classes: [] };
      else defaultValue = defaultValueStr;
    }
    props.push({
      id: nanoid.nanoid(8),
      key,
      type,
      ...defaultValue !== void 0 ? { defaultValue } : {},
      ...tooltip?.trim() ? { tooltip: tooltip.trim() } : {}
    });
  }
  return props;
}
function normalizeComponentPropDefaultValue(type, value) {
  if (value === void 0) return void 0;
  if (type === "number") {
    return normalizeComponentNumberValue(value) ?? void 0;
  }
  if (type === "link") {
    return normalizeComponentLinkValue(value) || void 0;
  }
  if (type === "image") {
    return normalizeComponentImageValue(value) || void 0;
  }
  if (type === "video") {
    return normalizeComponentVideoValue(value) || void 0;
  }
  if (type === "target") {
    return normalizeComponentTargetValue(value) || void 0;
  }
  if (type === "render") {
    return normalizeComponentRenderValue(value) || void 0;
  }
  if (type === "class") {
    return normalizeComponentClassValue(value) || void 0;
  }
  if (type === "variant") {
    return typeof value === "string" && value.trim() ? value.trim() : void 0;
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean" || value === null) {
    return value;
  }
  if (type === "boolean" && typeof value === "string") {
    if (value === "true") return true;
    if (value === "false") return false;
  }
  return void 0;
}
function normalizeParsedComponentClassOrderEntries(value, validPropIds) {
  if (!Array.isArray(value)) return [];
  const entries = [];
  value.forEach((entry) => {
    if (typeof entry !== "string") return;
    const normalizedEntry = entry.trim();
    if (!normalizedEntry) return;
    const propId = parseComponentClassPropOrderEntry(normalizedEntry);
    if (propId) {
      if (!validPropIds.has(propId)) return;
      const marker = buildComponentClassPropOrderEntry(propId);
      if (entries.includes(marker)) return;
      entries.push(marker);
      return;
    }
    if (entries.includes(normalizedEntry)) return;
    entries.push(normalizedEntry);
  });
  return entries;
}
function parseJsonComponentComment(commentText) {
  const trimmedComment = commentText.trim();
  if (!trimmedComment.startsWith("{")) return null;
  let parsed;
  try {
    parsed = JSON.parse(trimmedComment);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const metadataRoot = typeof parsed.stackiComponent === "object" && parsed.stackiComponent ? parsed.stackiComponent : parsed;
  if (!metadataRoot || typeof metadataRoot !== "object") return null;
  const rawComponentId = typeof metadataRoot.id === "string" ? metadataRoot.id.trim() : "";
  let hasExplicitPropIds = false;
  const props = Array.isArray(metadataRoot.props) ? metadataRoot.props.flatMap((propValue) => {
    if (!propValue || typeof propValue !== "object") return [];
    const propRecord = propValue;
    const key = typeof propRecord.key === "string" ? propRecord.key.trim() : "";
    const type = propRecord.type;
    if (!key || type !== "boolean" && type !== "number" && type !== "text" && type !== "link" && type !== "image" && type !== "video" && type !== "target" && type !== "render" && type !== "class" && type !== "variant") {
      return [];
    }
    const rawPropId = typeof propRecord.id === "string" ? propRecord.id.trim() : "";
    if (rawPropId) hasExplicitPropIds = true;
    const normalizedDefaultValue = normalizeComponentPropDefaultValue(type, propRecord.defaultValue);
    const group = typeof propRecord.group === "string" && propRecord.group.trim() ? propRecord.group.trim() : void 0;
    const tooltip = typeof propRecord.tooltip === "string" && propRecord.tooltip.trim() ? propRecord.tooltip.trim() : void 0;
    const multiline = type === "text" && typeof propRecord.multiline === "boolean" ? propRecord.multiline : void 0;
    const numberPropDefinition = type === "number" ? getNormalizedComponentNumberPropDefinition({
      type,
      min: propRecord.min,
      max: propRecord.max,
      decimals: propRecord.decimals,
      defaultValue: propRecord.defaultValue
    }) : null;
    const options = type === "variant" ? sanitizeComponentVariantOptions(propRecord.options) : [];
    if (type === "variant" && options.length === 0) return [];
    const baseOptionId = type === "variant" ? getComponentVariantBaseOptionId({
      type,
      options,
      baseOptionId: typeof propRecord.baseOptionId === "string" ? propRecord.baseOptionId : void 0
    }) : null;
    const variantDefaultValue = type === "variant" && baseOptionId ? getComponentVariantDefaultOptionId({
      type,
      options,
      baseOptionId,
      defaultValue: propRecord.defaultValue
    }) : void 0;
    return [{
      id: rawPropId || nanoid.nanoid(8),
      key,
      type,
      ...group ? { group } : {},
      ...tooltip ? { tooltip } : {},
      ...multiline !== void 0 ? { multiline } : {},
      ...type === "number" && numberPropDefinition ? numberPropDefinition : {},
      ...type === "variant" ? {
        options,
        ...baseOptionId ? { baseOptionId } : {},
        ...variantDefaultValue ? { defaultValue: variantDefaultValue } : {}
      } : {},
      ...type !== "variant" && type !== "number" && normalizedDefaultValue !== void 0 ? { defaultValue: normalizedDefaultValue } : {}
    }];
  }) : [];
  const validPropIds = new Set(props.map((prop) => prop.id));
  const bindings = Array.isArray(metadataRoot.bindings) ? metadataRoot.bindings.flatMap((bindingValue) => {
    if (!bindingValue || typeof bindingValue !== "object") return [];
    const bindingRecord = bindingValue;
    const kind = bindingRecord.kind === "render" || bindingRecord.kind === "tag" || bindingRecord.kind === "class" ? bindingRecord.kind : void 0;
    const attr = typeof bindingRecord.attr === "string" ? bindingRecord.attr.trim() : "";
    const propId = typeof bindingRecord.propId === "string" ? bindingRecord.propId.trim() : "";
    const target = bindingRecord.target;
    const order = normalizeParsedComponentClassOrderEntries(bindingRecord.order, validPropIds);
    const path2 = Array.isArray(bindingRecord.path) ? bindingRecord.path.filter((segment) => Number.isInteger(segment) && segment >= 0) : [];
    if (kind === "class") {
      return order.length > 0 ? [{
        kind: "class",
        path: path2,
        order
      }] : [];
    }
    if (!propId || !validPropIds.has(propId)) {
      return [];
    }
    if (kind === "render" || kind === "tag") {
      return [{
        kind,
        path: path2,
        propId
      }];
    }
    if (!attr || target !== "name" && target !== "value") {
      return [];
    }
    return [{
      path: path2,
      attr,
      target,
      propId
    }];
  }) : [];
  const renderModes = Array.isArray(metadataRoot.renderModes) ? metadataRoot.renderModes.flatMap((renderModeValue) => {
    if (!renderModeValue || typeof renderModeValue !== "object") return [];
    const renderModeRecord = renderModeValue;
    const mode = renderModeRecord.mode === "remove" ? "remove" : null;
    const path2 = Array.isArray(renderModeRecord.path) ? renderModeRecord.path.filter((segment) => Number.isInteger(segment) && segment >= 0) : [];
    if (!mode) return [];
    return [{
      path: path2,
      mode
    }];
  }) : [];
  return {
    ...rawComponentId ? { componentId: rawComponentId } : {},
    props,
    bindings,
    renderModes,
    hasExplicitComponentId: Boolean(rawComponentId),
    hasExplicitPropIds
  };
}
function parseSerializedComponentLinkValue(rawValue) {
  try {
    const parsed = JSON.parse(decodeURIComponent(rawValue));
    return normalizeComponentLinkValue(parsed);
  } catch {
    return normalizeComponentLinkValue(rawValue);
  }
}
function parseSerializedComponentImageValue(rawValue) {
  try {
    const parsed = JSON.parse(decodeURIComponent(rawValue));
    return normalizeComponentImageValue(parsed);
  } catch {
    return normalizeComponentImageValue(rawValue);
  }
}
function serializeComponentImageValue(value) {
  const normalized = normalizeComponentImageValue(value) || { src: "" };
  return encodeURIComponent(JSON.stringify(normalized));
}
function parseSerializedComponentVideoValue(rawValue) {
  try {
    const parsed = JSON.parse(decodeURIComponent(rawValue));
    return normalizeComponentVideoValue(parsed);
  } catch {
    return normalizeComponentVideoValue(rawValue);
  }
}
function serializeComponentVideoValue(value) {
  const normalized = normalizeComponentVideoValue(value) || { src: "" };
  return encodeURIComponent(JSON.stringify(normalized));
}
function parseComponentTemplateToken(rawValue) {
  const match = rawValue.trim().match(/^\{([^{}]+)\}$/);
  if (!match) return null;
  const inner = match[1].trim();
  if (!inner) return null;
  if (inner.endsWith(".href")) {
    const key = inner.slice(0, -".href".length).trim();
    return key ? { key, field: "href" } : null;
  }
  if (inner.endsWith(".target")) {
    const key = inner.slice(0, -".target".length).trim();
    return key ? { key, field: "target" } : null;
  }
  return { key: inner, field: "value" };
}
function supportsComponentLinkAttributeBinding(tag) {
  return tag === "a" || tag === "link";
}
function findComponentPropByKey(props, key, type) {
  const trimmedKey = key.trim();
  if (!trimmedKey) return void 0;
  return props.find((prop) => prop.key.trim() === trimmedKey && (!type || prop.type === type)) || props.find((prop) => prop.key.trim().toLowerCase() === trimmedKey.toLowerCase() && (!type || prop.type === type));
}
function isStringBindableComponentProp(prop) {
  return prop?.type === "text" || prop?.type === "number";
}
function findStringBindableComponentPropByKey(props, key) {
  return findComponentPropByKey(props, key, "text") || findComponentPropByKey(props, key, "number");
}
function setComponentAttributeBindingPropId(node, attrKey, target, propId) {
  const nextBindings = cloneComponentAttributeBindings(node.componentAttributeBindings) || {};
  const nextBinding = { ...nextBindings[attrKey] || {} };
  if (target === "name") {
    if (propId) nextBinding.namePropId = propId;
    else delete nextBinding.namePropId;
  } else {
    if (propId) nextBinding.valuePropId = propId;
    else delete nextBinding.valuePropId;
  }
  if (!nextBinding.namePropId && !nextBinding.valuePropId) {
    delete nextBindings[attrKey];
  } else {
    nextBindings[attrKey] = nextBinding;
  }
  if (Object.keys(nextBindings).length > 0) node.componentAttributeBindings = nextBindings;
  else delete node.componentAttributeBindings;
}
function getComponentNodeAtPath(root, path2) {
  const getDescendantAtPath = (startNode, descendantPath) => {
    let current2 = startNode;
    for (const segment of descendantPath) {
      if (!current2?.children?.[segment]) return null;
      current2 = current2.children[segment];
    }
    return current2;
  };
  if (isComponentRootElement(root)) {
    if (root.children.length === 1) {
      const onlyChild = root.children[0];
      if (!onlyChild) return null;
      return path2.length === 0 ? onlyChild : getDescendantAtPath(onlyChild, path2);
    }
    if (path2.length === 0) return null;
    const [childIndex, ...restPath] = path2;
    const child = root.children[childIndex];
    if (!child) return null;
    return getDescendantAtPath(child, restPath);
  }
  let current = root;
  for (const segment of path2) {
    if (!current?.children?.[segment]) return null;
    current = current.children[segment];
  }
  return current;
}
function createSerializedComponentRoot(children) {
  return {
    id: nanoid.nanoid(8),
    tag: COMPONENT_ROOT_TAG,
    label: "Component",
    className: "",
    classes: [],
    styles: {},
    queryStyles: {},
    mediaStyles: {},
    attrs: {},
    children
  };
}
function visitSerializableComponentNodes(root, visitor) {
  const visitChild = (node, path2) => {
    visitor(node, path2);
    node.children.forEach((child, index) => {
      visitChild(child, [...path2, index]);
    });
  };
  if (!isComponentRootElement(root)) {
    visitChild(root, []);
    return;
  }
  if (root.children.length === 1) {
    const onlyChild = root.children[0];
    if (onlyChild) visitChild(onlyChild, []);
    return;
  }
  root.children.forEach((child, index) => {
    visitChild(child, [index]);
  });
}
function buildElementIdToPathMap(root) {
  const map = /* @__PURE__ */ new Map();
  visitSerializableComponentNodes(root, (node, path2) => {
    map.set(node.id, path2.length === 0 ? "" : path2.join("."));
  });
  return map;
}
function buildPathToElementIdMap(root) {
  const map = /* @__PURE__ */ new Map();
  visitSerializableComponentNodes(root, (node, path2) => {
    map.set(path2.length === 0 ? "" : path2.join("."), node.id);
  });
  return map;
}
function convertVariantOverrideKeysToPath(options, idToPath) {
  return options.map((option) => {
    if (!option.overrides) return option;
    const nextOverrides = {};
    for (const [elementId, override] of Object.entries(option.overrides)) {
      const pathKey = idToPath.get(elementId);
      if (pathKey !== void 0) {
        nextOverrides[pathKey] = override;
      }
    }
    if (Object.keys(nextOverrides).length === 0) {
      const { overrides: _, ...rest } = option;
      return rest;
    }
    return { ...option, overrides: nextOverrides };
  });
}
function convertVariantOverrideKeysToElementId(options, pathToId) {
  return options.map((option) => {
    if (!option.overrides) return option;
    const nextOverrides = {};
    for (const [pathKey, override] of Object.entries(option.overrides)) {
      const elementId = pathToId.get(pathKey);
      if (elementId) {
        nextOverrides[elementId] = override;
      }
    }
    if (Object.keys(nextOverrides).length === 0) {
      const { overrides: _, ...rest } = option;
      return rest;
    }
    return { ...option, overrides: nextOverrides };
  });
}
function applyComponentTemplateBindingsToRoot(root, props, commentBindings) {
  const walk = (node) => {
    if (typeof node.content === "string" && node.content) {
      const token = parseComponentTemplateToken(node.content);
      const prop = token?.field === "value" ? findStringBindableComponentPropByKey(props, token.key) : void 0;
      if (prop) {
        node.componentTextPropId = prop.id;
        setElementTextContent(node, "");
      }
    }
    if (node.tag === "text" && typeof node.content === "string" && node.content) {
      const token = parseComponentTemplateToken(node.content);
      const prop = token?.field === "value" ? findStringBindableComponentPropByKey(props, token.key) : void 0;
      if (prop) {
        node.componentTextPropId = prop.id;
        node.content = "";
      }
    }
    Object.entries(node.attrs || {}).forEach(([attrKey, attrValue]) => {
      const token = parseComponentTemplateToken(attrValue);
      if (!token) return;
      if (supportsComponentLinkAttributeBinding(node.tag) && attrKey === "href" && token.field === "href") {
        const prop2 = findComponentPropByKey(props, token.key, "link");
        if (!prop2) return;
        setComponentAttributeBindingPropId(node, attrKey, "value", prop2.id);
        node.attrs[attrKey] = "";
        return;
      }
      if (node.tag === "img" && attrKey === "src" && token.field === "value") {
        const prop2 = findComponentPropByKey(props, token.key, "image") || findComponentPropByKey(props, token.key, "text");
        if (!prop2) return;
        setComponentAttributeBindingPropId(node, attrKey, "value", prop2.id);
        node.attrs[attrKey] = "";
        return;
      }
      if (node.tag === "video" && attrKey === "src" && token.field === "value") {
        const prop2 = findComponentPropByKey(props, token.key, "video") || findComponentPropByKey(props, token.key, "text");
        if (!prop2) return;
        setComponentAttributeBindingPropId(node, attrKey, "value", prop2.id);
        node.attrs[attrKey] = "";
        return;
      }
      if (node.tag === "a" && attrKey === "target" && token.field === "target") {
        const prop2 = findComponentPropByKey(props, token.key, "link");
        if (!prop2) return;
        node.attrs[attrKey] = normalizeComponentLinkValue(prop2.defaultValue)?.target || "";
        return;
      }
      if (node.tag === "a" && attrKey === "target" && token.field === "value") {
        const prop2 = findComponentPropByKey(props, token.key, "target") || findComponentPropByKey(props, token.key, "boolean");
        if (!prop2) return;
        setComponentAttributeBindingPropId(node, attrKey, "value", prop2.id);
        node.attrs[attrKey] = "";
        return;
      }
      if (token.field !== "value") return;
      const prop = findStringBindableComponentPropByKey(props, token.key);
      if (!prop) return;
      setComponentAttributeBindingPropId(node, attrKey, "value", prop.id);
      node.attrs[attrKey] = "";
    });
    node.children.forEach(walk);
  };
  walk(root);
  commentBindings.forEach((binding) => {
    const node = getComponentNodeAtPath(root, binding.path);
    if (!node) return;
    if (binding.kind === "class") {
      if (binding.order && binding.order.length > 0) {
        node.componentClassOrder = [...binding.order];
        delete node.resolvedClassOrder;
      }
      return;
    }
    const prop = typeof binding.propId === "string" ? props.find((candidate) => candidate.id === binding.propId) : null;
    if (!prop || !binding.propId) return;
    if (binding.kind === "render") {
      node.componentRenderPropId = binding.propId;
      return;
    }
    if (binding.kind === "tag") {
      if (prop.type === "text") {
        node.componentTagPropId = binding.propId;
      }
      return;
    }
    if (!binding.attr || binding.target !== "name" && binding.target !== "value") return;
    if (binding.target === "value" && !Object.prototype.hasOwnProperty.call(node.attrs, binding.attr)) {
      node.attrs[binding.attr] = "";
    }
    setComponentAttributeBindingPropId(node, binding.attr, binding.target, binding.propId);
  });
}
function parseComponentFile(filePath, content, componentLookup) {
  const fileName = path.basename(filePath);
  const componentName = fileName.replace(/\.component\.(js|html)$/i, "");
  if (!componentName) return null;
  if (isComponentJsFile(fileName)) {
    return parseComponentJsFileToComponent(componentName, content, componentLookup);
  }
  return parseComponentHtmlFile(componentName, content, componentLookup);
}
function parseComponentJsFileToComponent(componentName, content, componentLookup) {
  const parsed = parseComponentJsFile(content);
  if (!parsed) return null;
  const rawMetadata = parsed.component;
  const metadata = rawMetadata.stackiComponent ?? rawMetadata;
  const template = parsed.template;
  if (!template) return null;
  const props = (metadata.props || []).map((prop) => ({
    id: prop.id || nanoid.nanoid(),
    key: prop.key,
    type: prop.type,
    ...prop.group ? { group: prop.group } : {},
    ...prop.tooltip ? { tooltip: prop.tooltip } : {},
    ...typeof prop.multiline === "boolean" ? { multiline: prop.multiline } : {},
    ...prop.type === "number" && typeof prop.min === "number" ? { min: prop.min } : {},
    ...prop.type === "number" && typeof prop.max === "number" ? { max: prop.max } : {},
    ...prop.type === "number" && typeof prop.decimals === "number" ? { decimals: prop.decimals } : {},
    ...prop.defaultValue !== void 0 ? { defaultValue: prop.defaultValue } : {},
    ...prop.type === "variant" && Array.isArray(prop.options) ? { options: prop.options } : {},
    ...prop.type === "variant" && typeof prop.baseOptionId === "string" ? { baseOptionId: prop.baseOptionId } : {}
  }));
  const parsedHtml = nodeHtmlParser.parse(template, PARSE_HTML_OPTIONS);
  const topLevelNodes = parsedHtml.childNodes.map((node) => nodeToSerializedEditorElement(node, componentLookup)).filter((node) => node !== null);
  if (topLevelNodes.length === 0) return null;
  const root = createSerializedComponentRoot(topLevelNodes);
  normalizeFormattingWhitespaceInTree(root);
  applyComponentTemplateBindingsToRoot(root, props, metadata.bindings || []);
  applyParsedRenderModesToRoot(root, metadata.renderModes || []);
  const hasExplicitComponentId = typeof metadata.id === "string" && metadata.id.length > 0;
  const hasExplicitPropIds = props.length > 0 && props.every((prop) => typeof prop.id === "string" && prop.id.length > 0);
  const component = {
    id: metadata.id || nanoid.nanoid(),
    name: componentName,
    root,
    props,
    ...metadata.propGroups ? { propGroups: metadata.propGroups } : {}
  };
  applyComponentPropsToRoot(component.root, component, null);
  return {
    component,
    format: "json",
    hasExplicitComponentId,
    hasExplicitPropIds
  };
}
function parseComponentHtmlFile(componentName, content, componentLookup) {
  const extractedComment = extractLeadingComponentComment(content);
  const parsedJsonComment = extractedComment ? parseJsonComponentComment(extractedComment.commentText) : null;
  const props = parsedJsonComment ? parsedJsonComment.props : extractedComment ? parseComponentPropComment(extractedComment.commentText) : [];
  const htmlContent = extractedComment ? extractedComment.htmlContent : content.trim();
  if (!htmlContent) return null;
  const parsed = nodeHtmlParser.parse(htmlContent, PARSE_HTML_OPTIONS);
  const topLevelNodes = parsed.childNodes.map((node) => nodeToSerializedEditorElement(node, componentLookup)).filter((node) => node !== null);
  if (topLevelNodes.length === 0) return null;
  const root = createSerializedComponentRoot(topLevelNodes);
  normalizeFormattingWhitespaceInTree(root);
  applyComponentTemplateBindingsToRoot(root, props, parsedJsonComment?.bindings || []);
  applyParsedRenderModesToRoot(root, parsedJsonComment?.renderModes || []);
  const component = {
    id: parsedJsonComment?.componentId || nanoid.nanoid(),
    name: componentName,
    root,
    props
  };
  applyComponentPropsToRoot(component.root, component, null);
  return {
    component,
    format: parsedJsonComment ? "json" : "legacy",
    hasExplicitComponentId: parsedJsonComment?.hasExplicitComponentId || false,
    hasExplicitPropIds: parsedJsonComment?.hasExplicitPropIds || false
  };
}
function readComponentFiles(folderPath, componentLookup) {
  const componentsDir = path.join(folderPath, SOURCE_DIR, SOURCE_COMPONENTS_DIR);
  if (!fs.existsSync(componentsDir) || !fs.statSync(componentsDir).isDirectory()) return [];
  const entries = fs.readdirSync(componentsDir, { withFileTypes: true }).filter((entry) => entry.isFile() && isComponentJsFile(entry.name)).map((entry) => {
    const filePath = path.join(componentsDir, entry.name);
    return {
      filePath,
      content: fs.readFileSync(filePath, "utf-8")
    };
  });
  const parseEntries = (lookup) => entries.map((entry) => parseComponentFile(entry.filePath, entry.content, lookup)).filter((component) => component !== null);
  const initialComponents = parseEntries(componentLookup);
  const mergedLookup = new Map(componentLookup || []);
  buildComponentLookup(initialComponents.map((component) => component.component)).forEach((component, id) => mergedLookup.set(id, component));
  if (mergedLookup.size === 0) return initialComponents;
  const resolvedComponents = parseEntries(mergedLookup);
  return resolvedComponents.length > 0 ? resolvedComponents : initialComponents;
}
function buildComponentTemplateTextToken(prop) {
  return `{${prop.key}}`;
}
function buildComponentTemplateLinkToken(prop, field) {
  return `{${prop.key}.${field}}`;
}
function collectComponentCommentBindings(root, propById) {
  const bindings = [];
  visitSerializableComponentNodes(root, (node, path2) => {
    if (node.componentRenderPropId && propById.has(node.componentRenderPropId)) {
      bindings.push({
        kind: "render",
        path: path2,
        propId: node.componentRenderPropId
      });
    }
    if (node.componentTagPropId && propById.has(node.componentTagPropId)) {
      bindings.push({
        kind: "tag",
        path: path2,
        propId: node.componentTagPropId
      });
    }
    const classOrderEntries = getElementClassOrderEntries(node);
    if (classOrderEntries.some((entry) => parseComponentClassPropOrderEntry(entry) !== null)) {
      bindings.push({
        kind: "class",
        path: path2,
        order: classOrderEntries
      });
    }
    Object.entries(node.componentAttributeBindings || {}).forEach(([attrKey, binding]) => {
      if (binding.namePropId) {
        bindings.push({
          path: path2,
          attr: attrKey,
          target: "name",
          propId: binding.namePropId
        });
      }
      if (binding.valuePropId) {
        const valueProp = propById.get(binding.valuePropId);
        if (valueProp?.type === "boolean") {
          bindings.push({
            path: path2,
            attr: attrKey,
            target: "value",
            propId: binding.valuePropId
          });
        }
      }
    });
  });
  return bindings;
}
function collectComponentCommentRenderModes(root) {
  const renderModes = [];
  visitSerializableComponentNodes(root, (node, path2) => {
    if (node.renderMode === "remove") {
      renderModes.push({
        path: path2,
        mode: "remove"
      });
    }
  });
  return renderModes;
}
function applyParsedRenderModesToRoot(root, renderModes) {
  renderModes.forEach((renderMode) => {
    const target = getComponentNodeAtPath(root, renderMode.path);
    if (!target) return;
    if (renderMode.mode === "remove") target.renderMode = "remove";
    else delete target.renderMode;
  });
}
function serializeComponentElementToTemplateHtml(el, depth, propById, componentsById) {
  const pad = "  ".repeat(depth);
  if (el.componentInstance?.componentId) {
    const component = componentsById.get(el.componentInstance.componentId);
    if (component) {
      const propParts = [];
      const instanceProps = el.componentInstance.props || {};
      const instancePropById = new Map(component.props.map((prop) => [prop.id, prop]));
      const slotEntries = Object.entries(collectComponentInstanceSlotContent(el)).filter(([, children]) => children.length > 0);
      const inlineTextPropId = slotEntries.length === 0 ? findSingleSourceComponentTextPropId(component.root) : null;
      let inlineTextContent2 = null;
      for (const [propId, value] of Object.entries(instanceProps)) {
        if (value === null || value === void 0) continue;
        const propDef = instancePropById.get(propId);
        const attrName = propDef ? buildPropAttrName(propDef) : propId;
        if (isStringBindableComponentProp(propDef) && inlineTextPropId === propId) {
          inlineTextContent2 = normalizeTextComponentPropValue(value) ?? "";
          continue;
        }
        if (propDef?.type === "link") {
          const normalizedLinkValue = normalizeComponentLinkValue(value) || { href: "" };
          propParts.push(`${attrName}="${escapeSourceComponentAttributeValue(normalizedLinkValue.href)}"`);
          if (normalizedLinkValue.target === "_blank" && canPromoteLinkTargetToSourceAttr(component, propId)) {
            propParts.push('target="_blank"');
          }
          continue;
        }
        if (propDef?.type === "target") {
          const normalizedTargetValue = normalizeComponentTargetValue(value);
          if (normalizedTargetValue === "_blank") {
            propParts.push(`${attrName}="_blank"`);
          }
          continue;
        }
        const attrValue = propDef?.type === "image" ? serializeComponentImageValue(normalizeComponentImageValue(value) || { src: "" }) : propDef?.type === "video" ? serializeComponentVideoValue(normalizeComponentVideoValue(value) || { src: "" }) : propDef?.type === "class" ? serializeComponentClassValue(value) : String(value);
        propParts.push(`${attrName}="${escapeSourceComponentAttributeValue(attrValue)}"`);
      }
      component.props.forEach((prop) => {
        if (prop.type !== "target") return;
        if (Object.prototype.hasOwnProperty.call(instanceProps, prop.id)) return;
        const normalizedDefaultTarget = normalizeComponentTargetValue(prop.defaultValue);
        if (normalizedDefaultTarget !== "_blank") return;
        propParts.push(`${buildPropAttrName(prop)}="_blank"`);
      });
      const componentTag = toPascalCase(component.name);
      const attrsStr2 = propParts.length ? ` ${propParts.join(" ")}` : "";
      const tagOpen = `${pad}<${componentTag}${attrsStr2}>`;
      if (slotEntries.length === 0) {
        const innerContent = inlineTextContent2 !== null ? escapeSourceComponentTextContent(inlineTextContent2) : "";
        return `${tagOpen}${innerContent}</${componentTag}>`;
      }
      let html = `${tagOpen}
`;
      slotEntries.forEach(([slotId, children]) => {
        html += `${pad}  <${STACKI_SLOT_TAG} ${STACKI_SLOT_ID_ATTR}="${slotId}">
`;
        children.forEach((child) => {
          html += `${serializeComponentElementToTemplateHtml(child, depth + 2, propById, componentsById)}
`;
        });
        html += `${pad}  </${STACKI_SLOT_TAG}>
`;
      });
      html += `${pad}</${componentTag}>`;
      return html;
    }
  }
  if (isComponentRootElement(el)) {
    return el.children.map((child) => serializeComponentElementToTemplateHtml(child, depth, propById, componentsById)).join("\n");
  }
  if (isSlotElement(el)) {
    const attrParts2 = [];
    const allClasses2 = getElementRenderedClassNames(el);
    if (allClasses2.length) attrParts2.push(`class="${allClasses2.join(" ")}"`);
    if (el.slot?.slotId?.trim()) attrParts2.push(`${STACKI_SLOT_ID_ATTR}="${el.slot.slotId.trim()}"`);
    if (el.label?.trim()) attrParts2.push(`${STACKI_SLOT_LABEL_ATTR}="${el.label.trim()}"`);
    if (shouldRenderSlotAsElement(el)) attrParts2.push(STACKI_SLOT_RENDER_ATTR);
    if (el.tag && el.tag !== DEFAULT_SLOT_ELEMENT_TAG) {
      attrParts2.push(`${STACKI_SLOT_TAG_ATTR}="${el.tag}"`);
    }
    for (const [key, value] of Object.entries(el.attrs || {})) {
      if (value === "") attrParts2.push(key);
      else attrParts2.push(`${key}="${value}"`);
    }
    const attrsStr2 = attrParts2.length ? ` ${attrParts2.join(" ")}` : "";
    if (el.children && el.children.length > 0) {
      let html = `${pad}<${STACKI_SLOT_TAG}${attrsStr2}>
`;
      for (const child of el.children) {
        html += serializeComponentElementToTemplateHtml(child, depth + 1, propById, componentsById) + "\n";
      }
      html += `${pad}</${STACKI_SLOT_TAG}>`;
      return html;
    }
    return `${pad}<${STACKI_SLOT_TAG}${attrsStr2}></${STACKI_SLOT_TAG}>`;
  }
  if (el.tag === "comment") return `${pad}<!--${el.content || ""}-->`;
  const textProp = el.componentTextPropId ? propById.get(el.componentTextPropId) : null;
  if (el.tag === "text") {
    return `${pad}${textProp ? buildComponentTemplateTextToken(textProp) : el.content || ""}`;
  }
  const VOID = /* @__PURE__ */ new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);
  const attrParts = [];
  const allClasses = getElementClassNamesInOrder(el);
  if (allClasses.length) attrParts.push(`class="${allClasses.join(" ")}"`);
  let emittedTargetToken = false;
  const hrefLinkProp = (() => {
    const propId = el.componentAttributeBindings?.href?.valuePropId;
    const prop = propId ? propById.get(propId) : null;
    return supportsComponentLinkAttributeBinding(el.tag) && prop?.type === "link" ? prop : null;
  })();
  const targetBindingProp = (() => {
    const propId = el.componentAttributeBindings?.target?.valuePropId;
    return propId ? propById.get(propId) || null : null;
  })();
  for (const [key, value] of Object.entries(el.attrs || {})) {
    if (el.tag === "a" && key === "target" && targetBindingProp?.type === "target") {
      attrParts.push(`${key}="${buildComponentTemplateTextToken(targetBindingProp)}"`);
      emittedTargetToken = true;
      continue;
    }
    if (el.tag === "a" && key === "target" && !targetBindingProp && hrefLinkProp) {
      attrParts.push(`${key}="${buildComponentTemplateLinkToken(hrefLinkProp, "target")}"`);
      emittedTargetToken = true;
      continue;
    }
    const valuePropId = el.componentAttributeBindings?.[key]?.valuePropId;
    const valueProp = valuePropId ? propById.get(valuePropId) : null;
    if (isStringBindableComponentProp(valueProp)) {
      attrParts.push(`${key}="${buildComponentTemplateTextToken(valueProp)}"`);
      continue;
    }
    if (supportsComponentLinkAttributeBinding(el.tag) && key === "href" && valueProp?.type === "link") {
      attrParts.push(`${key}="${buildComponentTemplateLinkToken(valueProp, "href")}"`);
      continue;
    }
    if (el.tag === "img" && key === "src" && valueProp?.type === "image") {
      attrParts.push(`${key}="${buildComponentTemplateTextToken(valueProp)}"`);
      continue;
    }
    if (el.tag === "video" && key === "src" && valueProp?.type === "video") {
      attrParts.push(`${key}="${buildComponentTemplateTextToken(valueProp)}"`);
      continue;
    }
    if (value === "") attrParts.push(key);
    else attrParts.push(`${key}="${value}"`);
  }
  if (el.tag === "a" && !emittedTargetToken && targetBindingProp?.type === "target") {
    attrParts.push(`target="${buildComponentTemplateTextToken(targetBindingProp)}"`);
  } else if (el.tag === "a" && !emittedTargetToken && !targetBindingProp && hrefLinkProp && normalizeComponentLinkValue(hrefLinkProp.defaultValue)?.target) {
    attrParts.push(`target="${buildComponentTemplateLinkToken(hrefLinkProp, "target")}"`);
  }
  if (el.placeholder && (el.tag === "input" || el.tag === "textarea")) {
    attrParts.push(`placeholder="${el.placeholder}"`);
  }
  const attrsStr = attrParts.length ? " " + attrParts.join(" ") : "";
  if (VOID.has(el.tag)) return `${pad}<${el.tag}${attrsStr}>`;
  if (el.tag === "style" || el.tag === "script") {
    return el.content ? `${pad}<${el.tag}${attrsStr}>
${el.content}
${pad}</${el.tag}>` : `${pad}<${el.tag}${attrsStr}></${el.tag}>`;
  }
  const inlineTextContent = textProp ? buildComponentTemplateTextToken(textProp) : hasOnlyTextChildren(el) ? getTextChildrenContent(el) : null;
  if (inlineTextContent !== null) {
    return `${pad}<${el.tag}${attrsStr}>${inlineTextContent}</${el.tag}>`;
  }
  if (el.children && el.children.length > 0) {
    let html = `${pad}<${el.tag}${attrsStr}>
`;
    for (const child of el.children) {
      html += serializeComponentElementToTemplateHtml(child, depth + 1, propById, componentsById) + "\n";
    }
    html += `${pad}</${el.tag}>`;
    return html;
  }
  if (textProp) return `${pad}<${el.tag}${attrsStr}>${buildComponentTemplateTextToken(textProp)}</${el.tag}>`;
  if (el.content) return `${pad}<${el.tag}${attrsStr}>${el.content}</${el.tag}>`;
  return `${pad}<${el.tag}${attrsStr}></${el.tag}>`;
}
function serializeComponentToFile(component, components) {
  const propById = new Map(component.props.map((prop) => [prop.id, prop]));
  const componentsById = new Map(components.map((entry) => [entry.id, entry]));
  const idToPathMap = buildElementIdToPathMap(component.root);
  const commentBindings = collectComponentCommentBindings(component.root, propById);
  const renderModes = collectComponentCommentRenderModes(component.root);
  const metadata = {
    id: component.id,
    name: component.name,
    props: component.props.map((prop) => ({
      id: prop.id,
      key: prop.key,
      type: prop.type,
      ...prop.group ? { group: prop.group } : {},
      ...prop.tooltip ? { tooltip: prop.tooltip } : {},
      ...typeof prop.multiline === "boolean" ? { multiline: prop.multiline } : {},
      ...prop.type === "number" && typeof prop.min === "number" ? { min: prop.min } : {},
      ...prop.type === "number" && typeof prop.max === "number" ? { max: prop.max } : {},
      ...prop.type === "number" && typeof prop.decimals === "number" ? { decimals: prop.decimals } : {},
      ...prop.defaultValue !== void 0 ? { defaultValue: prop.defaultValue } : {},
      ...prop.type === "variant" && Array.isArray(prop.options) ? { options: convertVariantOverrideKeysToPath(prop.options, idToPathMap) } : {},
      ...prop.type === "variant" && typeof prop.baseOptionId === "string" ? { baseOptionId: prop.baseOptionId } : {}
    })),
    ...component.propGroups ? { propGroups: component.propGroups } : {},
    ...commentBindings.length > 0 ? { bindings: commentBindings } : {},
    ...renderModes.length > 0 ? { renderModes } : {}
  };
  const templateHtml = serializeComponentElementToTemplateHtml(component.root, 0, propById, componentsById);
  return buildComponentJsFile(metadata, templateHtml);
}
function hasOnlyTextChildren(el) {
  return el.children.length > 0 && el.children.every((child) => child.tag === "text");
}
function getTextChildrenContent(el) {
  return el.children.filter((child) => child.tag === "text").map((child) => child.content || "").join("");
}
function normalizeFormattingWhitespaceInTree(node) {
  node.children.forEach(normalizeFormattingWhitespaceInTree);
  if (WHITESPACE_PRESERVING_TEXT_TAGS.has(node.tag)) return;
  if (!hasOnlyTextChildren(node)) return;
  const rawText = getTextChildrenContent(node);
  if (!/[\r\n]/.test(rawText)) return;
  const normalizedText = rawText.trim();
  if (!normalizedText) {
    node.children = [];
    return;
  }
  const firstTextChild = node.children.find((child) => child.tag === "text");
  node.children = [firstTextChild ? { ...firstTextChild, content: normalizedText } : createTextNode(normalizedText)];
}
function serializeInlineTextOnlyChildren(el, pad, attrsStr) {
  if (!hasOnlyTextChildren(el)) return null;
  return `${pad}<${el.tag}${attrsStr}>${getTextChildrenContent(el)}</${el.tag}>`;
}
function serializeEditorElementToHtml(el, depth) {
  if (isComponentRootElement(el)) {
    return el.children.map((child) => serializeEditorElementToHtml(child, depth)).filter(Boolean).join("");
  }
  const pad = "  ".repeat(depth);
  if (isSlotElement(el) && !shouldRenderSlotAsElement(el)) {
    const parts = [];
    if (el.content) parts.push(`${pad}${el.content}`);
    el.children.forEach((child) => {
      const serializedChild = serializeEditorElementToHtml(child, depth);
      if (serializedChild) parts.push(serializedChild);
    });
    return parts.join("\n");
  }
  if (el.tag === "comment") return `${pad}<!--${el.content || ""}-->`;
  if (el.tag === "text") return `${pad}${el.content || ""}`;
  const VOID = /* @__PURE__ */ new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);
  const attrParts = [];
  const allClasses = getElementRenderedClassNames(el);
  if (allClasses.length) attrParts.push(`class="${allClasses.join(" ")}"`);
  for (const [key, value] of Object.entries(el.attrs || {})) {
    if (value === "") attrParts.push(key);
    else attrParts.push(`${key}="${value}"`);
  }
  if (el.placeholder && (el.tag === "input" || el.tag === "textarea")) {
    attrParts.push(`placeholder="${el.placeholder}"`);
  }
  const attrsStr = attrParts.length ? " " + attrParts.join(" ") : "";
  if (VOID.has(el.tag)) return `${pad}<${el.tag}${attrsStr}>`;
  if (el.tag === "style" || el.tag === "script") {
    return el.content ? `${pad}<${el.tag}${attrsStr}>
${el.content}
${pad}</${el.tag}>` : `${pad}<${el.tag}${attrsStr}></${el.tag}>`;
  }
  const inlineTextChildren = serializeInlineTextOnlyChildren(el, pad, attrsStr);
  if (inlineTextChildren) return inlineTextChildren;
  if (el.children && el.children.length > 0) {
    let html = `${pad}<${el.tag}${attrsStr}>
`;
    for (const child of el.children) {
      html += serializeEditorElementToHtml(child, depth + 1) + "\n";
    }
    html += `${pad}</${el.tag}>`;
    return html;
  }
  if (el.content) return `${pad}<${el.tag}${attrsStr}>${el.content}</${el.tag}>`;
  return `${pad}<${el.tag}${attrsStr}></${el.tag}>`;
}
function cloneComponentBinding(binding) {
  if (!binding) return null;
  const slotContent = binding.slotContent && typeof binding.slotContent === "object" ? Object.fromEntries(
    Object.entries(binding.slotContent).flatMap(([slotId, children]) => {
      const normalizedSlotId = typeof slotId === "string" ? slotId.trim() : "";
      if (!normalizedSlotId || !Array.isArray(children) || children.length === 0) return [];
      return [[normalizedSlotId, children.map((child) => JSON.parse(JSON.stringify(child)))]];
    })
  ) : void 0;
  return {
    componentId: binding.componentId,
    props: { ...binding.props },
    ...slotContent && Object.keys(slotContent).length > 0 ? { slotContent } : {}
  };
}
function cloneSlotMetadata(slot) {
  if (!slot) return void 0;
  return {
    ...slot.slotId ? { slotId: slot.slotId } : {},
    ...typeof slot.renderAsElement === "boolean" ? { renderAsElement: slot.renderAsElement } : {}
  };
}
function collectComponentSlotIds(root) {
  const slotIds = /* @__PURE__ */ new Set();
  const walk = (node, isRoot = false) => {
    if (!isRoot && node.componentInstance?.componentId) return;
    const slotId = getSlotElementId(node);
    if (slotId) {
      slotIds.add(slotId);
      return;
    }
    node.children.forEach((child) => walk(child));
  };
  walk(root, true);
  return slotIds;
}
function normalizeComponentBindingForDefinition(binding, component) {
  const nextBinding = cloneComponentBinding(binding);
  if (!nextBinding) return null;
  const validPropIds = new Set(component.props.map((prop) => prop.id));
  nextBinding.props = Object.fromEntries(
    Object.entries(nextBinding.props).filter(([propId]) => validPropIds.has(propId))
  );
  const validSlotIds = collectComponentSlotIds(component.root);
  const nextSlotContent = Object.fromEntries(
    Object.entries(nextBinding.slotContent || {}).filter(([slotId, children]) => validSlotIds.has(slotId) && Array.isArray(children) && children.length > 0)
  );
  if (Object.keys(nextSlotContent).length > 0) {
    nextBinding.slotContent = nextSlotContent;
  } else {
    delete nextBinding.slotContent;
  }
  return nextBinding;
}
function collectComponentInstanceSlotContent(instanceRoot) {
  const slotContent = Object.fromEntries(
    Object.entries(cloneComponentBinding(instanceRoot.componentInstance)?.slotContent || {}).flatMap(([slotId, children]) => Array.isArray(children) && children.length > 0 ? [[slotId, children.map((child) => JSON.parse(JSON.stringify(child)))]] : [])
  );
  const walk = (node, isRoot = false) => {
    if (!isRoot && node.componentInstance?.componentId) return;
    const slotId = getSlotElementId(node);
    if (slotId) {
      if (node.children.length > 0) {
        slotContent[slotId] = node.children.map((child) => JSON.parse(JSON.stringify(child)));
      }
      return;
    }
    node.children.forEach((child) => walk(child));
  };
  walk(instanceRoot, true);
  return slotContent;
}
function applyComponentInstanceSlotContent(root, binding, options = {}) {
  const { includeSlotContent = true } = options;
  const slotContent = binding?.slotContent || {};
  const walk = (node, isRoot = false) => {
    if (!isRoot && node.componentInstance?.componentId) return;
    const slotId = getSlotElementId(node);
    if (slotId) {
      node.children = includeSlotContent ? (slotContent[slotId] || []).map((child) => JSON.parse(JSON.stringify(child))) : [];
      delete node.content;
      return;
    }
    node.children.forEach((child) => walk(child));
  };
  walk(root, true);
}
function getTextChildren(el) {
  return el.children.filter((child) => child.tag === "text");
}
function getTextChildContent(el) {
  return getTextChildren(el).map((child) => child.content || "").join("");
}
function createTextNode(content) {
  return {
    id: nanoid.nanoid(8),
    tag: "text",
    label: "Text",
    className: "",
    classes: [],
    styles: {},
    queryStyles: {},
    mediaStyles: {},
    attrs: {},
    children: [],
    content
  };
}
function replaceTextChildren(el, content) {
  const textChildren = getTextChildren(el);
  const firstTextChildIndex = el.children.findIndex((child) => child.tag === "text");
  const nextChildren = el.children.filter((child) => child.tag !== "text");
  if (!content) {
    el.children = nextChildren;
    return;
  }
  const nextTextChild = textChildren[0] ? { ...textChildren[0], content } : createTextNode(content);
  const insertIndex = firstTextChildIndex >= 0 ? firstTextChildIndex : 0;
  nextChildren.splice(insertIndex, 0, nextTextChild);
  el.children = nextChildren;
}
function getElementTextContent(el) {
  if (el.tag === "text") return el.content || "";
  if (DIRECT_CONTENT_TAGS.has(el.tag)) return getTextChildContent(el);
  return el.content || "";
}
function setElementTextContent(el, content) {
  if (el.tag === "text") {
    el.content = content;
    return;
  }
  if (DIRECT_CONTENT_TAGS.has(el.tag)) {
    replaceTextChildren(el, content);
    el.content = "";
    return;
  }
  el.content = content;
  if (el.children.length > 0 && el.children.every((child) => child.tag === "text")) {
    el.children = [];
  }
}
function normalizeElementTagValue(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}
function setElementTagName(el, nextTag) {
  const normalizedTag = normalizeElementTagValue(nextTag);
  if (!normalizedTag || el.tag === normalizedTag) return;
  const previousContent = getElementTextContent(el);
  const previousLabel = el.label;
  el.tag = normalizedTag;
  if (!isSlotElement(el)) {
    el.label = getElementLabel(normalizedTag);
  } else {
    el.label = previousLabel;
  }
  if (DIRECT_CONTENT_TAGS.has(normalizedTag)) {
    setElementTextContent(el, previousContent);
  } else if (previousContent) {
    setElementTextContent(el, previousContent);
  } else if (el.children.length > 0 && el.children.every((child) => child.tag === "text")) {
    el.children = [];
  }
}
function normalizeTextComponentPropValue(value) {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return null;
}
function normalizeImageComponentPropValue(value) {
  return normalizeComponentImageValue(value);
}
function normalizeBooleanComponentPropValue(value) {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
}
function normalizeRenderComponentPropValue(value) {
  return normalizeComponentRenderValue(value);
}
function normalizeClassComponentPropValue(value) {
  return normalizeComponentClassValue(value);
}
function getResolvedComponentLinkPropValueById(component, binding, propId) {
  if (!propId) return null;
  const prop = component.props.find((entry) => entry.id === propId && entry.type === "link");
  if (!prop) return null;
  const instanceValue = normalizeComponentLinkValue(binding?.props[propId]);
  if (instanceValue) return instanceValue;
  const defaultValue = normalizeComponentLinkValue(prop.defaultValue);
  if (defaultValue) return defaultValue;
  return null;
}
function cloneComponentAttributeBindings(bindings) {
  if (!bindings) return void 0;
  const nextEntries = Object.entries(bindings).flatMap(([attrKey, binding]) => {
    const namePropId = typeof binding?.namePropId === "string" && binding.namePropId.trim() ? binding.namePropId.trim() : "";
    const valuePropId = typeof binding?.valuePropId === "string" && binding.valuePropId.trim() ? binding.valuePropId.trim() : "";
    if (!namePropId && !valuePropId) return [];
    return [[
      attrKey,
      {
        ...namePropId ? { namePropId } : {},
        ...valuePropId ? { valuePropId } : {}
      }
    ]];
  });
  return nextEntries.length > 0 ? Object.fromEntries(nextEntries) : void 0;
}
function getResolvedComponentTextPropValueById(component, binding, propId) {
  if (!propId) return null;
  const prop = component.props.find((entry) => entry.id === propId && (entry.type === "text" || entry.type === "number"));
  if (!prop) return null;
  if (prop.type === "number") {
    const value = normalizeComponentNumberPropValue(binding?.props[propId], prop);
    return value === null ? null : String(value);
  }
  const instanceValue = normalizeTextComponentPropValue(binding?.props[propId]);
  if (instanceValue !== null) return instanceValue;
  const defaultValue = normalizeTextComponentPropValue(prop.defaultValue);
  if (defaultValue !== null) return defaultValue;
  return null;
}
function getResolvedComponentImagePropValueById(component, binding, propId) {
  if (!propId) return null;
  const prop = component.props.find((entry) => entry.id === propId && entry.type === "image");
  if (!prop) return null;
  const instanceValue = normalizeImageComponentPropValue(binding?.props[propId]);
  if (instanceValue !== null) return instanceValue;
  const defaultValue = normalizeImageComponentPropValue(prop.defaultValue);
  if (defaultValue !== null) return defaultValue;
  return null;
}
function getResolvedComponentVideoPropValueById(component, binding, propId) {
  if (!propId) return null;
  const prop = component.props.find((entry) => entry.id === propId && entry.type === "video");
  if (!prop) return null;
  const instanceValue = normalizeComponentVideoValue(binding?.props[propId]);
  if (instanceValue !== null) return instanceValue;
  const defaultValue = normalizeComponentVideoValue(prop.defaultValue);
  if (defaultValue !== null) return defaultValue;
  return null;
}
function getResolvedComponentBooleanPropValueById(component, binding, propId) {
  if (!propId) return null;
  const prop = component.props.find((entry) => entry.id === propId && entry.type === "boolean");
  if (!prop) return null;
  const instanceValue = normalizeBooleanComponentPropValue(binding?.props[propId]);
  if (instanceValue !== null) return instanceValue;
  const defaultValue = normalizeBooleanComponentPropValue(prop.defaultValue);
  if (defaultValue !== null) return defaultValue;
  return null;
}
function getResolvedComponentTargetPropValueById(component, binding, propId) {
  if (!propId) return null;
  const prop = component.props.find((entry) => entry.id === propId && entry.type === "target");
  if (!prop) return null;
  const instanceValue = normalizeComponentTargetValue(binding?.props[propId]);
  if (instanceValue !== null) return instanceValue;
  const defaultValue = normalizeComponentTargetValue(prop.defaultValue);
  if (defaultValue !== null) return defaultValue;
  return null;
}
function getResolvedComponentRenderPropValueById(component, binding, propId) {
  if (!propId) return null;
  const prop = component.props.find((entry) => entry.id === propId && entry.type === "render");
  if (!prop) return null;
  const instanceValue = normalizeRenderComponentPropValue(binding?.props[propId]);
  if (instanceValue !== null) return instanceValue;
  const defaultValue = normalizeRenderComponentPropValue(prop.defaultValue);
  if (defaultValue !== null) return defaultValue;
  return null;
}
function getResolvedComponentClassPropValueById(component, binding, propId) {
  if (!propId) return null;
  const prop = component.props.find((entry) => entry.id === propId && entry.type === "class");
  if (!prop) return null;
  const instanceValue = normalizeClassComponentPropValue(binding?.props[propId]);
  if (instanceValue !== null) return instanceValue;
  const defaultValue = normalizeClassComponentPropValue(prop.defaultValue);
  if (defaultValue !== null) return defaultValue;
  return null;
}
function getResolvedComponentAttributeStringPropValueById(component, binding, propId) {
  if (!propId) return null;
  return getResolvedComponentTextPropValueById(component, binding, propId) ?? (() => {
    const prop = component.props.find((entry) => entry.id === propId && entry.type === "number");
    if (!prop) return null;
    const value = normalizeComponentNumberPropValue(binding?.props[propId], prop);
    return value === null ? null : String(value);
  })() ?? getResolvedComponentImagePropValueById(component, binding, propId)?.src ?? getResolvedComponentVideoPropValueById(component, binding, propId)?.src;
}
function getResolvedComponentTextPropValue(component, binding, node) {
  return getResolvedComponentTextPropValueById(component, binding, node.componentTextPropId) ?? getElementTextContent(node);
}
function getResolvedComponentTagPropValue(component, binding, node) {
  const resolvedValue = getResolvedComponentTextPropValueById(component, binding, node.componentTagPropId);
  const normalizedTag = normalizeElementTagValue(resolvedValue);
  return normalizedTag || null;
}
function getResolvedElementClassNamesFromComponentOrder(node, component, binding) {
  const combinedEntries = getElementClassOrderEntries(node);
  const resolvedClasses = [];
  combinedEntries.forEach((entry) => {
    const propId = parseComponentClassPropOrderEntry(entry);
    if (!propId) {
      if (!resolvedClasses.includes(entry)) resolvedClasses.push(entry);
      return;
    }
    const resolvedValue = getResolvedComponentClassPropValueById(component, binding, propId);
    resolvedValue?.classes.forEach((className) => {
      const trimmedClassName = className.trim();
      if (!trimmedClassName || resolvedClasses.includes(trimmedClassName)) return;
      resolvedClasses.push(trimmedClassName);
    });
  });
  return resolvedClasses;
}
function applyComponentClassPropsToElement(node, component, binding) {
  const hasClassPropBinding = getElementClassOrderEntries(node).some((entry) => parseComponentClassPropOrderEntry(entry) !== null);
  if (!hasClassPropBinding) {
    delete node.resolvedClassOrder;
    return;
  }
  const resolvedClasses = getResolvedElementClassNamesFromComponentOrder(node, component, binding);
  if (resolvedClasses.length > 0) node.resolvedClassOrder = resolvedClasses;
  else delete node.resolvedClassOrder;
}
function applyComponentAttributePropsToElement(node, component, binding) {
  const sourceBindings = cloneComponentAttributeBindings(node.componentAttributeBindings);
  if (!sourceBindings) return;
  const nextAttrEntries = [];
  const nextBindings = {};
  const supportsLinkBinding = supportsComponentLinkAttributeBinding(node.tag);
  const supportsTargetBinding = node.tag === "a";
  const hrefValuePropId = supportsLinkBinding ? sourceBindings.href?.valuePropId : void 0;
  const resolvedLinkValue = hrefValuePropId ? getResolvedComponentLinkPropValueById(component, binding, hrefValuePropId) : null;
  const targetValuePropId = supportsTargetBinding ? sourceBindings.target?.valuePropId : void 0;
  const resolvedTargetPropValue = targetValuePropId ? getResolvedComponentTargetPropValueById(component, binding, targetValuePropId) : null;
  const resolvedNewTabValue = resolvedTargetPropValue === null && targetValuePropId ? getResolvedComponentBooleanPropValueById(component, binding, targetValuePropId) : null;
  const resolvedTargetValue = supportsTargetBinding ? resolvedTargetPropValue !== null ? resolvedTargetPropValue === "_blank" ? "_blank" : "" : resolvedNewTabValue !== null ? resolvedNewTabValue ? "_blank" : "" : resolvedLinkValue?.target?.trim() || "" : "";
  const sourceAttrKeys = /* @__PURE__ */ new Set([
    ...Object.keys(node.attrs),
    ...Object.keys(sourceBindings)
  ]);
  sourceAttrKeys.forEach((attrKey) => {
    const attrValue = node.attrs[attrKey] ?? "";
    if (supportsTargetBinding && (resolvedLinkValue || resolvedTargetPropValue !== null || resolvedNewTabValue !== null) && attrKey === "target") {
      return;
    }
    const attrBinding = sourceBindings[attrKey];
    if (!attrBinding) {
      if (resolvedLinkValue && attrKey === "href") {
        nextAttrEntries.push([attrKey, resolvedLinkValue.href]);
        if (supportsTargetBinding && resolvedTargetValue) {
          nextAttrEntries.push(["target", resolvedTargetValue]);
        }
        return;
      }
      nextAttrEntries.push([attrKey, attrValue]);
      return;
    }
    const resolvedName = (getResolvedComponentTextPropValueById(component, binding, attrBinding.namePropId) ?? attrKey).trim() || attrKey;
    const resolvedValue = (resolvedLinkValue && attrKey === "href" ? resolvedLinkValue.href : supportsTargetBinding && (resolvedTargetPropValue !== null || resolvedNewTabValue !== null) && attrKey === "target" ? resolvedTargetValue : getResolvedComponentAttributeStringPropValueById(component, binding, attrBinding.valuePropId)) ?? attrValue;
    nextBindings[resolvedName] = attrBinding;
    if (!(supportsTargetBinding && (resolvedTargetPropValue !== null || resolvedNewTabValue !== null) && attrKey === "target" && !resolvedTargetValue)) {
      nextAttrEntries.push([resolvedName, resolvedValue]);
    }
    if (supportsTargetBinding && resolvedLinkValue && attrKey === "href" && resolvedName === "href" && resolvedTargetValue) {
      nextAttrEntries.push(["target", resolvedTargetValue]);
    }
  });
  node.attrs = Object.fromEntries(nextAttrEntries);
  if (Object.keys(nextBindings).length > 0) node.componentAttributeBindings = nextBindings;
  else delete node.componentAttributeBindings;
}
function applyComponentPropsToRoot(root, component, binding) {
  const walk = (node) => {
    if (node.componentRenderPropId) {
      const resolvedRenderMode = getResolvedComponentRenderPropValueById(component, binding, node.componentRenderPropId);
      if (resolvedRenderMode === "remove") node.renderMode = "remove";
      else delete node.renderMode;
    }
    if (node.componentTagPropId) {
      const resolvedTag = getResolvedComponentTagPropValue(component, binding, node);
      if (resolvedTag) {
        setElementTagName(node, resolvedTag);
      }
    }
    if (node.componentTextPropId) {
      const resolvedText = getResolvedComponentTextPropValue(component, binding, node);
      setElementTextContent(node, resolvedText);
    }
    applyComponentClassPropsToElement(node, component, binding);
    applyComponentAttributePropsToElement(node, component, binding);
    node.children.forEach(walk);
  };
  walk(root);
}
function mergeComponentRootMetadata(fileRoot, savedRoot) {
  if (!savedRoot || fileRoot.tag !== savedRoot.tag) return fileRoot;
  if (savedRoot.componentTagPropId !== void 0) {
    fileRoot.componentTagPropId = savedRoot.componentTagPropId;
  } else {
    delete fileRoot.componentTagPropId;
  }
  if (savedRoot.componentTextPropId !== void 0) {
    fileRoot.componentTextPropId = savedRoot.componentTextPropId;
  } else {
    delete fileRoot.componentTextPropId;
  }
  if (savedRoot.componentRenderPropId !== void 0) {
    fileRoot.componentRenderPropId = savedRoot.componentRenderPropId;
  } else {
    delete fileRoot.componentRenderPropId;
  }
  if (savedRoot.componentClassOrder !== void 0) {
    fileRoot.componentClassOrder = [...savedRoot.componentClassOrder];
  } else {
    delete fileRoot.componentClassOrder;
  }
  if (savedRoot.resolvedClassOrder !== void 0) {
    fileRoot.resolvedClassOrder = [...savedRoot.resolvedClassOrder];
  } else {
    delete fileRoot.resolvedClassOrder;
  }
  if (savedRoot.componentAttributeBindings !== void 0) {
    fileRoot.componentAttributeBindings = cloneComponentAttributeBindings(savedRoot.componentAttributeBindings);
  } else {
    delete fileRoot.componentAttributeBindings;
  }
  if (savedRoot.componentInstance !== void 0 && fileRoot.componentInstance === void 0) {
    fileRoot.componentInstance = cloneComponentBinding(savedRoot.componentInstance);
  }
  if (savedRoot.slot !== void 0 && fileRoot.slot === void 0) {
    fileRoot.slot = cloneSlotMetadata(savedRoot.slot);
  }
  const childCount = Math.min(fileRoot.children.length, savedRoot.children.length);
  for (let index = 0; index < childCount; index += 1) {
    const nextChild = fileRoot.children[index];
    const savedChild = savedRoot.children[index];
    if (nextChild && savedChild && nextChild.tag === savedChild.tag) {
      mergeComponentRootMetadata(nextChild, savedChild);
    }
  }
  return fileRoot;
}
function mergeComponentRootStructuralMetadata(fileRoot, savedRoot) {
  if (!savedRoot || fileRoot.tag !== savedRoot.tag) return fileRoot;
  if (savedRoot.componentInstance !== void 0 && fileRoot.componentInstance === void 0) {
    fileRoot.componentInstance = cloneComponentBinding(savedRoot.componentInstance);
  }
  if (savedRoot.slot !== void 0 && fileRoot.slot === void 0) {
    fileRoot.slot = cloneSlotMetadata(savedRoot.slot);
  }
  const childCount = Math.min(fileRoot.children.length, savedRoot.children.length);
  for (let index = 0; index < childCount; index += 1) {
    const nextChild = fileRoot.children[index];
    const savedChild = savedRoot.children[index];
    if (nextChild && savedChild && nextChild.tag === savedChild.tag) {
      mergeComponentRootStructuralMetadata(nextChild, savedChild);
    }
  }
  return fileRoot;
}
function parseComponentTagProps(rawAttrs) {
  const props = {};
  for (const [key, value] of Object.entries(rawAttrs)) {
    if (key === "class" || key === "placeholder") continue;
    props[key] = value;
  }
  return props;
}
function coerceStackiComponentPropValue(prop, value) {
  if (prop?.type === "boolean") return value === "true";
  if (prop?.type === "number") return /^-?\d+(\.\d+)?$/.test(value) ? Number(value) : 0;
  if (prop?.type === "link") return parseSerializedComponentLinkValue(value) || { href: "" };
  if (prop?.type === "image") return parseSerializedComponentImageValue(value) || { src: value };
  if (prop?.type === "video") return parseSerializedComponentVideoValue(value) || { src: value };
  if (prop?.type === "target") return normalizeComponentTargetValue(value) || "_self";
  if (prop?.type === "render") return normalizeComponentRenderValue(value) || "include";
  if (prop?.type === "class") return normalizeComponentClassValue(value) || { classes: [] };
  if (value === "true") return true;
  if (value === "false") return false;
  if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);
  return value;
}
function escapeSourceComponentAttributeValue(value) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}
function escapeSourceComponentTextContent(value) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function findSingleSourceComponentTextPropId(root) {
  const propIds = /* @__PURE__ */ new Set();
  const walk = (node, isRoot = false) => {
    if (!isRoot && node.componentInstance?.componentId) return;
    const propId = typeof node.componentTextPropId === "string" ? node.componentTextPropId.trim() : "";
    if (propId) propIds.add(propId);
    node.children.forEach((child) => walk(child));
  };
  walk(root, true);
  return propIds.size === 1 ? [...propIds][0] : null;
}
function extractInlineComponentTextContent(node) {
  if (!Array.isArray(node?.childNodes) || node.childNodes.length === 0) return null;
  let textContent = "";
  for (const childNode of node.childNodes) {
    if (childNode?.nodeType === 8) continue;
    if (childNode?.nodeType !== 3) return null;
    textContent += childNode.rawText || childNode.text || childNode._rawText || "";
  }
  const normalizedText = textContent.replace(/[\t\n\f\r ]+/g, " ").trim();
  return normalizedText || null;
}
function canPromoteLinkTargetToSourceAttr(component, propId) {
  const hasDedicatedTargetProp = component.props.some((prop) => prop.type === "target");
  if (hasDedicatedTargetProp) return false;
  const linkPropIds = component.props.filter((prop) => prop.type === "link").map((prop) => prop.id);
  return linkPropIds.length === 1 && linkPropIds[0] === propId;
}
function parseComponentSlotContent(node, component, componentLookup) {
  if (!Array.isArray(node.childNodes) || node.childNodes.length === 0) return void 0;
  const slotIds = [...collectComponentSlotIds(component.root)];
  if (slotIds.length === 0) return void 0;
  const slotContent = {};
  const fallbackChildren = [];
  node.childNodes.forEach((childNode) => {
    const childTag = typeof childNode?.tagName === "string" ? childNode.tagName.toLowerCase() : "";
    if (childNode?.nodeType === 1 && (childTag === STACKI_SLOT_FILL_TAG || childTag === STACKI_SLOT_TAG)) {
      const fillAttrs = childNode.attributes || {};
      const slotId = typeof fillAttrs[STACKI_SLOT_ID_ATTR] === "string" ? fillAttrs[STACKI_SLOT_ID_ATTR].trim() : "";
      const resolvedSlotId = slotId || (slotIds.length === 1 ? slotIds[0] : "");
      if (!resolvedSlotId) return;
      const fillChildren = Array.isArray(childNode.childNodes) ? childNode.childNodes.map((slotChild) => nodeToSerializedEditorElement(slotChild, componentLookup)).filter((slotChild) => slotChild !== null) : [];
      if (fillChildren.length === 0) return;
      slotContent[resolvedSlotId] = fillChildren;
      return;
    }
    const parsedChild = nodeToSerializedEditorElement(childNode, componentLookup);
    if (parsedChild) fallbackChildren.push(parsedChild);
  });
  if (fallbackChildren.length > 0 && slotIds.length === 1 && !slotContent[slotIds[0]]) {
    slotContent[slotIds[0]] = fallbackChildren;
  }
  return Object.keys(slotContent).length > 0 ? slotContent : void 0;
}
function nodeToSerializedEditorElement(node, componentLookup) {
  const getNodeText = (target) => target?.rawText || target?.text || target?._rawText || "";
  const collapsibleWhitespaceRe = /[\t\n\f\r ]+/g;
  const whitespaceOnlyRe = /^[\t\n\f\r ]+$/;
  const whitespacePreservingTags = /* @__PURE__ */ new Set(["pre", "textarea", "style", "script"]);
  const inlineWhitespaceBoundaryTags = /* @__PURE__ */ new Set([
    "a",
    "abbr",
    "b",
    "bdi",
    "bdo",
    "cite",
    "code",
    "data",
    "del",
    "dfn",
    "em",
    "i",
    "ins",
    "kbd",
    "label",
    "mark",
    "q",
    "rp",
    "rt",
    "ruby",
    "s",
    "samp",
    "small",
    "span",
    "strong",
    "sub",
    "sup",
    "time",
    "u",
    "var"
  ]);
  const isInlineWhitespaceBoundaryNode = (target) => {
    if (!target) return false;
    if (target.nodeType === 3) {
      const text = getNodeText(target);
      return Boolean(text && !whitespaceOnlyRe.test(text));
    }
    if (target.nodeType !== 1) return false;
    const tagName = typeof target.tagName === "string" ? target.tagName.toLowerCase() : "";
    return inlineWhitespaceBoundaryTags.has(tagName);
  };
  const getAdjacentMeaningfulSibling = (target, direction) => {
    const parentChildNodes = Array.isArray(target?.parentNode?.childNodes) ? target.parentNode.childNodes : null;
    const siblingStep = direction === "previousSibling" ? -1 : 1;
    let current = target?.[direction] ?? null;
    if (!current && parentChildNodes) {
      const currentIndex = parentChildNodes.indexOf(target);
      if (currentIndex >= 0) {
        current = parentChildNodes[currentIndex + siblingStep] ?? null;
      }
    }
    while (current) {
      if (current.nodeType === 8) {
        if (parentChildNodes) {
          const currentIndex = parentChildNodes.indexOf(current);
          current = currentIndex >= 0 ? parentChildNodes[currentIndex + siblingStep] ?? null : current[direction] ?? null;
        } else {
          current = current[direction] ?? null;
        }
        continue;
      }
      if (current.nodeType === 3) {
        const text = getNodeText(current);
        if (!text || whitespaceOnlyRe.test(text)) {
          if (parentChildNodes) {
            const currentIndex = parentChildNodes.indexOf(current);
            current = currentIndex >= 0 ? parentChildNodes[currentIndex + siblingStep] ?? null : current[direction] ?? null;
          } else {
            current = current[direction] ?? null;
          }
          continue;
        }
      }
      return current;
    }
    return null;
  };
  const getAdjacentMeaningfulBoundarySibling = (target, direction) => {
    let current = target;
    while (current) {
      const sibling = getAdjacentMeaningfulSibling(current, direction);
      if (sibling) return sibling;
      const parent = current?.parentNode ?? null;
      if (!parent || parent.nodeType !== 1) return null;
      const parentTag = typeof parent.tagName === "string" ? parent.tagName.toLowerCase() : "";
      if (!inlineWhitespaceBoundaryTags.has(parentTag)) return null;
      current = parent;
    }
    return null;
  };
  const normalizeTextNodeContent = (target) => {
    const rawText = getNodeText(target);
    if (!rawText) return null;
    const parentTag = typeof target?.parentNode?.tagName === "string" ? target.parentNode.tagName.toLowerCase() : "";
    if (whitespacePreservingTags.has(parentTag)) return rawText;
    const previousSibling = getAdjacentMeaningfulBoundarySibling(target, "previousSibling");
    const nextSibling = getAdjacentMeaningfulBoundarySibling(target, "nextSibling");
    if (whitespaceOnlyRe.test(rawText)) {
      return previousSibling && nextSibling && isInlineWhitespaceBoundaryNode(previousSibling) && isInlineWhitespaceBoundaryNode(nextSibling) ? " " : null;
    }
    let normalized = rawText.replace(collapsibleWhitespaceRe, " ");
    if (!previousSibling) normalized = normalized.replace(/^ +/, "");
    if (!nextSibling) normalized = normalized.replace(/ +$/, "");
    return normalized || null;
  };
  if (node.nodeType === 8) {
    return {
      id: nanoid.nanoid(8),
      tag: "comment",
      label: "HTML Comment",
      className: "",
      classes: [],
      styles: {},
      queryStyles: {},
      mediaStyles: {},
      attrs: {},
      children: [],
      content: node.rawText || node.text || node._rawText || ""
    };
  }
  if (node.nodeType === 3) {
    const text = normalizeTextNodeContent(node);
    if (text === null) return null;
    return {
      id: nanoid.nanoid(8),
      tag: "text",
      label: "Text",
      className: "",
      classes: [],
      styles: {},
      queryStyles: {},
      mediaStyles: {},
      attrs: {},
      children: [],
      content: text
    };
  }
  if (node.nodeType !== 1) return null;
  const rawTag = typeof node.rawTagName === "string" ? node.rawTagName : typeof node.tagName === "string" ? node.tagName : "";
  const tag = rawTag.toLowerCase();
  if (!tag) return null;
  const rawAttrs = node.attributes || {};
  if (isPascalCaseTag(rawTag) && componentLookup) {
    const component = Array.from(componentLookup.values()).find((c) => toPascalCase(c.name) === rawTag) || null;
    if (component) {
      const rawProps = parseComponentTagProps(rawAttrs);
      const genericTargetAttr = normalizeComponentTargetValue(rawAttrs.target);
      const inlineTextPropId = findSingleSourceComponentTextPropId(component.root);
      const props = {};
      for (const [attrName, value] of Object.entries(rawProps)) {
        const propDef = findPropByAttrName(component.props, attrName);
        if (attrName === "target" && !propDef) continue;
        props[propDef ? propDef.id : attrName] = coerceStackiComponentPropValue(propDef, value);
      }
      if (inlineTextPropId && !Object.prototype.hasOwnProperty.call(props, inlineTextPropId)) {
        const inlineTextContent = extractInlineComponentTextContent(node);
        if (inlineTextContent !== null) {
          const inlineTextProp = component.props.find((prop) => prop.id === inlineTextPropId);
          props[inlineTextPropId] = coerceStackiComponentPropValue(inlineTextProp, inlineTextContent);
        }
      }
      if (genericTargetAttr === "_blank") {
        const promotableLinkProp = component.props.find((prop) => prop.type === "link" && canPromoteLinkTargetToSourceAttr(component, prop.id));
        if (promotableLinkProp) {
          const currentLinkValue = normalizeComponentLinkValue(props[promotableLinkProp.id]) || { href: "" };
          props[promotableLinkProp.id] = {
            href: currentLinkValue.href,
            target: "_blank",
            ...currentLinkValue.mode ? { mode: currentLinkValue.mode } : {}
          };
        }
      }
      component.props.forEach((prop) => {
        if (prop.type !== "target") return;
        const attrName = buildPropAttrName(prop);
        if (Object.prototype.hasOwnProperty.call(rawProps, attrName)) return;
        if (normalizeComponentTargetValue(prop.defaultValue) !== "_blank") return;
        props[prop.id] = "_self";
      });
      const slotContent = parseComponentSlotContent(node, component, componentLookup);
      const instanceRoot = JSON.parse(JSON.stringify(component.root));
      assignFreshIds(instanceRoot);
      const binding = normalizeComponentBindingForDefinition({
        componentId: component.id,
        props,
        ...slotContent ? { slotContent } : {}
      }, component);
      instanceRoot.componentInstance = binding;
      applyComponentPropsToRoot(instanceRoot, component, binding);
      applyComponentInstanceSlotContent(instanceRoot, binding);
      return instanceRoot;
    }
    return {
      id: nanoid.nanoid(8),
      tag: "div",
      label: `Missing Component: ${rawTag}`,
      className: "",
      classes: [],
      styles: {},
      queryStyles: {},
      mediaStyles: {},
      attrs: {},
      children: [],
      content: `Component "${rawTag}" not found`
    };
  }
  if (tag === STACKI_SLOT_TAG) {
    const classNames2 = typeof rawAttrs.class === "string" ? rawAttrs.class.split(/\s+/).filter(Boolean) : [];
    const className2 = classNames2[0] || "";
    const classes2 = className2 ? classNames2.slice(1) : classNames2;
    const slotLabel = typeof rawAttrs[STACKI_SLOT_LABEL_ATTR] === "string" ? rawAttrs[STACKI_SLOT_LABEL_ATTR].trim() : "";
    const slotId = typeof rawAttrs[STACKI_SLOT_ID_ATTR] === "string" ? rawAttrs[STACKI_SLOT_ID_ATTR].trim() : "";
    const slotTag = typeof rawAttrs[STACKI_SLOT_TAG_ATTR] === "string" ? rawAttrs[STACKI_SLOT_TAG_ATTR].trim().toLowerCase() : "";
    const attrs2 = {};
    Object.entries(rawAttrs).forEach(([key, value]) => {
      if (key === "class" || key === "placeholder" || key === STACKI_SLOT_ID_ATTR || key === STACKI_SLOT_LABEL_ATTR || key === STACKI_SLOT_RENDER_ATTR || key === STACKI_SLOT_TAG_ATTR) {
        return;
      }
      attrs2[key] = typeof value === "string" ? value : `${value ?? ""}`;
    });
    const children2 = Array.isArray(node.childNodes) ? node.childNodes.map((child) => nodeToSerializedEditorElement(child, componentLookup)).filter((child) => child !== null) : [];
    return {
      id: nanoid.nanoid(8),
      tag: slotTag || DEFAULT_SLOT_ELEMENT_TAG,
      label: slotLabel || "Slot",
      className: className2,
      classes: classes2,
      styles: {},
      queryStyles: {},
      mediaStyles: {},
      attrs: attrs2,
      children: children2,
      slot: {
        ...slotId ? { slotId } : { slotId: nanoid.nanoid(8) },
        renderAsElement: rawAttrs[STACKI_SLOT_RENDER_ATTR] === "" || rawAttrs[STACKI_SLOT_RENDER_ATTR] === "true"
      }
    };
  }
  const classNames = typeof rawAttrs.class === "string" ? rawAttrs.class.split(/\s+/).filter(Boolean) : [];
  const className = classNames[0] || "";
  const classes = className ? classNames.slice(1) : classNames;
  const attrs = {};
  Object.entries(rawAttrs).forEach(([key, value]) => {
    if (key === "class" || key === "placeholder") return;
    attrs[key] = typeof value === "string" ? value : `${value ?? ""}`;
  });
  let children = [];
  let content = "";
  if (tag === "style" || tag === "script") {
    content = node.innerHTML || node.textContent || "";
  } else if (Array.isArray(node.childNodes)) {
    children = node.childNodes.map((child) => nodeToSerializedEditorElement(child, componentLookup)).filter((child) => child !== null);
    if (DIRECT_CONTENT_TAGS.has(tag) && children.length > 0 && children.every((child) => child.tag === "text")) {
      content = children.map((child) => child.content || "").join("");
      children = [];
    }
  }
  return {
    id: nanoid.nanoid(8),
    tag,
    label: getElementLabel(tag),
    className,
    classes,
    styles: {},
    queryStyles: {},
    mediaStyles: {},
    attrs,
    children,
    ...content ? { content } : {},
    ...(tag === "input" || tag === "textarea") && typeof rawAttrs.placeholder === "string" ? { placeholder: rawAttrs.placeholder } : {}
  };
}
function assignFreshIds(element) {
  element.id = nanoid.nanoid(8);
  for (const child of element.children) {
    assignFreshIds(child);
  }
}
function parseHtmlToSerializedEditorRoot(html, componentLookup) {
  const root = nodeHtmlParser.parse(html, PARSE_HTML_OPTIONS);
  const htmlNode = root.querySelector("html");
  let rootElement = htmlNode ? nodeToSerializedEditorElement(htmlNode, componentLookup) : null;
  if (!rootElement) {
    rootElement = {
      id: nanoid.nanoid(8),
      tag: "html",
      label: "HTML",
      className: "",
      classes: [],
      styles: {},
      queryStyles: {},
      mediaStyles: {},
      attrs: { lang: "en" },
      children: []
    };
  }
  let head = rootElement.children.find((child) => child.tag === "head");
  if (!head) {
    head = {
      id: nanoid.nanoid(8),
      tag: "head",
      label: "Head",
      className: "",
      classes: [],
      styles: {},
      queryStyles: {},
      mediaStyles: {},
      attrs: {},
      children: []
    };
    rootElement.children.unshift(head);
  }
  const body = rootElement.children.find((child) => child.tag === "body");
  if (!body) {
    rootElement.children.push({
      id: nanoid.nanoid(8),
      tag: "body",
      label: "Body",
      className: "",
      classes: [],
      styles: {},
      queryStyles: {},
      mediaStyles: {},
      attrs: {},
      children: []
    });
  }
  normalizeFormattingWhitespaceInTree(rootElement);
  return rootElement;
}
function extractHtmlFromPageSource(relativePath, rawContent) {
  if (isPageJsFile(relativePath)) {
    const parsed = parsePageJsFile(rawContent);
    if (!parsed) return rawContent;
    return parsed.template;
  }
  return rawContent;
}
function buildFallbackProjectPageDocument(relativePath, rawContent, componentLookup) {
  const normalizedRelativePath = normalizeProjectDocumentPath(relativePath);
  const htmlContent = extractHtmlFromPageSource(relativePath, rawContent);
  const root = parseHtmlToSerializedEditorRoot(htmlContent, componentLookup);
  return {
    path: normalizedRelativePath,
    root,
    // Generate renderedHtml from the resolved root tree so that component instances
    // are expanded to their actual HTML, not left as component tags.
    renderedHtml: serializeRootToHtml(root)
  };
}
function migrateElementHtmlLinksToPageJs(element) {
  if (element.attrs?.href && /\.html?$/i.test(element.attrs.href) && !/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(element.attrs.href)) {
    element.attrs = { ...element.attrs, href: element.attrs.href.replace(/\.html?$/i, ".page.js") };
  }
  if (element.componentInstance?.props) {
    for (const [key, value] of Object.entries(element.componentInstance.props)) {
      if (value !== null && typeof value === "object" && "href" in value && typeof value.href === "string") {
        const linkHref = value.href;
        if (/\.html?$/i.test(linkHref) && !/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(linkHref)) {
          element.componentInstance = {
            ...element.componentInstance,
            props: {
              ...element.componentInstance.props,
              [key]: { ...value, href: linkHref.replace(/\.html?$/i, ".page.js") }
            }
          };
        }
      }
    }
  }
  for (const child of element.children) {
    migrateElementHtmlLinksToPageJs(child);
  }
}
function migrateComponentDefinitionHtmlLinks(components) {
  for (const component of components) {
    for (const prop of component.props) {
      if (prop.type === "link" && prop.defaultValue != null && typeof prop.defaultValue === "object") {
        const linkValue = prop.defaultValue;
        if (linkValue.href && /\.html?$/i.test(linkValue.href) && !/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(linkValue.href)) {
          prop.defaultValue = { ...linkValue, href: linkValue.href.replace(/\.html?$/i, ".page.js") };
        }
      }
    }
    if (component.root) {
      migrateElementHtmlLinksToPageJs(component.root);
    }
  }
}
function collectActivePageDocuments(files, savedPageDocuments, componentLookup) {
  const countEditorOnlyStructures = (root) => {
    if (!root) return 0;
    let count = 0;
    const walk = (node) => {
      if (node.componentInstance?.componentId) {
        count += 1;
        count += Object.keys(node.componentInstance.slotContent || {}).length;
      }
      if (node.slot) count += 1;
      node.children.forEach(walk);
    };
    walk(root);
    return count;
  };
  const savedDocumentsByRelativePath = new Map(
    Object.entries(savedPageDocuments).map(([relativePath, document]) => [
      normalizeProjectDocumentPath(relativePath),
      {
        ...document,
        path: normalizeProjectDocumentPath(relativePath)
      }
    ])
  );
  return Object.fromEntries(
    files.filter((file) => file.type === "html" && typeof file.content === "string").map((file) => {
      const normalizedRelativePath = normalizeProjectDocumentPath(file.relativePath);
      const savedDocument = savedDocumentsByRelativePath.get(normalizedRelativePath) || (isPageJsFile(normalizedRelativePath) ? savedDocumentsByRelativePath.get(normalizedRelativePath.replace(/\.page\.js$/i, ".html")) : null) || (!isPageJsFile(normalizedRelativePath) ? savedDocumentsByRelativePath.get(normalizedRelativePath.replace(/\.html?$/i, ".page.js")) : null);
      let document;
      if (componentLookup && componentLookup.size > 0) {
        const fallbackDocument = buildFallbackProjectPageDocument(normalizedRelativePath, file.content, componentLookup);
        if (savedDocument && countEditorOnlyStructures(savedDocument.root) > countEditorOnlyStructures(fallbackDocument.root)) {
          document = {
            ...savedDocument,
            path: normalizedRelativePath,
            renderedHtml: fallbackDocument.renderedHtml
          };
        } else {
          document = fallbackDocument;
        }
      } else {
        document = savedDocument || buildFallbackProjectPageDocument(normalizedRelativePath, file.content, componentLookup);
      }
      migrateElementHtmlLinksToPageJs(document.root);
      return [normalizedRelativePath, document];
    })
  );
}
function hasSourceDirectory(folderPath) {
  const sourceDir = path.join(folderPath, SOURCE_DIR);
  return fs.existsSync(sourceDir) && fs.statSync(sourceDir).isDirectory();
}
function isStackiAppWorkspace(folderPath) {
  const packageJsonPath = path.join(folderPath, "package.json");
  const electronViteConfigPath = path.join(folderPath, "electron.vite.config.ts");
  const mainEntryPath = path.join(folderPath, "src", "main", "index.ts");
  const preloadEntryPath = path.join(folderPath, "src", "preload", "index.ts");
  const rendererEntryPath = path.join(folderPath, "src", "renderer", "main.tsx");
  if (!fs.existsSync(packageJsonPath) || !fs.existsSync(electronViteConfigPath) || !fs.existsSync(mainEntryPath) || !fs.existsSync(preloadEntryPath) || !fs.existsSync(rendererEntryPath)) {
    return false;
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
    return parsed.name === "stacki" || parsed.build?.appId === "com.stacki.editor";
  } catch {
    return true;
  }
}
function buildComponentLookup(components) {
  const lookup = /* @__PURE__ */ new Map();
  for (const component of components) {
    lookup.set(component.id, component);
  }
  return lookup;
}
function reconcileComponentPropIdsByKey(fileProps, savedProps) {
  const savedById = new Map(savedProps.map((prop) => [prop.id, prop]));
  const savedByKey = new Map(savedProps.map((prop) => [`${prop.type}:${prop.key.trim().toLowerCase()}`, prop]));
  return fileProps.map((fileProp) => {
    const saved = savedById.get(fileProp.id) || savedByKey.get(`${fileProp.type}:${fileProp.key.trim().toLowerCase()}`);
    return saved ? { ...fileProp, id: saved.id } : fileProp;
  });
}
function reconcileComponentIds(fileComponents, savedComponents) {
  const savedById = new Map(savedComponents.map((component) => [component.id, component]));
  const savedByName = new Map(savedComponents.map((c) => [c.name, c]));
  const usedSavedIds = /* @__PURE__ */ new Set();
  const merged = fileComponents.map((parsedFile) => {
    const fileComp = parsedFile.component;
    const saved = (parsedFile.hasExplicitComponentId ? savedById.get(fileComp.id) : null) || savedByName.get(fileComp.name);
    if (saved) {
      usedSavedIds.add(saved.id);
      if (parsedFile.format === "json") {
        const mergedRoot = mergeComponentRootStructuralMetadata(fileComp.root, saved.root);
        const pathToIdMap2 = buildPathToElementIdMap(mergedRoot);
        const reconciledProps = parsedFile.hasExplicitPropIds ? fileComp.props : reconcileComponentPropIdsByKey(fileComp.props, saved.props);
        const resolvedProps = reconciledProps.map((prop) => {
          if (prop.type !== "variant" || !Array.isArray(prop.options)) return prop;
          return { ...prop, options: convertVariantOverrideKeysToElementId(prop.options, pathToIdMap2) };
        });
        return {
          ...fileComp,
          id: parsedFile.hasExplicitComponentId ? fileComp.id : saved.id,
          root: mergedRoot,
          props: resolvedProps
        };
      }
      return {
        ...saved,
        // Component prop bindings currently live in metadata, so merge that metadata
        // back onto the latest source markup before resolving instances from source/.
        root: mergeComponentRootMetadata(fileComp.root, saved.root),
        props: fileComp.props.length > 0 ? fileComp.props : saved.props
      };
    }
    const pathToIdMap = buildPathToElementIdMap(fileComp.root);
    return {
      ...fileComp,
      props: fileComp.props.map((prop) => {
        if (prop.type !== "variant" || !Array.isArray(prop.options)) return prop;
        return { ...prop, options: convertVariantOverrideKeysToElementId(prop.options, pathToIdMap) };
      })
    };
  });
  for (const saved of savedComponents) {
    if (!usedSavedIds.has(saved.id)) {
      merged.push(saved);
    }
  }
  return merged;
}
function serializeElementToSourceHtml(el, components, depth) {
  if (el.componentInstance?.componentId) {
    const component = components.find((c) => c.id === el.componentInstance?.componentId);
    if (component) {
      const pad = "  ".repeat(depth);
      const propParts = [];
      const instanceProps = el.componentInstance.props || {};
      const propById = new Map(component.props.map((p) => [p.id, p]));
      const slotContent = collectComponentInstanceSlotContent(el);
      const slotEntries = Object.entries(slotContent || {}).filter(([, children]) => children.length > 0);
      const inlineTextPropId = slotEntries.length === 0 ? findSingleSourceComponentTextPropId(component.root) : null;
      let inlineTextContent = null;
      for (const [propId, value] of Object.entries(instanceProps)) {
        if (value === null || value === void 0) continue;
        const propDef = propById.get(propId);
        const attrName = propDef ? buildPropAttrName(propDef) : propId;
        if (isStringBindableComponentProp(propDef) && inlineTextPropId === propId) {
          inlineTextContent = normalizeTextComponentPropValue(value) ?? "";
          continue;
        }
        if (propDef?.type === "link") {
          const normalizedLinkValue = normalizeComponentLinkValue(value) || { href: "" };
          propParts.push(`${attrName}="${escapeSourceComponentAttributeValue(normalizedLinkValue.href)}"`);
          if (normalizedLinkValue.target === "_blank" && canPromoteLinkTargetToSourceAttr(component, propId)) {
            propParts.push('target="_blank"');
          }
          continue;
        }
        if (propDef?.type === "target") {
          const normalizedTargetValue = normalizeComponentTargetValue(value);
          if (normalizedTargetValue === "_blank") {
            propParts.push(`${attrName}="_blank"`);
          }
          continue;
        }
        const attrValue = propDef?.type === "image" ? serializeComponentImageValue(normalizeComponentImageValue(value) || { src: "" }) : propDef?.type === "video" ? serializeComponentVideoValue(normalizeComponentVideoValue(value) || { src: "" }) : propDef?.type === "class" ? serializeComponentClassValue(value) : String(value);
        propParts.push(`${attrName}="${escapeSourceComponentAttributeValue(attrValue)}"`);
      }
      component.props.forEach((prop) => {
        if (prop.type !== "target") return;
        if (Object.prototype.hasOwnProperty.call(instanceProps, prop.id)) return;
        const normalizedDefaultTarget = normalizeComponentTargetValue(prop.defaultValue);
        if (normalizedDefaultTarget !== "_blank") return;
        propParts.push(`${buildPropAttrName(prop)}="_blank"`);
      });
      const componentTag = toPascalCase(component.name);
      const attrsStr = propParts.length ? ` ${propParts.join(" ")}` : "";
      const tagOpen = `${pad}<${componentTag}${attrsStr}>`;
      if (slotEntries.length === 0) {
        const innerContent = inlineTextContent !== null ? escapeSourceComponentTextContent(inlineTextContent) : "";
        return `${tagOpen}${innerContent}</${componentTag}>`;
      }
      let html = `${tagOpen}
`;
      slotEntries.forEach(([slotId, children]) => {
        html += `${pad}  <${STACKI_SLOT_TAG} ${STACKI_SLOT_ID_ATTR}="${slotId}">
`;
        children.forEach((child) => {
          const serializedChild = serializeElementToSourceHtml(child, components, depth + 2);
          if (serializedChild) html += `${serializedChild}
`;
        });
        html += `${pad}  </${STACKI_SLOT_TAG}>
`;
      });
      html += `${pad}</${componentTag}>`;
      return html;
    }
  }
  return serializeEditorElementToHtml(el, depth);
}
function buildSourcePageHtml(root, components) {
  function serialize(el, depth) {
    if (el.componentInstance?.componentId) {
      return serializeElementToSourceHtml(el, components, depth);
    }
    if (isComponentRootElement(el)) {
      return el.children.map((child) => serialize(child, depth)).filter(Boolean).join("");
    }
    if (isSlotElement(el) && !shouldRenderSlotAsElement(el)) {
      const parts = [];
      if (el.content) parts.push(`${"  ".repeat(depth)}${el.content}`);
      el.children.forEach((child) => {
        const serializedChild = serialize(child, depth);
        if (serializedChild) parts.push(serializedChild);
      });
      return parts.join("\n");
    }
    const pad = "  ".repeat(depth);
    if (el.tag === "comment") return `${pad}<!--${el.content || ""}-->`;
    if (el.tag === "text") return `${pad}${el.content || ""}`;
    const VOID = /* @__PURE__ */ new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);
    const attrParts = [];
    const allClasses = getElementRenderedClassNames(el);
    if (allClasses.length) attrParts.push(`class="${allClasses.join(" ")}"`);
    for (const [key, value] of Object.entries(el.attrs || {})) {
      if (value === "") attrParts.push(key);
      else attrParts.push(`${key}="${value}"`);
    }
    if (el.placeholder && (el.tag === "input" || el.tag === "textarea")) {
      attrParts.push(`placeholder="${el.placeholder}"`);
    }
    const attrsStr = attrParts.length ? " " + attrParts.join(" ") : "";
    if (VOID.has(el.tag)) return `${pad}<${el.tag}${attrsStr}>`;
    if (el.tag === "style" || el.tag === "script") {
      return el.content ? `${pad}<${el.tag}${attrsStr}>
${el.content}
${pad}</${el.tag}>` : `${pad}<${el.tag}${attrsStr}></${el.tag}>`;
    }
    const inlineTextChildren = serializeInlineTextOnlyChildren(el, pad, attrsStr);
    if (inlineTextChildren) return inlineTextChildren;
    if (el.children && el.children.length > 0) {
      let html = `${pad}<${el.tag}${attrsStr}>
`;
      for (const child of el.children) {
        html += serialize(child, depth + 1) + "\n";
      }
      html += `${pad}</${el.tag}>`;
      return html;
    }
    if (el.content) return `${pad}<${el.tag}${attrsStr}>${el.content}</${el.tag}>`;
    return `${pad}<${el.tag}${attrsStr}></${el.tag}>`;
  }
  return `<!DOCTYPE html>
${serialize(root, 0)}
`;
}
function buildSourcePageJs(root, components) {
  const sourceHtml = buildSourcePageHtml(root, components);
  const usedComponents = collectUsedComponentImports(root, components);
  return buildPageJsFile(usedComponents, sourceHtml);
}
function collectUsedComponentImports(root, components) {
  const seen = /* @__PURE__ */ new Map();
  const componentsById = new Map(components.map((c) => [c.id, c]));
  const walk = (el) => {
    if (el.componentInstance?.componentId) {
      const component = componentsById.get(el.componentInstance.componentId);
      if (component) seen.set(toPascalCase(component.name), component.name);
    }
    el.children.forEach(walk);
  };
  walk(root);
  return Array.from(seen.entries()).map(([tagName, fileName]) => ({ tagName, fileName })).sort((a, b) => a.tagName.localeCompare(b.tagName));
}
function convertSourceHtmlToPageJs(sourceDir) {
  if (!fs.existsSync(sourceDir) || !fs.statSync(sourceDir).isDirectory()) return;
  const walkAndConvert = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith(".")) continue;
      if (entry.name === SOURCE_COMPONENTS_DIR) continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walkAndConvert(fullPath);
        continue;
      }
      const ext = path.extname(entry.name).toLowerCase();
      if (ext !== ".html" && ext !== ".htm") continue;
      const jsName = entry.name.replace(/\.html?$/i, ".page.js");
      const jsPath = path.join(dir, jsName);
      if (fs.existsSync(jsPath)) continue;
      const rawHtml = fs.readFileSync(fullPath, "utf-8");
      const htmlContent = rawHtml.replace(
        /(\bhref\s*=\s*["'])([^"'#][^"']*\.html?)(["'])/gi,
        (match, prefix, href, suffix) => {
          if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(href)) return match;
          return `${prefix}${href.replace(/\.html?$/i, ".page.js")}${suffix}`;
        }
      );
      const pageJs = buildPageJsFile([], htmlContent.trim());
      markProjectFolderMutation(jsPath);
      fs.writeFileSync(jsPath, pageJs, "utf-8");
      markProjectFolderMutation(fullPath);
      fs.rmSync(fullPath, { force: true });
    }
  };
  walkAndConvert(sourceDir);
}
function migrateRawHtmlProject(folderPath) {
  const publicDir = path.join(folderPath, PUBLIC_DIR);
  const sourceDir = path.join(folderPath, SOURCE_DIR);
  const sourceComponentsDir = path.join(sourceDir, SOURCE_COMPONENTS_DIR);
  const existingEntries = fs.readdirSync(folderPath, { withFileTypes: true }).filter((entry) => {
    if (entry.name.startsWith(".")) return false;
    if (isProjectMetadataFileName(entry.name)) return false;
    if (entry.name === LEGACY_PROJECT_ASSET_METADATA_FILE) return false;
    if (entry.name === SOURCE_DIR || entry.name === PUBLIC_DIR) return false;
    return true;
  });
  if (existingEntries.length === 0) return;
  fs.mkdirSync(publicDir, { recursive: true });
  fs.mkdirSync(sourceDir, { recursive: true });
  fs.mkdirSync(sourceComponentsDir, { recursive: true });
  for (const entry of existingEntries) {
    const oldPath = path.join(folderPath, entry.name);
    const newPath = path.join(publicDir, entry.name);
    fs.renameSync(oldPath, newPath);
  }
  syncPublicFilesToSource(folderPath, { includeEditableFiles: true, overwriteExisting: true });
  convertSourceHtmlToPageJs(path.join(folderPath, SOURCE_DIR));
}
function openProjectFolder(folderPath) {
  if (!fs.existsSync(folderPath) || !fs.statSync(folderPath).isDirectory()) return null;
  const hasMetadata = !!findProjectMetadataPath(folderPath);
  const hasSource = hasSourceDirectory(folderPath);
  if (!hasMetadata && !hasSource && !isStackiAppWorkspace(folderPath)) {
    migrateRawHtmlProject(folderPath);
  }
  const useSourceDir = hasSourceDirectory(folderPath);
  const sourceDir = path.join(folderPath, SOURCE_DIR);
  const scanRoot = useSourceDir ? sourceDir : folderPath;
  if (useSourceDir) {
    syncPublicFilesToSource(folderPath);
    convertSourceHtmlToPageJs(sourceDir);
  }
  const files = [];
  if (fs.existsSync(scanRoot) && fs.statSync(scanRoot).isDirectory()) {
    for (const entry of fs.readdirSync(scanRoot, { withFileTypes: true })) {
      if (entry.name === SOURCE_COMPONENTS_DIR) continue;
      if (entry.name.startsWith(".")) continue;
      if (isProjectMetadataFileName(entry.name) || entry.name === LEGACY_PROJECT_ASSET_METADATA_FILE) continue;
      const fullPath = path.join(scanRoot, entry.name);
      if (entry.isDirectory()) {
        walkProjectFiles(fullPath, scanRoot, files, useSourceDir);
      } else {
        const resolved = useSourceDir ? migrateSourceFileIfNeeded(fullPath, entry.name) : { path: fullPath, name: entry.name };
        const type = classifyProjectFileType(resolved.name);
        files.push({
          path: resolved.path,
          relativePath: path.relative(scanRoot, resolved.path),
          type,
          ...hasTextProjectFileContent(resolved.name, type) ? { content: fs.readFileSync(resolved.path, "utf-8") } : {}
        });
      }
    }
  }
  const projectMetadataPath = getProjectMetadataPath(folderPath);
  const savedProjectMetadata = readProjectMetadata(folderPath);
  const savedComponentLookup = buildComponentLookup(savedProjectMetadata?.components || []);
  const parsedFileComponents = useSourceDir ? readComponentFiles(folderPath, savedComponentLookup) : [];
  const components = useSourceDir && parsedFileComponents.length > 0 ? reconcileComponentIds(parsedFileComponents, savedProjectMetadata?.components || []) : savedProjectMetadata?.components || [];
  migrateComponentDefinitionHtmlLinks(components);
  const componentLookup = buildComponentLookup(components);
  const pageDocuments = collectActivePageDocuments(files, savedProjectMetadata?.pageDocuments || {}, componentLookup);
  const pageDocumentsChanged = JSON.stringify(savedProjectMetadata?.pageDocuments || {}) !== JSON.stringify(pageDocuments);
  const existingSavedAssetFolders = collectProjectAssetFolderPaths(savedProjectMetadata?.assets || []).filter((relativeFolderPath) => {
    const absoluteFolderPath = useSourceDir ? path.join(folderPath, SOURCE_DIR, relativeFolderPath) : path.join(folderPath, relativeFolderPath);
    return fs.existsSync(absoluteFolderPath) && fs.statSync(absoluteFolderPath).isDirectory();
  });
  const mergedPageStructure = mergeProjectPageStructure(
    files.filter((file) => file.type === "html").map((file) => file.relativePath),
    savedProjectMetadata?.pages
  );
  const mergedAssetStructure = mergeProjectAssetStructure(
    files.filter((file) => file.type !== "html").map((file) => file.relativePath),
    savedProjectMetadata?.assets,
    existingSavedAssetFolders
  );
  const mergedVariableStructure = mergeProjectVariableStructure(
    collectRootProjectVariableInfos(files),
    savedProjectMetadata?.variables
  );
  const contentVariables = savedProjectMetadata?.content || [];
  const mergedContentStructure = mergeProjectContentStructure(
    contentVariables.map((variable) => variable.id),
    savedProjectMetadata?.contentStructure
  );
  const mergedComponentStructure = mergeProjectComponentStructure(
    components.map((component) => component.id),
    savedProjectMetadata?.componentStructure
  );
  if (mergedPageStructure.changed || mergedAssetStructure.changed || mergedVariableStructure.changed || mergedContentStructure.changed || mergedComponentStructure.changed || pageDocumentsChanged || !fs.existsSync(projectMetadataPath)) {
    fs.writeFileSync(
      projectMetadataPath,
      stringifyProjectMetadata(
        mergedPageStructure.nodes,
        mergedAssetStructure.nodes,
        mergedVariableStructure.nodes,
        contentVariables,
        mergedContentStructure.nodes,
        components,
        mergedComponentStructure.nodes,
        pageDocuments
      ),
      "utf-8"
    );
  }
  ensureProjectMetadataFileIcon(projectMetadataPath);
  if (useSourceDir) {
    publishProjectToPublic(folderPath, pageDocuments, files);
  }
  const entryFile = chooseEntryHtmlFile(files, useSourceDir ? sourceDir : folderPath);
  if (!entryFile) return null;
  return {
    folderPath,
    entryHtmlPath: entryFile.path,
    htmlContent: entryFile.content || "",
    files,
    projectMetadataPath,
    pageStructure: mergedPageStructure.nodes,
    assetStructure: mergedAssetStructure.nodes,
    variableStructure: mergedVariableStructure.nodes,
    content: contentVariables,
    contentStructure: mergedContentStructure.nodes,
    components,
    componentStructure: mergedComponentStructure.nodes,
    pageDocuments
  };
}
function openProjectPath(pathLike) {
  const folderPath = resolveProjectFolderPath(pathLike);
  if (!folderPath) return null;
  return openProjectFolder(folderPath);
}
function saveProjectFiles(entryHtmlPath, htmlContent, files) {
  markProjectFolderMutation(entryHtmlPath);
  fs.mkdirSync(path.dirname(entryHtmlPath), { recursive: true });
  fs.writeFileSync(entryHtmlPath, htmlContent, "utf-8");
  for (const file of files) {
    if (typeof file.content !== "string") continue;
    markProjectFolderMutation(file.path);
    fs.mkdirSync(path.dirname(file.path), { recursive: true });
    fs.writeFileSync(file.path, file.content, "utf-8");
  }
  return { success: true };
}
function writeProjectFile(filePath, content) {
  markProjectFolderMutation(filePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  if (typeof content === "string") {
    fs.writeFileSync(filePath, content, "utf-8");
  } else {
    fs.writeFileSync(filePath, Buffer.from(content));
  }
  if (isProjectMetadataFileName(path.basename(filePath))) {
    ensureProjectMetadataFileIcon(filePath);
  }
  return { success: true };
}
function writeProjectBinaryFile(filePath, content) {
  markProjectFolderMutation(filePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, Buffer.from(content));
  return { success: true };
}
function createProjectDirectory(directoryPath) {
  markProjectFolderMutation(directoryPath);
  fs.mkdirSync(directoryPath, { recursive: true });
  return { success: true };
}
function renameProjectFile(oldPath, newPath) {
  markProjectFolderMutation(oldPath);
  markProjectFolderMutation(newPath);
  fs.mkdirSync(path.dirname(newPath), { recursive: true });
  fs.renameSync(oldPath, newPath);
  if (isProjectMetadataFileName(path.basename(newPath))) {
    ensureProjectMetadataFileIcon(newPath);
  }
  return { success: true };
}
function copyProjectPath(sourcePath, destinationPath) {
  markProjectFolderMutation(destinationPath);
  fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
  const stats = fs.statSync(sourcePath);
  if (stats.isDirectory()) {
    fs.cpSync(sourcePath, destinationPath, { recursive: true, force: false, errorOnExist: true });
  } else {
    fs.copyFileSync(sourcePath, destinationPath);
  }
  return { success: true };
}
function deleteProjectFile(filePath) {
  markProjectFolderMutation(filePath);
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    if (stats.isDirectory()) {
      fs.rmSync(filePath, { recursive: true, force: true });
    } else {
      fs.rmSync(filePath, { force: true });
    }
  }
  return { success: true };
}
function watchProjectFolder(folderPath, onChange) {
  let timeout = null;
  const scheduleRefresh = (fileName) => {
    const baseName = fileName ? path.basename(fileName) : "";
    if (baseName === LEGACY_PROJECT_ASSET_METADATA_FILE || isProjectMetadataFileName(baseName)) return;
    if (isProjectFolderMuted(folderPath)) return;
    if (fileName && fileName.startsWith(PUBLIC_DIR + "/")) return;
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => {
      const project = openProjectFolder(folderPath);
      if (project) onChange(project);
    }, 60);
  };
  const watcher = fs.watch(
    folderPath,
    { recursive: true },
    (_eventType, fileName) => scheduleRefresh(fileName ?? null)
  );
  return () => {
    if (timeout) clearTimeout(timeout);
    watcher.close();
  };
}
function createNewProjectPageJs(projectName) {
  const templateHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${projectName}</title>
  <link rel="stylesheet" href="${DEFAULT_PROJECT_STYLESHEET_FILE}">
</head>
<body>
  <main>
    <section style="min-height: 100svh; display: flex; align-items: center; justify-content: center; text-align: center; padding: 2rem;">
      <div>
        <h1>${projectName}</h1>
        <p>Start building your website.</p>
      </div>
    </section>
  </main>
  <script src="${DEFAULT_PROJECT_SCRIPT_FILE}"><\/script>
</body>
</html>`;
  return buildPageJsFile([], templateHtml);
}
function createNewProjectPublicHtml(projectName) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${projectName}</title>
  <link rel="stylesheet" href="${DEFAULT_PROJECT_STYLESHEET_FILE}">
</head>
<body>
  <main>
    <section style="min-height: 100svh; display: flex; align-items: center; justify-content: center; text-align: center; padding: 2rem;">
      <div>
        <h1>${projectName}</h1>
        <p>Start building your website.</p>
      </div>
    </section>
  </main>
  <script src="${DEFAULT_PROJECT_SCRIPT_FILE}"><\/script>
</body>
</html>
`;
}
function createNewProjectStyles() {
  return `* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
`;
}
function createNewProjectScript() {
  return `console.log('Project ready')
`;
}
const STACKI_BUILD_FILE = "stacki-build.js";
function getStackiBuildScript() {
  const staticPath = path.resolve(__dirname, "../../static", STACKI_BUILD_FILE);
  if (fs.existsSync(staticPath)) {
    return fs.readFileSync(staticPath, "utf-8");
  }
  const compilerPath = path.resolve(__dirname, "../../compiler/index.js");
  if (fs.existsSync(compilerPath)) {
    return fs.readFileSync(compilerPath, "utf-8");
  }
  return `#!/usr/bin/env node
console.error('Stacki build script not found. Please reinstall or copy stacki-build.js from a Stacki installation.')
process.exit(1)
`;
}
function createNewProject(folderPath) {
  const normalizedFolderPath = path.resolve(folderPath);
  if (fs.existsSync(normalizedFolderPath)) {
    const existingStats = fs.statSync(normalizedFolderPath);
    if (!existingStats.isDirectory()) {
      throw new Error("A file already exists with that project name.");
    }
    if (fs.readdirSync(normalizedFolderPath).length > 0) {
      throw new Error("A folder with that project name already exists and is not empty.");
    }
  } else {
    fs.mkdirSync(normalizedFolderPath, { recursive: true });
  }
  const projectName = path.basename(normalizedFolderPath).trim() || "New Project";
  const sourceDir = path.join(normalizedFolderPath, SOURCE_DIR);
  const sourceComponentsDir = path.join(sourceDir, SOURCE_COMPONENTS_DIR);
  const publicDir = path.join(normalizedFolderPath, PUBLIC_DIR);
  fs.mkdirSync(sourceDir, { recursive: true });
  fs.mkdirSync(sourceComponentsDir, { recursive: true });
  fs.mkdirSync(publicDir, { recursive: true });
  const entryHtmlPath = path.join(sourceDir, DEFAULT_PROJECT_PAGE_FILE);
  const stylesheetPath = path.join(sourceDir, DEFAULT_PROJECT_STYLESHEET_FILE);
  const scriptPath = path.join(sourceDir, DEFAULT_PROJECT_SCRIPT_FILE);
  const metadataPath = getProjectMetadataPath(normalizedFolderPath);
  const pageJsContent = createNewProjectPageJs(projectName);
  const publicHtmlContent = createNewProjectPublicHtml(projectName);
  const cssContent = createNewProjectStyles();
  const jsContent = createNewProjectScript();
  fs.writeFileSync(entryHtmlPath, pageJsContent, "utf-8");
  fs.writeFileSync(stylesheetPath, cssContent, "utf-8");
  fs.writeFileSync(scriptPath, jsContent, "utf-8");
  const buildScriptPath = path.join(normalizedFolderPath, STACKI_BUILD_FILE);
  fs.writeFileSync(buildScriptPath, getStackiBuildScript(), "utf-8");
  fs.writeFileSync(
    metadataPath,
    stringifyProjectMetadata(
      [{ kind: "page", path: DEFAULT_PROJECT_PAGE_FILE }],
      [
        { kind: "file", path: DEFAULT_PROJECT_STYLESHEET_FILE },
        { kind: "file", path: DEFAULT_PROJECT_SCRIPT_FILE }
      ],
      [],
      [],
      [],
      [],
      [],
      {}
    ),
    "utf-8"
  );
  ensureProjectMetadataFileIcon(metadataPath);
  publishToPublicDir(normalizedFolderPath, {
    pages: [{ relativePath: "index.html", htmlContent: publicHtmlContent }],
    files: [
      { relativePath: DEFAULT_PROJECT_STYLESHEET_FILE, content: cssContent },
      { relativePath: DEFAULT_PROJECT_SCRIPT_FILE, content: jsContent }
    ]
  });
  const project = openProjectFolder(normalizedFolderPath);
  if (!project) {
    throw new Error("The new project was created, but it could not be opened.");
  }
  return project;
}
function toPageJsPath(relativePath) {
  if (isPageJsFile(relativePath)) return relativePath;
  return relativePath.replace(/\.html?$/i, ".page.js");
}
function saveSourcePageFile(folderPath, relativePath, root, components) {
  const jsRelativePath = toPageJsPath(relativePath);
  const filePath = path.join(folderPath, SOURCE_DIR, jsRelativePath);
  markProjectFolderMutation(filePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, buildSourcePageJs(root, components), "utf-8");
  if (jsRelativePath !== relativePath) {
    const oldFilePath = path.join(folderPath, SOURCE_DIR, relativePath);
    if (fs.existsSync(oldFilePath)) {
      markProjectFolderMutation(oldFilePath);
      fs.rmSync(oldFilePath, { force: true });
    }
  }
}
function saveComponentFile(folderPath, component, components) {
  const componentsDir = path.join(folderPath, SOURCE_DIR, SOURCE_COMPONENTS_DIR);
  fs.mkdirSync(componentsDir, { recursive: true });
  const filePath = path.join(componentsDir, `${component.name}.component.js`);
  markProjectFolderMutation(filePath);
  fs.writeFileSync(filePath, serializeComponentToFile(component, components), "utf-8");
}
function deleteComponentFile(folderPath, componentName) {
  const filePath = path.join(folderPath, SOURCE_DIR, SOURCE_COMPONENTS_DIR, `${componentName}.component.js`);
  if (fs.existsSync(filePath)) {
    markProjectFolderMutation(filePath);
    fs.rmSync(filePath, { force: true });
  }
}
function publishToPublicDir(folderPath, payload) {
  const publicDir = path.join(folderPath, PUBLIC_DIR);
  fs.mkdirSync(publicDir, { recursive: true });
  for (const page of payload.pages) {
    const filePath = path.join(publicDir, page.relativePath);
    markProjectFolderMutation(filePath);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, page.htmlContent, "utf-8");
  }
  if (payload.files) {
    for (const file of payload.files) {
      const filePath = path.join(publicDir, file.relativePath);
      markProjectFolderMutation(filePath);
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      if (typeof file.content === "string") {
        fs.writeFileSync(filePath, file.content, "utf-8");
      } else {
        fs.writeFileSync(filePath, file.content);
      }
    }
  }
  if (payload.binaryFiles) {
    for (const file of payload.binaryFiles) {
      const filePath = path.join(publicDir, file.relativePath);
      markProjectFolderMutation(filePath);
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      if (fs.existsSync(file.sourcePath)) {
        fs.copyFileSync(file.sourcePath, filePath);
      }
    }
  }
}
function serializeRootToHtml(root) {
  return `<!DOCTYPE html>
${serializeEditorElementToHtml(root, 0)}
`;
}
function stripSourcePrefix(path2) {
  const prefix = SOURCE_DIR + "/";
  return path2.startsWith(prefix) ? path2.slice(prefix.length) : path2;
}
function sourcePagePathToPublicHtmlPath(sourcePath) {
  const stripped = stripSourcePrefix(sourcePath);
  if (stripped.endsWith(".page.js")) {
    return stripped.replace(/\.page\.js$/, ".html");
  }
  return stripped;
}
function publishProjectToPublic(folderPath, pageDocuments, projectFiles) {
  if (!hasSourceDirectory(folderPath)) return;
  const publicDir = path.join(folderPath, PUBLIC_DIR);
  fs.mkdirSync(publicDir, { recursive: true });
  const pages = Object.entries(pageDocuments).map(([relativePath, doc]) => ({
    relativePath: sourcePagePathToPublicHtmlPath(relativePath),
    // Use renderedHtml if available, otherwise generate from the resolved root tree
    htmlContent: doc.renderedHtml || (doc.root ? serializeRootToHtml(doc.root) : "")
  }));
  const textFiles = projectFiles.filter((file) => file.type !== "html" && typeof file.content === "string").map((file) => ({ relativePath: stripSourcePrefix(file.relativePath), content: file.content }));
  const binaryFiles = projectFiles.filter((file) => typeof file.content !== "string" && file.type !== "html").map((file) => ({ relativePath: stripSourcePrefix(file.relativePath), sourcePath: file.path }));
  publishToPublicDir(folderPath, { pages, files: textFiles, binaryFiles });
}
function normalizeEmulatedMediaFeatures(features) {
  const normalized = {};
  for (const [feature, value] of Object.entries(features || {})) {
    const nextFeature = feature.trim();
    const nextValue = String(value || "").trim();
    if (!nextFeature || !nextValue) continue;
    normalized[nextFeature] = nextValue;
  }
  return normalized;
}
async function applyEmulatedMediaFeatures(window, features) {
  const webContents = window?.webContents;
  if (!webContents || webContents.isDestroyed()) return;
  if (!webContents.debugger.isAttached()) {
    webContents.debugger.attach("1.3");
  }
  await webContents.debugger.sendCommand("Emulation.setEmulatedMedia", {
    media: "",
    features: Object.entries(features).map(([name, value]) => ({ name, value }))
  });
}
function normalizeNewProjectName(input) {
  return input.trim().replace(/[<>:"/\\|?*\u0000-\u001F]+/g, " ").replace(/\.html?$/i, "").trim();
}
function registerIpcHandlers() {
  const projectWatchers = /* @__PURE__ */ new Map();
  const emulatedMediaFeaturesBySender = /* @__PURE__ */ new Map();
  const trackedMediaSenderIds = /* @__PURE__ */ new Set();
  const stopWatchingForSender = (senderId) => {
    const stop = projectWatchers.get(senderId);
    if (!stop) return;
    stop();
    projectWatchers.delete(senderId);
  };
  const rememberSenderMediaFeatures = (senderId, features) => {
    emulatedMediaFeaturesBySender.set(senderId, features);
  };
  electron.ipcMain.handle("file:new", async (event) => {
    const window = electron.BrowserWindow.fromWebContents(event.sender) ?? electron.BrowserWindow.getFocusedWindow() ?? electron.BrowserWindow.getAllWindows()[0];
    const result = window ? await electron.dialog.showOpenDialog(window, {
      title: "Choose Project Location",
      buttonLabel: "Choose Location",
      properties: ["openDirectory", "createDirectory"]
    }) : await electron.dialog.showOpenDialog({
      title: "Choose Project Location",
      buttonLabel: "Choose Location",
      properties: ["openDirectory", "createDirectory"]
    });
    if (result.canceled || !result.filePaths.length) return null;
    const nameResult = window ? await electron.dialog.showSaveDialog(window, {
      title: "Name Project",
      buttonLabel: "Create Project",
      nameFieldLabel: "Project Name:",
      defaultPath: path.join(result.filePaths[0], "New Project"),
      showsTagField: false
    }) : await electron.dialog.showSaveDialog({
      title: "Name Project",
      buttonLabel: "Create Project",
      nameFieldLabel: "Project Name:",
      defaultPath: path.join(result.filePaths[0], "New Project"),
      showsTagField: false
    });
    if (nameResult.canceled || !nameResult.filePath) return null;
    const projectName = normalizeNewProjectName(path.basename(nameResult.filePath));
    if (!projectName) {
      if (window) {
        await electron.dialog.showMessageBox(window, {
          type: "warning",
          title: "Project Name Required",
          message: "Enter a project name to create the project."
        });
      }
      return null;
    }
    try {
      return createNewProject(path.join(path.dirname(nameResult.filePath), projectName));
    } catch (error) {
      if (window) {
        await electron.dialog.showMessageBox(window, {
          type: "error",
          title: "Unable to Create Project",
          message: "The new project could not be created.",
          detail: error instanceof Error ? error.message : String(error)
        });
      }
      return null;
    }
  });
  electron.ipcMain.handle("file:open", async (event) => {
    const window = electron.BrowserWindow.fromWebContents(event.sender) ?? electron.BrowserWindow.getFocusedWindow() ?? electron.BrowserWindow.getAllWindows()[0];
    const result = window ? await electron.dialog.showOpenDialog(window, {
      title: "Open Project",
      buttonLabel: "Open Project",
      properties: ["openDirectory", "openFile"],
      filters: [{ name: "Stacki Project", extensions: ["stacki"] }]
    }) : await electron.dialog.showOpenDialog({
      title: "Open Project",
      buttonLabel: "Open Project",
      properties: ["openDirectory", "openFile"],
      filters: [{ name: "Stacki Project", extensions: ["stacki"] }]
    });
    if (result.canceled || !result.filePaths.length) return null;
    try {
      const project = openProjectPath(result.filePaths[0]);
      if (!project) {
        if (window) {
          await electron.dialog.showMessageBox(window, {
            type: "warning",
            title: "Unable to Open Project",
            message: "The selected file or folder is not a valid Stacki project."
          });
        }
        return null;
      }
      return project;
    } catch (error) {
      if (window) {
        await electron.dialog.showMessageBox(window, {
          type: "error",
          title: "Unable to Open Project",
          message: "The selected project could not be opened.",
          detail: error instanceof Error ? error.message : String(error)
        });
      }
      return null;
    }
  });
  electron.ipcMain.handle(
    "file:save",
    async (_event, payload) => {
      return saveProjectFiles(payload.entryHtmlPath, payload.htmlContent, payload.files);
    }
  );
  electron.ipcMain.handle("file:write", async (_event, filePath, content) => {
    return writeProjectFile(filePath, content);
  });
  electron.ipcMain.handle("file:write-binary", async (_event, filePath, content) => {
    return writeProjectBinaryFile(filePath, content);
  });
  electron.ipcMain.handle("file:mkdir", async (_event, directoryPath) => {
    return createProjectDirectory(directoryPath);
  });
  electron.ipcMain.handle("file:rename", async (_event, oldPath, newPath) => {
    return renameProjectFile(oldPath, newPath);
  });
  electron.ipcMain.handle("file:copy", async (_event, sourcePath, destinationPath) => {
    return copyProjectPath(sourcePath, destinationPath);
  });
  electron.ipcMain.handle("file:delete", async (_event, filePath) => {
    return deleteProjectFile(filePath);
  });
  electron.ipcMain.handle("asset:pick", async (event) => {
    const window = electron.BrowserWindow.fromWebContents(event.sender) ?? electron.BrowserWindow.getFocusedWindow() ?? electron.BrowserWindow.getAllWindows()[0];
    const result = window ? await electron.dialog.showOpenDialog(window, {
      title: "Upload Assets",
      buttonLabel: "Upload",
      properties: ["openFile", "multiSelections"]
    }) : await electron.dialog.showOpenDialog({
      title: "Upload Assets",
      buttonLabel: "Upload",
      properties: ["openFile", "multiSelections"]
    });
    if (result.canceled) return [];
    return result.filePaths;
  });
  electron.ipcMain.handle("project:watch", async (event, folderPath) => {
    const senderId = event.sender.id;
    stopWatchingForSender(senderId);
    if (!folderPath) return { success: true };
    const stop = watchProjectFolder(folderPath, (project) => {
      if (!event.sender.isDestroyed()) {
        event.sender.send("project:changed", project);
      }
    });
    projectWatchers.set(senderId, stop);
    event.sender.once("destroyed", () => stopWatchingForSender(senderId));
    return { success: true };
  });
  electron.ipcMain.handle("project:unwatch", async (event) => {
    stopWatchingForSender(event.sender.id);
    return { success: true };
  });
  electron.ipcMain.handle("project:reload-folder", async (_event, folderPath) => {
    if (!folderPath) return null;
    try {
      return openProjectFolder(folderPath);
    } catch {
      return null;
    }
  });
  electron.ipcMain.handle("project:open-path", async (event, pathLike) => {
    const window = electron.BrowserWindow.fromWebContents(event.sender) ?? electron.BrowserWindow.getFocusedWindow() ?? electron.BrowserWindow.getAllWindows()[0];
    if (typeof pathLike !== "string" || !pathLike.trim()) return null;
    try {
      const project = openProjectPath(pathLike);
      if (!project) {
        if (window) {
          await electron.dialog.showMessageBox(window, {
            type: "warning",
            title: "Unable to Open Project",
            message: "The dropped folder or file is not a valid Stacki project."
          });
        }
        return null;
      }
      return project;
    } catch (error) {
      if (window) {
        await electron.dialog.showMessageBox(window, {
          type: "error",
          title: "Unable to Open Project",
          message: "The dropped project could not be opened.",
          detail: error instanceof Error ? error.message : String(error)
        });
      }
      return null;
    }
  });
  electron.ipcMain.handle("browser:set-emulated-media-features", async (event, features) => {
    const window = electron.BrowserWindow.fromWebContents(event.sender) ?? electron.BrowserWindow.getFocusedWindow() ?? electron.BrowserWindow.getAllWindows()[0];
    const normalizedFeatures = normalizeEmulatedMediaFeatures(features);
    rememberSenderMediaFeatures(event.sender.id, normalizedFeatures);
    if (!trackedMediaSenderIds.has(event.sender.id)) {
      trackedMediaSenderIds.add(event.sender.id);
      event.sender.once("destroyed", () => {
        trackedMediaSenderIds.delete(event.sender.id);
        emulatedMediaFeaturesBySender.delete(event.sender.id);
      });
    }
    await applyEmulatedMediaFeatures(window, normalizedFeatures);
    return { success: true };
  });
  electron.ipcMain.handle("source:save-page", async (_event, folderPath, relativePath, root, components) => {
    try {
      saveSourcePageFile(folderPath, relativePath, root, components);
      return { success: true };
    } catch {
      return { success: false };
    }
  });
  electron.ipcMain.handle("source:save-component", async (_event, folderPath, component, components) => {
    try {
      saveComponentFile(folderPath, component, components);
      return { success: true };
    } catch {
      return { success: false };
    }
  });
  electron.ipcMain.handle("source:delete-component", async (_event, folderPath, componentName) => {
    try {
      deleteComponentFile(folderPath, componentName);
      return { success: true };
    } catch {
      return { success: false };
    }
  });
  electron.ipcMain.handle("source:has-source-dir", async (_event, folderPath) => {
    return hasSourceDirectory(folderPath);
  });
  electron.ipcMain.handle("source:publish-to-public", async (_event, folderPath, pageDocuments, files) => {
    try {
      publishProjectToPublic(folderPath, pageDocuments, files);
      return { success: true };
    } catch {
      return { success: false };
    }
  });
  electron.ipcMain.handle("license:get-status", async () => {
    return { status: "trial", daysRemaining: 14 };
  });
  electron.ipcMain.handle("license:activate", async (_event, _key) => {
    return { success: true };
  });
}
function createMenu(handlers) {
  const isMac = process.platform === "darwin";
  const template = [
    ...isMac ? [
      {
        label: "Stacki",
        submenu: [
          { role: "about" },
          { type: "separator" },
          { role: "services" },
          { type: "separator" },
          { role: "hide" },
          { role: "hideOthers" },
          { role: "unhide" },
          { type: "separator" },
          { role: "quit" }
        ]
      }
    ] : [],
    {
      label: "File",
      submenu: [
        {
          label: "New Project",
          accelerator: "CmdOrCtrl+N",
          click: () => {
            void handlers.newProject();
          }
        },
        {
          label: "Open Project...",
          accelerator: "CmdOrCtrl+O",
          click: () => {
            void handlers.openProject();
          }
        },
        ...isMac ? [] : [{ type: "separator" }, { role: "quit" }]
      ]
    },
    {
      label: "Edit",
      submenu: [
        {
          label: "Undo",
          accelerator: "CmdOrCtrl+Z",
          click: (_item, window) => window?.webContents.send("menu:undo")
        },
        {
          label: "Redo",
          accelerator: "CmdOrCtrl+Shift+Z",
          click: (_item, window) => window?.webContents.send("menu:redo")
        },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" }
      ]
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" }
      ]
    },
    {
      label: "Help",
      submenu: [
        {
          label: "About Stacki",
          click: async () => {
            const window = electron.BrowserWindow.getFocusedWindow();
            if (window) {
              electron.dialog.showMessageBox(window, {
                type: "info",
                title: "About Stacki",
                message: "Stacki - Visual Website Editor",
                detail: `Version ${electron.app.getVersion()}`
              });
            }
          }
        }
      ]
    }
  ];
  const menu = electron.Menu.buildFromTemplate(template);
  electron.Menu.setApplicationMenu(menu);
}
function decodeCanvasAssetProjectRoot(host) {
  if (!host || host.length % 2 !== 0 || /[^0-9a-f]/.test(host)) return null;
  try {
    return Buffer.from(host, "hex").toString("utf8");
  } catch {
    return null;
  }
}
function registerProtocol() {
  electron.protocol.handle("canvas-asset", async (request) => {
    const url$1 = new URL(request.url);
    const decodedProjectRoot = decodeCanvasAssetProjectRoot(url$1.host);
    const filePath = decodedProjectRoot ? path.resolve(decodedProjectRoot, decodeURIComponent(url$1.pathname).replace(/^[/\\]+/, "")) : decodeURIComponent(url$1.pathname);
    if (decodedProjectRoot) {
      const normalizedProjectRoot = path.resolve(decodedProjectRoot);
      if (filePath !== normalizedProjectRoot && !filePath.startsWith(`${normalizedProjectRoot}${path.sep}`)) {
        return new Response("Forbidden", { status: 403 });
      }
    }
    if (!fs.existsSync(filePath)) {
      return new Response("Not found", { status: 404 });
    }
    return electron.net.fetch(url.pathToFileURL(filePath).href);
  });
}
const AUTO_UPDATE_CHECK_INTERVAL_MS = 30 * 60 * 1e3;
const AUTO_UPDATE_LOG_FILE_NAME = "auto-updater.log";
const PROJECT_METADATA_EXTENSION = ".stacki";
let autoUpdateInterval = null;
let autoUpdateCheckInFlight = false;
let autoUpdateErrorDialogShown = false;
let mainWindow = null;
let flushingPendingProjectOpenPaths = false;
const pendingProjectOpenPaths = [];
function isProjectMetadataPath(pathLike) {
  return typeof pathLike === "string" && pathLike.toLowerCase().endsWith(PROJECT_METADATA_EXTENSION);
}
function isProjectOpenPathCandidate(pathLike, options = {}) {
  const { allowDirectories = true } = options;
  if (typeof pathLike !== "string" || !pathLike.trim()) return false;
  const normalizedPath = path.resolve(pathLike);
  if (!fs.existsSync(normalizedPath)) return false;
  try {
    const stats = fs.statSync(normalizedPath);
    return allowDirectories && stats.isDirectory() || isProjectMetadataPath(normalizedPath);
  } catch {
    return false;
  }
}
function collectProjectOpenPaths(argv, options = {}) {
  return Array.from(
    new Set(
      argv.filter((pathLike) => isProjectOpenPathCandidate(pathLike, options)).map((pathLike) => path.resolve(pathLike))
    )
  );
}
function rememberPendingProjectOpenPath(pathLike) {
  const normalizedPath = path.resolve(pathLike);
  if (!pendingProjectOpenPaths.includes(normalizedPath)) {
    pendingProjectOpenPaths.push(normalizedPath);
  }
}
function whenWindowReady(window) {
  if (!window.webContents.isLoadingMainFrame()) {
    return Promise.resolve();
  }
  return new Promise((resolveReady) => {
    window.webContents.once("did-finish-load", () => resolveReady());
  });
}
function getOrCreateMainWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    return mainWindow;
  }
  return createWindow();
}
async function dispatchMenuAction(action) {
  const window = getOrCreateMainWindow();
  if (window.isMinimized()) {
    window.restore();
  }
  window.show();
  window.focus();
  await whenWindowReady(window);
  window.webContents.send(`menu:${action}`);
}
async function openProjectMetadataPath(pathLike) {
  const window = getOrCreateMainWindow();
  try {
    const project = openProjectPath(pathLike);
    if (!project) {
      await electron.dialog.showMessageBox(window, {
        type: "warning",
        title: "Unable to Open Project",
        message: "That Stacki project could not be opened.",
        detail: "The selected file or folder is not a valid Stacki project."
      });
      return;
    }
    if (window.isMinimized()) {
      window.restore();
    }
    window.show();
    window.focus();
    await whenWindowReady(window);
    window.webContents.send("project:opened", project);
  } catch (error) {
    await electron.dialog.showMessageBox(window, {
      type: "error",
      title: "Unable to Open Project",
      message: "That Stacki project could not be opened.",
      detail: error instanceof Error ? error.message : String(error)
    });
  }
}
async function flushPendingProjectOpenPaths() {
  if (flushingPendingProjectOpenPaths || !electron.app.isReady() || pendingProjectOpenPaths.length === 0) {
    return;
  }
  flushingPendingProjectOpenPaths = true;
  try {
    while (pendingProjectOpenPaths.length > 0) {
      const nextPath = pendingProjectOpenPaths.shift();
      if (!nextPath) continue;
      await openProjectMetadataPath(nextPath);
    }
  } finally {
    flushingPendingProjectOpenPaths = false;
  }
}
function isExpectedAutoUpdateNetworkError(error) {
  const code = typeof error === "object" && error && "code" in error ? String(error.code || "").toUpperCase() : "";
  const message = typeof error === "object" && error && "message" in error ? String(error.message || "").toLowerCase() : String(error || "").toLowerCase();
  if (["ENOTFOUND", "EAI_AGAIN", "ECONNREFUSED", "ECONNRESET", "ETIMEDOUT", "ENETUNREACH", "EHOSTUNREACH", "ERR_INTERNET_DISCONNECTED", "ERR_NAME_NOT_RESOLVED"].includes(code)) {
    return true;
  }
  return [
    "internet disconnected",
    "name not resolved",
    "network",
    "offline",
    "socket hang up",
    "timed out",
    "getaddrinfo",
    "failed to fetch",
    "could not connect",
    "connection refused"
  ].some((fragment) => message.includes(fragment));
}
function formatAutoUpdateError(error) {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }
  return String(error);
}
function logAutoUpdate(message, details) {
  const detailText = details === void 0 ? "" : ` ${typeof details === "string" ? details : JSON.stringify(details)}`;
  const line = `[${(/* @__PURE__ */ new Date()).toISOString()}] ${message}${detailText}`;
  console.log(line);
  if (!electron.app.isReady()) {
    return;
  }
  try {
    const logsDirectory = electron.app.getPath("logs");
    fs.mkdirSync(logsDirectory, { recursive: true });
    fs.appendFileSync(path.join(logsDirectory, AUTO_UPDATE_LOG_FILE_NAME), `${line}
`);
  } catch (error) {
    console.warn("Failed to write auto update log:", error);
  }
}
async function promptToInstallDownloadedUpdate(version) {
  const window = mainWindow && !mainWindow.isDestroyed() ? mainWindow : void 0;
  const { response } = await electron.dialog.showMessageBox(window, {
    type: "info",
    title: "Update Ready",
    buttons: ["Restart Now", "Later"],
    defaultId: 0,
    cancelId: 1,
    message: `Stacki ${version} has been downloaded.`,
    detail: "Restart Stacki to install the update."
  });
  if (response === 0) {
    electronUpdater.autoUpdater.quitAndInstall();
  }
}
function registerAutoUpdaterEvents() {
  electronUpdater.autoUpdater.autoDownload = true;
  electronUpdater.autoUpdater.autoInstallOnAppQuit = true;
  electronUpdater.autoUpdater.on("checking-for-update", () => {
    logAutoUpdate("Checking for updates");
  });
  electronUpdater.autoUpdater.on("update-available", (info) => {
    logAutoUpdate("Update available", { version: info.version });
  });
  electronUpdater.autoUpdater.on("update-not-available", (info) => {
    logAutoUpdate("No update available", { version: info.version });
  });
  electronUpdater.autoUpdater.on("update-downloaded", (info) => {
    logAutoUpdate("Update downloaded", { version: info.version });
    void promptToInstallDownloadedUpdate(info.version);
  });
  electronUpdater.autoUpdater.on("error", (error) => {
    logAutoUpdate("Auto update error", formatAutoUpdateError(error));
    if (autoUpdateErrorDialogShown || isExpectedAutoUpdateNetworkError(error)) {
      return;
    }
    autoUpdateErrorDialogShown = true;
    const window = mainWindow && !mainWindow.isDestroyed() ? mainWindow : void 0;
    void electron.dialog.showMessageBox(window, {
      type: "warning",
      title: "Update Check Failed",
      message: "Stacki could not check for updates.",
      detail: formatAutoUpdateError(error)
    });
  });
}
async function runAutoUpdateCheck() {
  if (!electron.app.isPackaged) return;
  if (autoUpdateCheckInFlight) return;
  autoUpdateCheckInFlight = true;
  try {
    await electronUpdater.autoUpdater.checkForUpdatesAndNotify();
  } catch (error) {
    if (!isExpectedAutoUpdateNetworkError(error)) {
      console.warn("Auto update check failed:", error);
    }
  } finally {
    autoUpdateCheckInFlight = false;
  }
}
function startAutoUpdateChecks() {
  if (!electron.app.isPackaged) {
    logAutoUpdate("Skipping auto update checks in development");
    return;
  }
  void runAutoUpdateCheck();
  if (autoUpdateInterval) {
    clearInterval(autoUpdateInterval);
  }
  autoUpdateInterval = setInterval(() => {
    void runAutoUpdateCheck();
  }, AUTO_UPDATE_CHECK_INTERVAL_MS);
}
function setApplicationIcon() {
  const iconPath = path.join(__dirname, process.platform === "darwin" ? "../../resources/icon-dock.png" : "../../resources/icon.png");
  if (process.platform === "darwin") {
    const dockIcon = electron.nativeImage.createFromPath(iconPath);
    if (!dockIcon.isEmpty()) {
      electron.app.dock?.setIcon(dockIcon);
    }
  }
}
function createWindow() {
  const window = new electron.BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 600,
    show: false,
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 12, y: 16 },
    backgroundColor: "#111111",
    icon: path.join(__dirname, process.platform === "darwin" ? "../../resources/icon.icns" : "../../resources/icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      sandbox: false,
      webviewTag: false
    }
  });
  window.maximize();
  window.on("ready-to-show", () => {
    window.show();
  });
  window.on("closed", () => {
    if (mainWindow === window) {
      mainWindow = null;
    }
  });
  window.webContents.setWindowOpenHandler((details) => {
    electron.shell.openExternal(details.url);
    return { action: "deny" };
  });
  window.webContents.on("render-process-gone", (_event, details) => {
    console.error("[renderer-process-gone]", {
      reason: details.reason,
      exitCode: details.exitCode
    });
  });
  if (utils.is.dev) {
    window.webContents.on("console-message", (_event, level, message, line, sourceId) => {
      if (level < 2) return;
      console.error("[renderer-console]", {
        level,
        message,
        line,
        sourceId
      });
    });
  }
  if (utils.is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    window.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    window.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
  mainWindow = window;
  return window;
}
electron.app.setName("Stacki");
const hasSingleInstanceLock = electron.app.requestSingleInstanceLock();
if (!hasSingleInstanceLock) {
  electron.app.quit();
} else {
  electron.app.on("second-instance", (_event, argv) => {
    collectProjectOpenPaths(argv).forEach(rememberPendingProjectOpenPath);
    const window = getOrCreateMainWindow();
    if (window.isMinimized()) {
      window.restore();
    }
    window.show();
    window.focus();
    void flushPendingProjectOpenPaths();
  });
  electron.app.on("open-file", (event, pathLike) => {
    event.preventDefault();
    if (!isProjectOpenPathCandidate(pathLike)) return;
    rememberPendingProjectOpenPath(pathLike);
    void flushPendingProjectOpenPaths();
  });
  electron.app.whenReady().then(() => {
    utils.electronApp.setAppUserModelId("com.stacki.editor");
    setApplicationIcon();
    electron.app.on("browser-window-created", (_, window) => {
      utils.optimizer.watchWindowShortcuts(window);
    });
    registerProtocol();
    registerIpcHandlers();
    registerAutoUpdaterEvents();
    createMenu({
      newProject: () => dispatchMenuAction("new-project"),
      openProject: () => dispatchMenuAction("open")
    });
    createWindow();
    startAutoUpdateChecks();
    collectProjectOpenPaths(process.argv, { allowDirectories: false }).forEach(rememberPendingProjectOpenPath);
    void flushPendingProjectOpenPaths();
    electron.app.on("activate", () => {
      if (electron.BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });
}
electron.app.on("window-all-closed", () => {
  if (autoUpdateInterval) {
    clearInterval(autoUpdateInterval);
    autoUpdateInterval = null;
  }
  if (process.platform !== "darwin") {
    electron.app.quit();
  }
});
