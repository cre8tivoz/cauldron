interface PreviewContents {
    on(event: 'did-fail-load', listener: (event: unknown, code: number, description: string, address: string, mainFrame: boolean) => void): void;
    send(channel: string, payload: string): void;
}
export declare function listenForPreviewFailures(contents: PreviewContents, previewURL: () => string | undefined): void;
export {};
