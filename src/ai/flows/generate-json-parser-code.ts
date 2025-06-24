
'use server';

/**
 * @fileOverview Generates Kotlin code for a Jetpack Compose function that can parse and render a UI from a specific "Compose Remote Layout" JSON structure.
 *
 * - generateJsonParserCode - A function that takes a "Compose Remote Layout" JSON string and returns the corresponding Kotlin parser and renderer code.
 * - GenerateJsonParserCodeInput - The input type for the function.
 * - GenerateJsonParserCodeOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateJsonParserCodeInputSchema = z.object({
  customJson: z
    .string()
    .describe('A "Compose Remote Layout" JSON string. This JSON has a single root key (like "card", "column") which contains modifier and children properties.')
    .refine(
      (data) => {
        try {
          JSON.parse(data);
          return true;
        } catch (e) {
          return false;
        }
      },
      { message: 'The input is not a valid JSON string.' }
    ),
});
export type GenerateJsonParserCodeInput = z.infer<typeof GenerateJsonParserCodeInputSchema>;

const GenerateJsonParserCodeOutputSchema = z.object({
  kotlinCode: z.string().describe('The generated Kotlin code for parsing and rendering the UI.'),
});
export type GenerateJsonParserCodeOutput = z.infer<typeof GenerateJsonParserCodeOutputSchema>;

export async function generateJsonParserCode(input: GenerateJsonParserCodeInput): Promise<GenerateJsonParserCodeOutput> {
  return generateJsonParserCodeFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateJsonParserCodePrompt',
  input: {schema: GenerateJsonParserCodeInputSchema},
  output: {schema: GenerateJsonParserCodeOutputSchema},
  prompt: `You are an expert Kotlin and Jetpack Compose developer specializing in Server-Driven UI.
Your task is to generate a complete Kotlin file that can parse a given "Compose Remote Layout" JSON and render it as a Jetpack Compose UI.

The generated code must include:
1.  **Imports**: All necessary imports from Jetpack Compose, Kotlinx Serialization, etc.
2.  **Data Classes**: A full set of serializable data classes (using \`@Serializable\`) that accurately model the structure of the provided JSON. The JSON structure is hierarchical.
3.  **Parser Function**: A function, let's call it \`parseUiFromJson(jsonString: String): UiNode?\`, that uses \`kotlinx.serialization.json.Json\` to parse the input string into the data classes. It should handle potential parsing errors gracefully (e.g., return null).
4.  **Renderer Composable**: A main \`@Composable\` function, e.g., \`RenderRemoteUi(jsonString: String)\`, that calls the parser and then recursively calls rendering composables for each node.
5.  **Recursive Component Composables**: A central \`@Composable\` function, e.g., \`RenderNode(node: UiNode)\`, that uses a \`when\` statement on the node type to delegate rendering to specific composables (e.g., \`TextNode\`, \`ColumnNode\`, etc.).
6.  **Modifier Logic**: A composable function or extension function that correctly applies modifiers from the JSON (padding, size, background, border, clickId, etc.) to the Composables. It should handle color strings (e.g., "#FFFFFF") by converting them to Compose \`Color\` objects.

**JSON Structure to Support:**
The JSON has a single root key which is the component type (e.g., "column", "text").
Each component object has a "modifier" object and component-specific properties.
The "modifier" object contains a "base" object for common modifiers.
Container components have a "children" array, where each child is a full component object (e.g., \`{ "text": { ... } }\`).

**Key Mappings to Implement:**
-   JSON keys: "column", "row", "box", "card", "text", "button", "image", "spacer", "grid".
-   Modifiers in "modifier.base": "padding", "margin", "width", "height", "size", "fillMaxWidth", "fillMaxHeight", "fillMaxSize", "background", "border", "shadow", "clickable", "clickId", "alpha", "rotate", "scale".
-   Component-specific modifiers: e.g., "verticalArrangement" for "column", "horizontalArrangement" for "row".
-   Component properties: e.g., "content" for "text", "src" for "image".
-   Image loading should use the Coil library (\`io.coil-kt:coil-compose\`).
-   Click handling should use \`Modifier.clickable\` and log the "clickId" for now.
-   The JSON parser should be configured to be lenient (\`Json { isLenient = true, ignoreUnknownKeys = true }\`).

**Example Input JSON:**
\`\`\`json
{{{customJson}}}
\`\`\`

**Output Expectations:**
-   The output must be a single, complete Kotlin file (\`.kt\`).
-   Do NOT include a \`package\` declaration.
-   Include comments explaining the purpose of the main parts (Data Classes, Parser, Renderer).
-   Ensure all necessary dependencies are mentioned in a comment at the top of the file (e.g., for Gradle: \`implementation("io.coil-kt:coil-compose:2.6.0")\`, \`implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.6.3")\`).

Generate the full Kotlin code now based on this specification and the provided JSON.
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
    if (!output) {
      throw new Error('AI did not return any code.');
    }
    return { kotlinCode: output.kotlinCode };
  }
);
