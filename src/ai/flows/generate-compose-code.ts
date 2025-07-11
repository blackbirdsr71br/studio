
'use server';

/**
 * @fileOverview Generates Jetpack Compose code from a JSON representation of a UI design.
 * The design now expects a root "Scaffold" component which contains topBar, content, and bottomBar.
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
    .describe('A JSON string representing the UI design. Expects a root "Scaffold" component with "topBar", "content", and "bottomBar" properties containing their respective component trees.')
    .refine(
      (data) => {
        try {
          const parsed = JSON.parse(data);
          // Basic check for scaffold structure
          return typeof parsed === 'object' && parsed !== null && parsed.type === 'Scaffold';
        } catch (e) {
          return false;
        }
      },
      { message: 'The design data is not in a valid JSON format or is not a root Scaffold object.' }
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
  prompt: `You are an expert Jetpack Compose developer. Generate a complete Jetpack Compose screen based on the following JSON representation.
The root of the JSON (\`{{{designJson}}}\`) will be a "Scaffold" component. This Scaffold contains three main slots: "topBar", "content", and "bottomBar".
Each slot can either be null or contain a single component object (e.g., TopAppBar for topBar, LazyColumn for content, BottomNavigationBar for bottomBar). These component objects will have their own "type", "properties", and potentially "children" if they are containers.

Your output should be a single \`@Composable\` function representing the entire screen.
Start with a function signature like \`@Composable fun MyGeneratedScreen() { ... }\`.
Ensure all necessary imports are included if you can infer them (e.g., androidx.compose.material3.*, androidx.compose.foundation.layout.*, androidx.compose.animation.* etc.), but prioritize the Composable body.

Scaffold Structure:
Generate a \`Scaffold\` composable.
- If \`{{{designJson.topBar}}}\` is present, generate its Composable and pass it to the \`topBar\` lambda of the \`Scaffold\`.
- If \`{{{designJson.bottomBar}}}\` is present, generate its Composable and pass it to the \`bottomBar\` lambda of the \`Scaffold\`.
- The \`{{{designJson.content}}}\` (which is typically a LazyColumn or similar scrollable container) should be generated within the main content lambda of the \`Scaffold\`. Remember this content lambda provides \`PaddingValues\` which should be applied as padding to the main content container (e.g., \`Modifier.padding(paddingValues)\`).

General Component Generation Rules:
- For each component described in the JSON (whether in topBar, content, or bottomBar, or nested within them), generate the corresponding Jetpack Compose Composable.
- Use \`Modifier\` for layout, styling, padding, etc.
- Component properties from the JSON (e.g., "text", "backgroundColor", "fontSize", "itemSpacing", "horizontalAlignment") should be mapped to the appropriate Composable parameters or Modifier functions.
- If a component has a "children" array in its properties, recursively generate Composables for those children within the parent Composable.

Modifier Rules:
- If 'fillMaxSize' is true, use Modifier.fillMaxSize().
- Else if 'fillMaxWidth' is true, use Modifier.fillMaxWidth().
- Else if 'fillMaxHeight' is true, use Modifier.fillMaxHeight().
- If 'width' is a number, use Modifier.width(X.dp).
- If 'height' is a number, use Modifier.height(Y.dp).
- If 'layoutWeight' > 0, use Modifier.weight(Xf).
- Padding:
    - effectiveTop = properties.paddingTop ?? properties.padding ?? 0
    - effectiveBottom = properties.paddingBottom ?? properties.padding ?? 0
    - effectiveStart = properties.paddingStart ?? properties.padding ?? 0
    - effectiveEnd = properties.paddingEnd ?? properties.padding ?? 0
    - If all effective paddings are equal and non-zero, use Modifier.padding(all = commonValue.dp).
    - Else, use Modifier.padding(start = effectiveStart.dp, top = effectiveTop.dp, ...) omitting zero values.
- Corner Radius (for Card, Box, Image, AnimatedContent): Use Modifier.clip(RoundedCornerShape(...)) if any cornerRadius... properties are set. If all are equal (value C), use RoundedCornerShape(C.dp). Otherwise, specify individual corners.
- Card: Use parameters like 'elevation', 'colors = CardDefaults.cardColors(containerColor = ...)', 'shape', 'border'.
- Spacer: If 'layoutWeight' > 0, Spacer(Modifier.weight(Wf)). Otherwise, Spacer(Modifier.width(X.dp).height(Y.dp)) or just width/height if one is zero.
- TopAppBar: Expect a 'title' string property. Render inside \`TopAppBar(...)\`. Its children (if any) are for actions or navigation icons.
- BottomNavigationBar: Render inside \`BottomAppBar(...)\` or \`NavigationBar(...)\`. Its children are usually \`NavigationBarItem\`s. If children are generic (e.g. Column with Icon and Text), adapt.
- Click Handling: If a component has 'clickable: true' AND a non-empty 'clickId' string property, add 'Modifier.clickable { /* TODO: Handle click for '{{{properties.clickId}}}' */ }' to its modifiers.

Lazy List Handling (LazyColumn, LazyRow):
- If a LazyColumn/LazyRow contains multiple (2+) structurally identical children, define a data class and an item Composable function.
- Example: \`data class MyItemData(val title: String)\` and \`@Composable fun MyListItem(item: MyItemData) { Card { Text(item.title) } }\`.
- Use \`items(itemsList) { item -> MyListItem(item) }\`.

AnimatedContent Handling:
- If you see a component with type "AnimatedContent", generate an "@OptIn(ExperimentalAnimationApi::class) AnimatedContent" composable.
- You must create a mutable state variable to control the animation, e.g., "var showContent by remember { mutableStateOf(true) }".
- The generated UI should include a separate Composable (like a Button) to toggle this state variable, so the user can see the animation.
- The "targetState" of the "AnimatedContent" should be bound to this state variable.
- Inside the "AnimatedContent" lambda, which provides the target state as a parameter (e.g., "it" or "isVisible"), you MUST check this parameter before rendering the children. For example: "if (isVisible) { // Render children here }".
- The "transitionSpec" should be configured based on the "animationType" property. Use a "ContentTransform" that combines enter and exit transitions with the "with" keyword.
- Example "transitionSpec" for "Fade": "fadeIn(animationSpec = tween(animationDuration)) with fadeOut(animationSpec = tween(animationDuration))"
- Example "transitionSpec" for "SlideFromTop": "(slideInVertically(tween(animationDuration)) { fullHeight -> -fullHeight } + fadeIn(tween(animationDuration))) with (slideOutVertically(tween(animationDuration)) { fullHeight -> -fullHeight } + fadeOut(tween(animationDuration)))"
- Ensure all necessary imports from "androidx.compose.animation.*" are included.

Example of Expected JSON Structure ({{{designJson}}}):
\`\`\`json
{
  "type": "Scaffold",
  "properties": {
    "backgroundColor": "#FFFFFF" // Optional background for scaffold
  },
  "topBar": {
    "type": "TopAppBar",
    "properties": { "title": "My App", "backgroundColor": "#3F51B5" },
    "children": [ /* e.g., action icons as Image/Icon components */ ]
  },
  "content": {
    "type": "LazyColumn",
    "properties": { "padding": 16, "itemSpacing": 8, "backgroundColor": "#EEEEEE", "fillMaxSize": true },
    "children": [
      { "type": "Text", "properties": { "text": "Hello" } },
      { "type": "Button", "properties": { "text": "Click", "clickable": true, "clickId": "my_button" } }
    ]
  },
  "bottomBar": {
    "type": "BottomNavigationBar",
    "properties": { "backgroundColor": "#F0F0F0" },
    "children": [ /* e.g., navigation items */ ]
  }
}
\`\`\`

Remember to apply \`Modifier.padding(paddingValues)\` to the root composable inside the Scaffold's content lambda.
Do not include a package name declaration. Only provide the \`@Composable\` function and necessary imports if you can determine them.
The main composable function should be named based on the context, e.g., \`MyGeneratedScreen\`.
Focus on accurate translation of the JSON structure into Jetpack Compose code.
Only generate the composable function. No package name, no main function.
Ensure all hexadecimal colors from JSON (e.g., "#FF0000") are converted to Compose \`Color\` objects (e.g., \`Color(android.graphics.Color.parseColor("#FF0000"))\`). You will need to import \`android.graphics.Color\` and \`androidx.compose.ui.graphics.Color\`.

Design JSON:
\`\`\`json
{{{designJson}}}
\`\`\`
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
