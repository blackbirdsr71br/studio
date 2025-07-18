
'use server';
/**
 * @fileOverview Converts Jetpack Compose-like text commands into a structured JSON representation of the UI design.
 * The output JSON should be an array of components intended to be children of the main content area of a Scaffold.
 */

import {ai} from '@/ai/genkit';
import { GenerateJsonFromComposeCommandsInputSchema, GenerateJsonFromComposeCommandsOutputSchema, type GenerateJsonFromComposeCommandsInput, type GenerateJsonFromComposeCommandsOutput } from '@/types/ai-spec';
import { DEFAULT_CONTENT_LAZY_COLUMN_ID, type ComponentType } from '@/types/compose-spec'; 

const availableContentComponentTypes: (ComponentType)[] = [
  'Text', 'Button', 'Column', 'Row', 'Image', 'Box', 'Card',
  'LazyColumn', 'LazyRow', 'LazyVerticalGrid', 'LazyHorizontalGrid', 'Spacer',
  'AnimatedContent'
];


export async function generateJsonFromComposeCommands(
  input: GenerateJsonFromComposeCommandsInput
): Promise<GenerateJsonFromComposeCommandsOutput> {
  return generateJsonFromComposeCommandsFlow(input);
}


const prompt = ai.definePrompt({
  name: 'generateJsonFromComposeCommandsPrompt',
  input: {schema: GenerateJsonFromComposeCommandsInputSchema},
  output: {schema: GenerateJsonFromComposeCommandsOutputSchema},
  prompt: `You are an expert Jetpack Compose to JSON UI converter. Your task is to transform Jetpack Compose-like text commands into a specific JSON format representing the *content area* of a screen.
The output JSON must be an array of component objects. Each component object must have the following structure:
- "id": A unique string identifier (e.g., "comp-1", "comp-2").
- "type": A string indicating the component type (e.g., "Text", "Column", "Image", "Spacer").
- "name": A user-friendly name for the component (e.g., "Main Title Text", "User Profile Card").
- "parentId": The "id" of the parent component. For components that are at the top level of the user's described layout (within the content area), this MUST be "${DEFAULT_CONTENT_LAZY_COLUMN_ID}".
- "properties": An object containing specific attributes for the component.
  - For container components (like Column, Row, Box, Card, LazyColumn, LazyRow, LazyVerticalGrid, LazyHorizontalGrid, AnimatedContent), "properties" can include a "children" array.
  - The "children" array within "properties" should contain the full JSON objects of its child components, NOT just their IDs.
  - For Spacer: width (number), height (number). If a weight is implied, set layoutWeight.

Available component types for the content area: ${availableContentComponentTypes.join(', ')}.
Do NOT generate TopAppBar or BottomNavigationBar components, as those are handled by the surrounding Scaffold structure. Focus on the content the user would place *inside* the main screen area.

Recognized properties include (but are not limited to):
- For Text: text (string), fontSize (number), textColor (hex string, e.g., "#FF0000")
- For Image: src (string URL, use "https://placehold.co/100x100.png" if a resource is mentioned but not a URL), contentDescription (string), width (number), height (number), fillMaxSize (boolean), fillMaxWidth (boolean), fillMaxHeight (boolean)
- For Button: text (string), backgroundColor (hex string), textColor (hex string), fillMaxSize (boolean), fillMaxWidth (boolean), fillMaxHeight (boolean)
- For Spacer: width (number), height (number), layoutWeight (number).
- For AnimatedContent: animationType (string, e.g., 'Fade', 'Scale'), animationDuration (number, e.g., 300).
- For Containers (Column, Row, Box, Card, Lazy*, AnimatedContent): padding (number), paddingTop (number), paddingBottom (number), paddingStart (number), paddingEnd (number), backgroundColor (hex string), width, height, itemSpacing, layoutWeight, fillMaxSize, fillMaxWidth, fillMaxHeight.
  - For Card: elevation (number), cornerRadius..., borderWidth, borderColor, contentColor.
  - For LazyVerticalGrid: columns (number).
  - For LazyHorizontalGrid: rows (number).

Mapping common Modifiers:
- Modifier.padding(X.dp) -> "padding": X
- Modifier.padding(horizontal = X.dp, vertical = Y.dp) -> "paddingStart": X, "paddingEnd": X, "paddingTop": Y, "paddingBottom": Y
- Modifier.fillMaxSize() -> "fillMaxSize": true
- Modifier.fillMaxWidth() -> "fillMaxWidth": true
- Modifier.fillMaxHeight() -> "fillMaxHeight": true
- Modifier.width(X.dp) -> "width": X
- Modifier.height(X.dp) -> "height": X
- Modifier.weight(Xf) -> "layoutWeight": X
- Modifier.background(Color.SomeColor) -> "backgroundColor": "#CorrespondingHex"
- Modifier.clip(RoundedCornerShape(X.dp)) -> "cornerRadiusTopLeft": X, etc.
- Text alignment (e.g., TextAlign.Center) -> "textAlign": "Center"
- Card's border: border = BorderStroke(...) -> "borderWidth", "borderColor"
- Card's contentColor -> "contentColor"
- AnimatedVisibility(enter=fadeIn(), exit=fadeOut()) -> "type": "AnimatedContent", "properties": { "animationType": "Fade" }

onClick handlers or complex logic should be ignored.
If the user describes a full screen with "Scaffold { topBar = ..., bottomBar = ... } content { ... }", ONLY process the commands found within the "content { ... }" block or equivalent phrasing.
The output must be an array of components for this content area.

Example Input:
\`\`\`
Column(modifier = Modifier.fillMaxWidth().padding(16.dp)) {
    Text("Welcome!", fontSize = 20.sp, color = Color.Blue, modifier = Modifier.weight(1f))
    Spacer(modifier = Modifier.height(10.dp))
    Button(onClick = {}) { Text("Submit") }
}
Row { /* ... */ }
\`\`\`

Example Output JSON (stringified for the content area):
\`\`\`json
[
  {
    "id": "comp-1",
    "type": "Column",
    "name": "Column 1",
    "parentId": "${DEFAULT_CONTENT_LAZY_COLUMN_ID}",
    "properties": {
      "fillMaxWidth": true,
      "padding": 16,
      "children": [
        {
          "id": "comp-2",
          "type": "Text",
          "name": "Text 2",
          "parentId": "comp-1",
          "properties": { "text": "Welcome!", "fontSize": 20, "textColor": "#0000FF", "layoutWeight": 1 }
        },
        {
          "id": "comp-3",
          "type": "Spacer",
          "name": "Spacer 3",
          "parentId": "comp-1",
          "properties": { "height": 10 }
        },
        {
          "id": "comp-4",
          "type": "Button",
          "name": "Button 4",
          "parentId": "comp-1",
          "properties": { 
            "text": "Submit", 
            "children": [
              {
                "id": "comp-5",
                "type": "Text",
                "name": "Text 5",
                "parentId": "comp-4",
                "properties": { "text": "Submit" }
              }
            ]
          }
        }
      ]
    }
  },
  {
    "id": "comp-6",
    "type": "Row",
    "name": "Row 6",
    "parentId": "${DEFAULT_CONTENT_LAZY_COLUMN_ID}",
    "properties": {
      "children": []
    }
  }
]
\`\`\`
Ensure all top-level components in the user's input (for the content area) have their "parentId" set to "${DEFAULT_CONTENT_LAZY_COLUMN_ID}". Child components' "parentId" should be the "id" of their direct container.
Generate unique, sequential "id" values (e.g., "comp-1", "comp-2", ...).
Generate descriptive "name" values (e.g., "Text 1", "Column 2", ...).

User's Jetpack Compose Commands for the content area:
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
