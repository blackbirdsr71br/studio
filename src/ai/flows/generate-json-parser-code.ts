
'use server';

/**
 * @fileOverview Generates Kotlin code for a Jetpack Compose function that can parse and render a UI from a specific "Compose Remote Layout" JSON structure.
 * The generated code follows a Clean Architecture/MVI pattern within a single file for easy integration.
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
  prompt: `You are an expert Kotlin developer specializing in Clean Architecture, MVI, and Server-Driven UI with Jetpack Compose.
Your task is to generate a single, complete Kotlin file that provides a full, production-ready implementation for fetching, parsing, and rendering a UI from a given "Compose Remote Layout" JSON.

The entire implementation must be in one file, but clearly structured with comments indicating which architectural layer each part belongs to, making it easy for a user to copy-paste into their Android project directories.

Input "Compose Remote Layout" JSON:
\`\`\`json
{{{customJson}}}
\`\`\`

Output Requirements (Single Kotlin File):

1.  Dependencies Comment:
    Start with a comment block detailing all necessary Gradle dependencies. Include versions for libraries like Coil, Kotlinx Serialization, Koin, Firebase, etc.

2.  Domain Layer (e.g., in domain/model):
    - Create pure, immutable data classes for the UI model (e.g., \`UiNode\`, \`ComponentData\`, \`ModifierData\`). These should NOT have \`@Serializable\` annotations. They represent the clean model used by the UI.

3.  Data Layer:
    - DTOs for JSON deserialization (e.g., in data/model):
        - Create \`@Serializable\` data classes that exactly match the provided JSON structure. These are the Data Transfer Objects (DTOs). Use \`ignoreUnknownKeys = true\` in the Json parser.
    - Mappers (e.g., in data/mapper):
        - Write extension functions to map from DTOs to the pure Domain models (e.g., \`fun ComponentDto.toDomain(): ComponentData\`).
    - Repository Contract & Implementation (e.g., in domain/repository and data/repository):
        - Define a \`UiRepository\` interface with a \`suspend fun getUi(): Result<UiNode>\`.
        - Create a \`RemoteConfigUiRepository(firebaseRemoteConfig: FirebaseRemoteConfig)\` class that implements the interface.
        - This implementation should fetch the JSON string from Firebase Remote Config using a key (e.g., "CUSTOM_COMMAND_JSON_V1"), parse it using the DTOs and mappers, and return a \`Result\` containing the domain \`UiNode\`.

4.  Dependency Injection (e.g., in di/AppModule.kt):
    - Provide a Koin module (\`val appModule = module { ... }\`) that defines singletons for the \`FirebaseRemoteConfig\` instance, the \`UiRepository\`, and a \`viewModel\` for the \`RemoteUiViewModel\`.

5.  Presentation Layer (MVI):
    - MVI Contract (e.g., in presentation/feature/FeatureContract.kt):
        - Define a \`RemoteUiContract\` sealed interface containing:
            - \`State(isLoading: Boolean, uiNode: UiNode?, error: String?)\`
            - \`Event\` (e.g., \`OnFetchUiRequest\`, \`OnComponentClick(clickId: String)\`)
            - \`Effect\` (e.g., \`ShowToast(message: String)\`)
    - ViewModel (e.g., in presentation/feature/FeatureViewModel.kt):
        - Create a \`RemoteUiViewModel(uiRepository: UiRepository)\` that inherits from \`ViewModel\`.
        - Use \`StateFlow\` for state management and \`SharedFlow\` for effects.
        - Implement a function to handle events, fetch data from the repository, and update the state accordingly.
    - UI / Composables (e.g., in presentation/feature/FeatureScreen.kt):
        - \`@Composable fun RemoteUiScreen(viewModel: RemoteUiViewModel = koinViewModel())\`: The main screen that collects state from the ViewModel and handles effects. It should show a loading indicator, an error message, or call \`RenderNode\`.
        - \`@Composable fun RenderNode(node: UiNode, onEvent: (RemoteUiContract.Event) -> Unit)\`: The recursive composable that uses a \`when\` statement on \`node.type\` to render the specific component (\`TextNode\`, \`ColumnNode\`, etc.). It must pass down the \`onEvent\` callback.
        - \`@Composable fun Modifier.applyModifiers(modifierData: ModifierData, onEvent: (RemoteUiContract.Event) -> Unit)\`: An extension function to apply all modifiers from the domain model, including converting hex colors and handling \`clickId\` by calling \`onEvent(OnComponentClick(clickId))\`. Image loading MUST use Coil.

Final Output:
Generate a single, complete, and runnable Kotlin file. Do NOT include a \`package\` declaration. Ensure all necessary imports are present. The code should be clean, well-commented, and ready to be integrated.
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
