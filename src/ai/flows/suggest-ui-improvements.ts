'use server';

/**
 * @fileOverview A UI improvements suggestion AI agent.
 */

import {ai} from '@/ai/genkit';
import { SuggestUiImprovementsInputSchema, SuggestUiImprovementsOutputSchema, type SuggestUiImprovementsInput, type SuggestUiImprovementsOutput } from '@/types/ai-spec';

export async function suggestUiImprovements(
  input: SuggestUiImprovementsInput
): Promise<SuggestUiImprovementsOutput> {
  return suggestUiImprovementsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestUiImprovementsPrompt',
  input: {schema: SuggestUiImprovementsInputSchema},
  output: {schema: SuggestUiImprovementsOutputSchema},
  prompt: `You are an expert UI/UX designer specializing in Jetpack Compose.

You will receive a JSON representation of a UI design and provide suggestions for improvements.

Consider the principles of good UI/UX design, such as usability, accessibility, and visual appeal.

Design JSON:\n{{designJson}}

User Feedback (optional):\n{{userFeedback}}

Provide specific, actionable suggestions and explain the rationale behind each suggestion.

Format your output as a JSON object with "suggestions" (an array of strings) and "rationale" (a string explaining the suggestions).`,
});

const suggestUiImprovementsFlow = ai.defineFlow(
  {
    name: 'suggestUiImprovementsFlow',
    inputSchema: SuggestUiImprovementsInputSchema,
    outputSchema: SuggestUiImprovementsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
