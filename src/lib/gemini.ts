/**
 * Shared helper for calling Google Gemini API (generativelanguage.googleapis.com)
 */

const AI_API_URL = process.env.AI_API_URL || 'https://generativelanguage.googleapis.com/v1beta/models/';
const AI_API_KEY = process.env.AI_API_KEY || '';
const AI_MODEL_PRIMARY = process.env.AI_MODEL_PRIMARY || 'gemini-2.0-flash';
const AI_MODEL_FALLBACK = process.env.AI_MODEL_FALLBACK || 'gemini-2.0-flash';

export { AI_API_KEY, AI_MODEL_PRIMARY, AI_MODEL_FALLBACK };

/**
 * Call Google Gemini API with the given model, system prompt, and user prompt.
 * Returns the raw text content from the response.
 */
export async function callGeminiAI(
    model: string,
    systemPrompt: string,
    userPrompt: string
): Promise<string> {
    // Build the Gemini endpoint URL
    // Format: {baseUrl}{model}:generateContent?key={apiKey}
    const baseUrl = AI_API_URL.endsWith('/') ? AI_API_URL : `${AI_API_URL}/`;
    const url = `${baseUrl}${model}:generateContent?key=${AI_API_KEY}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            systemInstruction: {
                parts: [{ text: systemPrompt }],
            },
            contents: [
                {
                    role: 'user',
                    parts: [{ text: userPrompt }],
                },
            ],
            generationConfig: {
                temperature: 0.2,
                responseMimeType: 'application/json',
            },
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();

    // Extract text from Gemini response format
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (!text) {
        throw new Error('Empty response from Gemini API');
    }
    return text;
}

/**
 * Parse JSON from AI response, handling wrapped responses
 */
export function parseAIJSON<T>(raw: string): T {
    try {
        const parsed = JSON.parse(raw);
        // Handle wrapped responses like { results: [...] }
        if (parsed.results && Array.isArray(parsed.results)) {
            return parsed.results as T;
        }
        return parsed as T;
    } catch {
        // Try to extract JSON array from the response
        const match = raw.match(/\[[\s\S]*\]/);
        if (match) {
            return JSON.parse(match[0]) as T;
        }
        throw new Error('Failed to parse AI response as JSON');
    }
}
