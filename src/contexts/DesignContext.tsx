
'use client';

import type { ReactNode} from 'react';
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { DesignComponent, DesignState, ComponentType, BaseComponentProps, CustomComponentTemplate } from '@/types/compose-spec';
import { getDefaultProperties, CUSTOM_COMPONENT_TYPE_PREFIX, isCustomComponentType, isContainerType, getComponentDisplayName, DEFAULT_ROOT_LAZY_COLUMN_ID } from '@/types/compose-spec';
import { db } from '@/lib/firebase';
import { collection, doc, setDoc, getDocs, deleteDoc } from "firebase/firestore";

interface DesignContextType extends DesignState {
  addComponent: (type: ComponentType | string, parentId?: string | null, dropPosition?: { x: number; y: number }) => void;
  deleteComponent: (id: string) => void;
  selectComponent: (id: string | null) => void;
  updateComponent: (id: string, updates: { name?: string; properties?: Partial<BaseComponentProps> }) => void;
  updateComponentPosition: (id: string, position: { x: number; y: number }) => void;
  getComponentById: (id: string) => DesignComponent | undefined;
  clearDesign: () => void;
  setDesign: (newDesign: DesignState) => void; // Full state replacement
  overwriteComponents: (hierarchicalUserComponentsJson: any[]) => { success: boolean, error?: string }; // For JSON import
  moveComponent: (draggedId: string, targetParentId: string | null, newPosition?: { x: number, y: number}) => void;
  saveSelectedAsCustomTemplate: (name: string) => void;
}

const DesignContext = createContext<DesignContextType | undefined>(undefined);

const CUSTOM_TEMPLATES_COLLECTION = 'customComponentTemplates';


const deepClone = <T>(obj: T): T => {
  return JSON.parse(JSON.stringify(obj));
};

export function createDefaultRootLazyColumn(): DesignComponent {
  const defaultLazyColumnProps = getDefaultProperties('LazyColumn');
  return {
    id: DEFAULT_ROOT_LAZY_COLUMN_ID,
    type: 'LazyColumn',
    name: 'Root Canvas',
    properties: {
      ...defaultLazyColumnProps,
      x: 0,
      y: 0,
      width: 'match_parent',
      height: 'match_parent',
      padding: 8,
      backgroundColor: 'transparent', 
      children: [], 
      itemSpacing: 8,
      userScrollEnabled: true,
      reverseLayout: false,
      verticalArrangement: 'Top',
      horizontalAlignment: 'Start',
    },
    parentId: null,
  };
}

const initialDefaultRootLazyColumn = createDefaultRootLazyColumn();
const initialDesignState: DesignState = {
  components: [initialDefaultRootLazyColumn],
  selectedComponentId: initialDefaultRootLazyColumn.id,
  nextId: 1,
  customComponentTemplates: [],
};


// Helper to flatten hierarchical components from modal JSON
const flattenComponentsFromModalJson = (
  modalNodes: any[], 
  currentDesignParentId: string | null 
): DesignComponent[] => {
  let flatList: DesignComponent[] = [];

  for (const modalNode of modalNodes) {
    const { properties: modalNodeProperties, parentId: _modalNodeOriginalParentIdIgnored, ...baseModalNodeData } = modalNode;
    const { children: nestedModalChildrenObjects, ...scalarModalProperties } = modalNodeProperties || {};

    const designComponentProperties: BaseComponentProps = { ...scalarModalProperties };
    let designComponentChildIds: string[] = [];

    if (nestedModalChildrenObjects && Array.isArray(nestedModalChildrenObjects)) {
      const flattenedNestedChildren = flattenComponentsFromModalJson(
        nestedModalChildrenObjects,
        modalNode.id 
      );
      flatList = flatList.concat(flattenedNestedChildren);
      designComponentChildIds = flattenedNestedChildren
        .filter(fc => fc.parentId === modalNode.id) 
        .map(fc => fc.id);
    }

    const newDesignComponent: DesignComponent = {
      ...baseModalNodeData, 
      parentId: currentDesignParentId, 
      properties: {
        ...designComponentProperties, 
        children: designComponentChildIds, 
      },
    };
    flatList.push(newDesignComponent); 
  }
  return flatList;
};


export const DesignProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [designState, setDesignState] = useState<DesignState>(initialDesignState);
  const [isClient, setIsClient] = useState(false);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);


  useEffect(() => {
    setIsClient(true);
    const loadTemplates = async () => {
      if (!db) {
        console.warn("Firestore not initialized, skipping loading custom templates.");
        setIsLoadingTemplates(false);
        return;
      }
      try {
        setIsLoadingTemplates(true);
        const querySnapshot = await getDocs(collection(db, CUSTOM_TEMPLATES_COLLECTION));
        const templates: CustomComponentTemplate[] = [];
        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.templateId && data.name && data.rootComponentId && data.componentTree) {
            templates.push({
              firestoreId: docSnap.id,
              ...data
            } as CustomComponentTemplate);
          } else {
            console.warn("Found document in customComponentTemplates that is not a valid template:", docSnap.id, data);
          }
        });
        setDesignState(prev => ({ ...prev, customComponentTemplates: templates }));
      } catch (error) {
        console.error("Error loading custom templates from Firestore:", error);
      } finally {
        setIsLoadingTemplates(false);
      }
    };
    loadTemplates();
  }, []);

  const getComponentById = useCallback(
    (id: string) => designState.components.find(comp => comp.id === id),
    [designState.components]
  );

  const getComponentDisplayNameResolved = useCallback((type: ComponentType | string): string => {
    return getComponentDisplayName(type, designState.customComponentTemplates.find(t => t.templateId === type)?.name);
  }, [designState.customComponentTemplates]);


  const addComponent = useCallback((
    type: ComponentType | string,
    parentIdOrNull: string | null = null,
    dropPosition?: { x: number; y: number }
  ) => {
    setDesignState(prev => {
      let currentNextId = prev.nextId;
      let updatedComponentsList = [...prev.components];
      let finalSelectedId = '';

      let actualParentId = parentIdOrNull;
      
      let rootLazyColumn = updatedComponentsList.find(c => c.id === DEFAULT_ROOT_LAZY_COLUMN_ID);
      if (!rootLazyColumn) {
          rootLazyColumn = createDefaultRootLazyColumn();
          updatedComponentsList.unshift(rootLazyColumn);
      }
      
      if (!actualParentId) {
        actualParentId = DEFAULT_ROOT_LAZY_COLUMN_ID;
      }


      if (isCustomComponentType(type)) {
        const templateId = type;
        const template = prev.customComponentTemplates.find(t => t.templateId === templateId);
        
        if (!template) {
          if (isLoadingTemplates) {
             console.warn(`Attempted to add custom template ${templateId}, but templates are still loading. Please try again shortly.`);
          } else if (prev.customComponentTemplates.length === 0 && isCustomComponentType(type)) {
            console.warn(`Attempted to add custom template ${templateId}, but no custom templates are loaded yet. This might indicate an issue with template loading or an empty template library.`);
          } else {
            console.error(`Custom template ${templateId} not found among loaded templates:`, prev.customComponentTemplates.map(t => t.templateId));
          }
          return prev;
        }

        const finalIdMap: Record<string, string> = {};
        const finalNewComponentsBatch: DesignComponent[] = [];
        let finalInstanceRootId = "";

        // Ensure template components are processed parent-first
        const sortedTemplateTree = [...template.componentTree].sort((a, b) => {
            const aIsParentOfB = template.componentTree.some(c => c.id === b.parentId && a.id === c.parentId);
            const bIsParentOfA = template.componentTree.some(c => c.id === a.parentId && b.id === c.parentId);

            if (a.parentId === null && b.parentId !== null) return -1; // a is root, b is not
            if (b.parentId === null && a.parentId !== null) return 1;  // b is root, a is not

            // crude depth check
            let depthA = 0; let currA = a;
            while(currA.parentId && template.componentTree.find(c => c.id === currA.parentId)) { depthA++; currA = template.componentTree.find(c => c.id === currA.parentId)!; if (depthA > 100) break;}
            let depthB = 0; let currB = b;
            while(currB.parentId && template.componentTree.find(c => c.id === currB.parentId)) { depthB++; currB = template.componentTree.find(c => c.id === currB.parentId)!; if (depthB > 100) break;}

            return depthA - depthB;
        });


        sortedTemplateTree.forEach(templateComp => {
          const instanceCompId = `inst-${templateComp.type.toLowerCase().replace(/\s+/g, '-')}-${currentNextId++}`;
          finalIdMap[templateComp.id] = instanceCompId;

          const newInstanceComp = deepClone(templateComp);
          newInstanceComp.id = instanceCompId;
          newInstanceComp.name = `${templateComp.name}`; // Keep original name from template part

          if (templateComp.id === template.rootComponentId) {
            newInstanceComp.name = `${template.name} Instance`; // Instance root gets template name + " Instance"
            finalInstanceRootId = instanceCompId;
            
            delete newInstanceComp.properties.x;
            delete newInstanceComp.properties.y;
            newInstanceComp.parentId = actualParentId;
          } else {
            delete newInstanceComp.properties.x;
            delete newInstanceComp.properties.y;
            if (templateComp.parentId && finalIdMap[templateComp.parentId]) {
              newInstanceComp.parentId = finalIdMap[templateComp.parentId];
            } else {
               console.warn(`Could not map parent for template component ${templateComp.id}. Setting parentId to null.`);
               newInstanceComp.parentId = null; 
            }
          }

          if (newInstanceComp.properties.children && Array.isArray(newInstanceComp.properties.children)) {
            newInstanceComp.properties.children = newInstanceComp.properties.children
              .map(childIdFromTemplate => finalIdMap[childIdFromTemplate])
              .filter(childId => !!childId); // Ensure only valid mapped IDs are included
          }
          finalNewComponentsBatch.push(newInstanceComp);
        });

        finalSelectedId = finalInstanceRootId;
        updatedComponentsList = [...updatedComponentsList, ...finalNewComponentsBatch];

        if (actualParentId && finalInstanceRootId) {
            const parentCompIndex = updatedComponentsList.findIndex(c => c.id === actualParentId);
            if (parentCompIndex !== -1) {
                const currentParent = updatedComponentsList[parentCompIndex];
                if (isContainerType(currentParent.type, prev.customComponentTemplates)) {
                    const existingChildren = Array.isArray(currentParent.properties.children) ? currentParent.properties.children : [];
                    if (!existingChildren.includes(finalInstanceRootId)) {
                        updatedComponentsList[parentCompIndex] = {
                            ...currentParent,
                            properties: {
                                ...currentParent.properties,
                                children: [...existingChildren, finalInstanceRootId]
                            }
                        };
                    }
                }
            }
        }

      } else { 
        const newId = `comp-${currentNextId++}`;
        finalSelectedId = newId;
        const defaultProps = getDefaultProperties(type as ComponentType);
        
        const newComponent: DesignComponent = {
          id: newId,
          type: type as ComponentType,
          name: `${getComponentDisplayNameResolved(type as ComponentType)} ${newId.split('-')[1]}`,
          properties: {
            ...defaultProps,
          },
          parentId: actualParentId, 
        };
        
        delete newComponent.properties.x;
        delete newComponent.properties.y;
        
        updatedComponentsList.push(newComponent);

        if (actualParentId) {
          const parentCompIndex = updatedComponentsList.findIndex(c => c.id === actualParentId);
          if (parentCompIndex !== -1) {
            const currentParent = updatedComponentsList[parentCompIndex];
            if (isContainerType(currentParent.type, prev.customComponentTemplates)) {
              const existingChildren = Array.isArray(currentParent.properties.children) ? currentParent.properties.children : [];
              if (!existingChildren.includes(newId)) {
                const updatedParentComp = {
                  ...currentParent,
                  properties: {
                    ...currentParent.properties,
                    children: [...existingChildren, newId],
                  },
                };
                updatedComponentsList = updatedComponentsList.map(c => c.id === actualParentId ? updatedParentComp : c);
              }
            }
          }
        }
      }
      
      const finalUniqueComponents = updatedComponentsList.filter((comp, index, self) => index === self.findIndex(t => t.id === comp.id));

      return {
        ...prev,
        components: finalUniqueComponents,
        selectedComponentId: finalSelectedId,
        nextId: currentNextId,
      };
    });
  }, [getComponentById, designState.customComponentTemplates, getComponentDisplayNameResolved, isLoadingTemplates]);


  const saveSelectedAsCustomTemplate = useCallback(async (name: string) => {
    if (!designState.selectedComponentId) return;
    if (designState.selectedComponentId === DEFAULT_ROOT_LAZY_COLUMN_ID) {
        console.warn("Cannot save the root canvas as a custom component.");
        return;
    }
    const selectedComponent = getComponentById(designState.selectedComponentId);
    if (!selectedComponent) return;

    const templateComponentTree: DesignComponent[] = [];
    const idMap: Record<string, string> = {}; // Maps original component ID to new template-local ID
    let nextTemplateInternalId = 1;

    const generateTemplateInternalId = (typeStr: string) => `tmpl-${typeStr.toLowerCase().replace(/\s+/g, '-')}-${nextTemplateInternalId++}`;

    const cloneAndCollectForTemplate = (originalCompId: string, newTemplateParentId: string | null) => {
      const originalComp = getComponentById(originalCompId);
      if (!originalComp) return;

      const templateLocalId = generateTemplateInternalId(originalComp.type);
      idMap[originalCompId] = templateLocalId;

      const clonedComp = deepClone(originalComp);
      clonedComp.id = templateLocalId;
      clonedComp.parentId = newTemplateParentId;

      // Remove position properties, as they are relative to the template's container
      delete clonedComp.properties.x;
      delete clonedComp.properties.y;

      if (clonedComp.properties.children && Array.isArray(clonedComp.properties.children)) {
        const originalChildIds = [...clonedComp.properties.children];
        clonedComp.properties.children = []; // Reset, will be populated with new template-local child IDs

        originalChildIds.forEach(childId => {
          cloneAndCollectForTemplate(childId, templateLocalId); // Recursive call for children
          if (idMap[childId]) { // If child was successfully cloned and mapped
            clonedComp.properties.children!.push(idMap[childId]);
          }
        });
      }
      templateComponentTree.push(clonedComp);
    };

    // Start cloning from the selected component, its new parentId within the template will be null
    cloneAndCollectForTemplate(selectedComponent.id, null); 

    const templateRootComponent = templateComponentTree.find(c => idMap[selectedComponent.id] === c.id);
    if (!templateRootComponent) {
        console.error("Failed to identify template root component during save.");
        return;
    }

    const newTemplate: Omit<CustomComponentTemplate, 'firestoreId'> = {
      templateId: `${CUSTOM_COMPONENT_TYPE_PREFIX}${name.replace(/\s+/g, '_').toLowerCase()}-${Date.now()}`,
      name: name,
      rootComponentId: templateRootComponent.id,
      componentTree: templateComponentTree,
    };

    try {
      if (!db) {
        console.warn("Firestore not initialized. Template saved to local state only.");
        setDesignState(prev => ({
          ...prev,
          customComponentTemplates: [...prev.customComponentTemplates, { ...newTemplate, firestoreId: `local-${newTemplate.templateId}` }],
        }));
        return;
      }
      // Use templateId as Firestore document ID for easy retrieval/uniqueness
      const templateRef = doc(db, CUSTOM_TEMPLATES_COLLECTION, newTemplate.templateId);
      await setDoc(templateRef, newTemplate);

      setDesignState(prev => ({
        ...prev,
        customComponentTemplates: [...prev.customComponentTemplates, { ...newTemplate, firestoreId: newTemplate.templateId }],
      }));
    } catch (error) {
      console.error("Error saving custom template to Firestore:", error);
       // Fallback: save to local state even if Firestore fails
       setDesignState(prev => ({
        ...prev,
        customComponentTemplates: [...prev.customComponentTemplates, { ...newTemplate, firestoreId: `local-error-${newTemplate.templateId}` }],
      }));
    }
  }, [designState.selectedComponentId, getComponentById, designState.components]); // designState.components used by getComponentById


  const deleteComponent = useCallback((id: string) => {
    if (id === DEFAULT_ROOT_LAZY_COLUMN_ID) {
      console.warn("Attempted to delete the default root LazyColumn. Operation prevented.");
      return;
    }

    setDesignState(prev => {
      const componentToDelete = prev.components.find(c => c.id === id);
      if (!componentToDelete) return prev;

      // 1. Identify all components to delete (including children)
      const idsToDeleteRecursively = new Set<string>();
      const queue = [id]; 
      while (queue.length > 0) {
        const currentId = queue.shift()!;
        if (idsToDeleteRecursively.has(currentId)) continue;
        idsToDeleteRecursively.add(currentId);

        const currentComp = prev.components.find(c => c.id === currentId);
        if (currentComp?.properties.children && Array.isArray(currentComp.properties.children)) {
          currentComp.properties.children.forEach(childId => {
            if (!idsToDeleteRecursively.has(childId)) {
              queue.push(childId);
            }
          });
        }
      }
      const deletedIdsArray = Array.from(idsToDeleteRecursively);

      // 2. Filter out the deleted components
      let remainingComponents = prev.components.filter(comp => !deletedIdsArray.includes(comp.id));

      // 3. Update the 'children' array of any remaining parent components
      remainingComponents = remainingComponents.map(parentCandidate => {
        if (parentCandidate.properties.children && Array.isArray(parentCandidate.properties.children)) {
          const updatedChildren = parentCandidate.properties.children.filter(
            childId => !deletedIdsArray.includes(childId)
          );
          if (updatedChildren.length !== parentCandidate.properties.children.length) {
            return {
              ...parentCandidate,
              properties: {
                ...parentCandidate.properties,
                children: updatedChildren,
              },
            };
          }
        }
        return parentCandidate; 
      });

      let finalComponents = remainingComponents;
      // Ensure default root still exists
      if (!finalComponents.find(c => c.id === DEFAULT_ROOT_LAZY_COLUMN_ID)) {
        finalComponents.unshift(createDefaultRootLazyColumn());
      }
      
      const newSelectedComponentId = deletedIdsArray.includes(prev.selectedComponentId || "")
        ? DEFAULT_ROOT_LAZY_COLUMN_ID // Select root if deleted item was selected
        : prev.selectedComponentId;
      
      return {
        ...prev,
        components: finalComponents,
        selectedComponentId: newSelectedComponentId,
      };
    });
  }, []);


  const selectComponent = useCallback((id: string | null) => {
    setDesignState(prev => ({ ...prev, selectedComponentId: id }));
  }, []);

  const updateComponent = useCallback((id: string, updates: { name?: string; properties?: Partial<BaseComponentProps> }) => {
    setDesignState(prev => ({
      ...prev,
      components: prev.components.map(comp => {
        if (comp.id === id) {
          let newComp = { ...comp };
          if (updates.name !== undefined) {
            // Prevent renaming the root canvas from its fixed name
            if (id === DEFAULT_ROOT_LAZY_COLUMN_ID) {
                 newComp.name = "Root Canvas"; 
            } else {
                newComp.name = updates.name;
            }
          }
          if (updates.properties !== undefined) {
            newComp.properties = { ...newComp.properties, ...updates.properties };
          }
          return newComp;
        }
        return comp;
      }),
    }));
  }, []);

  const updateComponentPosition = useCallback((id: string, position: { x: number; y: number }) => {
    setDesignState(prev => ({
      ...prev,
      components: prev.components.map(comp =>
        (comp.id === id && !comp.parentId && id !== DEFAULT_ROOT_LAZY_COLUMN_ID) ? { ...comp, properties: { ...comp.properties, x: position.x, y: position.y } } : comp
      ),
    }));
  }, []);

  const clearDesign = useCallback(() => {
    const newRootLazyColumn = createDefaultRootLazyColumn();
    setDesignState(prev => ({
        ...prev, // Preserves other parts of state like customComponentTemplates
        components: [newRootLazyColumn],
        selectedComponentId: newRootLazyColumn.id,
        nextId: 1, // Reset nextId as well
    }));
  }, []);

  const setDesign = useCallback((newDesign: DesignState) => {
    // Ensure the new design state always includes a valid root lazy column and custom templates from current state.
    let finalComponents = newDesign.components;
    let finalSelectedId = newDesign.selectedComponentId;

    // Check and fix root lazy column
    let rootLazyColumn = finalComponents.find(c => c.id === DEFAULT_ROOT_LAZY_COLUMN_ID);
    if (!rootLazyColumn) {
        rootLazyColumn = createDefaultRootLazyColumn();
        const oldRootChildrenIds = finalComponents.filter(c => !c.parentId).map(c => c.id);
        rootLazyColumn.properties.children = oldRootChildrenIds;
        
        finalComponents = [rootLazyColumn, ...finalComponents.map(c => {
            if (!c.parentId) return {...c, parentId: rootLazyColumn!.id }; // Ensure parentId set for old root children
            return c;
        })];
    } else {
      // Ensure existing root's parentId is null and other parentless items become its children
      if (rootLazyColumn.parentId !== null) rootLazyColumn.parentId = null;
      finalComponents = finalComponents.map(c => {
        if (c.id !== DEFAULT_ROOT_LAZY_COLUMN_ID && !c.parentId) {
          // This component was parentless, make it a child of the root if not already
          if (!rootLazyColumn!.properties.children?.includes(c.id)) {
             rootLazyColumn!.properties.children = [...(rootLazyColumn!.properties.children || []), c.id];
          }
          return {...c, parentId: DEFAULT_ROOT_LAZY_COLUMN_ID};
        }
        return c;
      });
    }


    if (!finalSelectedId || !finalComponents.find(c => c.id === finalSelectedId)) { 
        finalSelectedId = DEFAULT_ROOT_LAZY_COLUMN_ID;
    }
    // Preserve existing custom templates
    setDesignState(prev => ({...newDesign, components: finalComponents, selectedComponentId: finalSelectedId, customComponentTemplates: prev.customComponentTemplates }));
  }, []);


  const overwriteComponents = useCallback((hierarchicalUserComponentsJson: any[]): { success: boolean, error?: string } => {
    // This function expects JSON representing only user components (children of the root lazy column)
    if (!Array.isArray(hierarchicalUserComponentsJson)) {
      return { success: false, error: "Invalid JSON: Data must be an array of components." };
    }

    // Flatten the hierarchical JSON, setting their parentId to the DEFAULT_ROOT_LAZY_COLUMN_ID if they are top-level in the JSON,
    // or to their respective JSON parent's new ID.
    const userComponentsFlatList = flattenComponentsFromModalJson(hierarchicalUserComponentsJson, DEFAULT_ROOT_LAZY_COLUMN_ID);

    // Create a new root lazy column
    let rootLazyColumn = createDefaultRootLazyColumn();
    // Assign children to the root lazy column based on the top-level items from the flattened list
    rootLazyColumn.properties.children = userComponentsFlatList
        .filter(c => c.parentId === DEFAULT_ROOT_LAZY_COLUMN_ID) // These are the true top-level user items
        .map(c => c.id);

    const finalComponents: DesignComponent[] = [rootLazyColumn, ...userComponentsFlatList];
    
    // Validate IDs and parent relationships
    const allIds = new Set(finalComponents.map(c => c.id));
    if (allIds.size !== finalComponents.length) {
        console.error("Non-unique IDs after flattening modal JSON:", finalComponents.map(c => c.id));
        return { success: false, error: "Invalid JSON: Component IDs are not unique after processing."};
    }

    for (const comp of finalComponents) {
      // Skip parent check for the main root, as it's null
      if (comp.id !== DEFAULT_ROOT_LAZY_COLUMN_ID && comp.parentId && !allIds.has(comp.parentId)) {
        return { success: false, error: `Invalid JSON: Component "${comp.name} (${comp.id})" has a non-existent parentId "${comp.parentId}".`};
      }
      if (comp.properties.children) {
        if (!Array.isArray(comp.properties.children)) {
           return { success: false, error: `Invalid JSON: Component "${comp.name} (${comp.id})" has non-array children property.`};
        }
        for (const childId of comp.properties.children) {
          if (!allIds.has(childId)) {
            return { success: false, error: `Invalid JSON: Component "${comp.name} (${comp.id})" lists non-existent childId "${childId}".`};
          }
          const childComp = finalComponents.find(c => c.id === childId);
          if (childComp && childComp.parentId !== comp.id) {
             // This check might be too strict if flattenComponentsFromModalJson handles parent reassignment correctly
             // console.warn(`JSON Inconsistency: Child "${childId}" of component "${comp.id}" reports parentId "${childComp.parentId}", but should be "${comp.id}". This might be due to JSON structure.`);
          }
        }
      }
    }

    // Recalculate nextId based on imported components
    let maxIdNum = 0;
    finalComponents.forEach(comp => {
      // Try to extract number from IDs like "comp-1", "inst-text-5"
      const idParts = comp.id.split('-'); 
      const numStr = idParts[idParts.length -1];
      if (numStr && /^\d+$/.test(numStr)) { // Check if the last part is purely numeric
         const num = parseInt(numStr, 10);
         if (num > maxIdNum) {
          maxIdNum = num;
        }
      }
    });
    
    setDesignState(prev => ({
      ...prev, // Keep existing custom templates
      components: finalComponents,
      nextId: maxIdNum + 1, // Set nextId to be greater than any imported ID number
      selectedComponentId: DEFAULT_ROOT_LAZY_COLUMN_ID, // Select the root after import
    }));
    return { success: true };
  }, []);


  const moveComponent = useCallback((draggedId: string, targetParentIdOrNull: string | null, newPosition?: { x: number, y: number}) => {
     if (draggedId === DEFAULT_ROOT_LAZY_COLUMN_ID) {
        console.warn("Cannot move the default root LazyColumn.");
        return;
    }
    setDesignState(prev => {
        let currentComponents = [...prev.components];
        const draggedComponentIndex = currentComponents.findIndex(c => c.id === draggedId);

        if (draggedComponentIndex === -1) return prev; // Should not happen

        let draggedComponent = {...currentComponents[draggedComponentIndex]};
        const oldParentId = draggedComponent.parentId;

        let actualTargetParentId = targetParentIdOrNull;
        // If dropped directly on surface, parent to root lazy column
        if (targetParentIdOrNull === null || targetParentIdOrNull === "design-surface") { 
            actualTargetParentId = DEFAULT_ROOT_LAZY_COLUMN_ID;
        }
        

        // Prevent dropping component onto itself or into its own children
        if (actualTargetParentId === draggedId) return prev; 
        let tempParentCheck = actualTargetParentId;
        while(tempParentCheck) { // Check ancestry of target
            if (tempParentCheck === draggedId) {
                console.warn("Cannot move component into its own descendant.");
                return prev;
            }
            const parentComponent = currentComponents.find(c => c.id === tempParentCheck);
            tempParentCheck = parentComponent ? parentComponent.parentId : null;
        }

        // Update parentId of dragged component
        draggedComponent.parentId = actualTargetParentId;
        
        // x,y are generally not used for children of flex/grid containers, but clear them if moved
        delete draggedComponent.properties.x;
        delete draggedComponent.properties.y;
        
        currentComponents[draggedComponentIndex] = draggedComponent;

        // Remove from old parent's children list
        if (oldParentId && oldParentId !== actualTargetParentId) {
            const oldParentIndex = currentComponents.findIndex(c => c.id === oldParentId);
            if (oldParentIndex !== -1) {
                const oldParent = {...currentComponents[oldParentIndex]};
                if (Array.isArray(oldParent.properties.children)) {
                    oldParent.properties.children = oldParent.properties.children.filter(childId => childId !== draggedId);
                    currentComponents[oldParentIndex] = oldParent;
                }
            }
        }

        // Add to new parent's children list
        if (actualTargetParentId) {
            const newParentIndex = currentComponents.findIndex(c => c.id === actualTargetParentId);
            if (newParentIndex !== -1) {
                 const newParent = {...currentComponents[newParentIndex]};
                 if (isContainerType(newParent.type, prev.customComponentTemplates)) {
                    let existingChildren = Array.isArray(newParent.properties.children) ? newParent.properties.children : [];
                    existingChildren = existingChildren.filter(childId => childId !== draggedId); // Ensure not duplicated
                    newParent.properties.children = [...existingChildren, draggedId]; // Add to end
                    currentComponents[newParentIndex] = newParent;
                 } else {
                    // Attempted to drop into a non-container, revert parentId
                    console.warn(`Attempted to move component ${draggedId} into non-container ${actualTargetParentId}. Reverting parentId.`);
                     draggedComponent.parentId = oldParentId; // Revert to old parent
                     currentComponents[draggedComponentIndex] = draggedComponent;
                     // Also, re-add to old parent's children if it was removed
                     if (oldParentId && oldParentId !== actualTargetParentId) { // Ensure old parent was actually different
                        const oldParentIndex = currentComponents.findIndex(c => c.id === oldParentId);
                        if (oldParentIndex !== -1) {
                            const oldParent = {...currentComponents[oldParentIndex]};
                             if (Array.isArray(oldParent.properties.children) && !oldParent.properties.children.includes(draggedId)) {
                                oldParent.properties.children.push(draggedId);
                                currentComponents[oldParentIndex] = oldParent;
                            }
                        }
                     }
                     return prev; // Return previous state as move was invalid
                 }
            }
        }
        return { ...prev, components: currentComponents, selectedComponentId: draggedId };
    });
  }, []);


  const contextValue: DesignContextType = {
    ...designState,
    addComponent,
    deleteComponent,
    selectComponent,
    updateComponent,
    updateComponentPosition,
    getComponentById,
    clearDesign,
    setDesign,
    overwriteComponents,
    moveComponent,
    saveSelectedAsCustomTemplate,
  };

  if (!isClient) { // Avoid hydration errors by providing a stable initial context on server
    const initialContextValue: DesignContextType = {
      ...initialDesignState,
      addComponent: () => {}, // No-op functions for server
      deleteComponent: () => {},
      selectComponent: () => {}, 
      updateComponent: () => {},
      updateComponentPosition: () => {},
      getComponentById: (id: string) => initialDesignState.components.find(comp => comp.id === id),
      clearDesign: () => {},
      setDesign: () => {},
      overwriteComponents: () => { return {success: false, error: "Context not ready."}; },
      moveComponent: () => {},
      saveSelectedAsCustomTemplate: () => {},
    };
    return (
      <DesignContext.Provider value={initialContextValue}>
        {children}
      </DesignContext.Provider>
    );
  }

  return (
    <DesignContext.Provider value={contextValue}>
      {children}
    </DesignContext.Provider>
  );
};

export const useDesign = (): DesignContextType => {
  const context = useContext(DesignContext);
  if (context === undefined) {
    throw new Error('useDesign must be used within a DesignProvider');
  }
  return context;
};



    