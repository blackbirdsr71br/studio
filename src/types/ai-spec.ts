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


// === generate-compose-code ===

export const GenerateComposeCodeInputSchema = z.object({
  designJson: z
    .string()
    .describe('A JSON string representing the UI design. Expects a root "Scaffold" component with "topBar", "content", and "bottomBar" properties containing their respective component trees.')
    .refine(
      (data) => {
        try {
          const parsed = JSON.parse(data);
          return typeof parsed === 'object' && parsed !== null && parsed.type === 'Scaffold';
        } catch (e) {
          return false;
        }
      },
      { message: 'The design data is not in a valid JSON format or is not a root Scaffold object.' }
    ),
});
export type GenerateComposeCodeInput = z.infer<typeof GenerateComposeCodeInputSchema>;

export const GenerateComposeCodeOutputSchema = z.object({
  files: z.any().describe('An object where keys are the full file paths (e.g., "app/build.gradle.kts") and values are the raw string content of the files for a complete Android project. This is NOT a stringified JSON, but a direct JSON object.'),
});
export type GenerateComposeCodeOutput = z.infer<typeof GenerateComposeCodeOutputSchema>;


// === generate-dynamic-ui-component ===

export const GenerateDynamicUiComponentInputSchema = z.object({
  canvasJson: z
    .string()
    .describe(
      'A JSON string representing the UI design from the canvas content area. This is an array of component objects. The AI must create DTOs that exactly match this structure.'
    ),
  modelName: z.string().describe('The name of the AI model to use for generation (e.g., "googleai/gemini-1.5-pro-latest").'),
});
export type GenerateDynamicUiComponentInput = z.infer<typeof GenerateDynamicUiComponentInputSchema>;

export const GenerateDynamicUiComponentOutputSchema = z.object({
  dtoFileContent: z.string().describe("The complete, raw string content for the `ComponentDto.kt` file. This file must contain all necessary data classes to parse the input `canvasJson` using kotlinx.serialization."),
  rendererFileContent: z.string().describe("The complete, raw string content for the `DynamicUiComponent.kt` file. This file must contain the Composable function that recursively renders the UI based on the DTOs."),
  error: z.string().optional().describe("If generation fails, this field should contain the error message."),
});
export type GenerateDynamicUiComponentOutput = z.infer<typeof GenerateDynamicUiComponentOutputSchema>;


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
