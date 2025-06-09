
'use client';

import type { ReactNode} from 'react';
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { DesignComponent, DesignState, ComponentType, BaseComponentProps, CustomComponentTemplate } from '@/types/compose-spec';
import { getDefaultProperties, CUSTOM_COMPONENT_TYPE_PREFIX, isCustomComponentType, isContainerType } from '@/types/compose-spec';
import { db } from '@/lib/firebase';
import { collection, doc, setDoc, getDocs } from "firebase/firestore";

interface DesignContextType extends DesignState {
  addComponent: (type: ComponentType | string, parentId?: string | null, dropPosition?: { x: number; y: number }) => void;
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
    type: ComponentType | string,
    parentId: string | null = null,
    dropPosition?: { x: number; y: number }
  ) => {
    const positionProps = dropPosition
      ? (parentId && getComponentById(parentId) // Check if parent exists for relative positioning
          ? { x: dropPosition.x - (getComponentById(parentId)?.properties.x || 0), y: dropPosition.y - (getComponentById(parentId)?.properties.y || 0) }
          : { x: dropPosition.x, y: dropPosition.y }
        )
      : { x: 50, y: 50 };

    if (isCustomComponentType(type)) {
      const templateId = type;
      const template = designState.customComponentTemplates.find(t => t.templateId === templateId);
      if (!template) {
        console.error(`Custom template ${templateId} not found.`);
        return;
      }

      setDesignState(prev => {
        let currentNextId = prev.nextId;
        const finalIdMap: Record<string, string> = {}; // Maps template-local IDs to new global instance IDs
        const finalNewComponentsBatch: DesignComponent[] = [];
        let finalInstanceRootId = "";

        template.componentTree.forEach(templateComp => {
          const instanceCompId = `inst-${templateComp.type.toLowerCase().replace(/\s+/g, '-')}-${currentNextId++}`;
          finalIdMap[templateComp.id] = instanceCompId;

          const newInstanceComp = deepClone(templateComp);
          newInstanceComp.id = instanceCompId;
          newInstanceComp.name = `${newInstanceComp.name} (instance)`;

          if (templateComp.id === template.rootComponentId) {
            finalInstanceRootId = instanceCompId;
            newInstanceComp.properties.x = positionProps.x;
            newInstanceComp.properties.y = positionProps.y;
            newInstanceComp.parentId = parentId; // Set parentId for the root of instance
          } else {
            delete newInstanceComp.properties.x;
            delete newInstanceComp.properties.y;
            if (templateComp.parentId && finalIdMap[templateComp.parentId]) {
              newInstanceComp.parentId = finalIdMap[templateComp.parentId];
            } else {
              newInstanceComp.parentId = null; // Should be parented within the instance
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
          const parentIndex = updatedComponents.findIndex(c => c.id === parentId);
          if (parentIndex !== -1) {
            const currentParent = updatedComponents[parentIndex];
            if (isContainerType(currentParent.type, prev.customComponentTemplates)) {
              const existingChildren = currentParent.properties.children || [];
              if (!existingChildren.includes(finalInstanceRootId)) {
                updatedComponents[parentIndex] = {
                  ...currentParent,
                  properties: {
                    ...currentParent.properties,
                    children: [...existingChildren, finalInstanceRootId]
                  }
                };
              } else {
                console.warn(`Attempted to add duplicate child ID ${finalInstanceRootId} (custom instance) to parent ${parentId}`);
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

    } else { // Adding a base component
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
                updatedComponentsList = [
                  ...updatedComponentsList.slice(0, parentCompIndex),
                  updatedParentComp,
                  ...updatedComponentsList.slice(parentCompIndex + 1)
                ];
              } else {
                 console.warn(`Attempted to add duplicate child ID ${newId} to parent ${parentId}`);
              }
            }
          }
        }
        return {
          ...prev,
          components: updatedComponentsList,
          selectedComponentId: newId,
          nextId: prev.nextId + 1,
        };
      });
    }
  }, [designState.customComponentTemplates, designState.nextId, getComponentById]);


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
        console.error("Failed to identify template root component.");
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
        console.error("Firestore not initialized. Cannot save template.");
        setDesignState(prev => ({
          ...prev,
          customComponentTemplates: [...prev.customComponentTemplates, newTemplate as CustomComponentTemplate],
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
        customComponentTemplates: [...prev.customComponentTemplates, newTemplate as CustomComponentTemplate],
      }));
    }
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
            if (isContainerType(comp.type, prev.customComponentTemplates)) {
              findChildrenRecursive(comp.id);
            }
          }
        });
      };

      if (isContainerType(componentToDelete.type, prev.customComponentTemplates)) {
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

        if (targetParentId !== oldParentId) {
            draggedComponent.parentId = targetParentId;
            if (targetParentId) {
                delete draggedComponent.properties.x;
                delete draggedComponent.properties.y;
            }
        }

        if (!targetParentId && newPosition) {
            draggedComponent.properties.x = newPosition.x;
            draggedComponent.properties.y = newPosition.y;
        }

        currentComponents[draggedComponentIndex] = draggedComponent;

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

        if (targetParentId) {
            const newParentIndex = currentComponents.findIndex(c => c.id === targetParentId);
            if (newParentIndex !== -1) {
                 const newParent = {...currentComponents[newParentIndex]};
                 if (isContainerType(newParent.type, prev.customComponentTemplates)) {
                    const existingChildren = newParent.properties.children || [];
                    if (!existingChildren.includes(draggedId)) {
                         newParent.properties.children = [...existingChildren, draggedId];
                    } else {
                        console.warn(`moveComponent: Attempted to add duplicate child ID ${draggedId} to parent ${targetParentId}`);
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
    updateComponentProperties: () => {},
    updateComponentPosition: () => {},
    getComponentById: () => undefined,
    clearDesign: () => {},
    setDesign: () => {},
    moveComponent: () => {},
    saveSelectedAsCustomTemplate: () => {},
  };

  if (!isClient || isLoadingTemplates) {
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

