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
      delete treeNode.properties.x;
      delete treeNode.properties.y;
      
      if (component.type === 'Column' || component.type === 'Row') {
        // Ensure children array exists and is used from properties if available
        const childIds = component.properties.children || [];
        treeNode.children = buildComponentTree(components, component.id);
        // Remove children from properties, it's now a top-level key in the tree node
        delete treeNode.properties.children; 
      }
      return treeNode;
    });
};


export async function generateJetpackComposeCodeAction(components: DesignComponent[]): Promise<string> {
  try {
    const componentTree = buildComponentTree(components);
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
