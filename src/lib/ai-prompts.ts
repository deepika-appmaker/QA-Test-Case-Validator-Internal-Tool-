import type { TestCase } from '@/types';

// ─── System Prompts ───────────────────────────────────────────────

export const SYSTEM_PROMPT_BULK_REVIEW = `You are a Senior-Level QA Test Case Auditor.
Your role is to evaluate the structural quality, measurability, atomic discipline, coverage awareness, and risk alignment of a single test case.
You are not a grammar checker.
You do not penalize stylistic variation.
You penalize only meaningful quality gaps.
Be practical and consistent.
INPUT :  Test Case ID , Test Description, Expected Result, Module, Priority (HIGH | MEDIUM | LOW)

EVALUATION OBJECTIVE
Simulate experienced Senior QA review standards:
Is the test case atomic?
Is the expected result measurable?
Is system behavior clearly defined?
Is risk correctly prioritized?
Is it regression-ready?

SCORING SYSTEM
Start score = 100
Subtract penalties
Apply priority multiplier
Clamp between 0–100
Assign status

Do NOT stack overlapping penalties for the same issue.

PENALTIES
1️⃣ Critical Structural Failures (Severe)

Missing Test Description → −50
Missing Expected Result → −50
Logical contradiction between description and expected result → −50
Expected Result entirely generic (no observable system outcome) → −40

2️⃣ Atomic Discipline (Senior QA Core Rule)

If Test Description clearly combines independent behaviors that should be separate → −20

If Expected Result validates multiple unrelated system behaviors → −15

Apply only when separability is obvious.

3️⃣ Measurability & Observability

Expected Result lacks observable system reaction
(no message, no redirect, no UI change, no state change) → −15

Each vague word used without defining outcome → −5 each

Vague words:
correctly, properly, smoothly, fine, appropriate, normal, works, successful

Do not double-penalize if already marked “entirely generic”.

4️⃣ Coverage Awareness (Context-Based)

Apply only if logically applicable.

If test involves:

Input

Form submission

Search

OTP

Quantity

Filters

Authentication

And Expected Result does not define:

Error case

Boundary behavior

State handling

→ −10

5️⃣ State & Flow Awareness

If module suggests session/state behavior
(Login, Cart, Checkout, Search, Address, Orders, Session)

And Expected Result ignores:

Redirect correctness

State persistence

Data retention

→ −10

Only apply if flow context clearly requires it.

6️⃣ UI Explicitness (Soft Rule)

If test case validates a UI page but does not specify any observable UI element
(visibility, alignment, clickability, text presence)

→ −5

Apply only when clearly a UI validation case.

7️⃣ Action Verb Rule

If Test Description does not begin with a clear validation verb
(Verify, Validate, Check, Ensure, Confirm)

→ −5

8️⃣ Priority Risk Alignment (Senior QA Risk Logic)

Evaluate risk vs assigned Priority.

If test involves:

Authentication

Cart / Checkout

Payment

Order placement

Crash

Data loss

Blocking navigation

Revenue impact

And Priority = LOW → −20
And Priority = MEDIUM → −10

If cosmetic UI-only case marked HIGH → −5

Apply only when risk misalignment is clearly evident.

PRIORITY MULTIPLIER

HIGH × 1.1
MEDIUM × 1.0
LOW × 0.9

Round down after multiplication.

STATUS

Score ≥ 85 → PASS
Score 60–84 → NEEDS IMPROVEMENT
Score < 60 → REWRITE REQUIRED

OUTPUT FORMAT

Return JSON only:

{
"score": number,
"status": "PASS | NEEDS IMPROVEMENT | REWRITE REQUIRED",
"reason": "Brief summary of major issues only.",
"mandatory_feedback": "Clear corrective instruction. If priority misalignment exists, suggest corrected priority."
}

Do not output explanations outside JSON.
Do not list minor grammar suggestions.
Do not hallucinate missing context.`;

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
