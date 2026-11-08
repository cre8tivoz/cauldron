export interface ScannedTag {
    readonly full: string;
    readonly name: string;
    readonly attrs: string;
    readonly selfClose: string;
    readonly end: number;
}
export declare function scanTag(source: string, start: number): ScannedTag | undefined;
