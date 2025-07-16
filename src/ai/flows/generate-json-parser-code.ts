
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
  prompt: `You are an expert Android developer specializing in Clean Architecture, MVI, and Server-Driven UI with Jetpack Compose. Your task is to generate a complete, minimal, and production-ready Android project that can fetch, parse, and render a UI from a given JSON structure.

The final output MUST be a JSON object where the root key is "files". The value of "files" must be another object where keys are the string file paths and values are the string file contents.

**Example Output Structure:**
\`\`\`json
{
  "files": {
    "build.gradle.kts": "...",
    "app/build.gradle.kts": "...",
    "app/src/main/AndroidManifest.xml": "...",
    "app/src/main/java/com/example/myapplication/MainActivity.kt": "..."
  }
}
\`\`\`

The app's UI will be based on the following JSON representation (\`{{{customJson}}}\`).

**Project Architecture and Requirements:**
Generate the following files with the specified content. Ensure all files are complete, functional, and follow best practices.

**1. Dependency Injection with Koin:**
   - Set up Koin for dependency injection.
   - Create an Application class that initializes Koin.
   - Define Koin modules for the repository and ViewModel.

**2. MVI (Model-View-Intent) Pattern:**
   - **Contract:** A file defining 'UiState', 'UiEvent', and 'UiEffect'.
   - **ViewModel:** Inherits from a 'BaseViewModel' and handles business logic, state management, and side effects.
   - **UI:** The Composable screen observes the ViewModel's state and sends events.

**3. Clean Architecture Layers:**
   - **Presentation:** (MainActivity, MainScreen, MainViewModel, MainContract, UiModels)
   - **Domain:** (Repository interface, Domain Models, Mappers)
   - **Data:** (Repository implementation, DTOs, Firebase Remote Config logic)

**File Generation Specifications:**

**A. Project & App Level Gradle Files:**
   - **'build.gradle.kts' (Project Level):** Define plugins for application, kotlin, and kotlinx-serialization.
   - **'app/build.gradle.kts' (App Level):**
     - Apply necessary plugins: 'com.android.application', 'kotlin-android', 'kotlinx-serialization'.
     - Enable Compose and set compiler extension version.
     - Include dependencies for:
       - Core KTX, Lifecycle, Activity Compose
       - **Jetpack Compose BOM**
       - **Koin** for Android ('io.insert-koin:koin-android', 'io.insert-koin:koin-androidx-compose')
       - **Firebase BOM** and **Remote Config** ('firebase-config-ktx')
       - **Kotlinx Serialization** ('kotlinx-serialization-json')
       - **Coil** for image loading ('io.coil-kt:coil-compose')

**B. Application Setup:**
   - **'app/src/main/AndroidManifest.xml':**
     - Declare the main launcher activity.
     - Add the **INTERNET** permission.
     - Reference a custom Application class in the '<application>' tag ('android:name=".MyApplication"').
   - **'app/src/main/java/com/example/myapplication/MyApplication.kt':**
     - An 'Application' class that initializes Koin using 'startKoin'.

**C. Core UI and Presentation Layer:**
   - **'app/src/main/java/com/example/myapplication/MainActivity.kt':** The entry point. Sets up the theme and calls 'MainScreen'.
   - **'app/src/main/java/com/example/myapplication/ui/MainScreen.kt':**
     - The main Composable screen.
     - Injects and observes 'MainViewModel'.
     - Handles displaying loading states, error messages, and the dynamic UI.
     - Collects side effects ('UiEffect') using a 'LaunchedEffect'.
   - **'app/src/main/java/com/example/myapplication/ui/components/DynamicUiRenderer.kt':**
     - Contains the core rendering logic: '@Composable fun DynamicUiRenderer(components: List<UiComponentModel>)'.
     - Uses a 'when(component.type)' block to render different components.
     - Recursively calls itself for container components' children.
     - Uses **Coil's 'AsyncImage'** for image loading.
   - **'app/src/main/java/com/example/myapplication/ui/mvi/MainContract.kt':**
     - Defines the MVI contract:
       - 'sealed interface UiEvent': e.g., 'OnRetryClicked'.
       - 'data class UiState(...)': e.g., 'isLoading: Boolean', 'error: String?', 'components: List<UiComponentModel>'.
       - 'sealed interface UiEffect': e.g., 'ShowToast(message: String)'.
   - **'app/src/main/java/com/example/myapplication/ui/mvi/MainViewModel.kt':**
     - Inherits from 'BaseViewModel<UiEvent, UiState, UiEffect>'.
     - Injects the 'UiRepository'.
     - Fetches the UI configuration and updates the state.
     - Implements a 'handleEvent' function to process user actions.
     - **Crucially, it should call the repository method to listen for real-time updates.**
   - **'app/src/main/java/com/example/myapplication/ui/mvi/BaseViewModel.kt':**
     - An abstract base class for ViewModels to handle MVI boilerplate for StateFlow, SharedFlow, and event handling.
   - **'app/src/main/java/com/example/myapplication/ui/theme/Theme.kt':** Standard theme file.

**D. Domain Layer:**
   - **'app/src/main/java/com/example/myapplication/domain/UiRepository.kt':**
     - An **interface** defining the contract for data operations, e.g., 'fun getUiComponents(): Flow<Result<List<UiComponentModel>>>'.
   - **'app/src/main/java/com/example/myapplication/domain/models/UiComponentModel.kt':**
     - The domain/UI model for a component. Should be clean and not tied to serialization.
   - **'app/src/main/java/com/example/myapplication/domain/mappers/UiModelMapper.kt':**
     - An extension function 'fun ComponentDto.toDomain(): UiComponentModel' to map from the data layer DTO to the domain model.

**E. Data Layer:**
   - **'app/src/main/java/com/example/myapplication/data/UiRepositoryImpl.kt':**
     - The implementation of 'UiRepository'.
     - Injects 'FirebaseRemoteConfig'.
     - Contains the logic to fetch the initial config and **set up a listener for real-time updates** using 'addOnConfigUpdateListener'.
     - It should parse the JSON string from Remote Config into DTOs and then map them to domain models.
     - It should use a 'callbackFlow' to emit updates.
   - **'app/src/main/java/com/example/myapplication/data/dtos/ComponentDto.kt':**
     - A '@Serializable data class' that **exactly matches the provided JSON structure**. Use '@SerialName' for keys with hyphens. All properties should be nullable to handle variations in the JSON.
   - **'app/src/main/java/com/example/myapplication/di/AppModule.kt':**
     - A Koin module that provides instances of 'UiRepository' and 'MainViewModel'.

**Input JSON to be Parsed by the Generated App:**
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

      