import { compareTwoStrings } from 'string-similarity';
import type { TestCase } from '@/types';

// ─── SOP Constants ────────────────────────────────────────────────

const ACTION_VERBS = [
    'verify',
    'validate',
    'confirm',
    'open',
    'click',
    'navigate',
    'install',
    'login',
    'select',
    'scroll',
    'enter',
    'check',
    'ensure',
    'tap',
    'submit',
    'drag',
    'upload',
    'download',
    'type',
    'press',
];

const DUPLICATE_SIMILARITY_THRESHOLD = 0.85;

// ─── Individual Rule Checks ───────────────────────────────────────

function checkMissingExpectedResult(expectedResult: string): string | null {
    if (!expectedResult?.trim()) {
        return 'Missing expected result';
    }
    return null;
}

function checkNoActionVerb(description: string): string | null {
    const lower = description.toLowerCase();
    const hasVerb = ACTION_VERBS.some((verb) => {
        // Match whole-word boundaries
        const regex = new RegExp(`\\b${verb}\\b`, 'i');
        return regex.test(lower);
    });
    if (!hasVerb) {
        return 'No action verb found in description';
    }
    return null;
}

// ─── Public API ───────────────────────────────────────────────────

/**
 * Run all local SOP rule checks on a single test case.
 * Returns an array of flag strings (empty = all rules pass).
 */
export function validateTestCase(tc: TestCase): string[] {
    const flags: string[] = [];

    const missingExpected = checkMissingExpectedResult(tc.expectedResult);
    if (missingExpected) flags.push(missingExpected);

    const noVerb = checkNoActionVerb(tc.description);
    if (noVerb) flags.push(noVerb);

    return flags;
}

/**
 * Detect duplicate / near-duplicate test cases across all rows.
 * Returns a map of testId → array of similar testIds.
 */
export function detectDuplicates(
    rows: TestCase[]
): Map<string, string[]> {
    const duplicates = new Map<string, string[]>();

    for (let i = 0; i < rows.length; i++) {
        const similar: string[] = [];
        for (let j = i + 1; j < rows.length; j++) {
            const similarity = compareTwoStrings(
                rows[i].description.toLowerCase(),
                rows[j].description.toLowerCase()
            );
            if (similarity >= DUPLICATE_SIMILARITY_THRESHOLD) {
                similar.push(rows[j].testId);
                // Also add reverse mapping
                const existing = duplicates.get(rows[j].testId) || [];
                existing.push(rows[i].testId);
                duplicates.set(rows[j].testId, existing);
            }
        }
        if (similar.length > 0) {
            const existing = duplicates.get(rows[i].testId) || [];
            duplicates.set(rows[i].testId, [...existing, ...similar]);
        }
    }

    return duplicates;
}

/**
 * Run full validation on all test cases: individual rules + duplicate detection.
 */
export function validateAllTestCases(rows: TestCase[]): TestCase[] {
    const duplicateMap = detectDuplicates(rows);

    return rows.map((tc) => {
        const flags = validateTestCase(tc);

        // Add duplicate flag
        const dups = duplicateMap.get(tc.testId);
        if (dups && dups.length > 0) {
            flags.push(`Similar to: ${dups.join(', ')}`);
        }

        return { ...tc, localFlags: flags };
    });
}
