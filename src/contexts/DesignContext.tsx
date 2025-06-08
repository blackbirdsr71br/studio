
'use client';

import type { ReactNode} from 'react';
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { DesignComponent, DesignState, ComponentType, BaseComponentProps, CustomComponentTemplate } from '@/types/compose-spec';
import { getDefaultProperties, CUSTOM_COMPONENT_TYPE_PREFIX, isCustomComponentType } from '@/types/compose-spec';

interface DesignContextType extends DesignState {
  addComponent: (type: ComponentType | string, parentId?: string | null, dropPosition?: { x: number; y: number }) => string | string[]; // Can return multiple IDs for custom
  deleteComponent: (id: string) => void;
  selectComponent: (id: string | null) => void;
  updateComponentProperties: (id: string, newProperties: Partial<BaseComponentProps>) => void;
  updateComponentPosition: (id: string, position: { x: number; y: number }) => void; 
  getComponentById: (id: string) => DesignComponent | undefined;
  clearDesign: () => void;
  setDesign: (newDesign: DesignState) => void; 
  moveComponent: (draggedId: string, targetId: string | null) => void; 
  saveSelectedAsCustomTemplate: (name: string) => void;
}

const DesignContext = createContext<DesignContextType | undefined>(undefined);

const initialDesignState: DesignState = {
  components: [],
  selectedComponentId: null,
  nextId: 1,
  customComponentTemplates: [],
};

// Helper function for deep cloning
const deepClone = <T>(obj: T): T => {
  return JSON.parse(JSON.stringify(obj));
};


export const DesignProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [designState, setDesignState] = useState<DesignState>(initialDesignState);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
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
        const newInstanceCompId = generateNewId(`inst-${templateComp.type}-`);
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

        if (originalTemplateComp?.parentId) {
          newInstanceComp.parentId = idMap[originalTemplateComp.parentId] || null; // Ensure parentId is from the new batch
        } else {
          newInstanceComp.parentId = parentId; // Root of custom component instance gets the drop target parentId
        }
        
        if (newInstanceComp.properties.children && Array.isArray(newInstanceComp.properties.children)) {
          newInstanceComp.properties.children = newInstanceComp.properties.children
            .map(childId => idMap[childId])
            .filter(Boolean); // Map to new child IDs
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
                if (parentComp.type === 'Column' || parentComp.type === 'Row' || parentComp.type === 'Card' || parentComp.type === 'Box') {
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


  const saveSelectedAsCustomTemplate = useCallback((name: string) => {
    if (!designState.selectedComponentId) return;
    const selectedComponent = getComponentById(designState.selectedComponentId);
    if (!selectedComponent) return;

    const templateComponentTree: DesignComponent[] = [];
    const idMap: Record<string, string> = {}; // Maps original ID to template-local ID
    let nextTemplateInternalId = 1;

    const generateTemplateInternalId = (type: string) => `tmpl-${type}-${nextTemplateInternalId++}`;
    
    // Helper to recursively clone and collect components for the template
    const cloneAndCollectForTemplate = (originalCompId: string, newTemplateParentId: string | null) => {
      const originalComp = getComponentById(originalCompId);
      if (!originalComp) return;

      const templateLocalId = generateTemplateInternalId(originalComp.type);
      idMap[originalCompId] = templateLocalId;

      const clonedComp = deepClone(originalComp);
      clonedComp.id = templateLocalId;
      clonedComp.parentId = newTemplateParentId;
      
      // Clear runtime positions for template, they will be set on instantiation
      delete clonedComp.properties.x;
      delete clonedComp.properties.y;

      // Recursively process children, map their IDs
      if (clonedComp.properties.children && Array.isArray(clonedComp.properties.children)) {
        const originalChildIds = [...clonedComp.properties.children]; // Copy before modifying
        clonedComp.properties.children = []; // Reset, will be repopulated with template-local IDs

        originalChildIds.forEach(childId => {
          cloneAndCollectForTemplate(childId, templateLocalId); // Pass new parent's template-local ID
           // Add mapped child ID to current cloned component's children
          if (idMap[childId]) {
            clonedComp.properties.children!.push(idMap[childId]);
          }
        });
      }
      templateComponentTree.push(clonedComp);
    };
    
    cloneAndCollectForTemplate(selectedComponent.id, null); // Start with selected component as root of template

    const templateRootComponent = templateComponentTree.find(c => idMap[selectedComponent.id] === c.id);
    if (!templateRootComponent) {
        console.error("Failed to identify template root component.");
        return;
    }

    const newTemplate: CustomComponentTemplate = {
      templateId: `${CUSTOM_COMPONENT_TYPE_PREFIX}${name.replace(/\s+/g, '_')}-${Date.now()}`,
      name: name,
      rootComponentId: templateRootComponent.id, // ID of the root WITHIN the templateComponentTree
      componentTree: templateComponentTree,
    };

    setDesignState(prev => ({
      ...prev,
      customComponentTemplates: [...prev.customComponentTemplates, newTemplate],
    }));
  }, [designState.selectedComponentId, getComponentById]);


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
        comp.id === id ? { ...comp, properties: { ...comp.properties, x: position.x, y: position.y } } : comp
      ),
    }));
  }, []);

  const clearDesign = useCallback(() => {
    setDesignState(prev => ({...initialDesignState, nextId: prev.nextId})); // Keep nextId to avoid ID collision if design is loaded later
  }, []);

  const setDesign = useCallback((newDesign: DesignState) => {
    setDesignState(newDesign);
  }, []);

  const moveComponent = useCallback((draggedId: string, targetParentId: string | null) => {
    setDesignState(prev => {
        const currentComponents = [...prev.components];
        const draggedComponent = currentComponents.find(c => c.id === draggedId);
        if (!draggedComponent) return prev;

        // Remove from old parent's children list
        if (draggedComponent.parentId) {
            const oldParentIndex = currentComponents.findIndex(c => c.id === draggedComponent.parentId);
            if (oldParentIndex !== -1) {
                const oldParent = {...currentComponents[oldParentIndex]};
                if (oldParent.properties.children) {
                    oldParent.properties.children = oldParent.properties.children.filter(childId => childId !== draggedId);
                    currentComponents[oldParentIndex] = oldParent;
                }
            }
        }

        // Update dragged component's parentId
        const draggedComponentIndex = currentComponents.findIndex(c => c.id === draggedId);
        currentComponents[draggedComponentIndex] = { ...draggedComponent, parentId: targetParentId };


        // Add to new parent's children list
        if (targetParentId) {
            const newParentIndex = currentComponents.findIndex(c => c.id === targetParentId);
            if (newParentIndex !== -1) {
                 const newParent = {...currentComponents[newParentIndex]};
                 if (newParent.type === 'Column' || newParent.type === 'Row' || newParent.type === 'Card' || newParent.type === 'Box' || newParent.type.startsWith('Lazy')) {
                    newParent.properties.children = [...(newParent.properties.children || []), draggedId];
                    currentComponents[newParentIndex] = newParent;
                 } else {
                     currentComponents[draggedComponentIndex] = { ...draggedComponent, parentId: draggedComponent.parentId };
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

  if (!isClient) {
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


    