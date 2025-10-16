
'use server';

/**
 * @fileOverview A simple flow to list available AI models. This avoids direct
 * Genkit imports in server actions, which can cause bundling issues with Next.js.
 */
import { ai } from '@/ai/genkit';
import { listModels } from 'genkit';
import { z } from 'zod';

const ListModelsOutputSchema = z.object({
  models: z.array(z.string()),
});

export const listModelsFlow = ai.defineFlow(
  {
    name: 'listModelsFlow',
    inputSchema: z.void(),
    outputSchema: ListModelsOutputSchema,
  },
  async () => {
    const allModels = await listModels();
    const modelNames = allModels
      .filter(m => m.supportsGenerate)
      .map(m => m.name);
    return { models: modelNames };
  }
);

    