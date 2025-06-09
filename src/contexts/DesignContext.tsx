
'use client';

import type { ReactNode} from 'react';
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { DesignComponent, DesignState, ComponentType, BaseComponentProps, CustomComponentTemplate } from '@/types/compose-spec';
import { getDefaultProperties, CUSTOM_COMPONENT_TYPE_PREFIX, isCustomComponentType } from '@/types/compose-spec';
import { db } from '@/lib/firebase'; // Import Firestore instance
import { collection, addDoc, getDocs, doc, setDoc } from "firebase/firestore"; 

interface DesignContextType extends DesignState {
  addComponent: (type: ComponentType | string, parentId?: string | null, dropPosition?: { x: number; y: number }) => string | string[]; // Can return multiple IDs for custom
  deleteComponent: (id: string) => void;
  selectComponent: (id: string | null) => void;
  updateComponentProperties: (id: string, newProperties: Partial<BaseComponentProps>) => void;
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

// Helper function for deep cloning
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
        querySnapshot.forEach((doc) => {
          // Ensure we don't accidentally try to use non-template data
          const data = doc.data();
          if (data.templateId && data.name && data.rootComponentId && data.componentTree) {
            templates.push({ 
              firestoreId: doc.id, 
              ...data 
            } as CustomComponentTemplate);
          } else {
            console.warn("Found document in customComponentTemplates that is not a valid template:", doc.id, data);
          }
        });
        setDesignState(prev => ({ ...prev, customComponentTemplates: templates }));
      } catch (error) {
        console.error("Error loading custom templates from Firestore:", error);
        // Keep existing local templates if loading fails, or clear them
        // setDesignState(prev => ({ ...prev, customComponentTemplates: [] })); 
      } finally {
        setIsLoadingTemplates(false);
      }
    };
    loadTemplates();
  }, []);


  const generateNewId = useCallback((prefix = 'comp-') => {
    const newId = `${prefix}${designState.nextId}`;
    setDesignState(prev => ({...prev, nextId: prev.nextId + 1}));
    return newId;
  }, [designState.nextId]);


  const getComponentById = useCallback(
    (id: string) => designState.components.find(comp => comp.id === id),
    [designState.components]
  );
  
  const addComponent = useCallback((
    type: ComponentType | string, // Can be ComponentType or a custom templateId string
    parentId: string | null = null, 
    dropPosition?: { x: number; y: number }
  ) => {
    
    const positionProps = dropPosition 
      ? (parentId 
          ? { x: dropPosition.x - (getComponentById(parentId)?.properties.x || 0), y: dropPosition.y - (getComponentById(parentId)?.properties.y || 0) } 
          : { x: dropPosition.x, y: dropPosition.y }
        ) 
      : { x: 50, y: 50 };

    if (isCustomComponentType(type)) {
      const templateId = type;
      const template = designState.customComponentTemplates.find(t => t.templateId === templateId);
      if (!template) {
        console.error(`Custom template ${templateId} not found.`);
        return ""; // Or handle error appropriately
      }

      const newComponentsBatch: DesignComponent[] = [];
      const idMap: Record<string, string> = {}; // Map template IDs to new instance IDs
      let instanceRootId = "";

      // First pass: clone components and generate new IDs
      template.componentTree.forEach(templateComp => {
        const newInstanceCompId = generateNewId(`inst-${templateComp.type.toLowerCase().replace(/\s+/g, '-')}-`);
        idMap[templateComp.id] = newInstanceCompId;
        
        const newInstanceComp = deepClone(templateComp);
        newInstanceComp.id = newInstanceCompId;
        newInstanceComp.name = `${newInstanceComp.name} (instance)`; // Distinguish instance

        if (templateComp.id === template.rootComponentId) {
          instanceRootId = newInstanceCompId;
          // Apply drop position to the root of the custom component instance
          newInstanceComp.properties.x = positionProps.x;
          newInstanceComp.properties.y = positionProps.y;
        }
        newComponentsBatch.push(newInstanceComp);
      });
      
      // Second pass: update parentIds and children arrays
      const finalNewComponents = newComponentsBatch.map(newInstanceComp => {
        const originalTemplateId = Object.keys(idMap).find(key => idMap[key] === newInstanceComp.id);
        const originalTemplateComp = template.componentTree.find(tc => tc.id === originalTemplateId);

        if (originalTemplateComp?.parentId && idMap[originalTemplateComp.parentId]) {
          newInstanceComp.parentId = idMap[originalTemplateComp.parentId];
        } else {
          // If original parentId is not in idMap, it means it's the root of the template instance
          // and should take the drop target parentId (if any)
          newInstanceComp.parentId = parentId; 
        }
        
        if (newInstanceComp.properties.children && Array.isArray(newInstanceComp.properties.children)) {
          newInstanceComp.properties.children = newInstanceComp.properties.children
            .map(childId => idMap[childId]) // childId here is from the template's original componentTree
            .filter(Boolean); // Map to new instance child IDs
        }
        return newInstanceComp;
      });


      setDesignState(prev => {
        let updatedComponents = [...prev.components, ...finalNewComponents];
        
        // If the custom component instance is dropped into a container
        if (parentId && instanceRootId) {
            const parentIndex = updatedComponents.findIndex(c => c.id === parentId);
            if (parentIndex !== -1) {
                const parentComp = updatedComponents[parentIndex];
                if (parentComp.type === 'Column' || parentComp.type === 'Row' || parentComp.type === 'Card' || parentComp.type === 'Box' || parentComp.type.startsWith('Lazy')) {
                    parentComp.properties.children = [...(parentComp.properties.children || []), instanceRootId];
                    updatedComponents[parentIndex] = {...parentComp};
                }
            }
        }
        return {
          ...prev,
          components: updatedComponents,
          selectedComponentId: instanceRootId,
        };
      });
      return finalNewComponents.map(c => c.id);


    } else {
      // Adding a base component
      const newId = generateNewId();
      const newComponent: DesignComponent = {
        id: newId,
        type: type as ComponentType,
        name: `${type} ${designState.nextId -1 }`, // designState.nextId already incremented by generateNewId
        properties: {
          ...getDefaultProperties(type as ComponentType),
          ...positionProps,
        },
        parentId,
      };

      setDesignState(prev => {
        let updatedComponents = [...prev.components, newComponent];
        if (parentId) {
          const parentIndex = updatedComponents.findIndex(c => c.id === parentId);
          if (parentIndex !== -1) {
            const parent = updatedComponents[parentIndex];
             if (parent.type === 'Column' || parent.type === 'Row' || parent.type === 'Card' || parent.type === 'Box' || parent.type.startsWith('Lazy')) {
              parent.properties.children = [...(parent.properties.children || []), newId];
              updatedComponents[parentIndex] = {...parent};
            }
          }
        }
        return {
          ...prev,
          components: updatedComponents,
          selectedComponentId: newId,
        };
      });
      return newId;
    }
  }, [designState.nextId, designState.customComponentTemplates, getComponentById, generateNewId]);


  const saveSelectedAsCustomTemplate = useCallback(async (name: string) => {
    if (!designState.selectedComponentId) return;
    const selectedComponent = getComponentById(designState.selectedComponentId);
    if (!selectedComponent) return;

    const templateComponentTree: DesignComponent[] = [];
    const idMap: Record<string, string> = {}; 
    let nextTemplateInternalId = 1;

    const generateTemplateInternalId = (type: string) => `tmpl-${type.toLowerCase().replace(/\s+/g, '-')}-${nextTemplateInternalId++}`;
    
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
        console.error("Failed to identify template root component.");
        return;
    }

    const newTemplate: Omit<CustomComponentTemplate, 'firestoreId'> = { // Omit firestoreId for creation
      templateId: `${CUSTOM_COMPONENT_TYPE_PREFIX}${name.replace(/\s+/g, '_')}-${Date.now()}`,
      name: name,
      rootComponentId: templateRootComponent.id, 
      componentTree: templateComponentTree,
    };

    try {
      if (!db) {
        console.error("Firestore not initialized. Cannot save template.");
        // Potentially save to local state only as a fallback or show an error
        setDesignState(prev => ({
          ...prev,
          customComponentTemplates: [...prev.customComponentTemplates, newTemplate as CustomComponentTemplate],
        }));
        return;
      }
      // Save to Firestore
      // We use templateId as the document ID for easier lookup if needed, requires setDoc
      const templateRef = doc(db, CUSTOM_TEMPLATES_COLLECTION, newTemplate.templateId);
      await setDoc(templateRef, newTemplate);

      // Add to local state with the firestoreId (which is same as templateId here)
      setDesignState(prev => ({
        ...prev,
        customComponentTemplates: [...prev.customComponentTemplates, { ...newTemplate, firestoreId: newTemplate.templateId }],
      }));
    } catch (error) {
      console.error("Error saving custom template to Firestore:", error);
      // Optionally: Add to local state anyway or show error to user
      // For now, we'll still add to local state if firestore fails, so user doesn't lose work locally
       setDesignState(prev => ({
        ...prev,
        customComponentTemplates: [...prev.customComponentTemplates, newTemplate as CustomComponentTemplate],
      }));
    }

  }, [designState.selectedComponentId, getComponentById, designState.nextId]); // designState.nextId dependency for generateNewId if it were used inside this callback directly for instances


  const deleteComponent = useCallback((id: string) => {
    setDesignState(prev => {
      const componentToDelete = prev.components.find(c => c.id === id);
      if (!componentToDelete) return prev;
  
      let idsToDelete = [id];
      const findChildrenRecursive = (currentParentId: string) => {
        prev.components.forEach(comp => {
          if (comp.parentId === currentParentId) {
            idsToDelete.push(comp.id);
            if (comp.type === 'Column' || comp.type === 'Row' || comp.type === 'Box' || comp.type === 'Card' || comp.type.startsWith('Lazy')) { // Check all container types
              findChildrenRecursive(comp.id);
            }
          }
        });
      };
  
      if (componentToDelete.type === 'Column' || componentToDelete.type === 'Row' || componentToDelete.type === 'Box' || componentToDelete.type === 'Card' || componentToDelete.type.startsWith('Lazy')) {
        findChildrenRecursive(id);
      }
  
      let components = prev.components.filter(comp => !idsToDelete.includes(comp.id));
  
      if (componentToDelete.parentId) {
        components = components.map(comp => {
          if (comp.id === componentToDelete.parentId && comp.properties.children) {
            return {
              ...comp,
              properties: {
                ...comp.properties,
                children: comp.properties.children.filter(childId => childId !== id)
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

  const updateComponentProperties = useCallback((id: string, newProperties: Partial<BaseComponentProps>) => {
    setDesignState(prev => ({
      ...prev,
      components: prev.components.map(comp =>
        comp.id === id ? { ...comp, properties: { ...comp.properties, ...newProperties } } : comp
      ),
    }));
  }, []);

  const updateComponentPosition = useCallback((id: string, position: { x: number; y: number }) => {
    setDesignState(prev => ({
      ...prev,
      components: prev.components.map(comp =>
        // Only update x,y if it's a root component (no parentId)
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

        // Store old parent ID for removal
        const oldParentId = draggedComponent.parentId;

        // If moving to a new parent, update parentId and clear absolute positioning props
        if (targetParentId !== oldParentId) {
            draggedComponent.parentId = targetParentId;
            if (targetParentId) { // Moving into a container
                delete draggedComponent.properties.x;
                delete draggedComponent.properties.y;
            }
        }
        
        // If moving to root and newPosition is provided, set it
        if (!targetParentId && newPosition) {
            draggedComponent.properties.x = newPosition.x;
            draggedComponent.properties.y = newPosition.y;
        }


        currentComponents[draggedComponentIndex] = draggedComponent;

        // Remove from old parent's children list (if it had one and it's different from new)
        if (oldParentId && oldParentId !== targetParentId) {
            const oldParentIndex = currentComponents.findIndex(c => c.id === oldParentId);
            if (oldParentIndex !== -1) {
                const oldParent = {...currentComponents[oldParentIndex]};
                if (oldParent.properties.children) {
                    oldParent.properties.children = oldParent.properties.children.filter(childId => childId !== draggedId);
                    currentComponents[oldParentIndex] = oldParent;
                }
            }
        }

        // Add to new parent's children list (if it's a container)
        if (targetParentId) {
            const newParentIndex = currentComponents.findIndex(c => c.id === targetParentId);
            if (newParentIndex !== -1) {
                 const newParent = {...currentComponents[newParentIndex]};
                 if (newParent.type === 'Column' || newParent.type === 'Row' || newParent.type === 'Card' || newParent.type === 'Box' || newParent.type.startsWith('Lazy')) {
                    const childrenSet = new Set(newParent.properties.children || []);
                    if (!childrenSet.has(draggedId)) { // Avoid duplicates
                         newParent.properties.children = [...(newParent.properties.children || []), draggedId];
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
    addComponent: () => "",
    deleteComponent: () => {},
    selectComponent: () => {},
    updateComponentProperties: () => {},
    updateComponentPosition: () => {},
    getComponentById: () => undefined,
    clearDesign: () => {},
    setDesign: () => {},
    moveComponent: () => {},
    saveSelectedAsCustomTemplate: () => {},
  };

  if (!isClient || isLoadingTemplates) { // Also show loading or default if templates are loading
    // Potentially return a loading state or a non-interactive context
    // For simplicity, returning default context while loading.
    // Consider a loading indicator in the UI if template loading is slow.
    return (
      <DesignContext.Provider value={defaultContextValue}>
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
      updateComponentProperties,
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
    throw new Error('useDesign must be used within a DesignProvider');
  }
  return context;
};
