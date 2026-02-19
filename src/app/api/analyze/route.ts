import { NextRequest, NextResponse } from 'next/server';
import {
    SYSTEM_PROMPT_BULK_REVIEW,
    SYSTEM_PROMPT_REWRITE,
    buildBulkReviewPrompt,
    buildRewritePrompt,
} from '@/lib/ai-prompts';
import { callGeminiAI, parseAIJSON, AI_API_KEY, AI_MODEL_PRIMARY, AI_MODEL_FALLBACK, sleep } from '@/lib/gemini';
import type { TestCase, AIReviewResult, AIRewriteResult } from '@/types';

const BATCH_SIZE = 12;
const BATCH_DELAY_MS = 3000; // 3s between batches
const REWRITE_DELAY_MS = 2000; // 2s between rewrite calls

/**
 * POST /api/analyze
 * Bulk analyze test cases with AI (Google Gemini)
 */
export async function POST(request: NextRequest) {
    try {
        if (!AI_API_KEY) {
            return NextResponse.json(
                { error: 'AI API key not configured. Please set AI_API_KEY in environment variables.' },
                { status: 500 }
            );
        }

        const body = await request.json();
        const testCases: TestCase[] = body.testCases;

        if (!testCases || !Array.isArray(testCases) || testCases.length === 0) {
            return NextResponse.json(
                { error: 'No test cases provided' },
                { status: 400 }
            );
        }

        // Split into batches
        const batches: TestCase[][] = [];
        for (let i = 0; i < testCases.length; i += BATCH_SIZE) {
            batches.push(testCases.slice(i, i + BATCH_SIZE));
        }

        // Process all batches
        const allResults: AIReviewResult[] = [];

        for (let b = 0; b < batches.length; b++) {
            const batch = batches[b];
            const userPrompt = buildBulkReviewPrompt(batch);

            let results: AIReviewResult[];
            try {
                const raw = await callGeminiAI(AI_MODEL_PRIMARY, SYSTEM_PROMPT_BULK_REVIEW, userPrompt);
                results = parseAIJSON<AIReviewResult[]>(raw);
            } catch (error) {
                // Return error results for this batch
                results = batch.map((tc) => ({
                    testId: tc.testId,
                    status: 'ERROR' as const,
                    score: 0,
                    reason: `AI analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                    confidence: 0,
                }));
            }

            allResults.push(...results);

            // Delay between batches to avoid rate limits
            if (b < batches.length - 1) {
                await sleep(BATCH_DELAY_MS);
            }
        }

        // Check for low confidence results → trigger rewrite with fallback model
        const rewriteResults: AIRewriteResult[] = [];

        const rewriteCandidates = allResults.filter(
            (r) => r.confidence < 70 && r.status !== 'ERROR'
        );

        for (let i = 0; i < rewriteCandidates.length; i++) {
            const result = rewriteCandidates[i];
            const originalTC = testCases.find((tc) => tc.testId === result.testId);
            if (originalTC) {
                try {
                    const rewritePrompt = buildRewritePrompt(originalTC);
                    const raw = await callGeminiAI(
                        AI_MODEL_FALLBACK,
                        SYSTEM_PROMPT_REWRITE,
                        rewritePrompt
                    );
                    const rewrite = parseAIJSON<AIRewriteResult>(raw);
                    rewriteResults.push(rewrite);
                } catch (error) {
                    console.error(`Rewrite failed for ${result.testId}:`, error);
                }

                // Delay between rewrite calls
                if (i < rewriteCandidates.length - 1) {
                    await sleep(REWRITE_DELAY_MS);
                }
            }
        }

        return NextResponse.json({
            results: allResults,
            rewrites: rewriteResults,
        });
    } catch (error) {
        console.error('Analyze API error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        );
    }
}
