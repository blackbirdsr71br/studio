
'use server';

/**
 * @fileOverview Generates Kotlin code for a Jetpack Compose application that can parse and render a UI from a specific "Canvas JSON" structure.
 * The generated code follows a Clean Architecture/MVI pattern within a single file for easy integration.
 *
 * - generateJsonParserCode - A function that takes a "Canvas JSON" string and returns the corresponding Kotlin parser and renderer code.
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
  prompt: `You are an expert Kotlin developer specializing in Clean Architecture, MVI, and Server-Driven UI with Jetpack Compose using Gradle Version Catalogs.
Your task is to generate a single, complete Kotlin file that provides a full, production-ready implementation for fetching, parsing, and rendering a UI from a given "Canvas JSON". The entire implementation must be in one file, but clearly structured with comments indicating which architectural layer and file path each part belongs to.

Input "Canvas JSON" (content area components):
\`\`\`json
{{{customJson}}}
\`\`\`

--- OUTPUT REQUIREMENTS ---

Generate a SINGLE, COMPLETE Kotlin file containing the following sections, fully implemented:

1.  **Gradle Dependencies (Comment Block)**:
    - Start with a large comment block.
    - First, provide the full content for a \`libs.versions.toml\` file.
    - Second, provide a commented example of the app-level \`build.gradle.kts\` \`dependencies\` block using the catalog aliases.

2.  **Data Layer**:
    - **DTOs (\`// data/dto/UiComponentDto.kt\`)**: Create \`@Serializable\` data classes that exactly match the input JSON structure, including recursive children. Use \`ignoreUnknownKeys = true\` on the Json parser.
    - **Mappers (\`// data/mappers/UiComponentMapper.kt\`)**: Create a \`UiComponentMapper\` object with extension functions to map DTOs to Domain models, handling recursion.
    - **Data Source (\`// data/datasource/RemoteConfigDataSource.kt\`)**: Define a \`RemoteConfigDataSource\` interface and implement it (\`RemoteConfigDataSourceImpl\`) to fetch the JSON string from Firebase Remote Config using the key "YOUR_REMOTE_CONFIG_KEY".
    - **Repository (\`// data/repository/UiComponentRepositoryImpl.kt\`)**: Implement the domain repository. It must call the data source, parse the JSON to DTOs, and map them to domain models, emitting the result via a Kotlin Flow.

3.  **Domain Layer**:
    - **Models (\`// domain/models/UiComponent.kt\`)**: Create pure data classes: \`UiComponent\`, \`Properties\`, and a \`ComponentType\` enum. The \`ComponentType\` enum MUST include an enum constant for **every unique "type" string** found in the input JSON, plus an **UNKNOWN** fallback.
    - **Repository Contract (\`// domain/repository/UiComponentRepository.kt\`)**: Define a \`UiComponentRepository\` interface with a \`getUiComponents(): Flow<List<UiComponent>>\` function.
    - **Use Case (\`// domain/usecases/GetUiComponentsUseCase.kt\`)**: Create a \`GetUiComponentsUseCase\` that invokes the repository method.

4.  **Dependency Injection (\`// di/AppModule.kt\`)**:
    - Provide a Koin module (\`val appModule = module { ... }\`) that defines singletons for the DataSource, Repository, and UseCase, and a viewModel factory for the \`MainViewModel\`.

5.  **Presentation Layer (MVI)**:
    - **MVI Contract (\`// presentation/contracts/MainContract.kt\`)**: Define a \`MainContract\` sealed interface containing \`MainState\` (with isLoading, components, error), \`MainEvent\`, and \`MainEffect\`.
    - **BaseViewModel (\`// presentation/base/BaseViewModel.kt\`)**: Create an abstract \`BaseViewModel\` that manages the MVI pattern (StateFlow, Channel for effects).
    - **ViewModel (\`// presentation/viewmodel/MainViewModel.kt\`)**: Create a \`MainViewModel\` that inherits from \`BaseViewModel\` and handles events to fetch data via the use case.
    - **UI / Composables**:
        - **MainScreen.kt**: The main screen that collects state from the ViewModel. It should show a loading indicator, an error message, or call the renderer.
        - **DynamicUiRenderer.kt**: A composable that takes \`List<UiComponent>\` and uses a \`LazyColumn\` to iterate and call \`RenderNode\` for each top-level component.
        - **RenderNode.kt (as a concept)**: A central composable \`fun RenderNode(component: UiComponent)\` with a \`when (component.type)\` statement. This \`when\` block **must handle every single ComponentType** from your generated enum.
        - **Component-specific Composables**: For **each type** in your \`ComponentType\` enum (except UNKNOWN), create a corresponding Composable function (e.g., \`TextComponent\`, \`ImageComponent\`, \`ColumnComponent\`). Container composables **must recursively call \`RenderNode\`** for their children. Image loading MUST use the Coil library.
    - **ColorUtils.kt**: Include utility functions for parsing color strings.

--- FINAL INSTRUCTION ---

Ensure the generated Kotlin file is complete, syntactically correct, and contains all the required sections without any truncation. Do not add any explanatory text before or after the code block.
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
