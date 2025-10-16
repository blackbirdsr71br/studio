
'use server';
/**
 * @fileOverview A specialized AI flow that generates only the dynamic parts of an Android project:
 * the data transfer objects (DTOs) and the Composable UI renderer.
 *
 * This flow is designed to be called by a server-side action that already has the
 * project template files.
 */

import {ai} from '@/ai/genkit';
import { GenerateDynamicUiComponentInputSchema, GenerateDynamicUiComponentOutputSchema, type GenerateDynamicUiComponentInput, type GenerateDynamicUiComponentOutput } from '@/types/ai-spec';
import { googleAI } from '@genkit-ai/googleai';

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
     - The file must start with the package declaration on line 1. No empty lines before it.
     - The file should contain a root data class, likely \`ComponentDto\`, and other necessary nested data classes (like \`PropertiesDto\`, \`ModifierDto\`, etc.) to represent the entire JSON structure.
     - **CRITICAL:** Every single property in every DTO data class MUST be **nullable** (e.g., \`val text: String? = null\`). This is essential for robust parsing.
     - Annotate every data class with \`@Serializable\`.
     - The DTOs must account for all properties seen in the input \`canvasJson\`, including \`id\`, \`type\`, \`name\`, \`parentId\`, \`properties\`, and any nested children.
     - The \`children\` property within \`PropertiesDto\` should be of type \`List<ComponentDto>? = null\`.
     - The \`onClickAction\` property should be represented by a serializable data class, e.g., \`ClickActionDto\`.

**2. \`DynamicUiComponent.kt\` File Content:**
   - **Package:** \`com.example.myapplication.presentation.components\`
   - **Imports:** All necessary Jetpack Compose imports (\`androidx.compose.material3.*\` for Material 3 components), Coil for image loading (\`io.coil.compose.AsyncImage\`), and the DTOs from \`com.example.myapplication.data.model\`. Also include necessary imports like \`androidx.compose.ui.graphics.Color\`, \`android.graphics.Color as AndroidColor\`, \`androidx.compose.ui.unit.dp\`, \`androidx.compose.ui.unit.sp\`, \`androidx.compose.ui.text.font.FontWeight\`, etc.
   - **Purpose:** Create a recursive Composable function that renders the UI based on the parsed DTOs.
   - **Requirements:**
     - The file must start with the package declaration on line 1.
     - Define a main Composable function, e.g., \`@Composable fun DynamicUiComponent(componentDto: ComponentDto)\`.
     - Inside each \`when\` branch, first assign \`componentDto.properties\` to a nullable local variable: \`val properties = componentDto.properties\`. Use this local variable for accessing all properties to make the code safer and more readable.
     - Use a \`when (componentDto.type)\` statement to handle different component types (\`Text\`, \`Button\`, \`Column\`, \`Row\`, \`Image\`, \`Card\`, etc.). For unknown types, render an empty composable or a placeholder Text.
     - For container components (\`Column\`, \`Row\`, \`Card\`, etc.), recursively call \`DynamicUiComponent\` for each item in \`properties?.children\`.
     - **Safe Enum/Type Conversion:** Property values from JSON will be strings. You MUST safely convert them to the correct Compose types using a \`when\` statement with a sensible default in the \`else\` branch. For example:
        - For \`fontWeight\`: \`when (properties?.fontWeight) { "Bold" -> FontWeight.Bold; "SemiBold" -> FontWeight.SemiBold; else -> FontWeight.Normal }\`
        - For \`contentScale\`: \`when (properties?.contentScale) { "Crop" -> ContentScale.Crop; "Fit" -> ContentScale.Fit; else -> ContentScale.Crop }\`
        - This applies to \`fontStyle\`, \`textAlign\`, \`textDecoration\`, \`Arrangement\`, \`Alignment\`, etc.
     - **Color Handling (VERY IMPORTANT):**
       - **Prioritize Theme Colors:** Instead of parsing hex strings directly, map properties to \`MaterialTheme.colorScheme\`.
       - \`backgroundColor\` for containers (Card, Column, etc.) should map to \`MaterialTheme.colorScheme.surface\` or \`MaterialTheme.colorScheme.background\`. For Card, use \`CardDefaults.cardColors(containerColor = ...)\`.
       - General \`textColor\` should map to \`MaterialTheme.colorScheme.onSurface\` or \`onBackground\`.
       - A Button's \`backgroundColor\` should use \`ButtonDefaults.buttonColors(containerColor = ...)\` mapping to \`MaterialTheme.colorScheme.primary\`, and its text color to \`MaterialTheme.colorScheme.onPrimary\`.
       - **Only if a specific hex color string is provided in the JSON**, parse it using \`Color(AndroidColor.parseColor("#RRGGBB"))\`. Wrap this in a try-catch block to prevent crashes from invalid formats and fall back to a theme color.
     - **Card Elevation**: For a Card component, you MUST use \`elevation = CardDefaults.cardElevation(defaultElevation = (properties?.elevation?.dp ?: 2.dp))\`. Do not use the deprecated \`elevation\` parameter directly on the Card.
     - Apply modifiers correctly based on the properties in the DTOs. Use \`.dp\` and \`.sp\` for dimensions and provide safe defaults (e.g., \`properties?.width?.toIntOrNull()?.dp ?: 100.dp\`, \`properties?.padding?.dp ?: 0.dp\`).
     - Use \`io.coil.compose.AsyncImage\` for rendering images from URLs.
     - It MUST handle all component types and properties present in the \`canvasJson\`.
     - It MUST correctly handle the \`onClickAction\` property, adding a \`Modifier.clickable {}\` block to the relevant components.

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
    // Dynamically select the model based on the input
    const model = googleAI.model(input.modelName);

    const { output } = await ai.generate({
        prompt,
        model,
        promptArgs: { canvasJson: input.canvasJson }
    });

    if (!output || !output.dtoFileContent || !output.rendererFileContent) {
      console.error("AI generation failed or returned invalid structure. Output:", output);
      throw new Error("AI failed to generate valid DTO or Renderer file content.");
    }
    return output;
  }
);
