'use server';
import { generateComposeCode, type GenerateComposeCodeInput } from '@/ai/flows/generate-compose-code';
import { generateImageFromHint, type GenerateImageFromHintInput } from '@/ai/flows/generate-image-from-hint-flow';
import { generateJsonFromComposeCommands, type GenerateJsonFromComposeCommandsInput } from '@/ai/flows/generate-json-from-compose-commands';
import { convertCanvasToCustomJson, type ConvertCanvasToCustomJsonInput } from '@/ai/flows/convert-canvas-to-custom-json-flow';
import { generateJsonParserCode, type GenerateJsonParserCodeInput } from '@/ai/flows/generate-json-parser-code';
import type { DesignComponent, CustomComponentTemplate, BaseComponentProps } from '@/types/compose-spec';
import { isContainerType, ROOT_SCAFFOLD_ID, DEFAULT_CONTENT_LAZY_COLUMN_ID, DEFAULT_TOP_APP_BAR_ID, DEFAULT_BOTTOM_NAV_BAR_ID, CORE_SCAFFOLD_ELEMENT_IDS } from '@/types/compose-spec';
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

const PREFERRED_PROPERTY_ORDER = [
  // Core Content
  'text', 'title', 'src', 'contentDescription', 'data-ai-hint',
  // Sizing & Layout
  'width', 'height', 'fillMaxSize', 'fillMaxWidth', 'fillMaxHeight', 'layoutWeight', 'selfAlign',
  // Container Alignment & Arrangement
  'verticalArrangement', 'horizontalAlignment', 'horizontalArrangement', 'verticalAlignment', 'contentAlignment',
  // Spacing
  'padding', 'paddingTop', 'paddingBottom', 'paddingStart', 'paddingEnd', 'itemSpacing',
  // Typography
  'fontSize', 'titleFontSize', 'fontWeight', 'fontStyle', 'textColor', 'contentColor', 'textAlign', 'textDecoration', 'lineHeight', 'maxLines', 'textOverflow',
  // Appearance
  'backgroundColor', 'elevation', 'contentScale',
  // Shape & Border
  'shape', 'cornerRadius', 'cornerRadiusTopLeft', 'cornerRadiusTopRight', 'cornerRadiusBottomRight', 'cornerRadiusBottomLeft', 'borderWidth', 'borderColor',
  // Icons (for Button)
  'iconName', 'iconPosition', 'iconSize', 'iconSpacing',
  // Animation
  'animationType', 'animationDuration',
  // Behavior
  'clickable', 'clickId', 'userScrollEnabled', 'reverseLayout',
  // Grid Specific
  'columns', 'rows',
];


// Helper for "View JSON" modal (hierarchical, children in properties.children)
const buildContentComponentTreeForModalJson = (
  allComponents: DesignComponent[],
  customComponentTemplates: CustomComponentTemplate[],
  currentParentIdForContext: string,
  includeDefaultValues: boolean
): ModalJsonNode[] => {
  const parentComponent = allComponents.find(c => c.id === currentParentIdForContext);

  if (!parentComponent || !Array.isArray(parentComponent.properties.children)) {
    return [];
  }

  const orderedChildIds = parentComponent.properties.children;

  return orderedChildIds.map(childId => {
    const component = allComponents.find(c => c.id === childId);
    if (!component) return null;

    const { children: _childIdArrayFromProps, ...originalProperties } = { ...component.properties };
    
    let objectToSort: Record<string, any>;

    if (includeDefaultValues) {
      objectToSort = originalProperties;
    } else {
      const cleaned: Record<string, any> = {};

      for (const key in originalProperties) {
        const value = originalProperties[key];
        if (value !== null && value !== undefined && value !== '') {
          cleaned[key] = value;
        }
      }

      const defaultNumericPropsToOmitIfZero = [
        'padding', 'paddingTop', 'paddingBottom', 'paddingStart', 'paddingEnd',
        'elevation', 'borderWidth', 'itemSpacing', 'layoutWeight',
        'cornerRadius', 'cornerRadiusTopLeft', 'cornerRadiusTopRight', 'cornerRadiusBottomRight', 'cornerRadiusBottomLeft',
        'fontSize', 'iconSize', 'iconSpacing', 'animationDuration', 'maxLines', 'lineHeight'
      ];
      for (const key of defaultNumericPropsToOmitIfZero) {
        if (cleaned[key] === 0) {
          delete cleaned[key];
        }
      }

      if (cleaned.fillMaxSize === true) {
          delete cleaned.width;
          delete cleaned.height;
          delete cleaned.fillMaxWidth;
          delete cleaned.fillMaxHeight;
      } else {
          if (cleaned.fillMaxWidth === true) delete cleaned.width;
          if (cleaned.fillMaxHeight === true) delete cleaned.height;
      }
      
      if (cleaned.fillMaxSize === false) delete cleaned.fillMaxSize;
      if (cleaned.fillMaxWidth === false) delete cleaned.fillMaxWidth;
      if (cleaned.fillMaxHeight === false) delete cleaned.fillMaxHeight;
      if (cleaned.clickable === false) delete cleaned.clickable;
      if (cleaned.reverseLayout === false) delete cleaned.reverseLayout;
      if (cleaned.userScrollEnabled === false) delete cleaned.userScrollEnabled;

      if (typeof cleaned.padding === 'number' && cleaned.padding > 0) {
          delete cleaned.paddingTop;
          delete cleaned.paddingBottom;
          delete cleaned.paddingStart;
          delete cleaned.paddingEnd;
      }
      
      const { cornerRadiusTopLeft, cornerRadiusTopRight, cornerRadiusBottomRight, cornerRadiusBottomLeft } = cleaned;
      if (
        typeof cornerRadiusTopLeft === 'number' &&
        cornerRadiusTopLeft === cornerRadiusTopRight &&
        cornerRadiusTopLeft === cornerRadiusBottomRight &&
        cornerRadiusTopLeft === cornerRadiusBottomLeft
      ) {
        const allCornersValue = cornerRadiusTopLeft;
        if (allCornersValue > 0) {
          cleaned.cornerRadius = allCornersValue;
        } else {
          delete cleaned.cornerRadius; // Ensure it's not present if 0
        }
        delete cleaned.cornerRadiusTopLeft;
        delete cleaned.cornerRadiusTopRight;
        delete cleaned.cornerRadiusBottomRight;
        delete cleaned.cornerRadiusBottomLeft;
      }
      
      objectToSort = cleaned;
    }
    
    const keysToSort = Object.keys(objectToSort);

    // Custom sort function based on PREFERRED_PROPERTY_ORDER
    const customSort = (a: string, b: string) => {
      const indexA = PREFERRED_PROPERTY_ORDER.indexOf(a);
      const indexB = PREFERRED_PROPERTY_ORDER.indexOf(b);

      if (indexA !== -1 && indexB !== -1) {
        return indexA - indexB; // Both keys are in the preferred order list
      }
      if (indexA !== -1) {
        return -1; // Only A is in the list, so A comes first
      }
      if (indexB !== -1) {
        return 1; // Only B is in the list, so B comes first
      }
      return a.localeCompare(b); // Neither is in the list, sort alphabetically
    };
    
    keysToSort.sort(customSort);

    const propertiesToUse: Record<string, any> = {};
    for (const key of keysToSort) {
      propertiesToUse[key] = objectToSort[key];
    }

    const node: ModalJsonNode = {
      id: component.id,
      type: component.type,
      name: component.name,
      parentId: component.parentId,
      properties: propertiesToUse,
      ...(component.templateIdRef && { templateIdRef: component.templateIdRef }),
    };

    if (isContainerType(component.type, customComponentTemplates)) {
      const childrenObjectNodes = buildContentComponentTreeForModalJson(allComponents, customComponentTemplates, component.id, includeDefaultValues);
      if (childrenObjectNodes.length > 0) {
        node.properties.children = childrenObjectNodes as any;
      }
    }
    return node;
  }).filter((node): node is ModalJsonNode => node !== null);
};

export async function getDesignComponentsAsJsonAction(
  allComponents: DesignComponent[],
  customComponentTemplates: CustomComponentTemplate[],
  includeDefaultValues: boolean = false
): Promise<string> {
  try {
    const modalJsonTree = buildContentComponentTreeForModalJson(
        allComponents,
        customComponentTemplates,
        DEFAULT_CONTENT_LAZY_COLUMN_ID,
        includeDefaultValues
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
  customComponentTemplates: CustomComponentTemplate[], 
  parameterKey: string,
  includeDefaultValues: boolean // Added parameter
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
    console.log("publishToRemoteConfigAction: Building hierarchical content JSON for Remote Config...");
    
    // Generate the hierarchical JSON, now respecting the flag
    const designJsonString = await getDesignComponentsAsJsonAction(components, customComponentTemplates, includeDefaultValues);
    
    if (designJsonString.startsWith("Error:")) {
      return { success: false, message: `Failed to generate JSON for publishing: ${designJsonString}` };
    }
    
    console.log("publishToRemoteConfigAction: Content JSON for Remote Config generated. Length:", designJsonString.length);


    console.log("publishToRemoteConfigAction: Getting current Remote Config template...");
    const currentTemplate = await remoteConfig.getTemplate();
    console.log("publishToRemoteConfigAction: Current template version:", currentTemplate.version?.toString());

    currentTemplate.parameters[parameterKey] = {
      defaultValue: { value: designJsonString },
      description: 'Jetpack Compose UI design (content area components only, hierarchical) generated by Compose Builder.',
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


export async function generateImageFromHintAction(hint: string): Promise<{ imageUrls: string[] | null; error?: string }> {
  if (!hint || hint.trim() === "") {
    return { imageUrls: null, error: "Hint cannot be empty." };
  }
  try {
    const input: GenerateImageFromHintInput = { hint };
    const result = await generateImageFromHint(input);
    return { imageUrls: result.imageUrls };
  } catch (error) {
    console.error("Error in generateImageFromHintAction:", error);
    const message = error instanceof Error ? error.message : "An unknown error occurred during image generation.";
    return { imageUrls: null, error: message };
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
  customComponentTemplates: CustomComponentTemplate[],
  includeDefaultValues: boolean
): Promise<{ customJsonString?: string; error?: string }> {
  try {
    // Get JSON for the content area only, always using the concise version (includeDefaultValues = false)
    const canvasContentJsonString = await getDesignComponentsAsJsonAction(allComponents, customComponentTemplates, false);

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
    
    const input: ConvertCanvasToCustomJsonInput = { 
        designJson: canvasContentJsonString,
        includeDefaultValues: includeDefaultValues,
    };
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

export async function generateJsonParserCodeAction(
  customJson: string
): Promise<{ kotlinCode?: string; error?: string }> {
  if (!customJson || customJson.trim() === "") {
    return { error: "Custom JSON input cannot be empty." };
  }
  try {
    const input: GenerateJsonParserCodeInput = { customJson };
    const result = await generateJsonParserCode(input);
    return { kotlinCode: result.kotlinCode };
  } catch (error) {
    console.error("Error in generateJsonParserCodeAction:", error);
    const message = error instanceof Error ? error.message : "An unknown error occurred during Kotlin parser code generation.";
    return { error: message };
  }
}

export async function searchWebForImagesAction(query: string): Promise<{ imageUrls: string[] | null; error?: string }> {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey || apiKey.trim() === "") {
    return { imageUrls: null, error: "Pexels API key is not configured on the server. Please set PEXELS_API_KEY in your .env file." };
  }

  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=15`;

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: apiKey,
      },
    });

    if (!response.ok) {
      // Pexels API returns error details in the body
      const errorData = await response.json().catch(() => ({ error: "Unknown error response from Pexels." }));
      console.error("Pexels API Error:", errorData);
      return { imageUrls: null, error: `Failed to search on Pexels: ${errorData.error || response.statusText}` };
    }

    const data = await response.json();

    if (data && Array.isArray(data.photos)) {
        const imageUrls = data.photos.map((photo: any) => photo.src.large);
        return { imageUrls };
    } else {
        return { imageUrls: null, error: "Unexpected response format from Pexels." };
    }
    
  } catch (error) {
    console.error("Error fetching from Pexels API:", error);
    const message = error instanceof Error ? error.message : "An unknown error occurred during web image search.";
    return { imageUrls: null, error: message };
  }
}
      

    

    

    

    
