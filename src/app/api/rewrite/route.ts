import { NextRequest, NextResponse } from 'next/server';
import {
    SYSTEM_PROMPT_REWRITE,
    buildRewritePrompt,
} from '@/lib/ai-prompts';
import { callGeminiAI, parseAIJSON, AI_API_KEY, AI_MODEL_FALLBACK } from '@/lib/gemini';
import type { TestCase, AIRewriteResult } from '@/types';

/**
 * POST /api/rewrite
 * Rewrite a single test case using the fallback Gemini model
 */
export async function POST(request: NextRequest) {
    try {
        if (!AI_API_KEY) {
            return NextResponse.json(
                { error: 'AI API key not configured.' },
                { status: 500 }
            );
        }

        const body = await request.json();
        const testCase: TestCase = body.testCase;

        if (!testCase || !testCase.testId) {
            return NextResponse.json(
                { error: 'No test case provided' },
                { status: 400 }
            );
        }

        const userPrompt = buildRewritePrompt(testCase);
        const raw = await callGeminiAI(AI_MODEL_FALLBACK, SYSTEM_PROMPT_REWRITE, userPrompt);
        const result: AIRewriteResult = parseAIJSON<AIRewriteResult>(raw);

        return NextResponse.json(result);
    } catch (error) {
        console.error('Rewrite API error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        );
    }
}
