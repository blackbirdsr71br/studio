
'use server';
/**
 * @fileOverview Converts a canvas design JSON (hierarchical array of components from the content area)
 * into a user-specified structured "custom command" JSON format (Compose Remote Layout).
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
      'A JSON string representing the UI design from the canvas content area. This is an array of component objects, where each object has id, type, name, parentId, and properties. Container components have a "children" array within their properties, containing full child component objects.'
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
  includeDefaultValues: z
    .boolean()
    .optional()
    .describe(
      'If true, include properties with default, empty, or zero values. If false or omitted, omit them for a cleaner JSON.'
    ),
});
export type ConvertCanvasToCustomJsonInput = z.infer<typeof ConvertCanvasToCustomJsonInputSchema>;

const ConvertCanvasToCustomJsonOutputSchema = z.object({
  customJsonString: z
    .string()
    .describe(
      'A JSON string representing the UI in the "Compose Remote Layout" custom command format. The root key should be the lowercase name of the main component (e.g., "card", "column", "spacer"). This must be a compact, single-line JSON string.'
    )
    .refine(
      (data) => {
        try {
          // Check if it's parsable JSON.
          // An empty string is not valid JSON, but the AI might return it for an empty canvas.
          // We'll allow an empty string or a string representing an empty object '{}'.
          if (data.trim() === '' || data.trim() === '{}') return true;
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
  prompt: `You are an expert UI converter. Your task is to transform an input JSON (representing a canvas design's content area) into a specific target "Compose Remote Layout" JSON format.
The value for 'customJsonString' in your output MUST be a compact, single-line JSON string without any newlines or formatting. It must be a raw string representation of the JSON object.
All numeric property values in the output JSON MUST be integers. Round any decimal values to the nearest whole number. The only exceptions are properties that are explicitly for floating point numbers, such as 'layoutWeight' or 'aspectRatio'.

Input Canvas Design JSON ('{{{designJson}}}'):
The input is a JSON string representing an array of component objects. These are the components intended for the main content area of an application.
Each component object in the input array generally has:
- "id": string (unique identifier from canvas)
- "type": string (e.g., "Text", "Card", "Column", "LazyColumn")
- "name": string (user-friendly name from canvas)
- "parentId": string (ID of its parent within the input canvas structure, relative to other components in 'designJson')
- "properties": object containing various attributes.
  - If a component is a container (like "Column", "Row", "Card", "Box", "LazyColumn", "LazyRow", "LazyVerticalGrid", "LazyHorizontalGrid", "AnimatedContent"), its "properties" object will have a "children" array. This "children" array contains the full JSON objects of its child components.
  - Properties like "x", "y", "id", "name", and the original "parentId" from the input JSON are for the canvas's internal structure and should NOT be directly copied into the output "Compose Remote Layout" JSON unless explicitly mapped below. The output JSON structure dictates its own hierarchy and property names.

Target "Compose Remote Layout" JSON Structure:
The output JSON MUST strictly follow this pattern:
- The root of the JSON object MUST be a single key, which is the lowercase version of the component's type (e.g., "column", "text", "card").
  - If the input 'designJson' array (representing the children of the main canvas content area) contains only ONE component, that component's type (lowercase) should be the root key of the output JSON. Its properties and children should be mapped accordingly.
  - If the input 'designJson' array contains MULTIPLE components, the root key of the output JSON MUST be "column". The components from the input array should become the children of this root "column".
- Each component object (including the root and any children) must contain:
  - A "modifier" object (unless it would be completely empty according to omission rules).
  - The "modifier" object MUST have a "base" object for common modifiers (unless "base" itself would be empty).
  - Component-specific modifiers can be direct children of "modifier".
  - Component-specific properties (e.g., "content" for Text, "clickId" for Button).
  - If the component is a container (like "column", "row", "card", "box", "grid", "animatedcontent"), it should have a "children" array. Each element in "children" must be an object structured in the same way (e.g., { "text": { "modifier": {...}, "content": "Hello" } }). Spacers do not have children.

Component Type Mapping (Canvas Type -> Output Key):
- "Text" -> "text"
- "Button" -> "button"
- "Column" -> "column"
- "Row" -> "row"
- "Box" -> "box"
- "Card" -> "card"
- "Image" -> "image"
- "Spacer" -> "spacer"
- "AnimatedContent" -> "animatedcontent"
- "LazyColumn" -> "column" (add '"scrollable": true' to 'modifier.base')
- "LazyRow" -> "row" (add '"scrollable": true' to 'modifier.base')
- "LazyVerticalGrid" -> "grid" (set 'modifier.orientation: "vertical"', 'modifier.base.scrollable: true', map 'columns' to 'modifier.columns')
- "LazyHorizontalGrid" -> "grid" (set 'modifier.orientation: "horizontal"', 'modifier.base.scrollable: true', map 'rows' to 'modifier.rows')

Modifier and Property Mapping Rules (from input component properties to output "Compose Remote Layout" JSON):

1.  **General Modifier Structure**:
    \`\`\`json
    "componentType": {
      "modifier": { // This "modifier" key is omitted if all its contents (base and specific) would be empty
        "base": { /* common modifiers; this "base" key is omitted if it would be empty */ },
        /* component-specific modifiers like verticalArrangement */
      },
      /* component-specific properties like content, clickId */
      "children": [ /* if applicable */ ]
    }
    \`\`\`

2.  **Base Modifiers ('modifier.base'):**
    *   **Size (Priority: 'fillMaxSize' > 'fillMaxWidth'/'fillMaxHeight' > explicit 'width'/'height'/'size')**:
        *   If canvas has 'fillMaxSize: true', use 'fillMaxSize: true' in 'modifier.base'. Do NOT set 'width', 'height', 'size', 'fillMaxWidth', or 'fillMaxHeight'.
        *   Else if canvas 'fillMaxWidth: true', use 'fillMaxWidth: true' in 'modifier.base'. Do NOT set 'width'.
        *   Else if canvas 'fillMaxHeight: true', use 'fillMaxHeight: true' in 'modifier.base'. Do NOT set 'height'.
        *   Else if canvas 'width: X' (number), use 'width: X' (dp) in 'modifier.base'.
        *   Else if canvas 'height: Y' (number), use 'height: Y' (dp) in 'modifier.base'.
        *   If canvas 'width' and 'height' are equal numbers (e.g., 150) AND no "fill" properties are true, use 'size: 150' in 'modifier.base' instead of separate 'width' and 'height'.
        *   'aspectRatio: X' (canvas, if present and no fill directives are fully overriding) -> 'aspectRatio: X' in 'modifier.base'.
    *   **Padding**:
        *   If 'padding: X' (canvas, for all sides) exists and X > 0 -> 'padding: { "all": X }' in 'modifier.base'.
        *   Else, map 'paddingTop', 'paddingBottom', 'paddingStart', 'paddingEnd' (canvas) to 'padding: { "top": Y, "start": X, ... }' in 'modifier.base'. Omit sides with zero or undefined padding. If the resulting padding object is empty, omit it.
    *   **Margin**: If canvas properties like 'marginStart', 'marginTop' exist map similarly to 'margin: { ... }' in 'modifier.base'. Omit if empty.
    *   **Background**:
        *   'backgroundColor: "#RRGGBB"' (canvas) -> 'background: { "color": "#RRGGBB", "shape": "rectangle" }' in 'modifier.base'.
        *   If 'cornerRadiusTopLeft' (etc.) > 0 (canvas):
            *   Set 'modifier.base.background.shape' to '"roundedcorner"'.
            *   If all canvas 'cornerRadius...' properties are equal to C: use 'modifier.base.background.radius: C'.
            *   If corners differ, use a default radius like 8 if any corner is rounded and a specific radius is not obvious from a single value.
    *   **Border**:
        *   If 'borderWidth: W > 0' and 'borderColor: "#HEX"' (canvas) -> 'border: { "width": W, "color": "#HEX" }' in 'modifier.base'.
        *   If border exists and 'cornerRadiusTopLeft' (etc.) > 0 (canvas): add 'shape: { "type": "roundedcorner", "cornerRadius": C }' to 'modifier.base.border'. If all corners are equal to C, use that for 'cornerRadius'. Otherwise, pick a representative value like 8.
    *   **Shadow (Mainly for Card)**:
        *   If 'type: "Card"' and 'elevation: E > 0' (canvas) -> 'shadow: { "elevation": E }' in 'modifier.base'.
        *   If card also has rounded corners (canvas 'cornerRadius... > 0'): add 'shape: { "type": "roundedcorner", "cornerRadius": C }' to 'modifier.base.shadow'.
    *   **Scrolling**:
        *   For "LazyColumn", "LazyRow", "LazyVerticalGrid", "LazyHorizontalGrid" (canvas type): add 'scrollable: true' to 'modifier.base'.
    *   **Click Interaction**: If a component has 'clickable: true' AND a 'clickId' property with a non-empty string in the input JSON, map it to the output. For a "button", this is a direct property ('"clickId": "someId"'). For most other clickable components (like "card", "box", "image", "text", "row", "column"), place it inside 'modifier.base' as '"clickId": "someId"'.
    *   **Transformations**: (Map if present in canvas properties and relevant to target spec)
        *   'alpha' -> 'alpha' in 'modifier.base'.
        *   'rotate' -> 'rotate' in 'modifier.base'.
        *   'scaleX', 'scaleY' -> 'scale: { "scaleX": SX, "scaleY": SY }' in 'modifier.base'.
        *   'offsetX', 'offsetY' -> 'offset: { "x": OX, "y": OY }' in 'modifier.base'.
        *   'clipChildren' (if exists) -> 'clip: true' in 'modifier.base'.

3.  **Component-Specific Modifiers (direct children of 'modifier' object, NOT in 'base'):**
    *   **Column**:
        *   'verticalArrangement' (canvas) -> 'verticalArrangement' (modifier for "column"). Map values like "Top" to "top", "SpaceBetween" to "spaceBetween".
        *   'horizontalAlignment' (canvas) -> 'horizontalAlignment' (modifier for "column"). Map "Start" to "start", "CenterHorizontally" to "center".
    *   **Row**:
        *   'horizontalArrangement' (canvas) -> 'horizontalArrangement' (modifier for "row").
        *   'verticalAlignment' (canvas) -> 'verticalAlignment' (modifier for "row").
    *   **Box**:
        *   'contentAlignment' (canvas, if exists) -> 'contentAlignment' (modifier for "box"). Map values like "Center" to "center", "TopStart" to "topStart".
    *   **Grid**:
        *   'columns' (canvas 'LazyVerticalGrid.properties.columns') -> 'columns' (modifier for "grid").
        *   'rows' (canvas 'LazyHorizontalGrid.properties.rows') -> 'rows' (modifier for "grid").
        *   'orientation' (derived: "vertical" for LazyVerticalGrid, "horizontal" for LazyHorizontalGrid) -> 'orientation' (modifier for "grid").
        *   'horizontalArrangement', 'verticalArrangement' (if present in canvas grid and applicable to target grid) -> map to modifiers for "grid".
        *   'enableSnapHorizontal' (if present) -> 'enableSnapHorizontal' (modifier for "grid").

4.  **Component-Specific Properties (direct children of component type object, e.g., '"text": { "content": ... }'):**
    *   **Text**:
        *   'text' (canvas) -> 'content' (output).
        *   'fontSize', 'fontWeight' (valid values: "Normal", "Semibold", "Bold"), 'fontStyle', 'letterSpacing', 'lineHeight', 'maxLines', 'minLines', 'textDecoration' (canvas) -> map to respective direct properties in "text" object.
        *   'textColor' (canvas) -> 'color' (output, hex string).
        *   'textAlign' (canvas) -> 'textAlign' (output, e.g., "start", "center").
        *   'textOverflow' (canvas) -> 'overflow' (output, e.g., "clip", "ellipsis").
    *   **Button**:
        *   'text' (canvas) -> 'content' (output, if button has no children in canvas).
        *   'clickId' (canvas, if 'clickable: true' and 'clickId' is present) -> 'clickId' (output).
        *   'fontSize', 'fontWeight', 'fontColor' (canvas) -> map to direct properties.
        *   If canvas Button has 'children', then the output "button" should have a 'children' array and no 'content' property.
        *   **Shape & Icon**:
            *   'shape' (canvas 'shape' property) -> 'shape' (output property, e.g., "roundedcorner", "rectangle", "circle").
            *   'cornerRadius' (canvas 'cornerRadius' property, if shape is 'RoundedCorner') -> 'cornerRadius' (output property).
            *   If 'iconName' exists in canvas properties, create an 'icon' object in the output "button":
                *   'iconName' -> 'icon.name'
                *   'iconPosition' (map "Start" to "start", "End" to "end") -> 'icon.position'
                *   'iconSize' -> 'icon.size'
                *   'iconSpacing' -> 'icon.spacing'
    *   **Spacer**:
        *   'width' (canvas) -> 'width' (direct property in "spacer").
        *   'height' (canvas) -> 'height' (direct property in "spacer").
    *   **Image**:
        *   'src' (canvas) -> 'src' (output property for "image", as per your guide).
        *   'contentDescription' (canvas) -> 'alt' or 'contentDescription' (output property for "image", let's use 'contentDescription' for now).
    *   **AnimatedContent**:
        *   'animationType' (canvas) -> 'animationType' (output).
        *   'animationDuration' (canvas) -> 'animationDuration' (output).

5.  **Children**:
    *   For container components (Column, Row, Box, Card, Grid from LazyGrids, AnimatedContent), recursively transform their children from the canvas 'properties.children' array and place them into the output component's 'children' array.

{{#unless includeDefaultValues}}
6.  **Omissions (VERY IMPORTANT)**:
    *   **Crucially, do NOT include any property (whether in 'modifier.base', component-specific modifiers, or direct properties) in the output JSON if its corresponding value from the input canvas JSON is 'null', 'undefined', or an empty string ('""').**
    *   Also, omit properties if their value would represent a default or implicit state in the target "Compose Remote Layout" (e.g., padding of 0, elevation of 0 for non-Card components, an empty 'children' array if the component has no children).
    *   Only include properties in the output if they have meaningful, non-default, non-empty values derived from the input that actively affect the visual representation or behavior according to the target "Compose Remote Layout" specification.
    *   Omit canvas-specific properties like the original 'id', 'name', 'parentId' (from the canvas structure), 'x', 'y', and the 'clickable' boolean flag from the output JSON.
    *   **If the 'modifier.base' object is empty after applying all rules and omissions, then the '"base"' key itself (and its empty object value) MUST be omitted from the '"modifier"' object.**
    *   **If the entire '"modifier"' object (containing 'base' and/or component-specific modifiers) becomes empty as a result of these omissions, then the '"modifier"' key itself MUST be omitted from the component's JSON object.**
{{/unless}}

Input Canvas Design JSON (Content Area):
\`\`\`json
{{{designJson}}}
\`\`\`

Ensure the output 'customJsonString' is a single, compact JSON string. Do not pretty-print it. The final formatting will be handled separately.
Focus on accurate mapping and adherence to the specified JSON structure and the OMISSION rules.
If a canvas property does not have a clear direct mapping to the target spec, omit it unless its intent can be clearly translated to an equivalent modifier or property.
Example: A card with 'fillMaxWidth: true' and padding '16' from canvas. The value of 'customJsonString' should be: '{"card":{"modifier":{"base":{"fillMaxWidth":true,"padding":{"all":16}}},"children":[]}}'
Example: A Text component with no meaningful modifiers. Canvas: '{ "type": "Text", "properties": { "text": "Hello" } }'. Output 'customJsonString' value: '{"text":{"content":"Hello"}}'
Example: A Box component with only padding. Canvas: '{ "type": "Box", "properties": { "padding": 8 } }'. Output 'customJsonString' value: '{"box":{"modifier":{"base":{"padding":{"all":8}}}}}'
Example: A Text with empty canvas text and paddingTop of 8. Output 'customJsonString' value: '{"text":{"modifier":{"base":{"padding":{"top":8}}}}}'
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
    
    // Allow an empty string or empty object '{}' as valid for an empty canvas
    const trimmedOutput = output.customJsonString.trim();
    if (trimmedOutput === '' || trimmedOutput === '{}') {
        return { customJsonString: '{}' }; 
    }

    let jsonToFormat: any;

    try {
        jsonToFormat = JSON.parse(output.customJsonString);
    } catch (e) {
        console.error("Error parsing customJsonString from AI output despite Zod refine: ", e);
        console.error("Invalid string was: ", output.customJsonString); // Log the bad string
        throw new Error("AI returned an invalid JSON string for customJsonString that could not be formatted.");
    }
    
    // Ensure the JSON is "pretty-printed" with an indent of 2 spaces for display.
    const formattedJsonString = JSON.stringify(jsonToFormat, null, 2);
    
    return { customJsonString: formattedJsonString };
  }
);
