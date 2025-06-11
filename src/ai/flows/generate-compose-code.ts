
'use server';

/**
 * @fileOverview Generates Jetpack Compose code from a JSON representation of a UI design.
 *
 * - generateComposeCode - A function that takes a JSON string representing a UI design and returns Jetpack Compose code.
 * - GenerateComposeCodeInput - The input type for the generateComposeCode function.
 * - GenerateComposeCodeOutput - The return type for the generateComposeCode function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateComposeCodeInputSchema = z.object({
  designJson: z
    .string()
    .describe('A JSON string representing the UI design.')
    .refine(
      (data) => {
        try {
          JSON.parse(data);
          return true;
        } catch (e) {
          return false;
        }
      },
      { message: 'The design data is not in a valid JSON format.' }
    ),
});
export type GenerateComposeCodeInput = z.infer<typeof GenerateComposeCodeInputSchema>;

const GenerateComposeCodeOutputSchema = z.object({
  composeCode: z.string().describe('The generated Jetpack Compose code.'),
});
export type GenerateComposeCodeOutput = z.infer<typeof GenerateComposeCodeOutputSchema>;

export async function generateComposeCode(input: GenerateComposeCodeInput): Promise<GenerateComposeCodeOutput> {
  return generateComposeCodeFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateComposeCodePrompt',
  input: {schema: GenerateComposeCodeInputSchema},
  output: {schema: GenerateComposeCodeOutputSchema},
  prompt: `You are a skilled Jetpack Compose developer. Generate Jetpack Compose code based on the following JSON representation of the UI design.

  Design JSON:
  \`\`\`json
  {{{designJson}}}
  \`\`\`

  Ensure the generated code is well-formatted, readable, and implements the design accurately.
  Do not include any comments unless they are necessary to explain complex logic.
  The code should be ready to be copy and pasted into an Android project.
  Do not include a full composable code including imports and package names, only the composable definition with @Composable annotation.

  Modifier Rules:
  - If a component has a 'fillMaxWidth' property set to true, use Modifier.fillMaxWidth().
  - Else if a component has a 'width' property:
    - If 'width' is "match_parent", use Modifier.fillMaxWidth().
    - If 'width' is "wrap_content", use Modifier.wrapContentWidth().
    - If 'width' is a number, use Modifier.width(X.dp).
  - If a component has a 'fillMaxHeight' property set to true, use Modifier.fillMaxHeight().
  - Else if a component has a 'height' property:
    - If 'height' is "match_parent", use Modifier.fillMaxHeight().
    - If 'height' is "wrap_content", use Modifier.wrapContentHeight().
    - If 'height' is a number, use Modifier.height(X.dp).
  - If a component has a 'layoutWeight' property greater than 0, use Modifier.weight(Xf). For example, if layoutWeight is 1, use Modifier.weight(1f).

  - Padding:
    - Determine effective padding for each side:
      effectiveTop = properties.paddingTop (if defined) ?? properties.padding (if defined) ?? 0
      effectiveBottom = properties.paddingBottom (if defined) ?? properties.padding (if defined) ?? 0
      effectiveStart = properties.paddingStart (if defined) ?? properties.padding (if defined) ?? 0
      effectiveEnd = properties.paddingEnd (if defined) ?? properties.padding (if defined) ?? 0
    - If all effective paddings (top, bottom, start, end) are equal AND this common value is not 0, use Modifier.padding(all = commonValue.dp).
    - Otherwise, if any effective padding is not 0, use Modifier.padding(start = effectiveStart.dp, top = effectiveTop.dp, end = effectiveEnd.dp, bottom = effectiveBottom.dp). Omit sides from the call if their effective padding is 0 (e.g., if only top is non-zero, use Modifier.padding(top = effectiveTop.dp)).
    - If all effective paddings are 0, do not add a padding modifier.

  When a component (like Card, Box, Image) has 'cornerRadiusTopLeft', 'cornerRadiusTopRight', 'cornerRadiusBottomRight', 'cornerRadiusBottomLeft' properties, apply them using a Modifier.clip(RoundedCornerShape(...)) with individual corner sizes. For example:
  Modifier.clip(RoundedCornerShape(
    topStart = properties.cornerRadiusTopLeft.dp,
    topEnd = properties.cornerRadiusTopRight.dp,
    bottomEnd = properties.cornerRadiusBottomRight.dp,
    bottomStart = properties.cornerRadiusBottomLeft.dp
  ))
  If all four corner radius properties are present and equal, you can use the simpler Modifier.clip(RoundedCornerShape(size = X.dp)). This clip modifier should be applied for the shape of the component.

  For Card components, ensure you use the standard Card parameters:
  - Use the 'elevation' property from the JSON for the 'elevation' parameter of the Card (e.g., elevation = CardDefaults.cardElevation(defaultElevation = properties.elevation.dp)).
  - Use the 'backgroundColor' property from the JSON for the 'colors' parameter using CardDefaults.cardColors(containerColor = Color(android.graphics.Color.parseColor(properties.backgroundColor))).
  - Use the 'contentColor' property from the JSON for the 'colors' parameter if it is provided (e.g., CardDefaults.cardColors(containerColor = ..., contentColor = Color(android.graphics.Color.parseColor(properties.contentColor)))). If 'contentColor' is not provided in the JSON, omit this specific contentColor from CardDefaults.cardColors to let Jetpack Compose use its default behavior (contentColorFor(backgroundColor)).
  - For the 'shape' parameter, use RoundedCornerShape based on the 'cornerRadius...' properties. If all four 'cornerRadius...' properties are present and equal to X, use 'shape = RoundedCornerShape(size = X.dp)'. Otherwise, if individual corner radii are provided, create a RoundedCornerShape with those specific values (e.g., shape = RoundedCornerShape(topStart = properties.cornerRadiusTopLeft.dp, ...)).
  - If the Card component has a 'borderWidth' property greater than 0 and a 'borderColor' property, apply a border using the 'border' parameter with 'BorderStroke'. Convert the hex 'borderColor' to a Compose Color. For example:
    border = BorderStroke(width = properties.borderWidth.dp, color = Color(android.graphics.Color.parseColor(properties.borderColor)))
    Remember to import androidx.compose.foundation.BorderStroke, android.graphics.Color, androidx.compose.material3.CardDefaults if you use this.

  For Spacer components:
  - If 'layoutWeight' property > 0: Use Spacer(modifier = Modifier.weight(Wf)). If it also has specific width/height and these are not meant to be overridden by weight (e.g. a weighted spacer that also clears a minimum space), include them: Spacer(Modifier.weight(Wf).width(X.dp).height(Y.dp)). If it's a flexible spacer meant to consume space, often width/height can be 0.dp or fillMaxWidth/Height if it's the *only* weighted element in a Row/Column with defined size: e.g., Spacer(Modifier.weight(1f).fillMaxWidth()).
  - Else (no layoutWeight):
    - If width > 0 and height > 0: Spacer(modifier = Modifier.width(X.dp).height(Y.dp)).
    - If width > 0 and height is 0 or undefined: Spacer(modifier = Modifier.width(X.dp)).
    - If height > 0 and width is 0 or undefined: Spacer(modifier = Modifier.height(Y.dp)).
    - If both are 0 or undefined (and no weight): Spacer(Modifier.size(0.dp)) or omit if not meaningful.

Intelligent List Handling for LazyColumn and LazyRow:
- This applies ONLY to LazyColumn and LazyRow components.
- When a LazyColumn or LazyRow contains multiple child components (2 or more) that are structurally identical (same type, same nested structure, and most properties are the same), you should optimize the code generation.
- Instead of repeating the Composable for each identical item, you MUST:
    1. Define a simple data class (e.g., \`data class ListItemData(val text: String, val imageUrl: String?, ...other_dynamic_props)\`) to represent the varying parts of the repeated item. Name the fields of the data class semantically based on what they represent (e.g., \`title\`, \`imageUrl\`, \`description\`).
    2. Create a new Composable function (e.g., \`@Composable fun MyListItem(item: ListItemData) { ... }\`) that renders one instance of the repeated component, using the fields from \`item\`. This function should encapsulate the common structure and modifiers of the repeated item.
    3. In the main Composable (or where the LazyColumn/LazyRow is defined), prepare a \`List<ListItemData>\` by extracting the dynamic values from the JSON for each repeated item.
    4. Use \`itemsIndexed(itemsList) { index, item -> MyListItem(item) }\` or \`items(itemsList) { item -> MyListItem(item) }\` within the LazyColumn/LazyRow to render the list. Prefer \`itemsIndexed\` if the index is needed within \`MyListItem\`, otherwise use \`items\`.
- Identifying Dynamic Properties:
    - Look for properties that change from one repeated item to the next.
    - For Text components, the \`text\` property is often dynamic.
    - For Image components, the \`src\` property (image URL) is often dynamic. The \`contentDescription\` might also be dynamic or derived from other dynamic text.
    - For Button components, the \`text\` property is often dynamic.
    - Other properties (like \`backgroundColor\` or a specific \`padding\` value) might be dynamic if they vary consistently across the repeated items.
- Example:
  If the JSON shows a LazyColumn with three Cards that are structurally identical but have different text and image sources:
  Card 1: { type: "Card", properties: { ..., children: [ { type: "Text", properties: { text: "Item 1 Title" } }, { type: "Image", properties: { src: "image1.png" } } ] } }
  Card 2: { type: "Card", properties: { ..., children: [ { type: "Text", properties: { text: "Item 2 Title" } }, { type: "Image", properties: { src: "image2.png" } } ] } }
  Card 3: { type: "Card", properties: { ..., children: [ { type: "Text", properties: { text: "Item 3 Title" } }, { type: "Image", properties: { src: "image3.png" } } ] } }
  (Assume other Card properties like elevation, backgroundColor, padding are the same for all three)

  The generated code should look something like this:
  \`\`\`kotlin
  // Main Composable containing the LazyColumn
  @Composable
  fun MyScreen() {
      data class MyItemData(val title: String, val imageUrl: String)
      val items = listOf(
          MyItemData("Item 1 Title", "image1.png"),
          MyItemData("Item 2 Title", "image2.png"),
          MyItemData("Item 3 Title", "image3.png")
      )

      LazyColumn(
          // ... modifiers for LazyColumn from JSON ...
      ) {
          items(items) { itemData ->
              MyListItemComposable(item = itemData)
          }
      }
  }

  // Composable for a single list item
  @Composable
  fun MyListItemComposable(item: MyItemData) {
      Card(
          // ... common Card modifiers and properties from JSON ...
          // e.g., modifier = Modifier.padding(8.dp), elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
      ) {
          Column(modifier = Modifier.padding(16.dp)) { // Example inner structure
              Text(
                  text = item.title,
                  // ... common Text modifiers/properties ...
              )
              Image(
                  painter = प्रतिमा.core.painter.rememberAsyncImagePainter(item.imageUrl), // Use rememberAsyncImagePainter for URLs
                  contentDescription = "Image for \${item.title}", // Or a more generic description
                  modifier = Modifier.size(64.dp) // Example common Image modifier
                  // ... other common Image modifiers/properties ...
              )
          }
      }
  }
  \`\`\`
- Focus on sequences of 2 or more structurally identical items.
- If the items are not sufficiently similar or the pattern is too complex to confidently extract a data class and item Composable, fall back to generating individual Composables for each child directly within the LazyColumn/LazyRow.
- The generated item Composable (e.g., \`MyListItemComposable\`) should correctly use all relevant common modifiers and properties from the JSON structure of one ofr the repeated items, parameterizing only the dynamic parts identified.
- When generating \`contentDescription\` for images inside list items, try to make it dynamic if possible (e.g., based on a text property of the item) or use a generic but descriptive placeholder.
- If a Button's action/onClick is relevant and varies, this is more complex; for now, assume onClick handlers are not part of this dynamic generation for lists.
`,
});

const generateComposeCodeFlow = ai.defineFlow(
  {
    name: 'generateComposeCodeFlow',
    inputSchema: GenerateComposeCodeInputSchema,
    outputSchema: GenerateComposeCodeOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
