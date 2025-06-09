
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
  imageUrl: z.string().describe('The data URI of the generated image, typically in PNG format.'),
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
      const {media} = await ai.generate({
        model: 'googleai/gemini-2.0-flash-exp', // As per image generation instructions
        prompt: `Generate a high-quality, visually appealing image suitable for an application UI, based on the following hint: "${input.hint}". Avoid text in the image unless explicitly requested. Focus on clear subjects and good composition.`,
        config: {
          responseModalities: ['TEXT', 'IMAGE'], // Must provide both
        },
        // Optional: Add safety settings if needed
        // config: {
        //   safetySettings: [
        //     { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        //     { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
        //   ]
        // }
      });

      if (!media || !media.url) {
        console.error('Image generation returned no media or URL for hint:', input.hint, 'Full response:', media);
        throw new Error('Image generation failed to return a valid image URL. The model might not have produced an image for this hint.');
      }
      return { imageUrl: media.url };

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
