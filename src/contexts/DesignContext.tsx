'use client';

import type { ReactNode} from 'react';
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { DesignComponent, DesignState, ComponentType, BaseComponentProps } from '@/types/compose-spec';
import { getDefaultProperties } from '@/types/compose-spec';

interface DesignContextType extends DesignState {
  addComponent: (type: ComponentType, parentId?: string | null, dropPosition?: { x: number; y: number }) => string;
  deleteComponent: (id: string) => void;
  selectComponent: (id: string | null) => void;
  updateComponentProperties: (id: string, newProperties: Partial<BaseComponentProps>) => void;
  updateComponentPosition: (id: string, position: { x: number; y: number }) => void; // For direct manipulation on canvas
  getComponentById: (id: string) => DesignComponent | undefined;
  clearDesign: () => void;
  setDesign: (newDesign: DesignState) => void; // For loading designs
  moveComponent: (draggedId: string, targetId: string | null) => void; // For re-parenting or re-ordering
}

const DesignContext = createContext<DesignContextType | undefined>(undefined);

const initialDesignState: DesignState = {
  components: [],
  selectedComponentId: null,
  nextId: 1,
};

export const DesignProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [designState, setDesignState] = useState<DesignState>(initialDesignState);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);


  const getComponentById = useCallback(
    (id: string) => designState.components.find(comp => comp.id === id),
    [designState.components]
  );
  
  const addComponent = useCallback((type: ComponentType, parentId: string | null = null, dropPosition?: { x: number; y: number }) => {
    const newId = `comp-${designState.nextId}`;
    
    let positionProps = {};
    if (dropPosition) {
      if (parentId) {
        // Position relative to parent for simplicity, real layout is complex
        const parentComp = getComponentById(parentId);
        positionProps = { 
          x: dropPosition.x - (parentComp?.properties.x || 0), 
          y: dropPosition.y - (parentComp?.properties.y || 0) 
        };
      } else {
        positionProps = { x: dropPosition.x, y: dropPosition.y };
      }
    } else {
       positionProps = { x: 50, y: 50 }; // Default if no dropPosition
    }

    const newComponent: DesignComponent = {
      id: newId,
      type,
      name: `${type} ${designState.nextId}`,
      properties: {
        ...getDefaultProperties(type),
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
          if (parent.type === 'Column' || parent.type === 'Row') {
            parent.properties.children = [...(parent.properties.children || []), newId];
            updatedComponents[parentIndex] = {...parent};
          }
        }
      }
      return {
        ...prev,
        components: updatedComponents,
        nextId: prev.nextId + 1,
        selectedComponentId: newId,
      };
    });
    return newId;
  }, [designState.nextId, getComponentById]);

  const deleteComponent = useCallback((id: string) => {
    setDesignState(prev => {
      const componentToDelete = prev.components.find(c => c.id === id);
      if (!componentToDelete) return prev;
  
      let idsToDelete = [id];
      // Recursively find children if it's a container
      const findChildrenRecursive = (currentParentId: string) => {
        prev.components.forEach(comp => {
          if (comp.parentId === currentParentId) {
            idsToDelete.push(comp.id);
            if (comp.type === 'Column' || comp.type === 'Row') {
              findChildrenRecursive(comp.id);
            }
          }
        });
      };
  
      if (componentToDelete.type === 'Column' || componentToDelete.type === 'Row') {
        findChildrenRecursive(id);
      }
  
      // Filter out deleted components
      let components = prev.components.filter(comp => !idsToDelete.includes(comp.id));
  
      // Remove reference from parent if any
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
    setDesignState(initialDesignState);
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
                 if (newParent.type === 'Column' || newParent.type === 'Row') {
                    newParent.properties.children = [...(newParent.properties.children || []), draggedId];
                    currentComponents[newParentIndex] = newParent;
                 } else {
                    // Cannot drop into non-container, revert parentId change
                     currentComponents[draggedComponentIndex] = { ...draggedComponent, parentId: draggedComponent.parentId };
                 }
            }
        }
        
        return { ...prev, components: currentComponents };
    });
}, []);


  if (!isClient) {
     // Render minimal or null UI on server to avoid hydration mismatches
     // if state is used in rendering.
     // Or provide a default, non-interactive state.
    return (
      <DesignContext.Provider value={{...initialDesignState, addComponent: () =>"", deleteComponent: ()=>{}, selectComponent: ()=>{}, updateComponentProperties: ()=>{}, updateComponentPosition: ()=>{}, getComponentById: ()=>undefined, clearDesign: ()=>{}, setDesign: ()=>{}, moveComponent: ()=>{}}}>
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
      moveComponent
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
