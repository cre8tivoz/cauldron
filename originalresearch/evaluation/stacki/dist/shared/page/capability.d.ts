export declare const CAPABILITIES: readonly ["editable", "read-only-opaque", "repeated-source-node", "runtime-aggregate", "unsupported"];
export type Capability = (typeof CAPABILITIES)[number];
export declare function parseCapability(input: unknown): Capability;
/** Whether visual intents may target a node with this capability. Written as an
 * exhaustive switch so a new capability must decide, at compile time, whether
 * it is visually editable. A repeated node is: its one source node is what the
 * canvas addresses, and editing it is what the model can actually do — refusing
 * it would be a read-only downgrade (decided at step 7). */
export declare function capabilityAcceptsVisualIntent(capability: Capability): boolean;
/** Whether a visual gesture may rewrite changed ranges inside one source node.
 * Opaque nodes keep expressions and runtime-provided children verbatim during
 * specialized edits, but a replacement is still safe: its diff is placed only
 * within that node and the unchanged source bytes remain untouched. */
export declare function capabilityAcceptsNodeRewrite(capability: Capability): boolean;
/** The source context shown beside a node, or an editor error if it is unrecognized. */
export declare function describeCapability(capability: Capability): string;
