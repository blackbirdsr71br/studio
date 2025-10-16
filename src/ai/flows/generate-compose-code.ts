
'use server';

/**
 * @fileOverview Generates a complete, structured Android project with Jetpack Compose code from a JSON representation of a UI design.
 * This flow is designed to be robust and can generate either a static project or a dynamic, MVI-based project.
 */

import {ai} from '@/ai/genkit';
import { GenerateComposeCodeInputSchema, GenerateComposeCodeOutputSchema, type GenerateComposeCodeInput, type GenerateComposeCodeOutput } from '@/types/ai-spec';
import { getAndroidProjectTemplates } from '@/lib/android-project-templates';
import { z } from 'zod';

export async function generateComposeCode(input: GenerateComposeCodeInput): Promise<GenerateComposeCodeOutput> {
  return generateComposeCodeFlow(input);
}

// Define the schema for the AI's direct response (just the file content)
const DynamicFilesOutputSchema = z.object({
  dtoFileContent: z.string().describe("The full Kotlin code for the ComponentDto.kt file."),
  rendererFileContent: z.string().describe("The full Kotlin code for the DynamicUiComponent.kt file.")
});


const generateComposeCodeFlow = ai.defineFlow(
  {
    name: 'generateComposeCodeFlow',
    inputSchema: GenerateComposeCodeInputSchema,
    outputSchema: GenerateComposeCodeOutputSchema,
  },
  async (input) => {
    // Start with the static template files.
    const projectFiles = getAndroidProjectTemplates();

    const { text } = await ai.generate({
        model: 'googleai/gemini-1.5-flash-latest',
        prompt: `You are an expert Kotlin and Jetpack Compose developer. Your primary task is to generate a complete, runnable Android project that implements a UI design.

You will be given two JSON inputs:
1. \`designJson\`: A JSON object representing the entire screen structure, starting with a "Scaffold" component that contains "topBar", "content", and "bottomBar". This JSON is used for generating a simple, static project where all UI is in \`MainActivity.kt\`.
2. \`contentJson\`: A JSON string representing only the components within the "content" area of the screen. This JSON is used for generating a more advanced MVI (Model-View-Intent) project with a dynamic parser.

**YOUR TASK: Generate an MVI Project with a Dynamic Parser**

This is the PREFERRED and PRIMARY generation method. You must generate the content for two specific Kotlin files. Your final output MUST be ONLY a raw JSON object with the keys "dtoFileContent" and "rendererFileContent". Do not wrap it in markdown backticks or any other text.

**Input JSONs to use for MVI Generation:**
- \`contentJson\`: \`\`\`json
${input.contentJson}
\`\`\`
- \`designJson\` (for context, but \`contentJson\` is primary for DTOs): \`\`\`json
${input.designJson}
\`\`\`

**Generation Steps:**

**1. Generate \`ComponentDto.kt\` Content:**
   - **Purpose:** Create Kotlin \`data class\` DTOs that EXACTLY mirror the structure of the provided \`contentJson\`. This is for parsing the JSON from a remote source (like Firebase Remote Config) using \`kotlinx.serialization\`.
   - **Package:** \`com.example.myapplication.data.model\`
   - **Imports:** Must include \`kotlinx.serialization.Serializable\`.
   - **Requirements:**
     - **CRITICAL:** Every single property in every DTO data class MUST be **nullable** (e.g., \`val text: String? = null\`). This is essential for robust parsing and backward compatibility.
     - Annotate every data class with \`@Serializable\`.
     - The DTOs must account for all properties seen in the input \`contentJson\`, including \`id\`, \`type\`, \`name\`, \`parentId\`, \`properties\`, and any nested \`children\`.
     - The \`children\` property within a properties DTO should be of type \`List<ComponentDto>? = null\`.
   - Place the full, raw Kotlin code for this file into the "dtoFileContent" value of your JSON output.

**2. Generate \`DynamicUiComponent.kt\` Content:**
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
   - Place the full, raw Kotlin code for this file into the "rendererFileContent" value of your JSON output.

**Final Output MUST be ONLY a raw JSON object like this:**
\`\`\`json
{
  "dtoFileContent": "package com.example.myapplication.data.model...",
  "rendererFileContent": "package com.example.myapplication.presentation.components..."
}
\`\`\`
`,
    });

    if (!text()) {
        throw new Error("AI generation failed to return any text.");
    }
    
    // Clean up the response to get only the JSON
    let responseJson = text()!;
    const jsonMatch = responseJson.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("AI did not return a valid JSON object string.");
    }
    responseJson = jsonMatch[0];

    // Parse and validate the response
    const parsedOutput = DynamicFilesOutputSchema.parse(JSON.parse(responseJson));

    // Combine static templates with dynamically generated files
    const finalProjectFiles = {
      ...projectFiles,
      'app/src/main/java/com/example/myapplication/data/model/ComponentDto.kt': parsedOutput.dtoFileContent,
      'app/src/main/java/com/example/myapplication/presentation/components/DynamicUiComponent.kt': parsedOutput.rendererFileContent,
    };
    
    return { files: finalProjectFiles };
  }
);

