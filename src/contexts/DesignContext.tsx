
'use client';

import type { ReactNode} from 'react';
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { DesignComponent, DesignState, ComponentType, BaseComponentProps, CustomComponentTemplate } from '@/types/compose-spec';
import { getDefaultProperties, CUSTOM_COMPONENT_TYPE_PREFIX, isCustomComponentType, isContainerType, CONTAINER_TYPES } from '@/types/compose-spec';
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
  setDesign: (newDesign: DesignState) => void;
  moveComponent: (draggedId: string, targetParentId: string | null, newPosition?: { x: number, y: number}) => void;
  saveSelectedAsCustomTemplate: (name: string) => void;
}

const DesignContext = createContext<DesignContextType | undefined>(undefined);

const initialDesignState: DesignState = {
  components: [],
  selectedComponentId: null,
  nextId: 1,
  customComponentTemplates: [],
};

const CUSTOM_TEMPLATES_COLLECTION = 'customComponentTemplates';

const deepClone = <T>(obj: T): T => {
  return JSON.parse(JSON.stringify(obj));
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
              firestoreId: docSnap.id, // Use docSnap.id as firestoreId
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

  const addComponent = useCallback((
    type: ComponentType | string,
    parentId: string | null = null,
    dropPosition?: { x: number; y: number }
  ) => {
    const positionProps = dropPosition
      ? (parentId && getComponentById(parentId) 
          ? { x: dropPosition.x - (getComponentById(parentId)?.properties.x || 0), y: dropPosition.y - (getComponentById(parentId)?.properties.y || 0) }
          : { x: dropPosition.x, y: dropPosition.y }
        )
      : { x: 50, y: 50 };

    if (isCustomComponentType(type)) {
      const templateId = type;
      
      setDesignState(prev => {
        const template = prev.customComponentTemplates.find(t => t.templateId === templateId);
        if (!template) {
          console.error(`Custom template ${templateId} not found.`);
          return prev;
        }

        let currentNextId = prev.nextId;
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
          
          if (templateComp.id === template.rootComponentId) {
            newInstanceComp.name = `${template.name} Instance`; 
            finalInstanceRootId = instanceCompId;
            newInstanceComp.properties.x = positionProps.x;
            newInstanceComp.properties.y = positionProps.y;
            newInstanceComp.parentId = parentId; // Set the parentId passed to addComponent
          } else {
            delete newInstanceComp.properties.x;
            delete newInstanceComp.properties.y;
            if (templateComp.parentId && finalIdMap[templateComp.parentId]) {
              newInstanceComp.parentId = finalIdMap[templateComp.parentId];
            } else {
              // This component was a root in the template but not *the* root, or its parent is missing
              // It should not have a parentId linking outside this instance unless it's the main root
               console.warn(`Orphaned or mis-parented component in custom template instantiation: ${templateComp.id}. Its parent was ${templateComp.parentId}`);
               newInstanceComp.parentId = null; // Or handle as error
            }
          }

          if (newInstanceComp.properties.children && Array.isArray(newInstanceComp.properties.children)) {
            newInstanceComp.properties.children = newInstanceComp.properties.children
              .map(childIdFromTemplate => finalIdMap[childIdFromTemplate]) 
              .filter(Boolean); 
          }
          finalNewComponentsBatch.push(newInstanceComp);
        });

        let updatedComponents = [...prev.components, ...finalNewComponentsBatch];

        if (parentId && finalInstanceRootId) {
          const parentCompIndex = updatedComponents.findIndex(c => c.id === parentId);
          if (parentCompIndex !== -1) {
            const currentParent = updatedComponents[parentCompIndex];
            if (isContainerType(currentParent.type, prev.customComponentTemplates)) {
              const existingChildren = currentParent.properties.children || [];
              if (!existingChildren.includes(finalInstanceRootId)) {
                 updatedComponents[parentCompIndex] = {
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
        return {
          ...prev,
          components: updatedComponents,
          selectedComponentId: finalInstanceRootId,
          nextId: currentNextId,
        };
      });

    } else { 
      setDesignState(prev => {
        const newId = `comp-${prev.nextId}`;
        const newComponent: DesignComponent = {
          id: newId,
          type: type as ComponentType,
          name: `${type} ${prev.nextId}`,
          properties: {
            ...getDefaultProperties(type as ComponentType),
            ...positionProps,
          },
          parentId,
        };

        let updatedComponentsList = [...prev.components, newComponent];
        if (parentId) {
          const parentCompIndex = updatedComponentsList.findIndex(c => c.id === parentId);
          if (parentCompIndex !== -1) {
            const currentParent = updatedComponentsList[parentCompIndex];
            if (isContainerType(currentParent.type, prev.customComponentTemplates)) {
              const existingChildren = currentParent.properties.children || [];
              if (!existingChildren.includes(newId)) {
                const updatedParentComp = {
                  ...currentParent,
                  properties: {
                    ...currentParent.properties,
                    children: [...existingChildren, newId],
                  },
                };
                // Ensure correct replacement and addition
                updatedComponentsList = updatedComponentsList.filter(c => c.id !== currentParent.id && c.id !== newId);
                updatedComponentsList.push(updatedParentComp, newComponent);
              }
            }
          }
        }
        // Filter duplicates just in case, though the logic above should prevent it.
        const finalUniqueComponents = updatedComponentsList.filter((comp, index, self) => index === self.findIndex(t => t.id === comp.id));
        
        return {
          ...prev,
          components: finalUniqueComponents,
          selectedComponentId: newId,
          nextId: prev.nextId + 1,
        };
      });
    }
  }, [getComponentById]); // Removed customComponentTemplates as it's accessed via `prev` in setDesignState


  const saveSelectedAsCustomTemplate = useCallback(async (name: string) => {
    if (!designState.selectedComponentId) return;
    const selectedComponent = getComponentById(designState.selectedComponentId);
    if (!selectedComponent) return;

    const templateComponentTree: DesignComponent[] = [];
    const idMap: Record<string, string> = {};
    let nextTemplateInternalId = 1;

    const generateTemplateInternalId = (typeStr: string) => `tmpl-${typeStr.toLowerCase().replace(/\s+/g, '-')}-${nextTemplateInternalId++}`;

    const cloneAndCollectForTemplate = (originalCompId: string, newTemplateParentId: string | null) => {
      const originalComp = getComponentById(originalCompId); // Use context's getComponentById
      if (!originalComp) return;

      const templateLocalId = generateTemplateInternalId(originalComp.type);
      idMap[originalCompId] = templateLocalId;

      const clonedComp = deepClone(originalComp);
      clonedComp.id = templateLocalId;
      clonedComp.parentId = newTemplateParentId;
      
      // These are instance-specific, remove for template
      delete clonedComp.properties.x;
      delete clonedComp.properties.y;

      if (clonedComp.properties.children && Array.isArray(clonedComp.properties.children)) {
        const originalChildIds = [...clonedComp.properties.children]; // Iterate over a copy
        clonedComp.properties.children = []; // Reset for template

        originalChildIds.forEach(childId => {
          cloneAndCollectForTemplate(childId, templateLocalId); // Pass current clonedComp's ID as parent
          if (idMap[childId]) { // Ensure child was processed and mapped
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
        // Add to local state even if DB fails or is not present
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
       // Fallback to local state if Firestore save fails
       setDesignState(prev => ({
        ...prev,
        customComponentTemplates: [...prev.customComponentTemplates, { ...newTemplate, firestoreId: `local-error-${newTemplate.templateId}` }],
      }));
    }
  }, [designState.selectedComponentId, getComponentById]); // Removed designState.customComponentTemplates


  const deleteComponent = useCallback((id: string) => {
    setDesignState(prev => {
      const componentToDelete = prev.components.find(c => c.id === id);
      if (!componentToDelete) return prev;

      let idsToDelete = [id]; // Default to deleting just the clicked component

      // If it's a container or a custom component, find all its children to delete them too
      if (isContainerType(componentToDelete.type, prev.customComponentTemplates) || isCustomComponentType(componentToDelete.type)) {
         const queue = [id]; 
         const visited = new Set<string>();
         const allComponentsToDeleteThisRun = new Set<string>(); 

         while(queue.length > 0) {
            const currentId = queue.shift()!;
            if (visited.has(currentId)) continue;
            visited.add(currentId);
            allComponentsToDeleteThisRun.add(currentId);

            prev.components.forEach(comp => {
                if (comp.parentId === currentId && !visited.has(comp.id)) {
                    queue.push(comp.id);
                }
            });
         }
         idsToDelete = Array.from(allComponentsToDeleteThisRun); 
      }

      let components = prev.components.filter(comp => !idsToDelete.includes(comp.id));

      // If the deleted component had a parent, remove it from the parent's children array
      if (componentToDelete.parentId) {
        components = components.map(comp => {
          if (comp.id === componentToDelete.parentId && Array.isArray(comp.properties.children)) { // Added Array.isArray check
            return {
              ...comp,
              properties: {
                ...comp.properties,
                children: comp.properties.children.filter(childId => !idsToDelete.includes(childId))
              }
            };
          }
          return comp;
        });
      }

      return {
        ...prev,
        components,
        selectedComponentId: idsToDelete.includes(prev.selectedComponentId || "") ? null : prev.selectedComponentId,
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
            newComp.name = updates.name;
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
        (comp.id === id && !comp.parentId) ? { ...comp, properties: { ...comp.properties, x: position.x, y: position.y } } : comp
      ),
    }));
  }, []);

  const clearDesign = useCallback(() => {
    setDesignState(prev => ({...initialDesignState, nextId: prev.nextId, customComponentTemplates: prev.customComponentTemplates}));
  }, []);

  const setDesign = useCallback((newDesign: DesignState) => {
    setDesignState(newDesign);
  }, []);

  const moveComponent = useCallback((draggedId: string, targetParentId: string | null, newPosition?: { x: number, y: number}) => {
    setDesignState(prev => {
        let currentComponents = [...prev.components];
        const draggedComponentIndex = currentComponents.findIndex(c => c.id === draggedId);

        if (draggedComponentIndex === -1) return prev;

        let draggedComponent = {...currentComponents[draggedComponentIndex]};
        const oldParentId = draggedComponent.parentId;

        // Prevent dropping a component onto itself or its children
        if (targetParentId === draggedId) return prev;
        let tempParentCheck = targetParentId;
        while(tempParentCheck) {
            if (tempParentCheck === draggedId) return prev; 
            const parentComponent = currentComponents.find(c => c.id === tempParentCheck);
            tempParentCheck = parentComponent ? parentComponent.parentId : null;
        }

        draggedComponent.parentId = targetParentId;
        if (targetParentId) { 
            // Position is relative to parent, clear absolute x/y
            delete draggedComponent.properties.x;
            delete draggedComponent.properties.y;
        } else if (newPosition) { 
             draggedComponent.properties.x = newPosition.x;
             draggedComponent.properties.y = newPosition.y;
        } else if (!targetParentId && (!draggedComponent.properties.hasOwnProperty('x') || !draggedComponent.properties.hasOwnProperty('y'))){
            // Dropped on canvas without explicit position, ensure it has one
            draggedComponent.properties.x = 50; 
            draggedComponent.properties.y = 50;
        }

        currentComponents[draggedComponentIndex] = draggedComponent;

        // Remove from old parent's children list
        if (oldParentId && oldParentId !== targetParentId) {
            const oldParentIndex = currentComponents.findIndex(c => c.id === oldParentId);
            if (oldParentIndex !== -1) {
                const oldParent = {...currentComponents[oldParentIndex]};
                if (Array.isArray(oldParent.properties.children)) { // Check if children is an array
                    oldParent.properties.children = oldParent.properties.children.filter(childId => childId !== draggedId);
                    currentComponents[oldParentIndex] = oldParent;
                }
            }
        }

        // Add to new parent's children list
        if (targetParentId) {
            const newParentIndex = currentComponents.findIndex(c => c.id === targetParentId);
            if (newParentIndex !== -1) {
                 const newParent = {...currentComponents[newParentIndex]};
                 if (isContainerType(newParent.type, prev.customComponentTemplates)) { // Check if new parent is a container
                    let existingChildren = newParent.properties.children || [];
                    if (!Array.isArray(existingChildren)) existingChildren = []; // Ensure it's an array
                    if (!existingChildren.includes(draggedId)) {
                         newParent.properties.children = [...existingChildren, draggedId];
                    }
                    currentComponents[newParentIndex] = newParent;
                 }
            }
        }
        return { ...prev, components: currentComponents };
    });
  }, []);


  const defaultContextValue: DesignContextType = {
    ...initialDesignState,
    addComponent: () => {},
    deleteComponent: () => {},
    selectComponent: () => {},
    updateComponent: () => {},
    updateComponentPosition: () => {},
    getComponentById: () => undefined,
    clearDesign: () => {},
    setDesign: () => {},
    moveComponent: () => {},
    saveSelectedAsCustomTemplate: () => {},
  };

  if (!isClient || isLoadingTemplates) {
    // Provide a default/loading state for SSR or while templates are loading
    // This ensures `useDesign` doesn't throw an error immediately
    // You might want to show a loading indicator in your UI based on `isLoadingTemplates`
    return (
      <DesignContext.Provider value={{
        ...defaultContextValue, 
        components: designState.components, 
        selectedComponentId: designState.selectedComponentId,
        customComponentTemplates: designState.customComponentTemplates, 
        getComponentById: (id: string) => designState.components.find(comp => comp.id === id) || defaultContextValue.getComponentById(id),
        updateComponent: updateComponent, // allow updates even while loading if necessary
      }}>
        {children}
      </DesignContext.Provider>
    );
  }

  return (
    <DesignContext.Provider value={{
      ...designState,
      addComponent,
      deleteComponent,
      selectComponent,
      updateComponent,
      updateComponentPosition,
      getComponentById,
      clearDesign,
      setDesign,
      moveComponent,
      saveSelectedAsCustomTemplate
    }}>
      {children}
    </DesignContext.Provider>
  );
};

export const useDesign = (): DesignContextType => {
  const context = useContext(DesignContext);
  if (context === undefined) {
    // This can happen during SSR or if provider is not set up, provide a safe fallback or throw
    // console.warn('useDesign context is undefined, returning initial state. Ensure DesignProvider wraps your component.');
    // return initialDesignState as unknown as DesignContextType; // Or a more specific default
    throw new Error('useDesign must be used within a DesignProvider');
  }
  return context;
};

