interface ProbeResponse {
    readonly ok: boolean;
    readonly status: number;
    arrayBuffer(): Promise<unknown>;
}
type FetchLike = (url: string, init: {
    redirect: 'follow';
    signal: AbortSignal;
}) => Promise<ProbeResponse>;
/**
 * Ask the dev server for a URL and report only the verdict.
 *
 * A server that doesn't answer at all counts the same as one answering 500:
 * either way there is no page there yet, which is what the caller is deciding
 * on. The body is drained and dropped — it can be a megabyte of stack trace,
 * and none of it is wanted.
 */
declare function probeUrl(url: unknown, fetchImpl?: FetchLike): Promise<{
    ok: boolean;
    status: number;
}>;
export { probeUrl };
