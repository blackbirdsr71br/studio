
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
      let finalSelectedComponentId = ''; // The ID of the component that should be selected after adding

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

        const finalIdMap: Record<string, string> = {}; // Maps template-local ID to new instance ID
        const finalNewComponentsBatch: DesignComponent[] = [];
        let instantiatedTemplateRootId = ""; // ID of the root component OF THE INSTANCE

        // Pass 1: Create all instance IDs and map them from template-local IDs
        // Also, pre-increment currentNextId for each ID generation.
        template.componentTree.forEach(templateComp => {
          const newInstanceCompId = `inst-${templateComp.type.toLowerCase().replace(/\s+/g, '-')}-${currentNextId}`;
          finalIdMap[templateComp.id] = newInstanceCompId;
          currentNextId++; // Increment for the next ID
        });
        currentNextId--; // Adjust as it was incremented one extra time if loop ran. If not, it's fine.
                        // More robust: track lastId used, or use currentNextId directly and then increment inside loop

        // Re-initialize currentNextId for component creation loop to be accurate.
        // This is tricky. Let's use the pre-calculated IDs from finalIdMap.
        // We need to get the base for currentNextId from the largest ID generated in finalIdMap.
        let maxNumericIdPart = prev.nextId -1; // Start with prev.nextId -1 as a base
        Object.values(finalIdMap).forEach(instanceId => {
            const parts = instanceId.split('-');
            const numericPart = parseInt(parts[parts.length - 1], 10);
            if (!isNaN(numericPart) && numericPart > maxNumericIdPart) {
                maxNumericIdPart = numericPart;
            }
        });
        currentNextId = maxNumericIdPart + 1;


        // Pass 2: Create component instances with correctly mapped parent and children IDs
        template.componentTree.forEach(templateComp => {
          const newInstanceCompId = finalIdMap[templateComp.id]; // Get the pre-generated instance ID
          if (!newInstanceCompId) {
            console.error(`Could not find mapped instance ID for template component ${templateComp.id}. Skipping.`);
            return;
          }

          const newInstanceComp = deepClone(templateComp); // Deep clone the template component
          newInstanceComp.id = newInstanceCompId;
          newInstanceComp.name = templateComp.name; // Default to template part name

          // Determine parentId for the new instance component
          if (templateComp.id === template.rootComponentId) {
            newInstanceComp.name = `${template.name} Instance`; // Root of instance gets template's name + " Instance"
            instantiatedTemplateRootId = newInstanceCompId;
            newInstanceComp.parentId = actualParentId; // Parent is where it was dropped
          } else {
            // For non-root components, parentId comes from the mapped parentId in the template
            newInstanceComp.parentId = templateComp.parentId ? finalIdMap[templateComp.parentId] : null;
            if (templateComp.parentId && !newInstanceComp.parentId) {
               console.warn(`Could not map parent for instance of ${templateComp.id}. Original template parentId: ${templateComp.parentId}`);
            }
          }

          // Map children IDs from template-local to new instance IDs
          if (newInstanceComp.properties.children && Array.isArray(newInstanceComp.properties.children)) {
            newInstanceComp.properties.children = newInstanceComp.properties.children
              .map(childIdFromTemplate => finalIdMap[childIdFromTemplate])
              .filter(childId => !!childId); // Ensure only valid mapped IDs are included
          }
          
          // Remove template-specific positioning, layout will handle it
          delete newInstanceComp.properties.x;
          delete newInstanceComp.properties.y;

          finalNewComponentsBatch.push(newInstanceComp);
        });

        finalSelectedComponentId = instantiatedTemplateRootId; // Select the root of the newly added instance
        updatedComponentsList = [...updatedComponentsList, ...finalNewComponentsBatch];

        // Add the root of the instantiated template to the children list of its actual parent
        if (actualParentId && instantiatedTemplateRootId) {
            const parentCompIndex = updatedComponentsList.findIndex(c => c.id === actualParentId);
            if (parentCompIndex !== -1) {
                const currentParent = updatedComponentsList[parentCompIndex]; // This is a copy from spread
                if (isContainerType(currentParent.type, prev.customComponentTemplates)) {
                    const existingChildren = Array.isArray(currentParent.properties.children) ? currentParent.properties.children : [];
                    if (!existingChildren.includes(instantiatedTemplateRootId)) {
                        // Create a new object for the parent to ensure immutability
                        updatedComponentsList[parentCompIndex] = {
                            ...currentParent,
                            properties: {
                                ...currentParent.properties,
                                children: [...existingChildren, instantiatedTemplateRootId]
                            }
                        };
                    }
                }
            } else {
                 console.warn(`Could not find parent ${actualParentId} in updated list to add ${instantiatedTemplateRootId}`);
            }
        } else if (!actualParentId && instantiatedTemplateRootId) {
            // This case should ideally not happen if actualParentId defaults to DEFAULT_ROOT_LAZY_COLUMN_ID
            console.warn(`Instantiated template root ${instantiatedTemplateRootId} has no actualParentId.`);
        }


      } else { 
        // Logic for adding a standard component
        const newId = `comp-${currentNextId++}`;
        finalSelectedComponentId = newId;
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
            const currentParent = updatedComponentsList[parentCompIndex]; // This is a copy
            if (isContainerType(currentParent.type, prev.customComponentTemplates)) {
              const existingChildren = Array.isArray(currentParent.properties.children) ? currentParent.properties.children : [];
              if (!existingChildren.includes(newId)) {
                // Create a new object for the parent
                updatedComponentsList[parentCompIndex] = {
                  ...currentParent,
                  properties: {
                    ...currentParent.properties,
                    children: [...existingChildren, newId],
                  },
                };
              }
            }
          }
        }
      }
      
      const finalUniqueComponents = updatedComponentsList.filter((comp, index, self) => index === self.findIndex(t => t.id === comp.id));

      return {
        ...prev,
        components: finalUniqueComponents,
        selectedComponentId: finalSelectedComponentId,
        nextId: currentNextId, // Ensure currentNextId reflects the true next available ID
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

      delete clonedComp.properties.x;
      delete clonedComp.properties.y;

      if (clonedComp.properties.children && Array.isArray(clonedComp.properties.children)) {
        const originalChildIds = [...clonedComp.properties.children];
        clonedComp.properties.children = []; 

        originalChildIds.forEach(childId => {
          cloneAndCollectForTemplate(childId, templateLocalId); 
          if (idMap[childId]) { 
            clonedComp.properties.children!.push(idMap[childId]);
          }
        });
      }
      templateComponentTree.push(clonedComp);
    };

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
  }, [designState.selectedComponentId, getComponentById]); 


  const deleteComponent = useCallback((id: string) => {
    if (id === DEFAULT_ROOT_LAZY_COLUMN_ID) {
      console.warn("Attempted to delete the default root LazyColumn. Operation prevented.");
      return;
    }

    setDesignState(prev => {
      const componentToDelete = prev.components.find(c => c.id === id);
      if (!componentToDelete) return prev;

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

      let remainingComponents = prev.components.filter(comp => !deletedIdsArray.includes(comp.id));

      remainingComponents = remainingComponents.map(parentCandidate => {
        if (parentCandidate.properties.children && Array.isArray(parentCandidate.properties.children)) {
          const updatedChildren = parentCandidate.properties.children.filter(
            childId => !deletedIdsArray.includes(childId)
          );
          // Only create a new object if children actually changed to maintain reference stability
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
      if (!finalComponents.find(c => c.id === DEFAULT_ROOT_LAZY_COLUMN_ID)) {
        finalComponents.unshift(createDefaultRootLazyColumn());
      }
      
      const newSelectedComponentId = deletedIdsArray.includes(prev.selectedComponentId || "")
        ? DEFAULT_ROOT_LAZY_COLUMN_ID 
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
          let newComp = { ...comp, properties: { ...comp.properties} }; // Ensure properties object is new
          if (updates.name !== undefined) {
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
        ...prev, 
        components: [newRootLazyColumn],
        selectedComponentId: newRootLazyColumn.id,
        nextId: 1, 
    }));
  }, []);

  const setDesign = useCallback((newDesign: DesignState) => {
    let finalComponents = newDesign.components;
    let finalSelectedId = newDesign.selectedComponentId;

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
      if (rootLazyColumn.parentId !== null) rootLazyColumn.parentId = null;
      finalComponents = finalComponents.map(c => {
        if (c.id !== DEFAULT_ROOT_LAZY_COLUMN_ID && !c.parentId) {
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
    setDesignState(prev => ({...newDesign, components: finalComponents, selectedComponentId: finalSelectedId, customComponentTemplates: prev.customComponentTemplates }));
  }, []);


  const overwriteComponents = useCallback((hierarchicalUserComponentsJson: any[]): { success: boolean, error?: string } => {
    if (!Array.isArray(hierarchicalUserComponentsJson)) {
      return { success: false, error: "Invalid JSON: Data must be an array of components." };
    }

    const userComponentsFlatList = flattenComponentsFromModalJson(hierarchicalUserComponentsJson, DEFAULT_ROOT_LAZY_COLUMN_ID);

    let rootLazyColumn = createDefaultRootLazyColumn();
    rootLazyColumn.properties.children = userComponentsFlatList
        .filter(c => c.parentId === DEFAULT_ROOT_LAZY_COLUMN_ID) 
        .map(c => c.id);

    const finalComponents: DesignComponent[] = [rootLazyColumn, ...userComponentsFlatList];
    
    const allIds = new Set(finalComponents.map(c => c.id));
    if (allIds.size !== finalComponents.length) {
        console.error("Non-unique IDs after flattening modal JSON:", finalComponents.map(c => c.id));
        return { success: false, error: "Invalid JSON: Component IDs are not unique after processing."};
    }

    for (const comp of finalComponents) {
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
        }
      }
    }

    let maxIdNum = 0;
    finalComponents.forEach(comp => {
      const idParts = comp.id.split('-'); 
      const numStr = idParts[idParts.length -1];
      if (numStr && /^\d+$/.test(numStr)) { 
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
      selectedComponentId: DEFAULT_ROOT_LAZY_COLUMN_ID, 
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

        if (draggedComponentIndex === -1) return prev; 

        let draggedComponent = {...currentComponents[draggedComponentIndex]};
        draggedComponent.properties = {...draggedComponent.properties}; // Ensure properties object is new
        const oldParentId = draggedComponent.parentId;

        let actualTargetParentId = targetParentIdOrNull;
        if (targetParentIdOrNull === null || targetParentIdOrNull === "design-surface") { 
            actualTargetParentId = DEFAULT_ROOT_LAZY_COLUMN_ID;
        }
        
        if (actualTargetParentId === draggedId) return prev; 
        let tempParentCheck = actualTargetParentId;
        while(tempParentCheck) { 
            if (tempParentCheck === draggedId) {
                console.warn("Cannot move component into its own descendant.");
                return prev;
            }
            const parentComponent = currentComponents.find(c => c.id === tempParentCheck);
            tempParentCheck = parentComponent ? parentComponent.parentId : null;
        }

        draggedComponent.parentId = actualTargetParentId;
        
        delete draggedComponent.properties.x;
        delete draggedComponent.properties.y;
        
        currentComponents[draggedComponentIndex] = draggedComponent;

        if (oldParentId && oldParentId !== actualTargetParentId) {
            const oldParentIndex = currentComponents.findIndex(c => c.id === oldParentId);
            if (oldParentIndex !== -1) {
                const oldParent = {...currentComponents[oldParentIndex]};
                oldParent.properties = {...oldParent.properties}; // Ensure properties object is new
                if (Array.isArray(oldParent.properties.children)) {
                    oldParent.properties.children = oldParent.properties.children.filter(childId => childId !== draggedId);
                    currentComponents[oldParentIndex] = oldParent;
                }
            }
        }

        if (actualTargetParentId) {
            const newParentIndex = currentComponents.findIndex(c => c.id === actualTargetParentId);
            if (newParentIndex !== -1) {
                 const newParent = {...currentComponents[newParentIndex]};
                 newParent.properties = {...newParent.properties}; // Ensure properties object is new
                 if (isContainerType(newParent.type, prev.customComponentTemplates)) {
                    let existingChildren = Array.isArray(newParent.properties.children) ? newParent.properties.children : [];
                    existingChildren = existingChildren.filter(childId => childId !== draggedId); 
                    newParent.properties.children = [...existingChildren, draggedId]; 
                    currentComponents[newParentIndex] = newParent;
                 } else {
                    console.warn(`Attempted to move component ${draggedId} into non-container ${actualTargetParentId}. Reverting parentId.`);
                     draggedComponent.parentId = oldParentId; 
                     currentComponents[draggedComponentIndex] = draggedComponent;
                     if (oldParentId && oldParentId !== actualTargetParentId) { 
                        const oldParentIndex = currentComponents.findIndex(c => c.id === oldParentId);
                        if (oldParentIndex !== -1) {
                            const oldParent = {...currentComponents[oldParentIndex]};
                            oldParent.properties = {...oldParent.properties};
                             if (Array.isArray(oldParent.properties.children) && !oldParent.properties.children.includes(draggedId)) {
                                oldParent.properties.children.push(draggedId);
                                currentComponents[oldParentIndex] = oldParent;
                            }
                        }
                     }
                     return prev; 
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

  if (!isClient) { 
    const initialContextValue: DesignContextType = {
      ...initialDesignState,
      addComponent: () => {}, 
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
