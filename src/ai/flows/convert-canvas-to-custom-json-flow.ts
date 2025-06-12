'use server';
/**
 * @fileOverview Converts a canvas design JSON (hierarchical array of components)
 * into a user-specified structured "custom command" JSON format.
 *
 * - convertCanvasToCustomJson - A function that takes the canvas design JSON and returns the custom command JSON string.
 * - ConvertCanvasToCustomJsonInput - The input type for the function.
 * - ConvertCanvasToCustomJsonOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ConvertCanvasToCustomJsonInputSchema = z.object({
  designJson: z
    .string()
    .describe(
      'A JSON string representing the UI design from the canvas. This is typically an array of component objects, where each object has id, type, name, parentId, and properties. Container components have a "children" array within their properties, containing full child component objects.'
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
      { message: 'The input design data is not in a valid JSON format.' }
    ),
});
export type ConvertCanvasToCustomJsonInput = z.infer<typeof ConvertCanvasToCustomJsonInputSchema>;

const ConvertCanvasToCustomJsonOutputSchema = z.object({
  customJsonString: z
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
export type ConvertCanvasToCustomJsonOutput = z.infer<typeof ConvertCanvasToCustomJsonOutputSchema>;

export async function convertCanvasToCustomJson(
  input: ConvertCanvasToCustomJsonInput
): Promise<ConvertCanvasToCustomJsonOutput> {
  return convertCanvasToCustomJsonFlow(input);
}

const prompt = ai.definePrompt({
  name: 'convertCanvasToCustomJsonPrompt',
  input: {schema: ConvertCanvasToCustomJsonInputSchema},
  output: {schema: ConvertCanvasToCustomJsonOutputSchema},
  prompt: `You are an expert UI converter. Your task is to transform an input JSON (representing a canvas design) into a specific target "custom command" JSON format.

Input Canvas Design JSON Structure:
The input (\`{{{designJson}}}\`) is a JSON string representing an array of component objects. These are the children of a main root container (typically a Column).
Each component object in the input array generally has:
- "id": string
- "type": string (e.g., "Text", "Card", "Column")
- "name": string
- "parentId": string (ID of its parent within the input structure)
- "properties": object containing various attributes.
  - If a component is a container (like "Column", "Row", "Card", "Box"), its "properties" object will have a "children" array. This "children" array contains the full JSON objects of its child components.
  - Properties like "x", "y", and the original "parentId" from the input JSON are for the canvas's internal structure and should NOT be directly copied into the output "custom command" JSON. The output JSON structure dictates its own hierarchy.

Target "Custom Command" JSON Structure:
The output JSON MUST strictly follow this structure:
- The root of the JSON object should be a single key.
  - If the input \`designJson\` array (representing the children of the main canvas root) contains only ONE component, that component's type (lowercase) should be the root key of the output JSON. Its properties and children should be mapped accordingly.
  - If the input \`designJson\` array contains MULTIPLE components, the root key of the output JSON MUST be "column". The components from the input array should become the children of this root "column".
- This root component object must contain:
  - A "modifier" object. This "modifier" object should have a "base" object for common modifiers.
  - Component-specific properties (e.g., "content" for Text, "text" for Button).
  - If the component is a container (like Column, Row, Card, Box), it should have a "children" array. Each element in "children" must be an object structured in the same way (e.g., { "text": { "modifier": {...}, "content": "Hello" } }). Spacers do not have children.

Example of the TARGET "Custom Command" JSON structure for a Card containing a Row:
\`\`\`json
{
  "card": {
    "modifier": {
      "base": {
        "fillMaxWidth": true,
        "padding": { "all": 16 }
      }
    },
    "children": [
      {
        "row": {
          "modifier": { "base": {} },
          "children": [ /* ... other components ... */ ]
        }
      }
    ]
  }
}
\`\`\`

Modifier and Property Mapping Rules (from input component properties to output "custom command" JSON):
- General:
  - Omit any input properties that are null, an empty string, or not relevant to the target visual representation (e.g., "id", "name", "parentId" from the input structure, "x", "y").
- "fillMaxWidth": true (input) -> "fillMaxWidth": true (output, in modifier.base)
- "fillMaxHeight": true (input) -> "fillMaxHeight": true (output, in modifier.base)
- If "fillMaxWidth": true is set, do NOT also set a "width" property at the component level or in the modifier of the output.
- If "fillMaxHeight": true is set, do NOT also set a "height" property at the component level or in the modifier of the output.
- "width": X (number, input) -> "width": X (output, at component level if not fillMaxWidth)
- "height": X (number, input) -> "height": X (output, at component level if not fillMaxHeight)
- "width": "match_parent" (input) -> "fillMaxWidth": true (output, in modifier.base)
- "height": "match_parent" (input) -> "fillMaxHeight": true (output, in modifier.base)
- "width": "wrap_content" (input) -> (Omit width, let content define it, ensure "fillMaxWidth": false or absent)
- "height": "wrap_content" (input) -> (Omit height, let content define it, ensure "fillMaxHeight": false or absent)
- "padding": X (input, for all sides) -> "padding": { "all": X } (output, in modifier.base)
- "paddingTop", "paddingBottom", "paddingStart", "paddingEnd" (input) -> Map to "padding": { "top": Y, "start": X, ... } in modifier.base. If all are equal to a common value P, use "padding": { "all": P }.
- "backgroundColor": "#RRGGBB" (input) -> For Box/Card, can be component-level or in "modifier.base.background": { "color": "#RRGGBB" }. Prefer component level if simple.
- "textColor": "#RRGGBB" (input, for Text) -> "color": "#RRGGBB" (output, for Text component)
- "fontSize": N (input, for Text) -> "fontSize": N (output, for Text component)
- "text": "string" (input, for Text) -> "content": "string" (output, for Text component)
- "text": "string" (input, for Button) -> "text": "string" (output, for Button component)
- "cornerRadiusTopLeft", etc. (input) -> "modifier.base.background": { ..., "shape": "rounded", "cornerRadiusTopLeft": N, ... }. If all corners are equal (value C), can simplify shape to "modifier.base.background": { ..., "shape": "rounded", "cornerRadius": C }
- For Spacer:
    - "width": W, "height": H (input) -> "spacer": { "modifier": { "base": {} }, "width": W, "height": H }
    - "layoutWeight": X (input) -> "spacer": { "modifier": { "base": { "weight": X } }, "width": 0, "height": 0 } (default width/height to 0 if weighted)

Process the input \`{{{designJson}}}\` which is an array.
If the array has one element, its type (lowercase) is the root key.
If the array has multiple elements, the root key is "column", and the elements are its children.
Ensure the output is a single JSON object adhering to the "custom command" structure.
Only include properties in the output JSON if they have meaningful values from the input. Do not include properties if their input values were empty strings, null, or defaults that imply absence (e.g. padding 0).

Input Canvas Design JSON:
\`\`\`json
{{{designJson}}}
\`\`\`
`,
});

const convertCanvasToCustomJsonFlow = ai.defineFlow(
  {
    name: 'convertCanvasToCustomJsonFlow',
    inputSchema: ConvertCanvasToCustomJsonInputSchema,
    outputSchema: ConvertCanvasToCustomJsonOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error('AI did not return a response or the response was empty.');
    }
    // Ensure the output is a string, even if AI returns an object
    if (typeof output.customJsonString === 'object') {
       return { customJsonString: JSON.stringify(output.customJsonString, null, 2) };
    }
    return output;
  }
);

    