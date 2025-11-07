

'use server';
import { generateImageFromHint } from '@/ai/flows/generate-image-from-hint-flow';
import { generateJsonFromComposeCommands } from '@/ai/flows/generate-json-from-compose-commands';
import { convertCanvasToCustomJson } from '@/ai/flows/convert-canvas-to-custom-json-flow';
import type { GenerateImageFromHintInput, GenerateJsonFromComposeCommandsInput, ConvertCanvasToCustomJsonInput } from '@/types/ai-spec';

import type { DesignComponent, CustomComponentTemplate, BaseComponentProps, ComponentType } from '@/types/compose-spec';
import { isContainerType, ROOT_SCAFFOLD_ID, DEFAULT_CONTENT_LAZY_COLUMN_ID, CORE_SCAFFOLD_ELEMENT_IDS, propertyDefinitions, getDefaultProperties } from '@/types/compose-spec';
import { getRemoteConfig, isAdminInitialized } from '@/lib/firebaseAdmin';
import { promises as fs } from 'fs';
import path from 'path';
import { hexToHslCssString } from '@/lib/utils';
import { getAndroidProjectTemplates } from '@/lib/android-project-templates';
import { generateDynamicUiComponentKt, generateComponentDtoKt } from '@/lib/jetpack-compose-generator';

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

export async function fetchAndAnalyzeEndpoint(url: string): Promise<{ schema?: string[]; error?: string; }> {
    if (!url) return { error: 'URL is empty.' };
    try {
        const response = await fetch(url);
        if (!response.ok) {
            return { error: `Request failed with status: ${response.status}` };
        }
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
            const firstItem = data[0];
            if (typeof firstItem === 'object' && firstItem !== null) {
                return { schema: Object.keys(firstItem) };
            }
        }
        return { error: 'Response is not a non-empty array of objects.' };
    } catch (e) {
        if (e instanceof Error) {
            return { error: e.message };
        }
        return { error: 'An unknown error occurred.' };
    }
}


export async function generateJetpackComposeCodeAction(
  components: DesignComponent[],
  customComponentTemplates: CustomComponentTemplate[]
): Promise<{ files?: Record<string, string>; error?: string }> {
    try {
      const projectFiles = getAndroidProjectTemplates();
      const contentJson = await getDesignComponentsAsJsonAction(components, customComponentTemplates, true);
      const componentTree = buildComponentTreeForAi(components, customComponentTemplates, ROOT_SCAFFOLD_ID, true);

      // Generate the two dynamic files deterministically
      const componentDtoContent = generateComponentDtoKt(componentTree);
      const dynamicUiComponentContent = generateDynamicUiComponentKt(componentTree);

      const finalProjectFiles = {
        ...projectFiles,
        'app/src/main/java/com/example/myapplication/data/model/ComponentDto.kt': componentDtoContent,
        'app/src/main/java/com/example/myapplication/presentation/components/DynamicUiComponent.kt': dynamicUiComponentContent,
      };

      return { files: finalProjectFiles };
    } catch (error) {
      console.error("Error generating Jetpack Compose code:", error);
      const message = error instanceof Error ? error.message : "An unknown error occurred while generating code.";
      return { error: message };
    }
}


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
const buildComponentTreeForAi = (
  allComponents: DesignComponent[],
  customComponentTemplates: CustomComponentTemplate[],
  componentIdToBuildTreeFrom: string,
  isRootCall: boolean = false
): AiComponentTreeNode | AiComponentTreeNode[] => {

  if (isRootCall) {
    const rootScaffold = allComponents.find(c => c.id === ROOT_SCAFFOLD_ID && c.parentId === null);
    if (!rootScaffold) {
      console.error("Root Scaffold component not found for AI tree generation.");
      return [];
    }

    const topBarComponent = allComponents.find(c => c.parentId === ROOT_SCAFFOLD_ID && c.type === 'TopAppBar');
    const contentAreaComponent = allComponents.find(c => c.parentId === ROOT_SCAFFOLD_ID && c.type === 'LazyColumn' && c.id === DEFAULT_CONTENT_LAZY_COLUMN_ID);
    const bottomBarComponent = allComponents.find(c => c.parentId === ROOT_SCAFFOLD_ID && c.type === 'BottomNavigationBar');
    
    const scaffoldNode: AiComponentTreeNode = {
      id: rootScaffold.id,
      type: rootScaffold.type,
      name: rootScaffold.name,
      properties: cleanEmptyOrNullProperties({ ...rootScaffold.properties }),
      topBar: topBarComponent ? buildComponentTreeForAi(allComponents, customComponentTemplates, topBarComponent.id) as AiComponentTreeNode : null,
      content: contentAreaComponent ? buildComponentTreeForAi(allComponents, customComponentTemplates, contentAreaComponent.id) as AiComponentTreeNode : null,
      bottomBar: bottomBarComponent ? buildComponentTreeForAi(allComponents, customComponentTemplates, bottomBarComponent.id) as AiComponentTreeNode : null,
    };
    delete scaffoldNode.properties.children; 
    return scaffoldNode;
  }

  const currentComponent = allComponents.find(c => c.id === componentIdToBuildTreeFrom);
  if (!currentComponent) {
    console.warn(`Component with ID ${componentIdToBuildTreeFrom} not found during AI tree build.`);
    return [];
  }

  let nodeProperties = cleanEmptyOrNullProperties({ ...currentComponent.properties });
  
  const node: AiComponentTreeNode = {
    id: currentComponent.id,
    type: currentComponent.type,
    name: currentComponent.name,
    properties: nodeProperties,
  };

  if (currentComponent.templateIdRef) {
    (node as any).templateIdRef = currentComponent.templateIdRef;
  }

  if (isContainerType(currentComponent.type, customComponentTemplates) && currentComponent.type !== 'Scaffold') {
    const childrenOfThisComponent = allComponents.filter(c => c.parentId === currentComponent.id);
    const childNodes = childrenOfThisComponent
      .map(child => buildComponentTreeForAi(allComponents, customComponentTemplates, child.id) as AiComponentTreeNode)
      .filter(n => n && Object.keys(n).length > 0);

    if (childNodes.length > 0) {
      node.children = childNodes;
      delete node.properties.children; 
    }
  }
  return node;
};

// Interface for nodes in the JSON for the "View JSON" modal and Remote Config (content part)
interface ModalJsonNode {
  id: string;
  type: DesignComponent['type'];
  name: string;
  parentId: string | null;
  properties: BaseComponentProps; // Will contain nested children: ModalJsonNode[] if container
  templateIdRef?: string;
}

const PREFERRED_PROPERTY_ORDER = [
  'text', 'title', 'src', 'contentDescription', 'data-ai-hint',
  'fillMaxSize', 'fillMaxWidth', 'fillMaxHeight', 'width', 'height', 'layoutWeight', 'selfAlign',
  'verticalArrangement', 'horizontalAlignment', 'horizontalArrangement', 'verticalAlignment', 'contentAlignment',
  'paddingTop', 'paddingBottom', 'paddingStart', 'paddingEnd',
  'padding', 'itemSpacing',
  'fontSize', 'titleFontSize', 'fontWeight', 'fontStyle', 'textColor', 'contentColor', 'textAlign', 'textDecoration', 'lineHeight', 'maxLines', 'textOverflow',
  'backgroundColor', 'elevation', 'contentScale',
  'cornerRadiusTopLeft', 'cornerRadiusTopRight', 'cornerRadiusBottomRight', 'cornerRadiusBottomLeft',
  'shape', 'cornerRadius', 'borderWidth', 'borderColor',
  'iconName', 'iconPosition', 'iconSize', 'iconSpacing',
  'animationType', 'animationDuration',
  'clickable', 'onClickAction', 'userScrollEnabled', 'reverseLayout',
  'columns', 'rows',
];

// Helper for "View JSON" modal (hierarchical, children in properties.children)
const buildContentComponentTreeForModalJson = (
  allComponents: DesignComponent[],
  customComponentTemplates: CustomComponentTemplate[],
  currentParentIdForContext: string,
  includeDefaultValues: boolean
): ModalJsonNode[] => {
  const childIds = allComponents.find(c => c.id === currentParentIdForContext)?.properties.children || [];
  if (!Array.isArray(childIds) || childIds.length === 0) {
    return [];
  }

  return childIds.map(childId => {
    const component = allComponents.find(c => c.id === childId);
    if (!component) return null;

    const { children: _childIdArrayFromProps, ...originalProperties } = { ...component.properties };
    
    let objectToSort: Record<string, any>;

    if (includeDefaultValues) {
      const fullProps: Record<string, any> = { ...originalProperties };
      const propDefs = propertyDefinitions[component.type as ComponentType] || [];
      const defaultProps = getDefaultProperties(component.type as ComponentType);

      propDefs.forEach(def => {
          if (!(def.name in fullProps)) {
              const defaultValue = defaultProps[def.name];
              fullProps[def.name] = defaultValue === undefined ? null : defaultValue;
          }
      });
      if (propDefs.some(d => d.name === 'cornerRadiusTopLeft') && !('cornerRadius' in fullProps)) {
          fullProps['cornerRadius'] = defaultProps['cornerRadius'] === undefined ? null : defaultProps['cornerRadius'];
      }
       if (propDefs.some(d => d.name === 'paddingTop') && !('padding' in fullProps)) {
          fullProps['padding'] = defaultProps['padding'] === undefined ? null : defaultProps['padding'];
      }
      
      objectToSort = fullProps;

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
          delete cleaned.cornerRadius;
        }
        delete cleaned.cornerRadiusTopLeft;
        delete cleaned.cornerRadiusTopRight;
        delete cleaned.cornerRadiusBottomRight;
        delete cleaned.cornerRadiusBottomLeft;
      }
      
      objectToSort = cleaned;
    }
    
    const keysToSort = Object.keys(objectToSort);

    const customSort = (a: string, b: string) => {
      const indexA = PREFERRED_PROPERTY_ORDER.indexOf(a);
      const indexB = PREFERRED_PROPERTY_ORDER.indexOf(b);

      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      return a.localeCompare(b);
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
    };

    if (component.templateIdRef) {
      node.templateIdRef = component.templateIdRef;
    }

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
  includeDefaultValues: boolean
): Promise<{ success: boolean; message: string; version?: string }> {
  if (!isAdminInitialized()) {
    return { success: false, message: 'Firebase Admin SDK not initialized. Publishing is disabled.' };
  }
  const remoteConfig = getRemoteConfig();
  if (!remoteConfig) {
    return { success: false, message: 'Failed to get Remote Config instance.' };
  }

  if (!parameterKey || parameterKey.trim() === "") {
    return { success: false, message: 'Remote Config parameter key cannot be empty.' };
  }
  
  try {
    const designJsonString = await getDesignComponentsAsJsonAction(components, customComponentTemplates, includeDefaultValues);
    
    if (designJsonString.startsWith("Error:")) {
      return { success: false, message: `Failed to generate JSON for publishing: ${designJsonString}` };
    }
    
    const currentTemplate = await remoteConfig.getTemplate();
    currentTemplate.parameters[parameterKey] = {
      defaultValue: { value: designJsonString },
      description: 'Jetpack Compose UI design (content area components only, hierarchical) generated by Compose Builder.',
      valueType: 'JSON',
    };
    
    await remoteConfig.validateTemplate(currentTemplate);
    const updatedTemplate = await remoteConfig.publishTemplate(currentTemplate);
    
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
    return { success: false, message: `Error: ${message}` };
  }
}

export async function publishCustomJsonToRemoteConfigAction(
  customJsonString: string,
  parameterKey: string
): Promise<{ success: boolean; message: string; version?: string }> {
  if (!isAdminInitialized()) {
    return { success: false, message: 'Firebase Admin SDK not initialized. Publishing is disabled.' };
  }
  const remoteConfig = getRemoteConfig();
  if (!remoteConfig) {
    return { success: false, message: 'Failed to get Remote Config instance.' };
  }

  if (!parameterKey || parameterKey.trim() === "") {
    return { success: false, message: 'Remote Config parameter key cannot be empty.' };
  }
  if (!customJsonString || customJsonString.trim() === "") {
    return { success: false, message: 'Custom JSON string cannot be empty.' };
  }
   try {
    JSON.parse(customJsonString);
  } catch (e) {
    return { success: false, message: 'The provided string is not valid JSON.' };
  }

  try {
    const currentTemplate = await remoteConfig.getTemplate();
    currentTemplate.parameters[parameterKey] = {
      defaultValue: { value: customJsonString },
      description: 'Custom command JSON generated by Compose Builder.',
      valueType: 'JSON',
    };

    await remoteConfig.validateTemplate(currentTemplate);
    const updatedTemplate = await remoteConfig.publishTemplate(currentTemplate);

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
    const canvasContentJsonString = await getDesignComponentsAsJsonAction(allComponents, customComponentTemplates, includeDefaultValues);

    if (canvasContentJsonString.startsWith("Error:")) {
        return { error: "Failed to prepare canvas data for conversion: " + canvasContentJsonString };
    }
    try {
        const parsedContent = JSON.parse(canvasContentJsonString);
        if (Array.isArray(parsedContent) && parsedContent.length === 0) {
           const userAddedComponentsExist = allComponents.length > CORE_SCAFFOLD_ELEMENT_IDS.length; 
           if (userAddedComponentsExist) {
             return { error: "No user components in the content area to convert." };
           }
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
  } catch (error) {
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
        regex = new RegExp(`(\\.dark\\s*{[^}]*${cssVar}\\s*:\\s*)[0-9]+\\s+[0-g]+%\\s+[0-9]+%(\\s*;[^}]*})`, 's');
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

    
