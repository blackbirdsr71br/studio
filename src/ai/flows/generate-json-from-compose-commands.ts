
'use server';
/**
 * @fileOverview Converts Jetpack Compose-like text commands into a structured JSON representation of the UI design.
 *
 * - generateJsonFromComposeCommands - A function that takes text commands and returns a JSON string for the UI.
 * - GenerateJsonFromComposeCommandsInput - The input type for the function.
 * - GenerateJsonFromComposeCommandsOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { ModalJsonSchema, DEFAULT_ROOT_LAZY_COLUMN_ID, type ComponentType } from '@/types/compose-spec'; // Assuming ModalJsonSchema is exported and can be used for validation reference

const GenerateJsonFromComposeCommandsInputSchema = z.object({
  composeCommands: z
    .string()
    .min(10, {message: 'Compose commands must be at least 10 characters long.'})
    .describe('A string containing text-based commands that mimic Jetpack Compose syntax for UI design.'),
});
export type GenerateJsonFromComposeCommandsInput = z.infer<typeof GenerateJsonFromComposeCommandsInputSchema>;

// The output is a string, which itself should be a parsable JSON conforming to ModalJsonSchema
const GenerateJsonFromComposeCommandsOutputSchema = z.object({
  designJson: z
    .string()
    .describe(
      'A JSON string representing the UI design, structured as an array of component objects. This JSON should be parsable and adhere to the application\'s ModalJsonSchema.'
    )
    .refine(
      (data) => {
        try {
          const parsed = JSON.parse(data);
          // Attempt to validate against the ModalJsonSchema
          // Note: ModalJsonSchema expects an array of nodes.
          return ModalJsonSchema.safeParse(parsed).success;
        } catch (e) {
          // If JSON.parse fails, it's not valid JSON.
          return false;
        }
      },
      {
        message:
          'The generated design data is not in a valid JSON format or does not match the required UI component schema (ModalJsonSchema). It should be an array of component objects.',
      }
    ),
});
export type GenerateJsonFromComposeCommandsOutput = z.infer<typeof GenerateJsonFromComposeCommandsOutputSchema>;

export async function generateJsonFromComposeCommands(
  input: GenerateJsonFromComposeCommandsInput
): Promise<GenerateJsonFromComposeCommandsOutput> {
  return generateJsonFromComposeCommandsFlow(input);
}

const availableComponentTypes: (ComponentType | 'Scaffold' | 'TopAppBar')[] = [
  'Text', 'Button', 'Column', 'Row', 'Image', 'Box', 'Card',
  'LazyColumn', 'LazyRow', 'LazyVerticalGrid', 'LazyHorizontalGrid',
  // Common Android/Compose terms that might appear, map them or instruct to use Box/Column/Row
  'Scaffold', 'TopAppBar'
];


const prompt = ai.definePrompt({
  name: 'generateJsonFromComposeCommandsPrompt',
  input: {schema: GenerateJsonFromComposeCommandsInputSchema},
  output: {schema: GenerateJsonFromComposeCommandsOutputSchema},
  prompt: `You are an expert Jetpack Compose to JSON UI converter. Your task is to transform Jetpack Compose-like text commands into a specific JSON format.
The output JSON must be an array of component objects. Each component object must have the following structure:
- "id": A unique string identifier (e.g., "comp-1", "comp-2").
- "type": A string indicating the component type (e.g., "Text", "Column", "Image").
- "name": A user-friendly name for the component (e.g., "Main Title Text", "User Profile Card").
- "parentId": The "id" of the parent component. For components that are at the top level of the user's described layout, this MUST be "${DEFAULT_ROOT_LAZY_COLUMN_ID}".
- "properties": An object containing specific attributes for the component.
  - For container components (like Column, Row, Box, Card, LazyColumn, LazyRow, LazyVerticalGrid, LazyHorizontalGrid), "properties" can include a "children" array.
  - The "children" array within "properties" should contain the full JSON objects of its child components, NOT just their IDs.

Available component types: ${availableComponentTypes.join(', ')}.
Recognized properties include (but are not limited to):
- For Text: text (string), fontSize (number), textColor (hex string, e.g., "#FF0000")
- For Image: src (string URL, use "https://placehold.co/100x100.png" if a resource is mentioned but not a URL), contentDescription (string), width (number), height (number)
- For Button: text (string), backgroundColor (hex string), textColor (hex string)
- For Containers (Column, Row, Box, Card, Lazy*): padding (number), backgroundColor (hex string), width (number or "match_parent" or "wrap_content"), height (number or "match_parent" or "wrap_content"), itemSpacing (number for Lazy layouts).
  - For Card: elevation (number), cornerRadiusTopLeft (number), cornerRadiusTopRight (number), cornerRadiusBottomRight (number), cornerRadiusBottomLeft (number), borderWidth (number), borderColor (hex string), contentColor (hex string).
  - For LazyVerticalGrid: columns (number).
  - For LazyHorizontalGrid: rows (number).

Mapping common Modifiers:
- Modifier.padding(X.dp) -> "padding": X
- Modifier.fillMaxWidth() -> "width": "match_parent"
- Modifier.fillMaxHeight() -> "height": "match_parent"
- Modifier.width(X.dp) -> "width": X
- Modifier.height(X.dp) -> "height": X
- Modifier.background(Color.SomeColor) -> "backgroundColor": "#CorrespondingHex" (e.g., Color.Red -> "#FF0000", Color.Blue -> "#0000FF", Color.Green -> "#008000", Color.White -> "#FFFFFF", Color.Black -> "#000000", Color.Gray -> "#808080"). If an unknown color, use a sensible default like "#CCCCCC".
- Modifier.clip(RoundedCornerShape(X.dp)) or .clip(RoundedCornerShape(topLeft = X.dp, ...)) -> "cornerRadiusTopLeft": X, "cornerRadiusTopRight": X, etc. (apply to all four if one value, or individual if specified)
- Text alignment (e.g., TextAlign.Center) -> "textAlign": "Center" (for Text properties)
- Card's border parameter: e.g., border = BorderStroke(width = X.dp, color = Color.SomeColor) -> "borderWidth": X, "borderColor": "#CorrespondingHex"
- Card's contentColor parameter: e.g., contentColor = Color.SomeColor -> "contentColor": "#CorrespondingHex"

onClick handlers or complex logic within composables should generally be ignored for the JSON structure, focus on visual properties.
If a component type like 'Scaffold' or 'TopAppBar' is mentioned, try to represent its main content area using a 'Column' or 'Box'.

Example Input:
\`\`\`
Column(modifier = Modifier.padding(16.dp)) {
    Text("Welcome!", fontSize = 20.sp, color = Color.Blue)
    Card(modifier = Modifier.clip(RoundedCornerShape(8.dp)), border = BorderStroke(1.dp, Color.Gray), contentColor = Color.DarkGray) {
        Image(imageResource = "logo.png", contentDescription = "App Logo", modifier = Modifier.height(50.dp))
    }
}
Button(text = "Submit")
\`\`\`

Example Output JSON (stringified):
\`\`\`json
[
  {
    "id": "comp-1",
    "type": "Column",
    "name": "Column 1",
    "parentId": "${DEFAULT_ROOT_LAZY_COLUMN_ID}",
    "properties": {
      "padding": 16,
      "children": [
        {
          "id": "comp-2",
          "type": "Text",
          "name": "Text 2",
          "parentId": "comp-1",
          "properties": {
            "text": "Welcome!",
            "fontSize": 20,
            "textColor": "#0000FF"
          }
        },
        {
          "id": "comp-3",
          "type": "Card",
          "name": "Card 3",
          "parentId": "comp-1",
          "properties": {
            "cornerRadiusTopLeft": 8,
            "cornerRadiusTopRight": 8,
            "cornerRadiusBottomRight": 8,
            "cornerRadiusBottomLeft": 8,
            "borderWidth": 1,
            "borderColor": "#808080",
            "contentColor": "#A9A9A9",
            "children": [
              {
                "id": "comp-4",
                "type": "Image",
                "name": "Image 4",
                "parentId": "comp-3",
                "properties": {
                  "src": "https://placehold.co/100x50.png",
                  "contentDescription": "App Logo",
                  "height": 50
                }
              }
            ]
          }
        }
      ]
    }
  },
  {
    "id": "comp-5",
    "type": "Button",
    "name": "Button 5",
    "parentId": "${DEFAULT_ROOT_LAZY_COLUMN_ID}",
    "properties": {
      "text": "Submit"
    }
  }
]
\`\`\`
Ensure all top-level components in the user's input have their "parentId" set to "${DEFAULT_ROOT_LAZY_COLUMN_ID}". Child components' "parentId" should be the "id" of their direct container in the input.
Generate unique, sequential "id" values (e.g., "comp-1", "comp-2", ...).
Generate descriptive "name" values (e.g., "Text 1", "Column 2", ...).

User's Jetpack Compose Commands:
\`\`\`
{{{composeCommands}}}
\`\`\`
`,
});

const generateJsonFromComposeCommandsFlow = ai.defineFlow(
  {
    name: 'generateJsonFromComposeCommandsFlow',
    inputSchema: GenerateJsonFromComposeCommandsInputSchema,
    outputSchema: GenerateJsonFromComposeCommandsOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error('AI did not return a response or the response was empty.');
    }
    // The output.designJson is already validated by the schema's refine function.
    return output;
  }
);
