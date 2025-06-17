
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
});
export type ConvertCanvasToCustomJsonInput = z.infer<typeof ConvertCanvasToCustomJsonInputSchema>;

const ConvertCanvasToCustomJsonOutputSchema = z.object({
  customJsonString: z
    .string()
    .describe(
      'A JSON string representing the UI in the "Compose Remote Layout" custom command format. The root key should be the lowercase name of the main component (e.g., "card", "column", "spacer"). This JSON string should be pretty-printed (indented with 2 spaces).'
    )
    .refine(
      (data) => {
        try {
          // Check if it's parsable JSON
          const parsed = JSON.parse(data);
          // Check if it's "pretty-printed" by seeing if it contains newlines and multiple spaces for indentation
          // This is a heuristic, but good enough for ensuring basic formatting.
          const isPretty = data.includes('\n') && data.includes('  ');
          if (!isPretty && Object.keys(parsed).length > 0) { // only be strict if it's not an empty object
             // console.warn("AI returned custom JSON that was not pretty-printed. Attempting to format.");
          }
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
The output JSON MUST be "pretty-printed" (formatted with newlines and indentation of 2 spaces).

Input Canvas Design JSON (\`{{{designJson}}}\`):
The input is a JSON string representing an array of component objects. These are the components intended for the main content area of an application.
Each component object in the input array generally has:
- "id": string (unique identifier from canvas)
- "type": string (e.g., "Text", "Card", "Column", "LazyColumn")
- "name": string (user-friendly name from canvas)
- "parentId": string (ID of its parent within the input canvas structure, relative to other components in \\\`designJson\\\`)
- "properties": object containing various attributes.
  - If a component is a container (like "Column", "Row", "Card", "Box", "LazyColumn", "LazyRow", "LazyVerticalGrid", "LazyHorizontalGrid"), its "properties" object will have a "children" array. This "children" array contains the full JSON objects of its child components.
  - Properties like "x", "y", "id", "name", and the original "parentId" from the input JSON are for the canvas's internal structure and should NOT be directly copied into the output "Compose Remote Layout" JSON unless explicitly mapped below. The output JSON structure dictates its own hierarchy and property names.

Target "Compose Remote Layout" JSON Structure:
The output JSON MUST strictly follow this pattern:
- The root of the JSON object MUST be a single key, which is the lowercase version of the component's type (e.g., "column", "text", "card").
  - If the input \\\`designJson\\\` array (representing the children of the main canvas content area) contains only ONE component, that component's type (lowercase) should be the root key of the output JSON. Its properties and children should be mapped accordingly.
  - If the input \\\`designJson\\\` array contains MULTIPLE components, the root key of the output JSON MUST be "column". The components from the input array should become the children of this root "column".
- Each component object (including the root and any children) must contain:
  - A "modifier" object. This "modifier" object MUST have a "base" object for common modifiers. It can also have component-specific modifiers as direct children.
  - Component-specific properties (e.g., "content" for Text, "clickId" for Button).
  - If the component is a container (like "column", "row", "card", "box", "grid"), it should have a "children" array. Each element in "children" must be an object structured in the same way (e.g., { "text": { "modifier": {...}, "content": "Hello" } }). Spacers do not have children.

Component Type Mapping (Canvas Type -> Output Key):
- "Text" -> "text"
- "Button" -> "button"
- "Column" -> "column"
- "Row" -> "row"
- "Box" -> "box"
- "Card" -> "card"
- "Image" -> "image" (You need to define mapping for Image properties if it's used)
- "Spacer" -> "spacer"
- "LazyColumn" -> "column" (add \\\`"scrollable": true\\\` to \\\`modifier.base\\\`)
- "LazyRow" -> "row" (add \\\`"scrollable": true\\\` to \\\`modifier.base\\\`)
- "LazyVerticalGrid" -> "grid" (set \\\`modifier.orientation: "vertical"\\\`, \\\`modifier.base.scrollable: true\\\`, map \\\`columns\\\` to \\\`modifier.columns\\\`)
- "LazyHorizontalGrid" -> "grid" (set \\\`modifier.orientation: "horizontal"\\\`, \\\`modifier.base.scrollable: true\\\`, map \\\`rows\\\` to \\\`modifier.rows\\\`)

Modifier and Property Mapping Rules (from input component properties to output "Compose Remote Layout" JSON):

1.  **General Modifier Structure**:
    \`\`\`json
    "componentType": {
      "modifier": {
        "base": { /* common modifiers */ },
        /* component-specific modifiers like verticalArrangement */
      },
      /* component-specific properties like content, clickId */
      "children": [ /* if applicable */ ]
    }
    \`\`\`

2.  **Base Modifiers (\\\`modifier.base\\\`):**
    *   **Size**:
        *   \\\`width: X\\\` (number, canvas) -> \\\`width: X\\\` (dp, in \\\`modifier.base\\\`).
        *   \\\`height: X\\\` (number, canvas) -> \\\`height: X\\\` (dp, in \\\`modifier.base\\\`).
        *   If canvas \\\`width\\\` and \\\`height\\\` are equal numbers (e.g., 150), use \\\`size: 150\\\` in \\\`modifier.base\\\`.
        *   \\\`fillMaxWidth: true\\\` (canvas) -> \\\`fillMaxWidth: true\\\` in \\\`modifier.base\\\`. Do NOT set \\\`width\\\` if this is true.
        *   \\\`fillMaxHeight: true\\\` (canvas) -> \\\`fillMaxHeight: true\\\` in \\\`modifier.base\\\`. Do NOT set \\\`height\\\` if this is true.
        *   If canvas has \\\`fillMaxWidth: true\\\` AND \\\`fillMaxHeight: true\\\`, use \\\`fillMaxSize: true\\\` in \\\`modifier.base\\\`.
        *   \\\`width: "match_parent"\\\` (canvas) -> \\\`fillMaxWidth: true\\\` in \\\`modifier.base\\\`.
        *   \\\`height: "match_parent"\\\` (canvas) -> \\\`fillMaxHeight: true\\\` in \\\`modifier.base\\\`.
        *   \\\`width: "wrap_content"\\\` (canvas) -> \\\`wrapContentWidth: true\\\` in \\\`modifier.base\\\`.
        *   \\\`height: "wrap_content"\\\` (canvas) -> \\\`wrapContentHeight: true\\\` in \\\`modifier.base\\\`.
        *   \\\`aspectRatio: X\\\` (canvas, if present) -> \\\`aspectRatio: X\\\` in \\\`modifier.base\\\`.
    *   **Padding**:
        *   If \\\`padding: X\\\` (canvas, for all sides) exists -> \\\`padding: { "all": X }\\\` in \\\`modifier.base\\\`.
        *   Else, map \\\`paddingTop\\\`, \\\`paddingBottom\\\`, \\\`paddingStart\\\`, \\\`paddingEnd\\\` (canvas) to \\\`padding: { "top": Y, "start": X, ... }\\\` in \\\`modifier.base\\\`. Omit sides with zero or undefined padding.
    *   **Margin**: If canvas properties like \\\`marginStart\\\`, \\\`marginTop\\\` exist (uncommon in current spec, but if added), map similarly to \\\`margin: { ... }\\\` in \\\`modifier.base\\\`.
    *   **Background**:
        *   \\\`backgroundColor: "#RRGGBB"\\\` (canvas) -> \\\`background: { "color": "#RRGGBB", "shape": "rectangle" }\\\` in \\\`modifier.base\\\`.
        *   If \\\`cornerRadiusTopLeft\\\` (etc.) > 0 (canvas):
            *   Set \\\`modifier.base.background.shape\\\` to \\\`"roundedcorner"\\\`.
            *   If all canvas \\\`cornerRadius...\\\` properties are equal to C: use \\\`modifier.base.background.radius: C\\\`.
            *   (The target spec for background only shows a single \\\`radius\\\`. If corners differ, choose the primary one or average if appropriate, or default to a common value like 8 if any corner is rounded). For now, if any corner is rounded, use a default radius like 8 if no single value is obvious.
    *   **Border**:
        *   If \\\`borderWidth: W > 0\\\` and \\\`borderColor: "#HEX"\\\` (canvas) -> \\\`border: { "width": W, "color": "#HEX" }\\\` in \\\`modifier.base\\\`.
        *   If border exists and \\\`cornerRadiusTopLeft\\\` (etc.) > 0 (canvas): add \\\`shape: { "type": "roundedcorner", "cornerRadius": C }\\\` to \\\`modifier.base.border\\\`. If all corners are equal to C, use that for \\\`cornerRadius\\\`. Otherwise, pick a representative value.
    *   **Shadow (Mainly for Card)**:
        *   If \\\`type: "Card"\\\` and \\\`elevation: E > 0\\\` (canvas) -> \\\`shadow: { "elevation": E }\\\` in \\\`modifier.base\\\`.
        *   If card also has rounded corners (canvas \\\`cornerRadius... > 0\\\`): add \\\`shape: { "type": "roundedcorner", "cornerRadius": C }\\\` to \\\`modifier.base.shadow\\\`.
    *   **Scrolling**:
        *   For "LazyColumn", "LazyRow", "LazyVerticalGrid", "LazyHorizontalGrid" (canvas): add \\\`scrollable: true\\\` to \\\`modifier.base\\\`.
    *   **Click Interaction**:
        *   If \\\`clickId: "someId"\\\` is relevant for a component in the target spec (e.g., Card, Box), map it to \\\`clickId: "someId"\\\` in \\\`modifier.base\\\`. (Button \\\`clickId\\\` is a direct property, not modifier).
    *   **Transformations**: (Map if present in canvas properties and relevant to target spec)
        *   \\\`alpha\\\` -> \\\`alpha\\\` in \\\`modifier.base\\\`.
        *   \\\`rotate\\\` -> \\\`rotate\\\` in \\\`modifier.base\\\`.
        *   \\\`scaleX\\\`, \\\`scaleY\\\` -> \\\`scale: { "scaleX": SX, "scaleY": SY }\\\` in \\\`modifier.base\\\`.
        *   \\\`offsetX\\\`, \\\`offsetY\\\` -> \\\`offset: { "x": OX, "y": OY }\\\` in \\\`modifier.base\\\`.
        *   \\\`clipChildren\\\` (if exists) -> \\\`clip: true\\\` in \\\`modifier.base\\\`.

3.  **Component-Specific Modifiers (direct children of \\\`modifier\\\` object, NOT in \\\`base\\\`):**
    *   **Column**:
        *   \\\`verticalArrangement\\\` (canvas) -> \\\`verticalArrangement\\\` (modifier for "column"). Map values like "Top" to "top", "SpaceBetween" to "spaceBetween".
        *   \\\`horizontalAlignment\\\` (canvas) -> \\\`horizontalAlignment\\\` (modifier for "column"). Map "Start" to "start", "CenterHorizontally" to "center".
    *   **Row**:
        *   \\\`horizontalArrangement\\\` (canvas) -> \\\`horizontalArrangement\\\` (modifier for "row").
        *   \\\`verticalAlignment\\\` (canvas) -> \\\`verticalAlignment\\\` (modifier for "row").
    *   **Box**:
        *   \\\`contentAlignment\\\` (canvas, if exists) -> \\\`contentAlignment\\\` (modifier for "box"). Map values like "Center" to "center", "TopStart" to "topStart".
    *   **Grid**:
        *   \\\`columns\\\` (canvas \\\`LazyVerticalGrid.properties.columns\\\`) -> \\\`columns\\\` (modifier for "grid").
        *   \\\`rows\\\` (canvas \\\`LazyHorizontalGrid.properties.rows\\\`) -> \\\`rows\\\` (modifier for "grid").
        *   \\\`orientation\\\` (derived: "vertical" for LazyVerticalGrid, "horizontal" for LazyHorizontalGrid) -> \\\`orientation\\\` (modifier for "grid").
        *   \\\`horizontalArrangement\\\`, \\\`verticalArrangement\\\` (if present in canvas grid and applicable to target grid) -> map to modifiers for "grid".
        *   \\\`enableSnapHorizontal\\\` (if present) -> \\\`enableSnapHorizontal\\\` (modifier for "grid").

4.  **Component-Specific Properties (direct children of component type object, e.g., \\\`"text": { "content": ... }\\\`):**
    *   **Text**:
        *   \\\`text\\\` (canvas) -> \\\`content\\\` (output).
        *   \\\`fontSize\\\`, \\\`fontWeight\\\`, \\\`fontStyle\\\`, \\\`letterSpacing\\\`, \\\`lineHeight\\\`, \\\`maxLines\\\`, \\\`minLines\\\`, \\\`textDecoration\\\` (canvas) -> map to respective direct properties in "text" object.
        *   \\\`textColor\\\` (canvas) -> \\\`color\\\` (output, hex string).
        *   \\\`textAlign\\\` (canvas) -> \\\`textAlign\\\` (output, e.g., "start", "center").
        *   \\\`textOverflow\\\` (canvas) -> \\\`overflow\\\` (output, e.g., "clip", "ellipsis").
    *   **Button**:
        *   \\\`text\\\` (canvas) -> \\\`content\\\` (output, if button has no children in canvas).
        *   \\\`clickId\\\` (canvas, if exists) -> \\\`clickId\\\` (output).
        *   \\\`fontSize\\\`, \\\`fontWeight\\\`, \\\`fontColor\\\` (canvas) -> map to direct properties.
        *   If canvas Button has \\\`children\\\`, then the output "button" should have a \\\`children\\\` array and no \\\`content\\\` property.
    *   **Spacer**:
        *   \\\`width\\\` (canvas) -> \\\`width\\\` (direct property in "spacer").
        *   \\\`height\\\` (canvas) -> \\\`height\\\` (direct property in "spacer").
        *   If \\\`layoutWeight > 0\\\` (canvas), omit \\\`width\\\`/\`height\\\` for Spacer if the target spec implies weighted spacers don't need explicit dimensions. (The spec shows \\\`height\\\` and \\\`width\\\` for Spacer, so include them unless weight is the primary factor).
    *   **Image**: (Assuming similar properties to Text for things like alt text or placeholders if they exist in canvas)
        *   \\\`src\\\` (canvas) -> \\\`url\\\` (output, if target Image uses 'url'). *The spec is missing for Image, inferring from other components or common practices.* If 'src' is the target, map to 'src'.  **Let's assume target spec uses \\\`src\\\` for Image like Text uses \\\`content\\\`.**
        *   \\\`contentDescription\\\` (canvas) -> \\\`alt\\\` or \\\`contentDescription\\\` (output property for "image").

5.  **Children**:
    *   For container components (Column, Row, Box, Card, Grid from LazyGrids), recursively transform their children from the canvas \\\`properties.children\\\` array and place them into the output component's \\\`children\\\` array.

6.  **Omissions**:
    *   Do NOT include properties in the output JSON if they have null, undefined, or empty string values in the input, or if they represent default values that imply absence (e.g., padding 0, elevation 0 for non-Card). Only include properties if they have meaningful, non-default values from the input that affect the visual representation according to the target spec.
    *   Omit canvas-specific \\\`id\\\`, \\\`name\\\`, \\\`parentId\\\`, \\\`x\\\`, \\\`y\\\` from the output JSON.

Input Canvas Design JSON (Content Area):
\`\`\`json
{{{designJson}}}
\`\`\`

Ensure the output is a single JSON object adhering to the "Compose Remote Layout" structure and is "pretty-printed" with an indent of 2 spaces.
Focus on accurate mapping and adherence to the specified JSON structure.
If a canvas property does not have a clear direct mapping to the target spec, omit it unless its intent can be clearly translated to an equivalent modifier or property.
Example: A card with \\\`fillMaxWidth: true\\\` and padding \\\`16\\\` from canvas:
\`\`\`json
{
  "card": {
    "modifier": {
      "base": {
        "fillMaxWidth": true,
        "padding": { "all": 16 }
      }
    },
    "children": [ /* ... */ ]
  }
}
\`\`\`
Another example: A text component from canvas:
\`\`\`json
{
  "text": {
    "modifier": {
      "base": {
        "padding": { "top": 8, "bottom": 8 }
      }
    },
    "content": "Hello World",
    "fontSize": 16,
    "fontWeight": "bold",
    "color": "#0066CC",
    "textAlign": "center"
  }
}
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

    let jsonToFormat: any;

    if (typeof output.customJsonString === 'object') {
        jsonToFormat = output.customJsonString;
    } else {
        try {
            jsonToFormat = JSON.parse(output.customJsonString);
        } catch (e) {
            console.error("Error parsing customJsonString from AI output despite Zod refine: ", e);
            throw new Error("AI returned an invalid JSON string for customJsonString that could not be formatted.");
        }
    }
    
    // Ensure the JSON is "pretty-printed" with an indent of 2 spaces.
    const formattedJsonString = JSON.stringify(jsonToFormat, null, 2);
    
    return { customJsonString: formattedJsonString };
  }
);

