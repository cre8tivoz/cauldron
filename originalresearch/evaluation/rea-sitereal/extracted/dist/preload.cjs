"use strict";

// src/preload.ts
var import_electron = require("electron");
var fromBase64 = (s) => {
  if (typeof Buffer !== "undefined") return Buffer.from(s, "base64").toString("utf8");
  const binary = atob(s);
  return new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0)));
};
var arg = process.argv.find((a) => a.startsWith("--strata-config="));
var raw = arg ? arg.slice("--strata-config=".length) : "";
var config = { mode: "project" };
try {
  if (raw) config = JSON.parse(raw.trim().startsWith("{") ? raw : fromBase64(raw));
} catch (e) {
  config = { mode: "project", configError: String(e.message ?? e) };
}
import_electron.contextBridge.exposeInMainWorld("strata", config);
import_electron.contextBridge.exposeInMainWorld("strataShell", {
  list: () => import_electron.ipcRenderer.invoke("projects:list"),
  pick: () => import_electron.ipcRenderer.invoke("projects:pick"),
  open: (path) => import_electron.ipcRenderer.invoke("projects:open", path),
  forget: (path) => import_electron.ipcRenderer.invoke("projects:forget", path),
  pin: (path, pinned) => import_electron.ipcRenderer.invoke("projects:pin", path, pinned),
  folder: (paths, folder) => import_electron.ipcRenderer.invoke("projects:folder", paths, folder),
  thumb: (path) => import_electron.ipcRenderer.invoke("projects:thumb", path),
  /* "This project changed" — the shell re-photographs its homepage. See
     "project thumbnails" in main.ts. */
  snapshot: () => import_electron.ipcRenderer.invoke("projects:snapshot"),
  reveal: (path) => import_electron.ipcRenderer.invoke("projects:reveal", path),
  manager: () => import_electron.ipcRenderer.invoke("projects:manager"),
  create: (opts) => import_electron.ipcRenderer.invoke("projects:create", opts),
  clone: (opts) => import_electron.ipcRenderer.invoke("projects:clone", opts),
  duplicate: (opts) => import_electron.ipcRenderer.invoke("projects:duplicate", opts),
  pickFolder: () => import_electron.ipcRenderer.invoke("projects:pickFolder"),
  defaultParent: () => import_electron.ipcRenderer.invoke("projects:defaultParent"),
  /** a project's favicon as a data URL, or null — for the bar's `+` list */
  icon: (path) => import_electron.ipcRenderer.invoke("projects:icon", path),
  /* The window's tabs — the bar of open projects. `state` is null for a page
     that is not a tab (the manager in its own window), and then there is no
     bar. See "windows and tabs" in main.ts. */
  tabs: {
    state: () => import_electron.ipcRenderer.invoke("tabs:state"),
    select: (id, peek) => import_electron.ipcRenderer.invoke("tabs:select", id, peek),
    close: (id) => import_electron.ipcRenderer.invoke("tabs:close", id),
    closeOthers: (id) => import_electron.ipcRenderer.invoke("tabs:closeOthers", id),
    /** into a new window beside this one, or into the window `windowId` */
    detach: (id, windowId) => import_electron.ipcRenderer.invoke("tabs:detach", id, windowId),
    move: (id, at) => import_electron.ipcRenderer.invoke("tabs:move", id, at),
    on: (fn) => {
      const handler = (_e, state) => fn(state);
      import_electron.ipcRenderer.on("tabs:changed", handler);
      return () => import_electron.ipcRenderer.off("tabs:changed", handler);
    },
    /** the menu's Projects Bar (⌃⌘S) and New Tab (⌘T) */
    onCommand: (fn) => {
      const handler = (_e, cmd) => fn(cmd);
      import_electron.ipcRenderer.on("tabs:command", handler);
      return () => import_electron.ipcRenderer.off("tabs:command", handler);
    }
  },
  /** Machine-wide settings — see "settings" in main.ts. */
  settings: {
    get: () => import_electron.ipcRenderer.invoke("settings:get"),
    set: (patch) => import_electron.ipcRenderer.invoke("settings:set", patch)
  },
  /* Signing this machine in. The manager draws the screen; these four are the
     whole of what it needs, and they are the launcher's `/api/app/*` under
     another name — one flow, two front doors. */
  license: {
    state: () => import_electron.ipcRenderer.invoke("license:state"),
    /** Ask the server now — the popup's *Check again*. */
    check: () => import_electron.ipcRenderer.invoke("license:check"),
    login: () => import_electron.ipcRenderer.invoke("license:login"),
    loginState: () => import_electron.ipcRenderer.invoke("license:loginState"),
    logout: () => import_electron.ipcRenderer.invoke("license:logout"),
    /* The in-app way in: an address, then the code out of the mail. */
    email: (email) => import_electron.ipcRenderer.invoke("license:email", email),
    verify: (email, otp, free, name) => import_electron.ipcRenderer.invoke("license:verify", email, otp, free, name),
    /* The choice screen: start the trial or buy, then wait for the purchase. */
    start: (choice) => import_electron.ipcRenderer.invoke("license:start", choice),
    claim: () => import_electron.ipcRenderer.invoke("license:claim"),
    /* The account screens: which computers are on the license, taking one off,
       and moving the address the account is reachable at. */
    machines: () => import_electron.ipcRenderer.invoke("license:machines"),
    forget: (deviceId) => import_electron.ipcRenderer.invoke("license:forget", deviceId),
    changeEmail: (email, otp, currentOtp) => import_electron.ipcRenderer.invoke("license:changeEmail", email, otp, currentOtp),
    /** The shell refused to open a project — read the license again. */
    onChange: (fn) => {
      const handler = () => fn();
      import_electron.ipcRenderer.on("license:changed", handler);
      return () => import_electron.ipcRenderer.off("license:changed", handler);
    }
  },
  tools: {
    state: () => import_electron.ipcRenderer.invoke("tools:state"),
    install: (tool) => import_electron.ipcRenderer.invoke("tools:install", tool)
  },
  /** the `sitereal` command on this machine, and updating it */
  cli: {
    state: () => import_electron.ipcRenderer.invoke("cli:state"),
    upgrade: () => import_electron.ipcRenderer.invoke("cli:upgrade")
  },
  github: {
    state: (path) => import_electron.ipcRenderer.invoke("github:state", path),
    login: () => import_electron.ipcRenderer.invoke("github:login"),
    loginState: () => import_electron.ipcRenderer.invoke("github:loginState"),
    installCli: () => import_electron.ipcRenderer.invoke("github:installCli"),
    repos: () => import_electron.ipcRenderer.invoke("github:repos"),
    switchAccount: (user) => import_electron.ipcRenderer.invoke("github:switch", user),
    createRepo: (path, name, isPrivate) => import_electron.ipcRenderer.invoke("github:createRepo", path, name, isPrivate)
  },
  /* Updates. Every call here is a button being pressed — the shell checks
     once on launch by itself and never downloads or installs unasked. */
  update: {
    state: () => import_electron.ipcRenderer.invoke("update:state"),
    check: () => import_electron.ipcRenderer.invoke("update:check"),
    download: () => import_electron.ipcRenderer.invoke("update:download"),
    install: () => import_electron.ipcRenderer.invoke("update:install"),
    skip: () => import_electron.ipcRenderer.invoke("update:skip"),
    /** the check finished, or a download moved */
    on: (fn) => {
      const handler = (_e, state) => fn(state);
      import_electron.ipcRenderer.on("update:state", handler);
      return () => import_electron.ipcRenderer.off("update:state", handler);
    }
  },
  openExternal: (url) => import_electron.ipcRenderer.invoke("shell:openExternal", url),
  /** The list changed under the manager — a new thumbnail, so far. */
  onProjects: (fn) => {
    const handler = (_e, path) => fn(path);
    import_electron.ipcRenderer.on("projects:changed", handler);
    return () => import_electron.ipcRenderer.off("projects:changed", handler);
  },
  /** Progress lines while a project is being created. */
  onProgress: (fn) => {
    const handler = (_e, text) => fn(text);
    import_electron.ipcRenderer.on("projects:progress", handler);
    return () => import_electron.ipcRenderer.off("projects:progress", handler);
  }
});
