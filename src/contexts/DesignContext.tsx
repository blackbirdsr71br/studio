
'use client';

import type { ReactNode} from 'react';
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { DesignComponent, DesignState, ComponentType, BaseComponentProps, CustomComponentTemplate } from '@/types/compose-spec';
import { getDefaultProperties, CUSTOM_COMPONENT_TYPE_PREFIX, isCustomComponentType, isContainerType } from '@/types/compose-spec';
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

  const addComponent = useCallback((
    type: ComponentType | string, // This is the type the user *dragged*
    parentId: string | null = null,
    dropPosition?: { x: number; y: number }
  ) => {
    setDesignState(prev => {
      let currentNextId = prev.nextId;
      let updatedComponentsList = [...prev.components];
      let finalSelectedId = '';

      // Special handling for the very first component added to an empty root canvas
      if (!parentId && prev.components.filter(c => !c.parentId).length === 0) {
        const lazyColumnId = `comp-${currentNextId++}`;
        const lazyColumnComponent: DesignComponent = {
          id: lazyColumnId,
          type: 'LazyColumn',
          name: `Root LazyColumn ${lazyColumnId.split('-')[1]}`,
          properties: {
            ...getDefaultProperties('LazyColumn'),
            x: 0,
            y: 0,
            width: 'match_parent',
            height: 'match_parent',
            padding: 0, // Fill entire space
            backgroundColor: 'transparent', // Or a very subtle debug color
            children: [],
          },
          parentId: null,
        };
        updatedComponentsList.push(lazyColumnComponent);
        finalSelectedId = lazyColumnId; // Initially select the LazyColumn

        // Now, add the component the user *actually* dragged as a child of this LazyColumn
        // unless the user was trying to drag a LazyColumn itself.
        if (type !== 'LazyColumn' || (type === 'LazyColumn' && prev.components.length > 0) ) { // Ensures if first item IS a LC, it's not nested in another LC
            const userDraggedComponentId = `comp-${currentNextId++}`;
            const { x, y, ...defaultPropsForDragged } = getDefaultProperties(type as ComponentType);
            const userDraggedComponent: DesignComponent = {
            id: userDraggedComponentId,
            type: type as ComponentType,
            name: `${getComponentDisplayName(type as ComponentType)} ${userDraggedComponentId.split('-')[1]}`,
            properties: defaultPropsForDragged, // x, y are not needed for children of LazyColumn
            parentId: lazyColumnId,
            };
            (lazyColumnComponent.properties.children as string[]).push(userDraggedComponentId);
            updatedComponentsList.push(userDraggedComponent);
            finalSelectedId = userDraggedComponentId; // Select the component the user intended to add
        }
         return {
          ...prev,
          components: updatedComponentsList,
          selectedComponentId: finalSelectedId,
          nextId: currentNextId,
        };
      }
      // End special handling for first component

      // Standard component addition logic
      const positionProps = dropPosition
        ? (parentId && getComponentById(parentId)
            ? { x: dropPosition.x - (getComponentById(parentId)?.properties.x || 0), y: dropPosition.y - (getComponentById(parentId)?.properties.y || 0) }
            : { x: dropPosition.x, y: dropPosition.y }
          )
        : { x: 50, y: 50 };

      if (isCustomComponentType(type)) {
        const templateId = type;
        const template = prev.customComponentTemplates.find(t => t.templateId === templateId);
        if (!template) {
          console.error(`Custom template ${templateId} not found.`);
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
          
          if (templateComp.id === template.rootComponentId) {
            newInstanceComp.name = `${template.name} Instance`;
            finalInstanceRootId = instanceCompId;
            newInstanceComp.properties.x = positionProps.x;
            newInstanceComp.properties.y = positionProps.y;
            newInstanceComp.parentId = parentId; 
          } else {
            delete newInstanceComp.properties.x;
            delete newInstanceComp.properties.y;
            if (templateComp.parentId && finalIdMap[templateComp.parentId]) {
              newInstanceComp.parentId = finalIdMap[templateComp.parentId];
            } else {
               console.warn(`Orphaned component in custom template instantiation: ${templateComp.id}.`);
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

        if (parentId && finalInstanceRootId) {
          const parentCompIndex = updatedComponentsList.findIndex(c => c.id === parentId);
          if (parentCompIndex !== -1) {
            const currentParent = updatedComponentsList[parentCompIndex];
            if (isContainerType(currentParent.type, prev.customComponentTemplates)) {
              const existingChildren = currentParent.properties.children || [];
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
      } else { // Standard base component
        const newId = `comp-${currentNextId++}`;
        finalSelectedId = newId;
        const newComponent: DesignComponent = {
          id: newId,
          type: type as ComponentType,
          name: `${getComponentDisplayName(type as ComponentType)} ${newId.split('-')[1]}`,
          properties: {
            ...getDefaultProperties(type as ComponentType),
            ...(parentId ? {} : positionProps), // Only apply positionProps if it's a root component
          },
          parentId,
        };
        updatedComponentsList.push(newComponent);

        if (parentId) {
          const parentCompIndex = updatedComponentsList.findIndex(c => c.id === parentId);
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
                // Replace parent in the list
                updatedComponentsList = updatedComponentsList.map(c => c.id === parentId ? updatedParentComp : c);
              }
            }
          }
        }
      }
      // Filter duplicates just in case
      const finalUniqueComponents = updatedComponentsList.filter((comp, index, self) => index === self.findIndex(t => t.id === comp.id));
      
      return {
        ...prev,
        components: finalUniqueComponents,
        selectedComponentId: finalSelectedId,
        nextId: currentNextId,
      };
    });
  }, [getComponentById]);


  const saveSelectedAsCustomTemplate = useCallback(async (name: string) => {
    if (!designState.selectedComponentId) return;
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
  }, [designState.selectedComponentId, getComponentById]); 


  const deleteComponent = useCallback((id: string) => {
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

      return {
        ...prev,
        components,
        selectedComponentId: idsToDeleteArray.includes(prev.selectedComponentId || "") ? null : prev.selectedComponentId,
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

        if (targetParentId === draggedId) return prev;
        let tempParentCheck = targetParentId;
        while(tempParentCheck) {
            if (tempParentCheck === draggedId) return prev; 
            const parentComponent = currentComponents.find(c => c.id === tempParentCheck);
            tempParentCheck = parentComponent ? parentComponent.parentId : null;
        }

        draggedComponent.parentId = targetParentId;
        if (targetParentId) { 
            delete draggedComponent.properties.x;
            delete draggedComponent.properties.y;
        } else if (newPosition) { 
             draggedComponent.properties.x = newPosition.x;
             draggedComponent.properties.y = newPosition.y;
        } else if (!targetParentId && (!draggedComponent.properties.hasOwnProperty('x') || !draggedComponent.properties.hasOwnProperty('y'))){
            draggedComponent.properties.x = 50; 
            draggedComponent.properties.y = 50;
        }

        currentComponents[draggedComponentIndex] = draggedComponent;

        if (oldParentId && oldParentId !== targetParentId) {
            const oldParentIndex = currentComponents.findIndex(c => c.id === oldParentId);
            if (oldParentIndex !== -1) {
                const oldParent = {...currentComponents[oldParentIndex]};
                if (Array.isArray(oldParent.properties.children)) { 
                    oldParent.properties.children = oldParent.properties.children.filter(childId => childId !== draggedId);
                    currentComponents[oldParentIndex] = oldParent;
                }
            }
        }

        if (targetParentId) {
            const newParentIndex = currentComponents.findIndex(c => c.id === targetParentId);
            if (newParentIndex !== -1) {
                 const newParent = {...currentComponents[newParentIndex]};
                 if (isContainerType(newParent.type, prev.customComponentTemplates)) { 
                    let existingChildren = Array.isArray(newParent.properties.children) ? newParent.properties.children : [];
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
    return (
      <DesignContext.Provider value={{
        ...defaultContextValue, 
        components: designState.components, 
        selectedComponentId: designState.selectedComponentId,
        customComponentTemplates: designState.customComponentTemplates, 
        getComponentById: (id: string) => designState.components.find(comp => comp.id === id) || defaultContextValue.getComponentById(id),
        updateComponent: updateComponent, 
      }}>
        {children}
      </DesignContext.Provider>
    );
  }
  
  // Helper function to get component display name (similar to compose-spec but usable here)
  const getComponentDisplayName = (type: ComponentType | string): string => {
    if (type.startsWith(CUSTOM_COMPONENT_TYPE_PREFIX)) {
        const template = designState.customComponentTemplates.find(t => t.templateId === type);
        return template ? template.name : type.replace(CUSTOM_COMPONENT_TYPE_PREFIX, "");
    }
    switch (type as ComponentType) {
        case 'Text': return 'Text';
        case 'Button': return 'Button';
        case 'Image': return 'Image';
        case 'Column': return 'Column (Layout)';
        case 'Row': return 'Row (Layout)';
        case 'Box': return 'Box (Container)';
        case 'Card': return 'Card (Container)';
        case 'LazyColumn': return 'Lazy Column';
        case 'LazyRow': return 'Lazy Row';
        case 'LazyVerticalGrid': return 'Lazy Vertical Grid';
        case 'LazyHorizontalGrid': return 'Lazy Horizontal Grid';
        default: return 'Unknown';
    }
  };


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
    throw new Error('useDesign must be used within a DesignProvider');
  }
  return context;
};

    