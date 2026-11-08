"use strict";
// Is the dev server serving a page, or an error?
//
// A compile error replaces the site with the dev server's own error screen —
// served with a 5xx, and carrying none of the HMR client the real page has. So
// nothing inside it can hear the file being fixed, and the preview sits on the
// error until something reloads it. Deciding when to reload means being able to
// ask this question, and the HTTP status is the only answer that doesn't depend
// on recognising the error screen's markup or parsing the server's log — both of
// which change with every version of Astro and Vite.
Object.defineProperty(exports, "__esModule", { value: true });
exports.probeUrl = probeUrl;
/**
 * Ask the dev server for a URL and report only the verdict.
 *
 * A server that doesn't answer at all counts the same as one answering 500:
 * either way there is no page there yet, which is what the caller is deciding
 * on. The body is drained and dropped — it can be a megabyte of stack trace,
 * and none of it is wanted.
 */
async function probeUrl(url, fetchImpl = fetch) {
    if (!url || typeof url !== 'string') {
        return { ok: false, status: 0 };
    }
    try {
        const response = await fetchImpl(url, {
            redirect: 'follow',
            signal: AbortSignal.timeout(5000),
        });
        try {
            await response.arrayBuffer();
        }
        catch {
            /* nothing to drain */
        }
        return { ok: response.ok, status: response.status };
    }
    catch {
        return { ok: false, status: 0 };
    }
}
