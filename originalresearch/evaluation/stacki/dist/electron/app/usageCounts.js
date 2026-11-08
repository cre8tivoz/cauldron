"use strict";
// Stacki reports only one daily count after a project opens. No project data,
// installation identifier, or interaction history leaves the app.
Object.defineProperty(exports, "__esModule", { value: true });
exports.USAGE_COUNTS_URL = exports.USAGE_NOTICE_VERSION = void 0;
exports.usageDay = usageDay;
exports.shouldCountUsage = shouldCountUsage;
exports.sendUsageCount = sendUsageCount;
const assert_1 = require("../../shared/core/assert");
exports.USAGE_NOTICE_VERSION = 1;
exports.USAGE_COUNTS_URL = 'https://stacki-usage-counts.timothymricks.workers.dev/daily';
const REQUEST_TIMEOUT_MS = 3_000;
function usageDay(date) {
    const day = date.toISOString().slice(0, 10);
    (0, assert_1.assert)(/^\d{4}-\d{2}-\d{2}$/.test(day), 'Usage day must be a UTC date');
    return day;
}
function shouldCountUsage(input, day) {
    if (!input.packaged || !input.enabled) {
        return false;
    }
    if (input.noticeVersion < exports.USAGE_NOTICE_VERSION) {
        return false;
    }
    return input.lastAttemptDay !== day;
}
async function sendUsageCount(options, request) {
    try {
        const response = await request(exports.USAGE_COUNTS_URL, {
            method: 'POST',
            signal: AbortSignal.any([options.signal, AbortSignal.timeout(REQUEST_TIMEOUT_MS)]),
        });
        return response.status === 204;
    }
    catch {
        // Offline use is normal; counting must never interrupt editing.
        return false;
    }
}
