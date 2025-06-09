
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
  overwriteComponents: (hierarchicalUserComponents: any[]) => { success: boolean, error?: string }; // For JSON import
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


// Helper interface for hierarchical nodes from JSON modal
interface HierarchicalComponentNode extends Omit<DesignComponent, 'properties'> {
  properties: BaseComponentProps; // Ensure properties.children is string[]
  childrenComponents?: HierarchicalComponentNode[];
}

// Helper to flatten hierarchical components from JSON modal into DesignComponent list
const flattenHierarchicalComponents = (
  nodes: HierarchicalComponentNode[],
  actualParentId: string | null
): DesignComponent[] => {
  const flatList: DesignComponent[] = [];
  for (const node of nodes) {
    const { childrenComponents, ...designCompData } = node;
    const componentToAdd: DesignComponent = {
      ...designCompData,
      parentId: actualParentId,
      // designCompData.properties.children (string[]) is expected to be correct from the JSON.
    };
    flatList.push(componentToAdd);

    if (childrenComponents && childrenComponents.length > 0) {
      flatList.push(...flattenHierarchicalComponents(childrenComponents, node.id));
    }
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
      
      if (!updatedComponentsList.find(c => c.id === DEFAULT_ROOT_LAZY_COLUMN_ID)) {
          const newRoot = createDefaultRootLazyColumn();
          updatedComponentsList.unshift(newRoot);
          if (!actualParentId && type !== 'LazyColumn') {
            actualParentId = newRoot.id;
          }
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

    cloneAndCollectForTemplate(selectedComponent.id, null);

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

      let idsToDelete = new Set<string>();
      const queue = [id];

      while(queue.length > 0) {
          const currentId = queue.shift()!;
          if (idsToDelete.has(currentId)) continue;
          idsToDelete.add(currentId);

          const currentComp = prev.components.find(c => c.id === currentId);
          if (currentComp && Array.isArray(currentComp.properties.children)) {
              currentComp.properties.children.forEach(childId => {
                  if (!idsToDelete.has(childId)) {
                      queue.push(childId);
                  }
              });
          }
      }

      const idsToDeleteArray = Array.from(idsToDelete);
      let components = prev.components.filter(comp => !idsToDeleteArray.includes(comp.id));

      if (componentToDelete.parentId) {
        components = components.map(comp => {
          if (comp.id === componentToDelete.parentId && Array.isArray(comp.properties.children)) {
            return {
              ...comp,
              properties: {
                ...comp.properties,
                children: comp.properties.children.filter(childId => !idsToDeleteArray.includes(childId))
              }
            };
          }
          return comp;
        });
      }
      
      if (!components.find(c => c.id === DEFAULT_ROOT_LAZY_COLUMN_ID)) {
        components.unshift(createDefaultRootLazyColumn());
      }

      return {
        ...prev,
        components,
        selectedComponentId: idsToDeleteArray.includes(prev.selectedComponentId || "") ? DEFAULT_ROOT_LAZY_COLUMN_ID : prev.selectedComponentId,
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
        components: [newRootLazyColumn],
        selectedComponentId: newRootLazyColumn.id,
        nextId: 1,
        customComponentTemplates: prev.customComponentTemplates,
    }));
  }, []);

  const setDesign = useCallback((newDesign: DesignState) => {
    let finalComponents = newDesign.components;
    let finalSelectedId = newDesign.selectedComponentId;

    if (!finalComponents.find(c => c.id === DEFAULT_ROOT_LAZY_COLUMN_ID)) {
        const root = createDefaultRootLazyColumn();
        const oldRootChildrenIds = finalComponents.filter(c => !c.parentId).map(c => c.id);
        root.properties.children = oldRootChildrenIds;
        
        finalComponents = [root, ...finalComponents.map(c => {
            if (!c.parentId) return {...c, parentId: root.id };
            return c;
        })];

        if (!finalSelectedId || !finalComponents.find(c => c.id === finalSelectedId)) { 
            finalSelectedId = root.id;
        }
    }
    setDesignState({...newDesign, components: finalComponents, selectedComponentId: finalSelectedId });
  }, []);


  const overwriteComponents = useCallback((hierarchicalUserComponents: HierarchicalComponentNode[]): { success: boolean, error?: string } => {
    if (!Array.isArray(hierarchicalUserComponents)) {
      return { success: false, error: "Invalid JSON: Data must be an array of components." };
    }

    // Flatten the hierarchical user components; their parent will be the default root.
    const userComponentsFlatList = flattenHierarchicalComponents(hierarchicalUserComponents, DEFAULT_ROOT_LAZY_COLUMN_ID);

    let rootLazyColumn = createDefaultRootLazyColumn();
    rootLazyColumn.properties.children = userComponentsFlatList
        .filter(c => c.parentId === DEFAULT_ROOT_LAZY_COLUMN_ID)
        .map(c => c.id);

    const finalComponents: DesignComponent[] = [rootLazyColumn, ...userComponentsFlatList];
    
    const allIds = new Set(finalComponents.map(c => c.id));
    if (allIds.size !== finalComponents.length) {
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
             return { success: false, error: `JSON Inconsistency: Child "${childId}" of component "${comp.id}" reports parentId "${childComp.parentId}", but should be "${comp.id}".`};
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
                 if (isContainerType(newParent.type, prev.customComponentTemplates)) {
                    let existingChildren = Array.isArray(newParent.properties.children) ? newParent.properties.children : [];
                    existingChildren = existingChildren.filter(childId => childId !== draggedId); // Remove if already exists (e.g. reordering)
                    newParent.properties.children = [...existingChildren, draggedId];
                    currentComponents[newParentIndex] = newParent;
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
      addComponent: () => console.warn("DesignContext: addComponent called before client hydration."),
      deleteComponent: () => console.warn("DesignContext: deleteComponent called before client hydration."),
      selectComponent: () => {}, 
      updateComponent: () => console.warn("DesignContext: updateComponent called before client hydration."),
      updateComponentPosition: () => console.warn("DesignContext: updateComponentPosition called before client hydration."),
      getComponentById: (id: string) => initialDesignState.components.find(comp => comp.id === id),
      clearDesign: () => console.warn("DesignContext: clearDesign called before client hydration."),
      setDesign: () => console.warn("DesignContext: setDesign called before client hydration."),
      overwriteComponents: () => { console.warn("DesignContext: overwriteComponents called before client hydration."); return {success: false, error: "Context not ready."}; },
      moveComponent: () => console.warn("DesignContext: moveComponent called before client hydration."),
      saveSelectedAsCustomTemplate: () => console.warn("DesignContext: saveSelectedAsCustomTemplate called before client hydration."),
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
