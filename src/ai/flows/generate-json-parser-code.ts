
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
Your task is to generate a single, complete Kotlin file that provides a full, production-ready implementation for fetching, parsing, and rendering a UI from a given "Canvas JSON".

The entire implementation must be in one file, but clearly structured with comments indicating which architectural layer and file path each part belongs to. This makes it easy for a user to copy-paste into their Android project.

Input "Canvas JSON" (content area components):
\`\`\`json
{{{customJson}}}
\`\`\`

Output Requirements (Single Kotlin File):

1.  **Gradle Dependencies (Comment Block)**:
    Start with a large comment block detailing all necessary Gradle dependencies using a Version Catalog.
    - First, provide the full content for a \`libs.versions.toml\` file within a comment.
    - Second, provide a commented example of the app-level \`build.gradle.kts\` \`dependencies\` block showing how to use the catalog aliases.

2.  **Data Layer**:
    - **DTOs (e.g., in data/dto/UiComponentDto.kt)**:
        - Create \`@Serializable\` data classes (\`UiComponentDto\`, \`PropertiesDto\`) that exactly match the provided JSON structure. Use \`ignoreUnknownKeys = true\` in the Json parser. Recursively use \`UiComponentDto\` for the children array.
    - **Mappers (e.g., in data/mappers/UiComponentMapper.kt)**:
        - Write an object \`UiComponentMapper\` with extension functions to map from DTOs to the pure Domain models (e.g., \`fun UiComponentDto.toDomain(): UiComponent\`). This must handle the recursive mapping of children.
    - **Data Source (e.g., in data/datasource/RemoteConfigDataSource.kt)**:
        - Define a \`RemoteConfigDataSource\` interface with a suspend function to get the JSON string.
        - Create an implementation \`RemoteConfigDataSourceImpl\` that fetches a JSON string from Firebase Remote Config. Use the key "YOUR_REMOTE_CONFIG_KEY" and handle fetch/activation logic.
    - **Repository Implementation (e.g., in data/repository/UiComponentRepositoryImpl.kt)**:
        - Create a \`UiComponentRepositoryImpl\` that implements the domain repository interface.
        - It must perform the following steps:
            1. Call the data source to get the JSON string.
            2. Parse this JSON string into your DTO classes using \`kotlinx.serialization.json.Json\`.
            3. Use your mapper functions to convert the DTOs into your clean domain model (\`List<UiComponent>\`).
            4. Emit the result through a Kotlin Flow.

3.  **Domain Layer**:
    - **Models (e.g., in domain/models/UiComponent.kt)**:
        - Create pure, immutable data classes for the UI model (\`UiComponent\`, \`Properties\`, and a \`ComponentType\` enum). These should NOT have \`@Serializable\` annotations. They represent the clean model used by the UI. The \`ComponentType\` enum must include all component types found in the input JSON, plus an UNKNOWN fallback.
    - **Repository Contract (e.g., in domain/repository/UiComponentRepository.kt)**:
        - Define a \`UiComponentRepository\` interface. It must have a function \`getUiComponents(): Flow<List<UiComponent>>\`.
    - **Use Case (e.g., in domain/usecases/GetUiComponentsUseCase.kt)**:
        - Create a \`GetUiComponentsUseCase\` that invokes the repository method.

4.  **Dependency Injection (Koin, e.g., in di/AppModule.kt)**:
    - Provide a Koin module (\`val appModule = module { ... }\`).
    - This module MUST define singletons for the data source, repository, and use case, and a viewModel factory for the \`MainViewModel\`.

5.  **Presentation Layer (MVI)**:
    - **MVI Contract (e.g., in presentation/contracts/MainContract.kt)**:
        - Define base interfaces: \`interface UiState\`, \`interface UiEvent\`, \`interface UiEffect\`.
        - Define a \`MainContract\` sealed interface containing:
            - \`data class MainState(...) : UiState\` (isLoading, components, error)
            - \`sealed interface MainEvent : UiEvent { ... }\` (e.g., \`LoadComponents\`, \`RefreshComponents\`)
            - \`sealed interface MainEffect : UiEffect { ... }\` (e.g., \`ShowError(message: String)\`)
    - **BaseViewModel (e.g., in presentation/base/BaseViewModel.kt)**:
        - Create an abstract \`abstract class BaseViewModel<State, Event, Effect> : ViewModel()\` that manages the MVI pattern, exposing StateFlow and a Channel for effects.
    - **ViewModel (e.g., in presentation/viewmodel/MainViewModel.kt)**:
        - Create a \`MainViewModel\` that inherits from \`BaseViewModel\` and implements \`handleEvent\` to fetch data via the use case and update the state.
    - **UI / Composables**:
        - **MainScreen.kt**: The main screen that collects state from the ViewModel and handles effects. It should show a loading indicator, an error message, or call the renderer.
        - **DynamicUiRenderer.kt**: A composable that takes \`List<UiComponent>\` and uses a \`LazyColumn\` to iterate and call \`RenderNode\` for each top-level component.
        - **Component-specific Composables**: Create individual composables for each component type (e.g., \`TextComponent.kt\`, \`ImageComponent.kt\`, \`CardComponent.kt\`, \`ColumnComponent.kt\`, \`RowComponent.kt\`). These composables will be responsible for applying the modifiers and properties. The container composables (Card, Column, Row, etc.) must recursively call \`RenderNode\` for their children. Image loading MUST use Coil.
        - **ColorUtils.kt**: Include utility functions for parsing color strings.

Final Output:
Generate a single, complete, and runnable Kotlin file. Do NOT include a \`package\` declaration at the top level, but use it in the commented file paths. Ensure ALL necessary imports for Koin, Firebase, Coroutines, Compose, etc., are present. The code should be clean, well-commented, and ready to be integrated. The repository implementation MUST include the actual logic to connect to and fetch from Firebase Remote Config.
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
