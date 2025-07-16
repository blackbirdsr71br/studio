
'use server';

/**
 * @fileOverview Generates a complete, structured Android project with Jetpack Compose code from a JSON representation of a UI design.
 * The design now expects a root "Scaffold" component which contains topBar, content, and bottomBar.
 *
 * - generateComposeCode - A function that takes a JSON string representing a UI design and returns a set of project files.
 * - GenerateComposeCodeInput - The input type for the generateComposeCode function.
 * - GenerateComposeCodeOutput - The return type for the generateComposeCode function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateComposeCodeInputSchema = z.object({
  designJson: z
    .string()
    .describe('A JSON string representing the UI design. Expects a root "Scaffold" component with "topBar", "content", and "bottomBar" properties containing their respective component trees.')
    .refine(
      (data) => {
        try {
          const parsed = JSON.parse(data);
          // Basic check for scaffold structure
          return typeof parsed === 'object' && parsed !== null && parsed.type === 'Scaffold';
        } catch (e) {
          return false;
        }
      },
      { message: 'The design data is not in a valid JSON format or is not a root Scaffold object.' }
    ),
});
export type GenerateComposeCodeInput = z.infer<typeof GenerateComposeCodeInputSchema>;

// Using z.any() and providing a detailed description to guide the model.
const GenerateComposeCodeOutputSchema = z.object({
  files: z.any().describe('An object where keys are the full file paths (e.g., "app/build.gradle.kts") and values are the raw string content of the files for a complete Android project. This is NOT a stringified JSON, but a direct JSON object.'),
});
export type GenerateComposeCodeOutput = z.infer<typeof GenerateComposeCodeOutputSchema>;

export async function generateComposeCode(input: GenerateComposeCodeInput): Promise<GenerateComposeCodeOutput> {
  return generateComposeCodeFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateComposeCodePrompt',
  input: {schema: GenerateComposeCodeInputSchema},
  output: {schema: GenerateComposeCodeOutputSchema},
  prompt: `You are an expert Jetpack Compose developer. Your task is to generate a complete, minimal, and functional Android project structure.
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
    "settings.gradle.kts": "..."
  }
}
\`\`\`

The app's UI will be based on the following JSON representation (\`{{{designJson}}}\`).

The root of the JSON will be a "Scaffold" component. This Scaffold contains three main slots: "topBar", "content", and "bottomBar". Each slot can be null or contain a single component object (e.g., TopAppBar for topBar, LazyColumn for content, BottomNavigationBar for bottomBar). These component objects will have their own "type", "properties", and potentially "children" if they are containers.

**Project Structure Requirements:**
Generate the following files with the specified content. Ensure all files are complete and functional.

1.  **\`app/src/main/java/com/example/myapplication/MainActivity.kt\`**:
    *   This is the main entry point. It must be a complete, runnable file.
    *   It must contain the \`MainActivity\` class inheriting from \`ComponentActivity\`.
    *   Inside \`onCreate\`, call \`setContent\` with a theme wrapper (e.g., \`MyApplicationTheme\`).
    *   Inside the theme, generate a \`@Composable\` function named \`GeneratedScreen\`. This function will contain the full UI.
    *   The \`GeneratedScreen\` function should render a \`Scaffold\` composable.
    *   If a \`topBar\` object is present in the input JSON, generate its Composable and pass it to the \`topBar\` lambda of the \`Scaffold\`.
    *   If a \`bottomBar\` object is present, generate its Composable and pass it to the \`bottomBar\` lambda of the \`Scaffold\`.
    *   The \`content\` object should be generated within the main content lambda of the \`Scaffold\`. This content lambda provides \`PaddingValues\` which you MUST apply as padding to the main content container (e.g., \`Modifier.padding(paddingValues)\`).
    *   Include all necessary imports from Jetpack Compose (\`androidx.compose...\`, \`androidx.activity.compose.setContent\`, etc.).
    *   All hexadecimal colors from JSON (e.g., "#FF0000") must be converted to Compose \`Color\` objects (e.g., \`Color(android.graphics.Color.parseColor("#FF0000"))\`). You will need to import \`android.graphics.Color\` and \`androidx.compose.ui.graphics.Color\`.
    *   Click Handling: If a component has a non-empty 'clickId' string property, add 'Modifier.clickable { /* TODO: Handle click for '{{{properties.clickId}}}' */ }' to its modifiers.
    *   Modifier Rules:
        - fillMaxSize -> Modifier.fillMaxSize()
        - fillMaxWidth -> Modifier.fillMaxWidth()
        - fillMaxHeight -> Modifier.fillMaxHeight()
        - width(X) -> Modifier.width(X.dp)
        - height(Y) -> Modifier.height(Y.dp)
        - layoutWeight(W) -> Modifier.weight(Wf)
        - padding(P) -> Modifier.padding(P.dp)
        - padding(T,B,S,E) -> Modifier.padding(top=T.dp, bottom=B.dp, ...)
        - Corner Radius: Use Modifier.clip(RoundedCornerShape(...))
        - Card: Use parameters like 'elevation', 'colors', 'shape', 'border'.
        - Spacer: Use Modifier.width/height/weight.

2.  **\`app/src/main/java/com/example/myapplication/ui/theme/Theme.kt\`**:
    *   Generate a standard \`Theme.kt\` file. It should define a composable \`MyApplicationTheme\` that handles light and dark themes.
    *   Include basic color definitions (\`Purple80\`, \`PurpleGrey80\`, etc.) and the \`LightColorScheme\` and \`DarkColorScheme\`.

3.  **\`app/src/main/AndroidManifest.xml\`**:
    *   Generate a standard \`AndroidManifest.xml\`.
    *   Ensure the \`.MainActivity\` is declared as the main launcher activity.
    *   Include a basic application definition with an icon, label, and theme.

4.  **\`app/build.gradle.kts\`**:
    *   Generate a complete \`build.gradle.kts\` file for the app module.
    *   Use the \`plugins\` block for \`com.android.application\` and \`org.jetbrains.kotlin.android\`.
    *   Set \`namespace\`, \`compileSdk\`, \`defaultConfig\` (with \`applicationId\`, \`minSdk\`, \`targetSdk\`, \`versionCode\`, \`versionName\`), and \`buildTypes\`.
    *   Enable \`buildFeatures { compose = true }\` and set \`composeOptions { kotlinCompilerExtensionVersion = "1.5.1" }\`.
    *   Include essential dependencies for Jetpack Compose: \`core-ktx\`, \`lifecycle-runtime-ktx\`, \`activity-compose\`, and the Compose BOM (\`compose-bom\`).

5.  **\`build.gradle.kts\` (Project Level)**:
    *   Generate a project-level \`build.gradle.kts\`.
    *   Use the \`plugins\` block to define aliases for \`com.android.application\`, \`org.jetbrains.kotlin.android\`, etc., with their versions. Set \`apply false\`.

6.  **\`settings.gradle.kts\`**:
    *   Generate a standard \`settings.gradle.kts\`.
    *   Define plugin management with repositories (\`google()\`, \`mavenCentral()\`).
    *   Define dependency resolution management.
    *   Include the \`:app\` module.

**Input Design JSON:**
\`\`\`json
{{{designJson}}}
\`\`\`

**Output Format:**
The output must be a single JSON object where the root key is "files". The value of "files" is an object of file paths and their content. Do not add any extra explanations.
`,
});

const generateComposeCodeFlow = ai.defineFlow(
  {
    name: 'generateComposeCodeFlow',
    inputSchema: GenerateComposeCodeInputSchema,
    outputSchema: GenerateComposeCodeOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output?.files || typeof output.files !== 'object' || Object.keys(output.files).length === 0) {
      console.error("AI generation failed or returned invalid structure. Output:", output);
      throw new Error("AI failed to generate a valid project file structure.");
    }
    return output;
  }
);
