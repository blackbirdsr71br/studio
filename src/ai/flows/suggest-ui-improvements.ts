'use server';

/**
 * @fileOverview A UI improvements suggestion AI agent.
 *
 * - suggestUiImprovements - A function that handles the UI improvements process.
 * - SuggestUiImprovementsInput - The input type for the suggestUiImprovements function.
 * - SuggestUiImprovementsOutput - The return type for the suggestUiImprovements function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestUiImprovementsInputSchema = z.object({
  designJson: z
    .string()
    .describe(
      'A JSON representation of the UI design, specifying the layout, components, and properties.'
    ),
  userFeedback: z
    .string()
    .optional()
    .describe('Optional user feedback on the current UI design.'),
});
export type SuggestUiImprovementsInput = z.infer<
  typeof SuggestUiImprovementsInputSchema
>;

const SuggestUiImprovementsOutputSchema = z.object({
  suggestions: z
    .array(z.string())
    .describe('An array of suggestions for improving the UI design.'),
  rationale: z
    .string()
    .describe(
      'A rationale explaining why each suggestion would improve the UI design and user experience.'
    ),
});
export type SuggestUiImprovementsOutput = z.infer<
  typeof SuggestUiImprovementsOutputSchema
>;

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
