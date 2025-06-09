
'use server';
import { generateComposeCode, type GenerateComposeCodeInput } from '@/ai/flows/generate-compose-code';
import { generateImageFromHint, type GenerateImageFromHintInput } from '@/ai/flows/generate-image-from-hint-flow';
import type { DesignComponent, CustomComponentTemplate } from '@/types/compose-spec';
import { isContainerType, DEFAULT_ROOT_LAZY_COLUMN_ID } from '@/types/compose-spec';
import { getRemoteConfig, isAdminInitialized } from '@/lib/firebaseAdmin';

const REMOTE_CONFIG_PARAMETER_KEY = 'COMPOSE_DESIGN_JSON';

// Helper function to remove properties with empty string values
const cleanEmptyStringProperties = (properties: Record<string, any>): Record<string, any> => {
  const cleanedProperties = { ...properties };
  for (const key in cleanedProperties) {
    if (cleanedProperties[key] === "") {
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
const buildComponentTree = (
  allComponents: DesignComponent[],
  customComponentTemplates: CustomComponentTemplate[],
  parentId: string | null = null
): AiComponentTreeNode[] => {
  return allComponents
    .filter(component => component.parentId === parentId)
    .map(component => {
      const node: AiComponentTreeNode = {
        id: component.id,
        type: component.type,
        name: component.name,
        properties: cleanEmptyStringProperties({ ...component.properties }),
      };

      if (component.id !== DEFAULT_ROOT_LAZY_COLUMN_ID && !parentId) {
        const { x, y, ...restProperties } = node.properties;
        node.properties = restProperties;
      } else if (parentId) {
        delete node.properties.x;
        delete node.properties.y;
      }


      if (isContainerType(component.type, customComponentTemplates)) {
        const children = buildComponentTree(allComponents, customComponentTemplates, component.id);
        if (children.length > 0) {
          node.children = children;
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
    const componentTreeForAi = buildComponentTree(components, customComponentTemplates);
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

// Interface for the nodes in the full JSON tree (for Remote Config & View JSON modal)
interface FullComponentTreeNodeForRemoteConfig extends DesignComponent {
  childrenComponents?: FullComponentTreeNodeForRemoteConfig[];
}

const buildFullComponentTreeForRemoteConfig = (
  allComponents: DesignComponent[],
  customComponentTemplates: CustomComponentTemplate[],
  currentParentId: string | null = null
): FullComponentTreeNodeForRemoteConfig[] => {
  return allComponents
    .filter(c => c.parentId === currentParentId)
    .map(c => {
      // Create a mutable copy of component `c` to be used as the base for our node
      const componentDataCopy = { ...c };
      // Clean properties directly on the copy that will form the node
      componentDataCopy.properties = cleanEmptyStringProperties({ ...c.properties });

      const node: FullComponentTreeNodeForRemoteConfig = {
        ...componentDataCopy
      };

      if (isContainerType(c.type, customComponentTemplates)) {
        const childrenNodes = buildFullComponentTreeForRemoteConfig(allComponents, customComponentTemplates, c.id);
        if (childrenNodes.length > 0) {
          node.childrenComponents = childrenNodes;
          // The `node.properties.children` (array of IDs) is already present from `componentDataCopy`
          // if it was in the original component `c` from the design context.
        }
      }
      return node;
    });
};

// This action is now specifically for getting the hierarchical list of user components for editing in the modal
export async function getDesignComponentsAsJsonAction(
  allComponents: DesignComponent[], // Pass all components from the context
  customComponentTemplates: CustomComponentTemplate[]
): Promise<string> {
  try {
    // Build the hierarchical tree for children of the default root LazyColumn
    const rootLazyColumnChildrenTree = buildFullComponentTreeForRemoteConfig(
        allComponents,
        customComponentTemplates,
        DEFAULT_ROOT_LAZY_COLUMN_ID // Get children of the root LazyColumn
    );
    // Properties within this tree are already cleaned by buildFullComponentTreeForRemoteConfig
    return JSON.stringify(rootLazyColumnChildrenTree, null, 2);
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
    const fullComponentTree = buildFullComponentTreeForRemoteConfig(components, customComponentTemplates, null);
    const designJsonString = JSON.stringify(fullComponentTree, null, 2);


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
