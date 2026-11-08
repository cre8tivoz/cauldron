import { type AstroFileChange } from '../../shared/properties/astroFileChanges';
export declare function createAstroFileMonitor(root: string, report: (changes: readonly AstroFileChange[]) => void): {
    request: () => void;
    close: () => void;
};
