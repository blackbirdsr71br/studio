
'use server';
import { generateComposeCode, type GenerateComposeCodeInput } from '@/ai/flows/generate-compose-code';
import { generateImageFromHint, type GenerateImageFromHintInput } from '@/ai/flows/generate-image-from-hint-flow';
import { generateJsonFromComposeCommands, type GenerateJsonFromComposeCommandsInput } from '@/ai/flows/generate-json-from-compose-commands';
import { generateCustomCommandJson, type GenerateCustomCommandJsonInput } from '@/ai/flows/generate-custom-command-json';
import { convertCanvasToCustomJson, type ConvertCanvasToCustomJsonInput } from '@/ai/flows/convert-canvas-to-custom-json-flow.ts';
import type { DesignComponent, CustomComponentTemplate, BaseComponentProps } from '@/types/compose-spec';
import { isContainerType, DEFAULT_ROOT_LAZY_COLUMN_ID } from '@/types/compose-spec';
import { getRemoteConfig, isAdminInitialized } from '@/lib/firebaseAdmin';
import { promises as fs } from 'fs';
import path from 'path';
import { hexToHslCssString } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';


const REMOTE_CONFIG_PARAMETER_KEY = 'COMPOSE_DESIGN_JSON';

// Helper function to remove properties with empty string or null values
const cleanEmptyOrNullProperties = (properties: Record<string, any>): Record<string, any> => {
  const cleanedProperties = { ...properties };
  for (const key in cleanedProperties) {
    if (cleanedProperties[key] === "" || cleanedProperties[key] === null) {
      delete cleanedProperties[key];
    }
  }
  return cleanedProperties;
};

// Interface for the nodes in the AI-specific tree
interface AiComponentTreeNode {
  id: string;
  type: string; // ComponentType or custom type string
  name: string;
  properties: Record<string, any>;
  children?: AiComponentTreeNode[];
}

// Helper to create a hierarchical structure for the AI
const buildComponentTreeForAi = (
  allComponents: DesignComponent[],
  customComponentTemplates: CustomComponentTemplate[],
  parentId: string | null = null
): AiComponentTreeNode[] => {
  return allComponents
    .filter(component => component.parentId === parentId)
    .map(component => {
      let nodeProperties = cleanEmptyOrNullProperties({ ...component.properties });

      // For AI tree, x/y only relevant for top-level (null parentId) non-default-root components
      if (component.id !== DEFAULT_ROOT_LAZY_COLUMN_ID && !parentId) {
        // keep x, y if they exist
      } else if (parentId) { // If it has a parent, x,y are determined by parent layout
        delete nodeProperties.x;
        delete nodeProperties.y;
      }


      const node: AiComponentTreeNode = {
        id: component.id,
        type: component.type,
        name: component.name,
        properties: nodeProperties,
      };

      if (isContainerType(component.type, customComponentTemplates)) {
        const children = buildComponentTreeForAi(allComponents, customComponentTemplates, component.id);
        if (children.length > 0) {
          node.children = children; // AI tree uses 'children' at top level of node for nesting
        }
      }
      return node;
    });
};


export async function generateJetpackComposeCodeAction(
  components: DesignComponent[],
  customComponentTemplates: CustomComponentTemplate[]
): Promise<string> {
  try {
    // Filter out the root lazy column if it has no actual user children for code generation
    const userMeaningfulComponents = components.filter(c => {
        if (c.id === DEFAULT_ROOT_LAZY_COLUMN_ID) {
            return c.properties.children && c.properties.children.length > 0;
        }
        return true;
    });
    
    let componentTreeForAi;
    if (userMeaningfulComponents.length === 1 && userMeaningfulComponents[0].id === DEFAULT_ROOT_LAZY_COLUMN_ID) {
      // If only the root (with children) is left, build tree from its children
      componentTreeForAi = buildComponentTreeForAi(components, customComponentTemplates, DEFAULT_ROOT_LAZY_COLUMN_ID);
    } else if (userMeaningfulComponents.length === 0) {
      return "No user components on the canvas to generate code from.";
    }
    else {
      // Otherwise, build from actual root-level user components (should not happen if parenting is correct)
      // or if the root was filtered out but other free-floating components exist (also shouldn't happen)
      componentTreeForAi = buildComponentTreeForAi(userMeaningfulComponents, customComponentTemplates, null);
    }


    const designJson = JSON.stringify(componentTreeForAi, null, 2);

    const input: GenerateComposeCodeInput = { designJson };
    const result = await generateComposeCode(input);
    return result.composeCode;
  } catch (error) {
    console.error("Error generating Jetpack Compose code:", error);
    if (error instanceof Error) {
      return `Error: ${error.message}`;
    }
    return "An unknown error occurred while generating code.";
  }
}

// Interface for the nodes in the full JSON tree (for Remote Config)
interface FullComponentTreeNodeForRemoteConfig extends DesignComponent {
  childrenComponents?: FullComponentTreeNodeForRemoteConfig[]; // Remote Config uses childrenComponents
}

// Helper for Remote Config JSON (hierarchical, includes root, uses 'childrenComponents')
const buildFullComponentTreeForRemoteConfig = (
  allComponents: DesignComponent[],
  customComponentTemplates: CustomComponentTemplate[],
  currentParentId: string | null = null
): FullComponentTreeNodeForRemoteConfig[] => {
  return allComponents
    .filter(c => c.parentId === currentParentId)
    .map(c => {
      const componentDataCopy = { ...c };
      componentDataCopy.properties = cleanEmptyOrNullProperties({ ...c.properties });

      const node: FullComponentTreeNodeForRemoteConfig = {
        ...componentDataCopy
      };
       // For Remote Config, x/y only relevant for top-level non-default-root components
      if (c.id !== DEFAULT_ROOT_LAZY_COLUMN_ID && !currentParentId) {
        // keep x, y
      } else if (currentParentId) {
        delete node.properties.x;
        delete node.properties.y;
      }


      if (isContainerType(c.type, customComponentTemplates)) {
        const childrenNodes = buildFullComponentTreeForRemoteConfig(allComponents, customComponentTemplates, c.id);
        if (childrenNodes.length > 0) {
          node.childrenComponents = childrenNodes;
        }
      }
      return node;
    });
};


// Interface for nodes in the JSON for the "View JSON" modal
interface ModalJsonNode {
  id: string;
  type: DesignComponent['type'];
  name: string;
  parentId: string | null; // Actual parentId from DesignContext
  properties: BaseComponentProps; // Will contain nested children: ModalJsonNode[] if container
}

// Helper for "View JSON" modal (hierarchical, children in properties.children, excludes root)
const buildComponentTreeForModalJson = (
  allComponents: DesignComponent[],
  customComponentTemplates: CustomComponentTemplate[],
  currentParentIdForContext: string | null
): ModalJsonNode[] => {
  return allComponents
    .filter(component => component.parentId === currentParentIdForContext)
    .map(component => {
      // Start with all properties from the original component
      const componentBaseProperties = { ...component.properties };

      // 1. Remove x, y as their layout is dictated by parent container in this context
      delete componentBaseProperties.x;
      delete componentBaseProperties.y;

      // 2. Separate the 'children' (array of IDs from DesignComponent structure) property
      //    We don't want the ID array in the modal JSON's properties if we're putting objects there.
      const { children: _childIdArrayFromProps, ...otherProperties } = componentBaseProperties;

      // 3. Clean empty strings and nulls from the remaining otherProperties
      const cleanedOtherProperties = cleanEmptyOrNullProperties(otherProperties);

      const node: ModalJsonNode = {
        id: component.id,
        type: component.type,
        name: component.name,
        parentId: component.parentId, // This is the actual parentId from DesignContext
        properties: cleanedOtherProperties, // Properties for JSON, initially without 'children' key for nested objects
      };

      if (isContainerType(component.type, customComponentTemplates)) {
        // Recursively get child nodes (which will be ModalJsonNode[])
        const childrenObjectNodes = buildComponentTreeForModalJson(allComponents, customComponentTemplates, component.id);
        if (childrenObjectNodes.length > 0) {
          node.properties.children = childrenObjectNodes as any; // Nest full child objects here
        }
      }
      return node;
    });
};

// This action is for getting the hierarchical list of user components for editing in the modal
export async function getDesignComponentsAsJsonAction(
  allComponents: DesignComponent[],
  customComponentTemplates: CustomComponentTemplate[]
): Promise<string> {
  try {
    // Build the hierarchical tree for children of the default root LazyColumn for the modal
    const modalJsonTree = buildComponentTreeForModalJson(
        allComponents,
        customComponentTemplates,
        DEFAULT_ROOT_LAZY_COLUMN_ID // Get children of the root LazyColumn
    );
    return JSON.stringify(modalJsonTree, null, 2);
  } catch (error) {
    console.error("Error generating hierarchical design components JSON for editor:", error);
    if (error instanceof Error) {
      return `Error: ${error.message}`;
    }
    return "An unknown error occurred while generating JSON for components.";
  }
}


export async function publishToRemoteConfigAction(
  components: DesignComponent[],
  customComponentTemplates: CustomComponentTemplate[]
): Promise<{ success: boolean; message: string; version?: string }> {
  if (!isAdminInitialized()) {
    return { success: false, message: 'Firebase Admin SDK not initialized. Check server logs and FIREBASE_SERVICE_ACCOUNT_JSON.' };
  }

  const remoteConfig = getRemoteConfig();
  if (!remoteConfig) {
    return { success: false, message: 'Failed to get Remote Config instance. Firebase Admin SDK might not be properly configured.' };
  }

  try {
    // For Remote Config, we build the full hierarchical tree including the root.
    const fullComponentTreeForRemote = buildFullComponentTreeForRemoteConfig(components, customComponentTemplates, null);
    const designJsonString = JSON.stringify(fullComponentTreeForRemote, null, 2);


    const currentTemplate = await remoteConfig.getTemplate();

    currentTemplate.parameters[REMOTE_CONFIG_PARAMETER_KEY] = {
      defaultValue: { value: designJsonString },
      description: 'Jetpack Compose UI design generated by Compose Builder.',
      valueType: 'JSON',
    };

    await remoteConfig.validateTemplate(currentTemplate);

    const updatedTemplate = await remoteConfig.publishTemplate(currentTemplate);

    return {
      success: true,
      message: `Design published to Remote Config parameter "${REMOTE_CONFIG_PARAMETER_KEY}".`,
      version: updatedTemplate.version?.toString()
    };

  } catch (error) {
    console.error("Error publishing to Firebase Remote Config:", error);
    let message = "An unknown error occurred while publishing to Remote Config.";
    if (error instanceof Error) {
      message = error.message;
    }
    if (typeof error === 'object' && error !== null && 'errorInfo' in error) {
        const firebaseError = error as { errorInfo?: { code?: string, message?: string }};
        if (firebaseError.errorInfo?.code === 'remoteconfig/template-version-mismatch') {
            message = 'Remote Config template version mismatch. Please try again.';
        } else if (firebaseError.errorInfo?.message) {
            message = firebaseError.errorInfo.message;
        }
    }
    return { success: false, message: `Error: ${message}` };
  }
}

export async function generateImageFromHintAction(hint: string): Promise<{ imageUrl: string | null; error?: string }> {
  if (!hint || hint.trim() === "") {
    return { imageUrl: null, error: "Hint cannot be empty." };
  }
  try {
    const input: GenerateImageFromHintInput = { hint };
    const result = await generateImageFromHint(input);
    return { imageUrl: result.imageUrl };
  } catch (error) {
    console.error("Error in generateImageFromHintAction:", error);
    const message = error instanceof Error ? error.message : "An unknown error occurred during image generation.";
    return { imageUrl: null, error: message };
  }
}

export async function generateJsonFromTextAction(
  composeCommands: string
): Promise<{ designJson?: string; error?: string }> {
  if (!composeCommands || composeCommands.trim().length < 10) {
    return { error: "Compose commands input is too short. Please provide more details." };
  }
  try {
    const input: GenerateJsonFromComposeCommandsInput = { composeCommands };
    const result = await generateJsonFromComposeCommands(input);
    return { designJson: result.designJson };
  } catch (error) {
    console.error("Error in generateJsonFromTextAction:", error);
    const message = error instanceof Error ? error.message : "An unknown error occurred during JSON generation from text.";
    return { error: message };
  }
}

export async function generateCustomCommandJsonAction(
  commands: string
): Promise<{ commandJson?: string; error?: string }> {
  if (!commands || commands.trim().length < 10) {
    return { error: "Input commands are too short. Please provide more details." };
  }
  try {
    const input: GenerateCustomCommandJsonInput = { commands };
    const result = await generateCustomCommandJson(input);
    return { commandJson: result.commandJson };
  } catch (error) {
    console.error("Error in generateCustomCommandJsonAction:", error);
    const message = error instanceof Error ? error.message : "An unknown error occurred during custom command JSON generation.";
    return { error: message };
  }
}

export async function convertCanvasToCustomJsonAction(
  allComponents: DesignComponent[],
  customComponentTemplates: CustomComponentTemplate[]
): Promise<{ customJsonString?: string; error?: string }> {
  try {
    // Get the JSON representing the children of the root canvas node
    const canvasDesignJsonString = await getDesignComponentsAsJsonAction(allComponents, customComponentTemplates);

    if (canvasDesignJsonString.startsWith("Error:") || 
        (canvasDesignJsonString === "[]" && allComponents.filter(c => c.id !== DEFAULT_ROOT_LAZY_COLUMN_ID && c.parentId === DEFAULT_ROOT_LAZY_COLUMN_ID).length > 0) ||
        (canvasDesignJsonString === "[]" && allComponents.filter(c => c.parentId === DEFAULT_ROOT_LAZY_COLUMN_ID).length === 0 && allComponents.length > 1) // Edge case: empty canvas but root exists
       ) {
      // If getDesignComponentsAsJsonAction returned an error, or if it's empty but there are actually user components
      // directly under the root that should have been caught.
      // The second part of the OR handles if the canvas is "empty" but has structure.
      // The third part ensures if the canvas is truly empty (only root exists), we don't call AI with "[]" which is valid JSON but means "no user components".
      const userComponentsOnCanvas = allComponents.filter(c => c.parentId === DEFAULT_ROOT_LAZY_COLUMN_ID);
      if (userComponentsOnCanvas.length === 0) {
        return { error: "No user components on the canvas to convert." };
      }
      // If there was an error preparing, but components exist, that's a specific error.
      if (canvasDesignJsonString.startsWith("Error:")) {
         return { error: "Failed to prepare canvas data for conversion: " + canvasDesignJsonString };
      }
    }
    
    const input: ConvertCanvasToCustomJsonInput = { designJson: canvasDesignJsonString };
    const result = await convertCanvasToCustomJson(input);
    return { customJsonString: result.customJsonString };
  } catch (error)
{
    console.error("Error in convertCanvasToCustomJsonAction:", error);
    const message = error instanceof Error ? error.message : "An unknown error occurred during custom JSON conversion from canvas.";
    return { error: message };
  }
}


export interface GlobalThemeColorsInput {
  lightBackground: string; // hex
  lightForeground: string; // hex
  lightPrimary: string;    // hex
  lightAccent: string;     // hex
  darkBackground: string;  // hex
  darkForeground: string;  // hex
  darkPrimary: string;     // hex
  darkAccent: string;      // hex
}

export async function updateGlobalStylesheetAction(
  themeColors: GlobalThemeColorsInput
): Promise<{ success: boolean; error?: string }> {
  const globalsCssPath = path.join(process.cwd(), 'src', 'app', 'globals.css');

  try {
    let cssContent = await fs.readFile(globalsCssPath, 'utf-8');

    const conversions: { hex: string, cssVar: string, section?: 'light' | 'dark' }[] = [
      { hex: themeColors.lightBackground, cssVar: '--background', section: 'light' },
      { hex: themeColors.lightForeground, cssVar: '--foreground', section: 'light' },
      { hex: themeColors.lightPrimary,    cssVar: '--primary',    section: 'light' },
      { hex: themeColors.lightAccent,     cssVar: '--accent',     section: 'light' },
      { hex: themeColors.darkBackground,  cssVar: '--background', section: 'dark' },
      { hex: themeColors.darkForeground,  cssVar: '--foreground', section: 'dark' },
      { hex: themeColors.darkPrimary,     cssVar: '--primary',    section: 'dark' },
      { hex: themeColors.darkAccent,      cssVar: '--accent',     section: 'dark' },
    ];

    for (const { hex, cssVar, section } of conversions) {
      const hslString = hexToHslCssString(hex);
      if (!hslString) {
        console.warn(`Invalid HEX color '${hex}' for ${cssVar} in ${section} theme. Skipping update for this variable.`);
        continue;
      }

      let regex;
      if (section === 'light') {
        // Matches: --variable: HSL_VALUE; (within :root)
        regex = new RegExp(`(:root\\s*{[^}]*${cssVar}\\s*:\\s*)[0-9]+\\s+[0-9]+%\\s+[0-9]+%(\\s*;[^}]*})`, 's');
      } else { // dark
        // Matches: --variable: HSL_VALUE; (within .dark)
        regex = new RegExp(`(\\.dark\\s*{[^}]*${cssVar}\\s*:\\s*)[0-9]+\\s+[0-9]+%\\s+[0-9]+%(\\s*;[^}]*})`, 's');
      }
      
      if (cssContent.match(regex)) {
        cssContent = cssContent.replace(regex, `$1${hslString}$2`);
      } else {
        console.warn(`CSS variable ${cssVar} not found for ${section} theme in globals.css using pattern. It might need manual update or regex adjustment.`);
      }
    }

    await fs.writeFile(globalsCssPath, cssContent, 'utf-8');
    return { success: true };

  } catch (error) {
    console.error('Error updating globals.css:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred.';
    return { success: false, error: `Failed to update stylesheet: ${message}` };
  }
}

    

    