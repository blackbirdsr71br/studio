
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
import { ModalJsonSchema, DEFAULT_ROOT_LAZY_COLUMN_ID, type ComponentType } from '@/types/compose-spec';

const GenerateJsonFromComposeCommandsInputSchema = z.object({
  composeCommands: z
    .string()
    .min(10, {message: 'Compose commands must be at least 10 characters long.'})
    .describe('A string containing text-based commands that mimic Jetpack Compose syntax for UI design.'),
});
export type GenerateJsonFromComposeCommandsInput = z.infer<typeof GenerateJsonFromComposeCommandsInputSchema>;

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
          return ModalJsonSchema.safeParse(parsed).success;
        } catch (e) {
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

const availableComponentTypes: (ComponentType | 'Scaffold' | 'TopAppBar' | 'Spacer')[] = [
  'Text', 'Button', 'Column', 'Row', 'Image', 'Box', 'Card',
  'LazyColumn', 'LazyRow', 'LazyVerticalGrid', 'LazyHorizontalGrid', 'Spacer',
  'Scaffold', 'TopAppBar'
];


const prompt = ai.definePrompt({
  name: 'generateJsonFromComposeCommandsPrompt',
  input: {schema: GenerateJsonFromComposeCommandsInputSchema},
  output: {schema: GenerateJsonFromComposeCommandsOutputSchema},
  prompt: `You are an expert Jetpack Compose to JSON UI converter. Your task is to transform Jetpack Compose-like text commands into a specific JSON format.
The output JSON must be an array of component objects. Each component object must have the following structure:
- "id": A unique string identifier (e.g., "comp-1", "comp-2").
- "type": A string indicating the component type (e.g., "Text", "Column", "Image", "Spacer").
- "name": A user-friendly name for the component (e.g., "Main Title Text", "User Profile Card", "Vertical Spacer").
- "parentId": The "id" of the parent component. For components that are at the top level of the user's described layout, this MUST be "${DEFAULT_ROOT_LAZY_COLUMN_ID}".
- "properties": An object containing specific attributes for the component.
  - For container components (like Column, Row, Box, Card, LazyColumn, LazyRow, LazyVerticalGrid, LazyHorizontalGrid), "properties" can include a "children" array.
  - The "children" array within "properties" should contain the full JSON objects of its child components, NOT just their IDs.
  - For Spacer: width (number), height (number). If a weight is implied, set layoutWeight.

Available component types: ${availableComponentTypes.join(', ')}.
Recognized properties include (but are not limited to):
- For Text: text (string), fontSize (number), textColor (hex string, e.g., "#FF0000")
- For Image: src (string URL, use "https://placehold.co/100x100.png" if a resource is mentioned but not a URL), contentDescription (string), width (number, "match_parent", or "wrap_content"), height (number, "match_parent", or "wrap_content"), fillMaxWidth (boolean), fillMaxHeight (boolean)
- For Button: text (string), backgroundColor (hex string), textColor (hex string), fillMaxWidth (boolean), fillMaxHeight (boolean)
- For Spacer: width (number), height (number), layoutWeight (number). If only width is specified, assume it's a horizontal spacer. If only height is specified, assume it's a vertical spacer.
- For Containers (Column, Row, Box, Card, Lazy*): padding (number, for all sides), paddingTop (number), paddingBottom (number), paddingStart (number), paddingEnd (number), backgroundColor (hex string), width (number, "match_parent", or "wrap_content"), height (number, "match_parent", or "wrap_content"), itemSpacing (number for Lazy layouts), layoutWeight (number, e.g., 1 for Modifier.weight(1f)), fillMaxWidth (boolean), fillMaxHeight (boolean).
  - For Card: elevation (number), cornerRadiusTopLeft (number), cornerRadiusTopRight (number), cornerRadiusBottomRight (number), cornerRadiusBottomLeft (number), borderWidth (number), borderColor (hex string), contentColor (hex string).
  - For LazyVerticalGrid: columns (number).
  - For LazyHorizontalGrid: rows (number).

Mapping common Modifiers:
- Modifier.padding(X.dp) -> "padding": X (all sides)
- Modifier.padding(horizontal = X.dp, vertical = Y.dp) -> "paddingStart": X, "paddingEnd": X, "paddingTop": Y, "paddingBottom": Y
- Modifier.padding(start = A.dp, top = B.dp, end = C.dp, bottom = D.dp) -> "paddingStart": A, "paddingTop": B, "paddingEnd": C, "paddingBottom": D (map defined values)
- Modifier.fillMaxWidth() -> "fillMaxWidth": true (this takes precedence over 'width': 'match_parent')
- Modifier.fillMaxHeight() -> "fillMaxHeight": true (this takes precedence over 'height': 'match_parent')
- If 'fillMaxWidth' is true, do not set 'width': 'match_parent'.
- If 'fillMaxHeight' is true, do not set 'height': 'match_parent'.
- If 'fillMaxWidth' is false or absent, and user says 'width = match_parent', then use "width": "match_parent".
- If 'fillMaxHeight' is false or absent, and user says 'height = match_parent', then use "height": "match_parent".
- Modifier.wrapContentWidth() -> "width": "wrap_content" (ensure "fillMaxWidth": false or absent)
- Modifier.wrapContentHeight() -> "height": "wrap_content" (ensure "fillMaxHeight": false or absent)
- Modifier.width(X.dp) -> "width": X (ensure "fillMaxWidth": false or absent)
- Modifier.height(X.dp) -> "height": X (ensure "fillMaxHeight": false or absent)
- Modifier.weight(Xf) or .weight(X.toFloat()) -> "layoutWeight": X (e.g., Modifier.weight(1f) -> "layoutWeight": 1)
- Modifier.background(Color.SomeColor) -> "backgroundColor": "#CorrespondingHex" (e.g., Color.Red -> "#FF0000"). If an unknown color, use a sensible default like "#CCCCCC".
- Modifier.clip(RoundedCornerShape(X.dp)) or .clip(RoundedCornerShape(topLeft = X.dp, ...)) -> "cornerRadiusTopLeft": X, "cornerRadiusTopRight": X, etc. (apply to all four if one value, or individual if specified)
- Text alignment (e.g., TextAlign.Center) -> "textAlign": "Center" (for Text properties)
- Card's border parameter: e.g., border = BorderStroke(width = X.dp, color = Color.SomeColor) -> "borderWidth": X, "borderColor": "#CorrespondingHex"
- Card's contentColor parameter: e.g., contentColor = Color.SomeColor -> "contentColor": "#CorrespondingHex"

onClick handlers or complex logic within composables should generally be ignored for the JSON structure, focus on visual properties.
If a component type like 'Scaffold' or 'TopAppBar' is mentioned, try to represent its main content area using a 'Column' or 'Box'.

Example Input:
\`\`\`
Column(modifier = Modifier.padding(16.dp).fillMaxWidth()) {
    Text("Welcome!", fontSize = 20.sp, color = Color.Blue, modifier = Modifier.weight(1f))
    Spacer(modifier = Modifier.height(10.dp))
    Card(modifier = Modifier.clip(RoundedCornerShape(8.dp)), border = BorderStroke(1.dp, Color.Gray), contentColor = Color.DarkGray) {
        Image(imageResource = "logo.png", contentDescription = "App Logo", modifier = Modifier.height(50.dp).padding(start = 4.dp, end = 4.dp))
    }
}
Button(text = "Submit", modifier = Modifier.width(120.dp).padding(horizontal = 10.dp))
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
      "fillMaxWidth": true,
      "children": [
        {
          "id": "comp-2",
          "type": "Text",
          "name": "Text 2",
          "parentId": "comp-1",
          "properties": {
            "text": "Welcome!",
            "fontSize": 20,
            "textColor": "#0000FF",
            "layoutWeight": 1
          }
        },
        {
          "id": "comp-3",
          "type": "Spacer",
          "name": "Spacer 3",
          "parentId": "comp-1",
          "properties": {
            "height": 10
          }
        },
        {
          "id": "comp-4",
          "type": "Card",
          "name": "Card 4",
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
                "id": "comp-5",
                "type": "Image",
                "name": "Image 5",
                "parentId": "comp-4",
                "properties": {
                  "src": "https://placehold.co/100x50.png",
                  "contentDescription": "App Logo",
                  "height": 50,
                  "paddingStart": 4,
                  "paddingEnd": 4
                }
              }
            ]
          }
        }
      ]
    }
  },
  {
    "id": "comp-6",
    "type": "Button",
    "name": "Button 6",
    "parentId": "${DEFAULT_ROOT_LAZY_COLUMN_ID}",
    "properties": {
      "text": "Submit",
      "width": 120,
      "fillMaxWidth": false,
      "paddingStart": 10,
      "paddingEnd": 10
    }
  }
]
\`\`\`
Ensure all top-level components in the user's input have their "parentId" set to "${DEFAULT_ROOT_LAZY_COLUMN_ID}". Child components' "parentId" should be the "id" of their direct container in the input.
Generate unique, sequential "id" values (e.g., "comp-1", "comp-2", ...).
Generate descriptive "name" values (e.g., "Text 1", "Column 2", "Spacer 3", ...).
If only Modifier.padding(X.dp) is used, set the "padding" property. If specific sides like Modifier.padding(start=Y.dp) are used, set "paddingStart", "paddingTop", etc. accordingly.

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
    return output;
  }
);
