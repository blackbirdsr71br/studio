
/**
 * @fileOverview This file contains all the Zod schema definitions and TypeScript types
 * for the inputs and outputs of the AI flows. Centralizing them here resolves
 * Next.js "use server" module boundary errors, as server action files can only
 * export async functions.
 */

import { z } from 'zod';
import { ModalJsonSchema } from '@/types/compose-spec';

// === convert-canvas-to-custom-json-flow ===

export const ConvertCanvasToCustomJsonInputSchema = z.object({
  designJson: z
    .string()
    .describe(
      'A JSON string representing the UI design from the canvas content area. This is an array of component objects, where each object has id, type, name, parentId, and properties. Container components have a "children" array within their properties, containing full child component objects.'
    )
    .refine(
      (data) => {
        try {
          JSON.parse(data);
          return true;
        } catch (e) {
          return false;
        }
      },
      { message: 'The input design data is not in a valid JSON format.' }
    ),
  includeDefaultValues: z
    .boolean()
    .optional()
    .describe(
      'If true, include properties with default, empty, or zero values. If false or omitted, omit them for a cleaner JSON.'
    ),
});
export type ConvertCanvasToCustomJsonInput = z.infer<typeof ConvertCanvasToCustomJsonInputSchema>;

export const ConvertCanvasToCustomJsonOutputSchema = z.object({
  customJsonString: z
    .string()
    .describe(
      'A JSON string representing the UI in the "Compose Remote Layout" custom command format. The root key should be the lowercase name of the main component (e.g., "card", "column", "spacer"). This must be a compact, single-line JSON string.'
    )
    .refine(
      (data) => {
        try {
          if (data.trim() === '' || data.trim() === '{}') return true;
          JSON.parse(data);
          return true;
        } catch (e) {
          return false;
        }
      },
      {
        message:
          'The generated data is not in a valid JSON format.',
      }
    ),
});
export type ConvertCanvasToCustomJsonOutput = z.infer<typeof ConvertCanvasToCustomJsonOutputSchema>;


// === generate-image-from-hint-flow ===

export const GenerateImageFromHintInputSchema = z.object({
  hint: z
    .string()
    .min(1, {message: 'Hint cannot be empty.'})
    .describe('A short description or keywords for the image to be generated. For example, "a cat wearing a hat" or "futuristic city".'),
});
export type GenerateImageFromHintInput = z.infer<typeof GenerateImageFromHintInputSchema>;

export const GenerateImageFromHintOutputSchema = z.object({
  imageUrls: z.array(z.string()).describe('An array of data URIs of the generated images, typically in PNG format.'),
});
export type GenerateImageFromHintOutput = z.infer<typeof GenerateImageFromHintOutputSchema>;


// === generate-json-from-compose-commands ===

export const GenerateJsonFromComposeCommandsInputSchema = z.object({
  composeCommands: z
    .string()
    .min(10, {message: 'Compose commands must be at least 10 characters long.'})
    .describe('A string containing text-based commands that mimic Jetpack Compose syntax for UI design. These commands describe the content area of an app screen.'),
});
export type GenerateJsonFromComposeCommandsInput = z.infer<typeof GenerateJsonFromComposeCommandsInputSchema>;

export const GenerateJsonFromComposeCommandsOutputSchema = z.object({
  designJson: z
    .string()
    .describe(
      'A JSON string representing the UI design for the content area, structured as an array of component objects. This JSON should be parsable and adhere to the application\'s ModalJsonSchema.'
    )
    .refine(
      (data) => {
        try {
          const parsed = JSON.parse(data);
          return ModalJsonSchema.safeParse(parsed).success;
        } catch (e) {
          return false;
        }
      },
      {
        message:
          'The generated design data is not in a valid JSON format or does not match the required UI component schema (ModalJsonSchema for an array of components).',
      }
    ),
});
export type GenerateJsonFromComposeCommandsOutput = z.infer<typeof GenerateJsonFromComposeCommandsOutputSchema>;


// === suggest-ui-improvements ===

export const SuggestUiImprovementsInputSchema = z.object({
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
export type SuggestUiImprovementsInput = z.infer<typeof SuggestUiImprovementsInputSchema>;

export const SuggestUiImprovementsOutputSchema = z.object({
  suggestions: z
    .array(z.string())
    .describe('An array of suggestions for improving the UI design.'),
  rationale: z
    .string()
    .describe(
      'A rationale explaining why each suggestion would improve the UI design and user experience.'
    ),
});
export type SuggestUiImprovementsOutput = z.infer<typeof SuggestUiImprovementsOutputSchema>;
