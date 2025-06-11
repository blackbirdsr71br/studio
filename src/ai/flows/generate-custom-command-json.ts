
'use server';
/**
 * @fileOverview Converts Jetpack Compose-like text commands into a user-specified structured JSON format.
 *
 * - generateCustomCommandJson - A function that takes text commands and returns a JSON string.
 * - GenerateCustomCommandJsonInput - The input type for the function.
 * - GenerateCustomCommandJsonOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateCustomCommandJsonInputSchema = z.object({
  commands: z
    .string()
    .min(10, {message: 'Commands must be at least 10 characters long.'})
    .describe('A string containing text-based commands that mimic Jetpack Compose syntax for UI design.'),
});
export type GenerateCustomCommandJsonInput = z.infer<typeof GenerateCustomCommandJsonInputSchema>;

const GenerateCustomCommandJsonOutputSchema = z.object({
  commandJson: z
    .string()
    .describe(
      'A JSON string representing the UI in the custom command format. The root key should be the lowercase name of the main component (e.g., "card", "column", "spacer").'
    )
    .refine(
      (data) => {
        try {
          JSON.parse(data);
          return true;
        } catch (e) {
          return false;
        }
      },
      {
        message:
          'The generated data is not in a valid JSON format.',
      }
    ),
});
export type GenerateCustomCommandJsonOutput = z.infer<typeof GenerateCustomCommandJsonOutputSchema>;

export async function generateCustomCommandJson(
  input: GenerateCustomCommandJsonInput
): Promise<GenerateCustomCommandJsonOutput> {
  return generateCustomCommandJsonFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateCustomCommandJsonPrompt',
  input: {schema: GenerateCustomCommandJsonInputSchema},
  output: {schema: GenerateCustomCommandJsonOutputSchema},
  prompt: `You are an expert Jetpack Compose to JSON UI converter. Your task is to transform Jetpack Compose-like text commands into a specific JSON format.

The output JSON MUST strictly follow this structure:
The root of the JSON object should be a single key, which is the lowercase name of the main component type described in the commands (e.g., "card", "text", "column", "spacer").
This root component object must contain:
- A "modifier" object. This "modifier" object should have a "base" object for common modifiers. Component-specific modifiers can be placed directly under "modifier" or within "base" if appropriate.
- Component-specific properties (e.g., "content" for Text, "text" for Button, "width"/"height" for Spacer if not using fill modifiers).
- If the component is a container (like Column, Row, Card, Box), it should have a "children" array. Each element in "children" must be an object structured in the same way (e.g., { "text": { "modifier": {...}, "content": "Hello" } }). Spacers do not have children.

Example of the target JSON structure for a Card containing a Row, which in turn contains a Box, a Spacer, and a Text:
\`\`\`json
{
  "card": {
    "modifier": {
      "base": {
        "fillMaxWidth": true,
        "padding": { "all": 16 },
        "clickId": "view_profile"
      }
    },
    "children": [
      {
        "row": {
          "modifier": {
            "base": { "verticalAlignment": "center" }
          },
          "children": [
            {
              "box": {
                "modifier": {
                  "base": {
                    "size": 64,
                    "background": { "color": "#EEEEEE", "shape": "circle" }
                  },
                  "contentAlignment": "center"
                },
                "children": [
                  {
                    "text": {
                      "modifier": { "base": {} },
                      "content": "JD",
                      "fontSize": 24,
                      "fontWeight": "bold",
                      "color": "#666666"
                    }
                  }
                ]
              }
            },
            { "spacer": { "modifier": { "base": {} }, "width": 16, "height": 0 } },
            {
              "column": {
                "modifier": { "base": {} },
                "children": [
                  {
                    "text": {
                      "modifier": { "base": {} },
                      "content": "John Doe",
                      "fontSize": 18,
                      "fontWeight": "bold"
                    }
                  },
                  {
                    "text": {
                      "modifier": { "base": {} },
                      "content": "john.doe@email.com",
                      "fontSize": 14,
                      "color": "#666666"
                    }
                  }
                ]
              }
            }
          ]
        }
      }
    ]
  }
}
\`\`\`

Modifier mapping examples (apply these within the "modifier.base" or component-specific modifier objects):
- Modifier.fillMaxWidth() -> "fillMaxWidth": true (in modifier.base)
- Modifier.fillMaxHeight() -> "fillMaxHeight": true (in modifier.base)
- If "fillMaxWidth": true is set, do NOT also set a "width" property at the component level or in the modifier.
- If "fillMaxHeight": true is set, do NOT also set a "height" property at the component level or in the modifier.
- Modifier.padding(X.dp) -> "padding": { "all": X }
- Modifier.padding(horizontal = X.dp, vertical = Y.dp) -> "padding": { "horizontal": X, "vertical": Y }
- Modifier.size(X.dp) -> "size": X
- Modifier.background(Color.Red, shape = CircleShape) -> "background": { "color": "#FF0000", "shape": "circle" }
- For alignments in Column: verticalArrangement = Arrangement.Center -> "verticalArrangement": "center" (in "modifier")
- For alignments in Row: horizontalArrangement = Arrangement.SpaceBetween -> "horizontalArrangement": "spaceBetween" (in "modifier")
- contentAlignment = Alignment.Center -> "contentAlignment": "center" (for Box, or in modifier for others if applicable)

Properties mapping examples:
- Text("Hello", fontSize = 20.sp, fontWeight = FontWeight.Bold) -> "text": { "modifier": { "base": {} }, "content": "Hello", "fontSize": 20, "fontWeight": "bold" }
- Button(onClick = { ... }) { Text("Submit") } -> "button": { "modifier": { "base": {} }, "text": "Submit", "clickId": "some_button_click" } (generate a placeholder clickId if an onClick is present)
- Spacer(Modifier.width(16.dp)) -> "spacer": { "modifier": { "base": {} }, "width": 16, "height": 0 } (if height is not specified, default to 0 for horizontal spacer, assuming no fillMaxHeight)
- Spacer(Modifier.height(16.dp)) -> "spacer": { "modifier": { "base": {} }, "width": 0, "height": 16 } (if width is not specified, default to 0 for vertical spacer, assuming no fillMaxWidth)
- Spacer(Modifier.weight(1f)) -> "spacer": { "modifier": { "base": { "weight": 1 } }, "width": 0, "height": 0 } (for flexible spacer, default width/height to 0 or sensible values if not filling)
- If a component like Spacer is meant to fill width due to Modifier.fillMaxWidth(), then "spacer": { "modifier": { "base": { "fillMaxWidth": true } } } (omit "width" property). Same for height.

Focus on representing the visual structure and properties. Simple onClick handlers can be represented by a "clickId" string property.
Ensure the output is a single JSON object where the key is the main component type (lowercase).

User's Jetpack Compose Commands:
\`\`\`
{{{commands}}}
\`\`\`
`,
});

const generateCustomCommandJsonFlow = ai.defineFlow(
  {
    name: 'generateCustomCommandJsonFlow',
    inputSchema: GenerateCustomCommandJsonInputSchema,
    outputSchema: GenerateCustomCommandJsonOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error('AI did not return a response or the response was empty.');
    }
    if (typeof output.commandJson === 'object') {
       return { commandJson: JSON.stringify(output.commandJson, null, 2) };
    }
    return output;
  }
);
