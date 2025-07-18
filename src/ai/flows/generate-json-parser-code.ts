
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
  prompt: `You are an expert Android developer specializing in Clean Architecture, MVI, and Jetpack Compose. Your task is to generate a complete, minimal, and functional Android project structure that parses and renders a UI from a specific JSON string provided below.

**THE MOST IMPORTANT INSTRUCTION:** The entire project must be built to parse and display the UI represented by this EXACT "Canvas JSON" input. The DTOs in the data layer MUST perfectly match the structure of this JSON. All properties in the DTOs must be nullable.

**Input Canvas JSON to be parsed (This is the Canvas JSON, representing the content area):**
\`\`\`json
{{{canvasJson}}}
\`\`\`

**Generate the following project file structure and content. MANY FILES HAVE THEIR EXACT CONTENT PROVIDED. YOU MUST USE THIS CONTENT.**

**1. Build & Config Files:**
*   **\`gradle/libs.versions.toml\`**: Generate this file with the following **EXACT** content.
    \`\`\`toml
    [versions]
    agp = "8.2.0"
    kotlin = "1.9.22"
    coreKtx = "1.13.1"
    junit = "4.13.2"
    androidxTestExtJunit = "1.1.5"
    espressoCore = "3.5.1"
    lifecycleRuntimeKtx = "2.8.1"
    activityCompose = "1.9.0"
    composeBom = "2024.05.00"
    koin = "3.5.6"
    coil = "2.6.0"
    firebaseBom = "33.1.0"
    kotlinxSerializationJson = "1.6.3"
    googleServices = "4.4.2"
    ksp = "1.9.22-1.0.17"

    [libraries]
    core-ktx = { group = "androidx.core", name = "core-ktx", version.ref = "coreKtx" }
    lifecycle-runtime-ktx = { group = "androidx.lifecycle", name = "lifecycle-runtime-ktx", version.ref = "lifecycleRuntimeKtx" }
    activity-compose = { group = "androidx.activity", name = "activity-compose", version.ref = "activityCompose" }
    compose-bom = { group = "androidx.compose", name = "compose-bom", version.ref = "composeBom" }
    ui = { group = "androidx.compose.ui", name = "ui" }
    ui-graphics = { group = "androidx.compose.ui", name = "ui-graphics" }
    ui-tooling-preview = { group = "androidx.compose.ui", name = "ui-tooling-preview" }
    material3 = { group = "androidx.compose.material3", name = "material3" }
    coil-compose = { group = "io.coil-kt", name = "coil-compose", version.ref = "coil" }
    koin-android = { group = "io.insert-koin", name = "koin-android", version.ref = "koin" }
    koin-androidx-compose = { group = "io.insert-koin", name = "koin-androidx-compose", version.ref = "koin" }
    firebase-bom = { group = "com.google.firebase", name = "firebase-bom", version.ref = "firebaseBom" }
    firebase-config = { group = "com.google.firebase", name = "firebase-config-ktx" }
    firebase-analytics = { group = "com.google.firebase", name = "firebase-analytics-ktx" }
    kotlinx-serialization-json = { group = "org.jetbrains.kotlinx", name = "kotlinx-serialization-json", version.ref = "kotlinxSerializationJson" }
    junit = { group = "junit", name = "junit", version.ref = "junit" }
    androidx-test-ext-junit = { group = "androidx.test.ext", name = "junit", version.ref = "androidxTestExtJunit" }
    espresso-core = { group = "androidx.test.espresso", name = "espresso-core", version.ref = "espressoCore" }
    ui-test-junit4 = { group = "androidx.compose.ui", name = "ui-test-junit4" }
    ui-tooling = { group = "androidx.compose.ui", name = "ui-tooling" }
    ui-test-manifest = { group = "androidx.compose.ui", name = "ui-test-manifest" }

    [plugins]
    androidApplication = { id = "com.android.application", version.ref = "agp" }
    kotlinAndroid = { id = "org.jetbrains.kotlin.android", version.ref = "kotlin" }
    kotlinSerialization = { id = "org.jetbrains.kotlin.plugin.serialization", version.ref = "kotlin" }
    googleServices = { id = "com.google.gms.google-services", version.ref = "googleServices" }
    ksp = { id = "com.google.devtools.ksp", version.ref = "ksp" }

    [bundles]
    compose = ["ui", "ui-graphics", "ui-tooling-preview", "material3"]
    \`\`\`
*   **\`build.gradle.kts\` (Project Level):** Standard project-level gradle file with plugin definitions for Android, Kotlin, KSP, and Google Services.
*   **\`app/build.gradle.kts\`:** App-level gradle file. Include plugins and dependencies using aliases from the version catalog.
*   **\`settings.gradle.kts\`**: Generate this file with the EXACT content:
    \`\`\`kotlin
    pluginManagement {
        repositories {
            google()
            mavenCentral()
            gradlePluginPortal()
        }
    }
    dependencyResolutionManagement {
        repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
        repositories {
            google()
            mavenCentral()
        }
    }

    rootProject.name = "My Application"
    include(":app")
    \`\`\`
*   **\`gradle.properties\`**: Generate this file with the EXACT content:
    \`\`\`properties
    org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8
    android.useAndroidX=true
    kotlin.code.style=official
    android.nonTransitiveRClass=true
    \`\`\`
*   **\`app/src/main/AndroidManifest.xml\`:** Standard manifest declaring \`MainActivity\`, \`.MyApplication\`, and internet permissions.
*   **\`app/google-services.json\`**: A placeholder \`google-services.json\` file. It's crucial for the build to pass.

**2. Presentation Layer (\`app/src/main/java/com/example/myapplication/presentation\`):**
*   **Base MVI classes (\`mvi\` sub-package):**
    - \`UiState.kt\`, \`UiEvent.kt\`, \`UiEffect.kt\`: Empty marker interfaces.
    - **\`BaseViewModel.kt\`**: Generate this file with the following **EXACT** content:
        \`\`\`kotlin
        package com.example.myapplication.presentation.mvi

        import androidx.lifecycle.ViewModel
        import androidx.lifecycle.viewModelScope
        import kotlinx.coroutines.channels.Channel
        import kotlinx.coroutines.flow.Flow
        import kotlinx.coroutines.flow.MutableSharedFlow
        import kotlinx.coroutines.flow.MutableStateFlow
        import kotlinx.coroutines.flow.SharedFlow
        import kotlinx.coroutines.flow.StateFlow
        import kotlinx.coroutines.flow.asSharedFlow
        import kotlinx.coroutines.flow.asStateFlow
        import kotlinx.coroutines.flow.receiveAsFlow
        import kotlinx.coroutines.launch

        abstract class BaseViewModel<E : UiEvent, S : UiState, F : UiEffect> : ViewModel() {

            private val initialState: S by lazy { createInitialState() }
            abstract fun createInitialState(): S

            val currentState: S
                get() = uiState.value

            private val _uiState: MutableStateFlow<S> = MutableStateFlow(initialState)
            val uiState: StateFlow<S> = _uiState.asStateFlow()

            private val _event: MutableSharedFlow<E> = MutableSharedFlow()
            val event: SharedFlow<E> = _event.asSharedFlow()

            private val _effect: Channel<F> = Channel()
            val effect: Flow<F> = _effect.receiveAsFlow()

            init {
                subscribeEvents()
            }

            private fun subscribeEvents() {
                viewModelScope.launch {
                    event.collect {
                        handleEvent(it)
                    }
                }
            }

            abstract fun handleEvent(event: E)

            fun setEvent(event: E) {
                val newEvent = event
                viewModelScope.launch { _event.emit(newEvent) }
            }

            protected fun setState(reduce: S.() -> S) {
                val newState = currentState.reduce()
                _uiState.value = newState
            }

            protected fun setEffect(builder: () -> F) {
                val effectValue = builder()
                viewModelScope.launch { _effect.send(effectValue) }
            }
        }
        \`\`\`
*   **Screen-specific MVI (\`screen\` sub-package):**
    - **\`MainContract.kt\`**: Generate this file with the following **EXACT** content:
        \`\`\`kotlin
        package com.example.myapplication.presentation.screen

        import com.example.myapplication.domain.model.ComponentModel
        import com.example.myapplication.presentation.mvi.UiEffect
        import com.example.myapplication.presentation.mvi.UiEvent
        import com.example.myapplication.presentation.mvi.UiState

        data class ComponentsUiState(
            val isLoading: Boolean = false,
            val components: List<ComponentModel> = emptyList(),
            val error: String? = null
        ) : UiState

        sealed class ComponentsUiEvent : UiEvent {
            object LoadComponents : ComponentsUiEvent()
            object RefreshComponents : UiEvent()
            data class OnComponentClick(val clickId: String) : ComponentsUiEvent()
        }

        sealed class ComponentsUiEffect : UiEffect {
            data class ShowToast(val message: String) : ComponentsUiEffect()
            data class NavigateTo(val route: String) : ComponentsUiEffect()
        }
        \`\`\`
    - \`MainViewModel.kt\`: Implements \`BaseViewModel<ComponentsUiEvent, ComponentsUiState, ComponentsUiEffect>\`. Injects \`GetUiConfigurationUseCase\`. On \`init\`, sends a \`LoadComponents\` event. Handles events to call the use case and update state.
    - \`MainActivity.kt\`: The main entry point. Sets up the Koin context and calls a \`MainScreen\` composable.
    - \`MainScreen.kt\`: The main UI Composable. Collects state and effects from the ViewModel. Renders a \`CircularProgressIndicator\` during loading, an error message, or the dynamic UI by calling \`DynamicUiComponent\`.
*   **Dynamic UI Composables (\`components\` sub-package):**
    - **\`DynamicUiComponent.kt\`**: This is the most important UI file. A master composable that takes a \`ComponentModel\` and recursively renders the UI by calling other specific component composables based on the model type. This is the core of the dynamic rendering. It must handle nested children correctly.
    - **\`ComponentMapper.kt\`**: Maps domain models to actual composables. This file will contain functions like \`@Composable fun CardComponent(model: ComponentModel, ...)\`, etc. These composables use the model properties to configure standard Jetpack Compose elements (\`Card\`, \`Text\`, \`Button\`, \`Image\` via Coil, etc.).

**3. Domain Layer (\`app/src/main/java/com/example/myapplication/domain\`):**
*   **Models (\`model\` sub-package):**
    - \`ComponentModel.kt\`: A pure Kotlin data class representing a UI component in the domain. It must be a recursive structure, containing a list of child \`ComponentModel\` objects.
*   **Repository Contract (\`repository/UiConfigRepository.kt\`):** An interface defining the contract for the data layer, e.g., \`fun getUiConfig(): Flow<Result<List<ComponentModel>>>\`.
*   **Use Case (\`usecase/GetUiConfigurationUseCase.kt\`):** A class that injects the repository and exposes a method to execute the repository's function.

**4. Data Layer (\`app/src/main/java/com/example/myapplication/data\`):**
*   **DTOs (\`model\` sub-package):**
    - **CRITICAL**: Generate all necessary Kotlin \`@Serializable\` data classes (DTOs) to perfectly match the structure of the input Canvas JSON (\`{{{canvasJson}}}\`). This JSON is an array of objects.
    - The main DTO should be \`ComponentDto\`. It will have \`id\`, \`type\`, \`name\`, \`parentId\`, and a \`properties\` object.
    - The \`properties\` object should itself be a serializable data class, \`PropertiesDto\`, containing all possible component properties found in the input JSON. If the \`properties\` object contains a \`children\` array, the \`PropertiesDto\` must have a \`val children: List<ComponentDto>? = null\` property.
    - **CRUCIAL**: Make all properties in ALL DTOs **nullable** (e.g., \`val text: String? = null\`) to handle missing or \`null\` fields in the JSON gracefully.
*   **Mappers (\`mapper\` sub-package):**
    - \`ComponentMapper.kt\`: Contains extension functions to map \`ComponentDto\` to \`ComponentModel\` (domain model). This mapping must be recursive to handle the children correctly.
*   **Repository Implementation (\`repository/UiConfigRepositoryImpl.kt\`):**
    - Implements the \`UiConfigRepository\` interface.
    - Injects \`FirebaseRemoteConfig\`.
    - Contains logic to fetch the JSON string from Remote Config using the key "COMPOSE_DESIGN_JSON_V2".
    - **Sets up a listener for real-time updates from Firebase.** When an update is detected, it re-fetches and re-parses the JSON.
    - Uses \`kotlinx.serialization.json.Json { ignoreUnknownKeys = true, isLenient = true }\` to parse the fetched string into a \`List<ComponentDto>\`.
    - Maps the DTO list to a list of domain models and emits it wrapped in a \`Result\` object.

**5. Dependency Injection (\`app/src/main/java/com/example/myapplication/di\`):**
*   **\`AppModule.kt\`, \`DataModule.kt\`, \`DomainModule.kt\`:** Koin modules providing all necessary dependencies.
*   **\`MyApplication.kt\`:** An \`Application\` class that initializes Koin with all the modules.

Ensure all files are complete, functional, and include all necessary imports. The output must be a single, valid JSON object with the "files" root key. Do not include files like \`gradlew\` or \`.jar\` files.
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

