
'use server';

/**
 * @fileOverview THIS FLOW IS DEPRECATED AND NO LONGER USED.
 * The logic has been moved to a template-based generation system in `src/app/actions.ts`.
 * A new, more focused flow `generate-dynamic-ui-component.ts` is used instead.
 * This file is kept for posterity but is not active.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { GenerateDynamicUiComponentInputSchema } from '@/types/ai-spec'; // Keep reference for posterity, even if unused

// Using z.any() as the types are deprecated.
const GenerateJsonParserCodeInputSchema = z.object({
  canvasJson: z.string(),
});
export type GenerateJsonParserCodeInput = z.infer<typeof GenerateJsonParserCodeInputSchema>;

const GenerateJsonParserCodeOutputSchema = z.object({
  files: z.any(),
});
export type GenerateJsonParserCodeOutput = z.infer<typeof GenerateJsonParserCodeOutputSchema>;


export async function generateJsonParserCode(input: GenerateJsonParserCodeInput): Promise<GenerateJsonParserCodeOutput> {
  // This function is now a placeholder and should not be called.
  // The actual logic is in `generateProjectFromTemplatesAction` in `src/app/actions.ts`.
  console.warn("DEPRECATED: generateJsonParserCode flow was called but is no longer in use.");
  return Promise.resolve({ files: {
    "DEPRECATED.txt": "This AI flow is no longer used. Please see src/app/actions.ts for the new template-based generation logic.",
  }});
}

    