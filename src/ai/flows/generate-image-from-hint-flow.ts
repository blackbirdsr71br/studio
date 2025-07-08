
'use server';
/**
 * @fileOverview Generates an image based on a text hint using an AI model.
 *
 * - generateImageFromHint - A function that takes a text hint and returns a data URI for the generated image.
 * - GenerateImageFromHintInput - The input type for the generateImageFromHint function.
 * - GenerateImageFromHintOutput - The return type for the generateImageFromHint function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateImageFromHintInputSchema = z.object({
  hint: z
    .string()
    .min(1, {message: 'Hint cannot be empty.'})
    .describe('A short description or keywords for the image to be generated. For example, "a cat wearing a hat" or "futuristic city".'),
});
export type GenerateImageFromHintInput = z.infer<typeof GenerateImageFromHintInputSchema>;

const GenerateImageFromHintOutputSchema = z.object({
  imageUrls: z.array(z.string()).describe('An array of data URIs of the generated images, typically in PNG format.'),
});
export type GenerateImageFromHintOutput = z.infer<typeof GenerateImageFromHintOutputSchema>;

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
            // IMPORTANT: Use the specified model for image generation
            model: 'googleai/gemini-2.0-flash-preview-image-generation', 
            prompt: `Generate a high-quality, visually appealing image suitable for an application UI, based on the following hint: "${input.hint}". Avoid text in the image unless explicitly requested. Focus on clear subjects and good composition. Style variation ${i + 1}.`,
            config: {
              responseModalities: ['TEXT', 'IMAGE'], // Must provide both
            },
          })
        );
      }
      
      const results = await Promise.all(imageGenerationPromises);

      const imageUrls = results.map(result => {
        if (!result.media || !result.media.url) {
          console.error('Image generation returned no media or URL for hint:', input.hint, 'Full response:', result.media);
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
