
'use server';

/**
 * @fileOverview Generates Kotlin code for a data class and a parser function from a given JSON structure.
 *
 * - generateJsonParserCode - A function that takes a JSON string and returns Kotlin code for parsing it.
 * - GenerateJsonParserCodeInput - The input type for the function.
 * - GenerateJsonParserCodeOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateJsonParserCodeInputSchema = z.object({
  customJson: z
    .string()
    .describe('A JSON string representing the UI design, for which Kotlin data classes and a parser will be generated.')
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
  kotlinCode: z
    .string()
    .describe('A string containing the generated Kotlin data classes and the parser function. This should be a single block of runnable Kotlin code.'),
});
export type GenerateJsonParserCodeOutput = z.infer<typeof GenerateJsonParserCodeOutputSchema>;

export async function generateJsonParserCode(input: GenerateJsonParserCodeInput): Promise<GenerateJsonParserCodeOutput> {
  return generateJsonParserCodeFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateJsonParserCodePrompt',
  input: {schema: GenerateJsonParserCodeInputSchema},
  output: {schema: GenerateJsonParserCodeOutputSchema},
  prompt: `You are an expert Kotlin developer specializing in JSON serialization. Your task is to generate Kotlin data classes and a parser function for a given JSON string.

**Requirements:**
1.  **Data Classes:** Generate appropriate Kotlin data classes that model the structure of the input JSON. Use the \`@Serializable\` annotation from \`kotlinx.serialization\` for each class. Use \`@SerialName\` for JSON keys that are not valid Kotlin identifiers (e.g., keys with hyphens or starting with numbers). Make all properties nullable to handle potential missing fields in the JSON.
2.  **Parser Function:** Create a top-level function named \`parseCustomUiFromJson\` that takes a single \`String\` argument (the JSON string) and returns an instance of the root data class (or a list of root data classes if the JSON is an array). The function should use \`kotlinx.serialization.json.Json\` to parse the string.
3.  **Imports:** Include all necessary imports, such as \`kotlinx.serialization.*\` and \`kotlinx.serialization.json.*\`.
4.  **Structure:** The final output should be a single string containing the complete, runnable Kotlin code.

**Input JSON:**
\`\`\`json
{{{customJson}}}
\`\`\`

**Example Output:**
\`\`\`kotlin
import kotlinx.serialization.*
import kotlinx.serialization.json.*

@Serializable
data class ModifierDto(
    val base: BaseModifierDto? = null
)

// ... other data classes

@Serializable
data class UiComponentDto(
    val card: CardComponentDto? = null
)

fun parseCustomUiFromJson(jsonString: String): UiComponentDto {
    val json = Json { ignoreUnknownKeys = true }
    return json.decodeFromString<UiComponentDto>(jsonString)
}
\`\`\`

Generate the Kotlin code now.
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
    if (!output?.kotlinCode) {
      throw new Error("AI failed to generate Kotlin code.");
    }
    return output;
  }
);
