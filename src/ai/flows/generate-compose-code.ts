
'use server';

/**
 * @fileOverview Generates a complete, structured Android project with Jetpack Compose code from a JSON representation of a UI design.
 * This flow is designed to be robust and can generate a dynamic, MVI-based project.
 */

import {ai} from '@/ai/genkit';
import { GenerateComposeCodeInputSchema, GenerateComposeCodeOutputSchema, type GenerateComposeCodeInput, type GenerateComposeCodeOutput } from '@/types/ai-spec';
import { getAndroidProjectTemplates } from '@/lib/android-project-templates';
import { z } from 'zod';

const DynamicFilesOutputSchema = z.object({
  dtoFileContent: z.string().describe("The full Kotlin code for the ComponentDto.kt file."),
  rendererFileContent: z.string().describe("The full Kotlin code for the DynamicUiComponent.kt file.")
});


export async function generateComposeCode(input: GenerateComposeCodeInput): Promise<GenerateComposeCodeOutput> {
  
  // Start with the static template files.
  const projectFiles = getAndroidProjectTemplates();

  // The AI call is now more specific and asks for just the two dynamic files.
  const { text, usage } = await ai.generate({
      model: 'googleai/gemini-1.5-flash-latest',
      prompt: `You are an expert Kotlin and Jetpack Compose developer. Your primary task is to generate the content for two specific Kotlin files for an MVI Android project.

**YOUR TASK:**
Based on the JSON provided, generate the full, raw Kotlin code for \`ComponentDto.kt\` and \`DynamicUiComponent.kt\`.
Your final output MUST be ONLY a raw JSON object with the keys "dtoFileContent" and "rendererFileContent". Do not wrap it in markdown backticks or any other text.

**Input JSONs to use for MVI Generation:**
- \`contentJson\` (primary source for DTOs): \`\`\`json
${input.contentJson}
\`\`\`
- \`designJson\` (for context on the full screen structure): \`\`\`json
${input.designJson}
\`\`\`

**Generation Steps:**

**1. Generate \`ComponentDto.kt\` Content:**
   - **Purpose:** Create Kotlin \`data class\` DTOs that EXACTLY mirror the structure of the provided \`contentJson\`. This is for parsing the JSON from a remote source.
   - **Package:** \`com.example.myapplication.data.model\`
   - **Imports:** Must include \`kotlinx.serialization.Serializable\`.
   - **Requirements:**
     - **CRITICAL:** Every single property in every DTO data class MUST be **nullable** (e.g., \`val text: String? = null\`). This is essential for robust parsing.
     - Annotate every data class with \`@Serializable\`.
     - The DTOs must account for all properties seen in the input \`contentJson\`, including nested \`children\` of type \`List<ComponentDto>? = null\`.
   - Place the full, raw Kotlin code for this file into the "dtoFileContent" value of your JSON output.

**2. Generate \`DynamicUiComponent.kt\` Content:**
   - **Purpose:** Create a recursive Composable function that renders the UI based on the parsed DTOs.
   - **Package:** \`com.example.myapplication.presentation.components\`
   - **Imports:** All necessary Jetpack Compose imports, Coil for image loading (\`io.coil.compose.AsyncImage\`), and the DTOs from \`com.example.myapplication.data.model\`.
   - **Requirements:**
     - Define a main Composable: \`@Composable fun DynamicUiComponent(componentDto: ComponentDto)\`.
     - Use a \`when (componentDto.type)\` statement to handle different component types. For unknown types, render an empty composable.
     - **Safe Enum/Type Conversion:** Property values from JSON will be strings. You MUST safely convert them to the correct Compose types using a \`when\` statement with a sensible default in the \`else\` branch.
     - **Color Handling:** Prioritize theme colors (\`MaterialTheme.colorScheme\`) over hardcoded hex values if applicable.
     - For a Card component, use \`CardDefaults.cardElevation(defaultElevation = ...)\`.
     - Apply modifiers correctly based on the DTO properties. Use \`.dp\` and \`.sp\` for dimensions.
     - Handle \`onClickAction\` by adding a \`Modifier.clickable {}\` block.
     - For container components, recursively call \`DynamicUiComponent\` for each item in \`properties?.children\`.
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

  try {
      // Parse and validate the response against the schema
      const parsedOutput = DynamicFilesOutputSchema.parse(JSON.parse(responseJson));

      // Combine static templates with dynamically generated files
      const finalProjectFiles = {
        ...projectFiles,
        'app/src/main/java/com/example/myapplication/data/model/ComponentDto.kt': parsedOutput.dtoFileContent,
        'app/src/main/java/com/example/myapplication/presentation/components/DynamicUiComponent.kt': parsedOutput.rendererFileContent,
      };
      
      return { files: finalProjectFiles };

  } catch (e) {
      console.error("Error parsing AI response:", e);
      if (e instanceof z.ZodError) {
          throw new Error(`AI response validation failed: ${e.errors.map(err => `${err.path.join('.')} - ${err.message}`).join(', ')}`);
      }
      throw new Error("Failed to parse the JSON response from the AI.");
  }
}
