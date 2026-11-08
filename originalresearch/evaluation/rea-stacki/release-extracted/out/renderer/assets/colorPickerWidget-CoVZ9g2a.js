import { a as Event, E as Emitter, o as onUnexpectedError, D as DisposableStore, b as Disposable, t as toDisposable, m as markAsSingleton, L as LinkedList } from "./event-Be7N559X.js";
import { Color, RGBA, HSVA } from "./color-WHSobDvT.js";
function ensureCodeWindow(targetWindow, fallbackWindowId) {
  const codeWindow = targetWindow;
  if (typeof codeWindow.vscodeWindowId !== "number") {
    Object.defineProperty(codeWindow, "vscodeWindowId", {
      get: () => fallbackWindowId
    });
  }
}
const mainWindow = window;
class WindowManager {
  constructor() {
    this.mapWindowIdToZoomFactor = /* @__PURE__ */ new Map();
  }
  static {
    this.INSTANCE = new WindowManager();
  }
  getZoomFactor(targetWindow) {
    return this.mapWindowIdToZoomFactor.get(this.getWindowId(targetWindow)) ?? 1;
  }
  getWindowId(targetWindow) {
    return targetWindow.vscodeWindowId;
  }
}
function addMatchMediaChangeListener(targetWindow, query, callback) {
  if (typeof query === "string") {
    query = targetWindow.matchMedia(query);
  }
  query.addEventListener("change", callback);
}
const userAgent$1 = navigator.userAgent;
const isFirefox = userAgent$1.indexOf("Firefox") >= 0;
const isWebKit = userAgent$1.indexOf("AppleWebKit") >= 0;
const isChrome$1 = userAgent$1.indexOf("Chrome") >= 0;
!isChrome$1 && userAgent$1.indexOf("Safari") >= 0;
userAgent$1.indexOf("Electron/") >= 0;
userAgent$1.indexOf("Android") >= 0;
let standalone = false;
if (typeof mainWindow.matchMedia === "function") {
  const standaloneMatchMedia = mainWindow.matchMedia("(display-mode: standalone) or (display-mode: window-controls-overlay)");
  const fullScreenMatchMedia = mainWindow.matchMedia("(display-mode: fullscreen)");
  standalone = standaloneMatchMedia.matches;
  addMatchMediaChangeListener(mainWindow, standaloneMatchMedia, ({ matches }) => {
    if (standalone && fullScreenMatchMedia.matches) {
      return;
    }
    standalone = matches;
  });
}
function getNLSMessages() {
  return globalThis._VSCODE_NLS_MESSAGES;
}
function getNLSLanguage() {
  return globalThis._VSCODE_NLS_LANGUAGE;
}
const isPseudo = getNLSLanguage() === "pseudo" || typeof document !== "undefined" && document.location && document.location.hash.indexOf("pseudo=true") >= 0;
function _format$1(message, args) {
  let result;
  if (args.length === 0) {
    result = message;
  } else {
    result = message.replace(/\{(\d+)\}/g, (match, rest) => {
      const index = rest[0];
      const arg = args[index];
      let result2 = match;
      if (typeof arg === "string") {
        result2 = arg;
      } else if (typeof arg === "number" || typeof arg === "boolean" || arg === void 0 || arg === null) {
        result2 = String(arg);
      }
      return result2;
    });
  }
  if (isPseudo) {
    result = "［" + result.replace(/[aouei]/g, "$&$&") + "］";
  }
  return result;
}
function localize(data, message, ...args) {
  if (typeof data === "number") {
    return _format$1(lookupMessage(data, message), args);
  }
  return _format$1(message, args);
}
function lookupMessage(index, fallback) {
  const message = getNLSMessages()?.[index];
  if (typeof message !== "string") {
    if (typeof fallback === "string") {
      return fallback;
    }
    throw new Error(`!!! NLS MISSING: ${index} !!!`);
  }
  return message;
}
const LANGUAGE_DEFAULT = "en";
let _isWindows = false;
let _isMacintosh = false;
let _isLinux = false;
let _isNative = false;
let _isWeb = false;
let _locale = void 0;
let _language = LANGUAGE_DEFAULT;
let _platformLocale = LANGUAGE_DEFAULT;
let _translationsConfigFile = void 0;
let _userAgent = void 0;
const $globalThis = globalThis;
let nodeProcess = void 0;
if (typeof $globalThis.vscode !== "undefined" && typeof $globalThis.vscode.process !== "undefined") {
  nodeProcess = $globalThis.vscode.process;
} else if (typeof process !== "undefined" && typeof process?.versions?.node === "string") {
  nodeProcess = process;
}
const isElectronProcess = typeof nodeProcess?.versions?.electron === "string";
const isElectronRenderer = isElectronProcess && nodeProcess?.type === "renderer";
if (typeof nodeProcess === "object") {
  _isWindows = nodeProcess.platform === "win32";
  _isMacintosh = nodeProcess.platform === "darwin";
  _isLinux = nodeProcess.platform === "linux";
  _isLinux && !!nodeProcess.env["SNAP"] && !!nodeProcess.env["SNAP_REVISION"];
  !!nodeProcess.env["CI"] || !!nodeProcess.env["BUILD_ARTIFACTSTAGINGDIRECTORY"];
  _locale = LANGUAGE_DEFAULT;
  _language = LANGUAGE_DEFAULT;
  const rawNlsConfig = nodeProcess.env["VSCODE_NLS_CONFIG"];
  if (rawNlsConfig) {
    try {
      const nlsConfig = JSON.parse(rawNlsConfig);
      _locale = nlsConfig.userLocale;
      _platformLocale = nlsConfig.osLocale;
      _language = nlsConfig.resolvedLanguage || LANGUAGE_DEFAULT;
      _translationsConfigFile = nlsConfig.languagePack?.translationsConfigFile;
    } catch (e) {
    }
  }
  _isNative = true;
} else if (typeof navigator === "object" && !isElectronRenderer) {
  _userAgent = navigator.userAgent;
  _isWindows = _userAgent.indexOf("Windows") >= 0;
  _isMacintosh = _userAgent.indexOf("Macintosh") >= 0;
  (_userAgent.indexOf("Macintosh") >= 0 || _userAgent.indexOf("iPad") >= 0 || _userAgent.indexOf("iPhone") >= 0) && !!navigator.maxTouchPoints && navigator.maxTouchPoints > 0;
  _isLinux = _userAgent.indexOf("Linux") >= 0;
  _userAgent?.indexOf("Mobi") >= 0;
  _isWeb = true;
  _language = getNLSLanguage() || LANGUAGE_DEFAULT;
  _locale = navigator.language.toLowerCase();
  _platformLocale = _locale;
} else {
  console.error("Unable to resolve platform.");
}
const isWindows = _isWindows;
const isMacintosh = _isMacintosh;
const isLinux = _isLinux;
const isNative = _isNative;
const isWeb = _isWeb;
const userAgent = _userAgent;
const setTimeout0IsFaster = typeof $globalThis.postMessage === "function" && !$globalThis.importScripts;
(() => {
  if (setTimeout0IsFaster) {
    const pending = [];
    $globalThis.addEventListener("message", (e) => {
      if (e.data && e.data.vscodeScheduleAsyncWork) {
        for (let i = 0, len = pending.length; i < len; i++) {
          const candidate = pending[i];
          if (candidate.id === e.data.vscodeScheduleAsyncWork) {
            pending.splice(i, 1);
            candidate.callback();
            return;
          }
        }
      }
    });
    let lastId = 0;
    return (callback) => {
      const myId = ++lastId;
      pending.push({
        id: myId,
        callback
      });
      $globalThis.postMessage({ vscodeScheduleAsyncWork: myId }, "*");
    };
  }
  return (callback) => setTimeout(callback);
})();
const isChrome = !!(userAgent && userAgent.indexOf("Chrome") >= 0);
!!(userAgent && userAgent.indexOf("Firefox") >= 0);
!!(!isChrome && (userAgent && userAgent.indexOf("Safari") >= 0));
!!(userAgent && userAgent.indexOf("Edg/") >= 0);
!!(userAgent && userAgent.indexOf("Android") >= 0);
({
  clipboard: {
    writeText: isNative || document.queryCommandSupported && document.queryCommandSupported("copy") || !!(navigator && navigator.clipboard && navigator.clipboard.writeText),
    readText: isNative || !!(navigator && navigator.clipboard && navigator.clipboard.readText)
  }
});
class KeyCodeStrMap {
  constructor() {
    this._keyCodeToStr = [];
    this._strToKeyCode = /* @__PURE__ */ Object.create(null);
  }
  define(keyCode, str) {
    this._keyCodeToStr[keyCode] = str;
    this._strToKeyCode[str.toLowerCase()] = keyCode;
  }
  keyCodeToStr(keyCode) {
    return this._keyCodeToStr[keyCode];
  }
  strToKeyCode(str) {
    return this._strToKeyCode[str.toLowerCase()] || 0;
  }
}
const uiMap = new KeyCodeStrMap();
const userSettingsUSMap = new KeyCodeStrMap();
const userSettingsGeneralMap = new KeyCodeStrMap();
const EVENT_KEY_CODE_MAP = new Array(230);
const scanCodeStrToInt = /* @__PURE__ */ Object.create(null);
const scanCodeLowerCaseStrToInt = /* @__PURE__ */ Object.create(null);
(function() {
  const empty = "";
  const mappings = [
    // immutable, scanCode, scanCodeStr, keyCode, keyCodeStr, eventKeyCode, vkey, usUserSettingsLabel, generalUserSettingsLabel
    [1, 0, "None", 0, "unknown", 0, "VK_UNKNOWN", empty, empty],
    [1, 1, "Hyper", 0, empty, 0, empty, empty, empty],
    [1, 2, "Super", 0, empty, 0, empty, empty, empty],
    [1, 3, "Fn", 0, empty, 0, empty, empty, empty],
    [1, 4, "FnLock", 0, empty, 0, empty, empty, empty],
    [1, 5, "Suspend", 0, empty, 0, empty, empty, empty],
    [1, 6, "Resume", 0, empty, 0, empty, empty, empty],
    [1, 7, "Turbo", 0, empty, 0, empty, empty, empty],
    [1, 8, "Sleep", 0, empty, 0, "VK_SLEEP", empty, empty],
    [1, 9, "WakeUp", 0, empty, 0, empty, empty, empty],
    [0, 10, "KeyA", 31, "A", 65, "VK_A", empty, empty],
    [0, 11, "KeyB", 32, "B", 66, "VK_B", empty, empty],
    [0, 12, "KeyC", 33, "C", 67, "VK_C", empty, empty],
    [0, 13, "KeyD", 34, "D", 68, "VK_D", empty, empty],
    [0, 14, "KeyE", 35, "E", 69, "VK_E", empty, empty],
    [0, 15, "KeyF", 36, "F", 70, "VK_F", empty, empty],
    [0, 16, "KeyG", 37, "G", 71, "VK_G", empty, empty],
    [0, 17, "KeyH", 38, "H", 72, "VK_H", empty, empty],
    [0, 18, "KeyI", 39, "I", 73, "VK_I", empty, empty],
    [0, 19, "KeyJ", 40, "J", 74, "VK_J", empty, empty],
    [0, 20, "KeyK", 41, "K", 75, "VK_K", empty, empty],
    [0, 21, "KeyL", 42, "L", 76, "VK_L", empty, empty],
    [0, 22, "KeyM", 43, "M", 77, "VK_M", empty, empty],
    [0, 23, "KeyN", 44, "N", 78, "VK_N", empty, empty],
    [0, 24, "KeyO", 45, "O", 79, "VK_O", empty, empty],
    [0, 25, "KeyP", 46, "P", 80, "VK_P", empty, empty],
    [0, 26, "KeyQ", 47, "Q", 81, "VK_Q", empty, empty],
    [0, 27, "KeyR", 48, "R", 82, "VK_R", empty, empty],
    [0, 28, "KeyS", 49, "S", 83, "VK_S", empty, empty],
    [0, 29, "KeyT", 50, "T", 84, "VK_T", empty, empty],
    [0, 30, "KeyU", 51, "U", 85, "VK_U", empty, empty],
    [0, 31, "KeyV", 52, "V", 86, "VK_V", empty, empty],
    [0, 32, "KeyW", 53, "W", 87, "VK_W", empty, empty],
    [0, 33, "KeyX", 54, "X", 88, "VK_X", empty, empty],
    [0, 34, "KeyY", 55, "Y", 89, "VK_Y", empty, empty],
    [0, 35, "KeyZ", 56, "Z", 90, "VK_Z", empty, empty],
    [0, 36, "Digit1", 22, "1", 49, "VK_1", empty, empty],
    [0, 37, "Digit2", 23, "2", 50, "VK_2", empty, empty],
    [0, 38, "Digit3", 24, "3", 51, "VK_3", empty, empty],
    [0, 39, "Digit4", 25, "4", 52, "VK_4", empty, empty],
    [0, 40, "Digit5", 26, "5", 53, "VK_5", empty, empty],
    [0, 41, "Digit6", 27, "6", 54, "VK_6", empty, empty],
    [0, 42, "Digit7", 28, "7", 55, "VK_7", empty, empty],
    [0, 43, "Digit8", 29, "8", 56, "VK_8", empty, empty],
    [0, 44, "Digit9", 30, "9", 57, "VK_9", empty, empty],
    [0, 45, "Digit0", 21, "0", 48, "VK_0", empty, empty],
    [1, 46, "Enter", 3, "Enter", 13, "VK_RETURN", empty, empty],
    [1, 47, "Escape", 9, "Escape", 27, "VK_ESCAPE", empty, empty],
    [1, 48, "Backspace", 1, "Backspace", 8, "VK_BACK", empty, empty],
    [1, 49, "Tab", 2, "Tab", 9, "VK_TAB", empty, empty],
    [1, 50, "Space", 10, "Space", 32, "VK_SPACE", empty, empty],
    [0, 51, "Minus", 88, "-", 189, "VK_OEM_MINUS", "-", "OEM_MINUS"],
    [0, 52, "Equal", 86, "=", 187, "VK_OEM_PLUS", "=", "OEM_PLUS"],
    [0, 53, "BracketLeft", 92, "[", 219, "VK_OEM_4", "[", "OEM_4"],
    [0, 54, "BracketRight", 94, "]", 221, "VK_OEM_6", "]", "OEM_6"],
    [0, 55, "Backslash", 93, "\\", 220, "VK_OEM_5", "\\", "OEM_5"],
    [0, 56, "IntlHash", 0, empty, 0, empty, empty, empty],
    // has been dropped from the w3c spec
    [0, 57, "Semicolon", 85, ";", 186, "VK_OEM_1", ";", "OEM_1"],
    [0, 58, "Quote", 95, "'", 222, "VK_OEM_7", "'", "OEM_7"],
    [0, 59, "Backquote", 91, "`", 192, "VK_OEM_3", "`", "OEM_3"],
    [0, 60, "Comma", 87, ",", 188, "VK_OEM_COMMA", ",", "OEM_COMMA"],
    [0, 61, "Period", 89, ".", 190, "VK_OEM_PERIOD", ".", "OEM_PERIOD"],
    [0, 62, "Slash", 90, "/", 191, "VK_OEM_2", "/", "OEM_2"],
    [1, 63, "CapsLock", 8, "CapsLock", 20, "VK_CAPITAL", empty, empty],
    [1, 64, "F1", 59, "F1", 112, "VK_F1", empty, empty],
    [1, 65, "F2", 60, "F2", 113, "VK_F2", empty, empty],
    [1, 66, "F3", 61, "F3", 114, "VK_F3", empty, empty],
    [1, 67, "F4", 62, "F4", 115, "VK_F4", empty, empty],
    [1, 68, "F5", 63, "F5", 116, "VK_F5", empty, empty],
    [1, 69, "F6", 64, "F6", 117, "VK_F6", empty, empty],
    [1, 70, "F7", 65, "F7", 118, "VK_F7", empty, empty],
    [1, 71, "F8", 66, "F8", 119, "VK_F8", empty, empty],
    [1, 72, "F9", 67, "F9", 120, "VK_F9", empty, empty],
    [1, 73, "F10", 68, "F10", 121, "VK_F10", empty, empty],
    [1, 74, "F11", 69, "F11", 122, "VK_F11", empty, empty],
    [1, 75, "F12", 70, "F12", 123, "VK_F12", empty, empty],
    [1, 76, "PrintScreen", 0, empty, 0, empty, empty, empty],
    [1, 77, "ScrollLock", 84, "ScrollLock", 145, "VK_SCROLL", empty, empty],
    [1, 78, "Pause", 7, "PauseBreak", 19, "VK_PAUSE", empty, empty],
    [1, 79, "Insert", 19, "Insert", 45, "VK_INSERT", empty, empty],
    [1, 80, "Home", 14, "Home", 36, "VK_HOME", empty, empty],
    [1, 81, "PageUp", 11, "PageUp", 33, "VK_PRIOR", empty, empty],
    [1, 82, "Delete", 20, "Delete", 46, "VK_DELETE", empty, empty],
    [1, 83, "End", 13, "End", 35, "VK_END", empty, empty],
    [1, 84, "PageDown", 12, "PageDown", 34, "VK_NEXT", empty, empty],
    [1, 85, "ArrowRight", 17, "RightArrow", 39, "VK_RIGHT", "Right", empty],
    [1, 86, "ArrowLeft", 15, "LeftArrow", 37, "VK_LEFT", "Left", empty],
    [1, 87, "ArrowDown", 18, "DownArrow", 40, "VK_DOWN", "Down", empty],
    [1, 88, "ArrowUp", 16, "UpArrow", 38, "VK_UP", "Up", empty],
    [1, 89, "NumLock", 83, "NumLock", 144, "VK_NUMLOCK", empty, empty],
    [1, 90, "NumpadDivide", 113, "NumPad_Divide", 111, "VK_DIVIDE", empty, empty],
    [1, 91, "NumpadMultiply", 108, "NumPad_Multiply", 106, "VK_MULTIPLY", empty, empty],
    [1, 92, "NumpadSubtract", 111, "NumPad_Subtract", 109, "VK_SUBTRACT", empty, empty],
    [1, 93, "NumpadAdd", 109, "NumPad_Add", 107, "VK_ADD", empty, empty],
    [1, 94, "NumpadEnter", 3, empty, 0, empty, empty, empty],
    [1, 95, "Numpad1", 99, "NumPad1", 97, "VK_NUMPAD1", empty, empty],
    [1, 96, "Numpad2", 100, "NumPad2", 98, "VK_NUMPAD2", empty, empty],
    [1, 97, "Numpad3", 101, "NumPad3", 99, "VK_NUMPAD3", empty, empty],
    [1, 98, "Numpad4", 102, "NumPad4", 100, "VK_NUMPAD4", empty, empty],
    [1, 99, "Numpad5", 103, "NumPad5", 101, "VK_NUMPAD5", empty, empty],
    [1, 100, "Numpad6", 104, "NumPad6", 102, "VK_NUMPAD6", empty, empty],
    [1, 101, "Numpad7", 105, "NumPad7", 103, "VK_NUMPAD7", empty, empty],
    [1, 102, "Numpad8", 106, "NumPad8", 104, "VK_NUMPAD8", empty, empty],
    [1, 103, "Numpad9", 107, "NumPad9", 105, "VK_NUMPAD9", empty, empty],
    [1, 104, "Numpad0", 98, "NumPad0", 96, "VK_NUMPAD0", empty, empty],
    [1, 105, "NumpadDecimal", 112, "NumPad_Decimal", 110, "VK_DECIMAL", empty, empty],
    [0, 106, "IntlBackslash", 97, "OEM_102", 226, "VK_OEM_102", empty, empty],
    [1, 107, "ContextMenu", 58, "ContextMenu", 93, empty, empty, empty],
    [1, 108, "Power", 0, empty, 0, empty, empty, empty],
    [1, 109, "NumpadEqual", 0, empty, 0, empty, empty, empty],
    [1, 110, "F13", 71, "F13", 124, "VK_F13", empty, empty],
    [1, 111, "F14", 72, "F14", 125, "VK_F14", empty, empty],
    [1, 112, "F15", 73, "F15", 126, "VK_F15", empty, empty],
    [1, 113, "F16", 74, "F16", 127, "VK_F16", empty, empty],
    [1, 114, "F17", 75, "F17", 128, "VK_F17", empty, empty],
    [1, 115, "F18", 76, "F18", 129, "VK_F18", empty, empty],
    [1, 116, "F19", 77, "F19", 130, "VK_F19", empty, empty],
    [1, 117, "F20", 78, "F20", 131, "VK_F20", empty, empty],
    [1, 118, "F21", 79, "F21", 132, "VK_F21", empty, empty],
    [1, 119, "F22", 80, "F22", 133, "VK_F22", empty, empty],
    [1, 120, "F23", 81, "F23", 134, "VK_F23", empty, empty],
    [1, 121, "F24", 82, "F24", 135, "VK_F24", empty, empty],
    [1, 122, "Open", 0, empty, 0, empty, empty, empty],
    [1, 123, "Help", 0, empty, 0, empty, empty, empty],
    [1, 124, "Select", 0, empty, 0, empty, empty, empty],
    [1, 125, "Again", 0, empty, 0, empty, empty, empty],
    [1, 126, "Undo", 0, empty, 0, empty, empty, empty],
    [1, 127, "Cut", 0, empty, 0, empty, empty, empty],
    [1, 128, "Copy", 0, empty, 0, empty, empty, empty],
    [1, 129, "Paste", 0, empty, 0, empty, empty, empty],
    [1, 130, "Find", 0, empty, 0, empty, empty, empty],
    [1, 131, "AudioVolumeMute", 117, "AudioVolumeMute", 173, "VK_VOLUME_MUTE", empty, empty],
    [1, 132, "AudioVolumeUp", 118, "AudioVolumeUp", 175, "VK_VOLUME_UP", empty, empty],
    [1, 133, "AudioVolumeDown", 119, "AudioVolumeDown", 174, "VK_VOLUME_DOWN", empty, empty],
    [1, 134, "NumpadComma", 110, "NumPad_Separator", 108, "VK_SEPARATOR", empty, empty],
    [0, 135, "IntlRo", 115, "ABNT_C1", 193, "VK_ABNT_C1", empty, empty],
    [1, 136, "KanaMode", 0, empty, 0, empty, empty, empty],
    [0, 137, "IntlYen", 0, empty, 0, empty, empty, empty],
    [1, 138, "Convert", 0, empty, 0, empty, empty, empty],
    [1, 139, "NonConvert", 0, empty, 0, empty, empty, empty],
    [1, 140, "Lang1", 0, empty, 0, empty, empty, empty],
    [1, 141, "Lang2", 0, empty, 0, empty, empty, empty],
    [1, 142, "Lang3", 0, empty, 0, empty, empty, empty],
    [1, 143, "Lang4", 0, empty, 0, empty, empty, empty],
    [1, 144, "Lang5", 0, empty, 0, empty, empty, empty],
    [1, 145, "Abort", 0, empty, 0, empty, empty, empty],
    [1, 146, "Props", 0, empty, 0, empty, empty, empty],
    [1, 147, "NumpadParenLeft", 0, empty, 0, empty, empty, empty],
    [1, 148, "NumpadParenRight", 0, empty, 0, empty, empty, empty],
    [1, 149, "NumpadBackspace", 0, empty, 0, empty, empty, empty],
    [1, 150, "NumpadMemoryStore", 0, empty, 0, empty, empty, empty],
    [1, 151, "NumpadMemoryRecall", 0, empty, 0, empty, empty, empty],
    [1, 152, "NumpadMemoryClear", 0, empty, 0, empty, empty, empty],
    [1, 153, "NumpadMemoryAdd", 0, empty, 0, empty, empty, empty],
    [1, 154, "NumpadMemorySubtract", 0, empty, 0, empty, empty, empty],
    [1, 155, "NumpadClear", 131, "Clear", 12, "VK_CLEAR", empty, empty],
    [1, 156, "NumpadClearEntry", 0, empty, 0, empty, empty, empty],
    [1, 0, empty, 5, "Ctrl", 17, "VK_CONTROL", empty, empty],
    [1, 0, empty, 4, "Shift", 16, "VK_SHIFT", empty, empty],
    [1, 0, empty, 6, "Alt", 18, "VK_MENU", empty, empty],
    [1, 0, empty, 57, "Meta", 91, "VK_COMMAND", empty, empty],
    [1, 157, "ControlLeft", 5, empty, 0, "VK_LCONTROL", empty, empty],
    [1, 158, "ShiftLeft", 4, empty, 0, "VK_LSHIFT", empty, empty],
    [1, 159, "AltLeft", 6, empty, 0, "VK_LMENU", empty, empty],
    [1, 160, "MetaLeft", 57, empty, 0, "VK_LWIN", empty, empty],
    [1, 161, "ControlRight", 5, empty, 0, "VK_RCONTROL", empty, empty],
    [1, 162, "ShiftRight", 4, empty, 0, "VK_RSHIFT", empty, empty],
    [1, 163, "AltRight", 6, empty, 0, "VK_RMENU", empty, empty],
    [1, 164, "MetaRight", 57, empty, 0, "VK_RWIN", empty, empty],
    [1, 165, "BrightnessUp", 0, empty, 0, empty, empty, empty],
    [1, 166, "BrightnessDown", 0, empty, 0, empty, empty, empty],
    [1, 167, "MediaPlay", 0, empty, 0, empty, empty, empty],
    [1, 168, "MediaRecord", 0, empty, 0, empty, empty, empty],
    [1, 169, "MediaFastForward", 0, empty, 0, empty, empty, empty],
    [1, 170, "MediaRewind", 0, empty, 0, empty, empty, empty],
    [1, 171, "MediaTrackNext", 124, "MediaTrackNext", 176, "VK_MEDIA_NEXT_TRACK", empty, empty],
    [1, 172, "MediaTrackPrevious", 125, "MediaTrackPrevious", 177, "VK_MEDIA_PREV_TRACK", empty, empty],
    [1, 173, "MediaStop", 126, "MediaStop", 178, "VK_MEDIA_STOP", empty, empty],
    [1, 174, "Eject", 0, empty, 0, empty, empty, empty],
    [1, 175, "MediaPlayPause", 127, "MediaPlayPause", 179, "VK_MEDIA_PLAY_PAUSE", empty, empty],
    [1, 176, "MediaSelect", 128, "LaunchMediaPlayer", 181, "VK_MEDIA_LAUNCH_MEDIA_SELECT", empty, empty],
    [1, 177, "LaunchMail", 129, "LaunchMail", 180, "VK_MEDIA_LAUNCH_MAIL", empty, empty],
    [1, 178, "LaunchApp2", 130, "LaunchApp2", 183, "VK_MEDIA_LAUNCH_APP2", empty, empty],
    [1, 179, "LaunchApp1", 0, empty, 0, "VK_MEDIA_LAUNCH_APP1", empty, empty],
    [1, 180, "SelectTask", 0, empty, 0, empty, empty, empty],
    [1, 181, "LaunchScreenSaver", 0, empty, 0, empty, empty, empty],
    [1, 182, "BrowserSearch", 120, "BrowserSearch", 170, "VK_BROWSER_SEARCH", empty, empty],
    [1, 183, "BrowserHome", 121, "BrowserHome", 172, "VK_BROWSER_HOME", empty, empty],
    [1, 184, "BrowserBack", 122, "BrowserBack", 166, "VK_BROWSER_BACK", empty, empty],
    [1, 185, "BrowserForward", 123, "BrowserForward", 167, "VK_BROWSER_FORWARD", empty, empty],
    [1, 186, "BrowserStop", 0, empty, 0, "VK_BROWSER_STOP", empty, empty],
    [1, 187, "BrowserRefresh", 0, empty, 0, "VK_BROWSER_REFRESH", empty, empty],
    [1, 188, "BrowserFavorites", 0, empty, 0, "VK_BROWSER_FAVORITES", empty, empty],
    [1, 189, "ZoomToggle", 0, empty, 0, empty, empty, empty],
    [1, 190, "MailReply", 0, empty, 0, empty, empty, empty],
    [1, 191, "MailForward", 0, empty, 0, empty, empty, empty],
    [1, 192, "MailSend", 0, empty, 0, empty, empty, empty],
    // See https://lists.w3.org/Archives/Public/www-dom/2010JulSep/att-0182/keyCode-spec.html
    // If an Input Method Editor is processing key input and the event is keydown, return 229.
    [1, 0, empty, 114, "KeyInComposition", 229, empty, empty, empty],
    [1, 0, empty, 116, "ABNT_C2", 194, "VK_ABNT_C2", empty, empty],
    [1, 0, empty, 96, "OEM_8", 223, "VK_OEM_8", empty, empty],
    [1, 0, empty, 0, empty, 0, "VK_KANA", empty, empty],
    [1, 0, empty, 0, empty, 0, "VK_HANGUL", empty, empty],
    [1, 0, empty, 0, empty, 0, "VK_JUNJA", empty, empty],
    [1, 0, empty, 0, empty, 0, "VK_FINAL", empty, empty],
    [1, 0, empty, 0, empty, 0, "VK_HANJA", empty, empty],
    [1, 0, empty, 0, empty, 0, "VK_KANJI", empty, empty],
    [1, 0, empty, 0, empty, 0, "VK_CONVERT", empty, empty],
    [1, 0, empty, 0, empty, 0, "VK_NONCONVERT", empty, empty],
    [1, 0, empty, 0, empty, 0, "VK_ACCEPT", empty, empty],
    [1, 0, empty, 0, empty, 0, "VK_MODECHANGE", empty, empty],
    [1, 0, empty, 0, empty, 0, "VK_SELECT", empty, empty],
    [1, 0, empty, 0, empty, 0, "VK_PRINT", empty, empty],
    [1, 0, empty, 0, empty, 0, "VK_EXECUTE", empty, empty],
    [1, 0, empty, 0, empty, 0, "VK_SNAPSHOT", empty, empty],
    [1, 0, empty, 0, empty, 0, "VK_HELP", empty, empty],
    [1, 0, empty, 0, empty, 0, "VK_APPS", empty, empty],
    [1, 0, empty, 0, empty, 0, "VK_PROCESSKEY", empty, empty],
    [1, 0, empty, 0, empty, 0, "VK_PACKET", empty, empty],
    [1, 0, empty, 0, empty, 0, "VK_DBE_SBCSCHAR", empty, empty],
    [1, 0, empty, 0, empty, 0, "VK_DBE_DBCSCHAR", empty, empty],
    [1, 0, empty, 0, empty, 0, "VK_ATTN", empty, empty],
    [1, 0, empty, 0, empty, 0, "VK_CRSEL", empty, empty],
    [1, 0, empty, 0, empty, 0, "VK_EXSEL", empty, empty],
    [1, 0, empty, 0, empty, 0, "VK_EREOF", empty, empty],
    [1, 0, empty, 0, empty, 0, "VK_PLAY", empty, empty],
    [1, 0, empty, 0, empty, 0, "VK_ZOOM", empty, empty],
    [1, 0, empty, 0, empty, 0, "VK_NONAME", empty, empty],
    [1, 0, empty, 0, empty, 0, "VK_PA1", empty, empty],
    [1, 0, empty, 0, empty, 0, "VK_OEM_CLEAR", empty, empty]
  ];
  const seenKeyCode = [];
  const seenScanCode = [];
  for (const mapping of mappings) {
    const [immutable, scanCode, scanCodeStr, keyCode, keyCodeStr, eventKeyCode, vkey, usUserSettingsLabel, generalUserSettingsLabel] = mapping;
    if (!seenScanCode[scanCode]) {
      seenScanCode[scanCode] = true;
      scanCodeStrToInt[scanCodeStr] = scanCode;
      scanCodeLowerCaseStrToInt[scanCodeStr.toLowerCase()] = scanCode;
    }
    if (!seenKeyCode[keyCode]) {
      seenKeyCode[keyCode] = true;
      if (!keyCodeStr) {
        throw new Error(`String representation missing for key code ${keyCode} around scan code ${scanCodeStr}`);
      }
      uiMap.define(keyCode, keyCodeStr);
      userSettingsUSMap.define(keyCode, usUserSettingsLabel || keyCodeStr);
      userSettingsGeneralMap.define(keyCode, generalUserSettingsLabel || usUserSettingsLabel || keyCodeStr);
    }
    if (eventKeyCode) {
      EVENT_KEY_CODE_MAP[eventKeyCode] = keyCode;
    }
  }
})();
var KeyCodeUtils;
(function(KeyCodeUtils2) {
  function toString(keyCode) {
    return uiMap.keyCodeToStr(keyCode);
  }
  KeyCodeUtils2.toString = toString;
  function fromString(key) {
    return uiMap.strToKeyCode(key);
  }
  KeyCodeUtils2.fromString = fromString;
  function toUserSettingsUS(keyCode) {
    return userSettingsUSMap.keyCodeToStr(keyCode);
  }
  KeyCodeUtils2.toUserSettingsUS = toUserSettingsUS;
  function toUserSettingsGeneral(keyCode) {
    return userSettingsGeneralMap.keyCodeToStr(keyCode);
  }
  KeyCodeUtils2.toUserSettingsGeneral = toUserSettingsGeneral;
  function fromUserSettings(key) {
    return userSettingsUSMap.strToKeyCode(key) || userSettingsGeneralMap.strToKeyCode(key);
  }
  KeyCodeUtils2.fromUserSettings = fromUserSettings;
  function toElectronAccelerator(keyCode) {
    if (keyCode >= 98 && keyCode <= 113) {
      return null;
    }
    switch (keyCode) {
      case 16:
        return "Up";
      case 18:
        return "Down";
      case 15:
        return "Left";
      case 17:
        return "Right";
    }
    return uiMap.keyCodeToStr(keyCode);
  }
  KeyCodeUtils2.toElectronAccelerator = toElectronAccelerator;
})(KeyCodeUtils || (KeyCodeUtils = {}));
class KeyCodeChord {
  constructor(ctrlKey, shiftKey, altKey, metaKey, keyCode) {
    this.ctrlKey = ctrlKey;
    this.shiftKey = shiftKey;
    this.altKey = altKey;
    this.metaKey = metaKey;
    this.keyCode = keyCode;
  }
  equals(other) {
    return other instanceof KeyCodeChord && this.ctrlKey === other.ctrlKey && this.shiftKey === other.shiftKey && this.altKey === other.altKey && this.metaKey === other.metaKey && this.keyCode === other.keyCode;
  }
  isModifierKey() {
    return this.keyCode === 0 || this.keyCode === 5 || this.keyCode === 57 || this.keyCode === 6 || this.keyCode === 4;
  }
  /**
   * Does this keybinding refer to the key code of a modifier and it also has the modifier flag?
   */
  isDuplicateModifierCase() {
    return this.ctrlKey && this.keyCode === 5 || this.shiftKey && this.keyCode === 4 || this.altKey && this.keyCode === 6 || this.metaKey && this.keyCode === 57;
  }
}
function extractKeyCode(e) {
  if (e.charCode) {
    const char = String.fromCharCode(e.charCode).toUpperCase();
    return KeyCodeUtils.fromString(char);
  }
  const keyCode = e.keyCode;
  if (keyCode === 3) {
    return 7;
  } else if (isFirefox) {
    switch (keyCode) {
      case 59:
        return 85;
      case 60:
        if (isLinux) {
          return 97;
        }
        break;
      case 61:
        return 86;
      // based on: https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/keyCode#numpad_keys
      case 107:
        return 109;
      case 109:
        return 111;
      case 173:
        return 88;
      case 224:
        if (isMacintosh) {
          return 57;
        }
        break;
    }
  } else if (isWebKit) {
    if (isMacintosh && keyCode === 93) {
      return 57;
    } else if (!isMacintosh && keyCode === 92) {
      return 57;
    }
  }
  return EVENT_KEY_CODE_MAP[keyCode] || 0;
}
const ctrlKeyMod = isMacintosh ? 256 : 2048;
const altKeyMod = 512;
const shiftKeyMod = 1024;
const metaKeyMod = isMacintosh ? 2048 : 256;
class StandardKeyboardEvent {
  constructor(source) {
    this._standardKeyboardEventBrand = true;
    const e = source;
    this.browserEvent = e;
    this.target = e.target;
    this.ctrlKey = e.ctrlKey;
    this.shiftKey = e.shiftKey;
    this.altKey = e.altKey;
    this.metaKey = e.metaKey;
    this.altGraphKey = e.getModifierState?.("AltGraph");
    this.keyCode = extractKeyCode(e);
    this.code = e.code;
    this.ctrlKey = this.ctrlKey || this.keyCode === 5;
    this.altKey = this.altKey || this.keyCode === 6;
    this.shiftKey = this.shiftKey || this.keyCode === 4;
    this.metaKey = this.metaKey || this.keyCode === 57;
    this._asKeybinding = this._computeKeybinding();
    this._asKeyCodeChord = this._computeKeyCodeChord();
  }
  preventDefault() {
    if (this.browserEvent && this.browserEvent.preventDefault) {
      this.browserEvent.preventDefault();
    }
  }
  stopPropagation() {
    if (this.browserEvent && this.browserEvent.stopPropagation) {
      this.browserEvent.stopPropagation();
    }
  }
  toKeyCodeChord() {
    return this._asKeyCodeChord;
  }
  equals(other) {
    return this._asKeybinding === other;
  }
  _computeKeybinding() {
    let key = 0;
    if (this.keyCode !== 5 && this.keyCode !== 4 && this.keyCode !== 6 && this.keyCode !== 57) {
      key = this.keyCode;
    }
    let result = 0;
    if (this.ctrlKey) {
      result |= ctrlKeyMod;
    }
    if (this.altKey) {
      result |= altKeyMod;
    }
    if (this.shiftKey) {
      result |= shiftKeyMod;
    }
    if (this.metaKey) {
      result |= metaKeyMod;
    }
    result |= key;
    return result;
  }
  _computeKeyCodeChord() {
    let key = 0;
    if (this.keyCode !== 5 && this.keyCode !== 4 && this.keyCode !== 6 && this.keyCode !== 57) {
      key = this.keyCode;
    }
    return new KeyCodeChord(this.ctrlKey, this.shiftKey, this.altKey, this.metaKey, key);
  }
}
const sameOriginWindowChainCache = /* @__PURE__ */ new WeakMap();
function getParentWindowIfSameOrigin(w) {
  if (!w.parent || w.parent === w) {
    return null;
  }
  try {
    const location = w.location;
    const parentLocation = w.parent.location;
    if (location.origin !== "null" && parentLocation.origin !== "null" && location.origin !== parentLocation.origin) {
      return null;
    }
  } catch (e) {
    return null;
  }
  return w.parent;
}
class IframeUtils {
  /**
   * Returns a chain of embedded windows with the same origin (which can be accessed programmatically).
   * Having a chain of length 1 might mean that the current execution environment is running outside of an iframe or inside an iframe embedded in a window with a different origin.
   */
  static getSameOriginWindowChain(targetWindow) {
    let windowChainCache = sameOriginWindowChainCache.get(targetWindow);
    if (!windowChainCache) {
      windowChainCache = [];
      sameOriginWindowChainCache.set(targetWindow, windowChainCache);
      let w = targetWindow;
      let parent;
      do {
        parent = getParentWindowIfSameOrigin(w);
        if (parent) {
          windowChainCache.push({
            window: new WeakRef(w),
            iframeElement: w.frameElement || null
          });
        } else {
          windowChainCache.push({
            window: new WeakRef(w),
            iframeElement: null
          });
        }
        w = parent;
      } while (w);
    }
    return windowChainCache.slice(0);
  }
  /**
   * Returns the position of `childWindow` relative to `ancestorWindow`
   */
  static getPositionOfChildWindowRelativeToAncestorWindow(childWindow, ancestorWindow) {
    if (!ancestorWindow || childWindow === ancestorWindow) {
      return {
        top: 0,
        left: 0
      };
    }
    let top = 0, left = 0;
    const windowChain = this.getSameOriginWindowChain(childWindow);
    for (const windowChainEl of windowChain) {
      const windowInChain = windowChainEl.window.deref();
      top += windowInChain?.scrollY ?? 0;
      left += windowInChain?.scrollX ?? 0;
      if (windowInChain === ancestorWindow) {
        break;
      }
      if (!windowChainEl.iframeElement) {
        break;
      }
      const boundingRect = windowChainEl.iframeElement.getBoundingClientRect();
      top += boundingRect.top;
      left += boundingRect.left;
    }
    return {
      top,
      left
    };
  }
}
class StandardMouseEvent {
  constructor(targetWindow, e) {
    this.timestamp = Date.now();
    this.browserEvent = e;
    this.leftButton = e.button === 0;
    this.middleButton = e.button === 1;
    this.rightButton = e.button === 2;
    this.buttons = e.buttons;
    this.target = e.target;
    this.detail = e.detail || 1;
    if (e.type === "dblclick") {
      this.detail = 2;
    }
    this.ctrlKey = e.ctrlKey;
    this.shiftKey = e.shiftKey;
    this.altKey = e.altKey;
    this.metaKey = e.metaKey;
    if (typeof e.pageX === "number") {
      this.posx = e.pageX;
      this.posy = e.pageY;
    } else {
      this.posx = e.clientX + this.target.ownerDocument.body.scrollLeft + this.target.ownerDocument.documentElement.scrollLeft;
      this.posy = e.clientY + this.target.ownerDocument.body.scrollTop + this.target.ownerDocument.documentElement.scrollTop;
    }
    const iframeOffsets = IframeUtils.getPositionOfChildWindowRelativeToAncestorWindow(targetWindow, e.view);
    this.posx -= iframeOffsets.left;
    this.posy -= iframeOffsets.top;
  }
  preventDefault() {
    this.browserEvent.preventDefault();
  }
  stopPropagation() {
    this.browserEvent.stopPropagation();
  }
}
const shortcutEvent = Object.freeze(function(callback, context) {
  const handle = setTimeout(callback.bind(context), 0);
  return { dispose() {
    clearTimeout(handle);
  } };
});
var CancellationToken;
(function(CancellationToken2) {
  function isCancellationToken(thing) {
    if (thing === CancellationToken2.None || thing === CancellationToken2.Cancelled) {
      return true;
    }
    if (thing instanceof MutableToken) {
      return true;
    }
    if (!thing || typeof thing !== "object") {
      return false;
    }
    return typeof thing.isCancellationRequested === "boolean" && typeof thing.onCancellationRequested === "function";
  }
  CancellationToken2.isCancellationToken = isCancellationToken;
  CancellationToken2.None = Object.freeze({
    isCancellationRequested: false,
    onCancellationRequested: Event.None
  });
  CancellationToken2.Cancelled = Object.freeze({
    isCancellationRequested: true,
    onCancellationRequested: shortcutEvent
  });
})(CancellationToken || (CancellationToken = {}));
class MutableToken {
  constructor() {
    this._isCancelled = false;
    this._emitter = null;
  }
  cancel() {
    if (!this._isCancelled) {
      this._isCancelled = true;
      if (this._emitter) {
        this._emitter.fire(void 0);
        this.dispose();
      }
    }
  }
  get isCancellationRequested() {
    return this._isCancelled;
  }
  get onCancellationRequested() {
    if (this._isCancelled) {
      return shortcutEvent;
    }
    if (!this._emitter) {
      this._emitter = new Emitter();
    }
    return this._emitter.event;
  }
  dispose() {
    if (this._emitter) {
      this._emitter.dispose();
      this._emitter = null;
    }
  }
}
class RunOnceScheduler {
  constructor(runner, delay) {
    this.timeoutToken = -1;
    this.runner = runner;
    this.timeout = delay;
    this.timeoutHandler = this.onTimeout.bind(this);
  }
  /**
   * Dispose RunOnceScheduler
   */
  dispose() {
    this.cancel();
    this.runner = null;
  }
  /**
   * Cancel current scheduled runner (if any).
   */
  cancel() {
    if (this.isScheduled()) {
      clearTimeout(this.timeoutToken);
      this.timeoutToken = -1;
    }
  }
  /**
   * Cancel previous runner (if any) & schedule a new runner.
   */
  schedule(delay = this.timeout) {
    this.cancel();
    this.timeoutToken = setTimeout(this.timeoutHandler, delay);
  }
  get delay() {
    return this.timeout;
  }
  set delay(value) {
    this.timeout = value;
  }
  /**
   * Returns true if scheduled.
   */
  isScheduled() {
    return this.timeoutToken !== -1;
  }
  onTimeout() {
    this.timeoutToken = -1;
    if (this.runner) {
      this.doRun();
    }
  }
  doRun() {
    this.runner?.();
  }
}
var Promises;
(function(Promises2) {
  async function settled(promises) {
    let firstError = void 0;
    const result = await Promise.all(promises.map((promise) => promise.then((value) => value, (error) => {
      if (!firstError) {
        firstError = error;
      }
      return void 0;
    })));
    if (typeof firstError !== "undefined") {
      throw firstError;
    }
    return result;
  }
  Promises2.settled = settled;
  function withAsyncBody(bodyFn) {
    return new Promise(async (resolve, reject) => {
      try {
        await bodyFn(resolve, reject);
      } catch (error) {
        reject(error);
      }
    });
  }
  Promises2.withAsyncBody = withAsyncBody;
})(Promises || (Promises = {}));
class AsyncIterableObject {
  static fromArray(items) {
    return new AsyncIterableObject((writer) => {
      writer.emitMany(items);
    });
  }
  static fromPromise(promise) {
    return new AsyncIterableObject(async (emitter) => {
      emitter.emitMany(await promise);
    });
  }
  static fromPromises(promises) {
    return new AsyncIterableObject(async (emitter) => {
      await Promise.all(promises.map(async (p) => emitter.emitOne(await p)));
    });
  }
  static merge(iterables) {
    return new AsyncIterableObject(async (emitter) => {
      await Promise.all(iterables.map(async (iterable) => {
        for await (const item of iterable) {
          emitter.emitOne(item);
        }
      }));
    });
  }
  static {
    this.EMPTY = AsyncIterableObject.fromArray([]);
  }
  constructor(executor, onReturn) {
    this._state = 0;
    this._results = [];
    this._error = null;
    this._onReturn = onReturn;
    this._onStateChanged = new Emitter();
    queueMicrotask(async () => {
      const writer = {
        emitOne: (item) => this.emitOne(item),
        emitMany: (items) => this.emitMany(items),
        reject: (error) => this.reject(error)
      };
      try {
        await Promise.resolve(executor(writer));
        this.resolve();
      } catch (err) {
        this.reject(err);
      } finally {
        writer.emitOne = void 0;
        writer.emitMany = void 0;
        writer.reject = void 0;
      }
    });
  }
  [Symbol.asyncIterator]() {
    let i = 0;
    return {
      next: async () => {
        do {
          if (this._state === 2) {
            throw this._error;
          }
          if (i < this._results.length) {
            return { done: false, value: this._results[i++] };
          }
          if (this._state === 1) {
            return { done: true, value: void 0 };
          }
          await Event.toPromise(this._onStateChanged.event);
        } while (true);
      },
      return: async () => {
        this._onReturn?.();
        return { done: true, value: void 0 };
      }
    };
  }
  static map(iterable, mapFn) {
    return new AsyncIterableObject(async (emitter) => {
      for await (const item of iterable) {
        emitter.emitOne(mapFn(item));
      }
    });
  }
  map(mapFn) {
    return AsyncIterableObject.map(this, mapFn);
  }
  static filter(iterable, filterFn) {
    return new AsyncIterableObject(async (emitter) => {
      for await (const item of iterable) {
        if (filterFn(item)) {
          emitter.emitOne(item);
        }
      }
    });
  }
  filter(filterFn) {
    return AsyncIterableObject.filter(this, filterFn);
  }
  static coalesce(iterable) {
    return AsyncIterableObject.filter(iterable, (item) => !!item);
  }
  coalesce() {
    return AsyncIterableObject.coalesce(this);
  }
  static async toPromise(iterable) {
    const result = [];
    for await (const item of iterable) {
      result.push(item);
    }
    return result;
  }
  toPromise() {
    return AsyncIterableObject.toPromise(this);
  }
  /**
   * The value will be appended at the end.
   *
   * **NOTE** If `resolve()` or `reject()` have already been called, this method has no effect.
   */
  emitOne(value) {
    if (this._state !== 0) {
      return;
    }
    this._results.push(value);
    this._onStateChanged.fire();
  }
  /**
   * The values will be appended at the end.
   *
   * **NOTE** If `resolve()` or `reject()` have already been called, this method has no effect.
   */
  emitMany(values) {
    if (this._state !== 0) {
      return;
    }
    this._results = this._results.concat(values);
    this._onStateChanged.fire();
  }
  /**
   * Calling `resolve()` will mark the result array as complete.
   *
   * **NOTE** `resolve()` must be called, otherwise all consumers of this iterable will hang indefinitely, similar to a non-resolved promise.
   * **NOTE** If `resolve()` or `reject()` have already been called, this method has no effect.
   */
  resolve() {
    if (this._state !== 0) {
      return;
    }
    this._state = 1;
    this._onStateChanged.fire();
  }
  /**
   * Writing an error will permanently invalidate this iterable.
   * The current users will receive an error thrown, as will all future users.
   *
   * **NOTE** If `resolve()` or `reject()` have already been called, this method has no effect.
   */
  reject(error) {
    if (this._state !== 0) {
      return;
    }
    this._state = 2;
    this._error = error;
    this._onStateChanged.fire();
  }
}
/*! @license DOMPurify 3.1.7 | (c) Cure53 and other contributors | Released under the Apache license 2.0 and Mozilla Public License 2.0 | github.com/cure53/DOMPurify/blob/3.1.7/LICENSE */
const {
  entries,
  setPrototypeOf,
  isFrozen,
  getPrototypeOf,
  getOwnPropertyDescriptor
} = Object;
let {
  freeze,
  seal,
  create
} = Object;
let {
  apply,
  construct
} = typeof Reflect !== "undefined" && Reflect;
if (!freeze) {
  freeze = function freeze2(x) {
    return x;
  };
}
if (!seal) {
  seal = function seal2(x) {
    return x;
  };
}
if (!apply) {
  apply = function apply2(fun, thisValue, args) {
    return fun.apply(thisValue, args);
  };
}
if (!construct) {
  construct = function construct2(Func, args) {
    return new Func(...args);
  };
}
const arrayForEach = unapply(Array.prototype.forEach);
const arrayPop = unapply(Array.prototype.pop);
const arrayPush = unapply(Array.prototype.push);
const stringToLowerCase = unapply(String.prototype.toLowerCase);
const stringToString = unapply(String.prototype.toString);
const stringMatch = unapply(String.prototype.match);
const stringReplace = unapply(String.prototype.replace);
const stringIndexOf = unapply(String.prototype.indexOf);
const stringTrim = unapply(String.prototype.trim);
const objectHasOwnProperty = unapply(Object.prototype.hasOwnProperty);
const regExpTest = unapply(RegExp.prototype.test);
const typeErrorCreate = unconstruct(TypeError);
function unapply(func) {
  return function(thisArg) {
    for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
      args[_key - 1] = arguments[_key];
    }
    return apply(func, thisArg, args);
  };
}
function unconstruct(func) {
  return function() {
    for (var _len2 = arguments.length, args = new Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
      args[_key2] = arguments[_key2];
    }
    return construct(func, args);
  };
}
function addToSet(set, array) {
  let transformCaseFunc = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : stringToLowerCase;
  if (setPrototypeOf) {
    setPrototypeOf(set, null);
  }
  let l = array.length;
  while (l--) {
    let element = array[l];
    if (typeof element === "string") {
      const lcElement = transformCaseFunc(element);
      if (lcElement !== element) {
        if (!isFrozen(array)) {
          array[l] = lcElement;
        }
        element = lcElement;
      }
    }
    set[element] = true;
  }
  return set;
}
function cleanArray(array) {
  for (let index = 0; index < array.length; index++) {
    const isPropertyExist = objectHasOwnProperty(array, index);
    if (!isPropertyExist) {
      array[index] = null;
    }
  }
  return array;
}
function clone(object) {
  const newObject = create(null);
  for (const [property, value] of entries(object)) {
    const isPropertyExist = objectHasOwnProperty(object, property);
    if (isPropertyExist) {
      if (Array.isArray(value)) {
        newObject[property] = cleanArray(value);
      } else if (value && typeof value === "object" && value.constructor === Object) {
        newObject[property] = clone(value);
      } else {
        newObject[property] = value;
      }
    }
  }
  return newObject;
}
function lookupGetter(object, prop) {
  while (object !== null) {
    const desc = getOwnPropertyDescriptor(object, prop);
    if (desc) {
      if (desc.get) {
        return unapply(desc.get);
      }
      if (typeof desc.value === "function") {
        return unapply(desc.value);
      }
    }
    object = getPrototypeOf(object);
  }
  function fallbackValue() {
    return null;
  }
  return fallbackValue;
}
const html$1 = freeze(["a", "abbr", "acronym", "address", "area", "article", "aside", "audio", "b", "bdi", "bdo", "big", "blink", "blockquote", "body", "br", "button", "canvas", "caption", "center", "cite", "code", "col", "colgroup", "content", "data", "datalist", "dd", "decorator", "del", "details", "dfn", "dialog", "dir", "div", "dl", "dt", "element", "em", "fieldset", "figcaption", "figure", "font", "footer", "form", "h1", "h2", "h3", "h4", "h5", "h6", "head", "header", "hgroup", "hr", "html", "i", "img", "input", "ins", "kbd", "label", "legend", "li", "main", "map", "mark", "marquee", "menu", "menuitem", "meter", "nav", "nobr", "ol", "optgroup", "option", "output", "p", "picture", "pre", "progress", "q", "rp", "rt", "ruby", "s", "samp", "section", "select", "shadow", "small", "source", "spacer", "span", "strike", "strong", "style", "sub", "summary", "sup", "table", "tbody", "td", "template", "textarea", "tfoot", "th", "thead", "time", "tr", "track", "tt", "u", "ul", "var", "video", "wbr"]);
const svg$1 = freeze(["svg", "a", "altglyph", "altglyphdef", "altglyphitem", "animatecolor", "animatemotion", "animatetransform", "circle", "clippath", "defs", "desc", "ellipse", "filter", "font", "g", "glyph", "glyphref", "hkern", "image", "line", "lineargradient", "marker", "mask", "metadata", "mpath", "path", "pattern", "polygon", "polyline", "radialgradient", "rect", "stop", "style", "switch", "symbol", "text", "textpath", "title", "tref", "tspan", "view", "vkern"]);
const svgFilters = freeze(["feBlend", "feColorMatrix", "feComponentTransfer", "feComposite", "feConvolveMatrix", "feDiffuseLighting", "feDisplacementMap", "feDistantLight", "feDropShadow", "feFlood", "feFuncA", "feFuncB", "feFuncG", "feFuncR", "feGaussianBlur", "feImage", "feMerge", "feMergeNode", "feMorphology", "feOffset", "fePointLight", "feSpecularLighting", "feSpotLight", "feTile", "feTurbulence"]);
const svgDisallowed = freeze(["animate", "color-profile", "cursor", "discard", "font-face", "font-face-format", "font-face-name", "font-face-src", "font-face-uri", "foreignobject", "hatch", "hatchpath", "mesh", "meshgradient", "meshpatch", "meshrow", "missing-glyph", "script", "set", "solidcolor", "unknown", "use"]);
const mathMl$1 = freeze(["math", "menclose", "merror", "mfenced", "mfrac", "mglyph", "mi", "mlabeledtr", "mmultiscripts", "mn", "mo", "mover", "mpadded", "mphantom", "mroot", "mrow", "ms", "mspace", "msqrt", "mstyle", "msub", "msup", "msubsup", "mtable", "mtd", "mtext", "mtr", "munder", "munderover", "mprescripts"]);
const mathMlDisallowed = freeze(["maction", "maligngroup", "malignmark", "mlongdiv", "mscarries", "mscarry", "msgroup", "mstack", "msline", "msrow", "semantics", "annotation", "annotation-xml", "mprescripts", "none"]);
const text = freeze(["#text"]);
const html = freeze(["accept", "action", "align", "alt", "autocapitalize", "autocomplete", "autopictureinpicture", "autoplay", "background", "bgcolor", "border", "capture", "cellpadding", "cellspacing", "checked", "cite", "class", "clear", "color", "cols", "colspan", "controls", "controlslist", "coords", "crossorigin", "datetime", "decoding", "default", "dir", "disabled", "disablepictureinpicture", "disableremoteplayback", "download", "draggable", "enctype", "enterkeyhint", "face", "for", "headers", "height", "hidden", "high", "href", "hreflang", "id", "inputmode", "integrity", "ismap", "kind", "label", "lang", "list", "loading", "loop", "low", "max", "maxlength", "media", "method", "min", "minlength", "multiple", "muted", "name", "nonce", "noshade", "novalidate", "nowrap", "open", "optimum", "pattern", "placeholder", "playsinline", "popover", "popovertarget", "popovertargetaction", "poster", "preload", "pubdate", "radiogroup", "readonly", "rel", "required", "rev", "reversed", "role", "rows", "rowspan", "spellcheck", "scope", "selected", "shape", "size", "sizes", "span", "srclang", "start", "src", "srcset", "step", "style", "summary", "tabindex", "title", "translate", "type", "usemap", "valign", "value", "width", "wrap", "xmlns", "slot"]);
const svg = freeze(["accent-height", "accumulate", "additive", "alignment-baseline", "amplitude", "ascent", "attributename", "attributetype", "azimuth", "basefrequency", "baseline-shift", "begin", "bias", "by", "class", "clip", "clippathunits", "clip-path", "clip-rule", "color", "color-interpolation", "color-interpolation-filters", "color-profile", "color-rendering", "cx", "cy", "d", "dx", "dy", "diffuseconstant", "direction", "display", "divisor", "dur", "edgemode", "elevation", "end", "exponent", "fill", "fill-opacity", "fill-rule", "filter", "filterunits", "flood-color", "flood-opacity", "font-family", "font-size", "font-size-adjust", "font-stretch", "font-style", "font-variant", "font-weight", "fx", "fy", "g1", "g2", "glyph-name", "glyphref", "gradientunits", "gradienttransform", "height", "href", "id", "image-rendering", "in", "in2", "intercept", "k", "k1", "k2", "k3", "k4", "kerning", "keypoints", "keysplines", "keytimes", "lang", "lengthadjust", "letter-spacing", "kernelmatrix", "kernelunitlength", "lighting-color", "local", "marker-end", "marker-mid", "marker-start", "markerheight", "markerunits", "markerwidth", "maskcontentunits", "maskunits", "max", "mask", "media", "method", "mode", "min", "name", "numoctaves", "offset", "operator", "opacity", "order", "orient", "orientation", "origin", "overflow", "paint-order", "path", "pathlength", "patterncontentunits", "patterntransform", "patternunits", "points", "preservealpha", "preserveaspectratio", "primitiveunits", "r", "rx", "ry", "radius", "refx", "refy", "repeatcount", "repeatdur", "restart", "result", "rotate", "scale", "seed", "shape-rendering", "slope", "specularconstant", "specularexponent", "spreadmethod", "startoffset", "stddeviation", "stitchtiles", "stop-color", "stop-opacity", "stroke-dasharray", "stroke-dashoffset", "stroke-linecap", "stroke-linejoin", "stroke-miterlimit", "stroke-opacity", "stroke", "stroke-width", "style", "surfacescale", "systemlanguage", "tabindex", "tablevalues", "targetx", "targety", "transform", "transform-origin", "text-anchor", "text-decoration", "text-rendering", "textlength", "type", "u1", "u2", "unicode", "values", "viewbox", "visibility", "version", "vert-adv-y", "vert-origin-x", "vert-origin-y", "width", "word-spacing", "wrap", "writing-mode", "xchannelselector", "ychannelselector", "x", "x1", "x2", "xmlns", "y", "y1", "y2", "z", "zoomandpan"]);
const mathMl = freeze(["accent", "accentunder", "align", "bevelled", "close", "columnsalign", "columnlines", "columnspan", "denomalign", "depth", "dir", "display", "displaystyle", "encoding", "fence", "frame", "height", "href", "id", "largeop", "length", "linethickness", "lspace", "lquote", "mathbackground", "mathcolor", "mathsize", "mathvariant", "maxsize", "minsize", "movablelimits", "notation", "numalign", "open", "rowalign", "rowlines", "rowspacing", "rowspan", "rspace", "rquote", "scriptlevel", "scriptminsize", "scriptsizemultiplier", "selection", "separator", "separators", "stretchy", "subscriptshift", "supscriptshift", "symmetric", "voffset", "width", "xmlns"]);
const xml = freeze(["xlink:href", "xml:id", "xlink:title", "xml:space", "xmlns:xlink"]);
const MUSTACHE_EXPR = seal(/\{\{[\w\W]*|[\w\W]*\}\}/gm);
const ERB_EXPR = seal(/<%[\w\W]*|[\w\W]*%>/gm);
const TMPLIT_EXPR = seal(/\${[\w\W]*}/gm);
const DATA_ATTR = seal(/^data-[\-\w.\u00B7-\uFFFF]/);
const ARIA_ATTR = seal(/^aria-[\-\w]+$/);
const IS_ALLOWED_URI = seal(
  /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i
  // eslint-disable-line no-useless-escape
);
const IS_SCRIPT_OR_DATA = seal(/^(?:\w+script|data):/i);
const ATTR_WHITESPACE = seal(
  /[\u0000-\u0020\u00A0\u1680\u180E\u2000-\u2029\u205F\u3000]/g
  // eslint-disable-line no-control-regex
);
const DOCTYPE_NAME = seal(/^html$/i);
const CUSTOM_ELEMENT = seal(/^[a-z][.\w]*(-[.\w]+)+$/i);
var EXPRESSIONS = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  MUSTACHE_EXPR,
  ERB_EXPR,
  TMPLIT_EXPR,
  DATA_ATTR,
  ARIA_ATTR,
  IS_ALLOWED_URI,
  IS_SCRIPT_OR_DATA,
  ATTR_WHITESPACE,
  DOCTYPE_NAME,
  CUSTOM_ELEMENT
});
const NODE_TYPE = {
  element: 1,
  text: 3,
  // Deprecated
  progressingInstruction: 7,
  comment: 8,
  document: 9
};
const getGlobal = function getGlobal2() {
  return typeof window === "undefined" ? null : window;
};
const _createTrustedTypesPolicy = function _createTrustedTypesPolicy2(trustedTypes, purifyHostElement) {
  if (typeof trustedTypes !== "object" || typeof trustedTypes.createPolicy !== "function") {
    return null;
  }
  let suffix = null;
  const ATTR_NAME = "data-tt-policy-suffix";
  if (purifyHostElement && purifyHostElement.hasAttribute(ATTR_NAME)) {
    suffix = purifyHostElement.getAttribute(ATTR_NAME);
  }
  const policyName = "dompurify" + (suffix ? "#" + suffix : "");
  try {
    return trustedTypes.createPolicy(policyName, {
      createHTML(html2) {
        return html2;
      },
      createScriptURL(scriptUrl) {
        return scriptUrl;
      }
    });
  } catch (_) {
    console.warn("TrustedTypes policy " + policyName + " could not be created.");
    return null;
  }
};
function createDOMPurify() {
  let window2 = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : getGlobal();
  const DOMPurify = (root) => createDOMPurify(root);
  DOMPurify.version = "3.1.7";
  DOMPurify.removed = [];
  if (!window2 || !window2.document || window2.document.nodeType !== NODE_TYPE.document) {
    DOMPurify.isSupported = false;
    return DOMPurify;
  }
  let {
    document: document2
  } = window2;
  const originalDocument = document2;
  const currentScript = originalDocument.currentScript;
  const {
    DocumentFragment,
    HTMLTemplateElement,
    Node: Node2,
    Element: Element2,
    NodeFilter,
    NamedNodeMap = window2.NamedNodeMap || window2.MozNamedAttrMap,
    HTMLFormElement,
    DOMParser,
    trustedTypes
  } = window2;
  const ElementPrototype = Element2.prototype;
  const cloneNode = lookupGetter(ElementPrototype, "cloneNode");
  const remove = lookupGetter(ElementPrototype, "remove");
  const getNextSibling = lookupGetter(ElementPrototype, "nextSibling");
  const getChildNodes = lookupGetter(ElementPrototype, "childNodes");
  const getParentNode = lookupGetter(ElementPrototype, "parentNode");
  if (typeof HTMLTemplateElement === "function") {
    const template = document2.createElement("template");
    if (template.content && template.content.ownerDocument) {
      document2 = template.content.ownerDocument;
    }
  }
  let trustedTypesPolicy;
  let emptyHTML = "";
  const {
    implementation,
    createNodeIterator,
    createDocumentFragment,
    getElementsByTagName
  } = document2;
  const {
    importNode
  } = originalDocument;
  let hooks = {};
  DOMPurify.isSupported = typeof entries === "function" && typeof getParentNode === "function" && implementation && implementation.createHTMLDocument !== void 0;
  const {
    MUSTACHE_EXPR: MUSTACHE_EXPR2,
    ERB_EXPR: ERB_EXPR2,
    TMPLIT_EXPR: TMPLIT_EXPR2,
    DATA_ATTR: DATA_ATTR2,
    ARIA_ATTR: ARIA_ATTR2,
    IS_SCRIPT_OR_DATA: IS_SCRIPT_OR_DATA2,
    ATTR_WHITESPACE: ATTR_WHITESPACE2,
    CUSTOM_ELEMENT: CUSTOM_ELEMENT2
  } = EXPRESSIONS;
  let {
    IS_ALLOWED_URI: IS_ALLOWED_URI$1
  } = EXPRESSIONS;
  let ALLOWED_TAGS = null;
  const DEFAULT_ALLOWED_TAGS = addToSet({}, [...html$1, ...svg$1, ...svgFilters, ...mathMl$1, ...text]);
  let ALLOWED_ATTR = null;
  const DEFAULT_ALLOWED_ATTR = addToSet({}, [...html, ...svg, ...mathMl, ...xml]);
  let CUSTOM_ELEMENT_HANDLING = Object.seal(create(null, {
    tagNameCheck: {
      writable: true,
      configurable: false,
      enumerable: true,
      value: null
    },
    attributeNameCheck: {
      writable: true,
      configurable: false,
      enumerable: true,
      value: null
    },
    allowCustomizedBuiltInElements: {
      writable: true,
      configurable: false,
      enumerable: true,
      value: false
    }
  }));
  let FORBID_TAGS = null;
  let FORBID_ATTR = null;
  let ALLOW_ARIA_ATTR = true;
  let ALLOW_DATA_ATTR = true;
  let ALLOW_UNKNOWN_PROTOCOLS = false;
  let ALLOW_SELF_CLOSE_IN_ATTR = true;
  let SAFE_FOR_TEMPLATES = false;
  let SAFE_FOR_XML = true;
  let WHOLE_DOCUMENT = false;
  let SET_CONFIG = false;
  let FORCE_BODY = false;
  let RETURN_DOM = false;
  let RETURN_DOM_FRAGMENT = false;
  let RETURN_TRUSTED_TYPE = false;
  let SANITIZE_DOM = true;
  let SANITIZE_NAMED_PROPS = false;
  const SANITIZE_NAMED_PROPS_PREFIX = "user-content-";
  let KEEP_CONTENT = true;
  let IN_PLACE = false;
  let USE_PROFILES = {};
  let FORBID_CONTENTS = null;
  const DEFAULT_FORBID_CONTENTS = addToSet({}, ["annotation-xml", "audio", "colgroup", "desc", "foreignobject", "head", "iframe", "math", "mi", "mn", "mo", "ms", "mtext", "noembed", "noframes", "noscript", "plaintext", "script", "style", "svg", "template", "thead", "title", "video", "xmp"]);
  let DATA_URI_TAGS = null;
  const DEFAULT_DATA_URI_TAGS = addToSet({}, ["audio", "video", "img", "source", "image", "track"]);
  let URI_SAFE_ATTRIBUTES = null;
  const DEFAULT_URI_SAFE_ATTRIBUTES = addToSet({}, ["alt", "class", "for", "id", "label", "name", "pattern", "placeholder", "role", "summary", "title", "value", "style", "xmlns"]);
  const MATHML_NAMESPACE = "http://www.w3.org/1998/Math/MathML";
  const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
  const HTML_NAMESPACE = "http://www.w3.org/1999/xhtml";
  let NAMESPACE = HTML_NAMESPACE;
  let IS_EMPTY_INPUT = false;
  let ALLOWED_NAMESPACES = null;
  const DEFAULT_ALLOWED_NAMESPACES = addToSet({}, [MATHML_NAMESPACE, SVG_NAMESPACE, HTML_NAMESPACE], stringToString);
  let PARSER_MEDIA_TYPE = null;
  const SUPPORTED_PARSER_MEDIA_TYPES = ["application/xhtml+xml", "text/html"];
  const DEFAULT_PARSER_MEDIA_TYPE = "text/html";
  let transformCaseFunc = null;
  let CONFIG = null;
  const formElement = document2.createElement("form");
  const isRegexOrFunction = function isRegexOrFunction2(testValue) {
    return testValue instanceof RegExp || testValue instanceof Function;
  };
  const _parseConfig = function _parseConfig2() {
    let cfg = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
    if (CONFIG && CONFIG === cfg) {
      return;
    }
    if (!cfg || typeof cfg !== "object") {
      cfg = {};
    }
    cfg = clone(cfg);
    PARSER_MEDIA_TYPE = // eslint-disable-next-line unicorn/prefer-includes
    SUPPORTED_PARSER_MEDIA_TYPES.indexOf(cfg.PARSER_MEDIA_TYPE) === -1 ? DEFAULT_PARSER_MEDIA_TYPE : cfg.PARSER_MEDIA_TYPE;
    transformCaseFunc = PARSER_MEDIA_TYPE === "application/xhtml+xml" ? stringToString : stringToLowerCase;
    ALLOWED_TAGS = objectHasOwnProperty(cfg, "ALLOWED_TAGS") ? addToSet({}, cfg.ALLOWED_TAGS, transformCaseFunc) : DEFAULT_ALLOWED_TAGS;
    ALLOWED_ATTR = objectHasOwnProperty(cfg, "ALLOWED_ATTR") ? addToSet({}, cfg.ALLOWED_ATTR, transformCaseFunc) : DEFAULT_ALLOWED_ATTR;
    ALLOWED_NAMESPACES = objectHasOwnProperty(cfg, "ALLOWED_NAMESPACES") ? addToSet({}, cfg.ALLOWED_NAMESPACES, stringToString) : DEFAULT_ALLOWED_NAMESPACES;
    URI_SAFE_ATTRIBUTES = objectHasOwnProperty(cfg, "ADD_URI_SAFE_ATTR") ? addToSet(
      clone(DEFAULT_URI_SAFE_ATTRIBUTES),
      // eslint-disable-line indent
      cfg.ADD_URI_SAFE_ATTR,
      // eslint-disable-line indent
      transformCaseFunc
      // eslint-disable-line indent
    ) : DEFAULT_URI_SAFE_ATTRIBUTES;
    DATA_URI_TAGS = objectHasOwnProperty(cfg, "ADD_DATA_URI_TAGS") ? addToSet(
      clone(DEFAULT_DATA_URI_TAGS),
      // eslint-disable-line indent
      cfg.ADD_DATA_URI_TAGS,
      // eslint-disable-line indent
      transformCaseFunc
      // eslint-disable-line indent
    ) : DEFAULT_DATA_URI_TAGS;
    FORBID_CONTENTS = objectHasOwnProperty(cfg, "FORBID_CONTENTS") ? addToSet({}, cfg.FORBID_CONTENTS, transformCaseFunc) : DEFAULT_FORBID_CONTENTS;
    FORBID_TAGS = objectHasOwnProperty(cfg, "FORBID_TAGS") ? addToSet({}, cfg.FORBID_TAGS, transformCaseFunc) : {};
    FORBID_ATTR = objectHasOwnProperty(cfg, "FORBID_ATTR") ? addToSet({}, cfg.FORBID_ATTR, transformCaseFunc) : {};
    USE_PROFILES = objectHasOwnProperty(cfg, "USE_PROFILES") ? cfg.USE_PROFILES : false;
    ALLOW_ARIA_ATTR = cfg.ALLOW_ARIA_ATTR !== false;
    ALLOW_DATA_ATTR = cfg.ALLOW_DATA_ATTR !== false;
    ALLOW_UNKNOWN_PROTOCOLS = cfg.ALLOW_UNKNOWN_PROTOCOLS || false;
    ALLOW_SELF_CLOSE_IN_ATTR = cfg.ALLOW_SELF_CLOSE_IN_ATTR !== false;
    SAFE_FOR_TEMPLATES = cfg.SAFE_FOR_TEMPLATES || false;
    SAFE_FOR_XML = cfg.SAFE_FOR_XML !== false;
    WHOLE_DOCUMENT = cfg.WHOLE_DOCUMENT || false;
    RETURN_DOM = cfg.RETURN_DOM || false;
    RETURN_DOM_FRAGMENT = cfg.RETURN_DOM_FRAGMENT || false;
    RETURN_TRUSTED_TYPE = cfg.RETURN_TRUSTED_TYPE || false;
    FORCE_BODY = cfg.FORCE_BODY || false;
    SANITIZE_DOM = cfg.SANITIZE_DOM !== false;
    SANITIZE_NAMED_PROPS = cfg.SANITIZE_NAMED_PROPS || false;
    KEEP_CONTENT = cfg.KEEP_CONTENT !== false;
    IN_PLACE = cfg.IN_PLACE || false;
    IS_ALLOWED_URI$1 = cfg.ALLOWED_URI_REGEXP || IS_ALLOWED_URI;
    NAMESPACE = cfg.NAMESPACE || HTML_NAMESPACE;
    CUSTOM_ELEMENT_HANDLING = cfg.CUSTOM_ELEMENT_HANDLING || {};
    if (cfg.CUSTOM_ELEMENT_HANDLING && isRegexOrFunction(cfg.CUSTOM_ELEMENT_HANDLING.tagNameCheck)) {
      CUSTOM_ELEMENT_HANDLING.tagNameCheck = cfg.CUSTOM_ELEMENT_HANDLING.tagNameCheck;
    }
    if (cfg.CUSTOM_ELEMENT_HANDLING && isRegexOrFunction(cfg.CUSTOM_ELEMENT_HANDLING.attributeNameCheck)) {
      CUSTOM_ELEMENT_HANDLING.attributeNameCheck = cfg.CUSTOM_ELEMENT_HANDLING.attributeNameCheck;
    }
    if (cfg.CUSTOM_ELEMENT_HANDLING && typeof cfg.CUSTOM_ELEMENT_HANDLING.allowCustomizedBuiltInElements === "boolean") {
      CUSTOM_ELEMENT_HANDLING.allowCustomizedBuiltInElements = cfg.CUSTOM_ELEMENT_HANDLING.allowCustomizedBuiltInElements;
    }
    if (SAFE_FOR_TEMPLATES) {
      ALLOW_DATA_ATTR = false;
    }
    if (RETURN_DOM_FRAGMENT) {
      RETURN_DOM = true;
    }
    if (USE_PROFILES) {
      ALLOWED_TAGS = addToSet({}, text);
      ALLOWED_ATTR = [];
      if (USE_PROFILES.html === true) {
        addToSet(ALLOWED_TAGS, html$1);
        addToSet(ALLOWED_ATTR, html);
      }
      if (USE_PROFILES.svg === true) {
        addToSet(ALLOWED_TAGS, svg$1);
        addToSet(ALLOWED_ATTR, svg);
        addToSet(ALLOWED_ATTR, xml);
      }
      if (USE_PROFILES.svgFilters === true) {
        addToSet(ALLOWED_TAGS, svgFilters);
        addToSet(ALLOWED_ATTR, svg);
        addToSet(ALLOWED_ATTR, xml);
      }
      if (USE_PROFILES.mathMl === true) {
        addToSet(ALLOWED_TAGS, mathMl$1);
        addToSet(ALLOWED_ATTR, mathMl);
        addToSet(ALLOWED_ATTR, xml);
      }
    }
    if (cfg.ADD_TAGS) {
      if (ALLOWED_TAGS === DEFAULT_ALLOWED_TAGS) {
        ALLOWED_TAGS = clone(ALLOWED_TAGS);
      }
      addToSet(ALLOWED_TAGS, cfg.ADD_TAGS, transformCaseFunc);
    }
    if (cfg.ADD_ATTR) {
      if (ALLOWED_ATTR === DEFAULT_ALLOWED_ATTR) {
        ALLOWED_ATTR = clone(ALLOWED_ATTR);
      }
      addToSet(ALLOWED_ATTR, cfg.ADD_ATTR, transformCaseFunc);
    }
    if (cfg.ADD_URI_SAFE_ATTR) {
      addToSet(URI_SAFE_ATTRIBUTES, cfg.ADD_URI_SAFE_ATTR, transformCaseFunc);
    }
    if (cfg.FORBID_CONTENTS) {
      if (FORBID_CONTENTS === DEFAULT_FORBID_CONTENTS) {
        FORBID_CONTENTS = clone(FORBID_CONTENTS);
      }
      addToSet(FORBID_CONTENTS, cfg.FORBID_CONTENTS, transformCaseFunc);
    }
    if (KEEP_CONTENT) {
      ALLOWED_TAGS["#text"] = true;
    }
    if (WHOLE_DOCUMENT) {
      addToSet(ALLOWED_TAGS, ["html", "head", "body"]);
    }
    if (ALLOWED_TAGS.table) {
      addToSet(ALLOWED_TAGS, ["tbody"]);
      delete FORBID_TAGS.tbody;
    }
    if (cfg.TRUSTED_TYPES_POLICY) {
      if (typeof cfg.TRUSTED_TYPES_POLICY.createHTML !== "function") {
        throw typeErrorCreate('TRUSTED_TYPES_POLICY configuration option must provide a "createHTML" hook.');
      }
      if (typeof cfg.TRUSTED_TYPES_POLICY.createScriptURL !== "function") {
        throw typeErrorCreate('TRUSTED_TYPES_POLICY configuration option must provide a "createScriptURL" hook.');
      }
      trustedTypesPolicy = cfg.TRUSTED_TYPES_POLICY;
      emptyHTML = trustedTypesPolicy.createHTML("");
    } else {
      if (trustedTypesPolicy === void 0) {
        trustedTypesPolicy = _createTrustedTypesPolicy(trustedTypes, currentScript);
      }
      if (trustedTypesPolicy !== null && typeof emptyHTML === "string") {
        emptyHTML = trustedTypesPolicy.createHTML("");
      }
    }
    if (freeze) {
      freeze(cfg);
    }
    CONFIG = cfg;
  };
  const MATHML_TEXT_INTEGRATION_POINTS = addToSet({}, ["mi", "mo", "mn", "ms", "mtext"]);
  const HTML_INTEGRATION_POINTS = addToSet({}, ["annotation-xml"]);
  const COMMON_SVG_AND_HTML_ELEMENTS = addToSet({}, ["title", "style", "font", "a", "script"]);
  const ALL_SVG_TAGS = addToSet({}, [...svg$1, ...svgFilters, ...svgDisallowed]);
  const ALL_MATHML_TAGS = addToSet({}, [...mathMl$1, ...mathMlDisallowed]);
  const _checkValidNamespace = function _checkValidNamespace2(element) {
    let parent = getParentNode(element);
    if (!parent || !parent.tagName) {
      parent = {
        namespaceURI: NAMESPACE,
        tagName: "template"
      };
    }
    const tagName = stringToLowerCase(element.tagName);
    const parentTagName = stringToLowerCase(parent.tagName);
    if (!ALLOWED_NAMESPACES[element.namespaceURI]) {
      return false;
    }
    if (element.namespaceURI === SVG_NAMESPACE) {
      if (parent.namespaceURI === HTML_NAMESPACE) {
        return tagName === "svg";
      }
      if (parent.namespaceURI === MATHML_NAMESPACE) {
        return tagName === "svg" && (parentTagName === "annotation-xml" || MATHML_TEXT_INTEGRATION_POINTS[parentTagName]);
      }
      return Boolean(ALL_SVG_TAGS[tagName]);
    }
    if (element.namespaceURI === MATHML_NAMESPACE) {
      if (parent.namespaceURI === HTML_NAMESPACE) {
        return tagName === "math";
      }
      if (parent.namespaceURI === SVG_NAMESPACE) {
        return tagName === "math" && HTML_INTEGRATION_POINTS[parentTagName];
      }
      return Boolean(ALL_MATHML_TAGS[tagName]);
    }
    if (element.namespaceURI === HTML_NAMESPACE) {
      if (parent.namespaceURI === SVG_NAMESPACE && !HTML_INTEGRATION_POINTS[parentTagName]) {
        return false;
      }
      if (parent.namespaceURI === MATHML_NAMESPACE && !MATHML_TEXT_INTEGRATION_POINTS[parentTagName]) {
        return false;
      }
      return !ALL_MATHML_TAGS[tagName] && (COMMON_SVG_AND_HTML_ELEMENTS[tagName] || !ALL_SVG_TAGS[tagName]);
    }
    if (PARSER_MEDIA_TYPE === "application/xhtml+xml" && ALLOWED_NAMESPACES[element.namespaceURI]) {
      return true;
    }
    return false;
  };
  const _forceRemove = function _forceRemove2(node) {
    arrayPush(DOMPurify.removed, {
      element: node
    });
    try {
      getParentNode(node).removeChild(node);
    } catch (_) {
      remove(node);
    }
  };
  const _removeAttribute = function _removeAttribute2(name, node) {
    try {
      arrayPush(DOMPurify.removed, {
        attribute: node.getAttributeNode(name),
        from: node
      });
    } catch (_) {
      arrayPush(DOMPurify.removed, {
        attribute: null,
        from: node
      });
    }
    node.removeAttribute(name);
    if (name === "is" && !ALLOWED_ATTR[name]) {
      if (RETURN_DOM || RETURN_DOM_FRAGMENT) {
        try {
          _forceRemove(node);
        } catch (_) {
        }
      } else {
        try {
          node.setAttribute(name, "");
        } catch (_) {
        }
      }
    }
  };
  const _initDocument = function _initDocument2(dirty) {
    let doc = null;
    let leadingWhitespace = null;
    if (FORCE_BODY) {
      dirty = "<remove></remove>" + dirty;
    } else {
      const matches = stringMatch(dirty, /^[\r\n\t ]+/);
      leadingWhitespace = matches && matches[0];
    }
    if (PARSER_MEDIA_TYPE === "application/xhtml+xml" && NAMESPACE === HTML_NAMESPACE) {
      dirty = '<html xmlns="http://www.w3.org/1999/xhtml"><head></head><body>' + dirty + "</body></html>";
    }
    const dirtyPayload = trustedTypesPolicy ? trustedTypesPolicy.createHTML(dirty) : dirty;
    if (NAMESPACE === HTML_NAMESPACE) {
      try {
        doc = new DOMParser().parseFromString(dirtyPayload, PARSER_MEDIA_TYPE);
      } catch (_) {
      }
    }
    if (!doc || !doc.documentElement) {
      doc = implementation.createDocument(NAMESPACE, "template", null);
      try {
        doc.documentElement.innerHTML = IS_EMPTY_INPUT ? emptyHTML : dirtyPayload;
      } catch (_) {
      }
    }
    const body = doc.body || doc.documentElement;
    if (dirty && leadingWhitespace) {
      body.insertBefore(document2.createTextNode(leadingWhitespace), body.childNodes[0] || null);
    }
    if (NAMESPACE === HTML_NAMESPACE) {
      return getElementsByTagName.call(doc, WHOLE_DOCUMENT ? "html" : "body")[0];
    }
    return WHOLE_DOCUMENT ? doc.documentElement : body;
  };
  const _createNodeIterator = function _createNodeIterator2(root) {
    return createNodeIterator.call(
      root.ownerDocument || root,
      root,
      // eslint-disable-next-line no-bitwise
      NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_COMMENT | NodeFilter.SHOW_TEXT | NodeFilter.SHOW_PROCESSING_INSTRUCTION | NodeFilter.SHOW_CDATA_SECTION,
      null
    );
  };
  const _isClobbered = function _isClobbered2(elm) {
    return elm instanceof HTMLFormElement && (typeof elm.nodeName !== "string" || typeof elm.textContent !== "string" || typeof elm.removeChild !== "function" || !(elm.attributes instanceof NamedNodeMap) || typeof elm.removeAttribute !== "function" || typeof elm.setAttribute !== "function" || typeof elm.namespaceURI !== "string" || typeof elm.insertBefore !== "function" || typeof elm.hasChildNodes !== "function");
  };
  const _isNode = function _isNode2(object) {
    return typeof Node2 === "function" && object instanceof Node2;
  };
  const _executeHook = function _executeHook2(entryPoint, currentNode, data) {
    if (!hooks[entryPoint]) {
      return;
    }
    arrayForEach(hooks[entryPoint], (hook) => {
      hook.call(DOMPurify, currentNode, data, CONFIG);
    });
  };
  const _sanitizeElements = function _sanitizeElements2(currentNode) {
    let content = null;
    _executeHook("beforeSanitizeElements", currentNode, null);
    if (_isClobbered(currentNode)) {
      _forceRemove(currentNode);
      return true;
    }
    const tagName = transformCaseFunc(currentNode.nodeName);
    _executeHook("uponSanitizeElement", currentNode, {
      tagName,
      allowedTags: ALLOWED_TAGS
    });
    if (currentNode.hasChildNodes() && !_isNode(currentNode.firstElementChild) && regExpTest(/<[/\w]/g, currentNode.innerHTML) && regExpTest(/<[/\w]/g, currentNode.textContent)) {
      _forceRemove(currentNode);
      return true;
    }
    if (currentNode.nodeType === NODE_TYPE.progressingInstruction) {
      _forceRemove(currentNode);
      return true;
    }
    if (SAFE_FOR_XML && currentNode.nodeType === NODE_TYPE.comment && regExpTest(/<[/\w]/g, currentNode.data)) {
      _forceRemove(currentNode);
      return true;
    }
    if (!ALLOWED_TAGS[tagName] || FORBID_TAGS[tagName]) {
      if (!FORBID_TAGS[tagName] && _isBasicCustomElement(tagName)) {
        if (CUSTOM_ELEMENT_HANDLING.tagNameCheck instanceof RegExp && regExpTest(CUSTOM_ELEMENT_HANDLING.tagNameCheck, tagName)) {
          return false;
        }
        if (CUSTOM_ELEMENT_HANDLING.tagNameCheck instanceof Function && CUSTOM_ELEMENT_HANDLING.tagNameCheck(tagName)) {
          return false;
        }
      }
      if (KEEP_CONTENT && !FORBID_CONTENTS[tagName]) {
        const parentNode = getParentNode(currentNode) || currentNode.parentNode;
        const childNodes = getChildNodes(currentNode) || currentNode.childNodes;
        if (childNodes && parentNode) {
          const childCount = childNodes.length;
          for (let i = childCount - 1; i >= 0; --i) {
            const childClone = cloneNode(childNodes[i], true);
            childClone.__removalCount = (currentNode.__removalCount || 0) + 1;
            parentNode.insertBefore(childClone, getNextSibling(currentNode));
          }
        }
      }
      _forceRemove(currentNode);
      return true;
    }
    if (currentNode instanceof Element2 && !_checkValidNamespace(currentNode)) {
      _forceRemove(currentNode);
      return true;
    }
    if ((tagName === "noscript" || tagName === "noembed" || tagName === "noframes") && regExpTest(/<\/no(script|embed|frames)/i, currentNode.innerHTML)) {
      _forceRemove(currentNode);
      return true;
    }
    if (SAFE_FOR_TEMPLATES && currentNode.nodeType === NODE_TYPE.text) {
      content = currentNode.textContent;
      arrayForEach([MUSTACHE_EXPR2, ERB_EXPR2, TMPLIT_EXPR2], (expr) => {
        content = stringReplace(content, expr, " ");
      });
      if (currentNode.textContent !== content) {
        arrayPush(DOMPurify.removed, {
          element: currentNode.cloneNode()
        });
        currentNode.textContent = content;
      }
    }
    _executeHook("afterSanitizeElements", currentNode, null);
    return false;
  };
  const _isValidAttribute = function _isValidAttribute2(lcTag, lcName, value) {
    if (SANITIZE_DOM && (lcName === "id" || lcName === "name") && (value in document2 || value in formElement)) {
      return false;
    }
    if (ALLOW_DATA_ATTR && !FORBID_ATTR[lcName] && regExpTest(DATA_ATTR2, lcName)) ;
    else if (ALLOW_ARIA_ATTR && regExpTest(ARIA_ATTR2, lcName)) ;
    else if (!ALLOWED_ATTR[lcName] || FORBID_ATTR[lcName]) {
      if (
        // First condition does a very basic check if a) it's basically a valid custom element tagname AND
        // b) if the tagName passes whatever the user has configured for CUSTOM_ELEMENT_HANDLING.tagNameCheck
        // and c) if the attribute name passes whatever the user has configured for CUSTOM_ELEMENT_HANDLING.attributeNameCheck
        _isBasicCustomElement(lcTag) && (CUSTOM_ELEMENT_HANDLING.tagNameCheck instanceof RegExp && regExpTest(CUSTOM_ELEMENT_HANDLING.tagNameCheck, lcTag) || CUSTOM_ELEMENT_HANDLING.tagNameCheck instanceof Function && CUSTOM_ELEMENT_HANDLING.tagNameCheck(lcTag)) && (CUSTOM_ELEMENT_HANDLING.attributeNameCheck instanceof RegExp && regExpTest(CUSTOM_ELEMENT_HANDLING.attributeNameCheck, lcName) || CUSTOM_ELEMENT_HANDLING.attributeNameCheck instanceof Function && CUSTOM_ELEMENT_HANDLING.attributeNameCheck(lcName)) || // Alternative, second condition checks if it's an `is`-attribute, AND
        // the value passes whatever the user has configured for CUSTOM_ELEMENT_HANDLING.tagNameCheck
        lcName === "is" && CUSTOM_ELEMENT_HANDLING.allowCustomizedBuiltInElements && (CUSTOM_ELEMENT_HANDLING.tagNameCheck instanceof RegExp && regExpTest(CUSTOM_ELEMENT_HANDLING.tagNameCheck, value) || CUSTOM_ELEMENT_HANDLING.tagNameCheck instanceof Function && CUSTOM_ELEMENT_HANDLING.tagNameCheck(value))
      ) ;
      else {
        return false;
      }
    } else if (URI_SAFE_ATTRIBUTES[lcName]) ;
    else if (regExpTest(IS_ALLOWED_URI$1, stringReplace(value, ATTR_WHITESPACE2, ""))) ;
    else if ((lcName === "src" || lcName === "xlink:href" || lcName === "href") && lcTag !== "script" && stringIndexOf(value, "data:") === 0 && DATA_URI_TAGS[lcTag]) ;
    else if (ALLOW_UNKNOWN_PROTOCOLS && !regExpTest(IS_SCRIPT_OR_DATA2, stringReplace(value, ATTR_WHITESPACE2, ""))) ;
    else if (value) {
      return false;
    } else ;
    return true;
  };
  const _isBasicCustomElement = function _isBasicCustomElement2(tagName) {
    return tagName !== "annotation-xml" && stringMatch(tagName, CUSTOM_ELEMENT2);
  };
  const _sanitizeAttributes = function _sanitizeAttributes2(currentNode) {
    _executeHook("beforeSanitizeAttributes", currentNode, null);
    const {
      attributes
    } = currentNode;
    if (!attributes) {
      return;
    }
    const hookEvent = {
      attrName: "",
      attrValue: "",
      keepAttr: true,
      allowedAttributes: ALLOWED_ATTR
    };
    let l = attributes.length;
    while (l--) {
      const attr = attributes[l];
      const {
        name,
        namespaceURI,
        value: attrValue
      } = attr;
      const lcName = transformCaseFunc(name);
      let value = name === "value" ? attrValue : stringTrim(attrValue);
      hookEvent.attrName = lcName;
      hookEvent.attrValue = value;
      hookEvent.keepAttr = true;
      hookEvent.forceKeepAttr = void 0;
      _executeHook("uponSanitizeAttribute", currentNode, hookEvent);
      value = hookEvent.attrValue;
      if (hookEvent.forceKeepAttr) {
        continue;
      }
      _removeAttribute(name, currentNode);
      if (!hookEvent.keepAttr) {
        continue;
      }
      if (!ALLOW_SELF_CLOSE_IN_ATTR && regExpTest(/\/>/i, value)) {
        _removeAttribute(name, currentNode);
        continue;
      }
      if (SAFE_FOR_TEMPLATES) {
        arrayForEach([MUSTACHE_EXPR2, ERB_EXPR2, TMPLIT_EXPR2], (expr) => {
          value = stringReplace(value, expr, " ");
        });
      }
      const lcTag = transformCaseFunc(currentNode.nodeName);
      if (!_isValidAttribute(lcTag, lcName, value)) {
        continue;
      }
      if (SANITIZE_NAMED_PROPS && (lcName === "id" || lcName === "name")) {
        _removeAttribute(name, currentNode);
        value = SANITIZE_NAMED_PROPS_PREFIX + value;
      }
      if (SAFE_FOR_XML && regExpTest(/((--!?|])>)|<\/(style|title)/i, value)) {
        _removeAttribute(name, currentNode);
        continue;
      }
      if (trustedTypesPolicy && typeof trustedTypes === "object" && typeof trustedTypes.getAttributeType === "function") {
        if (namespaceURI) ;
        else {
          switch (trustedTypes.getAttributeType(lcTag, lcName)) {
            case "TrustedHTML": {
              value = trustedTypesPolicy.createHTML(value);
              break;
            }
            case "TrustedScriptURL": {
              value = trustedTypesPolicy.createScriptURL(value);
              break;
            }
          }
        }
      }
      try {
        if (namespaceURI) {
          currentNode.setAttributeNS(namespaceURI, name, value);
        } else {
          currentNode.setAttribute(name, value);
        }
        if (_isClobbered(currentNode)) {
          _forceRemove(currentNode);
        } else {
          arrayPop(DOMPurify.removed);
        }
      } catch (_) {
      }
    }
    _executeHook("afterSanitizeAttributes", currentNode, null);
  };
  const _sanitizeShadowDOM = function _sanitizeShadowDOM2(fragment) {
    let shadowNode = null;
    const shadowIterator = _createNodeIterator(fragment);
    _executeHook("beforeSanitizeShadowDOM", fragment, null);
    while (shadowNode = shadowIterator.nextNode()) {
      _executeHook("uponSanitizeShadowNode", shadowNode, null);
      if (_sanitizeElements(shadowNode)) {
        continue;
      }
      if (shadowNode.content instanceof DocumentFragment) {
        _sanitizeShadowDOM2(shadowNode.content);
      }
      _sanitizeAttributes(shadowNode);
    }
    _executeHook("afterSanitizeShadowDOM", fragment, null);
  };
  DOMPurify.sanitize = function(dirty) {
    let cfg = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
    let body = null;
    let importedNode = null;
    let currentNode = null;
    let returnNode = null;
    IS_EMPTY_INPUT = !dirty;
    if (IS_EMPTY_INPUT) {
      dirty = "<!-->";
    }
    if (typeof dirty !== "string" && !_isNode(dirty)) {
      if (typeof dirty.toString === "function") {
        dirty = dirty.toString();
        if (typeof dirty !== "string") {
          throw typeErrorCreate("dirty is not a string, aborting");
        }
      } else {
        throw typeErrorCreate("toString is not a function");
      }
    }
    if (!DOMPurify.isSupported) {
      return dirty;
    }
    if (!SET_CONFIG) {
      _parseConfig(cfg);
    }
    DOMPurify.removed = [];
    if (typeof dirty === "string") {
      IN_PLACE = false;
    }
    if (IN_PLACE) {
      if (dirty.nodeName) {
        const tagName = transformCaseFunc(dirty.nodeName);
        if (!ALLOWED_TAGS[tagName] || FORBID_TAGS[tagName]) {
          throw typeErrorCreate("root node is forbidden and cannot be sanitized in-place");
        }
      }
    } else if (dirty instanceof Node2) {
      body = _initDocument("<!---->");
      importedNode = body.ownerDocument.importNode(dirty, true);
      if (importedNode.nodeType === NODE_TYPE.element && importedNode.nodeName === "BODY") {
        body = importedNode;
      } else if (importedNode.nodeName === "HTML") {
        body = importedNode;
      } else {
        body.appendChild(importedNode);
      }
    } else {
      if (!RETURN_DOM && !SAFE_FOR_TEMPLATES && !WHOLE_DOCUMENT && // eslint-disable-next-line unicorn/prefer-includes
      dirty.indexOf("<") === -1) {
        return trustedTypesPolicy && RETURN_TRUSTED_TYPE ? trustedTypesPolicy.createHTML(dirty) : dirty;
      }
      body = _initDocument(dirty);
      if (!body) {
        return RETURN_DOM ? null : RETURN_TRUSTED_TYPE ? emptyHTML : "";
      }
    }
    if (body && FORCE_BODY) {
      _forceRemove(body.firstChild);
    }
    const nodeIterator = _createNodeIterator(IN_PLACE ? dirty : body);
    while (currentNode = nodeIterator.nextNode()) {
      if (_sanitizeElements(currentNode)) {
        continue;
      }
      if (currentNode.content instanceof DocumentFragment) {
        _sanitizeShadowDOM(currentNode.content);
      }
      _sanitizeAttributes(currentNode);
    }
    if (IN_PLACE) {
      return dirty;
    }
    if (RETURN_DOM) {
      if (RETURN_DOM_FRAGMENT) {
        returnNode = createDocumentFragment.call(body.ownerDocument);
        while (body.firstChild) {
          returnNode.appendChild(body.firstChild);
        }
      } else {
        returnNode = body;
      }
      if (ALLOWED_ATTR.shadowroot || ALLOWED_ATTR.shadowrootmode) {
        returnNode = importNode.call(originalDocument, returnNode, true);
      }
      return returnNode;
    }
    let serializedHTML = WHOLE_DOCUMENT ? body.outerHTML : body.innerHTML;
    if (WHOLE_DOCUMENT && ALLOWED_TAGS["!doctype"] && body.ownerDocument && body.ownerDocument.doctype && body.ownerDocument.doctype.name && regExpTest(DOCTYPE_NAME, body.ownerDocument.doctype.name)) {
      serializedHTML = "<!DOCTYPE " + body.ownerDocument.doctype.name + ">\n" + serializedHTML;
    }
    if (SAFE_FOR_TEMPLATES) {
      arrayForEach([MUSTACHE_EXPR2, ERB_EXPR2, TMPLIT_EXPR2], (expr) => {
        serializedHTML = stringReplace(serializedHTML, expr, " ");
      });
    }
    return trustedTypesPolicy && RETURN_TRUSTED_TYPE ? trustedTypesPolicy.createHTML(serializedHTML) : serializedHTML;
  };
  DOMPurify.setConfig = function() {
    let cfg = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
    _parseConfig(cfg);
    SET_CONFIG = true;
  };
  DOMPurify.clearConfig = function() {
    CONFIG = null;
    SET_CONFIG = false;
  };
  DOMPurify.isValidAttribute = function(tag, attr, value) {
    if (!CONFIG) {
      _parseConfig({});
    }
    const lcTag = transformCaseFunc(tag);
    const lcName = transformCaseFunc(attr);
    return _isValidAttribute(lcTag, lcName, value);
  };
  DOMPurify.addHook = function(entryPoint, hookFunction) {
    if (typeof hookFunction !== "function") {
      return;
    }
    hooks[entryPoint] = hooks[entryPoint] || [];
    arrayPush(hooks[entryPoint], hookFunction);
  };
  DOMPurify.removeHook = function(entryPoint) {
    if (hooks[entryPoint]) {
      return arrayPop(hooks[entryPoint]);
    }
  };
  DOMPurify.removeHooks = function(entryPoint) {
    if (hooks[entryPoint]) {
      hooks[entryPoint] = [];
    }
  };
  DOMPurify.removeAllHooks = function() {
    hooks = {};
  };
  return DOMPurify;
}
var purify = createDOMPurify();
purify.version;
purify.isSupported;
purify.sanitize;
purify.setConfig;
purify.clearConfig;
purify.isValidAttribute;
purify.addHook;
purify.removeHook;
purify.removeHooks;
purify.removeAllHooks;
function identity(t) {
  return t;
}
class LRUCachedFunction {
  constructor(arg1, arg2) {
    this.lastCache = void 0;
    this.lastArgKey = void 0;
    if (typeof arg1 === "function") {
      this._fn = arg1;
      this._computeKey = identity;
    } else {
      this._fn = arg2;
      this._computeKey = arg1.getCacheKey;
    }
  }
  get(arg) {
    const key = this._computeKey(arg);
    if (this.lastArgKey !== key) {
      this.lastArgKey = key;
      this.lastCache = this._fn(arg);
    }
    return this.lastCache;
  }
}
class Lazy {
  constructor(executor) {
    this.executor = executor;
    this._didRun = false;
  }
  /**
   * Get the wrapped value.
   *
   * This will force evaluation of the lazy value if it has not been resolved yet. Lazy values are only
   * resolved once. `getValue` will re-throw exceptions that are hit while resolving the value
   */
  get value() {
    if (!this._didRun) {
      try {
        this._value = this.executor();
      } catch (err) {
        this._error = err;
      } finally {
        this._didRun = true;
      }
    }
    if (this._error) {
      throw this._error;
    }
    return this._value;
  }
  /**
   * Get the wrapped value without forcing evaluation.
   */
  get rawValue() {
    return this._value;
  }
}
class AmbiguousCharacters {
  static {
    this.ambiguousCharacterData = new Lazy(() => {
      return JSON.parse('{"_common":[8232,32,8233,32,5760,32,8192,32,8193,32,8194,32,8195,32,8196,32,8197,32,8198,32,8200,32,8201,32,8202,32,8287,32,8199,32,8239,32,2042,95,65101,95,65102,95,65103,95,8208,45,8209,45,8210,45,65112,45,1748,45,8259,45,727,45,8722,45,10134,45,11450,45,1549,44,1643,44,8218,44,184,44,42233,44,894,59,2307,58,2691,58,1417,58,1795,58,1796,58,5868,58,65072,58,6147,58,6153,58,8282,58,1475,58,760,58,42889,58,8758,58,720,58,42237,58,451,33,11601,33,660,63,577,63,2429,63,5038,63,42731,63,119149,46,8228,46,1793,46,1794,46,42510,46,68176,46,1632,46,1776,46,42232,46,1373,96,65287,96,8219,96,8242,96,1370,96,1523,96,8175,96,65344,96,900,96,8189,96,8125,96,8127,96,8190,96,697,96,884,96,712,96,714,96,715,96,756,96,699,96,701,96,700,96,702,96,42892,96,1497,96,2036,96,2037,96,5194,96,5836,96,94033,96,94034,96,65339,91,10088,40,10098,40,12308,40,64830,40,65341,93,10089,41,10099,41,12309,41,64831,41,10100,123,119060,123,10101,125,65342,94,8270,42,1645,42,8727,42,66335,42,5941,47,8257,47,8725,47,8260,47,9585,47,10187,47,10744,47,119354,47,12755,47,12339,47,11462,47,20031,47,12035,47,65340,92,65128,92,8726,92,10189,92,10741,92,10745,92,119311,92,119355,92,12756,92,20022,92,12034,92,42872,38,708,94,710,94,5869,43,10133,43,66203,43,8249,60,10094,60,706,60,119350,60,5176,60,5810,60,5120,61,11840,61,12448,61,42239,61,8250,62,10095,62,707,62,119351,62,5171,62,94015,62,8275,126,732,126,8128,126,8764,126,65372,124,65293,45,120784,50,120794,50,120804,50,120814,50,120824,50,130034,50,42842,50,423,50,1000,50,42564,50,5311,50,42735,50,119302,51,120785,51,120795,51,120805,51,120815,51,120825,51,130035,51,42923,51,540,51,439,51,42858,51,11468,51,1248,51,94011,51,71882,51,120786,52,120796,52,120806,52,120816,52,120826,52,130036,52,5070,52,71855,52,120787,53,120797,53,120807,53,120817,53,120827,53,130037,53,444,53,71867,53,120788,54,120798,54,120808,54,120818,54,120828,54,130038,54,11474,54,5102,54,71893,54,119314,55,120789,55,120799,55,120809,55,120819,55,120829,55,130039,55,66770,55,71878,55,2819,56,2538,56,2666,56,125131,56,120790,56,120800,56,120810,56,120820,56,120830,56,130040,56,547,56,546,56,66330,56,2663,57,2920,57,2541,57,3437,57,120791,57,120801,57,120811,57,120821,57,120831,57,130041,57,42862,57,11466,57,71884,57,71852,57,71894,57,9082,97,65345,97,119834,97,119886,97,119938,97,119990,97,120042,97,120094,97,120146,97,120198,97,120250,97,120302,97,120354,97,120406,97,120458,97,593,97,945,97,120514,97,120572,97,120630,97,120688,97,120746,97,65313,65,119808,65,119860,65,119912,65,119964,65,120016,65,120068,65,120120,65,120172,65,120224,65,120276,65,120328,65,120380,65,120432,65,913,65,120488,65,120546,65,120604,65,120662,65,120720,65,5034,65,5573,65,42222,65,94016,65,66208,65,119835,98,119887,98,119939,98,119991,98,120043,98,120095,98,120147,98,120199,98,120251,98,120303,98,120355,98,120407,98,120459,98,388,98,5071,98,5234,98,5551,98,65314,66,8492,66,119809,66,119861,66,119913,66,120017,66,120069,66,120121,66,120173,66,120225,66,120277,66,120329,66,120381,66,120433,66,42932,66,914,66,120489,66,120547,66,120605,66,120663,66,120721,66,5108,66,5623,66,42192,66,66178,66,66209,66,66305,66,65347,99,8573,99,119836,99,119888,99,119940,99,119992,99,120044,99,120096,99,120148,99,120200,99,120252,99,120304,99,120356,99,120408,99,120460,99,7428,99,1010,99,11429,99,43951,99,66621,99,128844,67,71922,67,71913,67,65315,67,8557,67,8450,67,8493,67,119810,67,119862,67,119914,67,119966,67,120018,67,120174,67,120226,67,120278,67,120330,67,120382,67,120434,67,1017,67,11428,67,5087,67,42202,67,66210,67,66306,67,66581,67,66844,67,8574,100,8518,100,119837,100,119889,100,119941,100,119993,100,120045,100,120097,100,120149,100,120201,100,120253,100,120305,100,120357,100,120409,100,120461,100,1281,100,5095,100,5231,100,42194,100,8558,68,8517,68,119811,68,119863,68,119915,68,119967,68,120019,68,120071,68,120123,68,120175,68,120227,68,120279,68,120331,68,120383,68,120435,68,5024,68,5598,68,5610,68,42195,68,8494,101,65349,101,8495,101,8519,101,119838,101,119890,101,119942,101,120046,101,120098,101,120150,101,120202,101,120254,101,120306,101,120358,101,120410,101,120462,101,43826,101,1213,101,8959,69,65317,69,8496,69,119812,69,119864,69,119916,69,120020,69,120072,69,120124,69,120176,69,120228,69,120280,69,120332,69,120384,69,120436,69,917,69,120492,69,120550,69,120608,69,120666,69,120724,69,11577,69,5036,69,42224,69,71846,69,71854,69,66182,69,119839,102,119891,102,119943,102,119995,102,120047,102,120099,102,120151,102,120203,102,120255,102,120307,102,120359,102,120411,102,120463,102,43829,102,42905,102,383,102,7837,102,1412,102,119315,70,8497,70,119813,70,119865,70,119917,70,120021,70,120073,70,120125,70,120177,70,120229,70,120281,70,120333,70,120385,70,120437,70,42904,70,988,70,120778,70,5556,70,42205,70,71874,70,71842,70,66183,70,66213,70,66853,70,65351,103,8458,103,119840,103,119892,103,119944,103,120048,103,120100,103,120152,103,120204,103,120256,103,120308,103,120360,103,120412,103,120464,103,609,103,7555,103,397,103,1409,103,119814,71,119866,71,119918,71,119970,71,120022,71,120074,71,120126,71,120178,71,120230,71,120282,71,120334,71,120386,71,120438,71,1292,71,5056,71,5107,71,42198,71,65352,104,8462,104,119841,104,119945,104,119997,104,120049,104,120101,104,120153,104,120205,104,120257,104,120309,104,120361,104,120413,104,120465,104,1211,104,1392,104,5058,104,65320,72,8459,72,8460,72,8461,72,119815,72,119867,72,119919,72,120023,72,120179,72,120231,72,120283,72,120335,72,120387,72,120439,72,919,72,120494,72,120552,72,120610,72,120668,72,120726,72,11406,72,5051,72,5500,72,42215,72,66255,72,731,105,9075,105,65353,105,8560,105,8505,105,8520,105,119842,105,119894,105,119946,105,119998,105,120050,105,120102,105,120154,105,120206,105,120258,105,120310,105,120362,105,120414,105,120466,105,120484,105,618,105,617,105,953,105,8126,105,890,105,120522,105,120580,105,120638,105,120696,105,120754,105,1110,105,42567,105,1231,105,43893,105,5029,105,71875,105,65354,106,8521,106,119843,106,119895,106,119947,106,119999,106,120051,106,120103,106,120155,106,120207,106,120259,106,120311,106,120363,106,120415,106,120467,106,1011,106,1112,106,65322,74,119817,74,119869,74,119921,74,119973,74,120025,74,120077,74,120129,74,120181,74,120233,74,120285,74,120337,74,120389,74,120441,74,42930,74,895,74,1032,74,5035,74,5261,74,42201,74,119844,107,119896,107,119948,107,120000,107,120052,107,120104,107,120156,107,120208,107,120260,107,120312,107,120364,107,120416,107,120468,107,8490,75,65323,75,119818,75,119870,75,119922,75,119974,75,120026,75,120078,75,120130,75,120182,75,120234,75,120286,75,120338,75,120390,75,120442,75,922,75,120497,75,120555,75,120613,75,120671,75,120729,75,11412,75,5094,75,5845,75,42199,75,66840,75,1472,108,8739,73,9213,73,65512,73,1633,108,1777,73,66336,108,125127,108,120783,73,120793,73,120803,73,120813,73,120823,73,130033,73,65321,73,8544,73,8464,73,8465,73,119816,73,119868,73,119920,73,120024,73,120128,73,120180,73,120232,73,120284,73,120336,73,120388,73,120440,73,65356,108,8572,73,8467,108,119845,108,119897,108,119949,108,120001,108,120053,108,120105,73,120157,73,120209,73,120261,73,120313,73,120365,73,120417,73,120469,73,448,73,120496,73,120554,73,120612,73,120670,73,120728,73,11410,73,1030,73,1216,73,1493,108,1503,108,1575,108,126464,108,126592,108,65166,108,65165,108,1994,108,11599,73,5825,73,42226,73,93992,73,66186,124,66313,124,119338,76,8556,76,8466,76,119819,76,119871,76,119923,76,120027,76,120079,76,120131,76,120183,76,120235,76,120287,76,120339,76,120391,76,120443,76,11472,76,5086,76,5290,76,42209,76,93974,76,71843,76,71858,76,66587,76,66854,76,65325,77,8559,77,8499,77,119820,77,119872,77,119924,77,120028,77,120080,77,120132,77,120184,77,120236,77,120288,77,120340,77,120392,77,120444,77,924,77,120499,77,120557,77,120615,77,120673,77,120731,77,1018,77,11416,77,5047,77,5616,77,5846,77,42207,77,66224,77,66321,77,119847,110,119899,110,119951,110,120003,110,120055,110,120107,110,120159,110,120211,110,120263,110,120315,110,120367,110,120419,110,120471,110,1400,110,1404,110,65326,78,8469,78,119821,78,119873,78,119925,78,119977,78,120029,78,120081,78,120185,78,120237,78,120289,78,120341,78,120393,78,120445,78,925,78,120500,78,120558,78,120616,78,120674,78,120732,78,11418,78,42208,78,66835,78,3074,111,3202,111,3330,111,3458,111,2406,111,2662,111,2790,111,3046,111,3174,111,3302,111,3430,111,3664,111,3792,111,4160,111,1637,111,1781,111,65359,111,8500,111,119848,111,119900,111,119952,111,120056,111,120108,111,120160,111,120212,111,120264,111,120316,111,120368,111,120420,111,120472,111,7439,111,7441,111,43837,111,959,111,120528,111,120586,111,120644,111,120702,111,120760,111,963,111,120532,111,120590,111,120648,111,120706,111,120764,111,11423,111,4351,111,1413,111,1505,111,1607,111,126500,111,126564,111,126596,111,65259,111,65260,111,65258,111,65257,111,1726,111,64428,111,64429,111,64427,111,64426,111,1729,111,64424,111,64425,111,64423,111,64422,111,1749,111,3360,111,4125,111,66794,111,71880,111,71895,111,66604,111,1984,79,2534,79,2918,79,12295,79,70864,79,71904,79,120782,79,120792,79,120802,79,120812,79,120822,79,130032,79,65327,79,119822,79,119874,79,119926,79,119978,79,120030,79,120082,79,120134,79,120186,79,120238,79,120290,79,120342,79,120394,79,120446,79,927,79,120502,79,120560,79,120618,79,120676,79,120734,79,11422,79,1365,79,11604,79,4816,79,2848,79,66754,79,42227,79,71861,79,66194,79,66219,79,66564,79,66838,79,9076,112,65360,112,119849,112,119901,112,119953,112,120005,112,120057,112,120109,112,120161,112,120213,112,120265,112,120317,112,120369,112,120421,112,120473,112,961,112,120530,112,120544,112,120588,112,120602,112,120646,112,120660,112,120704,112,120718,112,120762,112,120776,112,11427,112,65328,80,8473,80,119823,80,119875,80,119927,80,119979,80,120031,80,120083,80,120187,80,120239,80,120291,80,120343,80,120395,80,120447,80,929,80,120504,80,120562,80,120620,80,120678,80,120736,80,11426,80,5090,80,5229,80,42193,80,66197,80,119850,113,119902,113,119954,113,120006,113,120058,113,120110,113,120162,113,120214,113,120266,113,120318,113,120370,113,120422,113,120474,113,1307,113,1379,113,1382,113,8474,81,119824,81,119876,81,119928,81,119980,81,120032,81,120084,81,120188,81,120240,81,120292,81,120344,81,120396,81,120448,81,11605,81,119851,114,119903,114,119955,114,120007,114,120059,114,120111,114,120163,114,120215,114,120267,114,120319,114,120371,114,120423,114,120475,114,43847,114,43848,114,7462,114,11397,114,43905,114,119318,82,8475,82,8476,82,8477,82,119825,82,119877,82,119929,82,120033,82,120189,82,120241,82,120293,82,120345,82,120397,82,120449,82,422,82,5025,82,5074,82,66740,82,5511,82,42211,82,94005,82,65363,115,119852,115,119904,115,119956,115,120008,115,120060,115,120112,115,120164,115,120216,115,120268,115,120320,115,120372,115,120424,115,120476,115,42801,115,445,115,1109,115,43946,115,71873,115,66632,115,65331,83,119826,83,119878,83,119930,83,119982,83,120034,83,120086,83,120138,83,120190,83,120242,83,120294,83,120346,83,120398,83,120450,83,1029,83,1359,83,5077,83,5082,83,42210,83,94010,83,66198,83,66592,83,119853,116,119905,116,119957,116,120009,116,120061,116,120113,116,120165,116,120217,116,120269,116,120321,116,120373,116,120425,116,120477,116,8868,84,10201,84,128872,84,65332,84,119827,84,119879,84,119931,84,119983,84,120035,84,120087,84,120139,84,120191,84,120243,84,120295,84,120347,84,120399,84,120451,84,932,84,120507,84,120565,84,120623,84,120681,84,120739,84,11430,84,5026,84,42196,84,93962,84,71868,84,66199,84,66225,84,66325,84,119854,117,119906,117,119958,117,120010,117,120062,117,120114,117,120166,117,120218,117,120270,117,120322,117,120374,117,120426,117,120478,117,42911,117,7452,117,43854,117,43858,117,651,117,965,117,120534,117,120592,117,120650,117,120708,117,120766,117,1405,117,66806,117,71896,117,8746,85,8899,85,119828,85,119880,85,119932,85,119984,85,120036,85,120088,85,120140,85,120192,85,120244,85,120296,85,120348,85,120400,85,120452,85,1357,85,4608,85,66766,85,5196,85,42228,85,94018,85,71864,85,8744,118,8897,118,65366,118,8564,118,119855,118,119907,118,119959,118,120011,118,120063,118,120115,118,120167,118,120219,118,120271,118,120323,118,120375,118,120427,118,120479,118,7456,118,957,118,120526,118,120584,118,120642,118,120700,118,120758,118,1141,118,1496,118,71430,118,43945,118,71872,118,119309,86,1639,86,1783,86,8548,86,119829,86,119881,86,119933,86,119985,86,120037,86,120089,86,120141,86,120193,86,120245,86,120297,86,120349,86,120401,86,120453,86,1140,86,11576,86,5081,86,5167,86,42719,86,42214,86,93960,86,71840,86,66845,86,623,119,119856,119,119908,119,119960,119,120012,119,120064,119,120116,119,120168,119,120220,119,120272,119,120324,119,120376,119,120428,119,120480,119,7457,119,1121,119,1309,119,1377,119,71434,119,71438,119,71439,119,43907,119,71919,87,71910,87,119830,87,119882,87,119934,87,119986,87,120038,87,120090,87,120142,87,120194,87,120246,87,120298,87,120350,87,120402,87,120454,87,1308,87,5043,87,5076,87,42218,87,5742,120,10539,120,10540,120,10799,120,65368,120,8569,120,119857,120,119909,120,119961,120,120013,120,120065,120,120117,120,120169,120,120221,120,120273,120,120325,120,120377,120,120429,120,120481,120,5441,120,5501,120,5741,88,9587,88,66338,88,71916,88,65336,88,8553,88,119831,88,119883,88,119935,88,119987,88,120039,88,120091,88,120143,88,120195,88,120247,88,120299,88,120351,88,120403,88,120455,88,42931,88,935,88,120510,88,120568,88,120626,88,120684,88,120742,88,11436,88,11613,88,5815,88,42219,88,66192,88,66228,88,66327,88,66855,88,611,121,7564,121,65369,121,119858,121,119910,121,119962,121,120014,121,120066,121,120118,121,120170,121,120222,121,120274,121,120326,121,120378,121,120430,121,120482,121,655,121,7935,121,43866,121,947,121,8509,121,120516,121,120574,121,120632,121,120690,121,120748,121,1199,121,4327,121,71900,121,65337,89,119832,89,119884,89,119936,89,119988,89,120040,89,120092,89,120144,89,120196,89,120248,89,120300,89,120352,89,120404,89,120456,89,933,89,978,89,120508,89,120566,89,120624,89,120682,89,120740,89,11432,89,1198,89,5033,89,5053,89,42220,89,94019,89,71844,89,66226,89,119859,122,119911,122,119963,122,120015,122,120067,122,120119,122,120171,122,120223,122,120275,122,120327,122,120379,122,120431,122,120483,122,7458,122,43923,122,71876,122,66293,90,71909,90,65338,90,8484,90,8488,90,119833,90,119885,90,119937,90,119989,90,120041,90,120197,90,120249,90,120301,90,120353,90,120405,90,120457,90,918,90,120493,90,120551,90,120609,90,120667,90,120725,90,5059,90,42204,90,71849,90,65282,34,65284,36,65285,37,65286,38,65290,42,65291,43,65294,46,65295,47,65296,48,65297,49,65298,50,65299,51,65300,52,65301,53,65302,54,65303,55,65304,56,65305,57,65308,60,65309,61,65310,62,65312,64,65316,68,65318,70,65319,71,65324,76,65329,81,65330,82,65333,85,65334,86,65335,87,65343,95,65346,98,65348,100,65350,102,65355,107,65357,109,65358,110,65361,113,65362,114,65364,116,65365,117,65367,119,65370,122,65371,123,65373,125,119846,109],"_default":[160,32,8211,45,65374,126,65306,58,65281,33,8216,96,8217,96,8245,96,180,96,12494,47,1047,51,1073,54,1072,97,1040,65,1068,98,1042,66,1089,99,1057,67,1077,101,1045,69,1053,72,305,105,1050,75,921,73,1052,77,1086,111,1054,79,1009,112,1088,112,1056,80,1075,114,1058,84,215,120,1093,120,1061,88,1091,121,1059,89,65283,35,65288,40,65289,41,65292,44,65307,59,65311,63],"cs":[65374,126,65306,58,65281,33,8216,96,8217,96,8245,96,180,96,12494,47,1047,51,1073,54,1072,97,1040,65,1068,98,1042,66,1089,99,1057,67,1077,101,1045,69,1053,72,305,105,1050,75,921,73,1052,77,1086,111,1054,79,1009,112,1088,112,1056,80,1075,114,1058,84,1093,120,1061,88,1091,121,1059,89,65283,35,65288,40,65289,41,65292,44,65307,59,65311,63],"de":[65374,126,65306,58,65281,33,8216,96,8217,96,8245,96,180,96,12494,47,1047,51,1073,54,1072,97,1040,65,1068,98,1042,66,1089,99,1057,67,1077,101,1045,69,1053,72,305,105,1050,75,921,73,1052,77,1086,111,1054,79,1009,112,1088,112,1056,80,1075,114,1058,84,1093,120,1061,88,1091,121,1059,89,65283,35,65288,40,65289,41,65292,44,65307,59,65311,63],"es":[8211,45,65374,126,65306,58,65281,33,8245,96,180,96,12494,47,1047,51,1073,54,1072,97,1040,65,1068,98,1042,66,1089,99,1057,67,1077,101,1045,69,1053,72,305,105,1050,75,1052,77,1086,111,1054,79,1009,112,1088,112,1056,80,1075,114,1058,84,215,120,1093,120,1061,88,1091,121,1059,89,65283,35,65288,40,65289,41,65292,44,65307,59,65311,63],"fr":[65374,126,65306,58,65281,33,8216,96,8245,96,12494,47,1047,51,1073,54,1072,97,1040,65,1068,98,1042,66,1089,99,1057,67,1077,101,1045,69,1053,72,305,105,1050,75,921,73,1052,77,1086,111,1054,79,1009,112,1088,112,1056,80,1075,114,1058,84,215,120,1093,120,1061,88,1091,121,1059,89,65283,35,65288,40,65289,41,65292,44,65307,59,65311,63],"it":[160,32,8211,45,65374,126,65306,58,65281,33,8216,96,8245,96,180,96,12494,47,1047,51,1073,54,1072,97,1040,65,1068,98,1042,66,1089,99,1057,67,1077,101,1045,69,1053,72,305,105,1050,75,921,73,1052,77,1086,111,1054,79,1009,112,1088,112,1056,80,1075,114,1058,84,215,120,1093,120,1061,88,1091,121,1059,89,65283,35,65288,40,65289,41,65292,44,65307,59,65311,63],"ja":[8211,45,65306,58,65281,33,8216,96,8217,96,8245,96,180,96,1047,51,1073,54,1072,97,1040,65,1068,98,1042,66,1089,99,1057,67,1077,101,1045,69,1053,72,305,105,1050,75,921,73,1052,77,1086,111,1054,79,1009,112,1088,112,1056,80,1075,114,1058,84,215,120,1093,120,1061,88,1091,121,1059,89,65283,35,65292,44,65307,59],"ko":[8211,45,65374,126,65306,58,65281,33,8245,96,180,96,12494,47,1047,51,1073,54,1072,97,1040,65,1068,98,1042,66,1089,99,1057,67,1077,101,1045,69,1053,72,305,105,1050,75,921,73,1052,77,1086,111,1054,79,1009,112,1088,112,1056,80,1075,114,1058,84,215,120,1093,120,1061,88,1091,121,1059,89,65283,35,65288,40,65289,41,65292,44,65307,59,65311,63],"pl":[65374,126,65306,58,65281,33,8216,96,8217,96,8245,96,180,96,12494,47,1047,51,1073,54,1072,97,1040,65,1068,98,1042,66,1089,99,1057,67,1077,101,1045,69,1053,72,305,105,1050,75,921,73,1052,77,1086,111,1054,79,1009,112,1088,112,1056,80,1075,114,1058,84,215,120,1093,120,1061,88,1091,121,1059,89,65283,35,65288,40,65289,41,65292,44,65307,59,65311,63],"pt-BR":[65374,126,65306,58,65281,33,8216,96,8217,96,8245,96,180,96,12494,47,1047,51,1073,54,1072,97,1040,65,1068,98,1042,66,1089,99,1057,67,1077,101,1045,69,1053,72,305,105,1050,75,921,73,1052,77,1086,111,1054,79,1009,112,1088,112,1056,80,1075,114,1058,84,215,120,1093,120,1061,88,1091,121,1059,89,65283,35,65288,40,65289,41,65292,44,65307,59,65311,63],"qps-ploc":[160,32,8211,45,65374,126,65306,58,65281,33,8216,96,8217,96,8245,96,180,96,12494,47,1047,51,1073,54,1072,97,1040,65,1068,98,1042,66,1089,99,1057,67,1077,101,1045,69,1053,72,305,105,1050,75,921,73,1052,77,1086,111,1054,79,1088,112,1056,80,1075,114,1058,84,215,120,1093,120,1061,88,1091,121,1059,89,65283,35,65288,40,65289,41,65292,44,65307,59,65311,63],"ru":[65374,126,65306,58,65281,33,8216,96,8217,96,8245,96,180,96,12494,47,305,105,921,73,1009,112,215,120,65283,35,65288,40,65289,41,65292,44,65307,59,65311,63],"tr":[160,32,8211,45,65374,126,65306,58,65281,33,8245,96,180,96,12494,47,1047,51,1073,54,1072,97,1040,65,1068,98,1042,66,1089,99,1057,67,1077,101,1045,69,1053,72,1050,75,921,73,1052,77,1086,111,1054,79,1009,112,1088,112,1056,80,1075,114,1058,84,215,120,1093,120,1061,88,1091,121,1059,89,65283,35,65288,40,65289,41,65292,44,65307,59,65311,63],"zh-hans":[65374,126,65306,58,65281,33,8245,96,180,96,12494,47,1047,51,1073,54,1072,97,1040,65,1068,98,1042,66,1089,99,1057,67,1077,101,1045,69,1053,72,305,105,1050,75,921,73,1052,77,1086,111,1054,79,1009,112,1088,112,1056,80,1075,114,1058,84,215,120,1093,120,1061,88,1091,121,1059,89,65288,40,65289,41],"zh-hant":[8211,45,65374,126,180,96,12494,47,1047,51,1073,54,1072,97,1040,65,1068,98,1042,66,1089,99,1057,67,1077,101,1045,69,1053,72,305,105,1050,75,921,73,1052,77,1086,111,1054,79,1009,112,1088,112,1056,80,1075,114,1058,84,215,120,1093,120,1061,88,1091,121,1059,89,65283,35,65307,59]}');
    });
  }
  static {
    this.cache = new LRUCachedFunction({ getCacheKey: JSON.stringify }, (locales) => {
      function arrayToMap(arr) {
        const result = /* @__PURE__ */ new Map();
        for (let i = 0; i < arr.length; i += 2) {
          result.set(arr[i], arr[i + 1]);
        }
        return result;
      }
      function mergeMaps(map1, map2) {
        const result = new Map(map1);
        for (const [key, value] of map2) {
          result.set(key, value);
        }
        return result;
      }
      function intersectMaps(map1, map2) {
        if (!map1) {
          return map2;
        }
        const result = /* @__PURE__ */ new Map();
        for (const [key, value] of map1) {
          if (map2.has(key)) {
            result.set(key, value);
          }
        }
        return result;
      }
      const data = this.ambiguousCharacterData.value;
      let filteredLocales = locales.filter((l) => !l.startsWith("_") && l in data);
      if (filteredLocales.length === 0) {
        filteredLocales = ["_default"];
      }
      let languageSpecificMap = void 0;
      for (const locale of filteredLocales) {
        const map2 = arrayToMap(data[locale]);
        languageSpecificMap = intersectMaps(languageSpecificMap, map2);
      }
      const commonMap = arrayToMap(data["_common"]);
      const map = mergeMaps(commonMap, languageSpecificMap);
      return new AmbiguousCharacters(map);
    });
  }
  static getInstance(locales) {
    return AmbiguousCharacters.cache.get(Array.from(locales));
  }
  static {
    this._locales = new Lazy(() => Object.keys(AmbiguousCharacters.ambiguousCharacterData.value).filter((k) => !k.startsWith("_")));
  }
  static getLocales() {
    return AmbiguousCharacters._locales.value;
  }
  constructor(confusableDictionary) {
    this.confusableDictionary = confusableDictionary;
  }
  isAmbiguous(codePoint) {
    return this.confusableDictionary.has(codePoint);
  }
  /**
   * Returns the non basic ASCII code point that the given code point can be confused,
   * or undefined if such code point does note exist.
   */
  getPrimaryConfusable(codePoint) {
    return this.confusableDictionary.get(codePoint);
  }
  getConfusableCodePoints() {
    return new Set(this.confusableDictionary.keys());
  }
}
var define_process_env_default = {};
let safeProcess;
const vscodeGlobal = globalThis.vscode;
if (typeof vscodeGlobal !== "undefined" && typeof vscodeGlobal.process !== "undefined") {
  const sandboxProcess = vscodeGlobal.process;
  safeProcess = {
    get platform() {
      return sandboxProcess.platform;
    },
    get arch() {
      return sandboxProcess.arch;
    },
    get env() {
      return sandboxProcess.env;
    },
    cwd() {
      return sandboxProcess.cwd();
    }
  };
} else if (typeof process !== "undefined" && typeof process?.versions?.node === "string") {
  safeProcess = {
    get platform() {
      return process.platform;
    },
    get arch() {
      return process.arch;
    },
    get env() {
      return define_process_env_default;
    },
    cwd() {
      return define_process_env_default["VSCODE_CWD"] || process.cwd();
    }
  };
} else {
  safeProcess = {
    // Supported
    get platform() {
      return isWindows ? "win32" : isMacintosh ? "darwin" : "linux";
    },
    get arch() {
      return void 0;
    },
    // Unsupported
    get env() {
      return {};
    },
    cwd() {
      return "/";
    }
  };
}
const cwd = safeProcess.cwd;
const env = safeProcess.env;
const platform = safeProcess.platform;
const CHAR_UPPERCASE_A = 65;
const CHAR_LOWERCASE_A = 97;
const CHAR_UPPERCASE_Z = 90;
const CHAR_LOWERCASE_Z = 122;
const CHAR_DOT = 46;
const CHAR_FORWARD_SLASH = 47;
const CHAR_BACKWARD_SLASH = 92;
const CHAR_COLON = 58;
const CHAR_QUESTION_MARK = 63;
class ErrorInvalidArgType extends Error {
  constructor(name, expected, actual) {
    let determiner;
    if (typeof expected === "string" && expected.indexOf("not ") === 0) {
      determiner = "must not be";
      expected = expected.replace(/^not /, "");
    } else {
      determiner = "must be";
    }
    const type = name.indexOf(".") !== -1 ? "property" : "argument";
    let msg = `The "${name}" ${type} ${determiner} of type ${expected}`;
    msg += `. Received type ${typeof actual}`;
    super(msg);
    this.code = "ERR_INVALID_ARG_TYPE";
  }
}
function validateObject(pathObject, name) {
  if (pathObject === null || typeof pathObject !== "object") {
    throw new ErrorInvalidArgType(name, "Object", pathObject);
  }
}
function validateString(value, name) {
  if (typeof value !== "string") {
    throw new ErrorInvalidArgType(name, "string", value);
  }
}
const platformIsWin32 = platform === "win32";
function isPathSeparator(code) {
  return code === CHAR_FORWARD_SLASH || code === CHAR_BACKWARD_SLASH;
}
function isPosixPathSeparator(code) {
  return code === CHAR_FORWARD_SLASH;
}
function isWindowsDeviceRoot(code) {
  return code >= CHAR_UPPERCASE_A && code <= CHAR_UPPERCASE_Z || code >= CHAR_LOWERCASE_A && code <= CHAR_LOWERCASE_Z;
}
function normalizeString(path, allowAboveRoot, separator, isPathSeparator2) {
  let res = "";
  let lastSegmentLength = 0;
  let lastSlash = -1;
  let dots = 0;
  let code = 0;
  for (let i = 0; i <= path.length; ++i) {
    if (i < path.length) {
      code = path.charCodeAt(i);
    } else if (isPathSeparator2(code)) {
      break;
    } else {
      code = CHAR_FORWARD_SLASH;
    }
    if (isPathSeparator2(code)) {
      if (lastSlash === i - 1 || dots === 1) ;
      else if (dots === 2) {
        if (res.length < 2 || lastSegmentLength !== 2 || res.charCodeAt(res.length - 1) !== CHAR_DOT || res.charCodeAt(res.length - 2) !== CHAR_DOT) {
          if (res.length > 2) {
            const lastSlashIndex = res.lastIndexOf(separator);
            if (lastSlashIndex === -1) {
              res = "";
              lastSegmentLength = 0;
            } else {
              res = res.slice(0, lastSlashIndex);
              lastSegmentLength = res.length - 1 - res.lastIndexOf(separator);
            }
            lastSlash = i;
            dots = 0;
            continue;
          } else if (res.length !== 0) {
            res = "";
            lastSegmentLength = 0;
            lastSlash = i;
            dots = 0;
            continue;
          }
        }
        if (allowAboveRoot) {
          res += res.length > 0 ? `${separator}..` : "..";
          lastSegmentLength = 2;
        }
      } else {
        if (res.length > 0) {
          res += `${separator}${path.slice(lastSlash + 1, i)}`;
        } else {
          res = path.slice(lastSlash + 1, i);
        }
        lastSegmentLength = i - lastSlash - 1;
      }
      lastSlash = i;
      dots = 0;
    } else if (code === CHAR_DOT && dots !== -1) {
      ++dots;
    } else {
      dots = -1;
    }
  }
  return res;
}
function formatExt(ext) {
  return ext ? `${ext[0] === "." ? "" : "."}${ext}` : "";
}
function _format(sep2, pathObject) {
  validateObject(pathObject, "pathObject");
  const dir = pathObject.dir || pathObject.root;
  const base = pathObject.base || `${pathObject.name || ""}${formatExt(pathObject.ext)}`;
  if (!dir) {
    return base;
  }
  return dir === pathObject.root ? `${dir}${base}` : `${dir}${sep2}${base}`;
}
const win32 = {
  // path.resolve([from ...], to)
  resolve(...pathSegments) {
    let resolvedDevice = "";
    let resolvedTail = "";
    let resolvedAbsolute = false;
    for (let i = pathSegments.length - 1; i >= -1; i--) {
      let path;
      if (i >= 0) {
        path = pathSegments[i];
        validateString(path, `paths[${i}]`);
        if (path.length === 0) {
          continue;
        }
      } else if (resolvedDevice.length === 0) {
        path = cwd();
      } else {
        path = env[`=${resolvedDevice}`] || cwd();
        if (path === void 0 || path.slice(0, 2).toLowerCase() !== resolvedDevice.toLowerCase() && path.charCodeAt(2) === CHAR_BACKWARD_SLASH) {
          path = `${resolvedDevice}\\`;
        }
      }
      const len = path.length;
      let rootEnd = 0;
      let device = "";
      let isAbsolute = false;
      const code = path.charCodeAt(0);
      if (len === 1) {
        if (isPathSeparator(code)) {
          rootEnd = 1;
          isAbsolute = true;
        }
      } else if (isPathSeparator(code)) {
        isAbsolute = true;
        if (isPathSeparator(path.charCodeAt(1))) {
          let j = 2;
          let last = j;
          while (j < len && !isPathSeparator(path.charCodeAt(j))) {
            j++;
          }
          if (j < len && j !== last) {
            const firstPart = path.slice(last, j);
            last = j;
            while (j < len && isPathSeparator(path.charCodeAt(j))) {
              j++;
            }
            if (j < len && j !== last) {
              last = j;
              while (j < len && !isPathSeparator(path.charCodeAt(j))) {
                j++;
              }
              if (j === len || j !== last) {
                device = `\\\\${firstPart}\\${path.slice(last, j)}`;
                rootEnd = j;
              }
            }
          }
        } else {
          rootEnd = 1;
        }
      } else if (isWindowsDeviceRoot(code) && path.charCodeAt(1) === CHAR_COLON) {
        device = path.slice(0, 2);
        rootEnd = 2;
        if (len > 2 && isPathSeparator(path.charCodeAt(2))) {
          isAbsolute = true;
          rootEnd = 3;
        }
      }
      if (device.length > 0) {
        if (resolvedDevice.length > 0) {
          if (device.toLowerCase() !== resolvedDevice.toLowerCase()) {
            continue;
          }
        } else {
          resolvedDevice = device;
        }
      }
      if (resolvedAbsolute) {
        if (resolvedDevice.length > 0) {
          break;
        }
      } else {
        resolvedTail = `${path.slice(rootEnd)}\\${resolvedTail}`;
        resolvedAbsolute = isAbsolute;
        if (isAbsolute && resolvedDevice.length > 0) {
          break;
        }
      }
    }
    resolvedTail = normalizeString(resolvedTail, !resolvedAbsolute, "\\", isPathSeparator);
    return resolvedAbsolute ? `${resolvedDevice}\\${resolvedTail}` : `${resolvedDevice}${resolvedTail}` || ".";
  },
  normalize(path) {
    validateString(path, "path");
    const len = path.length;
    if (len === 0) {
      return ".";
    }
    let rootEnd = 0;
    let device;
    let isAbsolute = false;
    const code = path.charCodeAt(0);
    if (len === 1) {
      return isPosixPathSeparator(code) ? "\\" : path;
    }
    if (isPathSeparator(code)) {
      isAbsolute = true;
      if (isPathSeparator(path.charCodeAt(1))) {
        let j = 2;
        let last = j;
        while (j < len && !isPathSeparator(path.charCodeAt(j))) {
          j++;
        }
        if (j < len && j !== last) {
          const firstPart = path.slice(last, j);
          last = j;
          while (j < len && isPathSeparator(path.charCodeAt(j))) {
            j++;
          }
          if (j < len && j !== last) {
            last = j;
            while (j < len && !isPathSeparator(path.charCodeAt(j))) {
              j++;
            }
            if (j === len) {
              return `\\\\${firstPart}\\${path.slice(last)}\\`;
            }
            if (j !== last) {
              device = `\\\\${firstPart}\\${path.slice(last, j)}`;
              rootEnd = j;
            }
          }
        }
      } else {
        rootEnd = 1;
      }
    } else if (isWindowsDeviceRoot(code) && path.charCodeAt(1) === CHAR_COLON) {
      device = path.slice(0, 2);
      rootEnd = 2;
      if (len > 2 && isPathSeparator(path.charCodeAt(2))) {
        isAbsolute = true;
        rootEnd = 3;
      }
    }
    let tail2 = rootEnd < len ? normalizeString(path.slice(rootEnd), !isAbsolute, "\\", isPathSeparator) : "";
    if (tail2.length === 0 && !isAbsolute) {
      tail2 = ".";
    }
    if (tail2.length > 0 && isPathSeparator(path.charCodeAt(len - 1))) {
      tail2 += "\\";
    }
    if (device === void 0) {
      return isAbsolute ? `\\${tail2}` : tail2;
    }
    return isAbsolute ? `${device}\\${tail2}` : `${device}${tail2}`;
  },
  isAbsolute(path) {
    validateString(path, "path");
    const len = path.length;
    if (len === 0) {
      return false;
    }
    const code = path.charCodeAt(0);
    return isPathSeparator(code) || // Possible device root
    len > 2 && isWindowsDeviceRoot(code) && path.charCodeAt(1) === CHAR_COLON && isPathSeparator(path.charCodeAt(2));
  },
  join(...paths) {
    if (paths.length === 0) {
      return ".";
    }
    let joined;
    let firstPart;
    for (let i = 0; i < paths.length; ++i) {
      const arg = paths[i];
      validateString(arg, "path");
      if (arg.length > 0) {
        if (joined === void 0) {
          joined = firstPart = arg;
        } else {
          joined += `\\${arg}`;
        }
      }
    }
    if (joined === void 0) {
      return ".";
    }
    let needsReplace = true;
    let slashCount = 0;
    if (typeof firstPart === "string" && isPathSeparator(firstPart.charCodeAt(0))) {
      ++slashCount;
      const firstLen = firstPart.length;
      if (firstLen > 1 && isPathSeparator(firstPart.charCodeAt(1))) {
        ++slashCount;
        if (firstLen > 2) {
          if (isPathSeparator(firstPart.charCodeAt(2))) {
            ++slashCount;
          } else {
            needsReplace = false;
          }
        }
      }
    }
    if (needsReplace) {
      while (slashCount < joined.length && isPathSeparator(joined.charCodeAt(slashCount))) {
        slashCount++;
      }
      if (slashCount >= 2) {
        joined = `\\${joined.slice(slashCount)}`;
      }
    }
    return win32.normalize(joined);
  },
  // It will solve the relative path from `from` to `to`, for instance:
  //  from = 'C:\\orandea\\test\\aaa'
  //  to = 'C:\\orandea\\impl\\bbb'
  // The output of the function should be: '..\\..\\impl\\bbb'
  relative(from, to) {
    validateString(from, "from");
    validateString(to, "to");
    if (from === to) {
      return "";
    }
    const fromOrig = win32.resolve(from);
    const toOrig = win32.resolve(to);
    if (fromOrig === toOrig) {
      return "";
    }
    from = fromOrig.toLowerCase();
    to = toOrig.toLowerCase();
    if (from === to) {
      return "";
    }
    let fromStart = 0;
    while (fromStart < from.length && from.charCodeAt(fromStart) === CHAR_BACKWARD_SLASH) {
      fromStart++;
    }
    let fromEnd = from.length;
    while (fromEnd - 1 > fromStart && from.charCodeAt(fromEnd - 1) === CHAR_BACKWARD_SLASH) {
      fromEnd--;
    }
    const fromLen = fromEnd - fromStart;
    let toStart = 0;
    while (toStart < to.length && to.charCodeAt(toStart) === CHAR_BACKWARD_SLASH) {
      toStart++;
    }
    let toEnd = to.length;
    while (toEnd - 1 > toStart && to.charCodeAt(toEnd - 1) === CHAR_BACKWARD_SLASH) {
      toEnd--;
    }
    const toLen = toEnd - toStart;
    const length = fromLen < toLen ? fromLen : toLen;
    let lastCommonSep = -1;
    let i = 0;
    for (; i < length; i++) {
      const fromCode = from.charCodeAt(fromStart + i);
      if (fromCode !== to.charCodeAt(toStart + i)) {
        break;
      } else if (fromCode === CHAR_BACKWARD_SLASH) {
        lastCommonSep = i;
      }
    }
    if (i !== length) {
      if (lastCommonSep === -1) {
        return toOrig;
      }
    } else {
      if (toLen > length) {
        if (to.charCodeAt(toStart + i) === CHAR_BACKWARD_SLASH) {
          return toOrig.slice(toStart + i + 1);
        }
        if (i === 2) {
          return toOrig.slice(toStart + i);
        }
      }
      if (fromLen > length) {
        if (from.charCodeAt(fromStart + i) === CHAR_BACKWARD_SLASH) {
          lastCommonSep = i;
        } else if (i === 2) {
          lastCommonSep = 3;
        }
      }
      if (lastCommonSep === -1) {
        lastCommonSep = 0;
      }
    }
    let out = "";
    for (i = fromStart + lastCommonSep + 1; i <= fromEnd; ++i) {
      if (i === fromEnd || from.charCodeAt(i) === CHAR_BACKWARD_SLASH) {
        out += out.length === 0 ? ".." : "\\..";
      }
    }
    toStart += lastCommonSep;
    if (out.length > 0) {
      return `${out}${toOrig.slice(toStart, toEnd)}`;
    }
    if (toOrig.charCodeAt(toStart) === CHAR_BACKWARD_SLASH) {
      ++toStart;
    }
    return toOrig.slice(toStart, toEnd);
  },
  toNamespacedPath(path) {
    if (typeof path !== "string" || path.length === 0) {
      return path;
    }
    const resolvedPath = win32.resolve(path);
    if (resolvedPath.length <= 2) {
      return path;
    }
    if (resolvedPath.charCodeAt(0) === CHAR_BACKWARD_SLASH) {
      if (resolvedPath.charCodeAt(1) === CHAR_BACKWARD_SLASH) {
        const code = resolvedPath.charCodeAt(2);
        if (code !== CHAR_QUESTION_MARK && code !== CHAR_DOT) {
          return `\\\\?\\UNC\\${resolvedPath.slice(2)}`;
        }
      }
    } else if (isWindowsDeviceRoot(resolvedPath.charCodeAt(0)) && resolvedPath.charCodeAt(1) === CHAR_COLON && resolvedPath.charCodeAt(2) === CHAR_BACKWARD_SLASH) {
      return `\\\\?\\${resolvedPath}`;
    }
    return path;
  },
  dirname(path) {
    validateString(path, "path");
    const len = path.length;
    if (len === 0) {
      return ".";
    }
    let rootEnd = -1;
    let offset = 0;
    const code = path.charCodeAt(0);
    if (len === 1) {
      return isPathSeparator(code) ? path : ".";
    }
    if (isPathSeparator(code)) {
      rootEnd = offset = 1;
      if (isPathSeparator(path.charCodeAt(1))) {
        let j = 2;
        let last = j;
        while (j < len && !isPathSeparator(path.charCodeAt(j))) {
          j++;
        }
        if (j < len && j !== last) {
          last = j;
          while (j < len && isPathSeparator(path.charCodeAt(j))) {
            j++;
          }
          if (j < len && j !== last) {
            last = j;
            while (j < len && !isPathSeparator(path.charCodeAt(j))) {
              j++;
            }
            if (j === len) {
              return path;
            }
            if (j !== last) {
              rootEnd = offset = j + 1;
            }
          }
        }
      }
    } else if (isWindowsDeviceRoot(code) && path.charCodeAt(1) === CHAR_COLON) {
      rootEnd = len > 2 && isPathSeparator(path.charCodeAt(2)) ? 3 : 2;
      offset = rootEnd;
    }
    let end = -1;
    let matchedSlash = true;
    for (let i = len - 1; i >= offset; --i) {
      if (isPathSeparator(path.charCodeAt(i))) {
        if (!matchedSlash) {
          end = i;
          break;
        }
      } else {
        matchedSlash = false;
      }
    }
    if (end === -1) {
      if (rootEnd === -1) {
        return ".";
      }
      end = rootEnd;
    }
    return path.slice(0, end);
  },
  basename(path, suffix) {
    if (suffix !== void 0) {
      validateString(suffix, "suffix");
    }
    validateString(path, "path");
    let start = 0;
    let end = -1;
    let matchedSlash = true;
    let i;
    if (path.length >= 2 && isWindowsDeviceRoot(path.charCodeAt(0)) && path.charCodeAt(1) === CHAR_COLON) {
      start = 2;
    }
    if (suffix !== void 0 && suffix.length > 0 && suffix.length <= path.length) {
      if (suffix === path) {
        return "";
      }
      let extIdx = suffix.length - 1;
      let firstNonSlashEnd = -1;
      for (i = path.length - 1; i >= start; --i) {
        const code = path.charCodeAt(i);
        if (isPathSeparator(code)) {
          if (!matchedSlash) {
            start = i + 1;
            break;
          }
        } else {
          if (firstNonSlashEnd === -1) {
            matchedSlash = false;
            firstNonSlashEnd = i + 1;
          }
          if (extIdx >= 0) {
            if (code === suffix.charCodeAt(extIdx)) {
              if (--extIdx === -1) {
                end = i;
              }
            } else {
              extIdx = -1;
              end = firstNonSlashEnd;
            }
          }
        }
      }
      if (start === end) {
        end = firstNonSlashEnd;
      } else if (end === -1) {
        end = path.length;
      }
      return path.slice(start, end);
    }
    for (i = path.length - 1; i >= start; --i) {
      if (isPathSeparator(path.charCodeAt(i))) {
        if (!matchedSlash) {
          start = i + 1;
          break;
        }
      } else if (end === -1) {
        matchedSlash = false;
        end = i + 1;
      }
    }
    if (end === -1) {
      return "";
    }
    return path.slice(start, end);
  },
  extname(path) {
    validateString(path, "path");
    let start = 0;
    let startDot = -1;
    let startPart = 0;
    let end = -1;
    let matchedSlash = true;
    let preDotState = 0;
    if (path.length >= 2 && path.charCodeAt(1) === CHAR_COLON && isWindowsDeviceRoot(path.charCodeAt(0))) {
      start = startPart = 2;
    }
    for (let i = path.length - 1; i >= start; --i) {
      const code = path.charCodeAt(i);
      if (isPathSeparator(code)) {
        if (!matchedSlash) {
          startPart = i + 1;
          break;
        }
        continue;
      }
      if (end === -1) {
        matchedSlash = false;
        end = i + 1;
      }
      if (code === CHAR_DOT) {
        if (startDot === -1) {
          startDot = i;
        } else if (preDotState !== 1) {
          preDotState = 1;
        }
      } else if (startDot !== -1) {
        preDotState = -1;
      }
    }
    if (startDot === -1 || end === -1 || // We saw a non-dot character immediately before the dot
    preDotState === 0 || // The (right-most) trimmed path component is exactly '..'
    preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
      return "";
    }
    return path.slice(startDot, end);
  },
  format: _format.bind(null, "\\"),
  parse(path) {
    validateString(path, "path");
    const ret = { root: "", dir: "", base: "", ext: "", name: "" };
    if (path.length === 0) {
      return ret;
    }
    const len = path.length;
    let rootEnd = 0;
    let code = path.charCodeAt(0);
    if (len === 1) {
      if (isPathSeparator(code)) {
        ret.root = ret.dir = path;
        return ret;
      }
      ret.base = ret.name = path;
      return ret;
    }
    if (isPathSeparator(code)) {
      rootEnd = 1;
      if (isPathSeparator(path.charCodeAt(1))) {
        let j = 2;
        let last = j;
        while (j < len && !isPathSeparator(path.charCodeAt(j))) {
          j++;
        }
        if (j < len && j !== last) {
          last = j;
          while (j < len && isPathSeparator(path.charCodeAt(j))) {
            j++;
          }
          if (j < len && j !== last) {
            last = j;
            while (j < len && !isPathSeparator(path.charCodeAt(j))) {
              j++;
            }
            if (j === len) {
              rootEnd = j;
            } else if (j !== last) {
              rootEnd = j + 1;
            }
          }
        }
      }
    } else if (isWindowsDeviceRoot(code) && path.charCodeAt(1) === CHAR_COLON) {
      if (len <= 2) {
        ret.root = ret.dir = path;
        return ret;
      }
      rootEnd = 2;
      if (isPathSeparator(path.charCodeAt(2))) {
        if (len === 3) {
          ret.root = ret.dir = path;
          return ret;
        }
        rootEnd = 3;
      }
    }
    if (rootEnd > 0) {
      ret.root = path.slice(0, rootEnd);
    }
    let startDot = -1;
    let startPart = rootEnd;
    let end = -1;
    let matchedSlash = true;
    let i = path.length - 1;
    let preDotState = 0;
    for (; i >= rootEnd; --i) {
      code = path.charCodeAt(i);
      if (isPathSeparator(code)) {
        if (!matchedSlash) {
          startPart = i + 1;
          break;
        }
        continue;
      }
      if (end === -1) {
        matchedSlash = false;
        end = i + 1;
      }
      if (code === CHAR_DOT) {
        if (startDot === -1) {
          startDot = i;
        } else if (preDotState !== 1) {
          preDotState = 1;
        }
      } else if (startDot !== -1) {
        preDotState = -1;
      }
    }
    if (end !== -1) {
      if (startDot === -1 || // We saw a non-dot character immediately before the dot
      preDotState === 0 || // The (right-most) trimmed path component is exactly '..'
      preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
        ret.base = ret.name = path.slice(startPart, end);
      } else {
        ret.name = path.slice(startPart, startDot);
        ret.base = path.slice(startPart, end);
        ret.ext = path.slice(startDot, end);
      }
    }
    if (startPart > 0 && startPart !== rootEnd) {
      ret.dir = path.slice(0, startPart - 1);
    } else {
      ret.dir = ret.root;
    }
    return ret;
  },
  sep: "\\",
  delimiter: ";",
  win32: null,
  posix: null
};
const posixCwd = (() => {
  if (platformIsWin32) {
    const regexp = /\\/g;
    return () => {
      const cwd$1 = cwd().replace(regexp, "/");
      return cwd$1.slice(cwd$1.indexOf("/"));
    };
  }
  return () => cwd();
})();
const posix = {
  // path.resolve([from ...], to)
  resolve(...pathSegments) {
    let resolvedPath = "";
    let resolvedAbsolute = false;
    for (let i = pathSegments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
      const path = i >= 0 ? pathSegments[i] : posixCwd();
      validateString(path, `paths[${i}]`);
      if (path.length === 0) {
        continue;
      }
      resolvedPath = `${path}/${resolvedPath}`;
      resolvedAbsolute = path.charCodeAt(0) === CHAR_FORWARD_SLASH;
    }
    resolvedPath = normalizeString(resolvedPath, !resolvedAbsolute, "/", isPosixPathSeparator);
    if (resolvedAbsolute) {
      return `/${resolvedPath}`;
    }
    return resolvedPath.length > 0 ? resolvedPath : ".";
  },
  normalize(path) {
    validateString(path, "path");
    if (path.length === 0) {
      return ".";
    }
    const isAbsolute = path.charCodeAt(0) === CHAR_FORWARD_SLASH;
    const trailingSeparator = path.charCodeAt(path.length - 1) === CHAR_FORWARD_SLASH;
    path = normalizeString(path, !isAbsolute, "/", isPosixPathSeparator);
    if (path.length === 0) {
      if (isAbsolute) {
        return "/";
      }
      return trailingSeparator ? "./" : ".";
    }
    if (trailingSeparator) {
      path += "/";
    }
    return isAbsolute ? `/${path}` : path;
  },
  isAbsolute(path) {
    validateString(path, "path");
    return path.length > 0 && path.charCodeAt(0) === CHAR_FORWARD_SLASH;
  },
  join(...paths) {
    if (paths.length === 0) {
      return ".";
    }
    let joined;
    for (let i = 0; i < paths.length; ++i) {
      const arg = paths[i];
      validateString(arg, "path");
      if (arg.length > 0) {
        if (joined === void 0) {
          joined = arg;
        } else {
          joined += `/${arg}`;
        }
      }
    }
    if (joined === void 0) {
      return ".";
    }
    return posix.normalize(joined);
  },
  relative(from, to) {
    validateString(from, "from");
    validateString(to, "to");
    if (from === to) {
      return "";
    }
    from = posix.resolve(from);
    to = posix.resolve(to);
    if (from === to) {
      return "";
    }
    const fromStart = 1;
    const fromEnd = from.length;
    const fromLen = fromEnd - fromStart;
    const toStart = 1;
    const toLen = to.length - toStart;
    const length = fromLen < toLen ? fromLen : toLen;
    let lastCommonSep = -1;
    let i = 0;
    for (; i < length; i++) {
      const fromCode = from.charCodeAt(fromStart + i);
      if (fromCode !== to.charCodeAt(toStart + i)) {
        break;
      } else if (fromCode === CHAR_FORWARD_SLASH) {
        lastCommonSep = i;
      }
    }
    if (i === length) {
      if (toLen > length) {
        if (to.charCodeAt(toStart + i) === CHAR_FORWARD_SLASH) {
          return to.slice(toStart + i + 1);
        }
        if (i === 0) {
          return to.slice(toStart + i);
        }
      } else if (fromLen > length) {
        if (from.charCodeAt(fromStart + i) === CHAR_FORWARD_SLASH) {
          lastCommonSep = i;
        } else if (i === 0) {
          lastCommonSep = 0;
        }
      }
    }
    let out = "";
    for (i = fromStart + lastCommonSep + 1; i <= fromEnd; ++i) {
      if (i === fromEnd || from.charCodeAt(i) === CHAR_FORWARD_SLASH) {
        out += out.length === 0 ? ".." : "/..";
      }
    }
    return `${out}${to.slice(toStart + lastCommonSep)}`;
  },
  toNamespacedPath(path) {
    return path;
  },
  dirname(path) {
    validateString(path, "path");
    if (path.length === 0) {
      return ".";
    }
    const hasRoot = path.charCodeAt(0) === CHAR_FORWARD_SLASH;
    let end = -1;
    let matchedSlash = true;
    for (let i = path.length - 1; i >= 1; --i) {
      if (path.charCodeAt(i) === CHAR_FORWARD_SLASH) {
        if (!matchedSlash) {
          end = i;
          break;
        }
      } else {
        matchedSlash = false;
      }
    }
    if (end === -1) {
      return hasRoot ? "/" : ".";
    }
    if (hasRoot && end === 1) {
      return "//";
    }
    return path.slice(0, end);
  },
  basename(path, suffix) {
    if (suffix !== void 0) {
      validateString(suffix, "ext");
    }
    validateString(path, "path");
    let start = 0;
    let end = -1;
    let matchedSlash = true;
    let i;
    if (suffix !== void 0 && suffix.length > 0 && suffix.length <= path.length) {
      if (suffix === path) {
        return "";
      }
      let extIdx = suffix.length - 1;
      let firstNonSlashEnd = -1;
      for (i = path.length - 1; i >= 0; --i) {
        const code = path.charCodeAt(i);
        if (code === CHAR_FORWARD_SLASH) {
          if (!matchedSlash) {
            start = i + 1;
            break;
          }
        } else {
          if (firstNonSlashEnd === -1) {
            matchedSlash = false;
            firstNonSlashEnd = i + 1;
          }
          if (extIdx >= 0) {
            if (code === suffix.charCodeAt(extIdx)) {
              if (--extIdx === -1) {
                end = i;
              }
            } else {
              extIdx = -1;
              end = firstNonSlashEnd;
            }
          }
        }
      }
      if (start === end) {
        end = firstNonSlashEnd;
      } else if (end === -1) {
        end = path.length;
      }
      return path.slice(start, end);
    }
    for (i = path.length - 1; i >= 0; --i) {
      if (path.charCodeAt(i) === CHAR_FORWARD_SLASH) {
        if (!matchedSlash) {
          start = i + 1;
          break;
        }
      } else if (end === -1) {
        matchedSlash = false;
        end = i + 1;
      }
    }
    if (end === -1) {
      return "";
    }
    return path.slice(start, end);
  },
  extname(path) {
    validateString(path, "path");
    let startDot = -1;
    let startPart = 0;
    let end = -1;
    let matchedSlash = true;
    let preDotState = 0;
    for (let i = path.length - 1; i >= 0; --i) {
      const code = path.charCodeAt(i);
      if (code === CHAR_FORWARD_SLASH) {
        if (!matchedSlash) {
          startPart = i + 1;
          break;
        }
        continue;
      }
      if (end === -1) {
        matchedSlash = false;
        end = i + 1;
      }
      if (code === CHAR_DOT) {
        if (startDot === -1) {
          startDot = i;
        } else if (preDotState !== 1) {
          preDotState = 1;
        }
      } else if (startDot !== -1) {
        preDotState = -1;
      }
    }
    if (startDot === -1 || end === -1 || // We saw a non-dot character immediately before the dot
    preDotState === 0 || // The (right-most) trimmed path component is exactly '..'
    preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
      return "";
    }
    return path.slice(startDot, end);
  },
  format: _format.bind(null, "/"),
  parse(path) {
    validateString(path, "path");
    const ret = { root: "", dir: "", base: "", ext: "", name: "" };
    if (path.length === 0) {
      return ret;
    }
    const isAbsolute = path.charCodeAt(0) === CHAR_FORWARD_SLASH;
    let start;
    if (isAbsolute) {
      ret.root = "/";
      start = 1;
    } else {
      start = 0;
    }
    let startDot = -1;
    let startPart = 0;
    let end = -1;
    let matchedSlash = true;
    let i = path.length - 1;
    let preDotState = 0;
    for (; i >= start; --i) {
      const code = path.charCodeAt(i);
      if (code === CHAR_FORWARD_SLASH) {
        if (!matchedSlash) {
          startPart = i + 1;
          break;
        }
        continue;
      }
      if (end === -1) {
        matchedSlash = false;
        end = i + 1;
      }
      if (code === CHAR_DOT) {
        if (startDot === -1) {
          startDot = i;
        } else if (preDotState !== 1) {
          preDotState = 1;
        }
      } else if (startDot !== -1) {
        preDotState = -1;
      }
    }
    if (end !== -1) {
      const start2 = startPart === 0 && isAbsolute ? 1 : startPart;
      if (startDot === -1 || // We saw a non-dot character immediately before the dot
      preDotState === 0 || // The (right-most) trimmed path component is exactly '..'
      preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
        ret.base = ret.name = path.slice(start2, end);
      } else {
        ret.name = path.slice(start2, startDot);
        ret.base = path.slice(start2, end);
        ret.ext = path.slice(startDot, end);
      }
    }
    if (startPart > 0) {
      ret.dir = path.slice(0, startPart - 1);
    } else if (isAbsolute) {
      ret.dir = "/";
    }
    return ret;
  },
  sep: "/",
  delimiter: ":",
  win32: null,
  posix: null
};
posix.win32 = win32.win32 = win32;
posix.posix = win32.posix = posix;
platformIsWin32 ? win32.normalize : posix.normalize;
platformIsWin32 ? win32.join : posix.join;
platformIsWin32 ? win32.resolve : posix.resolve;
platformIsWin32 ? win32.relative : posix.relative;
platformIsWin32 ? win32.dirname : posix.dirname;
platformIsWin32 ? win32.basename : posix.basename;
platformIsWin32 ? win32.extname : posix.extname;
platformIsWin32 ? win32.sep : posix.sep;
const _schemePattern = /^\w[\w\d+.-]*$/;
const _singleSlashStart = /^\//;
const _doubleSlashStart = /^\/\//;
function _validateUri(ret, _strict) {
  if (!ret.scheme && _strict) {
    throw new Error(`[UriError]: Scheme is missing: {scheme: "", authority: "${ret.authority}", path: "${ret.path}", query: "${ret.query}", fragment: "${ret.fragment}"}`);
  }
  if (ret.scheme && !_schemePattern.test(ret.scheme)) {
    throw new Error("[UriError]: Scheme contains illegal characters.");
  }
  if (ret.path) {
    if (ret.authority) {
      if (!_singleSlashStart.test(ret.path)) {
        throw new Error('[UriError]: If a URI contains an authority component, then the path component must either be empty or begin with a slash ("/") character');
      }
    } else {
      if (_doubleSlashStart.test(ret.path)) {
        throw new Error('[UriError]: If a URI does not contain an authority component, then the path cannot begin with two slash characters ("//")');
      }
    }
  }
}
function _schemeFix(scheme, _strict) {
  if (!scheme && !_strict) {
    return "file";
  }
  return scheme;
}
function _referenceResolution(scheme, path) {
  switch (scheme) {
    case "https":
    case "http":
    case "file":
      if (!path) {
        path = _slash;
      } else if (path[0] !== _slash) {
        path = _slash + path;
      }
      break;
  }
  return path;
}
const _empty = "";
const _slash = "/";
const _regexp = /^(([^:/?#]+?):)?(\/\/([^/?#]*))?([^?#]*)(\?([^#]*))?(#(.*))?/;
class URI {
  static isUri(thing) {
    if (thing instanceof URI) {
      return true;
    }
    if (!thing) {
      return false;
    }
    return typeof thing.authority === "string" && typeof thing.fragment === "string" && typeof thing.path === "string" && typeof thing.query === "string" && typeof thing.scheme === "string" && typeof thing.fsPath === "string" && typeof thing.with === "function" && typeof thing.toString === "function";
  }
  /**
   * @internal
   */
  constructor(schemeOrData, authority, path, query, fragment, _strict = false) {
    if (typeof schemeOrData === "object") {
      this.scheme = schemeOrData.scheme || _empty;
      this.authority = schemeOrData.authority || _empty;
      this.path = schemeOrData.path || _empty;
      this.query = schemeOrData.query || _empty;
      this.fragment = schemeOrData.fragment || _empty;
    } else {
      this.scheme = _schemeFix(schemeOrData, _strict);
      this.authority = authority || _empty;
      this.path = _referenceResolution(this.scheme, path || _empty);
      this.query = query || _empty;
      this.fragment = fragment || _empty;
      _validateUri(this, _strict);
    }
  }
  // ---- filesystem path -----------------------
  /**
   * Returns a string representing the corresponding file system path of this URI.
   * Will handle UNC paths, normalizes windows drive letters to lower-case, and uses the
   * platform specific path separator.
   *
   * * Will *not* validate the path for invalid characters and semantics.
   * * Will *not* look at the scheme of this URI.
   * * The result shall *not* be used for display purposes but for accessing a file on disk.
   *
   *
   * The *difference* to `URI#path` is the use of the platform specific separator and the handling
   * of UNC paths. See the below sample of a file-uri with an authority (UNC path).
   *
   * ```ts
      const u = URI.parse('file://server/c$/folder/file.txt')
      u.authority === 'server'
      u.path === '/shares/c$/file.txt'
      u.fsPath === '\\server\c$\folder\file.txt'
  ```
   *
   * Using `URI#path` to read a file (using fs-apis) would not be enough because parts of the path,
   * namely the server name, would be missing. Therefore `URI#fsPath` exists - it's sugar to ease working
   * with URIs that represent files on disk (`file` scheme).
   */
  get fsPath() {
    return uriToFsPath(this, false);
  }
  // ---- modify to new -------------------------
  with(change) {
    if (!change) {
      return this;
    }
    let { scheme, authority, path, query, fragment } = change;
    if (scheme === void 0) {
      scheme = this.scheme;
    } else if (scheme === null) {
      scheme = _empty;
    }
    if (authority === void 0) {
      authority = this.authority;
    } else if (authority === null) {
      authority = _empty;
    }
    if (path === void 0) {
      path = this.path;
    } else if (path === null) {
      path = _empty;
    }
    if (query === void 0) {
      query = this.query;
    } else if (query === null) {
      query = _empty;
    }
    if (fragment === void 0) {
      fragment = this.fragment;
    } else if (fragment === null) {
      fragment = _empty;
    }
    if (scheme === this.scheme && authority === this.authority && path === this.path && query === this.query && fragment === this.fragment) {
      return this;
    }
    return new Uri(scheme, authority, path, query, fragment);
  }
  // ---- parse & validate ------------------------
  /**
   * Creates a new URI from a string, e.g. `http://www.example.com/some/path`,
   * `file:///usr/home`, or `scheme:with/path`.
   *
   * @param value A string which represents an URI (see `URI#toString`).
   */
  static parse(value, _strict = false) {
    const match = _regexp.exec(value);
    if (!match) {
      return new Uri(_empty, _empty, _empty, _empty, _empty);
    }
    return new Uri(match[2] || _empty, percentDecode(match[4] || _empty), percentDecode(match[5] || _empty), percentDecode(match[7] || _empty), percentDecode(match[9] || _empty), _strict);
  }
  /**
   * Creates a new URI from a file system path, e.g. `c:\my\files`,
   * `/usr/home`, or `\\server\share\some\path`.
   *
   * The *difference* between `URI#parse` and `URI#file` is that the latter treats the argument
   * as path, not as stringified-uri. E.g. `URI.file(path)` is **not the same as**
   * `URI.parse('file://' + path)` because the path might contain characters that are
   * interpreted (# and ?). See the following sample:
   * ```ts
  const good = URI.file('/coding/c#/project1');
  good.scheme === 'file';
  good.path === '/coding/c#/project1';
  good.fragment === '';
  const bad = URI.parse('file://' + '/coding/c#/project1');
  bad.scheme === 'file';
  bad.path === '/coding/c'; // path is now broken
  bad.fragment === '/project1';
  ```
   *
   * @param path A file system path (see `URI#fsPath`)
   */
  static file(path) {
    let authority = _empty;
    if (isWindows) {
      path = path.replace(/\\/g, _slash);
    }
    if (path[0] === _slash && path[1] === _slash) {
      const idx = path.indexOf(_slash, 2);
      if (idx === -1) {
        authority = path.substring(2);
        path = _slash;
      } else {
        authority = path.substring(2, idx);
        path = path.substring(idx) || _slash;
      }
    }
    return new Uri("file", authority, path, _empty, _empty);
  }
  /**
   * Creates new URI from uri components.
   *
   * Unless `strict` is `true` the scheme is defaults to be `file`. This function performs
   * validation and should be used for untrusted uri components retrieved from storage,
   * user input, command arguments etc
   */
  static from(components, strict) {
    const result = new Uri(components.scheme, components.authority, components.path, components.query, components.fragment, strict);
    return result;
  }
  /**
   * Join a URI path with path fragments and normalizes the resulting path.
   *
   * @param uri The input URI.
   * @param pathFragment The path fragment to add to the URI path.
   * @returns The resulting URI.
   */
  static joinPath(uri, ...pathFragment) {
    if (!uri.path) {
      throw new Error(`[UriError]: cannot call joinPath on URI without path`);
    }
    let newPath;
    if (isWindows && uri.scheme === "file") {
      newPath = URI.file(win32.join(uriToFsPath(uri, true), ...pathFragment)).path;
    } else {
      newPath = posix.join(uri.path, ...pathFragment);
    }
    return uri.with({ path: newPath });
  }
  // ---- printing/externalize ---------------------------
  /**
   * Creates a string representation for this URI. It's guaranteed that calling
   * `URI.parse` with the result of this function creates an URI which is equal
   * to this URI.
   *
   * * The result shall *not* be used for display purposes but for externalization or transport.
   * * The result will be encoded using the percentage encoding and encoding happens mostly
   * ignore the scheme-specific encoding rules.
   *
   * @param skipEncoding Do not encode the result, default is `false`
   */
  toString(skipEncoding = false) {
    return _asFormatted(this, skipEncoding);
  }
  toJSON() {
    return this;
  }
  static revive(data) {
    if (!data) {
      return data;
    } else if (data instanceof URI) {
      return data;
    } else {
      const result = new Uri(data);
      result._formatted = data.external ?? null;
      result._fsPath = data._sep === _pathSepMarker ? data.fsPath ?? null : null;
      return result;
    }
  }
}
const _pathSepMarker = isWindows ? 1 : void 0;
class Uri extends URI {
  constructor() {
    super(...arguments);
    this._formatted = null;
    this._fsPath = null;
  }
  get fsPath() {
    if (!this._fsPath) {
      this._fsPath = uriToFsPath(this, false);
    }
    return this._fsPath;
  }
  toString(skipEncoding = false) {
    if (!skipEncoding) {
      if (!this._formatted) {
        this._formatted = _asFormatted(this, false);
      }
      return this._formatted;
    } else {
      return _asFormatted(this, true);
    }
  }
  toJSON() {
    const res = {
      $mid: 1
      /* MarshalledId.Uri */
    };
    if (this._fsPath) {
      res.fsPath = this._fsPath;
      res._sep = _pathSepMarker;
    }
    if (this._formatted) {
      res.external = this._formatted;
    }
    if (this.path) {
      res.path = this.path;
    }
    if (this.scheme) {
      res.scheme = this.scheme;
    }
    if (this.authority) {
      res.authority = this.authority;
    }
    if (this.query) {
      res.query = this.query;
    }
    if (this.fragment) {
      res.fragment = this.fragment;
    }
    return res;
  }
}
const encodeTable = {
  [
    58
    /* CharCode.Colon */
  ]: "%3A",
  // gen-delims
  [
    47
    /* CharCode.Slash */
  ]: "%2F",
  [
    63
    /* CharCode.QuestionMark */
  ]: "%3F",
  [
    35
    /* CharCode.Hash */
  ]: "%23",
  [
    91
    /* CharCode.OpenSquareBracket */
  ]: "%5B",
  [
    93
    /* CharCode.CloseSquareBracket */
  ]: "%5D",
  [
    64
    /* CharCode.AtSign */
  ]: "%40",
  [
    33
    /* CharCode.ExclamationMark */
  ]: "%21",
  // sub-delims
  [
    36
    /* CharCode.DollarSign */
  ]: "%24",
  [
    38
    /* CharCode.Ampersand */
  ]: "%26",
  [
    39
    /* CharCode.SingleQuote */
  ]: "%27",
  [
    40
    /* CharCode.OpenParen */
  ]: "%28",
  [
    41
    /* CharCode.CloseParen */
  ]: "%29",
  [
    42
    /* CharCode.Asterisk */
  ]: "%2A",
  [
    43
    /* CharCode.Plus */
  ]: "%2B",
  [
    44
    /* CharCode.Comma */
  ]: "%2C",
  [
    59
    /* CharCode.Semicolon */
  ]: "%3B",
  [
    61
    /* CharCode.Equals */
  ]: "%3D",
  [
    32
    /* CharCode.Space */
  ]: "%20"
};
function encodeURIComponentFast(uriComponent, isPath, isAuthority) {
  let res = void 0;
  let nativeEncodePos = -1;
  for (let pos = 0; pos < uriComponent.length; pos++) {
    const code = uriComponent.charCodeAt(pos);
    if (code >= 97 && code <= 122 || code >= 65 && code <= 90 || code >= 48 && code <= 57 || code === 45 || code === 46 || code === 95 || code === 126 || isPath && code === 47 || isAuthority && code === 91 || isAuthority && code === 93 || isAuthority && code === 58) {
      if (nativeEncodePos !== -1) {
        res += encodeURIComponent(uriComponent.substring(nativeEncodePos, pos));
        nativeEncodePos = -1;
      }
      if (res !== void 0) {
        res += uriComponent.charAt(pos);
      }
    } else {
      if (res === void 0) {
        res = uriComponent.substr(0, pos);
      }
      const escaped = encodeTable[code];
      if (escaped !== void 0) {
        if (nativeEncodePos !== -1) {
          res += encodeURIComponent(uriComponent.substring(nativeEncodePos, pos));
          nativeEncodePos = -1;
        }
        res += escaped;
      } else if (nativeEncodePos === -1) {
        nativeEncodePos = pos;
      }
    }
  }
  if (nativeEncodePos !== -1) {
    res += encodeURIComponent(uriComponent.substring(nativeEncodePos));
  }
  return res !== void 0 ? res : uriComponent;
}
function encodeURIComponentMinimal(path) {
  let res = void 0;
  for (let pos = 0; pos < path.length; pos++) {
    const code = path.charCodeAt(pos);
    if (code === 35 || code === 63) {
      if (res === void 0) {
        res = path.substr(0, pos);
      }
      res += encodeTable[code];
    } else {
      if (res !== void 0) {
        res += path[pos];
      }
    }
  }
  return res !== void 0 ? res : path;
}
function uriToFsPath(uri, keepDriveLetterCasing) {
  let value;
  if (uri.authority && uri.path.length > 1 && uri.scheme === "file") {
    value = `//${uri.authority}${uri.path}`;
  } else if (uri.path.charCodeAt(0) === 47 && (uri.path.charCodeAt(1) >= 65 && uri.path.charCodeAt(1) <= 90 || uri.path.charCodeAt(1) >= 97 && uri.path.charCodeAt(1) <= 122) && uri.path.charCodeAt(2) === 58) {
    if (!keepDriveLetterCasing) {
      value = uri.path[1].toLowerCase() + uri.path.substr(2);
    } else {
      value = uri.path.substr(1);
    }
  } else {
    value = uri.path;
  }
  if (isWindows) {
    value = value.replace(/\//g, "\\");
  }
  return value;
}
function _asFormatted(uri, skipEncoding) {
  const encoder = !skipEncoding ? encodeURIComponentFast : encodeURIComponentMinimal;
  let res = "";
  let { scheme, authority, path, query, fragment } = uri;
  if (scheme) {
    res += scheme;
    res += ":";
  }
  if (authority || scheme === "file") {
    res += _slash;
    res += _slash;
  }
  if (authority) {
    let idx = authority.indexOf("@");
    if (idx !== -1) {
      const userinfo = authority.substr(0, idx);
      authority = authority.substr(idx + 1);
      idx = userinfo.lastIndexOf(":");
      if (idx === -1) {
        res += encoder(userinfo, false, false);
      } else {
        res += encoder(userinfo.substr(0, idx), false, false);
        res += ":";
        res += encoder(userinfo.substr(idx + 1), false, true);
      }
      res += "@";
    }
    authority = authority.toLowerCase();
    idx = authority.lastIndexOf(":");
    if (idx === -1) {
      res += encoder(authority, false, true);
    } else {
      res += encoder(authority.substr(0, idx), false, true);
      res += authority.substr(idx);
    }
  }
  if (path) {
    if (path.length >= 3 && path.charCodeAt(0) === 47 && path.charCodeAt(2) === 58) {
      const code = path.charCodeAt(1);
      if (code >= 65 && code <= 90) {
        path = `/${String.fromCharCode(code + 32)}:${path.substr(3)}`;
      }
    } else if (path.length >= 2 && path.charCodeAt(1) === 58) {
      const code = path.charCodeAt(0);
      if (code >= 65 && code <= 90) {
        path = `${String.fromCharCode(code + 32)}:${path.substr(2)}`;
      }
    }
    res += encoder(path, true, false);
  }
  if (query) {
    res += "?";
    res += encoder(query, false, false);
  }
  if (fragment) {
    res += "#";
    res += !skipEncoding ? encodeURIComponentFast(fragment, false, false) : fragment;
  }
  return res;
}
function decodeURIComponentGraceful(str) {
  try {
    return decodeURIComponent(str);
  } catch {
    if (str.length > 3) {
      return str.substr(0, 3) + decodeURIComponentGraceful(str.substr(3));
    } else {
      return str;
    }
  }
}
const _rEncodedAsHex = /(%[0-9A-Za-z][0-9A-Za-z])+/g;
function percentDecode(str) {
  if (!str.match(_rEncodedAsHex)) {
    return str;
  }
  return str.replace(_rEncodedAsHex, (match) => decodeURIComponentGraceful(match));
}
var Schemas;
(function(Schemas2) {
  Schemas2.inMemory = "inmemory";
  Schemas2.vscode = "vscode";
  Schemas2.internal = "private";
  Schemas2.walkThrough = "walkThrough";
  Schemas2.walkThroughSnippet = "walkThroughSnippet";
  Schemas2.http = "http";
  Schemas2.https = "https";
  Schemas2.file = "file";
  Schemas2.mailto = "mailto";
  Schemas2.untitled = "untitled";
  Schemas2.data = "data";
  Schemas2.command = "command";
  Schemas2.vscodeRemote = "vscode-remote";
  Schemas2.vscodeRemoteResource = "vscode-remote-resource";
  Schemas2.vscodeManagedRemoteResource = "vscode-managed-remote-resource";
  Schemas2.vscodeUserData = "vscode-userdata";
  Schemas2.vscodeCustomEditor = "vscode-custom-editor";
  Schemas2.vscodeNotebookCell = "vscode-notebook-cell";
  Schemas2.vscodeNotebookCellMetadata = "vscode-notebook-cell-metadata";
  Schemas2.vscodeNotebookCellMetadataDiff = "vscode-notebook-cell-metadata-diff";
  Schemas2.vscodeNotebookCellOutput = "vscode-notebook-cell-output";
  Schemas2.vscodeNotebookCellOutputDiff = "vscode-notebook-cell-output-diff";
  Schemas2.vscodeNotebookMetadata = "vscode-notebook-metadata";
  Schemas2.vscodeInteractiveInput = "vscode-interactive-input";
  Schemas2.vscodeSettings = "vscode-settings";
  Schemas2.vscodeWorkspaceTrust = "vscode-workspace-trust";
  Schemas2.vscodeTerminal = "vscode-terminal";
  Schemas2.vscodeChatCodeBlock = "vscode-chat-code-block";
  Schemas2.vscodeChatCodeCompareBlock = "vscode-chat-code-compare-block";
  Schemas2.vscodeChatSesssion = "vscode-chat-editor";
  Schemas2.webviewPanel = "webview-panel";
  Schemas2.vscodeWebview = "vscode-webview";
  Schemas2.extension = "extension";
  Schemas2.vscodeFileResource = "vscode-file";
  Schemas2.tmp = "tmp";
  Schemas2.vsls = "vsls";
  Schemas2.vscodeSourceControl = "vscode-scm";
  Schemas2.commentsInput = "comment";
  Schemas2.codeSetting = "code-setting";
  Schemas2.outputChannel = "output";
})(Schemas || (Schemas = {}));
const connectionTokenQueryName = "tkn";
class RemoteAuthoritiesImpl {
  constructor() {
    this._hosts = /* @__PURE__ */ Object.create(null);
    this._ports = /* @__PURE__ */ Object.create(null);
    this._connectionTokens = /* @__PURE__ */ Object.create(null);
    this._preferredWebSchema = "http";
    this._delegate = null;
    this._serverRootPath = "/";
  }
  setPreferredWebSchema(schema) {
    this._preferredWebSchema = schema;
  }
  get _remoteResourcesPath() {
    return posix.join(this._serverRootPath, Schemas.vscodeRemoteResource);
  }
  rewrite(uri) {
    if (this._delegate) {
      try {
        return this._delegate(uri);
      } catch (err) {
        onUnexpectedError(err);
        return uri;
      }
    }
    const authority = uri.authority;
    let host = this._hosts[authority];
    if (host && host.indexOf(":") !== -1 && host.indexOf("[") === -1) {
      host = `[${host}]`;
    }
    const port = this._ports[authority];
    const connectionToken = this._connectionTokens[authority];
    let query = `path=${encodeURIComponent(uri.path)}`;
    if (typeof connectionToken === "string") {
      query += `&${connectionTokenQueryName}=${encodeURIComponent(connectionToken)}`;
    }
    return URI.from({
      scheme: isWeb ? this._preferredWebSchema : Schemas.vscodeRemoteResource,
      authority: `${host}:${port}`,
      path: this._remoteResourcesPath,
      query
    });
  }
}
const RemoteAuthorities = new RemoteAuthoritiesImpl();
var COI;
(function(COI2) {
  const coiHeaders = /* @__PURE__ */ new Map([
    ["1", { "Cross-Origin-Opener-Policy": "same-origin" }],
    ["2", { "Cross-Origin-Embedder-Policy": "require-corp" }],
    ["3", { "Cross-Origin-Opener-Policy": "same-origin", "Cross-Origin-Embedder-Policy": "require-corp" }]
  ]);
  COI2.CoopAndCoep = Object.freeze(coiHeaders.get("3"));
  const coiSearchParamName = "vscode-coi";
  function getHeadersFromQuery(url) {
    let params;
    if (typeof url === "string") {
      params = new URL(url).searchParams;
    } else if (url instanceof URL) {
      params = url.searchParams;
    } else if (URI.isUri(url)) {
      params = new URL(url.toString(true)).searchParams;
    }
    const value = params?.get(coiSearchParamName);
    if (!value) {
      return void 0;
    }
    return coiHeaders.get(value);
  }
  COI2.getHeadersFromQuery = getHeadersFromQuery;
  function addSearchParam(urlOrSearch, coop, coep) {
    if (!globalThis.crossOriginIsolated) {
      return;
    }
    const value = coop && coep ? "3" : coep ? "2" : "1";
    if (urlOrSearch instanceof URLSearchParams) {
      urlOrSearch.set(coiSearchParamName, value);
    } else {
      urlOrSearch[coiSearchParamName] = value;
    }
  }
  COI2.addSearchParam = addSearchParam;
})(COI || (COI = {}));
const { getWindow, getWindowId, onDidRegisterWindow, onDidUnregisterWindow } = (function() {
  const windows = /* @__PURE__ */ new Map();
  ensureCodeWindow(mainWindow, 1);
  const mainWindowRegistration = { window: mainWindow, disposables: new DisposableStore() };
  windows.set(mainWindow.vscodeWindowId, mainWindowRegistration);
  const onDidRegisterWindow2 = new Emitter();
  const onDidUnregisterWindow2 = new Emitter();
  const onWillUnregisterWindow = new Emitter();
  function getWindowById(windowId, fallbackToMain) {
    const window2 = typeof windowId === "number" ? windows.get(windowId) : void 0;
    return window2 ?? (fallbackToMain ? mainWindowRegistration : void 0);
  }
  return {
    onDidRegisterWindow: onDidRegisterWindow2.event,
    onWillUnregisterWindow: onWillUnregisterWindow.event,
    onDidUnregisterWindow: onDidUnregisterWindow2.event,
    registerWindow(window2) {
      if (windows.has(window2.vscodeWindowId)) {
        return Disposable.None;
      }
      const disposables = new DisposableStore();
      const registeredWindow = {
        window: window2,
        disposables: disposables.add(new DisposableStore())
      };
      windows.set(window2.vscodeWindowId, registeredWindow);
      disposables.add(toDisposable(() => {
        windows.delete(window2.vscodeWindowId);
        onDidUnregisterWindow2.fire(window2);
      }));
      disposables.add(addDisposableListener(window2, EventType$1.BEFORE_UNLOAD, () => {
        onWillUnregisterWindow.fire(window2);
      }));
      onDidRegisterWindow2.fire(registeredWindow);
      return disposables;
    },
    getWindows() {
      return windows.values();
    },
    getWindowsCount() {
      return windows.size;
    },
    getWindowId(targetWindow) {
      return targetWindow.vscodeWindowId;
    },
    hasWindow(windowId) {
      return windows.has(windowId);
    },
    getWindowById,
    getWindow(e) {
      const candidateNode = e;
      if (candidateNode?.ownerDocument?.defaultView) {
        return candidateNode.ownerDocument.defaultView.window;
      }
      const candidateEvent = e;
      if (candidateEvent?.view) {
        return candidateEvent.view.window;
      }
      return mainWindow;
    },
    getDocument(e) {
      const candidateNode = e;
      return getWindow(candidateNode).document;
    }
  };
})();
class DomListener {
  constructor(node, type, handler, options) {
    this._node = node;
    this._type = type;
    this._handler = handler;
    this._options = options || false;
    this._node.addEventListener(this._type, this._handler, this._options);
  }
  dispose() {
    if (!this._handler) {
      return;
    }
    this._node.removeEventListener(this._type, this._handler, this._options);
    this._node = null;
    this._handler = null;
  }
}
function addDisposableListener(node, type, handler, useCaptureOrOptions) {
  return new DomListener(node, type, handler, useCaptureOrOptions);
}
let scheduleAtNextAnimationFrame;
class AnimationFrameQueueItem {
  constructor(runner, priority = 0) {
    this._runner = runner;
    this.priority = priority;
    this._canceled = false;
  }
  dispose() {
    this._canceled = true;
  }
  execute() {
    if (this._canceled) {
      return;
    }
    try {
      this._runner();
    } catch (e) {
      onUnexpectedError(e);
    }
  }
  // Sort by priority (largest to lowest)
  static sort(a, b) {
    return b.priority - a.priority;
  }
}
(function() {
  const NEXT_QUEUE = /* @__PURE__ */ new Map();
  const CURRENT_QUEUE = /* @__PURE__ */ new Map();
  const animFrameRequested = /* @__PURE__ */ new Map();
  const inAnimationFrameRunner = /* @__PURE__ */ new Map();
  const animationFrameRunner = (targetWindowId) => {
    animFrameRequested.set(targetWindowId, false);
    const currentQueue = NEXT_QUEUE.get(targetWindowId) ?? [];
    CURRENT_QUEUE.set(targetWindowId, currentQueue);
    NEXT_QUEUE.set(targetWindowId, []);
    inAnimationFrameRunner.set(targetWindowId, true);
    while (currentQueue.length > 0) {
      currentQueue.sort(AnimationFrameQueueItem.sort);
      const top = currentQueue.shift();
      top.execute();
    }
    inAnimationFrameRunner.set(targetWindowId, false);
  };
  scheduleAtNextAnimationFrame = (targetWindow, runner, priority = 0) => {
    const targetWindowId = getWindowId(targetWindow);
    const item = new AnimationFrameQueueItem(runner, priority);
    let nextQueue = NEXT_QUEUE.get(targetWindowId);
    if (!nextQueue) {
      nextQueue = [];
      NEXT_QUEUE.set(targetWindowId, nextQueue);
    }
    nextQueue.push(item);
    if (!animFrameRequested.get(targetWindowId)) {
      animFrameRequested.set(targetWindowId, true);
      targetWindow.requestAnimationFrame(() => animationFrameRunner(targetWindowId));
    }
    return item;
  };
})();
class Dimension {
  static {
    this.None = new Dimension(0, 0);
  }
  constructor(width, height) {
    this.width = width;
    this.height = height;
  }
  with(width = this.width, height = this.height) {
    if (width !== this.width || height !== this.height) {
      return new Dimension(width, height);
    } else {
      return this;
    }
  }
  static is(obj) {
    return typeof obj === "object" && typeof obj.height === "number" && typeof obj.width === "number";
  }
  static lift(obj) {
    if (obj instanceof Dimension) {
      return obj;
    } else {
      return new Dimension(obj.width, obj.height);
    }
  }
  static equals(a, b) {
    if (a === b) {
      return true;
    }
    if (!a || !b) {
      return false;
    }
    return a.width === b.width && a.height === b.height;
  }
}
function getDomNodePagePosition(domNode) {
  const bb = domNode.getBoundingClientRect();
  const window2 = getWindow(domNode);
  return {
    left: bb.left + window2.scrollX,
    top: bb.top + window2.scrollY,
    width: bb.width,
    height: bb.height
  };
}
const EventType$1 = {
  // Mouse
  CLICK: "click",
  MOUSE_DOWN: "mousedown",
  MOUSE_OVER: "mouseover",
  MOUSE_LEAVE: "mouseleave",
  POINTER_UP: "pointerup",
  POINTER_DOWN: "pointerdown",
  POINTER_MOVE: "pointermove",
  // Keyboard
  KEY_DOWN: "keydown",
  KEY_UP: "keyup",
  BEFORE_UNLOAD: "beforeunload",
  FOCUS: "focus",
  BLUR: "blur",
  INPUT: "input"
};
function append(parent, ...children) {
  parent.append(...children);
  if (children.length === 1 && typeof children[0] !== "string") {
    return children[0];
  }
}
const SELECTOR_REGEX = /([\w\-]+)?(#([\w\-]+))?((\.([\w\-]+))*)/;
var Namespace;
(function(Namespace2) {
  Namespace2["HTML"] = "http://www.w3.org/1999/xhtml";
  Namespace2["SVG"] = "http://www.w3.org/2000/svg";
})(Namespace || (Namespace = {}));
function _$(namespace, description, attrs, ...children) {
  const match = SELECTOR_REGEX.exec(description);
  if (!match) {
    throw new Error("Bad use of emmet");
  }
  const tagName = match[1] || "div";
  let result;
  if (namespace !== Namespace.HTML) {
    result = document.createElementNS(namespace, tagName);
  } else {
    result = document.createElement(tagName);
  }
  if (match[3]) {
    result.id = match[3];
  }
  if (match[4]) {
    result.className = match[4].replace(/\./g, " ").trim();
  }
  if (attrs) {
    Object.entries(attrs).forEach(([name, value]) => {
      if (typeof value === "undefined") {
        return;
      }
      if (/^on\w+$/.test(name)) {
        result[name] = value;
      } else if (name === "selected") {
        if (value) {
          result.setAttribute(name, "true");
        }
      } else {
        result.setAttribute(name, value);
      }
    });
  }
  result.append(...children);
  return result;
}
function $$1(description, attrs, ...children) {
  return _$(Namespace.HTML, description, attrs, ...children);
}
$$1.SVG = function(description, attrs, ...children) {
  return _$(Namespace.SVG, description, attrs, ...children);
};
RemoteAuthorities.setPreferredWebSchema(/^https:/.test(mainWindow.location.href) ? "https" : "http");
class DevicePixelRatioMonitor extends Disposable {
  constructor(targetWindow) {
    super();
    this._onDidChange = this._register(new Emitter());
    this.onDidChange = this._onDidChange.event;
    this._listener = () => this._handleChange(targetWindow, true);
    this._mediaQueryList = null;
    this._handleChange(targetWindow, false);
  }
  _handleChange(targetWindow, fireEvent) {
    this._mediaQueryList?.removeEventListener("change", this._listener);
    this._mediaQueryList = targetWindow.matchMedia(`(resolution: ${targetWindow.devicePixelRatio}dppx)`);
    this._mediaQueryList.addEventListener("change", this._listener);
    if (fireEvent) {
      this._onDidChange.fire();
    }
  }
}
class PixelRatioMonitorImpl extends Disposable {
  get value() {
    return this._value;
  }
  constructor(targetWindow) {
    super();
    this._onDidChange = this._register(new Emitter());
    this.onDidChange = this._onDidChange.event;
    this._value = this._getPixelRatio(targetWindow);
    const dprMonitor = this._register(new DevicePixelRatioMonitor(targetWindow));
    this._register(dprMonitor.onDidChange(() => {
      this._value = this._getPixelRatio(targetWindow);
      this._onDidChange.fire(this._value);
    }));
  }
  _getPixelRatio(targetWindow) {
    const ctx = document.createElement("canvas").getContext("2d");
    const dpr = targetWindow.devicePixelRatio || 1;
    const bsr = ctx.webkitBackingStorePixelRatio || ctx.mozBackingStorePixelRatio || ctx.msBackingStorePixelRatio || ctx.oBackingStorePixelRatio || ctx.backingStorePixelRatio || 1;
    return dpr / bsr;
  }
}
class PixelRatioMonitorFacade {
  constructor() {
    this.mapWindowIdToPixelRatioMonitor = /* @__PURE__ */ new Map();
  }
  _getOrCreatePixelRatioMonitor(targetWindow) {
    const targetWindowId = getWindowId(targetWindow);
    let pixelRatioMonitor = this.mapWindowIdToPixelRatioMonitor.get(targetWindowId);
    if (!pixelRatioMonitor) {
      pixelRatioMonitor = markAsSingleton(new PixelRatioMonitorImpl(targetWindow));
      this.mapWindowIdToPixelRatioMonitor.set(targetWindowId, pixelRatioMonitor);
      markAsSingleton(Event.once(onDidUnregisterWindow)(({ vscodeWindowId }) => {
        if (vscodeWindowId === targetWindowId) {
          pixelRatioMonitor?.dispose();
          this.mapWindowIdToPixelRatioMonitor.delete(targetWindowId);
        }
      }));
    }
    return pixelRatioMonitor;
  }
  getInstance(targetWindow) {
    return this._getOrCreatePixelRatioMonitor(targetWindow);
  }
}
const PixelRatio = new PixelRatioMonitorFacade();
class GlobalPointerMoveMonitor {
  constructor() {
    this._hooks = new DisposableStore();
    this._pointerMoveCallback = null;
    this._onStopCallback = null;
  }
  dispose() {
    this.stopMonitoring(false);
    this._hooks.dispose();
  }
  stopMonitoring(invokeStopCallback, browserEvent) {
    if (!this.isMonitoring()) {
      return;
    }
    this._hooks.clear();
    this._pointerMoveCallback = null;
    const onStopCallback = this._onStopCallback;
    this._onStopCallback = null;
    if (invokeStopCallback && onStopCallback) {
      onStopCallback(browserEvent);
    }
  }
  isMonitoring() {
    return !!this._pointerMoveCallback;
  }
  startMonitoring(initialElement, pointerId, initialButtons, pointerMoveCallback, onStopCallback) {
    if (this.isMonitoring()) {
      this.stopMonitoring(false);
    }
    this._pointerMoveCallback = pointerMoveCallback;
    this._onStopCallback = onStopCallback;
    let eventSource = initialElement;
    try {
      initialElement.setPointerCapture(pointerId);
      this._hooks.add(toDisposable(() => {
        try {
          initialElement.releasePointerCapture(pointerId);
        } catch (err) {
        }
      }));
    } catch (err) {
      eventSource = getWindow(initialElement);
    }
    this._hooks.add(addDisposableListener(eventSource, EventType$1.POINTER_MOVE, (e) => {
      if (e.buttons !== initialButtons) {
        this.stopMonitoring(true);
        return;
      }
      e.preventDefault();
      this._pointerMoveCallback(e);
    }));
    this._hooks.add(addDisposableListener(eventSource, EventType$1.POINTER_UP, (e) => this.stopMonitoring(true)));
  }
}
function tail(array, n = 0) {
  return array[array.length - (1 + n)];
}
var CompareResult;
(function(CompareResult2) {
  function isLessThan(result) {
    return result < 0;
  }
  CompareResult2.isLessThan = isLessThan;
  function isLessThanOrEqual(result) {
    return result <= 0;
  }
  CompareResult2.isLessThanOrEqual = isLessThanOrEqual;
  function isGreaterThan(result) {
    return result > 0;
  }
  CompareResult2.isGreaterThan = isGreaterThan;
  function isNeitherLessOrGreaterThan(result) {
    return result === 0;
  }
  CompareResult2.isNeitherLessOrGreaterThan = isNeitherLessOrGreaterThan;
  CompareResult2.greaterThan = 1;
  CompareResult2.lessThan = -1;
  CompareResult2.neitherLessOrGreaterThan = 0;
})(CompareResult || (CompareResult = {}));
class CallbackIterable {
  static {
    this.empty = new CallbackIterable((_callback) => {
    });
  }
  constructor(iterate) {
    this.iterate = iterate;
  }
  toArray() {
    const result = [];
    this.iterate((item) => {
      result.push(item);
      return true;
    });
    return result;
  }
  filter(predicate) {
    return new CallbackIterable((cb) => this.iterate((item) => predicate(item) ? cb(item) : true));
  }
  map(mapFn) {
    return new CallbackIterable((cb) => this.iterate((item) => cb(mapFn(item))));
  }
  findLast(predicate) {
    let result;
    this.iterate((item) => {
      if (predicate(item)) {
        result = item;
      }
      return true;
    });
    return result;
  }
  findLastMaxBy(comparator) {
    let result;
    let first = true;
    this.iterate((item) => {
      if (first || CompareResult.isGreaterThan(comparator(item, result))) {
        first = false;
        result = item;
      }
      return true;
    });
    return result;
  }
}
function memoize(_target, key, descriptor) {
  let fnKey = null;
  let fn = null;
  if (typeof descriptor.value === "function") {
    fnKey = "value";
    fn = descriptor.value;
    if (fn.length !== 0) {
      console.warn("Memoize should only be used in functions with zero parameters");
    }
  } else if (typeof descriptor.get === "function") {
    fnKey = "get";
    fn = descriptor.get;
  }
  if (!fn) {
    throw new Error("not supported");
  }
  const memoizeKey = `$memoize$${key}`;
  descriptor[fnKey] = function(...args) {
    if (!this.hasOwnProperty(memoizeKey)) {
      Object.defineProperty(this, memoizeKey, {
        configurable: false,
        enumerable: false,
        writable: false,
        value: fn.apply(this, args)
      });
    }
    return this[memoizeKey];
  };
}
var __decorate = function(decorators, target, key, desc) {
  var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
  else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var EventType;
(function(EventType2) {
  EventType2.Tap = "-monaco-gesturetap";
  EventType2.Change = "-monaco-gesturechange";
  EventType2.Start = "-monaco-gesturestart";
  EventType2.End = "-monaco-gesturesend";
  EventType2.Contextmenu = "-monaco-gesturecontextmenu";
})(EventType || (EventType = {}));
class Gesture extends Disposable {
  static {
    this.SCROLL_FRICTION = -5e-3;
  }
  static {
    this.HOLD_DELAY = 700;
  }
  static {
    this.CLEAR_TAP_COUNT_TIME = 400;
  }
  // ms
  constructor() {
    super();
    this.dispatched = false;
    this.targets = new LinkedList();
    this.ignoreTargets = new LinkedList();
    this.activeTouches = {};
    this.handle = null;
    this._lastSetTapCountTime = 0;
    this._register(Event.runAndSubscribe(onDidRegisterWindow, ({ window: window2, disposables }) => {
      disposables.add(addDisposableListener(window2.document, "touchstart", (e) => this.onTouchStart(e), { passive: false }));
      disposables.add(addDisposableListener(window2.document, "touchend", (e) => this.onTouchEnd(window2, e)));
      disposables.add(addDisposableListener(window2.document, "touchmove", (e) => this.onTouchMove(e), { passive: false }));
    }, { window: mainWindow, disposables: this._store }));
  }
  static addTarget(element) {
    if (!Gesture.isTouchDevice()) {
      return Disposable.None;
    }
    if (!Gesture.INSTANCE) {
      Gesture.INSTANCE = markAsSingleton(new Gesture());
    }
    const remove = Gesture.INSTANCE.targets.push(element);
    return toDisposable(remove);
  }
  static ignoreTarget(element) {
    if (!Gesture.isTouchDevice()) {
      return Disposable.None;
    }
    if (!Gesture.INSTANCE) {
      Gesture.INSTANCE = markAsSingleton(new Gesture());
    }
    const remove = Gesture.INSTANCE.ignoreTargets.push(element);
    return toDisposable(remove);
  }
  static isTouchDevice() {
    return "ontouchstart" in mainWindow || navigator.maxTouchPoints > 0;
  }
  dispose() {
    if (this.handle) {
      this.handle.dispose();
      this.handle = null;
    }
    super.dispose();
  }
  onTouchStart(e) {
    const timestamp = Date.now();
    if (this.handle) {
      this.handle.dispose();
      this.handle = null;
    }
    for (let i = 0, len = e.targetTouches.length; i < len; i++) {
      const touch = e.targetTouches.item(i);
      this.activeTouches[touch.identifier] = {
        id: touch.identifier,
        initialTarget: touch.target,
        initialTimeStamp: timestamp,
        initialPageX: touch.pageX,
        initialPageY: touch.pageY,
        rollingTimestamps: [timestamp],
        rollingPageX: [touch.pageX],
        rollingPageY: [touch.pageY]
      };
      const evt = this.newGestureEvent(EventType.Start, touch.target);
      evt.pageX = touch.pageX;
      evt.pageY = touch.pageY;
      this.dispatchEvent(evt);
    }
    if (this.dispatched) {
      e.preventDefault();
      e.stopPropagation();
      this.dispatched = false;
    }
  }
  onTouchEnd(targetWindow, e) {
    const timestamp = Date.now();
    const activeTouchCount = Object.keys(this.activeTouches).length;
    for (let i = 0, len = e.changedTouches.length; i < len; i++) {
      const touch = e.changedTouches.item(i);
      if (!this.activeTouches.hasOwnProperty(String(touch.identifier))) {
        console.warn("move of an UNKNOWN touch", touch);
        continue;
      }
      const data = this.activeTouches[touch.identifier], holdTime = Date.now() - data.initialTimeStamp;
      if (holdTime < Gesture.HOLD_DELAY && Math.abs(data.initialPageX - tail(data.rollingPageX)) < 30 && Math.abs(data.initialPageY - tail(data.rollingPageY)) < 30) {
        const evt = this.newGestureEvent(EventType.Tap, data.initialTarget);
        evt.pageX = tail(data.rollingPageX);
        evt.pageY = tail(data.rollingPageY);
        this.dispatchEvent(evt);
      } else if (holdTime >= Gesture.HOLD_DELAY && Math.abs(data.initialPageX - tail(data.rollingPageX)) < 30 && Math.abs(data.initialPageY - tail(data.rollingPageY)) < 30) {
        const evt = this.newGestureEvent(EventType.Contextmenu, data.initialTarget);
        evt.pageX = tail(data.rollingPageX);
        evt.pageY = tail(data.rollingPageY);
        this.dispatchEvent(evt);
      } else if (activeTouchCount === 1) {
        const finalX = tail(data.rollingPageX);
        const finalY = tail(data.rollingPageY);
        const deltaT = tail(data.rollingTimestamps) - data.rollingTimestamps[0];
        const deltaX = finalX - data.rollingPageX[0];
        const deltaY = finalY - data.rollingPageY[0];
        const dispatchTo = [...this.targets].filter((t) => data.initialTarget instanceof Node && t.contains(data.initialTarget));
        this.inertia(
          targetWindow,
          dispatchTo,
          timestamp,
          // time now
          Math.abs(deltaX) / deltaT,
          // speed
          deltaX > 0 ? 1 : -1,
          // x direction
          finalX,
          // x now
          Math.abs(deltaY) / deltaT,
          // y speed
          deltaY > 0 ? 1 : -1,
          // y direction
          finalY
          // y now
        );
      }
      this.dispatchEvent(this.newGestureEvent(EventType.End, data.initialTarget));
      delete this.activeTouches[touch.identifier];
    }
    if (this.dispatched) {
      e.preventDefault();
      e.stopPropagation();
      this.dispatched = false;
    }
  }
  newGestureEvent(type, initialTarget) {
    const event = document.createEvent("CustomEvent");
    event.initEvent(type, false, true);
    event.initialTarget = initialTarget;
    event.tapCount = 0;
    return event;
  }
  dispatchEvent(event) {
    if (event.type === EventType.Tap) {
      const currentTime = (/* @__PURE__ */ new Date()).getTime();
      let setTapCount = 0;
      if (currentTime - this._lastSetTapCountTime > Gesture.CLEAR_TAP_COUNT_TIME) {
        setTapCount = 1;
      } else {
        setTapCount = 2;
      }
      this._lastSetTapCountTime = currentTime;
      event.tapCount = setTapCount;
    } else if (event.type === EventType.Change || event.type === EventType.Contextmenu) {
      this._lastSetTapCountTime = 0;
    }
    if (event.initialTarget instanceof Node) {
      for (const ignoreTarget of this.ignoreTargets) {
        if (ignoreTarget.contains(event.initialTarget)) {
          return;
        }
      }
      const targets = [];
      for (const target of this.targets) {
        if (target.contains(event.initialTarget)) {
          let depth = 0;
          let now = event.initialTarget;
          while (now && now !== target) {
            depth++;
            now = now.parentElement;
          }
          targets.push([depth, target]);
        }
      }
      targets.sort((a, b) => a[0] - b[0]);
      for (const [_, target] of targets) {
        target.dispatchEvent(event);
        this.dispatched = true;
      }
    }
  }
  inertia(targetWindow, dispatchTo, t1, vX, dirX, x, vY, dirY, y) {
    this.handle = scheduleAtNextAnimationFrame(targetWindow, () => {
      const now = Date.now();
      const deltaT = now - t1;
      let delta_pos_x = 0, delta_pos_y = 0;
      let stopped = true;
      vX += Gesture.SCROLL_FRICTION * deltaT;
      vY += Gesture.SCROLL_FRICTION * deltaT;
      if (vX > 0) {
        stopped = false;
        delta_pos_x = dirX * vX * deltaT;
      }
      if (vY > 0) {
        stopped = false;
        delta_pos_y = dirY * vY * deltaT;
      }
      const evt = this.newGestureEvent(EventType.Change);
      evt.translationX = delta_pos_x;
      evt.translationY = delta_pos_y;
      dispatchTo.forEach((d) => d.dispatchEvent(evt));
      if (!stopped) {
        this.inertia(targetWindow, dispatchTo, now, vX, dirX, x + delta_pos_x, vY, dirY, y + delta_pos_y);
      }
    });
  }
  onTouchMove(e) {
    const timestamp = Date.now();
    for (let i = 0, len = e.changedTouches.length; i < len; i++) {
      const touch = e.changedTouches.item(i);
      if (!this.activeTouches.hasOwnProperty(String(touch.identifier))) {
        console.warn("end of an UNKNOWN touch", touch);
        continue;
      }
      const data = this.activeTouches[touch.identifier];
      const evt = this.newGestureEvent(EventType.Change, data.initialTarget);
      evt.translationX = touch.pageX - tail(data.rollingPageX);
      evt.translationY = touch.pageY - tail(data.rollingPageY);
      evt.pageX = touch.pageX;
      evt.pageY = touch.pageY;
      this.dispatchEvent(evt);
      if (data.rollingPageX.length > 3) {
        data.rollingPageX.shift();
        data.rollingPageY.shift();
        data.rollingTimestamps.shift();
      }
      data.rollingPageX.push(touch.pageX);
      data.rollingPageY.push(touch.pageY);
      data.rollingTimestamps.push(timestamp);
    }
    if (this.dispatched) {
      e.preventDefault();
      e.stopPropagation();
      this.dispatched = false;
    }
  }
}
__decorate([
  memoize
], Gesture, "isTouchDevice", null);
class Widget extends Disposable {
  onclick(domNode, listener) {
    this._register(addDisposableListener(domNode, EventType$1.CLICK, (e) => listener(new StandardMouseEvent(getWindow(domNode), e))));
  }
  onmousedown(domNode, listener) {
    this._register(addDisposableListener(domNode, EventType$1.MOUSE_DOWN, (e) => listener(new StandardMouseEvent(getWindow(domNode), e))));
  }
  onmouseover(domNode, listener) {
    this._register(addDisposableListener(domNode, EventType$1.MOUSE_OVER, (e) => listener(new StandardMouseEvent(getWindow(domNode), e))));
  }
  onmouseleave(domNode, listener) {
    this._register(addDisposableListener(domNode, EventType$1.MOUSE_LEAVE, (e) => listener(new StandardMouseEvent(getWindow(domNode), e))));
  }
  onkeydown(domNode, listener) {
    this._register(addDisposableListener(domNode, EventType$1.KEY_DOWN, (e) => listener(new StandardKeyboardEvent(e))));
  }
  onkeyup(domNode, listener) {
    this._register(addDisposableListener(domNode, EventType$1.KEY_UP, (e) => listener(new StandardKeyboardEvent(e))));
  }
  oninput(domNode, listener) {
    this._register(addDisposableListener(domNode, EventType$1.INPUT, listener));
  }
  onblur(domNode, listener) {
    this._register(addDisposableListener(domNode, EventType$1.BLUR, listener));
  }
  onfocus(domNode, listener) {
    this._register(addDisposableListener(domNode, EventType$1.FOCUS, listener));
  }
  ignoreGesture(domNode) {
    return Gesture.ignoreTarget(domNode);
  }
}
function isString(str) {
  return typeof str === "string";
}
function isObject(obj) {
  return typeof obj === "object" && obj !== null && !Array.isArray(obj) && !(obj instanceof RegExp) && !(obj instanceof Date);
}
const _codiconFontCharacters = /* @__PURE__ */ Object.create(null);
function register(id, fontCharacter) {
  if (isString(fontCharacter)) {
    const val = _codiconFontCharacters[fontCharacter];
    if (val === void 0) {
      throw new Error(`${id} references an unknown codicon: ${fontCharacter}`);
    }
    fontCharacter = val;
  }
  _codiconFontCharacters[id] = fontCharacter;
  return { id };
}
function getCodiconFontCharacters() {
  return _codiconFontCharacters;
}
const codiconsLibrary = {
  add: register("add", 6e4),
  plus: register("plus", 6e4),
  gistNew: register("gist-new", 6e4),
  repoCreate: register("repo-create", 6e4),
  lightbulb: register("lightbulb", 60001),
  lightBulb: register("light-bulb", 60001),
  repo: register("repo", 60002),
  repoDelete: register("repo-delete", 60002),
  gistFork: register("gist-fork", 60003),
  repoForked: register("repo-forked", 60003),
  gitPullRequest: register("git-pull-request", 60004),
  gitPullRequestAbandoned: register("git-pull-request-abandoned", 60004),
  recordKeys: register("record-keys", 60005),
  keyboard: register("keyboard", 60005),
  tag: register("tag", 60006),
  gitPullRequestLabel: register("git-pull-request-label", 60006),
  tagAdd: register("tag-add", 60006),
  tagRemove: register("tag-remove", 60006),
  person: register("person", 60007),
  personFollow: register("person-follow", 60007),
  personOutline: register("person-outline", 60007),
  personFilled: register("person-filled", 60007),
  gitBranch: register("git-branch", 60008),
  gitBranchCreate: register("git-branch-create", 60008),
  gitBranchDelete: register("git-branch-delete", 60008),
  sourceControl: register("source-control", 60008),
  mirror: register("mirror", 60009),
  mirrorPublic: register("mirror-public", 60009),
  star: register("star", 60010),
  starAdd: register("star-add", 60010),
  starDelete: register("star-delete", 60010),
  starEmpty: register("star-empty", 60010),
  comment: register("comment", 60011),
  commentAdd: register("comment-add", 60011),
  alert: register("alert", 60012),
  warning: register("warning", 60012),
  search: register("search", 60013),
  searchSave: register("search-save", 60013),
  logOut: register("log-out", 60014),
  signOut: register("sign-out", 60014),
  logIn: register("log-in", 60015),
  signIn: register("sign-in", 60015),
  eye: register("eye", 60016),
  eyeUnwatch: register("eye-unwatch", 60016),
  eyeWatch: register("eye-watch", 60016),
  circleFilled: register("circle-filled", 60017),
  primitiveDot: register("primitive-dot", 60017),
  closeDirty: register("close-dirty", 60017),
  debugBreakpoint: register("debug-breakpoint", 60017),
  debugBreakpointDisabled: register("debug-breakpoint-disabled", 60017),
  debugHint: register("debug-hint", 60017),
  terminalDecorationSuccess: register("terminal-decoration-success", 60017),
  primitiveSquare: register("primitive-square", 60018),
  edit: register("edit", 60019),
  pencil: register("pencil", 60019),
  info: register("info", 60020),
  issueOpened: register("issue-opened", 60020),
  gistPrivate: register("gist-private", 60021),
  gitForkPrivate: register("git-fork-private", 60021),
  lock: register("lock", 60021),
  mirrorPrivate: register("mirror-private", 60021),
  close: register("close", 60022),
  removeClose: register("remove-close", 60022),
  x: register("x", 60022),
  repoSync: register("repo-sync", 60023),
  sync: register("sync", 60023),
  clone: register("clone", 60024),
  desktopDownload: register("desktop-download", 60024),
  beaker: register("beaker", 60025),
  microscope: register("microscope", 60025),
  vm: register("vm", 60026),
  deviceDesktop: register("device-desktop", 60026),
  file: register("file", 60027),
  fileText: register("file-text", 60027),
  more: register("more", 60028),
  ellipsis: register("ellipsis", 60028),
  kebabHorizontal: register("kebab-horizontal", 60028),
  mailReply: register("mail-reply", 60029),
  reply: register("reply", 60029),
  organization: register("organization", 60030),
  organizationFilled: register("organization-filled", 60030),
  organizationOutline: register("organization-outline", 60030),
  newFile: register("new-file", 60031),
  fileAdd: register("file-add", 60031),
  newFolder: register("new-folder", 60032),
  fileDirectoryCreate: register("file-directory-create", 60032),
  trash: register("trash", 60033),
  trashcan: register("trashcan", 60033),
  history: register("history", 60034),
  clock: register("clock", 60034),
  folder: register("folder", 60035),
  fileDirectory: register("file-directory", 60035),
  symbolFolder: register("symbol-folder", 60035),
  logoGithub: register("logo-github", 60036),
  markGithub: register("mark-github", 60036),
  github: register("github", 60036),
  terminal: register("terminal", 60037),
  console: register("console", 60037),
  repl: register("repl", 60037),
  zap: register("zap", 60038),
  symbolEvent: register("symbol-event", 60038),
  error: register("error", 60039),
  stop: register("stop", 60039),
  variable: register("variable", 60040),
  symbolVariable: register("symbol-variable", 60040),
  array: register("array", 60042),
  symbolArray: register("symbol-array", 60042),
  symbolModule: register("symbol-module", 60043),
  symbolPackage: register("symbol-package", 60043),
  symbolNamespace: register("symbol-namespace", 60043),
  symbolObject: register("symbol-object", 60043),
  symbolMethod: register("symbol-method", 60044),
  symbolFunction: register("symbol-function", 60044),
  symbolConstructor: register("symbol-constructor", 60044),
  symbolBoolean: register("symbol-boolean", 60047),
  symbolNull: register("symbol-null", 60047),
  symbolNumeric: register("symbol-numeric", 60048),
  symbolNumber: register("symbol-number", 60048),
  symbolStructure: register("symbol-structure", 60049),
  symbolStruct: register("symbol-struct", 60049),
  symbolParameter: register("symbol-parameter", 60050),
  symbolTypeParameter: register("symbol-type-parameter", 60050),
  symbolKey: register("symbol-key", 60051),
  symbolText: register("symbol-text", 60051),
  symbolReference: register("symbol-reference", 60052),
  goToFile: register("go-to-file", 60052),
  symbolEnum: register("symbol-enum", 60053),
  symbolValue: register("symbol-value", 60053),
  symbolRuler: register("symbol-ruler", 60054),
  symbolUnit: register("symbol-unit", 60054),
  activateBreakpoints: register("activate-breakpoints", 60055),
  archive: register("archive", 60056),
  arrowBoth: register("arrow-both", 60057),
  arrowDown: register("arrow-down", 60058),
  arrowLeft: register("arrow-left", 60059),
  arrowRight: register("arrow-right", 60060),
  arrowSmallDown: register("arrow-small-down", 60061),
  arrowSmallLeft: register("arrow-small-left", 60062),
  arrowSmallRight: register("arrow-small-right", 60063),
  arrowSmallUp: register("arrow-small-up", 60064),
  arrowUp: register("arrow-up", 60065),
  bell: register("bell", 60066),
  bold: register("bold", 60067),
  book: register("book", 60068),
  bookmark: register("bookmark", 60069),
  debugBreakpointConditionalUnverified: register("debug-breakpoint-conditional-unverified", 60070),
  debugBreakpointConditional: register("debug-breakpoint-conditional", 60071),
  debugBreakpointConditionalDisabled: register("debug-breakpoint-conditional-disabled", 60071),
  debugBreakpointDataUnverified: register("debug-breakpoint-data-unverified", 60072),
  debugBreakpointData: register("debug-breakpoint-data", 60073),
  debugBreakpointDataDisabled: register("debug-breakpoint-data-disabled", 60073),
  debugBreakpointLogUnverified: register("debug-breakpoint-log-unverified", 60074),
  debugBreakpointLog: register("debug-breakpoint-log", 60075),
  debugBreakpointLogDisabled: register("debug-breakpoint-log-disabled", 60075),
  briefcase: register("briefcase", 60076),
  broadcast: register("broadcast", 60077),
  browser: register("browser", 60078),
  bug: register("bug", 60079),
  calendar: register("calendar", 60080),
  caseSensitive: register("case-sensitive", 60081),
  check: register("check", 60082),
  checklist: register("checklist", 60083),
  chevronDown: register("chevron-down", 60084),
  chevronLeft: register("chevron-left", 60085),
  chevronRight: register("chevron-right", 60086),
  chevronUp: register("chevron-up", 60087),
  chromeClose: register("chrome-close", 60088),
  chromeMaximize: register("chrome-maximize", 60089),
  chromeMinimize: register("chrome-minimize", 60090),
  chromeRestore: register("chrome-restore", 60091),
  circleOutline: register("circle-outline", 60092),
  circle: register("circle", 60092),
  debugBreakpointUnverified: register("debug-breakpoint-unverified", 60092),
  terminalDecorationIncomplete: register("terminal-decoration-incomplete", 60092),
  circleSlash: register("circle-slash", 60093),
  circuitBoard: register("circuit-board", 60094),
  clearAll: register("clear-all", 60095),
  clippy: register("clippy", 60096),
  closeAll: register("close-all", 60097),
  cloudDownload: register("cloud-download", 60098),
  cloudUpload: register("cloud-upload", 60099),
  code: register("code", 60100),
  collapseAll: register("collapse-all", 60101),
  colorMode: register("color-mode", 60102),
  commentDiscussion: register("comment-discussion", 60103),
  creditCard: register("credit-card", 60105),
  dash: register("dash", 60108),
  dashboard: register("dashboard", 60109),
  database: register("database", 60110),
  debugContinue: register("debug-continue", 60111),
  debugDisconnect: register("debug-disconnect", 60112),
  debugPause: register("debug-pause", 60113),
  debugRestart: register("debug-restart", 60114),
  debugStart: register("debug-start", 60115),
  debugStepInto: register("debug-step-into", 60116),
  debugStepOut: register("debug-step-out", 60117),
  debugStepOver: register("debug-step-over", 60118),
  debugStop: register("debug-stop", 60119),
  debug: register("debug", 60120),
  deviceCameraVideo: register("device-camera-video", 60121),
  deviceCamera: register("device-camera", 60122),
  deviceMobile: register("device-mobile", 60123),
  diffAdded: register("diff-added", 60124),
  diffIgnored: register("diff-ignored", 60125),
  diffModified: register("diff-modified", 60126),
  diffRemoved: register("diff-removed", 60127),
  diffRenamed: register("diff-renamed", 60128),
  diff: register("diff", 60129),
  diffSidebyside: register("diff-sidebyside", 60129),
  discard: register("discard", 60130),
  editorLayout: register("editor-layout", 60131),
  emptyWindow: register("empty-window", 60132),
  exclude: register("exclude", 60133),
  extensions: register("extensions", 60134),
  eyeClosed: register("eye-closed", 60135),
  fileBinary: register("file-binary", 60136),
  fileCode: register("file-code", 60137),
  fileMedia: register("file-media", 60138),
  filePdf: register("file-pdf", 60139),
  fileSubmodule: register("file-submodule", 60140),
  fileSymlinkDirectory: register("file-symlink-directory", 60141),
  fileSymlinkFile: register("file-symlink-file", 60142),
  fileZip: register("file-zip", 60143),
  files: register("files", 60144),
  filter: register("filter", 60145),
  flame: register("flame", 60146),
  foldDown: register("fold-down", 60147),
  foldUp: register("fold-up", 60148),
  fold: register("fold", 60149),
  folderActive: register("folder-active", 60150),
  folderOpened: register("folder-opened", 60151),
  gear: register("gear", 60152),
  gift: register("gift", 60153),
  gistSecret: register("gist-secret", 60154),
  gist: register("gist", 60155),
  gitCommit: register("git-commit", 60156),
  gitCompare: register("git-compare", 60157),
  compareChanges: register("compare-changes", 60157),
  gitMerge: register("git-merge", 60158),
  githubAction: register("github-action", 60159),
  githubAlt: register("github-alt", 60160),
  globe: register("globe", 60161),
  grabber: register("grabber", 60162),
  graph: register("graph", 60163),
  gripper: register("gripper", 60164),
  heart: register("heart", 60165),
  home: register("home", 60166),
  horizontalRule: register("horizontal-rule", 60167),
  hubot: register("hubot", 60168),
  inbox: register("inbox", 60169),
  issueReopened: register("issue-reopened", 60171),
  issues: register("issues", 60172),
  italic: register("italic", 60173),
  jersey: register("jersey", 60174),
  json: register("json", 60175),
  kebabVertical: register("kebab-vertical", 60176),
  key: register("key", 60177),
  law: register("law", 60178),
  lightbulbAutofix: register("lightbulb-autofix", 60179),
  linkExternal: register("link-external", 60180),
  link: register("link", 60181),
  listOrdered: register("list-ordered", 60182),
  listUnordered: register("list-unordered", 60183),
  liveShare: register("live-share", 60184),
  loading: register("loading", 60185),
  location: register("location", 60186),
  mailRead: register("mail-read", 60187),
  mail: register("mail", 60188),
  markdown: register("markdown", 60189),
  megaphone: register("megaphone", 60190),
  mention: register("mention", 60191),
  milestone: register("milestone", 60192),
  gitPullRequestMilestone: register("git-pull-request-milestone", 60192),
  mortarBoard: register("mortar-board", 60193),
  move: register("move", 60194),
  multipleWindows: register("multiple-windows", 60195),
  mute: register("mute", 60196),
  noNewline: register("no-newline", 60197),
  note: register("note", 60198),
  octoface: register("octoface", 60199),
  openPreview: register("open-preview", 60200),
  package: register("package", 60201),
  paintcan: register("paintcan", 60202),
  pin: register("pin", 60203),
  play: register("play", 60204),
  run: register("run", 60204),
  plug: register("plug", 60205),
  preserveCase: register("preserve-case", 60206),
  preview: register("preview", 60207),
  project: register("project", 60208),
  pulse: register("pulse", 60209),
  question: register("question", 60210),
  quote: register("quote", 60211),
  radioTower: register("radio-tower", 60212),
  reactions: register("reactions", 60213),
  references: register("references", 60214),
  refresh: register("refresh", 60215),
  regex: register("regex", 60216),
  remoteExplorer: register("remote-explorer", 60217),
  remote: register("remote", 60218),
  remove: register("remove", 60219),
  replaceAll: register("replace-all", 60220),
  replace: register("replace", 60221),
  repoClone: register("repo-clone", 60222),
  repoForcePush: register("repo-force-push", 60223),
  repoPull: register("repo-pull", 60224),
  repoPush: register("repo-push", 60225),
  report: register("report", 60226),
  requestChanges: register("request-changes", 60227),
  rocket: register("rocket", 60228),
  rootFolderOpened: register("root-folder-opened", 60229),
  rootFolder: register("root-folder", 60230),
  rss: register("rss", 60231),
  ruby: register("ruby", 60232),
  saveAll: register("save-all", 60233),
  saveAs: register("save-as", 60234),
  save: register("save", 60235),
  screenFull: register("screen-full", 60236),
  screenNormal: register("screen-normal", 60237),
  searchStop: register("search-stop", 60238),
  server: register("server", 60240),
  settingsGear: register("settings-gear", 60241),
  settings: register("settings", 60242),
  shield: register("shield", 60243),
  smiley: register("smiley", 60244),
  sortPrecedence: register("sort-precedence", 60245),
  splitHorizontal: register("split-horizontal", 60246),
  splitVertical: register("split-vertical", 60247),
  squirrel: register("squirrel", 60248),
  starFull: register("star-full", 60249),
  starHalf: register("star-half", 60250),
  symbolClass: register("symbol-class", 60251),
  symbolColor: register("symbol-color", 60252),
  symbolConstant: register("symbol-constant", 60253),
  symbolEnumMember: register("symbol-enum-member", 60254),
  symbolField: register("symbol-field", 60255),
  symbolFile: register("symbol-file", 60256),
  symbolInterface: register("symbol-interface", 60257),
  symbolKeyword: register("symbol-keyword", 60258),
  symbolMisc: register("symbol-misc", 60259),
  symbolOperator: register("symbol-operator", 60260),
  symbolProperty: register("symbol-property", 60261),
  wrench: register("wrench", 60261),
  wrenchSubaction: register("wrench-subaction", 60261),
  symbolSnippet: register("symbol-snippet", 60262),
  tasklist: register("tasklist", 60263),
  telescope: register("telescope", 60264),
  textSize: register("text-size", 60265),
  threeBars: register("three-bars", 60266),
  thumbsdown: register("thumbsdown", 60267),
  thumbsup: register("thumbsup", 60268),
  tools: register("tools", 60269),
  triangleDown: register("triangle-down", 60270),
  triangleLeft: register("triangle-left", 60271),
  triangleRight: register("triangle-right", 60272),
  triangleUp: register("triangle-up", 60273),
  twitter: register("twitter", 60274),
  unfold: register("unfold", 60275),
  unlock: register("unlock", 60276),
  unmute: register("unmute", 60277),
  unverified: register("unverified", 60278),
  verified: register("verified", 60279),
  versions: register("versions", 60280),
  vmActive: register("vm-active", 60281),
  vmOutline: register("vm-outline", 60282),
  vmRunning: register("vm-running", 60283),
  watch: register("watch", 60284),
  whitespace: register("whitespace", 60285),
  wholeWord: register("whole-word", 60286),
  window: register("window", 60287),
  wordWrap: register("word-wrap", 60288),
  zoomIn: register("zoom-in", 60289),
  zoomOut: register("zoom-out", 60290),
  listFilter: register("list-filter", 60291),
  listFlat: register("list-flat", 60292),
  listSelection: register("list-selection", 60293),
  selection: register("selection", 60293),
  listTree: register("list-tree", 60294),
  debugBreakpointFunctionUnverified: register("debug-breakpoint-function-unverified", 60295),
  debugBreakpointFunction: register("debug-breakpoint-function", 60296),
  debugBreakpointFunctionDisabled: register("debug-breakpoint-function-disabled", 60296),
  debugStackframeActive: register("debug-stackframe-active", 60297),
  circleSmallFilled: register("circle-small-filled", 60298),
  debugStackframeDot: register("debug-stackframe-dot", 60298),
  terminalDecorationMark: register("terminal-decoration-mark", 60298),
  debugStackframe: register("debug-stackframe", 60299),
  debugStackframeFocused: register("debug-stackframe-focused", 60299),
  debugBreakpointUnsupported: register("debug-breakpoint-unsupported", 60300),
  symbolString: register("symbol-string", 60301),
  debugReverseContinue: register("debug-reverse-continue", 60302),
  debugStepBack: register("debug-step-back", 60303),
  debugRestartFrame: register("debug-restart-frame", 60304),
  debugAlt: register("debug-alt", 60305),
  callIncoming: register("call-incoming", 60306),
  callOutgoing: register("call-outgoing", 60307),
  menu: register("menu", 60308),
  expandAll: register("expand-all", 60309),
  feedback: register("feedback", 60310),
  gitPullRequestReviewer: register("git-pull-request-reviewer", 60310),
  groupByRefType: register("group-by-ref-type", 60311),
  ungroupByRefType: register("ungroup-by-ref-type", 60312),
  account: register("account", 60313),
  gitPullRequestAssignee: register("git-pull-request-assignee", 60313),
  bellDot: register("bell-dot", 60314),
  debugConsole: register("debug-console", 60315),
  library: register("library", 60316),
  output: register("output", 60317),
  runAll: register("run-all", 60318),
  syncIgnored: register("sync-ignored", 60319),
  pinned: register("pinned", 60320),
  githubInverted: register("github-inverted", 60321),
  serverProcess: register("server-process", 60322),
  serverEnvironment: register("server-environment", 60323),
  pass: register("pass", 60324),
  issueClosed: register("issue-closed", 60324),
  stopCircle: register("stop-circle", 60325),
  playCircle: register("play-circle", 60326),
  record: register("record", 60327),
  debugAltSmall: register("debug-alt-small", 60328),
  vmConnect: register("vm-connect", 60329),
  cloud: register("cloud", 60330),
  merge: register("merge", 60331),
  export: register("export", 60332),
  graphLeft: register("graph-left", 60333),
  magnet: register("magnet", 60334),
  notebook: register("notebook", 60335),
  redo: register("redo", 60336),
  checkAll: register("check-all", 60337),
  pinnedDirty: register("pinned-dirty", 60338),
  passFilled: register("pass-filled", 60339),
  circleLargeFilled: register("circle-large-filled", 60340),
  circleLarge: register("circle-large", 60341),
  circleLargeOutline: register("circle-large-outline", 60341),
  combine: register("combine", 60342),
  gather: register("gather", 60342),
  table: register("table", 60343),
  variableGroup: register("variable-group", 60344),
  typeHierarchy: register("type-hierarchy", 60345),
  typeHierarchySub: register("type-hierarchy-sub", 60346),
  typeHierarchySuper: register("type-hierarchy-super", 60347),
  gitPullRequestCreate: register("git-pull-request-create", 60348),
  runAbove: register("run-above", 60349),
  runBelow: register("run-below", 60350),
  notebookTemplate: register("notebook-template", 60351),
  debugRerun: register("debug-rerun", 60352),
  workspaceTrusted: register("workspace-trusted", 60353),
  workspaceUntrusted: register("workspace-untrusted", 60354),
  workspaceUnknown: register("workspace-unknown", 60355),
  terminalCmd: register("terminal-cmd", 60356),
  terminalDebian: register("terminal-debian", 60357),
  terminalLinux: register("terminal-linux", 60358),
  terminalPowershell: register("terminal-powershell", 60359),
  terminalTmux: register("terminal-tmux", 60360),
  terminalUbuntu: register("terminal-ubuntu", 60361),
  terminalBash: register("terminal-bash", 60362),
  arrowSwap: register("arrow-swap", 60363),
  copy: register("copy", 60364),
  personAdd: register("person-add", 60365),
  filterFilled: register("filter-filled", 60366),
  wand: register("wand", 60367),
  debugLineByLine: register("debug-line-by-line", 60368),
  inspect: register("inspect", 60369),
  layers: register("layers", 60370),
  layersDot: register("layers-dot", 60371),
  layersActive: register("layers-active", 60372),
  compass: register("compass", 60373),
  compassDot: register("compass-dot", 60374),
  compassActive: register("compass-active", 60375),
  azure: register("azure", 60376),
  issueDraft: register("issue-draft", 60377),
  gitPullRequestClosed: register("git-pull-request-closed", 60378),
  gitPullRequestDraft: register("git-pull-request-draft", 60379),
  debugAll: register("debug-all", 60380),
  debugCoverage: register("debug-coverage", 60381),
  runErrors: register("run-errors", 60382),
  folderLibrary: register("folder-library", 60383),
  debugContinueSmall: register("debug-continue-small", 60384),
  beakerStop: register("beaker-stop", 60385),
  graphLine: register("graph-line", 60386),
  graphScatter: register("graph-scatter", 60387),
  pieChart: register("pie-chart", 60388),
  bracket: register("bracket", 60175),
  bracketDot: register("bracket-dot", 60389),
  bracketError: register("bracket-error", 60390),
  lockSmall: register("lock-small", 60391),
  azureDevops: register("azure-devops", 60392),
  verifiedFilled: register("verified-filled", 60393),
  newline: register("newline", 60394),
  layout: register("layout", 60395),
  layoutActivitybarLeft: register("layout-activitybar-left", 60396),
  layoutActivitybarRight: register("layout-activitybar-right", 60397),
  layoutPanelLeft: register("layout-panel-left", 60398),
  layoutPanelCenter: register("layout-panel-center", 60399),
  layoutPanelJustify: register("layout-panel-justify", 60400),
  layoutPanelRight: register("layout-panel-right", 60401),
  layoutPanel: register("layout-panel", 60402),
  layoutSidebarLeft: register("layout-sidebar-left", 60403),
  layoutSidebarRight: register("layout-sidebar-right", 60404),
  layoutStatusbar: register("layout-statusbar", 60405),
  layoutMenubar: register("layout-menubar", 60406),
  layoutCentered: register("layout-centered", 60407),
  target: register("target", 60408),
  indent: register("indent", 60409),
  recordSmall: register("record-small", 60410),
  errorSmall: register("error-small", 60411),
  terminalDecorationError: register("terminal-decoration-error", 60411),
  arrowCircleDown: register("arrow-circle-down", 60412),
  arrowCircleLeft: register("arrow-circle-left", 60413),
  arrowCircleRight: register("arrow-circle-right", 60414),
  arrowCircleUp: register("arrow-circle-up", 60415),
  layoutSidebarRightOff: register("layout-sidebar-right-off", 60416),
  layoutPanelOff: register("layout-panel-off", 60417),
  layoutSidebarLeftOff: register("layout-sidebar-left-off", 60418),
  blank: register("blank", 60419),
  heartFilled: register("heart-filled", 60420),
  map: register("map", 60421),
  mapHorizontal: register("map-horizontal", 60421),
  foldHorizontal: register("fold-horizontal", 60421),
  mapFilled: register("map-filled", 60422),
  mapHorizontalFilled: register("map-horizontal-filled", 60422),
  foldHorizontalFilled: register("fold-horizontal-filled", 60422),
  circleSmall: register("circle-small", 60423),
  bellSlash: register("bell-slash", 60424),
  bellSlashDot: register("bell-slash-dot", 60425),
  commentUnresolved: register("comment-unresolved", 60426),
  gitPullRequestGoToChanges: register("git-pull-request-go-to-changes", 60427),
  gitPullRequestNewChanges: register("git-pull-request-new-changes", 60428),
  searchFuzzy: register("search-fuzzy", 60429),
  commentDraft: register("comment-draft", 60430),
  send: register("send", 60431),
  sparkle: register("sparkle", 60432),
  insert: register("insert", 60433),
  mic: register("mic", 60434),
  thumbsdownFilled: register("thumbsdown-filled", 60435),
  thumbsupFilled: register("thumbsup-filled", 60436),
  coffee: register("coffee", 60437),
  snake: register("snake", 60438),
  game: register("game", 60439),
  vr: register("vr", 60440),
  chip: register("chip", 60441),
  piano: register("piano", 60442),
  music: register("music", 60443),
  micFilled: register("mic-filled", 60444),
  repoFetch: register("repo-fetch", 60445),
  copilot: register("copilot", 60446),
  lightbulbSparkle: register("lightbulb-sparkle", 60447),
  robot: register("robot", 60448),
  sparkleFilled: register("sparkle-filled", 60449),
  diffSingle: register("diff-single", 60450),
  diffMultiple: register("diff-multiple", 60451),
  surroundWith: register("surround-with", 60452),
  share: register("share", 60453),
  gitStash: register("git-stash", 60454),
  gitStashApply: register("git-stash-apply", 60455),
  gitStashPop: register("git-stash-pop", 60456),
  vscode: register("vscode", 60457),
  vscodeInsiders: register("vscode-insiders", 60458),
  codeOss: register("code-oss", 60459),
  runCoverage: register("run-coverage", 60460),
  runAllCoverage: register("run-all-coverage", 60461),
  coverage: register("coverage", 60462),
  githubProject: register("github-project", 60463),
  mapVertical: register("map-vertical", 60464),
  foldVertical: register("fold-vertical", 60464),
  mapVerticalFilled: register("map-vertical-filled", 60465),
  foldVerticalFilled: register("fold-vertical-filled", 60465),
  goToSearch: register("go-to-search", 60466),
  percentage: register("percentage", 60467),
  sortPercentage: register("sort-percentage", 60467),
  attach: register("attach", 60468)
};
const codiconsDerived = {
  dialogError: register("dialog-error", "error"),
  dialogWarning: register("dialog-warning", "warning"),
  dialogInfo: register("dialog-info", "info"),
  dialogClose: register("dialog-close", "close"),
  treeItemExpanded: register("tree-item-expanded", "chevron-down"),
  // collapsed is done with rotation
  treeFilterOnTypeOn: register("tree-filter-on-type-on", "list-filter"),
  treeFilterOnTypeOff: register("tree-filter-on-type-off", "list-selection"),
  treeFilterClear: register("tree-filter-clear", "close"),
  treeItemLoading: register("tree-item-loading", "loading"),
  menuSelection: register("menu-selection", "check"),
  menuSubmenu: register("menu-submenu", "chevron-right"),
  menuBarMore: register("menubar-more", "more"),
  scrollbarButtonLeft: register("scrollbar-button-left", "triangle-left"),
  scrollbarButtonRight: register("scrollbar-button-right", "triangle-right"),
  scrollbarButtonUp: register("scrollbar-button-up", "triangle-up"),
  scrollbarButtonDown: register("scrollbar-button-down", "triangle-down"),
  toolBarMore: register("toolbar-more", "more"),
  quickInputBack: register("quick-input-back", "arrow-left"),
  dropDownButton: register("drop-down-button", 60084),
  symbolCustomColor: register("symbol-customcolor", 60252),
  exportIcon: register("export", 60332),
  workspaceUnspecified: register("workspace-unspecified", 60355),
  newLine: register("newline", 60394),
  thumbsDownFilled: register("thumbsdown-filled", 60435),
  thumbsUpFilled: register("thumbsup-filled", 60436),
  gitFetch: register("git-fetch", 60445),
  lightbulbSparkleAutofix: register("lightbulb-sparkle-autofix", 60447),
  debugBreakpointPending: register("debug-breakpoint-pending", 60377)
};
const Codicon = {
  ...codiconsLibrary,
  ...codiconsDerived
};
var ThemeColor;
(function(ThemeColor2) {
  function isThemeColor(obj) {
    return obj && typeof obj === "object" && typeof obj.id === "string";
  }
  ThemeColor2.isThemeColor = isThemeColor;
})(ThemeColor || (ThemeColor = {}));
var ThemeIcon;
(function(ThemeIcon2) {
  ThemeIcon2.iconNameSegment = "[A-Za-z0-9]+";
  ThemeIcon2.iconNameExpression = "[A-Za-z0-9-]+";
  ThemeIcon2.iconModifierExpression = "~[A-Za-z]+";
  ThemeIcon2.iconNameCharacter = "[A-Za-z0-9~-]";
  const ThemeIconIdRegex = new RegExp(`^(${ThemeIcon2.iconNameExpression})(${ThemeIcon2.iconModifierExpression})?$`);
  function asClassNameArray(icon) {
    const match = ThemeIconIdRegex.exec(icon.id);
    if (!match) {
      return asClassNameArray(Codicon.error);
    }
    const [, id, modifier] = match;
    const classNames = ["codicon", "codicon-" + id];
    if (modifier) {
      classNames.push("codicon-modifier-" + modifier.substring(1));
    }
    return classNames;
  }
  ThemeIcon2.asClassNameArray = asClassNameArray;
  function asClassName(icon) {
    return asClassNameArray(icon).join(" ");
  }
  ThemeIcon2.asClassName = asClassName;
  function asCSSSelector(icon) {
    return "." + asClassNameArray(icon).join(".");
  }
  ThemeIcon2.asCSSSelector = asCSSSelector;
  function isThemeIcon(obj) {
    return obj && typeof obj === "object" && typeof obj.id === "string" && (typeof obj.color === "undefined" || ThemeColor.isThemeColor(obj.color));
  }
  ThemeIcon2.isThemeIcon = isThemeIcon;
  const _regexFromString = new RegExp(`^\\$\\((${ThemeIcon2.iconNameExpression}(?:${ThemeIcon2.iconModifierExpression})?)\\)$`);
  function fromString(str) {
    const match = _regexFromString.exec(str);
    if (!match) {
      return void 0;
    }
    const [, name] = match;
    return { id: name };
  }
  ThemeIcon2.fromString = fromString;
  function fromId(id) {
    return { id };
  }
  ThemeIcon2.fromId = fromId;
  function modify(icon, modifier) {
    let id = icon.id;
    const tildeIndex = id.lastIndexOf("~");
    if (tildeIndex !== -1) {
      id = id.substring(0, tildeIndex);
    }
    if (modifier) {
      id = `${id}~${modifier}`;
    }
    return { id };
  }
  ThemeIcon2.modify = modify;
  function getModifier(icon) {
    const tildeIndex = icon.id.lastIndexOf("~");
    if (tildeIndex !== -1) {
      return icon.id.substring(tildeIndex + 1);
    }
    return void 0;
  }
  ThemeIcon2.getModifier = getModifier;
  function isEqual(ti1, ti2) {
    return ti1.id === ti2.id && ti1.color?.id === ti2.color?.id;
  }
  ThemeIcon2.isEqual = isEqual;
})(ThemeIcon || (ThemeIcon = {}));
function ok(value, message) {
  if (!value) {
    throw new Error(message ? `Assertion failed (${message})` : "Assertion Failed");
  }
}
function assertNever(value, message = "Unreachable") {
  throw new Error(message);
}
class RegistryImpl {
  constructor() {
    this.data = /* @__PURE__ */ new Map();
  }
  add(id, data) {
    ok(isString(id));
    ok(isObject(data));
    ok(!this.data.has(id), "There is already an extension with this id");
    this.data.set(id, data);
  }
  as(id) {
    return this.data.get(id) || null;
  }
}
const Registry = new RegistryImpl();
const Extensions$2 = {
  JSONContribution: "base.contributions.json"
};
function normalizeId(id) {
  if (id.length > 0 && id.charAt(id.length - 1) === "#") {
    return id.substring(0, id.length - 1);
  }
  return id;
}
class JSONContributionRegistry {
  constructor() {
    this._onDidChangeSchema = new Emitter();
    this.schemasById = {};
  }
  registerSchema(uri, unresolvedSchemaContent) {
    this.schemasById[normalizeId(uri)] = unresolvedSchemaContent;
    this._onDidChangeSchema.fire(uri);
  }
  notifySchemaChanged(uri) {
    this._onDidChangeSchema.fire(uri);
  }
}
const jsonContributionRegistry = new JSONContributionRegistry();
Registry.add(Extensions$2.JSONContribution, jsonContributionRegistry);
function isColorDefaults(value) {
  return value !== null && typeof value === "object" && "light" in value && "dark" in value;
}
const Extensions$1 = {
  ColorContribution: "base.contributions.colors"
};
const DEFAULT_COLOR_CONFIG_VALUE = "default";
class ColorRegistry {
  constructor() {
    this._onDidChangeSchema = new Emitter();
    this.onDidChangeSchema = this._onDidChangeSchema.event;
    this.colorSchema = { type: "object", properties: {} };
    this.colorReferenceSchema = { type: "string", enum: [], enumDescriptions: [] };
    this.colorsById = {};
  }
  registerColor(id, defaults, description, needsTransparency = false, deprecationMessage) {
    const colorContribution = { id, description, defaults, needsTransparency, deprecationMessage };
    this.colorsById[id] = colorContribution;
    const propertySchema = { type: "string", format: "color-hex", defaultSnippets: [{ body: "${1:#ff0000}" }] };
    if (deprecationMessage) {
      propertySchema.deprecationMessage = deprecationMessage;
    }
    if (needsTransparency) {
      propertySchema.pattern = "^#(?:(?<rgba>[0-9a-fA-f]{3}[0-9a-eA-E])|(?:[0-9a-fA-F]{6}(?:(?![fF]{2})(?:[0-9a-fA-F]{2}))))?$";
      propertySchema.patternErrorMessage = localize("transparecyRequired", "This color must be transparent or it will obscure content");
    }
    this.colorSchema.properties[id] = {
      description,
      oneOf: [
        propertySchema,
        { type: "string", const: DEFAULT_COLOR_CONFIG_VALUE, description: localize("useDefault", "Use the default color.") }
      ]
    };
    this.colorReferenceSchema.enum.push(id);
    this.colorReferenceSchema.enumDescriptions.push(description);
    this._onDidChangeSchema.fire();
    return id;
  }
  getColors() {
    return Object.keys(this.colorsById).map((id) => this.colorsById[id]);
  }
  resolveDefaultColor(id, theme) {
    const colorDesc = this.colorsById[id];
    if (colorDesc?.defaults) {
      const colorValue = isColorDefaults(colorDesc.defaults) ? colorDesc.defaults[theme.type] : colorDesc.defaults;
      return resolveColorValue(colorValue, theme);
    }
    return void 0;
  }
  getColorSchema() {
    return this.colorSchema;
  }
  toString() {
    const sorter = (a, b) => {
      const cat1 = a.indexOf(".") === -1 ? 0 : 1;
      const cat2 = b.indexOf(".") === -1 ? 0 : 1;
      if (cat1 !== cat2) {
        return cat1 - cat2;
      }
      return a.localeCompare(b);
    };
    return Object.keys(this.colorsById).sort(sorter).map((k) => `- \`${k}\`: ${this.colorsById[k].description}`).join("\n");
  }
}
const colorRegistry = new ColorRegistry();
Registry.add(Extensions$1.ColorContribution, colorRegistry);
function registerColor(id, defaults, description, needsTransparency, deprecationMessage) {
  return colorRegistry.registerColor(id, defaults, description, needsTransparency, deprecationMessage);
}
function executeTransform(transform, theme) {
  switch (transform.op) {
    case 0:
      return resolveColorValue(transform.value, theme)?.darken(transform.factor);
    case 1:
      return resolveColorValue(transform.value, theme)?.lighten(transform.factor);
    case 2:
      return resolveColorValue(transform.value, theme)?.transparent(transform.factor);
    case 3: {
      const backgroundColor = resolveColorValue(transform.background, theme);
      if (!backgroundColor) {
        return resolveColorValue(transform.value, theme);
      }
      return resolveColorValue(transform.value, theme)?.makeOpaque(backgroundColor);
    }
    case 4:
      for (const candidate of transform.values) {
        const color = resolveColorValue(candidate, theme);
        if (color) {
          return color;
        }
      }
      return void 0;
    case 6:
      return resolveColorValue(theme.defines(transform.if) ? transform.then : transform.else, theme);
    case 5: {
      const from = resolveColorValue(transform.value, theme);
      if (!from) {
        return void 0;
      }
      const backgroundColor = resolveColorValue(transform.background, theme);
      if (!backgroundColor) {
        return from.transparent(transform.factor * transform.transparency);
      }
      return from.isDarkerThan(backgroundColor) ? Color.getLighterColor(from, backgroundColor, transform.factor).transparent(transform.transparency) : Color.getDarkerColor(from, backgroundColor, transform.factor).transparent(transform.transparency);
    }
    default:
      throw assertNever();
  }
}
function darken(colorValue, factor) {
  return { op: 0, value: colorValue, factor };
}
function lighten(colorValue, factor) {
  return { op: 1, value: colorValue, factor };
}
function transparent(colorValue, factor) {
  return { op: 2, value: colorValue, factor };
}
function oneOf(...colorValues) {
  return { op: 4, values: colorValues };
}
function ifDefinedThenElse(ifArg, thenArg, elseArg) {
  return { op: 6, if: ifArg, then: thenArg, else: elseArg };
}
function lessProminent(colorValue, backgroundColorValue, factor, transparency) {
  return { op: 5, value: colorValue, background: backgroundColorValue, factor, transparency };
}
function resolveColorValue(colorValue, theme) {
  if (colorValue === null) {
    return void 0;
  } else if (typeof colorValue === "string") {
    if (colorValue[0] === "#") {
      return Color.fromHex(colorValue);
    }
    return theme.getColor(colorValue);
  } else if (colorValue instanceof Color) {
    return colorValue;
  } else if (typeof colorValue === "object") {
    return executeTransform(colorValue, theme);
  }
  return void 0;
}
const workbenchColorsSchemaId = "vscode://schemas/workbench-colors";
const schemaRegistry$1 = Registry.as(Extensions$2.JSONContribution);
schemaRegistry$1.registerSchema(workbenchColorsSchemaId, colorRegistry.getColorSchema());
const delayer$1 = new RunOnceScheduler(() => schemaRegistry$1.notifySchemaChanged(workbenchColorsSchemaId), 200);
colorRegistry.onDidChangeSchema(() => {
  if (!delayer$1.isScheduled()) {
    delayer$1.schedule();
  }
});
const foreground = registerColor("foreground", { dark: "#CCCCCC", light: "#616161", hcDark: "#FFFFFF", hcLight: "#292929" }, localize("foreground", "Overall foreground color. This color is only used if not overridden by a component."));
registerColor("disabledForeground", { dark: "#CCCCCC80", light: "#61616180", hcDark: "#A5A5A5", hcLight: "#7F7F7F" }, localize("disabledForeground", "Overall foreground for disabled elements. This color is only used if not overridden by a component."));
registerColor("errorForeground", { dark: "#F48771", light: "#A1260D", hcDark: "#F48771", hcLight: "#B5200D" }, localize("errorForeground", "Overall foreground color for error messages. This color is only used if not overridden by a component."));
registerColor("descriptionForeground", { light: "#717171", dark: transparent(foreground, 0.7), hcDark: transparent(foreground, 0.7), hcLight: transparent(foreground, 0.7) }, localize("descriptionForeground", "Foreground color for description text providing additional information, for example for a label."));
const iconForeground = registerColor("icon.foreground", { dark: "#C5C5C5", light: "#424242", hcDark: "#FFFFFF", hcLight: "#292929" }, localize("iconForeground", "The default color for icons in the workbench."));
const focusBorder = registerColor("focusBorder", { dark: "#007FD4", light: "#0090F1", hcDark: "#F38518", hcLight: "#006BBD" }, localize("focusBorder", "Overall border color for focused elements. This color is only used if not overridden by a component."));
const contrastBorder = registerColor("contrastBorder", { light: null, dark: null, hcDark: "#6FC3DF", hcLight: "#0F4A85" }, localize("contrastBorder", "An extra border around elements to separate them from others for greater contrast."));
const activeContrastBorder = registerColor("contrastActiveBorder", { light: null, dark: null, hcDark: focusBorder, hcLight: focusBorder }, localize("activeContrastBorder", "An extra border around active elements to separate them from others for greater contrast."));
registerColor("selection.background", null, localize("selectionBackground", "The background color of text selections in the workbench (e.g. for input fields or text areas). Note that this does not apply to selections within the editor."));
registerColor("textLink.foreground", { light: "#006AB1", dark: "#3794FF", hcDark: "#21A6FF", hcLight: "#0F4A85" }, localize("textLinkForeground", "Foreground color for links in text."));
registerColor("textLink.activeForeground", { light: "#006AB1", dark: "#3794FF", hcDark: "#21A6FF", hcLight: "#0F4A85" }, localize("textLinkActiveForeground", "Foreground color for links in text when clicked on and on mouse hover."));
registerColor("textSeparator.foreground", { light: "#0000002e", dark: "#ffffff2e", hcDark: Color.black, hcLight: "#292929" }, localize("textSeparatorForeground", "Color for text separators."));
registerColor("textPreformat.foreground", { light: "#A31515", dark: "#D7BA7D", hcDark: "#000000", hcLight: "#FFFFFF" }, localize("textPreformatForeground", "Foreground color for preformatted text segments."));
registerColor("textPreformat.background", { light: "#0000001A", dark: "#FFFFFF1A", hcDark: "#FFFFFF", hcLight: "#09345f" }, localize("textPreformatBackground", "Background color for preformatted text segments."));
registerColor("textBlockQuote.background", { light: "#f2f2f2", dark: "#222222", hcDark: null, hcLight: "#F2F2F2" }, localize("textBlockQuoteBackground", "Background color for block quotes in text."));
registerColor("textBlockQuote.border", { light: "#007acc80", dark: "#007acc80", hcDark: Color.white, hcLight: "#292929" }, localize("textBlockQuoteBorder", "Border color for block quotes in text."));
registerColor("textCodeBlock.background", { light: "#dcdcdc66", dark: "#0a0a0a66", hcDark: Color.black, hcLight: "#F2F2F2" }, localize("textCodeBlockBackground", "Background color for code blocks in text."));
registerColor("sash.hoverBorder", focusBorder, localize("sashActiveBorder", "Border color of active sashes."));
const badgeBackground = registerColor("badge.background", { dark: "#4D4D4D", light: "#C4C4C4", hcDark: Color.black, hcLight: "#0F4A85" }, localize("badgeBackground", "Badge background color. Badges are small information labels, e.g. for search results count."));
registerColor("badge.foreground", { dark: Color.white, light: "#333", hcDark: Color.white, hcLight: Color.white }, localize("badgeForeground", "Badge foreground color. Badges are small information labels, e.g. for search results count."));
const scrollbarShadow = registerColor("scrollbar.shadow", { dark: "#000000", light: "#DDDDDD", hcDark: null, hcLight: null }, localize("scrollbarShadow", "Scrollbar shadow to indicate that the view is scrolled."));
const scrollbarSliderBackground = registerColor("scrollbarSlider.background", { dark: Color.fromHex("#797979").transparent(0.4), light: Color.fromHex("#646464").transparent(0.4), hcDark: transparent(contrastBorder, 0.6), hcLight: transparent(contrastBorder, 0.4) }, localize("scrollbarSliderBackground", "Scrollbar slider background color."));
const scrollbarSliderHoverBackground = registerColor("scrollbarSlider.hoverBackground", { dark: Color.fromHex("#646464").transparent(0.7), light: Color.fromHex("#646464").transparent(0.7), hcDark: transparent(contrastBorder, 0.8), hcLight: transparent(contrastBorder, 0.8) }, localize("scrollbarSliderHoverBackground", "Scrollbar slider background color when hovering."));
const scrollbarSliderActiveBackground = registerColor("scrollbarSlider.activeBackground", { dark: Color.fromHex("#BFBFBF").transparent(0.4), light: Color.fromHex("#000000").transparent(0.6), hcDark: contrastBorder, hcLight: contrastBorder }, localize("scrollbarSliderActiveBackground", "Scrollbar slider background color when clicked on."));
registerColor("progressBar.background", { dark: Color.fromHex("#0E70C0"), light: Color.fromHex("#0E70C0"), hcDark: contrastBorder, hcLight: contrastBorder }, localize("progressBarBackground", "Background color of the progress bar that can show for long running operations."));
const editorBackground = registerColor("editor.background", { light: "#ffffff", dark: "#1E1E1E", hcDark: Color.black, hcLight: Color.white }, localize("editorBackground", "Editor background color."));
registerColor("editor.foreground", { light: "#333333", dark: "#BBBBBB", hcDark: Color.white, hcLight: foreground }, localize("editorForeground", "Editor default foreground color."));
registerColor("editorStickyScroll.background", editorBackground, localize("editorStickyScrollBackground", "Background color of sticky scroll in the editor"));
registerColor("editorStickyScrollHover.background", { dark: "#2A2D2E", light: "#F0F0F0", hcDark: null, hcLight: Color.fromHex("#0F4A85").transparent(0.1) }, localize("editorStickyScrollHoverBackground", "Background color of sticky scroll on hover in the editor"));
registerColor("editorStickyScroll.border", { dark: null, light: null, hcDark: contrastBorder, hcLight: contrastBorder }, localize("editorStickyScrollBorder", "Border color of sticky scroll in the editor"));
registerColor("editorStickyScroll.shadow", scrollbarShadow, localize("editorStickyScrollShadow", " Shadow color of sticky scroll in the editor"));
const editorWidgetBackground = registerColor("editorWidget.background", { dark: "#252526", light: "#F3F3F3", hcDark: "#0C141F", hcLight: Color.white }, localize("editorWidgetBackground", "Background color of editor widgets, such as find/replace."));
const editorWidgetForeground = registerColor("editorWidget.foreground", foreground, localize("editorWidgetForeground", "Foreground color of editor widgets, such as find/replace."));
const editorWidgetBorder = registerColor("editorWidget.border", { dark: "#454545", light: "#C8C8C8", hcDark: contrastBorder, hcLight: contrastBorder }, localize("editorWidgetBorder", "Border color of editor widgets. The color is only used if the widget chooses to have a border and if the color is not overridden by a widget."));
registerColor("editorWidget.resizeBorder", null, localize("editorWidgetResizeBorder", "Border color of the resize bar of editor widgets. The color is only used if the widget chooses to have a resize border and if the color is not overridden by a widget."));
registerColor("editorError.background", null, localize("editorError.background", "Background color of error text in the editor. The color must not be opaque so as not to hide underlying decorations."), true);
const editorErrorForeground = registerColor("editorError.foreground", { dark: "#F14C4C", light: "#E51400", hcDark: "#F48771", hcLight: "#B5200D" }, localize("editorError.foreground", "Foreground color of error squigglies in the editor."));
registerColor("editorError.border", { dark: null, light: null, hcDark: Color.fromHex("#E47777").transparent(0.8), hcLight: "#B5200D" }, localize("errorBorder", "If set, color of double underlines for errors in the editor."));
registerColor("editorWarning.background", null, localize("editorWarning.background", "Background color of warning text in the editor. The color must not be opaque so as not to hide underlying decorations."), true);
const editorWarningForeground = registerColor("editorWarning.foreground", { dark: "#CCA700", light: "#BF8803", hcDark: "#FFD370", hcLight: "#895503" }, localize("editorWarning.foreground", "Foreground color of warning squigglies in the editor."));
const editorWarningBorder = registerColor("editorWarning.border", { dark: null, light: null, hcDark: Color.fromHex("#FFCC00").transparent(0.8), hcLight: Color.fromHex("#FFCC00").transparent(0.8) }, localize("warningBorder", "If set, color of double underlines for warnings in the editor."));
registerColor("editorInfo.background", null, localize("editorInfo.background", "Background color of info text in the editor. The color must not be opaque so as not to hide underlying decorations."), true);
const editorInfoForeground = registerColor("editorInfo.foreground", { dark: "#3794FF", light: "#1a85ff", hcDark: "#3794FF", hcLight: "#1a85ff" }, localize("editorInfo.foreground", "Foreground color of info squigglies in the editor."));
const editorInfoBorder = registerColor("editorInfo.border", { dark: null, light: null, hcDark: Color.fromHex("#3794FF").transparent(0.8), hcLight: "#292929" }, localize("infoBorder", "If set, color of double underlines for infos in the editor."));
registerColor("editorHint.foreground", { dark: Color.fromHex("#eeeeee").transparent(0.7), light: "#6c6c6c", hcDark: null, hcLight: null }, localize("editorHint.foreground", "Foreground color of hint squigglies in the editor."));
registerColor("editorHint.border", { dark: null, light: null, hcDark: Color.fromHex("#eeeeee").transparent(0.8), hcLight: "#292929" }, localize("hintBorder", "If set, color of double underlines for hints in the editor."));
registerColor("editorLink.activeForeground", { dark: "#4E94CE", light: Color.blue, hcDark: Color.cyan, hcLight: "#292929" }, localize("activeLinkForeground", "Color of active links."));
const editorSelectionBackground = registerColor("editor.selectionBackground", { light: "#ADD6FF", dark: "#264F78", hcDark: "#f3f518", hcLight: "#0F4A85" }, localize("editorSelectionBackground", "Color of the editor selection."));
registerColor("editor.selectionForeground", { light: null, dark: null, hcDark: "#000000", hcLight: Color.white }, localize("editorSelectionForeground", "Color of the selected text for high contrast."));
registerColor("editor.inactiveSelectionBackground", { light: transparent(editorSelectionBackground, 0.5), dark: transparent(editorSelectionBackground, 0.5), hcDark: transparent(editorSelectionBackground, 0.7), hcLight: transparent(editorSelectionBackground, 0.5) }, localize("editorInactiveSelection", "Color of the selection in an inactive editor. The color must not be opaque so as not to hide underlying decorations."), true);
registerColor("editor.selectionHighlightBackground", { light: lessProminent(editorSelectionBackground, editorBackground, 0.3, 0.6), dark: lessProminent(editorSelectionBackground, editorBackground, 0.3, 0.6), hcDark: null, hcLight: null }, localize("editorSelectionHighlight", "Color for regions with the same content as the selection. The color must not be opaque so as not to hide underlying decorations."), true);
registerColor("editor.selectionHighlightBorder", { light: null, dark: null, hcDark: activeContrastBorder, hcLight: activeContrastBorder }, localize("editorSelectionHighlightBorder", "Border color for regions with the same content as the selection."));
registerColor("editor.findMatchBackground", { light: "#A8AC94", dark: "#515C6A", hcDark: null, hcLight: null }, localize("editorFindMatch", "Color of the current search match."));
registerColor("editor.findMatchForeground", null, localize("editorFindMatchForeground", "Text color of the current search match."));
const editorFindMatchHighlight = registerColor("editor.findMatchHighlightBackground", { light: "#EA5C0055", dark: "#EA5C0055", hcDark: null, hcLight: null }, localize("findMatchHighlight", "Color of the other search matches. The color must not be opaque so as not to hide underlying decorations."), true);
registerColor("editor.findMatchHighlightForeground", null, localize("findMatchHighlightForeground", "Foreground color of the other search matches."), true);
registerColor("editor.findRangeHighlightBackground", { dark: "#3a3d4166", light: "#b4b4b44d", hcDark: null, hcLight: null }, localize("findRangeHighlight", "Color of the range limiting the search. The color must not be opaque so as not to hide underlying decorations."), true);
registerColor("editor.findMatchBorder", { light: null, dark: null, hcDark: activeContrastBorder, hcLight: activeContrastBorder }, localize("editorFindMatchBorder", "Border color of the current search match."));
const editorFindMatchHighlightBorder = registerColor("editor.findMatchHighlightBorder", { light: null, dark: null, hcDark: activeContrastBorder, hcLight: activeContrastBorder }, localize("findMatchHighlightBorder", "Border color of the other search matches."));
registerColor("editor.findRangeHighlightBorder", { dark: null, light: null, hcDark: transparent(activeContrastBorder, 0.4), hcLight: transparent(activeContrastBorder, 0.4) }, localize("findRangeHighlightBorder", "Border color of the range limiting the search. The color must not be opaque so as not to hide underlying decorations."), true);
registerColor("editor.hoverHighlightBackground", { light: "#ADD6FF26", dark: "#264f7840", hcDark: "#ADD6FF26", hcLight: null }, localize("hoverHighlight", "Highlight below the word for which a hover is shown. The color must not be opaque so as not to hide underlying decorations."), true);
const editorHoverBackground = registerColor("editorHoverWidget.background", editorWidgetBackground, localize("hoverBackground", "Background color of the editor hover."));
registerColor("editorHoverWidget.foreground", editorWidgetForeground, localize("hoverForeground", "Foreground color of the editor hover."));
registerColor("editorHoverWidget.border", editorWidgetBorder, localize("hoverBorder", "Border color of the editor hover."));
registerColor("editorHoverWidget.statusBarBackground", { dark: lighten(editorHoverBackground, 0.2), light: darken(editorHoverBackground, 0.05), hcDark: editorWidgetBackground, hcLight: editorWidgetBackground }, localize("statusBarBackground", "Background color of the editor hover status bar."));
const editorInlayHintForeground = registerColor("editorInlayHint.foreground", { dark: "#969696", light: "#969696", hcDark: Color.white, hcLight: Color.black }, localize("editorInlayHintForeground", "Foreground color of inline hints"));
const editorInlayHintBackground = registerColor("editorInlayHint.background", { dark: transparent(badgeBackground, 0.1), light: transparent(badgeBackground, 0.1), hcDark: transparent(Color.white, 0.1), hcLight: transparent(badgeBackground, 0.1) }, localize("editorInlayHintBackground", "Background color of inline hints"));
registerColor("editorInlayHint.typeForeground", editorInlayHintForeground, localize("editorInlayHintForegroundTypes", "Foreground color of inline hints for types"));
registerColor("editorInlayHint.typeBackground", editorInlayHintBackground, localize("editorInlayHintBackgroundTypes", "Background color of inline hints for types"));
registerColor("editorInlayHint.parameterForeground", editorInlayHintForeground, localize("editorInlayHintForegroundParameter", "Foreground color of inline hints for parameters"));
registerColor("editorInlayHint.parameterBackground", editorInlayHintBackground, localize("editorInlayHintBackgroundParameter", "Background color of inline hints for parameters"));
const editorLightBulbForeground = registerColor("editorLightBulb.foreground", { dark: "#FFCC00", light: "#DDB100", hcDark: "#FFCC00", hcLight: "#007ACC" }, localize("editorLightBulbForeground", "The color used for the lightbulb actions icon."));
registerColor("editorLightBulbAutoFix.foreground", { dark: "#75BEFF", light: "#007ACC", hcDark: "#75BEFF", hcLight: "#007ACC" }, localize("editorLightBulbAutoFixForeground", "The color used for the lightbulb auto fix actions icon."));
registerColor("editorLightBulbAi.foreground", editorLightBulbForeground, localize("editorLightBulbAiForeground", "The color used for the lightbulb AI icon."));
registerColor("editor.snippetTabstopHighlightBackground", { dark: new Color(new RGBA(124, 124, 124, 0.3)), light: new Color(new RGBA(10, 50, 100, 0.2)), hcDark: new Color(new RGBA(124, 124, 124, 0.3)), hcLight: new Color(new RGBA(10, 50, 100, 0.2)) }, localize("snippetTabstopHighlightBackground", "Highlight background color of a snippet tabstop."));
registerColor("editor.snippetTabstopHighlightBorder", null, localize("snippetTabstopHighlightBorder", "Highlight border color of a snippet tabstop."));
registerColor("editor.snippetFinalTabstopHighlightBackground", null, localize("snippetFinalTabstopHighlightBackground", "Highlight background color of the final tabstop of a snippet."));
registerColor("editor.snippetFinalTabstopHighlightBorder", { dark: "#525252", light: new Color(new RGBA(10, 50, 100, 0.5)), hcDark: "#525252", hcLight: "#292929" }, localize("snippetFinalTabstopHighlightBorder", "Highlight border color of the final tabstop of a snippet."));
const defaultInsertColor = new Color(new RGBA(155, 185, 85, 0.2));
const defaultRemoveColor = new Color(new RGBA(255, 0, 0, 0.2));
registerColor("diffEditor.insertedTextBackground", { dark: "#9ccc2c33", light: "#9ccc2c40", hcDark: null, hcLight: null }, localize("diffEditorInserted", "Background color for text that got inserted. The color must not be opaque so as not to hide underlying decorations."), true);
registerColor("diffEditor.removedTextBackground", { dark: "#ff000033", light: "#ff000033", hcDark: null, hcLight: null }, localize("diffEditorRemoved", "Background color for text that got removed. The color must not be opaque so as not to hide underlying decorations."), true);
registerColor("diffEditor.insertedLineBackground", { dark: defaultInsertColor, light: defaultInsertColor, hcDark: null, hcLight: null }, localize("diffEditorInsertedLines", "Background color for lines that got inserted. The color must not be opaque so as not to hide underlying decorations."), true);
registerColor("diffEditor.removedLineBackground", { dark: defaultRemoveColor, light: defaultRemoveColor, hcDark: null, hcLight: null }, localize("diffEditorRemovedLines", "Background color for lines that got removed. The color must not be opaque so as not to hide underlying decorations."), true);
registerColor("diffEditorGutter.insertedLineBackground", null, localize("diffEditorInsertedLineGutter", "Background color for the margin where lines got inserted."));
registerColor("diffEditorGutter.removedLineBackground", null, localize("diffEditorRemovedLineGutter", "Background color for the margin where lines got removed."));
registerColor("diffEditorOverview.insertedForeground", null, localize("diffEditorOverviewInserted", "Diff overview ruler foreground for inserted content."));
registerColor("diffEditorOverview.removedForeground", null, localize("diffEditorOverviewRemoved", "Diff overview ruler foreground for removed content."));
registerColor("diffEditor.insertedTextBorder", { dark: null, light: null, hcDark: "#33ff2eff", hcLight: "#374E06" }, localize("diffEditorInsertedOutline", "Outline color for the text that got inserted."));
registerColor("diffEditor.removedTextBorder", { dark: null, light: null, hcDark: "#FF008F", hcLight: "#AD0707" }, localize("diffEditorRemovedOutline", "Outline color for text that got removed."));
registerColor("diffEditor.border", { dark: null, light: null, hcDark: contrastBorder, hcLight: contrastBorder }, localize("diffEditorBorder", "Border color between the two text editors."));
registerColor("diffEditor.diagonalFill", { dark: "#cccccc33", light: "#22222233", hcDark: null, hcLight: null }, localize("diffDiagonalFill", "Color of the diff editor's diagonal fill. The diagonal fill is used in side-by-side diff views."));
registerColor("diffEditor.unchangedRegionBackground", "sideBar.background", localize("diffEditor.unchangedRegionBackground", "The background color of unchanged blocks in the diff editor."));
registerColor("diffEditor.unchangedRegionForeground", "foreground", localize("diffEditor.unchangedRegionForeground", "The foreground color of unchanged blocks in the diff editor."));
registerColor("diffEditor.unchangedCodeBackground", { dark: "#74747429", light: "#b8b8b829", hcDark: null, hcLight: null }, localize("diffEditor.unchangedCodeBackground", "The background color of unchanged code in the diff editor."));
const widgetShadow = registerColor("widget.shadow", { dark: transparent(Color.black, 0.36), light: transparent(Color.black, 0.16), hcDark: null, hcLight: null }, localize("widgetShadow", "Shadow color of widgets such as find/replace inside the editor."));
registerColor("widget.border", { dark: null, light: null, hcDark: contrastBorder, hcLight: contrastBorder }, localize("widgetBorder", "Border color of widgets such as find/replace inside the editor."));
const toolbarHoverBackground = registerColor("toolbar.hoverBackground", { dark: "#5a5d5e50", light: "#b8b8b850", hcDark: null, hcLight: null }, localize("toolbarHoverBackground", "Toolbar background when hovering over actions using the mouse"));
registerColor("toolbar.hoverOutline", { dark: null, light: null, hcDark: activeContrastBorder, hcLight: activeContrastBorder }, localize("toolbarHoverOutline", "Toolbar outline when hovering over actions using the mouse"));
registerColor("toolbar.activeBackground", { dark: lighten(toolbarHoverBackground, 0.1), light: darken(toolbarHoverBackground, 0.1), hcDark: null, hcLight: null }, localize("toolbarActiveBackground", "Toolbar background when holding the mouse over actions"));
registerColor("breadcrumb.foreground", transparent(foreground, 0.8), localize("breadcrumbsFocusForeground", "Color of focused breadcrumb items."));
registerColor("breadcrumb.background", editorBackground, localize("breadcrumbsBackground", "Background color of breadcrumb items."));
registerColor("breadcrumb.focusForeground", { light: darken(foreground, 0.2), dark: lighten(foreground, 0.1), hcDark: lighten(foreground, 0.1), hcLight: lighten(foreground, 0.1) }, localize("breadcrumbsFocusForeground", "Color of focused breadcrumb items."));
registerColor("breadcrumb.activeSelectionForeground", { light: darken(foreground, 0.2), dark: lighten(foreground, 0.1), hcDark: lighten(foreground, 0.1), hcLight: lighten(foreground, 0.1) }, localize("breadcrumbsSelectedForeground", "Color of selected breadcrumb items."));
registerColor("breadcrumbPicker.background", editorWidgetBackground, localize("breadcrumbsSelectedBackground", "Background color of breadcrumb item picker."));
const headerTransparency = 0.5;
const currentBaseColor = Color.fromHex("#40C8AE").transparent(headerTransparency);
const incomingBaseColor = Color.fromHex("#40A6FF").transparent(headerTransparency);
const commonBaseColor = Color.fromHex("#606060").transparent(0.4);
const contentTransparency = 0.4;
const rulerTransparency = 1;
const mergeCurrentHeaderBackground = registerColor("merge.currentHeaderBackground", { dark: currentBaseColor, light: currentBaseColor, hcDark: null, hcLight: null }, localize("mergeCurrentHeaderBackground", "Current header background in inline merge-conflicts. The color must not be opaque so as not to hide underlying decorations."), true);
registerColor("merge.currentContentBackground", transparent(mergeCurrentHeaderBackground, contentTransparency), localize("mergeCurrentContentBackground", "Current content background in inline merge-conflicts. The color must not be opaque so as not to hide underlying decorations."), true);
const mergeIncomingHeaderBackground = registerColor("merge.incomingHeaderBackground", { dark: incomingBaseColor, light: incomingBaseColor, hcDark: null, hcLight: null }, localize("mergeIncomingHeaderBackground", "Incoming header background in inline merge-conflicts. The color must not be opaque so as not to hide underlying decorations."), true);
registerColor("merge.incomingContentBackground", transparent(mergeIncomingHeaderBackground, contentTransparency), localize("mergeIncomingContentBackground", "Incoming content background in inline merge-conflicts. The color must not be opaque so as not to hide underlying decorations."), true);
const mergeCommonHeaderBackground = registerColor("merge.commonHeaderBackground", { dark: commonBaseColor, light: commonBaseColor, hcDark: null, hcLight: null }, localize("mergeCommonHeaderBackground", "Common ancestor header background in inline merge-conflicts. The color must not be opaque so as not to hide underlying decorations."), true);
registerColor("merge.commonContentBackground", transparent(mergeCommonHeaderBackground, contentTransparency), localize("mergeCommonContentBackground", "Common ancestor content background in inline merge-conflicts. The color must not be opaque so as not to hide underlying decorations."), true);
const mergeBorder = registerColor("merge.border", { dark: null, light: null, hcDark: "#C3DF6F", hcLight: "#007ACC" }, localize("mergeBorder", "Border color on headers and the splitter in inline merge-conflicts."));
registerColor("editorOverviewRuler.currentContentForeground", { dark: transparent(mergeCurrentHeaderBackground, rulerTransparency), light: transparent(mergeCurrentHeaderBackground, rulerTransparency), hcDark: mergeBorder, hcLight: mergeBorder }, localize("overviewRulerCurrentContentForeground", "Current overview ruler foreground for inline merge-conflicts."));
registerColor("editorOverviewRuler.incomingContentForeground", { dark: transparent(mergeIncomingHeaderBackground, rulerTransparency), light: transparent(mergeIncomingHeaderBackground, rulerTransparency), hcDark: mergeBorder, hcLight: mergeBorder }, localize("overviewRulerIncomingContentForeground", "Incoming overview ruler foreground for inline merge-conflicts."));
registerColor("editorOverviewRuler.commonContentForeground", { dark: transparent(mergeCommonHeaderBackground, rulerTransparency), light: transparent(mergeCommonHeaderBackground, rulerTransparency), hcDark: mergeBorder, hcLight: mergeBorder }, localize("overviewRulerCommonContentForeground", "Common ancestor overview ruler foreground for inline merge-conflicts."));
registerColor("editorOverviewRuler.findMatchForeground", { dark: "#d186167e", light: "#d186167e", hcDark: "#AB5A00", hcLight: "#AB5A00" }, localize("overviewRulerFindMatchForeground", "Overview ruler marker color for find matches. The color must not be opaque so as not to hide underlying decorations."), true);
registerColor("editorOverviewRuler.selectionHighlightForeground", "#A0A0A0CC", localize("overviewRulerSelectionHighlightForeground", "Overview ruler marker color for selection highlights. The color must not be opaque so as not to hide underlying decorations."), true);
registerColor("problemsErrorIcon.foreground", editorErrorForeground, localize("problemsErrorIconForeground", "The color used for the problems error icon."));
registerColor("problemsWarningIcon.foreground", editorWarningForeground, localize("problemsWarningIconForeground", "The color used for the problems warning icon."));
registerColor("problemsInfoIcon.foreground", editorInfoForeground, localize("problemsInfoIconForeground", "The color used for the problems info icon."));
const minimapFindMatch = registerColor("minimap.findMatchHighlight", { light: "#d18616", dark: "#d18616", hcDark: "#AB5A00", hcLight: "#0F4A85" }, localize("minimapFindMatchHighlight", "Minimap marker color for find matches."), true);
registerColor("minimap.selectionOccurrenceHighlight", { light: "#c9c9c9", dark: "#676767", hcDark: "#ffffff", hcLight: "#0F4A85" }, localize("minimapSelectionOccurrenceHighlight", "Minimap marker color for repeating editor selections."), true);
registerColor("minimap.selectionHighlight", { light: "#ADD6FF", dark: "#264F78", hcDark: "#ffffff", hcLight: "#0F4A85" }, localize("minimapSelectionHighlight", "Minimap marker color for the editor selection."), true);
registerColor("minimap.infoHighlight", { dark: editorInfoForeground, light: editorInfoForeground, hcDark: editorInfoBorder, hcLight: editorInfoBorder }, localize("minimapInfo", "Minimap marker color for infos."));
registerColor("minimap.warningHighlight", { dark: editorWarningForeground, light: editorWarningForeground, hcDark: editorWarningBorder, hcLight: editorWarningBorder }, localize("overviewRuleWarning", "Minimap marker color for warnings."));
registerColor("minimap.errorHighlight", { dark: new Color(new RGBA(255, 18, 18, 0.7)), light: new Color(new RGBA(255, 18, 18, 0.7)), hcDark: new Color(new RGBA(255, 50, 50, 1)), hcLight: "#B5200D" }, localize("minimapError", "Minimap marker color for errors."));
registerColor("minimap.background", null, localize("minimapBackground", "Minimap background color."));
registerColor("minimap.foregroundOpacity", Color.fromHex("#000f"), localize("minimapForegroundOpacity", 'Opacity of foreground elements rendered in the minimap. For example, "#000000c0" will render the elements with 75% opacity.'));
registerColor("minimapSlider.background", transparent(scrollbarSliderBackground, 0.5), localize("minimapSliderBackground", "Minimap slider background color."));
registerColor("minimapSlider.hoverBackground", transparent(scrollbarSliderHoverBackground, 0.5), localize("minimapSliderHoverBackground", "Minimap slider background color when hovering."));
registerColor("minimapSlider.activeBackground", transparent(scrollbarSliderActiveBackground, 0.5), localize("minimapSliderActiveBackground", "Minimap slider background color when clicked on."));
registerColor("charts.foreground", foreground, localize("chartsForeground", "The foreground color used in charts."));
registerColor("charts.lines", transparent(foreground, 0.5), localize("chartsLines", "The color used for horizontal lines in charts."));
registerColor("charts.red", editorErrorForeground, localize("chartsRed", "The red color used in chart visualizations."));
registerColor("charts.blue", editorInfoForeground, localize("chartsBlue", "The blue color used in chart visualizations."));
registerColor("charts.yellow", editorWarningForeground, localize("chartsYellow", "The yellow color used in chart visualizations."));
registerColor("charts.orange", minimapFindMatch, localize("chartsOrange", "The orange color used in chart visualizations."));
registerColor("charts.green", { dark: "#89D185", light: "#388A34", hcDark: "#89D185", hcLight: "#374e06" }, localize("chartsGreen", "The green color used in chart visualizations."));
registerColor("charts.purple", { dark: "#B180D7", light: "#652D90", hcDark: "#B180D7", hcLight: "#652D90" }, localize("chartsPurple", "The purple color used in chart visualizations."));
registerColor("input.background", { dark: "#3C3C3C", light: Color.white, hcDark: Color.black, hcLight: Color.white }, localize("inputBoxBackground", "Input box background."));
registerColor("input.foreground", foreground, localize("inputBoxForeground", "Input box foreground."));
registerColor("input.border", { dark: null, light: null, hcDark: contrastBorder, hcLight: contrastBorder }, localize("inputBoxBorder", "Input box border."));
const inputActiveOptionBorder = registerColor("inputOption.activeBorder", { dark: "#007ACC", light: "#007ACC", hcDark: contrastBorder, hcLight: contrastBorder }, localize("inputBoxActiveOptionBorder", "Border color of activated options in input fields."));
const inputActiveOptionHoverBackground = registerColor("inputOption.hoverBackground", { dark: "#5a5d5e80", light: "#b8b8b850", hcDark: null, hcLight: null }, localize("inputOption.hoverBackground", "Background color of activated options in input fields."));
const inputActiveOptionBackground = registerColor("inputOption.activeBackground", { dark: transparent(focusBorder, 0.4), light: transparent(focusBorder, 0.2), hcDark: Color.transparent, hcLight: Color.transparent }, localize("inputOption.activeBackground", "Background hover color of options in input fields."));
const inputActiveOptionForeground = registerColor("inputOption.activeForeground", { dark: Color.white, light: Color.black, hcDark: foreground, hcLight: foreground }, localize("inputOption.activeForeground", "Foreground color of activated options in input fields."));
registerColor("input.placeholderForeground", { light: transparent(foreground, 0.5), dark: transparent(foreground, 0.5), hcDark: transparent(foreground, 0.7), hcLight: transparent(foreground, 0.7) }, localize("inputPlaceholderForeground", "Input box foreground color for placeholder text."));
registerColor("inputValidation.infoBackground", { dark: "#063B49", light: "#D6ECF2", hcDark: Color.black, hcLight: Color.white }, localize("inputValidationInfoBackground", "Input validation background color for information severity."));
registerColor("inputValidation.infoForeground", { dark: null, light: null, hcDark: null, hcLight: foreground }, localize("inputValidationInfoForeground", "Input validation foreground color for information severity."));
registerColor("inputValidation.infoBorder", { dark: "#007acc", light: "#007acc", hcDark: contrastBorder, hcLight: contrastBorder }, localize("inputValidationInfoBorder", "Input validation border color for information severity."));
registerColor("inputValidation.warningBackground", { dark: "#352A05", light: "#F6F5D2", hcDark: Color.black, hcLight: Color.white }, localize("inputValidationWarningBackground", "Input validation background color for warning severity."));
registerColor("inputValidation.warningForeground", { dark: null, light: null, hcDark: null, hcLight: foreground }, localize("inputValidationWarningForeground", "Input validation foreground color for warning severity."));
registerColor("inputValidation.warningBorder", { dark: "#B89500", light: "#B89500", hcDark: contrastBorder, hcLight: contrastBorder }, localize("inputValidationWarningBorder", "Input validation border color for warning severity."));
registerColor("inputValidation.errorBackground", { dark: "#5A1D1D", light: "#F2DEDE", hcDark: Color.black, hcLight: Color.white }, localize("inputValidationErrorBackground", "Input validation background color for error severity."));
registerColor("inputValidation.errorForeground", { dark: null, light: null, hcDark: null, hcLight: foreground }, localize("inputValidationErrorForeground", "Input validation foreground color for error severity."));
registerColor("inputValidation.errorBorder", { dark: "#BE1100", light: "#BE1100", hcDark: contrastBorder, hcLight: contrastBorder }, localize("inputValidationErrorBorder", "Input validation border color for error severity."));
const selectBackground = registerColor("dropdown.background", { dark: "#3C3C3C", light: Color.white, hcDark: Color.black, hcLight: Color.white }, localize("dropdownBackground", "Dropdown background."));
registerColor("dropdown.listBackground", { dark: null, light: null, hcDark: Color.black, hcLight: Color.white }, localize("dropdownListBackground", "Dropdown list background."));
const selectForeground = registerColor("dropdown.foreground", { dark: "#F0F0F0", light: foreground, hcDark: Color.white, hcLight: foreground }, localize("dropdownForeground", "Dropdown foreground."));
const selectBorder = registerColor("dropdown.border", { dark: selectBackground, light: "#CECECE", hcDark: contrastBorder, hcLight: contrastBorder }, localize("dropdownBorder", "Dropdown border."));
const buttonForeground = registerColor("button.foreground", Color.white, localize("buttonForeground", "Button foreground color."));
registerColor("button.separator", transparent(buttonForeground, 0.4), localize("buttonSeparator", "Button separator color."));
const buttonBackground = registerColor("button.background", { dark: "#0E639C", light: "#007ACC", hcDark: null, hcLight: "#0F4A85" }, localize("buttonBackground", "Button background color."));
registerColor("button.hoverBackground", { dark: lighten(buttonBackground, 0.2), light: darken(buttonBackground, 0.2), hcDark: buttonBackground, hcLight: buttonBackground }, localize("buttonHoverBackground", "Button background color when hovering."));
registerColor("button.border", contrastBorder, localize("buttonBorder", "Button border color."));
registerColor("button.secondaryForeground", { dark: Color.white, light: Color.white, hcDark: Color.white, hcLight: foreground }, localize("buttonSecondaryForeground", "Secondary button foreground color."));
const buttonSecondaryBackground = registerColor("button.secondaryBackground", { dark: "#3A3D41", light: "#5F6A79", hcDark: null, hcLight: Color.white }, localize("buttonSecondaryBackground", "Secondary button background color."));
registerColor("button.secondaryHoverBackground", { dark: lighten(buttonSecondaryBackground, 0.2), light: darken(buttonSecondaryBackground, 0.2), hcDark: null, hcLight: null }, localize("buttonSecondaryHoverBackground", "Secondary button background color when hovering."));
const radioActiveForeground = registerColor("radio.activeForeground", inputActiveOptionForeground, localize("radioActiveForeground", "Foreground color of active radio option."));
registerColor("radio.activeBackground", inputActiveOptionBackground, localize("radioBackground", "Background color of active radio option."));
registerColor("radio.activeBorder", inputActiveOptionBorder, localize("radioActiveBorder", "Border color of the active radio option."));
registerColor("radio.inactiveForeground", null, localize("radioInactiveForeground", "Foreground color of inactive radio option."));
registerColor("radio.inactiveBackground", null, localize("radioInactiveBackground", "Background color of inactive radio option."));
registerColor("radio.inactiveBorder", { light: transparent(radioActiveForeground, 0.2), dark: transparent(radioActiveForeground, 0.2), hcDark: transparent(radioActiveForeground, 0.4), hcLight: transparent(radioActiveForeground, 0.2) }, localize("radioInactiveBorder", "Border color of the inactive radio option."));
registerColor("radio.inactiveHoverBackground", inputActiveOptionHoverBackground, localize("radioHoverBackground", "Background color of inactive active radio option when hovering."));
registerColor("checkbox.background", selectBackground, localize("checkbox.background", "Background color of checkbox widget."));
registerColor("checkbox.selectBackground", editorWidgetBackground, localize("checkbox.select.background", "Background color of checkbox widget when the element it's in is selected."));
registerColor("checkbox.foreground", selectForeground, localize("checkbox.foreground", "Foreground color of checkbox widget."));
registerColor("checkbox.border", selectBorder, localize("checkbox.border", "Border color of checkbox widget."));
registerColor("checkbox.selectBorder", iconForeground, localize("checkbox.select.border", "Border color of checkbox widget when the element it's in is selected."));
registerColor("keybindingLabel.background", { dark: new Color(new RGBA(128, 128, 128, 0.17)), light: new Color(new RGBA(221, 221, 221, 0.4)), hcDark: Color.transparent, hcLight: Color.transparent }, localize("keybindingLabelBackground", "Keybinding label background color. The keybinding label is used to represent a keyboard shortcut."));
registerColor("keybindingLabel.foreground", { dark: Color.fromHex("#CCCCCC"), light: Color.fromHex("#555555"), hcDark: Color.white, hcLight: foreground }, localize("keybindingLabelForeground", "Keybinding label foreground color. The keybinding label is used to represent a keyboard shortcut."));
registerColor("keybindingLabel.border", { dark: new Color(new RGBA(51, 51, 51, 0.6)), light: new Color(new RGBA(204, 204, 204, 0.4)), hcDark: new Color(new RGBA(111, 195, 223)), hcLight: contrastBorder }, localize("keybindingLabelBorder", "Keybinding label border color. The keybinding label is used to represent a keyboard shortcut."));
registerColor("keybindingLabel.bottomBorder", { dark: new Color(new RGBA(68, 68, 68, 0.6)), light: new Color(new RGBA(187, 187, 187, 0.4)), hcDark: new Color(new RGBA(111, 195, 223)), hcLight: foreground }, localize("keybindingLabelBottomBorder", "Keybinding label border bottom color. The keybinding label is used to represent a keyboard shortcut."));
registerColor("list.focusBackground", null, localize("listFocusBackground", "List/Tree background color for the focused item when the list/tree is active. An active list/tree has keyboard focus, an inactive does not."));
registerColor("list.focusForeground", null, localize("listFocusForeground", "List/Tree foreground color for the focused item when the list/tree is active. An active list/tree has keyboard focus, an inactive does not."));
registerColor("list.focusOutline", { dark: focusBorder, light: focusBorder, hcDark: activeContrastBorder, hcLight: activeContrastBorder }, localize("listFocusOutline", "List/Tree outline color for the focused item when the list/tree is active. An active list/tree has keyboard focus, an inactive does not."));
registerColor("list.focusAndSelectionOutline", null, localize("listFocusAndSelectionOutline", "List/Tree outline color for the focused item when the list/tree is active and selected. An active list/tree has keyboard focus, an inactive does not."));
const listActiveSelectionBackground = registerColor("list.activeSelectionBackground", { dark: "#04395E", light: "#0060C0", hcDark: null, hcLight: Color.fromHex("#0F4A85").transparent(0.1) }, localize("listActiveSelectionBackground", "List/Tree background color for the selected item when the list/tree is active. An active list/tree has keyboard focus, an inactive does not."));
const listActiveSelectionForeground = registerColor("list.activeSelectionForeground", { dark: Color.white, light: Color.white, hcDark: null, hcLight: null }, localize("listActiveSelectionForeground", "List/Tree foreground color for the selected item when the list/tree is active. An active list/tree has keyboard focus, an inactive does not."));
const listActiveSelectionIconForeground = registerColor("list.activeSelectionIconForeground", null, localize("listActiveSelectionIconForeground", "List/Tree icon foreground color for the selected item when the list/tree is active. An active list/tree has keyboard focus, an inactive does not."));
registerColor("list.inactiveSelectionBackground", { dark: "#37373D", light: "#E4E6F1", hcDark: null, hcLight: Color.fromHex("#0F4A85").transparent(0.1) }, localize("listInactiveSelectionBackground", "List/Tree background color for the selected item when the list/tree is inactive. An active list/tree has keyboard focus, an inactive does not."));
registerColor("list.inactiveSelectionForeground", null, localize("listInactiveSelectionForeground", "List/Tree foreground color for the selected item when the list/tree is inactive. An active list/tree has keyboard focus, an inactive does not."));
registerColor("list.inactiveSelectionIconForeground", null, localize("listInactiveSelectionIconForeground", "List/Tree icon foreground color for the selected item when the list/tree is inactive. An active list/tree has keyboard focus, an inactive does not."));
registerColor("list.inactiveFocusBackground", null, localize("listInactiveFocusBackground", "List/Tree background color for the focused item when the list/tree is inactive. An active list/tree has keyboard focus, an inactive does not."));
registerColor("list.inactiveFocusOutline", null, localize("listInactiveFocusOutline", "List/Tree outline color for the focused item when the list/tree is inactive. An active list/tree has keyboard focus, an inactive does not."));
registerColor("list.hoverBackground", { dark: "#2A2D2E", light: "#F0F0F0", hcDark: Color.white.transparent(0.1), hcLight: Color.fromHex("#0F4A85").transparent(0.1) }, localize("listHoverBackground", "List/Tree background when hovering over items using the mouse."));
registerColor("list.hoverForeground", null, localize("listHoverForeground", "List/Tree foreground when hovering over items using the mouse."));
registerColor("list.dropBackground", { dark: "#062F4A", light: "#D6EBFF", hcDark: null, hcLight: null }, localize("listDropBackground", "List/Tree drag and drop background when moving items over other items when using the mouse."));
registerColor("list.dropBetweenBackground", { dark: iconForeground, light: iconForeground, hcDark: null, hcLight: null }, localize("listDropBetweenBackground", "List/Tree drag and drop border color when moving items between items when using the mouse."));
const listHighlightForeground = registerColor("list.highlightForeground", { dark: "#2AAAFF", light: "#0066BF", hcDark: focusBorder, hcLight: focusBorder }, localize("highlight", "List/Tree foreground color of the match highlights when searching inside the list/tree."));
registerColor("list.focusHighlightForeground", { dark: listHighlightForeground, light: ifDefinedThenElse(listActiveSelectionBackground, listHighlightForeground, "#BBE7FF"), hcDark: listHighlightForeground, hcLight: listHighlightForeground }, localize("listFocusHighlightForeground", "List/Tree foreground color of the match highlights on actively focused items when searching inside the list/tree."));
registerColor("list.invalidItemForeground", { dark: "#B89500", light: "#B89500", hcDark: "#B89500", hcLight: "#B5200D" }, localize("invalidItemForeground", "List/Tree foreground color for invalid items, for example an unresolved root in explorer."));
registerColor("list.errorForeground", { dark: "#F88070", light: "#B01011", hcDark: null, hcLight: null }, localize("listErrorForeground", "Foreground color of list items containing errors."));
registerColor("list.warningForeground", { dark: "#CCA700", light: "#855F00", hcDark: null, hcLight: null }, localize("listWarningForeground", "Foreground color of list items containing warnings."));
registerColor("listFilterWidget.background", { light: darken(editorWidgetBackground, 0), dark: lighten(editorWidgetBackground, 0), hcDark: editorWidgetBackground, hcLight: editorWidgetBackground }, localize("listFilterWidgetBackground", "Background color of the type filter widget in lists and trees."));
registerColor("listFilterWidget.outline", { dark: Color.transparent, light: Color.transparent, hcDark: "#f38518", hcLight: "#007ACC" }, localize("listFilterWidgetOutline", "Outline color of the type filter widget in lists and trees."));
registerColor("listFilterWidget.noMatchesOutline", { dark: "#BE1100", light: "#BE1100", hcDark: contrastBorder, hcLight: contrastBorder }, localize("listFilterWidgetNoMatchesOutline", "Outline color of the type filter widget in lists and trees, when there are no matches."));
registerColor("listFilterWidget.shadow", widgetShadow, localize("listFilterWidgetShadow", "Shadow color of the type filter widget in lists and trees."));
registerColor("list.filterMatchBackground", { dark: editorFindMatchHighlight, light: editorFindMatchHighlight, hcDark: null, hcLight: null }, localize("listFilterMatchHighlight", "Background color of the filtered match."));
registerColor("list.filterMatchBorder", { dark: editorFindMatchHighlightBorder, light: editorFindMatchHighlightBorder, hcDark: contrastBorder, hcLight: activeContrastBorder }, localize("listFilterMatchHighlightBorder", "Border color of the filtered match."));
registerColor("list.deemphasizedForeground", { dark: "#8C8C8C", light: "#8E8E90", hcDark: "#A7A8A9", hcLight: "#666666" }, localize("listDeemphasizedForeground", "List/Tree foreground color for items that are deemphasized."));
const treeIndentGuidesStroke = registerColor("tree.indentGuidesStroke", { dark: "#585858", light: "#a9a9a9", hcDark: "#a9a9a9", hcLight: "#a5a5a5" }, localize("treeIndentGuidesStroke", "Tree stroke color for the indentation guides."));
registerColor("tree.inactiveIndentGuidesStroke", transparent(treeIndentGuidesStroke, 0.4), localize("treeInactiveIndentGuidesStroke", "Tree stroke color for the indentation guides that are not active."));
registerColor("tree.tableColumnsBorder", { dark: "#CCCCCC20", light: "#61616120", hcDark: null, hcLight: null }, localize("tableColumnsBorder", "Table border color between columns."));
registerColor("tree.tableOddRowsBackground", { dark: transparent(foreground, 0.04), light: transparent(foreground, 0.04), hcDark: null, hcLight: null }, localize("tableOddRowsBackgroundColor", "Background color for odd table rows."));
registerColor("editorActionList.background", editorWidgetBackground, localize("editorActionListBackground", "Action List background color."));
registerColor("editorActionList.foreground", editorWidgetForeground, localize("editorActionListForeground", "Action List foreground color."));
registerColor("editorActionList.focusForeground", listActiveSelectionForeground, localize("editorActionListFocusForeground", "Action List foreground color for the focused item."));
registerColor("editorActionList.focusBackground", listActiveSelectionBackground, localize("editorActionListFocusBackground", "Action List background color for the focused item."));
registerColor("menu.border", { dark: null, light: null, hcDark: contrastBorder, hcLight: contrastBorder }, localize("menuBorder", "Border color of menus."));
registerColor("menu.foreground", selectForeground, localize("menuForeground", "Foreground color of menu items."));
registerColor("menu.background", selectBackground, localize("menuBackground", "Background color of menu items."));
registerColor("menu.selectionForeground", listActiveSelectionForeground, localize("menuSelectionForeground", "Foreground color of the selected menu item in menus."));
registerColor("menu.selectionBackground", listActiveSelectionBackground, localize("menuSelectionBackground", "Background color of the selected menu item in menus."));
registerColor("menu.selectionBorder", { dark: null, light: null, hcDark: activeContrastBorder, hcLight: activeContrastBorder }, localize("menuSelectionBorder", "Border color of the selected menu item in menus."));
registerColor("menu.separatorBackground", { dark: "#606060", light: "#D4D4D4", hcDark: contrastBorder, hcLight: contrastBorder }, localize("menuSeparatorBackground", "Color of a separator menu item in menus."));
registerColor("quickInput.background", editorWidgetBackground, localize("pickerBackground", "Quick picker background color. The quick picker widget is the container for pickers like the command palette."));
registerColor("quickInput.foreground", editorWidgetForeground, localize("pickerForeground", "Quick picker foreground color. The quick picker widget is the container for pickers like the command palette."));
registerColor("quickInputTitle.background", { dark: new Color(new RGBA(255, 255, 255, 0.105)), light: new Color(new RGBA(0, 0, 0, 0.06)), hcDark: "#000000", hcLight: Color.white }, localize("pickerTitleBackground", "Quick picker title background color. The quick picker widget is the container for pickers like the command palette."));
registerColor("pickerGroup.foreground", { dark: "#3794FF", light: "#0066BF", hcDark: Color.white, hcLight: "#0F4A85" }, localize("pickerGroupForeground", "Quick picker color for grouping labels."));
registerColor("pickerGroup.border", { dark: "#3F3F46", light: "#CCCEDB", hcDark: Color.white, hcLight: "#0F4A85" }, localize("pickerGroupBorder", "Quick picker color for grouping borders."));
const _deprecatedQuickInputListFocusBackground = registerColor("quickInput.list.focusBackground", null, "", void 0, localize("quickInput.list.focusBackground deprecation", "Please use quickInputList.focusBackground instead"));
registerColor("quickInputList.focusForeground", listActiveSelectionForeground, localize("quickInput.listFocusForeground", "Quick picker foreground color for the focused item."));
registerColor("quickInputList.focusIconForeground", listActiveSelectionIconForeground, localize("quickInput.listFocusIconForeground", "Quick picker icon foreground color for the focused item."));
registerColor("quickInputList.focusBackground", { dark: oneOf(_deprecatedQuickInputListFocusBackground, listActiveSelectionBackground), light: oneOf(_deprecatedQuickInputListFocusBackground, listActiveSelectionBackground), hcDark: null, hcLight: null }, localize("quickInput.listFocusBackground", "Quick picker background color for the focused item."));
registerColor("search.resultsInfoForeground", { light: foreground, dark: transparent(foreground, 0.65), hcDark: foreground, hcLight: foreground }, localize("search.resultsInfoForeground", "Color of the text in the search viewlet's completion message."));
registerColor("searchEditor.findMatchBackground", { light: transparent(editorFindMatchHighlight, 0.66), dark: transparent(editorFindMatchHighlight, 0.66), hcDark: editorFindMatchHighlight, hcLight: editorFindMatchHighlight }, localize("searchEditor.queryMatch", "Color of the Search Editor query matches."));
registerColor("searchEditor.findMatchBorder", { light: transparent(editorFindMatchHighlightBorder, 0.66), dark: transparent(editorFindMatchHighlightBorder, 0.66), hcDark: editorFindMatchHighlightBorder, hcLight: editorFindMatchHighlightBorder }, localize("searchEditor.editorFindMatchBorder", "Border color of the Search Editor query matches."));
const Extensions = {
  IconContribution: "base.contributions.icons"
};
var IconContribution;
(function(IconContribution2) {
  function getDefinition(contribution, registry) {
    let definition = contribution.defaults;
    while (ThemeIcon.isThemeIcon(definition)) {
      const c = iconRegistry.getIcon(definition.id);
      if (!c) {
        return void 0;
      }
      definition = c.defaults;
    }
    return definition;
  }
  IconContribution2.getDefinition = getDefinition;
})(IconContribution || (IconContribution = {}));
var IconFontDefinition;
(function(IconFontDefinition2) {
  function toJSONObject(iconFont) {
    return {
      weight: iconFont.weight,
      style: iconFont.style,
      src: iconFont.src.map((s) => ({ format: s.format, location: s.location.toString() }))
    };
  }
  IconFontDefinition2.toJSONObject = toJSONObject;
  function fromJSONObject(json) {
    const stringOrUndef = (s) => isString(s) ? s : void 0;
    if (json && Array.isArray(json.src) && json.src.every((s) => isString(s.format) && isString(s.location))) {
      return {
        weight: stringOrUndef(json.weight),
        style: stringOrUndef(json.style),
        src: json.src.map((s) => ({ format: s.format, location: URI.parse(s.location) }))
      };
    }
    return void 0;
  }
  IconFontDefinition2.fromJSONObject = fromJSONObject;
})(IconFontDefinition || (IconFontDefinition = {}));
class IconRegistry {
  constructor() {
    this._onDidChange = new Emitter();
    this.onDidChange = this._onDidChange.event;
    this.iconSchema = {
      definitions: {
        icons: {
          type: "object",
          properties: {
            fontId: { type: "string", description: localize("iconDefinition.fontId", "The id of the font to use. If not set, the font that is defined first is used.") },
            fontCharacter: { type: "string", description: localize("iconDefinition.fontCharacter", "The font character associated with the icon definition.") }
          },
          additionalProperties: false,
          defaultSnippets: [{ body: { fontCharacter: "\\\\e030" } }]
        }
      },
      type: "object",
      properties: {}
    };
    this.iconReferenceSchema = { type: "string", pattern: `^${ThemeIcon.iconNameExpression}$`, enum: [], enumDescriptions: [] };
    this.iconsById = {};
    this.iconFontsById = {};
  }
  registerIcon(id, defaults, description, deprecationMessage) {
    const existing = this.iconsById[id];
    if (existing) {
      if (description && !existing.description) {
        existing.description = description;
        this.iconSchema.properties[id].markdownDescription = `${description} $(${id})`;
        const enumIndex = this.iconReferenceSchema.enum.indexOf(id);
        if (enumIndex !== -1) {
          this.iconReferenceSchema.enumDescriptions[enumIndex] = description;
        }
        this._onDidChange.fire();
      }
      return existing;
    }
    const iconContribution = { id, description, defaults, deprecationMessage };
    this.iconsById[id] = iconContribution;
    const propertySchema = { $ref: "#/definitions/icons" };
    if (deprecationMessage) {
      propertySchema.deprecationMessage = deprecationMessage;
    }
    if (description) {
      propertySchema.markdownDescription = `${description}: $(${id})`;
    }
    this.iconSchema.properties[id] = propertySchema;
    this.iconReferenceSchema.enum.push(id);
    this.iconReferenceSchema.enumDescriptions.push(description || "");
    this._onDidChange.fire();
    return { id };
  }
  getIcons() {
    return Object.keys(this.iconsById).map((id) => this.iconsById[id]);
  }
  getIcon(id) {
    return this.iconsById[id];
  }
  getIconSchema() {
    return this.iconSchema;
  }
  toString() {
    const sorter = (i1, i2) => {
      return i1.id.localeCompare(i2.id);
    };
    const classNames = (i) => {
      while (ThemeIcon.isThemeIcon(i.defaults)) {
        i = this.iconsById[i.defaults.id];
      }
      return `codicon codicon-${i ? i.id : ""}`;
    };
    const reference = [];
    reference.push(`| preview     | identifier                        | default codicon ID                | description`);
    reference.push(`| ----------- | --------------------------------- | --------------------------------- | --------------------------------- |`);
    const contributions = Object.keys(this.iconsById).map((key) => this.iconsById[key]);
    for (const i of contributions.filter((i2) => !!i2.description).sort(sorter)) {
      reference.push(`|<i class="${classNames(i)}"></i>|${i.id}|${ThemeIcon.isThemeIcon(i.defaults) ? i.defaults.id : i.id}|${i.description || ""}|`);
    }
    reference.push(`| preview     | identifier                        `);
    reference.push(`| ----------- | --------------------------------- |`);
    for (const i of contributions.filter((i2) => !ThemeIcon.isThemeIcon(i2.defaults)).sort(sorter)) {
      reference.push(`|<i class="${classNames(i)}"></i>|${i.id}|`);
    }
    return reference.join("\n");
  }
}
const iconRegistry = new IconRegistry();
Registry.add(Extensions.IconContribution, iconRegistry);
function registerIcon(id, defaults, description, deprecationMessage) {
  return iconRegistry.registerIcon(id, defaults, description, deprecationMessage);
}
function initialize() {
  const codiconFontCharacters = getCodiconFontCharacters();
  for (const icon in codiconFontCharacters) {
    const fontCharacter = "\\" + codiconFontCharacters[icon].toString(16);
    iconRegistry.registerIcon(icon, { fontCharacter });
  }
}
initialize();
const iconsSchemaId = "vscode://schemas/icons";
const schemaRegistry = Registry.as(Extensions$2.JSONContribution);
schemaRegistry.registerSchema(iconsSchemaId, iconRegistry.getIconSchema());
const delayer = new RunOnceScheduler(() => schemaRegistry.notifySchemaChanged(iconsSchemaId), 200);
iconRegistry.onDidChange(() => {
  if (!delayer.isScheduled()) {
    delayer.schedule();
  }
});
registerIcon("widget-close", Codicon.close, localize("widgetClose", "Icon for the close action in widgets."));
registerIcon("goto-previous-location", Codicon.arrowUp, localize("previousChangeIcon", "Icon for goto previous editor location."));
registerIcon("goto-next-location", Codicon.arrowDown, localize("nextChangeIcon", "Icon for goto next editor location."));
ThemeIcon.modify(Codicon.sync, "spin");
ThemeIcon.modify(Codicon.loading, "spin");
const $ = $$1;
class ColorPickerHeader extends Disposable {
  constructor(container, model, themeService, showingStandaloneColorPicker = false) {
    super();
    this.model = model;
    this.showingStandaloneColorPicker = showingStandaloneColorPicker;
    this._closeButton = null;
    this._domNode = $(".colorpicker-header");
    append(container, this._domNode);
    this._pickedColorNode = append(this._domNode, $(".picked-color"));
    append(this._pickedColorNode, $("span.codicon.codicon-color-mode"));
    this._pickedColorPresentation = append(this._pickedColorNode, document.createElement("span"));
    this._pickedColorPresentation.classList.add("picked-color-presentation");
    const tooltip = localize("clickToToggleColorOptions", "Click to toggle color options (rgb/hsl/hex)");
    this._pickedColorNode.setAttribute("title", tooltip);
    this._originalColorNode = append(this._domNode, $(".original-color"));
    this._originalColorNode.style.backgroundColor = Color.Format.CSS.format(this.model.originalColor) || "";
    this.backgroundColor = themeService.getColorTheme().getColor(editorHoverBackground) || Color.white;
    this._register(themeService.onDidColorThemeChange((theme) => {
      this.backgroundColor = theme.getColor(editorHoverBackground) || Color.white;
    }));
    this._register(addDisposableListener(this._pickedColorNode, EventType$1.CLICK, () => this.model.selectNextColorPresentation()));
    this._register(addDisposableListener(this._originalColorNode, EventType$1.CLICK, () => {
      this.model.color = this.model.originalColor;
      this.model.flushColor();
    }));
    this._register(model.onDidChangeColor(this.onDidChangeColor, this));
    this._register(model.onDidChangePresentation(this.onDidChangePresentation, this));
    this._pickedColorNode.style.backgroundColor = Color.Format.CSS.format(model.color) || "";
    this._pickedColorNode.classList.toggle("light", model.color.rgba.a < 0.5 ? this.backgroundColor.isLighter() : model.color.isLighter());
    this.onDidChangeColor(this.model.color);
    if (this.showingStandaloneColorPicker) {
      this._domNode.classList.add("standalone-colorpicker");
      this._closeButton = this._register(new CloseButton(this._domNode));
    }
  }
  get closeButton() {
    return this._closeButton;
  }
  get pickedColorNode() {
    return this._pickedColorNode;
  }
  get originalColorNode() {
    return this._originalColorNode;
  }
  onDidChangeColor(color) {
    this._pickedColorNode.style.backgroundColor = Color.Format.CSS.format(color) || "";
    this._pickedColorNode.classList.toggle("light", color.rgba.a < 0.5 ? this.backgroundColor.isLighter() : color.isLighter());
    this.onDidChangePresentation();
  }
  onDidChangePresentation() {
    this._pickedColorPresentation.textContent = this.model.presentation ? this.model.presentation.label : "";
  }
}
class CloseButton extends Disposable {
  constructor(container) {
    super();
    this._onClicked = this._register(new Emitter());
    this.onClicked = this._onClicked.event;
    this._button = document.createElement("div");
    this._button.classList.add("close-button");
    append(container, this._button);
    const innerDiv = document.createElement("div");
    innerDiv.classList.add("close-button-inner-div");
    append(this._button, innerDiv);
    const closeButton = append(innerDiv, $(".button" + ThemeIcon.asCSSSelector(registerIcon("color-picker-close", Codicon.close, localize("closeIcon", "Icon to close the color picker")))));
    closeButton.classList.add("close-icon");
    this._register(addDisposableListener(this._button, EventType$1.CLICK, () => {
      this._onClicked.fire();
    }));
  }
}
class ColorPickerBody extends Disposable {
  constructor(container, model, pixelRatio, isStandaloneColorPicker = false) {
    super();
    this.model = model;
    this.pixelRatio = pixelRatio;
    this._insertButton = null;
    this._domNode = $(".colorpicker-body");
    append(container, this._domNode);
    this._saturationBox = new SaturationBox(this._domNode, this.model, this.pixelRatio);
    this._register(this._saturationBox);
    this._register(this._saturationBox.onDidChange(this.onDidSaturationValueChange, this));
    this._register(this._saturationBox.onColorFlushed(this.flushColor, this));
    this._opacityStrip = new OpacityStrip(this._domNode, this.model, isStandaloneColorPicker);
    this._register(this._opacityStrip);
    this._register(this._opacityStrip.onDidChange(this.onDidOpacityChange, this));
    this._register(this._opacityStrip.onColorFlushed(this.flushColor, this));
    this._hueStrip = new HueStrip(this._domNode, this.model, isStandaloneColorPicker);
    this._register(this._hueStrip);
    this._register(this._hueStrip.onDidChange(this.onDidHueChange, this));
    this._register(this._hueStrip.onColorFlushed(this.flushColor, this));
    if (isStandaloneColorPicker) {
      this._insertButton = this._register(new InsertButton(this._domNode));
      this._domNode.classList.add("standalone-colorpicker");
    }
  }
  flushColor() {
    this.model.flushColor();
  }
  onDidSaturationValueChange({ s, v }) {
    const hsva = this.model.color.hsva;
    this.model.color = new Color(new HSVA(hsva.h, s, v, hsva.a));
  }
  onDidOpacityChange(a) {
    const hsva = this.model.color.hsva;
    this.model.color = new Color(new HSVA(hsva.h, hsva.s, hsva.v, a));
  }
  onDidHueChange(value) {
    const hsva = this.model.color.hsva;
    const h = (1 - value) * 360;
    this.model.color = new Color(new HSVA(h === 360 ? 0 : h, hsva.s, hsva.v, hsva.a));
  }
  get domNode() {
    return this._domNode;
  }
  get saturationBox() {
    return this._saturationBox;
  }
  get enterButton() {
    return this._insertButton;
  }
  layout() {
    this._saturationBox.layout();
    this._opacityStrip.layout();
    this._hueStrip.layout();
  }
}
class SaturationBox extends Disposable {
  constructor(container, model, pixelRatio) {
    super();
    this.model = model;
    this.pixelRatio = pixelRatio;
    this._onDidChange = new Emitter();
    this.onDidChange = this._onDidChange.event;
    this._onColorFlushed = new Emitter();
    this.onColorFlushed = this._onColorFlushed.event;
    this._domNode = $(".saturation-wrap");
    append(container, this._domNode);
    this._canvas = document.createElement("canvas");
    this._canvas.className = "saturation-box";
    append(this._domNode, this._canvas);
    this.selection = $(".saturation-selection");
    append(this._domNode, this.selection);
    this.layout();
    this._register(addDisposableListener(this._domNode, EventType$1.POINTER_DOWN, (e) => this.onPointerDown(e)));
    this._register(this.model.onDidChangeColor(this.onDidChangeColor, this));
    this.monitor = null;
  }
  get domNode() {
    return this._domNode;
  }
  onPointerDown(e) {
    if (!e.target || !(e.target instanceof Element)) {
      return;
    }
    this.monitor = this._register(new GlobalPointerMoveMonitor());
    const origin = getDomNodePagePosition(this._domNode);
    if (e.target !== this.selection) {
      this.onDidChangePosition(e.offsetX, e.offsetY);
    }
    this.monitor.startMonitoring(e.target, e.pointerId, e.buttons, (event) => this.onDidChangePosition(event.pageX - origin.left, event.pageY - origin.top), () => null);
    const pointerUpListener = addDisposableListener(e.target.ownerDocument, EventType$1.POINTER_UP, () => {
      this._onColorFlushed.fire();
      pointerUpListener.dispose();
      if (this.monitor) {
        this.monitor.stopMonitoring(true);
        this.monitor = null;
      }
    }, true);
  }
  onDidChangePosition(left, top) {
    const s = Math.max(0, Math.min(1, left / this.width));
    const v = Math.max(0, Math.min(1, 1 - top / this.height));
    this.paintSelection(s, v);
    this._onDidChange.fire({ s, v });
  }
  layout() {
    this.width = this._domNode.offsetWidth;
    this.height = this._domNode.offsetHeight;
    this._canvas.width = this.width * this.pixelRatio;
    this._canvas.height = this.height * this.pixelRatio;
    this.paint();
    const hsva = this.model.color.hsva;
    this.paintSelection(hsva.s, hsva.v);
  }
  paint() {
    const hsva = this.model.color.hsva;
    const saturatedColor = new Color(new HSVA(hsva.h, 1, 1, 1));
    const ctx = this._canvas.getContext("2d");
    const whiteGradient = ctx.createLinearGradient(0, 0, this._canvas.width, 0);
    whiteGradient.addColorStop(0, "rgba(255, 255, 255, 1)");
    whiteGradient.addColorStop(0.5, "rgba(255, 255, 255, 0.5)");
    whiteGradient.addColorStop(1, "rgba(255, 255, 255, 0)");
    const blackGradient = ctx.createLinearGradient(0, 0, 0, this._canvas.height);
    blackGradient.addColorStop(0, "rgba(0, 0, 0, 0)");
    blackGradient.addColorStop(1, "rgba(0, 0, 0, 1)");
    ctx.rect(0, 0, this._canvas.width, this._canvas.height);
    ctx.fillStyle = Color.Format.CSS.format(saturatedColor);
    ctx.fill();
    ctx.fillStyle = whiteGradient;
    ctx.fill();
    ctx.fillStyle = blackGradient;
    ctx.fill();
  }
  paintSelection(s, v) {
    this.selection.style.left = `${s * this.width}px`;
    this.selection.style.top = `${this.height - v * this.height}px`;
  }
  onDidChangeColor(color) {
    if (this.monitor && this.monitor.isMonitoring()) {
      return;
    }
    this.paint();
    const hsva = color.hsva;
    this.paintSelection(hsva.s, hsva.v);
  }
}
class Strip extends Disposable {
  constructor(container, model, showingStandaloneColorPicker = false) {
    super();
    this.model = model;
    this._onDidChange = new Emitter();
    this.onDidChange = this._onDidChange.event;
    this._onColorFlushed = new Emitter();
    this.onColorFlushed = this._onColorFlushed.event;
    if (showingStandaloneColorPicker) {
      this.domNode = append(container, $(".standalone-strip"));
      this.overlay = append(this.domNode, $(".standalone-overlay"));
    } else {
      this.domNode = append(container, $(".strip"));
      this.overlay = append(this.domNode, $(".overlay"));
    }
    this.slider = append(this.domNode, $(".slider"));
    this.slider.style.top = `0px`;
    this._register(addDisposableListener(this.domNode, EventType$1.POINTER_DOWN, (e) => this.onPointerDown(e)));
    this._register(model.onDidChangeColor(this.onDidChangeColor, this));
    this.layout();
  }
  layout() {
    this.height = this.domNode.offsetHeight - this.slider.offsetHeight;
    const value = this.getValue(this.model.color);
    this.updateSliderPosition(value);
  }
  onDidChangeColor(color) {
    const value = this.getValue(color);
    this.updateSliderPosition(value);
  }
  onPointerDown(e) {
    if (!e.target || !(e.target instanceof Element)) {
      return;
    }
    const monitor = this._register(new GlobalPointerMoveMonitor());
    const origin = getDomNodePagePosition(this.domNode);
    this.domNode.classList.add("grabbing");
    if (e.target !== this.slider) {
      this.onDidChangeTop(e.offsetY);
    }
    monitor.startMonitoring(e.target, e.pointerId, e.buttons, (event) => this.onDidChangeTop(event.pageY - origin.top), () => null);
    const pointerUpListener = addDisposableListener(e.target.ownerDocument, EventType$1.POINTER_UP, () => {
      this._onColorFlushed.fire();
      pointerUpListener.dispose();
      monitor.stopMonitoring(true);
      this.domNode.classList.remove("grabbing");
    }, true);
  }
  onDidChangeTop(top) {
    const value = Math.max(0, Math.min(1, 1 - top / this.height));
    this.updateSliderPosition(value);
    this._onDidChange.fire(value);
  }
  updateSliderPosition(value) {
    this.slider.style.top = `${(1 - value) * this.height}px`;
  }
}
class OpacityStrip extends Strip {
  constructor(container, model, showingStandaloneColorPicker = false) {
    super(container, model, showingStandaloneColorPicker);
    this.domNode.classList.add("opacity-strip");
    this.onDidChangeColor(this.model.color);
  }
  onDidChangeColor(color) {
    super.onDidChangeColor(color);
    const { r, g, b } = color.rgba;
    const opaque = new Color(new RGBA(r, g, b, 1));
    const transparent2 = new Color(new RGBA(r, g, b, 0));
    this.overlay.style.background = `linear-gradient(to bottom, ${opaque} 0%, ${transparent2} 100%)`;
  }
  getValue(color) {
    return color.hsva.a;
  }
}
class HueStrip extends Strip {
  constructor(container, model, showingStandaloneColorPicker = false) {
    super(container, model, showingStandaloneColorPicker);
    this.domNode.classList.add("hue-strip");
  }
  getValue(color) {
    return 1 - color.hsva.h / 360;
  }
}
class InsertButton extends Disposable {
  constructor(container) {
    super();
    this._onClicked = this._register(new Emitter());
    this.onClicked = this._onClicked.event;
    this._button = append(container, document.createElement("button"));
    this._button.classList.add("insert-button");
    this._button.textContent = "Insert";
    this._register(addDisposableListener(this._button, EventType$1.CLICK, () => {
      this._onClicked.fire();
    }));
  }
  get button() {
    return this._button;
  }
}
class ColorPickerWidget extends Widget {
  constructor(container, model, pixelRatio, themeService, standaloneColorPicker = false) {
    super();
    this.model = model;
    this.pixelRatio = pixelRatio;
    this._register(PixelRatio.getInstance(getWindow(container)).onDidChange(() => this.layout()));
    this._domNode = $(".colorpicker-widget");
    container.appendChild(this._domNode);
    this.header = this._register(new ColorPickerHeader(this._domNode, this.model, themeService, standaloneColorPicker));
    this.body = this._register(new ColorPickerBody(this._domNode, this.model, this.pixelRatio, standaloneColorPicker));
  }
  layout() {
    this.body.layout();
  }
  get domNode() {
    return this._domNode;
  }
}
export {
  ColorPickerBody,
  ColorPickerHeader,
  ColorPickerWidget,
  InsertButton
};
