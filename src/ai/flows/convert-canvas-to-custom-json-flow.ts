
'use server';
/**
 * @fileOverview Converts a design from the canvas (ModalJsonSchema format) into a specified custom JSON structure.
 *
 * - convertCanvasToCustomJsonFlow - A function that takes the canvas design JSON and returns the custom formatted JSON.
 * - ConvertCanvasToCustomJsonInput - The input type for the function.
 * - ConvertCanvasToCustomJsonOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ConvertCanvasToCustomJsonInputSchema = z.object({
  designJson: z
    .string()
    .describe(
      'A JSON string representing an array of UI components from the canvas, formatted according to the application\'s ModalJsonSchema.'
    )
    .refine(
      (data) => {
        try {
          JSON.parse(data); // Check if it's valid JSON
          // Further validation against ModalJsonSchema could be done here if necessary,
          // but the input action should provide already validated data.
          return true;
        } catch (e) {
          return false;
        }
      },
      { message: 'The design data is not in a valid JSON format.' }
    ),
});
export type ConvertCanvasToCustomJsonInput = z.infer<typeof ConvertCanvasToCustomJsonInputSchema>;

const ConvertCanvasToCustomJsonOutputSchema = z.object({
  customJsonString: z
    .string()
    .describe(
      "The canvas design converted to the custom JSON format, as a string. The root key of this JSON string should be the main component's type in lowercase."
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
          'The generated custom JSON data is not in a valid JSON format.',
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
  prompt: `You are an expert UI converter. Your task is to transform a UI design, provided as a JSON string (which is an array of component objects from a design canvas), into a specific custom JSON format.

Input Design JSON (an array of component objects, process the first component in the array as the main one):
\`\`\`json
{{{designJson}}}
\`\`\`

Target Custom JSON Structure:
The output JSON MUST be a single object where the root key is the lowercase 'type' of the main component from the input (e.g., if the main component is "Card", the root key is "card").
This root component object must contain:
- A "modifier" object. This "modifier" object should have a "base" object for common modifiers. Component-specific modifiers (like 'contentAlignment' for Box) can be placed directly under "modifier".
- Component-specific properties (e.g., "content" for Text, "text" for Button, "width"/"height" for Spacer if not using fill modifiers).
- If the component is a container (like Column, Row, Card, Box), it should have a "children" array. Each element in "children" must be an object structured in the same way (e.g., { "text": { "modifier": {...}, "content": "Hello" } }). Spacers do not have children.

Property Mapping Guidelines:
- From input 'properties.fillMaxWidth': If true, output 'modifier.base.fillMaxWidth: true'. Do NOT include 'width' in 'modifier.base' or at component level.
- From input 'properties.fillMaxHeight': If true, output 'modifier.base.fillMaxHeight: true'. Do NOT include 'height' in 'modifier.base' or at component level.
- From input 'properties.width' (only if 'fillMaxWidth' is false or absent):
    - If 'width' is a number, output 'modifier.base.width: X' (for most components) or 'width: X' (for Spacer).
    - If 'width' is "wrap_content", this is default, no specific 'width' modifier needed unless to override a previous 'fillMaxWidth'.
    - If 'width' is "match_parent", map to 'modifier.base.fillMaxWidth: true'.
- From input 'properties.height' (only if 'fillMaxHeight' is false or absent):
    - If 'height' is a number, output 'modifier.base.height: X' (for most components) or 'height: X' (for Spacer).
    - If 'height' is "wrap_content", this is default.
    - If 'height' is "match_parent", map to 'modifier.base.fillMaxHeight: true'.
- From input 'properties.layoutWeight': If > 0, output 'modifier.base.weight: X'.
- Padding:
    - If input 'properties.padding' (number for all sides) exists: output 'modifier.base.padding: { all: X }'.
    - Else, if 'paddingStart', 'paddingTop', 'paddingEnd', 'paddingBottom' exist: output 'modifier.base.padding: { start: S, top: T, end: E, bottom: B }' (omit sides with 0 or undefined padding).
- Background Color:
    - From input 'properties.backgroundColor': If it's a hex color, output 'modifier.base.background: { color: "#RRGGBB" }'. If component also has corner radius properties, include shape in background modifier e.g. 'modifier.base.background: { color: "#RRGGBB", shape: "rounded" }'. If all corners are equal and large enough for circle (e.g. size/2), use 'shape: "circle"'.
- Corner Radius:
    - From input 'properties.cornerRadiusTopLeft', etc.: If these exist and are non-zero, include them in 'modifier.base.clip: { topLeft: X, topRight: Y, ... }' or similar, or if they define a shape for background (see above). Generally prefer applying shape via background if possible, or clip if specifically for clipping content. For simplicity for this custom format, if a background color exists and corner radii exist, assume the radii apply to the background shape.
- Text Component (input type 'Text'):
    - 'properties.text' -> 'content: "..."' (direct property of the "text" object).
    - 'properties.fontSize' -> 'fontSize: X' (direct property).
    - 'properties.textColor' -> 'color: "#RRGGBB"' (direct property).
    - 'properties.fontWeight' ('Bold'/'Normal') -> 'fontWeight: "bold"' or 'fontWeight: "normal"'.
- Image Component (input type 'Image'):
    - 'properties.src' -> 'src: "url_or_data_uri"' (direct property of "image" object).
    - 'properties.contentDescription' -> 'contentDescription: "..."'.
    - 'properties.contentScale' maps to a 'contentScale' property like 'contentScale: "cover"' etc.
- Button Component (input type 'Button'):
    - 'properties.text' -> 'text: "..."' (direct property of "button" object).
    - 'properties.backgroundColor' -> can be part of 'modifier.base.background' for the button.
    - 'properties.textColor' -> 'color: "#RRGGBB"' as a direct property if the format doesn't put button text color in modifier. Assume direct.
- Spacer Component (input type 'Spacer'):
    - Output structure: '{ "spacer": { "modifier": { "base": { /* weight if any */ } }, "width": X, "height": Y } }'.
    - If 'layoutWeight' > 0, width/height should often be 0 unless a minimum size is also intended.
- Container Alignment (e.g., Column, Row, Box, Card):
    - For Column: 'verticalArrangement', 'horizontalAlignment'. Map to 'modifier.verticalArrangement', 'modifier.horizontalAlignment'.
    - For Row: 'horizontalArrangement', 'verticalAlignment'. Map to 'modifier.horizontalArrangement', 'modifier.verticalAlignment'.
    - For Box: 'contentAlignment' from properties -> 'modifier.contentAlignment'.
- Elevation for Card: 'properties.elevation' -> 'modifier.base.elevation: X'.
- Border for Card: 'properties.borderWidth', 'properties.borderColor' -> 'modifier.base.border: { width: X, color: "#RRGGBB" }'.

Recursive Conversion for Children:
- The 'children' array in the input component object contains full child component objects.
- Each child object must be recursively converted into the same custom JSON structure and placed in the 'children' array of its parent in the output.

Example of output for a Card containing a Text:
\`\`\`json
{
  "card": {
    "modifier": {
      "base": {
        "fillMaxWidth": true,
        "padding": { "all": 16 },
        "background": { "color": "#FFFFFF", "shape": "rounded" },
        "elevation": 2
      }
    },
    "children": [
      {
        "text": {
          "modifier": { "base": {} },
          "content": "Hello World",
          "fontSize": 18,
          "fontWeight": "bold"
        }
      }
    ]
  }
}
\`\`\`
Process the input carefully. If the input \`designJson\` is an empty array "[]", output an empty JSON object "{}" for \`customJsonString\`.
Ensure the output \`customJsonString\` is a valid JSON string.
Focus on the first component in the input array to be the root of the custom JSON output.
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
      throw new Error('AI did not return a response or the response was empty for custom JSON conversion.');
    }
    // Ensure the output is a string, as the AI might sometimes return an object
    if (typeof output.customJsonString === 'object') {
       return { customJsonString: JSON.stringify(output.customJsonString, null, 2) };
    }
    return output;
  }
);

    
