import type { TestCase } from '@/types';

// ─── System Prompts ───────────────────────────────────────────────

export const SYSTEM_PROMPT_BULK_REVIEW = `You are a practical QA Test Case Auditor.
Be structured but liberal.
Only major issues should trigger rewrite or fail.

INPUT:
Test Case ID
Test Description
Expected Result
Module
Priority (HIGH/MEDIUM/LOW)

SCORING ORDER:

Start at 100

Subtract penalties

Apply priority multiplier

Clamp 0–100

Assign status

PENALTIES (Liberal)

Major Structural Issues:

Missing Expected Result → −50

Missing Test Description → −50

Internal logical contradiction → −50

Moderate Issues:

Expected Result validates 2 clearly independent system behaviors → −15

Non-measurable Expected Result → −15

No observable outcome clarity → −10

Minor Language Issues:
Each vague word (correctly, properly, smoothly, fine, appropriate, normal, works, successful) → −5 each

Action Verb:
If Test Description does not start with action verb → −5

PRIORITY MULTIPLIER:
HIGH ×1.1
MEDIUM ×1.0
LOW ×0.9

Round down after multiplication.

STATUS:
≥80 → PASS
50–79 → NEEDS IMPROVEMENT
<50 → REWRITE REQUIRED

OUTPUT:
JSON only
Reason: 1 -2 short lines summarizing issues only and a mandatory feedback comment.

`;

export const SYSTEM_PROMPT_REWRITE = `You are a Senior QA Automation Lead rewriting unclear test cases to SOP-compliant form.

Requirements for rewritten test cases:
- One scenario only per test case
- Strong, specific action verbs
- Measurable, deterministic expected results
- No vague language
- Automation-ready

Return ONLY valid JSON. No markdown, no commentary.`;

export const SYSTEM_PROMPT_MODULE_SUMMARY = `You are a QA Lead generating a quality module summary.

Return ONLY valid JSON. No markdown, no commentary.`;

// ─── User Prompt Builders ─────────────────────────────────────────

/**
 * Build the user prompt for bulk review (Prompt 1).
 */
export function buildBulkReviewPrompt(testCases: TestCase[]): string {
    const simplified = testCases.map((tc) => ({
        testId: tc.testId,
        description: tc.description,
        expectedResult: tc.expectedResult,
        priority: tc.priority,
        module: tc.module,
    }));

    return `Review the following test cases and return a JSON array. For each test case, provide:
- testId: the test case ID
- status: "PASS" or "NEEDS_REWRITE"
- score: 0-100 quality score
- reason: one-line explanation
- confidence: 0-100 confidence in your assessment

Test Cases:
${JSON.stringify(simplified, null, 2)}`;
}

/**
 * Build the user prompt for rewrite / fallback (Prompt 2).
 */
export function buildRewritePrompt(tc: TestCase): string {
    return `Rewrite the following test case to be SOP-compliant. Return a JSON object with:
- testId: "${tc.testId}"
- rewrittenDescription: improved description
- rewrittenExpected: improved expected result
- improvementReason: one sentence explaining what was improved

Test Case:
- Test ID: ${tc.testId}
- Description: ${tc.description}
- Expected Result: ${tc.expectedResult}
- Priority: ${tc.priority}
- Module: ${tc.module}`;
}

/**
 * Build the user prompt for module summary (Prompt 3).
 */
export function buildModuleSummaryPrompt(testCases: TestCase[]): string {
    const summary = testCases.map((tc) => ({
        testId: tc.testId,
        module: tc.module,
        score: tc.score,
        status: tc.aiStatus,
    }));

    return `Analyze the following test case results and return a JSON object with:
- averageScore: average quality score across all test cases
- rewritePercentage: percentage of test cases that need rewriting
- automationReadiness: "High", "Medium", or "Low"
- mainIssues: array of top 3-5 recurring issues

Test Case Results:
${JSON.stringify(summary, null, 2)}`;
}
