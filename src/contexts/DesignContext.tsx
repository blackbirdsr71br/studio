
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
      backgroundColor: 'transparent', // Or a very light gray for visibility if needed
      children: [], // This will hold IDs of direct children
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
// The modal JSON has children objects nested under parent.properties.children
const flattenComponentsFromModalJson = (
  modalNodes: any[], // Array of nodes from the modal's JSON (initially, children of DEFAULT_ROOT_LAZY_COLUMN_ID)
  currentDesignParentId: string | null // The ID of the DesignComponent that is the parent of these modalNodes
): DesignComponent[] => {
  let flatList: DesignComponent[] = [];

  for (const modalNode of modalNodes) {
    // Destructure carefully from modalNode
    const { properties: modalNodeProperties, parentId: _modalNodeOriginalParentIdIgnored, ...baseModalNodeData } = modalNode;
    const { children: nestedModalChildrenObjects, ...scalarModalProperties } = modalNodeProperties || {};

    const designComponentProperties: BaseComponentProps = { ...scalarModalProperties };
    let designComponentChildIds: string[] = [];

    if (nestedModalChildrenObjects && Array.isArray(nestedModalChildrenObjects)) {
      // Recursively flatten the nested children from the modal
      // The current modalNode.id becomes the parent for its nested children
      const flattenedNestedChildren = flattenComponentsFromModalJson(
        nestedModalChildrenObjects,
        modalNode.id
      );
      // Add grandchildren, great-grandchildren, etc., to the main flat list
      flatList = flatList.concat(flattenedNestedChildren);
      // Collect IDs of direct children for the current DesignComponent's properties.children
      designComponentChildIds = flattenedNestedChildren
        .filter(fc => fc.parentId === modalNode.id) // Ensure they are direct children of current modalNode
        .map(fc => fc.id);
    }

    const newDesignComponent: DesignComponent = {
      ...baseModalNodeData, // id, type, name from modalNode
      parentId: currentDesignParentId, // This sets the parentId for the DesignComponent being created
      properties: {
        ...designComponentProperties, // Scalar properties from modalNode.properties
        children: designComponentChildIds, // Array of child IDs for this DesignComponent
      },
    };
    flatList.push(newDesignComponent); // Add the current component to the flat list
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
      
      // Ensure default root lazy column exists
      let rootLazyColumn = updatedComponentsList.find(c => c.id === DEFAULT_ROOT_LAZY_COLUMN_ID);
      if (!rootLazyColumn) {
          rootLazyColumn = createDefaultRootLazyColumn();
          updatedComponentsList.unshift(rootLazyColumn);
      }
      
      // If no parentId is specified, or it's explicitly null (meaning drop on canvas),
      // parent it to the default root lazy column.
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

        const sortedTemplateTree = [...template.componentTree].sort((a, b) => {
            const aIsParentOfB = b.parentId === a.id;
            const bIsParentOfA = a.parentId === b.id;
            if (aIsParentOfB) return -1;
            if (bIsParentOfA) return 1;
            return 0;
        });

        sortedTemplateTree.forEach(templateComp => {
          const instanceCompId = `inst-${templateComp.type.toLowerCase().replace(/\s+/g, '-')}-${currentNextId++}`;
          finalIdMap[templateComp.id] = instanceCompId;

          const newInstanceComp = deepClone(templateComp);
          newInstanceComp.id = instanceCompId;
          newInstanceComp.name = `${templateComp.name}`; 

          if (templateComp.id === template.rootComponentId) {
            newInstanceComp.name = `${template.name} Instance`; 
            finalInstanceRootId = instanceCompId;
            
            // Custom component instances added to a parent container (like root LazyColumn)
            // should not have x, y as their layout is managed by the parent.
            delete newInstanceComp.properties.x;
            delete newInstanceComp.properties.y;
            newInstanceComp.parentId = actualParentId;
          } else {
            delete newInstanceComp.properties.x;
            delete newInstanceComp.properties.y;
            if (templateComp.parentId && finalIdMap[templateComp.parentId]) {
              newInstanceComp.parentId = finalIdMap[templateComp.parentId];
            } else {
               newInstanceComp.parentId = null; 
            }
          }

          if (newInstanceComp.properties.children && Array.isArray(newInstanceComp.properties.children)) {
            newInstanceComp.properties.children = newInstanceComp.properties.children
              .map(childIdFromTemplate => finalIdMap[childIdFromTemplate])
              .filter(Boolean);
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

      } else { // Standard component
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
          parentId: actualParentId, // Parent is set to actualParentId
        };
        
        // If parented (i.e., not a free-floating root component, which is now disallowed except for the default root),
        // remove x and y, as its position is determined by the parent container's layout.
        // The default root lazy column handles its own (0,0) positioning.
        delete newComponent.properties.x;
        delete newComponent.properties.y;
        
        updatedComponentsList.push(newComponent);

        // Add to parent's children list
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
                // Ensure we update the component in the list, not just a copy
                updatedComponentsList = updatedComponentsList.map(c => c.id === actualParentId ? updatedParentComp : c);
              }
            }
          }
        }
      }
      
      // Deduplicate components just in case, though logic should prevent it.
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
    const idMap: Record<string, string> = {};
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

      // For components within a template, x, y are generally not relevant as layout is internal
      delete clonedComp.properties.x;
      delete clonedComp.properties.y;

      if (clonedComp.properties.children && Array.isArray(clonedComp.properties.children)) {
        const originalChildIds = [...clonedComp.properties.children];
        clonedComp.properties.children = []; // Reset for template, will be repopulated with mapped IDs

        originalChildIds.forEach(childId => {
          cloneAndCollectForTemplate(childId, templateLocalId);
          if (idMap[childId]) {
            clonedComp.properties.children!.push(idMap[childId]);
          }
        });
      }
      templateComponentTree.push(clonedComp);
    };

    cloneAndCollectForTemplate(selectedComponent.id, null); // Root of the template has null parentId within the template definition

    const templateRootComponent = templateComponentTree.find(c => idMap[selectedComponent.id] === c.id);
    if (!templateRootComponent) {
        console.error("Failed to identify template root component during save.");
        return;
    }

    const newTemplate: Omit<CustomComponentTemplate, 'firestoreId'> = {
      templateId: `${CUSTOM_COMPONENT_TYPE_PREFIX}${name.replace(/\s+/g, '_')}-${Date.now()}`,
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
      const templateRef = doc(db, CUSTOM_TEMPLATES_COLLECTION, newTemplate.templateId);
      await setDoc(templateRef, newTemplate);

      setDesignState(prev => ({
        ...prev,
        customComponentTemplates: [...prev.customComponentTemplates, { ...newTemplate, firestoreId: newTemplate.templateId }],
      }));
    } catch (error) {
      console.error("Error saving custom template to Firestore:", error);
       setDesignState(prev => ({
        ...prev,
        customComponentTemplates: [...prev.customComponentTemplates, { ...newTemplate, firestoreId: `local-error-${newTemplate.templateId}` }],
      }));
    }
  }, [designState.selectedComponentId, getComponentById, designState.components]);


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
      const queue = [id]; // Start with the component explicitly asked to be deleted
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
          // If children array changed, return a new object for this parent
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
        return parentCandidate; // No change to this component's children list
      });

      // 4. Ensure the default root lazy column is still present
      let finalComponents = remainingComponents;
      if (!finalComponents.find(c => c.id === DEFAULT_ROOT_LAZY_COLUMN_ID)) {
        // This case should ideally not be reached if the initial guard works.
        // If it does, it means the root was part of the deletion, which is problematic.
        // For robustness, we add a new one, but its children list would be empty.
        finalComponents.unshift(createDefaultRootLazyColumn());
      }
      
      // 5. Determine the new selected component ID
      const newSelectedComponentId = deletedIdsArray.includes(prev.selectedComponentId || "")
        ? DEFAULT_ROOT_LAZY_COLUMN_ID // Select root if selected component or its ancestor was deleted
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
            if (id === DEFAULT_ROOT_LAZY_COLUMN_ID) {
                 newComp.name = "Root Canvas"; // Prevent renaming of root
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
        components: [newRootLazyColumn], // Only the root
        selectedComponentId: newRootLazyColumn.id,
        nextId: 1, // Reset nextId
        customComponentTemplates: prev.customComponentTemplates, // Keep loaded templates
    }));
  }, []);

  const setDesign = useCallback((newDesign: DesignState) => {
    let finalComponents = newDesign.components;
    let finalSelectedId = newDesign.selectedComponentId;

    // Ensure default root lazy column exists and is the true root
    let rootLazyColumn = finalComponents.find(c => c.id === DEFAULT_ROOT_LAZY_COLUMN_ID);
    if (!rootLazyColumn) {
        rootLazyColumn = createDefaultRootLazyColumn();
        const oldRootChildrenIds = finalComponents.filter(c => !c.parentId).map(c => c.id);
        rootLazyColumn.properties.children = oldRootChildrenIds;
        
        finalComponents = [rootLazyColumn, ...finalComponents.map(c => {
            if (!c.parentId) return {...c, parentId: rootLazyColumn!.id };
            return c;
        })];
    } else {
      // Ensure the found root is actually at the root (parentId: null)
      if (rootLazyColumn.parentId !== null) rootLazyColumn.parentId = null;
      // Ensure other components are not mistakenly parented to null
      finalComponents = finalComponents.map(c => {
        if (c.id !== DEFAULT_ROOT_LAZY_COLUMN_ID && !c.parentId) {
          return {...c, parentId: DEFAULT_ROOT_LAZY_COLUMN_ID};
        }
        return c;
      });
    }


    if (!finalSelectedId || !finalComponents.find(c => c.id === finalSelectedId)) { 
        finalSelectedId = DEFAULT_ROOT_LAZY_COLUMN_ID;
    }
    setDesignState({...newDesign, components: finalComponents, selectedComponentId: finalSelectedId });
  }, []);


  const overwriteComponents = useCallback((hierarchicalUserComponentsJson: any[]): { success: boolean, error?: string } => {
    if (!Array.isArray(hierarchicalUserComponentsJson)) {
      return { success: false, error: "Invalid JSON: Data must be an array of components." };
    }

    // Flatten the hierarchical user components from modal JSON.
    // Their parent in the modal JSON (if top-level) implicitly becomes DEFAULT_ROOT_LAZY_COLUMN_ID.
    const userComponentsFlatList = flattenComponentsFromModalJson(hierarchicalUserComponentsJson, DEFAULT_ROOT_LAZY_COLUMN_ID);

    let rootLazyColumn = createDefaultRootLazyColumn();
    // The children of the root are those from userComponentsFlatList whose parentId is DEFAULT_ROOT_LAZY_COLUMN_ID
    rootLazyColumn.properties.children = userComponentsFlatList
        .filter(c => c.parentId === DEFAULT_ROOT_LAZY_COLUMN_ID)
        .map(c => c.id);

    const finalComponents: DesignComponent[] = [rootLazyColumn, ...userComponentsFlatList];
    
    // Basic validation: check for unique IDs and valid parentId references
    const allIds = new Set(finalComponents.map(c => c.id));
    if (allIds.size !== finalComponents.length) {
        // This might happen if flattenComponentsFromModalJson produced duplicates or if input JSON had non-unique IDs
        console.error("Non-unique IDs after flattening modal JSON:", finalComponents.map(c => c.id));
        return { success: false, error: "Invalid JSON: Component IDs are not unique after processing."};
    }

    for (const comp of finalComponents) {
      if (comp.parentId && !allIds.has(comp.parentId)) {
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
             return { success: false, error: `JSON Inconsistency: Child "${childId}" of component "${comp.id}" reports parentId "${childComp.parentId}", but should be "${comp.id}". Please check parentId fields in your JSON.`};
          }
        }
      }
    }

    // Recalculate nextId
    let maxIdNum = 0;
    finalComponents.forEach(comp => {
      const idParts = comp.id.split('-'); // e.g., "comp-1", "inst-text-2"
      const numStr = idParts[idParts.length -1];
      if (numStr && /^\d+$/.test(numStr)) { // Check if the last part is a number
         const num = parseInt(numStr, 10);
         if (num > maxIdNum) {
          maxIdNum = num;
        }
      }
    });
    
    setDesignState(prev => ({
      ...prev,
      components: finalComponents,
      nextId: maxIdNum + 1,
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

        // Determine actual target parent: if null or surface, it's the root LazyColumn
        let actualTargetParentId = targetParentIdOrNull;
        if (targetParentIdOrNull === null || targetParentIdOrNull === "design-surface") { 
            actualTargetParentId = DEFAULT_ROOT_LAZY_COLUMN_ID;
        }
        

        // Prevent dragging a component into itself or its own children
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

        // Update dragged component's parentId
        draggedComponent.parentId = actualTargetParentId;
        
        // Remove x, y properties as its position is now managed by its new parent (unless it became a free-floating root, which is not allowed for user components)
        delete draggedComponent.properties.x;
        delete draggedComponent.properties.y;
        
        currentComponents[draggedComponentIndex] = draggedComponent;

        // Remove from old parent's children list (if it had one and it's different)
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

        // Add to new parent's children list (if it has one)
        if (actualTargetParentId) {
            const newParentIndex = currentComponents.findIndex(c => c.id === actualTargetParentId);
            if (newParentIndex !== -1) {
                 const newParent = {...currentComponents[newParentIndex]};
                 if (isContainerType(newParent.type, prev.customComponentTemplates)) {
                    let existingChildren = Array.isArray(newParent.properties.children) ? newParent.properties.children : [];
                    // Remove if it was already there (e.g., reordering within same parent)
                    existingChildren = existingChildren.filter(childId => childId !== draggedId); 
                    newParent.properties.children = [...existingChildren, draggedId]; // Add to end
                    currentComponents[newParentIndex] = newParent;
                 } else {
                    // Trying to drop into a non-container. This should ideally be prevented by `canDrop` in useDrop.
                    console.warn(`Attempted to move component ${draggedId} into non-container ${actualTargetParentId}. Reverting parentId.`);
                    // Revert parentId if drop target is not a container
                     draggedComponent.parentId = oldParentId; 
                     currentComponents[draggedComponentIndex] = draggedComponent;
                     // If oldParentId was valid, re-add to old parent's children (if it was removed)
                     if (oldParentId && oldParentId !== actualTargetParentId) {
                        const oldParentIndex = currentComponents.findIndex(c => c.id === oldParentId);
                        if (oldParentIndex !== -1) {
                            const oldParent = {...currentComponents[oldParentIndex]};
                             if (Array.isArray(oldParent.properties.children) && !oldParent.properties.children.includes(draggedId)) {
                                oldParent.properties.children.push(draggedId);
                                currentComponents[oldParentIndex] = oldParent;
                            }
                        }
                     }
                     return prev; // Abort the move operation
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

  if (!isClient) { // SSR or pre-hydration
    const initialContextValue: DesignContextType = {
      ...initialDesignState,
      addComponent: () => {}, // No-op until client-side
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

