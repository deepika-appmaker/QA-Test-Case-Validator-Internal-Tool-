import { getDailyUsage } from './firestore';
import type { RateLimitCheck } from '@/types';

const MAX_FILES_PER_DAY = parseInt(process.env.RATE_LIMIT_FILES_PER_DAY || '10', 10);
const MAX_ROWS_PER_DAY = parseInt(process.env.RATE_LIMIT_ROWS_PER_DAY || '1000', 10);

/**
 * Check whether a user is within their daily rate limits.
 */
export async function checkRateLimit(
    userId: string,
    additionalRows: number = 0
): Promise<RateLimitCheck> {
    const usage = await getDailyUsage(userId);

    if (usage.filesUploaded >= MAX_FILES_PER_DAY) {
        return {
            allowed: false,
            message: `Daily file limit reached (${MAX_FILES_PER_DAY} files/day). Please try again tomorrow.`,
            filesRemaining: 0,
            rowsRemaining: Math.max(0, MAX_ROWS_PER_DAY - usage.rowsAnalyzed),
        };
    }

    if (usage.rowsAnalyzed + additionalRows > MAX_ROWS_PER_DAY) {
        return {
            allowed: false,
            message: `Daily row limit would be exceeded (${MAX_ROWS_PER_DAY} rows/day). You have ${MAX_ROWS_PER_DAY - usage.rowsAnalyzed} rows remaining.`,
            filesRemaining: MAX_FILES_PER_DAY - usage.filesUploaded,
            rowsRemaining: Math.max(0, MAX_ROWS_PER_DAY - usage.rowsAnalyzed),
        };
    }

    return {
        allowed: true,
        filesRemaining: MAX_FILES_PER_DAY - usage.filesUploaded,
        rowsRemaining: MAX_ROWS_PER_DAY - usage.rowsAnalyzed - additionalRows,
    };
}
