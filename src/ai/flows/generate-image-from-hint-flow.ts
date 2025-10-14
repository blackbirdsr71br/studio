
'use server';
/**
 * @fileOverview Generates an image based on a text hint using an AI model.
 */

import {ai} from '@/ai/genkit';
import { GenerateImageFromHintInputSchema, GenerateImageFromHintOutputSchema, type GenerateImageFromHintInput, type GenerateImageFromHintOutput } from '@/types/ai-spec';

export async function generateImageFromHint(input: GenerateImageFromHintInput): Promise<GenerateImageFromHintOutput> {
  return generateImageFromHintFlow(input);
}

const generateImageFromHintFlow = ai.defineFlow(
  {
    name: 'generateImageFromHintFlow',
    inputSchema: GenerateImageFromHintInputSchema,
    outputSchema: GenerateImageFromHintOutputSchema,
  },
  async (input) => {
    try {
      const NUM_IMAGES_TO_GENERATE = 4;
      const imageGenerationPromises = [];

      for (let i = 0; i < NUM_IMAGES_TO_GENERATE; i++) {
        imageGenerationPromises.push(
            ai.generate({
            // CORRECTED: Use a model and config appropriate for image generation
            model: 'googleai/gemini-1.5-flash-latest', 
            prompt: `Generate a high-quality, visually appealing image suitable for an application UI, based on the following hint: "${input.hint}". Avoid text in the image unless explicitly requested. Focus on clear subjects and good composition. Style variation ${i + 1}.`,
            config: {
              responseModalities: ['TEXT', 'IMAGE'], // CRITICAL: This enables image generation
            },
          })
        );
      }
      
      const results = await Promise.all(imageGenerationPromises);

      const imageUrls = results.map(result => {
        if (!result.media || !result.media.url) {
          console.error('Image generation returned no media or URL for hint:', input.hint, 'Full response:', result);
          return null;
        }
        return result.media.url;
      }).filter((url): url is string => url !== null);


      if (imageUrls.length === 0) {
        throw new Error('Image generation failed to return any valid image URLs. The model might not have produced an image for this hint.');
      }
      
      return { imageUrls };

    } catch (error) {
      console.error('Error in generateImageFromHintFlow for hint "'+input.hint+'":', error);
      let errorMessage = 'Failed to generate image due to an unexpected error.';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      throw new Error(errorMessage);
    }
  }
);
