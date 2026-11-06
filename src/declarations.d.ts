/// <reference types="@electron-forge/plugin-vite/forge-vite-env" />
declare module '*.css';

// This file is a plain script on purpose: the declarations below apply everywhere.
interface CauldronBridge {
  version: string;
  platform: string;
}

interface Window {
  cauldron?: CauldronBridge;
}
