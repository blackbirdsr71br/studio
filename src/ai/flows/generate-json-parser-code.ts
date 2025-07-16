'use server';

/**
 * @fileOverview Generates a complete, structured Android project with Jetpack Compose that can parse and render a UI from a specific "Canvas JSON" structure.
 * The generated code follows a Clean Architecture/MVI pattern.
 *
 * - generateJsonParserCode - A function that takes a "Canvas JSON" string and returns a complete set of project files.
 * - GenerateJsonParserCodeInput - The input type for the function.
 * - GenerateJsonParserCodeOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateJsonParserCodeInputSchema = z.object({
  customJson: z
    .string()
    .describe('A "Canvas JSON" string representing the content area of the design. This JSON is an array of component objects, which may have nested children.')
    .refine(
      (data) => {
        try {
          const parsed = JSON.parse(data);
          // It should be an array of objects
          return Array.isArray(parsed);
        } catch (e) {
          return false;
        }
      },
      { message: 'The input is not a valid JSON string representing an array of components.' }
    ),
});
export type GenerateJsonParserCodeInput = z.infer<typeof GenerateJsonParserCodeInputSchema>;

// The output is now a full project structure, not just a single string.
const GenerateJsonParserCodeOutputSchema = z.object({
  files: z.any().describe('An object where keys are the full file paths (e.g., "app/build.gradle.kts") and values are the raw string content of the files for a complete Android project. This is NOT a stringified JSON, but a direct JSON object.'),
});
export type GenerateJsonParserCodeOutput = z.infer<typeof GenerateJsonParserCodeOutputSchema>;

export async function generateJsonParserCode(input: GenerateJsonParserCodeInput): Promise<GenerateJsonParserCodeOutput> {
  return generateJsonParserCodeFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateJsonParserCodePrompt',
  input: {schema: GenerateJsonParserCodeInputSchema},
  output: {schema: GenerateJsonParserCodeOutputSchema},
  prompt: `You are an expert Kotlin developer specializing in Server-Driven UI with Jetpack Compose. Your task is to generate a complete, minimal, and functional Android project that can fetch, parse, and render a UI from a given JSON structure.

The final output MUST be a JSON object where the root key is "files". The value of "files" must be another object where keys are the string file paths and values are the string file contents.

**Example Output Structure:**
\`\`\`json
{
  "files": {
    "build.gradle.kts": "...",
    "app/build.gradle.kts": "...",
    "app/src/main/AndroidManifest.xml": "...",
    "app/src/main/java/com/example/myapplication/MainActivity.kt": "...",
    "app/src/main/java/com/example/myapplication/ui/theme/Theme.kt": "...",
    "app/src/main/java/com/example/myapplication/DynamicUiRenderer.kt": "...",
    "settings.gradle.kts": "..."
  }
}
\`\`\`

The app's UI will be based on the following JSON representation (\`{{{customJson}}}\`).

**Project Structure and Code Requirements:**
Generate the following files with the specified content. Ensure all files are complete and functional.

1.  **\`app/src/main/java/com/example/myapplication/MainActivity.kt\`**:
    *   This is the main entry point. It must set up a theme and call the main screen composable.
    *   The main screen should observe a ViewModel to get the UI components and render them using a \`DynamicUiRenderer\`.
    *   It should handle loading and error states.

2.  **\`app/src/main/java/com/example/myapplication/DynamicUiRenderer.kt\`**:
    *   This file will contain the core rendering logic.
    *   It must have a \`@Composable fun DynamicUiRenderer(components: List<UiComponentModel>)\` that iterates through the list and calls a \`RenderNode\` composable for each component.
    *   The \`RenderNode\` composable should use a \`when(component.type)\` block to decide which specific composable to call (e.g., \`TextComponent\`, \`ImageComponent\`).
    *   It must include composables for each component type found in the input JSON (e.g., \`Text\`, \`Image\`, \`Column\`, \`Row\`, \`Card\`, \`Spacer\`).
    *   Container composables (\`ColumnComponent\`, \`RowComponent\`, etc.) **must recursively call \`RenderNode\`** for their children.
    *   Image loading MUST use the Coil library (\`io.coil-kt:coil-compose\`).
    *   All hexadecimal colors from JSON must be converted to Compose \`Color\` objects.

3.  **\`app/src/main/java/com/example/myapplication/models.kt\`**:
    *   This file will contain the data models.
    *   Define a \`@Serializable data class UiComponentModel\` that matches the JSON structure. Use nullable types for all properties in the DTO to handle missing values gracefully.
    *   Use \`kotlinx.serialization.SerialName\` for properties that are not valid Kotlin identifiers (like \`data-ai-hint\`).
    *   The \`children\` property should be \`val children: List<UiComponentModel>? = null\`.

4.  **\`app/src/main/java/com/example/myapplication/MainViewModel.kt\`**:
    *   Create a simple ViewModel that fetches the JSON string (you can hardcode it for this example, simulating a fetch from a source like Firebase Remote Config).
    *   It should parse the JSON into a list of \`UiComponentModel\` using \`kotlinx.serialization.json.Json\`.
    *   Use \`StateFlow\` to expose the list of components, loading state, and any errors to the UI.

5.  **\`app/src/main/java/com/example/myapplication/ui/theme/Theme.kt\`**:
    *   Generate a standard \`Theme.kt\` file.

6.  **\`app/src/main/AndroidManifest.xml\`**:
    *   Generate a standard \`AndroidManifest.xml\`.
    *   Ensure it includes the \`INTERNET\` permission for Coil.

7.  **\`app/build.gradle.kts\` (App Level)**:
    *   Generate a complete \`build.gradle.kts\`.
    *   Include the \`kotlinx-serialization\` plugin.
    *   Include dependencies for Compose, ViewModel, Coil, and \`org.jetbrains.kotlinx:kotlinx-serialization-json\`.

8.  **\`build.gradle.kts\` (Project Level)**:
    *   Generate a project-level \`build.gradle.kts\` with plugin definitions.

9.  **\`settings.gradle.kts\`**:
    *   Generate a standard \`settings.gradle.kts\`.

**Input JSON to be Parsed:**
\`\`\`json
{{{customJson}}}
\`\`\`

**Output Format:**
The output must be a single JSON object where the root key is "files". The value of "files" is an object of file paths and their content. Do not add any extra explanations.
`,
});

const generateJsonParserCodeFlow = ai.defineFlow(
  {
    name: 'generateJsonParserCodeFlow',
    inputSchema: GenerateJsonParserCodeInputSchema,
    outputSchema: GenerateJsonParserCodeOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output?.files || typeof output.files !== 'object' || Object.keys(output.files).length === 0) {
      console.error("AI generation for parser project failed or returned invalid structure. Output:", output);
      throw new Error("AI failed to generate a valid project file structure for the JSON parser.");
    }
    return output;
  }
);
