

'use server';
import { generateImageFromHint } from '@/ai/flows/generate-image-from-hint-flow';
import { generateJsonFromComposeCommands } from '@/ai/flows/generate-json-from-compose-commands';
import { convertCanvasToCustomJson } from '@/ai/flows/convert-canvas-to-custom-json-flow';
import type { GenerateImageFromHintInput, GenerateJsonFromComposeCommandsInput, ConvertCanvasToCustomJsonInput } from '@/types/ai-spec';

import type { DesignComponent, CustomComponentTemplate, BaseComponentProps, ComponentType, M3Colors, M3Theme } from '@/types/compose-spec';
import { ROOT_SCAFFOLD_ID, DEFAULT_CONTENT_LAZY_COLUMN_ID, CORE_SCAFFOLD_ELEMENT_IDS, getDefaultProperties, propertyDefinitions } from '@/types/compose-spec';
import { getRemoteConfig, isAdminInitialized } from '@/lib/firebaseAdmin';
import { promises as fs } from 'fs';
import path from 'path';
import { hexToHslCssString } from '@/lib/utils';
import { generateComposableCode } from '@/lib/jetpack-compose-generator';
import { getProjectTemplates } from '@/lib/android-project-templates';
import JSZip from 'jszip';


export async function generateProjectFromTemplatesAction(
    packageId: string,
    components: DesignComponent[],
    customComponentTemplates: CustomComponentTemplate[],
    m3Theme?: M3Theme
): Promise<{ files?: Record<string, string>; error?: string; zip?: string }> {
    try {
        const componentTree = buildComponentTree(components, ROOT_SCAFFOLD_ID);
        if (!componentTree) {
            return { error: "Could not find the root scaffold component to build the component tree." };
        }

        // Find the main content area (LazyColumn) to pass to the generator.
        // The MVI architecture already provides the Scaffold, TopAppBar, etc.
        // We only need to generate the content *inside* the main screen area.
        const contentAreaNode = findComponentInTree(componentTree, DEFAULT_CONTENT_LAZY_COLUMN_ID);
        
        if (!contentAreaNode) {
            return { error: "Could not find the main content area (LazyColumn) in the component tree."};
        }

        // Generate the composable code for the *content* only, adapted for the MVI architecture.
        const composableCode = generateComposableCode(contentAreaNode, components, customComponentTemplates, true);

        const templates = getProjectTemplates({
            packageId,
            composableCode,
            m3Theme,
        });

        const zip = new JSZip();
        for (const [filePath, content] of Object.entries(templates)) {
            zip.file(filePath, content);
        }

        const zipContent = await zip.generateAsync({ type: "base64" });

        return { zip: zipContent };
    } catch (error) {
        console.error("Error generating project from templates:", error);
        const message = error instanceof Error ? error.message : "An unknown error occurred while generating the project.";
        return { error: message };
    }
}


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
      // Build the hierarchical component tree starting from the root scaffold.
      const componentTree = buildComponentTree(components, ROOT_SCAFFOLD_ID);
      
      if (!componentTree) {
        return { error: "Could not find the root scaffold component to build the component tree." };
      }

      // Generate the single Composable file. For this action, we generate the full scaffold.
      const composableCode = generateComposableCode(componentTree, components, customComponentTemplates, false);

      // Return the single file in the expected format.
      return {
        files: {
          'GeneratedScreen.kt': composableCode,
        },
      };
    } catch (error) {
      console.error("Error generating Jetpack Compose code:", error);
      const message = error instanceof Error ? error.message : "An unknown error occurred while generating code.";
      return { error: message };
    }
}


// Helper to create a hierarchical structure from the flat component list
const buildComponentTree = (
  allComponents: DesignComponent[],
  componentId: string,
): DesignComponent | null => {
  const component = allComponents.find(c => c.id === componentId);
  if (!component) return null;

  const componentWithChildren: DesignComponent = {
    ...component,
    properties: {
      ...component.properties,
      children: [], // Initialize children array
    },
  };

  if (Array.isArray(component.properties.children)) {
    const childIds = component.properties.children;
    if (Array.isArray(childIds)) {
      componentWithChildren.properties.children = childIds
        .map(id => buildComponentTree(allComponents, id))
        .filter((c): c is DesignComponent => c !== null); // Ensure only valid components are included
    }
  }

  return componentWithChildren;
};

// Helper to find a specific component within a tree
const findComponentInTree = (
  node: DesignComponent,
  targetId: string
): DesignComponent | null => {
  if (node.id === targetId) {
    return node;
  }
  if (Array.isArray(node.properties.children)) {
    for (const child of node.properties.children) {
      const found = findComponentInTree(child as DesignComponent, targetId);
      if (found) {
        return found;
      }
    }
  }
  return null;
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

const getThemeColorForComponentProp = (
  themeColors: M3Colors,
  componentType: ComponentType | string,
  propName: keyof BaseComponentProps
): string | undefined => {
    switch(componentType) {
        case 'Button':
            if (propName === 'backgroundColor') return themeColors.primary;
            if (propName === 'textColor') return themeColors.onPrimary;
            break;
        case 'Card':
        case 'TopAppBar':
        case 'BottomNavigationBar':
            if (propName === 'backgroundColor') return themeColors.surface;
            if (propName === 'contentColor') return themeColors.onSurface;
            break;
        case 'Text':
            if (propName === 'textColor') return themeColors.onSurface;
            break;
    }
    return undefined;
};


// Helper for "View JSON" modal (hierarchical, children in properties.children)
const buildContentComponentTreeForModalJson = (
  allComponents: DesignComponent[],
  customComponentTemplates: CustomComponentTemplate[],
  currentParentIdForContext: string,
  includeDefaultValues: boolean,
  m3Theme: M3Theme | undefined
): ModalJsonNode[] => {
  const parentComponent = allComponents.find(c => c.id === currentParentIdForContext);
  const childIds = parentComponent?.properties.children || [];
  
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
            // Priority 1: Inject theme color if the property is a color and is currently undefined.
            if (m3Theme && def.type === 'color' && fullProps[def.name] === undefined) {
                const themeColor = getThemeColorForComponentProp(m3Theme.lightColors, component.type, def.name as keyof BaseComponentProps);
                if (themeColor) {
                    fullProps[def.name] = themeColor;
                }
            }
            
            // Priority 2: If still not in fullProps, add the default value from compose-spec.
            if (!(def.name in fullProps)) {
                const defaultValue = defaultProps[def.name];
                fullProps[def.name] = defaultValue === undefined ? null : defaultValue;
            }
        });
        
        // Ensure composite properties like 'cornerRadius' and 'padding' are also considered.
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
      
      // Inject theme colors if specific color props are missing
      if (m3Theme) {
        const propsToCheck: (keyof BaseComponentProps)[] = ['backgroundColor', 'textColor', 'contentColor'];
        propsToCheck.forEach(propName => {
            if (cleaned[propName] === undefined) {
                const themeColor = getThemeColorForComponentProp(m3Theme.lightColors, component.type, propName);
                if (themeColor) {
                    cleaned[propName] = themeColor;
                }
            }
        });
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

    if (Array.isArray(component.properties.children) && component.properties.children.length > 0) {
      const childrenObjectNodes = buildContentComponentTreeForModalJson(allComponents, customComponentTemplates, component.id, includeDefaultValues, m3Theme);
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
  includeDefaultValues: boolean = false,
  m3Theme?: M3Theme
): Promise<string> {
  try {
    const modalJsonTree = buildContentComponentTreeForModalJson(
        allComponents,
        customComponentTemplates,
        DEFAULT_CONTENT_LAZY_COLUMN_ID,
        includeDefaultValues,
        m3Theme
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
  includeDefaultValues: boolean,
  m3Theme?: M3Theme
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
    const designJsonString = await getDesignComponentsAsJsonAction(components, customComponentTemplates, includeDefaultValues, m3Theme);
    
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
  includeDefaultValues: boolean,
  m3Theme?: M3Theme
): Promise<{ customJsonString?: string; error?: string }> {
  try {
    const canvasContentJsonString = await getDesignComponentsAsJsonAction(allComponents, customComponentTemplates, includeDefaultValues, m3Theme);

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
