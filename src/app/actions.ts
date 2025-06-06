
'use server';
import { generateComposeCode, type GenerateComposeCodeInput } from '@/ai/flows/generate-compose-code';
import type { DesignComponent } from '@/types/compose-spec';

// Helper to create a hierarchical structure for the AI
const buildComponentTree = (components: DesignComponent[], parentId: string | null = null): any[] => {
  return components
    .filter(component => component.parentId === parentId)
    .map(component => {
      const treeNode: any = {
        id: component.id,
        type: component.type,
        name: component.name,
        properties: { ...component.properties }, // Clone properties
      };
      // Remove x, y from properties as they are for canvas positioning not Compose layout
      // Only remove if it's a child of a container, root components might still use x, y for canvas positioning.
      // However, for JSON export, we might want to keep them for full representation of canvas state.
      // The prompt for compose code specifically asks to ignore them for layout.
      // For now, let's keep x, y for the generic JSON export.
      // delete treeNode.properties.x; 
      // delete treeNode.properties.y;
      
      if (component.type === 'Column' || component.type === 'Row') {
        // Ensure children array exists and is used from properties if available
        // const childIds = component.properties.children || []; // This line is not used
        treeNode.children = buildComponentTree(components, component.id);
        // Remove children from properties, it's now a top-level key in the tree node for AI
        // but for raw JSON export, it's fine to keep it if it was an original property.
        // delete treeNode.properties.children; 
      }
      return treeNode;
    });
};


export async function generateJetpackComposeCodeAction(components: DesignComponent[]): Promise<string> {
  try {
    const componentTree = buildComponentTree(components).map(comp => {
      // Specifically for Compose code generation, remove x and y from root components as well
      const { x, y, ...restProperties } = comp.properties;
      return { ...comp, properties: restProperties };
    });
    const designJson = JSON.stringify(componentTree, null, 2); // Pretty print for AI readability

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

export async function getDesignAsJsonAction(components: DesignComponent[]): Promise<string> {
  try {
    // For raw JSON export, we might want to represent the full state, including parentId and a flat list structure
    // or the tree structure. The buildComponentTree already creates a good tree.
    // Let's use a structure that includes all original component data, but arranged hierarchically.
    
    const buildFullComponentTree = (comps: DesignComponent[], pId: string | null = null): any[] => {
      return comps
        .filter(c => c.parentId === pId)
        .map(c => {
          const node = { ...c }; // Spread to make a mutable copy
          if (c.type === 'Column' || c.type === 'Row') {
            // @ts-ignore
            node.childrenComponents = buildFullComponentTree(comps, c.id);
          }
          // Remove the parentId from the children, as hierarchy implies it.
          // Keep properties.children as is (array of IDs)
          return node;
        });
    };
    const componentTree = buildFullComponentTree(components);
    return JSON.stringify(componentTree, null, 2); // Pretty print
  } catch (error) {
    console.error("Error generating design JSON:", error);
    if (error instanceof Error) {
      return `Error: ${error.message}`;
    }
    return "An unknown error occurred while generating JSON.";
  }
}
