import { NextRequest, NextResponse } from 'next/server';
import {
    SYSTEM_PROMPT_MODULE_SUMMARY,
    buildModuleSummaryPrompt,
} from '@/lib/ai-prompts';
import { callGeminiAI, parseAIJSON, AI_API_KEY, AI_MODEL_PRIMARY } from '@/lib/gemini';
import type { TestCase, AIModuleSummary } from '@/types';

/**
 * POST /api/summary
 * Generate a module-level quality summary using Gemini
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
        const testCases: TestCase[] = body.testCases;

        if (!testCases || !Array.isArray(testCases) || testCases.length === 0) {
            return NextResponse.json(
                { error: 'No test cases provided' },
                { status: 400 }
            );
        }

        const userPrompt = buildModuleSummaryPrompt(testCases);
        const raw = await callGeminiAI(AI_MODEL_PRIMARY, SYSTEM_PROMPT_MODULE_SUMMARY, userPrompt);
        const summary: AIModuleSummary = parseAIJSON<AIModuleSummary>(raw);

        return NextResponse.json(summary);
    } catch (error) {
        console.error('Summary API error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        );
    }
}
