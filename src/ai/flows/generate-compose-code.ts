
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
  - If a component has a 'width' property:
    - If 'width' is "match_parent", use Modifier.fillMaxWidth().
    - If 'width' is "wrap_content", use Modifier.wrapContentWidth().
    - If 'width' is a number, use Modifier.width(X.dp).
  - If a component has a 'height' property:
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

    