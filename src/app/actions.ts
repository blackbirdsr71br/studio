
'use server';
import { generateComposeCode, type GenerateComposeCodeInput } from '@/ai/flows/generate-compose-code';
import { generateImageFromHint, type GenerateImageFromHintInput } from '@/ai/flows/generate-image-from-hint-flow';
import { generateJsonFromComposeCommands, type GenerateJsonFromComposeCommandsInput } from '@/ai/flows/generate-json-from-compose-commands';
import { convertCanvasToCustomJson, type ConvertCanvasToCustomJsonInput } from '@/ai/flows/convert-canvas-to-custom-json-flow';
import type { DesignComponent, CustomComponentTemplate, BaseComponentProps } from '@/types/compose-spec';
import { isContainerType, ROOT_SCAFFOLD_ID, DEFAULT_CONTENT_LAZY_COLUMN_ID, DEFAULT_TOP_APP_BAR_ID, DEFAULT_BOTTOM_NAV_BAR_ID } from '@/types/compose-spec';
import { getRemoteConfig, isAdminInitialized } from '@/lib/firebaseAdmin';
import { promises as fs } from 'fs';
import path from 'path';
import { hexToHslCssString } from '@/lib/utils';

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

// Interface for the nodes in the AI-specific tree (for Jetpack Compose generation)
interface AiComponentTreeNode {
  id: string;
  type: string;
  name: string;
  properties: Record<string, any>;
  children?: AiComponentTreeNode[]; // For standard containers
  // For Scaffold specifically
  topBar?: AiComponentTreeNode | null;
  bottomBar?: AiComponentTreeNode | null;
  content?: AiComponentTreeNode | null; // Content will usually be a LazyColumn
}

// Helper to create a hierarchical structure for the AI (Jetpack Compose)
// This function now expects allComponents to be the complete list from the DesignContext,
// and customComponentTemplates for type checking.
// The entry point (isRootCall = true) will find the ROOT_SCAFFOLD_ID.
const buildComponentTreeForAi = (
  allComponents: DesignComponent[],
  customComponentTemplates: CustomComponentTemplate[],
  componentIdToBuildTreeFrom: string, // ID of the current component to process
  isRootCall: boolean = false
): AiComponentTreeNode | AiComponentTreeNode[] => {

  if (isRootCall) {
    const rootScaffold = allComponents.find(c => c.id === ROOT_SCAFFOLD_ID && c.parentId === null);
    if (!rootScaffold) {
      console.error("Root Scaffold component not found for AI tree generation.");
      return []; // Or throw error
    }

    // Find the TopAppBar, ContentLazyColumn, and BottomNavigationBar that are direct children of the Scaffold
    const topBarComponent = allComponents.find(c => c.parentId === ROOT_SCAFFOLD_ID && c.type === 'TopAppBar');
    const contentAreaComponent = allComponents.find(c => c.parentId === ROOT_SCAFFOLD_ID && c.type === 'LazyColumn' && c.id === DEFAULT_CONTENT_LAZY_COLUMN_ID);
    const bottomBarComponent = allComponents.find(c => c.parentId === ROOT_SCAFFOLD_ID && c.type === 'BottomNavigationBar');
    
    const scaffoldNode: AiComponentTreeNode = {
      id: rootScaffold.id,
      type: rootScaffold.type, // Should be "Scaffold"
      name: rootScaffold.name,
      properties: cleanEmptyOrNullProperties({ ...rootScaffold.properties }),
      topBar: topBarComponent ? buildComponentTreeForAi(allComponents, customComponentTemplates, topBarComponent.id) as AiComponentTreeNode : null,
      content: contentAreaComponent ? buildComponentTreeForAi(allComponents, customComponentTemplates, contentAreaComponent.id) as AiComponentTreeNode : null,
      bottomBar: bottomBarComponent ? buildComponentTreeForAi(allComponents, customComponentTemplates, bottomBarComponent.id) as AiComponentTreeNode : null,
    };
    // Remove children property from Scaffold node itself, as slots are explicit
    delete scaffoldNode.properties.children; 
    return scaffoldNode;
  }

  // Logic for non-root calls (building sub-trees for slots or nested components)
  const currentComponent = allComponents.find(c => c.id === componentIdToBuildTreeFrom);
  if (!currentComponent) {
    console.warn(`Component with ID ${componentIdToBuildTreeFrom} not found during AI tree build.`);
    return []; // Or handle as appropriate
  }

  let nodeProperties = cleanEmptyOrNullProperties({ ...currentComponent.properties });
  
  const node: AiComponentTreeNode = {
    id: currentComponent.id,
    type: currentComponent.type,
    name: currentComponent.name,
    properties: nodeProperties,
    ...(currentComponent.templateIdRef && { templateIdRef: currentComponent.templateIdRef }),
  };

  // Recursively build children for container types (excluding Scaffold itself here)
  if (isContainerType(currentComponent.type, customComponentTemplates) && currentComponent.type !== 'Scaffold') {
    const childrenOfThisComponent = allComponents.filter(c => c.parentId === currentComponent.id);
    const childNodes = childrenOfThisComponent
      .map(child => buildComponentTreeForAi(allComponents, customComponentTemplates, child.id) as AiComponentTreeNode)
      .filter(n => n && Object.keys(n).length > 0); // Filter out empty results

    if (childNodes.length > 0) {
      node.children = childNodes;
      // Remove children ID array from properties if we're nesting full objects for AI
      delete node.properties.children; 
    }
  }
  return node;
};


export async function generateJetpackComposeCodeAction(
  components: DesignComponent[],
  customComponentTemplates: CustomComponentTemplate[]
): Promise<string> {
  try {
    // Build the tree starting from the root Scaffold.
    const scaffoldStructureForAi = buildComponentTreeForAi(components, customComponentTemplates, ROOT_SCAFFOLD_ID, true);

    if (!scaffoldStructureForAi || (Array.isArray(scaffoldStructureForAi) && scaffoldStructureForAi.length === 0) || Object.keys(scaffoldStructureForAi).length === 0) {
      return "No valid Scaffold structure found to generate code from.";
    }

    const designJson = JSON.stringify(scaffoldStructureForAi, null, 2);
    // console.log("JSON for AI (Jetpack Compose):", designJson); // For debugging
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


// Interface for nodes in the JSON for the "View JSON" modal and Remote Config (content part)
interface ModalJsonNode {
  id: string;
  type: DesignComponent['type'];
  name: string;
  parentId: string | null;
  properties: BaseComponentProps; // Will contain nested children: ModalJsonNode[] if container
  templateIdRef?: string; // Added to ModalJsonNode
}

// Helper for "View JSON" modal (hierarchical, children in properties.children)
// This function should now always be called with DEFAULT_CONTENT_LAZY_COLUMN_ID as its starting point
const buildContentComponentTreeForModalJson = (
  allComponents: DesignComponent[],
  customComponentTemplates: CustomComponentTemplate[],
  currentParentIdForContext: string // This will be DEFAULT_CONTENT_LAZY_COLUMN_ID
): ModalJsonNode[] => {
  return allComponents
    .filter(component => component.parentId === currentParentIdForContext)
    .map(component => {
      const componentBaseProperties = { ...component.properties };
      // Remove the 'children' array of IDs, as we are nesting full objects for the modal
      const { children: _childIdArrayFromProps, ...otherProperties } = componentBaseProperties;
      const cleanedOtherProperties = cleanEmptyOrNullProperties(otherProperties);

      // Convert width/height to string if numeric for modal JSON
      if (typeof cleanedOtherProperties.width === 'number') {
        cleanedOtherProperties.width = String(cleanedOtherProperties.width);
      }
      if (typeof cleanedOtherProperties.height === 'number') {
        cleanedOtherProperties.height = String(cleanedOtherProperties.height);
      }

      const node: ModalJsonNode = {
        id: component.id,
        type: component.type,
        name: component.name,
        parentId: component.parentId, // This parentId is correct for components *within* the content area
        properties: cleanedOtherProperties,
        ...(component.templateIdRef && { templateIdRef: component.templateIdRef }), // Include templateIdRef if present
      };

      // Recursively build for children if this component is a container
      if (isContainerType(component.type, customComponentTemplates)) {
        const childrenObjectNodes = buildContentComponentTreeForModalJson(allComponents, customComponentTemplates, component.id);
        if (childrenObjectNodes.length > 0) {
          node.properties.children = childrenObjectNodes as any; // Nest full child objects
        }
      }
      return node;
    });
};

export async function getDesignComponentsAsJsonAction(
  allComponents: DesignComponent[],
  customComponentTemplates: CustomComponentTemplate[]
): Promise<string> {
  try {
    // Build the hierarchical tree for children of the default content LazyColumn for the modal
    const modalJsonTree = buildContentComponentTreeForModalJson(
        allComponents,
        customComponentTemplates,
        DEFAULT_CONTENT_LAZY_COLUMN_ID // Get children of the content LazyColumn
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

// Helper to get a flat list of components belonging to the content area for Remote Config
// This function collects all components that are descendants of startParentId in hierarchical order.
const buildFlatContentTreeForRemoteConfig = (
  allComponents: DesignComponent[],
  customComponentTemplates: CustomComponentTemplate[], // Added for isContainerType
  startParentId: string = DEFAULT_CONTENT_LAZY_COLUMN_ID
): DesignComponent[] => {
  const contentAreaComponents: DesignComponent[] = [];
  const queue: string[] = [];
  const visited = new Set<string>();

  // Find the starting parent component (e.g., DEFAULT_CONTENT_LAZY_COLUMN_ID)
  const rootContentContainer = allComponents.find(c => c.id === startParentId);

  if (rootContentContainer && rootContentContainer.properties.children && Array.isArray(rootContentContainer.properties.children)) {
    // Enqueue direct children of the startParentId IN THEIR DEFINED ORDER
    (rootContentContainer.properties.children as string[]).forEach(childId => {
      if (!visited.has(childId)) { // Should not be necessary here but good for safety
          queue.push(childId);
      }
    });
  } else {
    // Fallback or warning if the main content container or its children are not found
    // This indicates an issue with the initial scaffold state or context data.
    console.warn(`buildFlatContentTreeForRemoteConfig: Root content container (ID: ${startParentId}) not found or has no children array.`);
  }
  
  while (queue.length > 0) {
    const currentId = queue.shift()!;
    if (visited.has(currentId)) continue;
    visited.add(currentId);

    const component = allComponents.find(c => c.id === currentId);
    if (component) {
      // Create a copy of properties for modification, excluding 'children' initially
      const { children: _originalChildren, ...otherProps } = component.properties;
      const componentPropertiesCopy = { ...otherProps };

      // Convert width/height to string if numeric for Remote Config JSON
      if (typeof componentPropertiesCopy.width === 'number') {
        componentPropertiesCopy.width = String(componentPropertiesCopy.width);
      }
      if (typeof componentPropertiesCopy.height === 'number') {
        componentPropertiesCopy.height = String(componentPropertiesCopy.height);
      }

      let finalProperties = cleanEmptyOrNullProperties(componentPropertiesCopy);

      // Re-assign the original children array (of IDs) from the component state.
      // This ensures the structure sent to Remote Config is flat regarding children objects.
      if (component.properties.children && Array.isArray(component.properties.children) && component.properties.children.length > 0) {
          finalProperties.children = component.properties.children as string[];
      } else if (isContainerType(component.type, customComponentTemplates) && (!component.properties.children || component.properties.children.length === 0)) {
          // If it's a known container type and has no children array or an empty one, explicitly add `children: []`.
          finalProperties.children = [];
      }
      // If it's not a container and had no children, 'children' will be omitted from finalProperties by cleanEmptyOrNullProperties.

      const componentToPush: DesignComponent = {
        id: component.id,
        type: component.type,
        name: component.name,
        parentId: component.parentId,
        properties: finalProperties,
        // Conditionally add templateIdRef only if it exists and is not empty
        ...(component.templateIdRef && component.templateIdRef.trim() !== "" && { templateIdRef: component.templateIdRef }),
      };

      contentAreaComponents.push(componentToPush);

      // Enqueue children using the original component's children array (must be string IDs)
      if (component.properties.children && Array.isArray(component.properties.children)) {
        (component.properties.children as string[]).forEach(childId => {
          if (!visited.has(childId)) { // Check visited before enqueuing
            queue.push(childId);
          }
        });
      }
    }
  }
  return contentAreaComponents;
};


export async function publishToRemoteConfigAction(
  components: DesignComponent[],
  customComponentTemplates: CustomComponentTemplate[], 
  parameterKey: string
): Promise<{ success: boolean; message: string; version?: string }> {
  console.log("publishToRemoteConfigAction: Initiating publish...");
  const adminSdkInitialized = isAdminInitialized();
  console.log("publishToRemoteConfigAction: isAdminInitialized() returned:", adminSdkInitialized);

  if (!adminSdkInitialized) {
    return { success: false, message: 'Firebase Admin SDK not initialized. Check server logs and ensure FIREBASE_SERVICE_ACCOUNT_JSON is correctly set in .env.local and the server was restarted.' };
  }

  const remoteConfig = getRemoteConfig();
  console.log("publishToRemoteConfigAction: getRemoteConfig() returned:", remoteConfig ? 'Instance' : 'undefined');

  if (!remoteConfig) {
    return { success: false, message: 'Failed to get Remote Config instance. Firebase Admin SDK might not be properly configured. Check server logs.' };
  }

  if (!parameterKey || parameterKey.trim() === "") {
    console.error("publishToRemoteConfigAction: Parameter key cannot be empty.");
    return { success: false, message: 'Remote Config parameter key cannot be empty.' };
  }
  console.log(`publishToRemoteConfigAction: Publishing to parameter key: "${parameterKey}"`);

  try {
    console.log("publishToRemoteConfigAction: Building content component tree for Remote Config...");
    
    const contentComponentsForRemoteConfig = buildFlatContentTreeForRemoteConfig(components, customComponentTemplates, DEFAULT_CONTENT_LAZY_COLUMN_ID);
    
    const designJsonString = JSON.stringify(contentComponentsForRemoteConfig, null, 2);
    
    console.log("publishToRemoteConfigAction: Content components for Remote Config. Count:", contentComponentsForRemoteConfig.length);


    console.log("publishToRemoteConfigAction: Getting current Remote Config template...");
    const currentTemplate = await remoteConfig.getTemplate();
    console.log("publishToRemoteConfigAction: Current template version:", currentTemplate.version?.toString());

    currentTemplate.parameters[parameterKey] = {
      defaultValue: { value: designJsonString },
      description: 'Jetpack Compose UI design (content area components only) generated by Compose Builder.',
      valueType: 'JSON',
    };
    console.log("publishToRemoteConfigAction: Parameter set in template.");

    console.log("publishToRemoteConfigAction: Validating template...");
    await remoteConfig.validateTemplate(currentTemplate);
    console.log("publishToRemoteConfigAction: Template validated.");

    console.log("publishToRemoteConfigAction: Publishing template...");
    const updatedTemplate = await remoteConfig.publishTemplate(currentTemplate);
    console.log("publishToRemoteConfigAction: Template published. New version:", updatedTemplate.version?.toString());

    return {
      success: true,
      message: `Design (content area only) published to Remote Config parameter "${parameterKey}".`,
      version: updatedTemplate.version?.toString()
    };

  } catch (error) {
    console.error(`Error publishing to Firebase Remote Config (key: ${parameterKey}):`, error);
    let message = "An unknown error occurred while publishing to Remote Config.";
    if (error instanceof Error) {
      message = error.message;
    }
    if (typeof error === 'object' && error !== null) {
        const firebaseError = error as any;
        if (firebaseError.errorInfo && firebaseError.errorInfo.code) {
             message = `Firebase Error (${firebaseError.errorInfo.code}): ${firebaseError.errorInfo.message || message}`;
            if (firebaseError.errorInfo.code === 'remoteconfig/template-version-mismatch') {
                message = 'Remote Config template version mismatch. Please try again.';
            } else if (firebaseError.errorInfo.code === 'permission-denied' || firebaseError.code === 'PERMISSION_DENIED') {
                message = 'Permission denied. Service account may lack "Firebase Remote Config Admin" role.';
            }
        } else if (firebaseError.code === 'PERMISSION_DENIED') {
             message = 'Permission denied. Service account may lack "Firebase Remote Config Admin" role.';
        }
    }
    console.error("publishToRemoteConfigAction: Publishing failed with message:", message);
    return { success: false, message: `Error: ${message}` };
  }
}

export async function publishCustomJsonToRemoteConfigAction(
  customJsonString: string,
  parameterKey: string
): Promise<{ success: boolean; message: string; version?: string }> {
  console.log("publishCustomJsonToRemoteConfigAction: Initiating publish...");
  const adminSdkInitialized = isAdminInitialized();
  if (!adminSdkInitialized) {
    return { success: false, message: 'Firebase Admin SDK not initialized. Check server logs.' };
  }

  const remoteConfig = getRemoteConfig();
  if (!remoteConfig) {
    return { success: false, message: 'Failed to get Remote Config instance. Firebase Admin SDK might not be properly configured.' };
  }

  if (!parameterKey || parameterKey.trim() === "") {
    return { success: false, message: 'Remote Config parameter key cannot be empty.' };
  }
  if (!customJsonString || customJsonString.trim() === "") {
    return { success: false, message: 'Custom JSON string cannot be empty.' };
  }
   try {
    JSON.parse(customJsonString); // Validate if it's a valid JSON
  } catch (e) {
    return { success: false, message: 'The provided string is not valid JSON.' };
  }

  console.log(`publishCustomJsonToRemoteConfigAction: Publishing to parameter key: "${parameterKey}"`);

  try {
    const currentTemplate = await remoteConfig.getTemplate();
    currentTemplate.parameters[parameterKey] = {
      defaultValue: { value: customJsonString },
      description: 'Custom command JSON generated by Compose Builder.',
      valueType: 'JSON',
    };

    await remoteConfig.validateTemplate(currentTemplate);
    const updatedTemplate = await remoteConfig.publishTemplate(currentTemplate);
    console.log("publishCustomJsonToRemoteConfigAction: Template published. New version:", updatedTemplate.version?.toString());

    return {
      success: true,
      message: `Custom JSON published to Remote Config parameter "${parameterKey}".`,
      version: updatedTemplate.version?.toString()
    };

  } catch (error) {
    console.error(`Error publishing Custom JSON to Firebase Remote Config (key: ${parameterKey}):`, error);
    let message = "An unknown error occurred while publishing Custom JSON to Remote Config.";
    if (error instanceof Error) {
      message = error.message;
    }
     if (typeof error === 'object' && error !== null) {
        const firebaseError = error as any;
        if (firebaseError.errorInfo && firebaseError.errorInfo.code) {
             message = `Firebase Error (${firebaseError.errorInfo.code}): ${firebaseError.errorInfo.message || message}`;
            if (firebaseError.errorInfo.code === 'remoteconfig/template-version-mismatch') {
                message = 'Remote Config template version mismatch. Please try again.';
            } else if (firebaseError.errorInfo.code === 'permission-denied' || firebaseError.code === 'PERMISSION_DENIED') {
                message = 'Permission denied. Service account may lack "Firebase Remote Config Admin" role.';
            }
        } else if (firebaseError.code === 'PERMISSION_DENIED') {
             message = 'Permission denied. Service account may lack "Firebase Remote Config Admin" role.';
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

export async function convertCanvasToCustomJsonAction(
  allComponents: DesignComponent[],
  customComponentTemplates: CustomComponentTemplate[]
): Promise<{ customJsonString?: string; error?: string }> {
  try {
    // Get JSON for the content area only
    const canvasContentJsonString = await getDesignComponentsAsJsonAction(allComponents, customComponentTemplates);

    // Validate if the content area JSON is meaningful before sending to AI
    if (canvasContentJsonString.startsWith("Error:")) {
        return { error: "Failed to prepare canvas data for conversion: " + canvasContentJsonString };
    }
    try {
        const parsedContent = JSON.parse(canvasContentJsonString);
        if (Array.isArray(parsedContent) && parsedContent.length === 0) {
           // Only consider it an error if there are actually components on the canvas but none in the content area.
           // The core scaffold components (4 of them) will always exist.
           const userAddedComponentsExist = allComponents.length > 4; 
           if (userAddedComponentsExist) {
             return { error: "No user components in the content area to convert." };
           }
           // If only scaffold exists, an empty array is fine, AI should handle it (e.g., return empty custom JSON)
        }
    } catch (e) {
        return { error: "Canvas content JSON is invalid and could not be parsed." };
    }
    
    const input: ConvertCanvasToCustomJsonInput = { designJson: canvasContentJsonString };
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
  lightBackground: string;
  lightForeground: string;
  lightPrimary: string;
  lightAccent: string;
  darkBackground: string;
  darkForeground: string;
  darkPrimary: string;
  darkAccent: string;
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
        regex = new RegExp(`(:root\\s*{[^}]*${cssVar}\\s*:\\s*)[0-9]+\\s+[0-9]+%\\s+[0-9]+%(\\s*;[^}]*})`, 's');
      } else { 
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


      

    