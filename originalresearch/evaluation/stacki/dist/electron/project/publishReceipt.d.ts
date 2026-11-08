import type { PublishConfig } from '../../shared/properties/publishConfig';
export interface DeploymentReceipt {
    readonly version: 1;
    readonly tree: string;
    readonly configuration: string;
}
export declare function deploymentConfiguration(config: PublishConfig): string;
export declare function parseDeploymentReceipt(input: unknown): DeploymentReceipt;
export declare function readDeploymentReceipt(root: string): Promise<DeploymentReceipt | undefined>;
export declare function recordDeployment(root: string, receipt: DeploymentReceipt): Promise<void>;
