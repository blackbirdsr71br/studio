
'use server';
/**
 * @fileOverview A specialized AI flow that generates only the dynamic parts of an Android project:
 * the data transfer objects (DTOs) and the Composable UI renderer.
 *
 * This flow is designed to be called by a server-side action that already has the static
 * project template files.
 */

import {ai} from '@/ai/genkit';
import { GenerateDynamicUiComponentInputSchema, GenerateDynamicUiComponentOutputSchema, type GenerateDynamicUiComponentInput, type GenerateDynamicUiComponentOutput } from '@/types/ai-spec';

export async function generateDynamicUiComponent(input: GenerateDynamicUiComponentInput): Promise<GenerateDynamicUiComponentOutput> {
  return generateDynamicUiComponentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateDynamicUiComponentPrompt',
  input: {schema: GenerateDynamicUiComponentInputSchema},
  output: {schema: GenerateDynamicUiComponentOutputSchema},
  prompt: `You are an expert Kotlin and Jetpack Compose developer. Your task is to generate the content for two specific Kotlin files based on an input JSON representing a UI design.
You MUST ONLY generate the content for these two files. The rest of the project is handled by static templates.

**Input JSON to Analyze:**
\`\`\`json
{{{canvasJson}}}
\`\`\`

**Instructions for Generation:**

**1. \`ComponentDto.kt\` File Content:**
   - **Package:** \`com.example.myapplication.data.model\`
   - **Imports:** \`kotlinx.serialization.Serializable\`.
   - **Purpose:** Create Kotlin \`data class\` DTOs that EXACTLY mirror the structure of the provided \`canvasJson\`. This is for parsing with \`kotlinx.serialization\`.
   - **Requirements:**
     - The file should contain a root data class, likely \`ComponentDto\`, and other necessary nested data classes (like \`PropertiesDto\`, \`ModifierDto\`, etc.) to represent the entire JSON structure.
     - **CRITICAL:** Every single property in every DTO data class MUST be **nullable** (e.g., \`val text: String? = null\`). This is essential for robust parsing.
     - Annotate every data class with \`@Serializable\`.
     - The DTOs must account for all properties seen in the input \`canvasJson\`, including \`id\`, \`type\`, \`name\`, \`parentId\`, \`properties\`, and any nested children.
     - The \`children\` property within \`PropertiesDto\` should be of type \`List<ComponentDto>? = null\`.

**2. \`DynamicUiComponent.kt\` File Content:**
   - **Package:** \`com.example.myapplication.presentation.components\`
   - **Imports:** All necessary Jetpack Compose imports (\`androidx.compose...\`), Coil for image loading (\`io.coil.compose.AsyncImage\`), and the DTOs from \`com.example.myapplication.data.model\`.
   - **Purpose:** Create a recursive Composable function that renders the UI based on the parsed DTOs.
   - **Requirements:**
     - Define a main Composable function, e.g., \`@Composable fun DynamicUiComponent(componentDto: ComponentDto)\`.
     - Use a \`when (componentDto.type)\` statement to handle different component types found in the JSON (\`Text\`, \`Button\`, \`Column\`, \`Row\`, \`Image\`, \`Card\`, etc.).
     - For container components (\`Column\`, \`Row\`, \`Card\`, etc.), recursively call \`DynamicUiComponent\` for each item in \`componentDto.properties?.children\`.
     - Apply modifiers correctly based on the properties in the DTOs. Convert numeric dp values to \`dimensionResource\` or \`.dp\`. Handle colors by parsing hex strings.
     - Use \`io.coil.compose.AsyncImage\` for rendering images from URLs.
     - Ensure the generated code is clean, idiomatic, and functional.
     - It MUST handle all component types and properties present in the \`canvasJson\`.

**Final Output:**
Provide a single JSON object with two keys: \`dtoFileContent\` and \`rendererFileContent\`. The values should be the complete, raw string content for each respective Kotlin file.
`,
});

const generateDynamicUiComponentFlow = ai.defineFlow(
  {
    name: 'generateDynamicUiComponentFlow',
    inputSchema: GenerateDynamicUiComponentInputSchema,
    outputSchema: GenerateDynamicUiComponentOutputSchema,
  },
  async (input) => {
    const { output } = await ai.generate({
        prompt: prompt.compile(input),
        model: 'googleai/gemini-1.5-flash-latest',
        output: { schema: GenerateDynamicUiComponentOutputSchema }
    });

    if (!output || !output.dtoFileContent || !output.rendererFileContent) {
      console.error("AI generation failed or returned invalid structure. Output:", output);
      throw new Error("AI failed to generate valid DTO or Renderer file content.");
    }
    return output;
  }
);
