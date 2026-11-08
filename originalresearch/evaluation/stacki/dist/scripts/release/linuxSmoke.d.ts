export declare function linuxSmokeRendererProbe(project: string): string;
export declare function linuxSmokeTerminalStart(project: string): {
    readonly id: "linux-smoke";
    readonly cwd: string;
    readonly cols: 80;
    readonly rows: 24;
};
