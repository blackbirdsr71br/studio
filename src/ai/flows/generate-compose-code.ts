'use server';

/**
 * @fileOverview Generates a complete, structured Android project with Jetpack Compose code from a JSON representation of a UI design.
 * This flow is designed to be robust and can generate either a static project or a dynamic, MVI-based project.
 */

import {ai} from '@/ai/genkit';
import { GenerateComposeCodeInputSchema, GenerateComposeCodeOutputSchema, type GenerateComposeCodeInput, type GenerateComposeCodeOutput } from '@/types/ai-spec';
import { getAndroidProjectTemplates } from '@/lib/android-project-templates';

export async function generateComposeCode(input: GenerateComposeCodeInput): Promise<GenerateComposeCodeOutput> {
  return generateComposeCodeFlow(input);
}

const generateComposeCodeFlow = ai.defineFlow(
  {
    name: 'generateComposeCodeFlow',
    inputSchema: GenerateComposeCodeInputSchema,
    outputSchema: GenerateComposeCodeOutputSchema,
  },
  async (input) => {
    // Start with the static template files.
    const projectFiles = getAndroidProjectTemplates();

    const { output } = await ai.generate({
        model: 'googleai/gemini-1.5-flash-latest',
        output: {
            schema: GenerateComposeCodeOutputSchema,
        },
        prompt: `You are an expert Kotlin and Jetpack Compose developer. Your primary task is to generate a complete, runnable Android project that implements a UI design.

You will be given two JSON inputs:
1. \`designJson\`: A JSON object representing the entire screen structure, starting with a "Scaffold" component that contains "topBar", "content", and "bottomBar". This JSON is used for generating a simple, static project where all UI is in \`MainActivity.kt\`.
2. \`contentJson\`: A JSON string representing only the components within the "content" area of the screen. This JSON is used for generating a more advanced MVI (Model-View-Intent) project with a dynamic parser.

**YOUR TASK: Generate an MVI Project with a Dynamic Parser**

This is the PREFERRED and PRIMARY generation method. You should generate a complete MVI project based on the provided static templates and two dynamically generated Kotlin files.

**Input JSONs to use for MVI Generation:**
- \`contentJson\`: \`\`\`json
${input.contentJson}
\`\`\`
- \`designJson\` (for context, but \`contentJson\` is primary for DTOs): \`\`\`json
${input.designJson}
\`\`\`

**Generation Steps:**

**1. Start with the Base Project Templates:**
   - I will provide you with a set of base project files (build scripts, AndroidManifest, etc.). You MUST use these files as the foundation.
   - Your output must be a JSON object where the root key is "files", and the value is an object mapping file paths to their complete string content.

**2. Dynamically Generate Two Kotlin Files:**
   You MUST generate the content for these two specific files.

   **A. \`app/src/main/java/com/example/myapplication/data/model/ComponentDto.kt\`**
      - **Purpose:** Create Kotlin \`data class\` DTOs that EXACTLY mirror the structure of the provided \`contentJson\`. This is for parsing the JSON from a remote source (like Firebase Remote Config) using \`kotlinx.serialization\`.
      - **Package:** \`com.example.myapplication.data.model\`
      - **Imports:** Must include \`kotlinx.serialization.Serializable\`.
      - **Requirements:**
        - **CRITICAL:** Every single property in every DTO data class MUST be **nullable** (e.g., \`val text: String? = null\`). This is essential for robust parsing and backward compatibility.
        - Annotate every data class with \`@Serializable\`.
        - The DTOs must account for all properties seen in the input \`contentJson\`, including \`id\`, \`type\`, \`name\`, \`parentId\`, \`properties\`, and any nested \`children\`.
        - The \`children\` property within a properties DTO should be of type \`List<ComponentDto>? = null\`.

   **B. \`app/src/main/java/com/example/myapplication/presentation/components/DynamicUiComponent.kt\`**
      - **Purpose:** Create a recursive Composable function that renders the UI based on the parsed DTOs.
      - **Package:** \`com.example.myapplication.presentation.components\`
      - **Imports:** All necessary Jetpack Compose imports (\`androidx.compose.material3.*\` for Material 3 components), Coil for image loading (\`io.coil.compose.AsyncImage\`), and the DTOs from \`com.example.myapplication.data.model\`.
      - **Requirements:**
        - Define a main Composable: \`@Composable fun DynamicUiComponent(componentDto: ComponentDto)\`.
        - Use a \`when (componentDto.type)\` statement to handle different component types (\`Text\`, \`Button\`, \`Column\`, etc.). For unknown types, render an empty composable.
        - **Safe Enum/Type Conversion:** Property values from JSON will be strings. You MUST safely convert them to the correct Compose types using a \`when\` statement with a sensible default in the \`else\` branch.
        - **Color Handling:** Prioritize theme colors (\`MaterialTheme.colorScheme\`) over hardcoded hex values. Only parse hex strings if they are explicitly provided and not a standard theme color key.
        - For a Card component, use \`CardDefaults.cardElevation(defaultElevation = ...)\`.
        - Apply modifiers correctly based on the DTO properties. Use \`.dp\` and \`.sp\` for dimensions and provide safe defaults.
        - Handle \`onClickAction\` by adding a \`Modifier.clickable {}\` block.
        - For container components (\`Column\`, \`Row\`, \`Card\`), recursively call \`DynamicUiComponent\` for each item in \`properties?.children\`.

**Final Output Structure:**

Your final output MUST be a single JSON object. The root key must be "files". The value of "files" is an object containing ALL project files: the static templates I provide, PLUS the two dynamic files you generate.

**Example Final JSON Output Structure:**
\`\`\`json
{
  "files": {
    "build.gradle.kts": "...",
    "app/build.gradle.kts": "...",
    "app/src/main/AndroidManifest.xml": "...",
    "app/src/main/java/com/example/myapplication/data/model/ComponentDto.kt": "[CONTENT YOU GENERATE]",
    "app/src/main/java/com/example/myapplication/presentation/components/DynamicUiComponent.kt": "[CONTENT YOU GENERATE]",
    "...": "..."
  }
}
\`\`\`

Do not add any extra explanations. Just generate the complete JSON object.
`,
    });


    if (!output?.files || typeof output.files !== 'object' || Object.keys(output.files).length === 0) {
      console.error("AI generation failed or returned invalid structure. Output:", output);
      throw new Error("AI failed to generate a valid project file structure.");
    }

    // The AI is now responsible for generating the complete file set.
    // We trust it to include the base templates and add its dynamic files.
    // This is a more robust approach than trying to merge them manually.
    
    // Quick validation to ensure the dynamic files were generated.
    const requiredFiles = [
        'app/src/main/java/com/example/myapplication/data/model/ComponentDto.kt',
        'app/src/main/java/com/example/myapplication/presentation/components/DynamicUiComponent.kt'
    ];

    for (const requiredFile of requiredFiles) {
        if (!output.files[requiredFile]) {
            console.error(`AI did not generate the required file: ${requiredFile}`);
            throw new Error(`Generation failed: Missing required file ${requiredFile}.`);
        }
    }
    
    // Merge the AI-generated files (which should include templates) with our base templates
    // just in case the AI missed some. The AI's version takes precedence.
    const finalProjectFiles = { ...projectFiles, ...output.files };
    
    return { files: finalProjectFiles };
  }
);
