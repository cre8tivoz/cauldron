/// <reference types="@electron-forge/plugin-vite/forge-vite-env" />
declare module '*.css';

type CauldronBridge = {
  version: string;
  platform: string;
};

declare global {
  interface Window {
    cauldron?: CauldronBridge;
  }
}
