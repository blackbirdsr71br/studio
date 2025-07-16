
'use server';

/**
 * @fileOverview Generates a complete, structured Android project with Jetpack Compose code from a JSON representation of a UI design.
 * The project follows Clean Architecture and MVI patterns. The input is the full "Canvas JSON" which is a hierarchical representation
 * of the components in the main content area.
 *
 * - generateJsonParserCode - A function that takes a JSON string representing a UI design and returns a set of project files.
 * - GenerateJsonParserCodeInput - The input type for the generateJsonParserCode function.
 * - GenerateJsonParserCodeOutput - The return type for the generateJsonParserCode function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateJsonParserCodeInputSchema = z.object({
  canvasJson: z
    .string()
    .describe('A JSON string representing the UI design from the canvas content area, for which a full Kotlin project will be generated. This is an array of component objects, where each object has id, type, name, parentId, and properties. Container components have a "children" array within their properties, containing full child component objects.')
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
  prompt: `You are an expert Android developer specializing in Clean Architecture, MVI, and Jetpack Compose. Your task is to generate a complete, minimal, and functional Android project structure that renders a UI from a given JSON string.

**The final output MUST be a JSON object where the root key is "files". The value of "files" must be another object where keys are the string file paths and values are the string file contents.**

**Architectural Requirements:**
- **MVI Pattern:** Implement UI State, UI Events, and UI Effects.
- **Clean Architecture:** Separate code into Data, Domain, and Presentation layers.
- **Dependency Injection:** Use Koin for managing dependencies.
- **Image Loading:** Use Coil for asynchronously loading images from URLs.
- **Remote Config:** Fetch the UI JSON from Firebase Remote Config and listen for real-time updates.

**Input JSON to be parsed (This is the Canvas JSON, representing the content area):**
\`\`\`json
{{{canvasJson}}}
\`\`\`

**Generate the following project file structure and content:**

**1. Build & Config Files:**
*   **\`build.gradle.kts\` (Project Level):** Standard project-level gradle file with plugin definitions for Android, Kotlin, and KSP.
*   **\`app/build.gradle.kts\`:** App-level gradle file.
    - Include plugins: \`com.android.application\`, \`org.jetbrains.kotlin.android\`, \`com.google.devtools.ksp\`, \`kotlinx-serialization\`, \`com.google.gms.google-services\`.
    - Enable \`buildFeatures { compose = true }\`.
    - Reference dependencies from the version catalog (\`libs.versions.toml\`).
*   **\`gradle/libs.versions.toml\`**: A TOML file defining all library versions and dependencies.
    - Include versions for AGP, Kotlin, Koin, Coil, Firebase, Compose, etc.
    - Define libraries for koin, coil, firebase-bom, firebase-config, kotlinx-serialization, etc.
    - Define bundles for compose, koin, etc.
*   **\`settings.gradle.kts\`:** Standard settings file including \`:app\`.
*   **\`app/src/main/AndroidManifest.xml\`:** Standard manifest declaring \`MainActivity\`, \`.MyApplication\`, and internet permissions.
*   **\`app/google-services.json\`**: A placeholder \`google-services.json\` file. It's crucial for the build to pass.

**2. Presentation Layer (\`app/src/main/java/com/example/myapplication/presentation\`):**
*   **Base MVI classes (\`mvi\` sub-package):**
    - \`UiState.kt\`: A generic interface for all UI states.
    - \`UiEvent.kt\`: A generic interface for all user interactions.
    - \`UiEffect.kt\`: A generic interface for one-time side effects (e.g., Toasts, Navigation).
    - \`BaseViewModel.kt\`: An abstract ViewModel implementing MVI logic (state, event, effect flows).
*   **Screen-specific MVI (\`screen\` sub-package):**
    - \`MainContract.kt\`: Defines the specific State, Event, and Effect for the main screen.
        - \`State\`: Should include properties like \`isLoading: Boolean\` and \`components: List<ComponentModel>\`.
        - \`Event\`: Should include events like \`OnButtonClicked(clickId: String)\`.
        - \`Effect\`: Should include effects like \`ShowToast(message: String)\`.
    - \`MainViewModel.kt\`:
        - Inherits from \`BaseViewModel<MainContract.Event, MainContract.State, MainContract.Effect>\`.
        - Injects a \`GetUiConfigurationUseCase\` via constructor.
        - Fetches the UI configuration from the use case on initialization and updates the state.
        - Handles real-time updates from Firebase.
        - Handles \`OnButtonClicked\` events by sending a \`ShowToast\` effect.
    - \`MainActivity.kt\`:
        - The main entry point. Sets up the Koin context.
        - Calls a \`MainScreen\` composable.
    - \`MainScreen.kt\`:
        - The main UI Composable.
        - Collects state and effects from the ViewModel.
        - Renders a \`CircularProgressIndicator\` when loading.
        - Renders the dynamic UI by iterating through the list of \`ComponentModel\` and calling a \`DynamicUiComponent\` for each.
        - Uses a \`LaunchedEffect\` to handle one-time side effects (Toasts).
*   **Dynamic UI Composables (\`components\` sub-package):**
    - \`DynamicUiComponent.kt\`: A master composable that takes a \`ComponentModel\` and recursively renders the UI by calling other specific component composables based on the model type. This is the core of the dynamic rendering.
    - \`ComponentMapper.kt\`: Maps domain models to actual composables. This file will contain functions like \`@Composable fun CardComponent(model: ComponentModel, ...)\`, \`@Composable fun TextComponent(model: ComponentModel, ...)\`, etc. These composables use the model properties to configure standard Jetpack Compose elements (\`Card\`, \`Text\`, \`Button\`, \`Image\` via Coil, etc.).

**3. Domain Layer (\`app/src/main/java/com/example/myapplication/domain\`):**
*   **Models (\`model\` sub-package):**
    - \`ComponentModel.kt\`: A pure Kotlin data class representing a UI component in the domain. It should be simpler than the DTO and focus on what the UI needs to render.
*   **Repository Contract (\`repository/UiConfigRepository.kt\`):** An interface defining the contract for the data layer, e.g., \`fun getUiConfig(): Flow<List<ComponentModel>>\`.
*   **Use Case (\`usecase/GetUiConfigurationUseCase.kt\`):** A simple class that injects the repository and exposes a method to execute the repository's function.

**4. Data Layer (\`app/src/main/java/com/example/myapplication/data\`):**
*   **DTOs (\`model\` sub-package):**
    - Generate all necessary Kotlin \`@Serializable\` data classes (DTOs) to perfectly match the structure of the input Canvas JSON (\`{{{canvasJson}}}\`). This JSON is an array of objects. The main DTO should be \`ComponentDto\`. It will have \`id\`, \`type\`, \`name\`, \`parentId\`, and a \`properties\` object. The \`properties\` object should itself be a serializable data class, \`PropertiesDto\`, containing all possible component properties (\`text\`, \`fontSize\`, \`padding\`, etc.) as nullable fields. If the \`properties\` object contains a \`children\` array, it should be of type \`List<ComponentDto>\`. Make all properties in the DTOs nullable to handle missing fields gracefully.
*   **Mappers (\`mapper\` sub-package):**
    - \`ComponentMapper.kt\`: Contains extension functions to map \`ComponentDto\` to \`ComponentModel\` and vice versa. This is the bridge between the Data and Domain layers.
*   **Repository Implementation (\`repository/UiConfigRepositoryImpl.kt\`):**
    - Implements the \`UiConfigRepository\` interface.
    - Injects \`FirebaseRemoteConfig\`.
    - Contains logic to fetch the JSON string from Remote Config using a specific key (e.g., "COMPOSE_DESIGN_JSON_V2").
    - Sets up a listener for real-time updates from Remote Config.
    - Uses \`kotlinx.serialization.json.Json\` to parse the fetched string into a \`List<ComponentDto>\`.
    - Uses the mapper to convert the DTO list to a list of domain models.
    - Emits the domain model list through a Kotlin \`Flow\`.

**5. Dependency Injection (\`app/src/main/java/com/example/myapplication/di\`):**
*   **\`AppModule.kt\`:** Defines a Koin module that provides dependencies for the ViewModel.
*   **\`DataModule.kt\`:** Defines a Koin module that provides the Firebase Remote Config instance and binds the \`UiConfigRepositoryImpl\` to the \`UiConfigRepository\` interface.
*   **\`DomainModule.kt\`:** Defines a Koin module that provides the \`GetUiConfigurationUseCase\`.
*   **\`MyApplication.kt\`:** An \`Application\` class that initializes Koin with all the modules. Remember to add this class to the \`AndroidManifest.xml\`.

Ensure all files are complete, functional, and include all necessary imports. The output must be a single, valid JSON object.
`,
});

const generateJsonParserCodeFlow = ai.defineFlow(
  {
    name: 'generateJsonParserCodeFlow',
    inputSchema: GenerateJsonParserCodeInputSchema,
    outputSchema: GenerateJsonParserCodeOutputSchema,
  },
  async input => {
    // The input schema now uses 'canvasJson'
    const {output} = await prompt(input);
    if (!output?.files || typeof output.files !== 'object' || Object.keys(output.files).length === 0) {
      console.error("AI generation failed or returned invalid structure. Output:", output);
      throw new Error("AI failed to generate a valid project file structure for the JSON parser.");
    }
    return output;
  }
);

    