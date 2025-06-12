
'use client';

import type { ReactNode} from 'react';
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { DesignComponent, DesignState, ComponentType, BaseComponentProps, CustomComponentTemplate } from '@/types/compose-spec';
import { getDefaultProperties, CUSTOM_COMPONENT_TYPE_PREFIX, isCustomComponentType, isContainerType, getComponentDisplayName, DEFAULT_ROOT_LAZY_COLUMN_ID } from '@/types/compose-spec';
import { db } from '@/lib/firebase';
import { collection, doc, setDoc, getDocs, deleteDoc, updateDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";


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
  deleteCustomComponentTemplate: (templateId: string, firestoreId?: string) => Promise<void>;
  renameCustomComponentTemplate: (templateId: string, newName: string, firestoreId?: string) => Promise<void>;
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
      horizontalAlignment: 'CenterHorizontally', // Default a CenterHorizontally
    },
    parentId: null, 
  };
}

const initialDefaultRootLazyColumn = createDefaultRootLazyColumn();
const initialDesignState: DesignState = {
  components: [initialDefaultRootLazyColumn],
  selectedComponentId: null,
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
    const { properties: modalNodeProperties, parentId: _modalNodeOriginalParentId, ...baseModalNodeData } = modalNode;
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
    
    const actualParentInDesign = baseModalNodeData.parentId || currentDesignParentId;


    const newDesignComponent: DesignComponent = {
      ...baseModalNodeData,
      parentId: actualParentInDesign, 
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
  const { toast } = useToast();


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
      let finalSelectedComponentId = ''; 

      const actualParentId = parentIdOrNull; 

      if (!updatedComponentsList.find(c => c.id === DEFAULT_ROOT_LAZY_COLUMN_ID)) {
          updatedComponentsList.unshift(createDefaultRootLazyColumn());
      }

      if (isCustomComponentType(type)) {
        const templateId = type;
        const template = prev.customComponentTemplates.find(t => t.templateId === templateId);

        if (!template) {
          console.error(`Custom template ${templateId} not found.`);
          return prev;
        }

        const finalIdMap: Record<string, string> = {};
        const finalNewComponentsBatch: DesignComponent[] = [];
        let instantiatedTemplateRootId = "";

        template.componentTree.forEach(templateComp => {
          const newInstanceCompId = `inst-${templateComp.type.toLowerCase().replace(/\s+/g, '-')}-${currentNextId}`;
          finalIdMap[templateComp.id] = newInstanceCompId;
          currentNextId++;
        });

        template.componentTree.forEach(templateComp => {
          const newInstanceCompId = finalIdMap[templateComp.id];
          const newInstanceComp = deepClone(templateComp);
          newInstanceComp.id = newInstanceCompId;
          newInstanceComp.name = templateComp.name;

          if (templateComp.id === template.rootComponentId) {
            newInstanceComp.name = `${template.name} Instance`;
            instantiatedTemplateRootId = newInstanceCompId;
            newInstanceComp.parentId = actualParentId; 

            if (actualParentId === null && dropPosition) {
                let offsetX = 0;
                let offsetY = 0;
                const rootProps = templateComp.properties; 
                if (typeof rootProps.width === 'number') offsetX = rootProps.width / 2;
                else if (rootProps.width && typeof rootProps.width === 'string' && !['match_parent', 'wrap_content'].includes(rootProps.width)) {
                    const parsed = parseFloat(rootProps.width);
                    if (!isNaN(parsed)) offsetX = parsed / 2;
                }
                if (typeof rootProps.height === 'number') offsetY = rootProps.height / 2;
                else if (rootProps.height && typeof rootProps.height === 'string' && !['match_parent', 'wrap_content'].includes(rootProps.height)) {
                    const parsed = parseFloat(rootProps.height);
                    if (!isNaN(parsed)) offsetY = parsed / 2;
                }
                newInstanceComp.properties.x = Math.round(dropPosition.x - offsetX);
                newInstanceComp.properties.y = Math.round(dropPosition.y - offsetY);
            } else { 
                delete newInstanceComp.properties.x;
                delete newInstanceComp.properties.y;
            }

          } else { 
            newInstanceComp.parentId = templateComp.parentId ? finalIdMap[templateComp.parentId] : null;
            delete newInstanceComp.properties.x; 
            delete newInstanceComp.properties.y;
          }

          if (newInstanceComp.properties.children && Array.isArray(newInstanceComp.properties.children)) {
            newInstanceComp.properties.children = newInstanceComp.properties.children
              .map(childIdFromTemplate => finalIdMap[childIdFromTemplate])
              .filter(childId => !!childId);
          }
          finalNewComponentsBatch.push(newInstanceComp);
        });
        
        finalSelectedComponentId = instantiatedTemplateRootId;
        updatedComponentsList = [...updatedComponentsList, ...finalNewComponentsBatch];

      } else { 
        const newId = `comp-${currentNextId++}`;
        finalSelectedComponentId = newId;
        const defaultProps = getDefaultProperties(type as ComponentType);
        
        const newComponent: DesignComponent = {
          id: newId,
          type: type as ComponentType,
          name: `${getComponentDisplayNameResolved(type as ComponentType)} ${newId.split('-')[1]}`,
          properties: { ...defaultProps },
          parentId: actualParentId,
        };

        if (actualParentId === null && dropPosition) {
            let offsetX = 0;
            let offsetY = 0;
            const w = defaultProps.width;
            const h = defaultProps.height;

            if (typeof w === 'number') offsetX = w / 2;
            else if (w && typeof w === 'string' && !['match_parent', 'wrap_content'].includes(w)) {
                const parsed = parseFloat(w);
                if (!isNaN(parsed)) offsetX = parsed / 2;
            }
            if (typeof h === 'number') offsetY = h / 2;
            else if (h && typeof h === 'string' && !['match_parent', 'wrap_content'].includes(h)) {
                const parsed = parseFloat(h);
                if (!isNaN(parsed)) offsetY = parsed / 2;
            }
            newComponent.properties.x = Math.round(dropPosition.x - offsetX);
            newComponent.properties.y = Math.round(dropPosition.y - offsetY);
        } else { 
            delete newComponent.properties.x;
            delete newComponent.properties.y;
        }
        updatedComponentsList.push(newComponent);
      }

      if (actualParentId) {
        const parentCompIndex = updatedComponentsList.findIndex(c => c.id === actualParentId);
        if (parentCompIndex !== -1) {
            const currentParent = updatedComponentsList[parentCompIndex];
            if (isContainerType(currentParent.type, prev.customComponentTemplates)) {
                const childIdToAdd = isCustomComponentType(type) ? finalSelectedComponentId : finalSelectedComponentId; 
                const existingChildren = Array.isArray(currentParent.properties.children) ? currentParent.properties.children : [];
                if (!existingChildren.includes(childIdToAdd)) {
                    updatedComponentsList[parentCompIndex] = {
                        ...currentParent,
                        properties: {
                            ...currentParent.properties,
                            children: [...existingChildren, childIdToAdd]
                        }
                    };
                }
            }
        }
      }
      
      const finalUniqueComponents = updatedComponentsList.filter((comp, index, self) => index === self.findIndex(t => t.id === comp.id));

      return {
        ...prev,
        components: finalUniqueComponents,
        selectedComponentId: finalSelectedComponentId,
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
        toast({ title: "Template Saved (Locally)", description: `"${name}" saved. Firestore not connected.` });
        setDesignState(prev => ({
          ...prev,
          customComponentTemplates: [...prev.customComponentTemplates, { ...newTemplate, firestoreId: `local-${newTemplate.templateId}` }],
        }));
        return;
      }
      const templateRef = doc(db, CUSTOM_TEMPLATES_COLLECTION, newTemplate.templateId);
      await setDoc(templateRef, newTemplate);
      toast({ title: "Custom Template Saved", description: `"${name}" saved to library and Firestore.` });
      setDesignState(prev => ({
        ...prev,
        customComponentTemplates: [...prev.customComponentTemplates, { ...newTemplate, firestoreId: newTemplate.templateId }],
      }));
    } catch (error) {
      console.error("Error saving custom template to Firestore:", error);
      toast({ title: "Save Failed", description: "Could not save template to Firestore. Saved locally.", variant: "destructive" });
       setDesignState(prev => ({
        ...prev,
        customComponentTemplates: [...prev.customComponentTemplates, { ...newTemplate, firestoreId: `local-error-${newTemplate.templateId}` }],
      }));
    }
  }, [designState.selectedComponentId, getComponentById, toast]);


  const deleteComponent = useCallback((id: string) => {
    if (id === DEFAULT_ROOT_LAZY_COLUMN_ID && designState.components.length === 1) {
      console.warn("Attempted to delete the last remaining default root LazyColumn. Operation prevented.");
      toast({ title: "Action Prevented", description: "Cannot delete the root canvas component.", variant: "destructive" });
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
      if (id === DEFAULT_ROOT_LAZY_COLUMN_ID || !finalComponents.find(c => c.id === DEFAULT_ROOT_LAZY_COLUMN_ID && c.parentId === null)) {
         if (finalComponents.length > 0) { 
            const newRoot = createDefaultRootLazyColumn();
            const orphanedChildren = finalComponents.filter(c => c.parentId === id || (c.parentId === null && c.id !== newRoot.id));
            newRoot.properties.children = orphanedChildren.map(oc => oc.id);
            finalComponents = [newRoot, ...finalComponents.map(c => (orphanedChildren.find(oc => oc.id === c.id) ? {...c, parentId: newRoot.id} : c) )];
            finalComponents = finalComponents.filter((comp, index, self) => index === self.findIndex(t => t.id === comp.id)); 
         } else { 
            finalComponents.unshift(createDefaultRootLazyColumn());
         }
      }


      const newSelectedComponentId = deletedIdsArray.includes(prev.selectedComponentId || "")
        ? null 
        : prev.selectedComponentId;

      return {
        ...prev,
        components: finalComponents,
        selectedComponentId: newSelectedComponentId,
      };
    });
  }, [designState.components.length, toast]);


  const selectComponent = useCallback((id: string | null) => {
    setDesignState(prev => ({ ...prev, selectedComponentId: id }));
  }, []);

  const updateComponent = useCallback((id: string, updates: { name?: string; properties?: Partial<BaseComponentProps> }) => {
    setDesignState(prev => ({
      ...prev,
      components: prev.components.map(comp => {
        if (comp.id === id) {
          let newComp = { ...comp, properties: { ...comp.properties} };
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
        (comp.id === id && comp.parentId === null && id !== DEFAULT_ROOT_LAZY_COLUMN_ID) 
          ? { ...comp, properties: { ...comp.properties, x: position.x, y: position.y } } 
          : comp
      ),
    }));
  }, []);

  const clearDesign = useCallback(() => {
    const newRootLazyColumn = createDefaultRootLazyColumn();
    setDesignState(prev => ({
        ...prev,
        components: [newRootLazyColumn],
        selectedComponentId: null, 
        nextId: 1,
    }));
  }, []);

  const setDesign = useCallback((newDesign: DesignState) => {
    let finalComponents = newDesign.components;
    let finalSelectedId = newDesign.selectedComponentId;

    let rootLazyColumn = finalComponents.find(c => c.id === DEFAULT_ROOT_LAZY_COLUMN_ID && c.parentId === null);
    if (!rootLazyColumn) {
        rootLazyColumn = createDefaultRootLazyColumn();
        const oldRootChildrenIds = finalComponents
            .filter(c => c.parentId === null && c.id !== DEFAULT_ROOT_LAZY_COLUMN_ID)
            .map(c => c.id);
        
        rootLazyColumn.properties.children = oldRootChildrenIds;

        finalComponents = [rootLazyColumn, ...finalComponents.map(c => {
            if (c.parentId === null && c.id !== DEFAULT_ROOT_LAZY_COLUMN_ID) return {...c, parentId: rootLazyColumn!.id };
            return c;
        })];
        finalComponents = finalComponents.filter((comp, index, self) => index === self.findIndex(t => t.id === comp.id));
    } else {
      if (rootLazyColumn.parentId !== null) rootLazyColumn.parentId = null;
      const currentRootChildren = new Set(rootLazyColumn.properties.children || []);
      finalComponents.forEach(c => {
        if (c.id !== DEFAULT_ROOT_LAZY_COLUMN_ID && c.parentId === null) {
          c.parentId = DEFAULT_ROOT_LAZY_COLUMN_ID;
          if (!currentRootChildren.has(c.id)) {
            rootLazyColumn!.properties.children = [...(rootLazyColumn!.properties.children || []), c.id];
          }
        }
      });
    }

    if (!finalSelectedId || !finalComponents.find(c => c.id === finalSelectedId)) {
        finalSelectedId = null; 
    }
    setDesignState(prev => ({...newDesign, components: finalComponents, selectedComponentId: finalSelectedId, customComponentTemplates: prev.customComponentTemplates }));
  }, []);


  const overwriteComponents = useCallback((hierarchicalUserComponentsJson: any[]): { success: boolean, error?: string } => {
    if (!Array.isArray(hierarchicalUserComponentsJson)) {
      return { success: false, error: "Invalid JSON: Data must be an array of components." };
    }

    const userComponentsFlatList = flattenComponentsFromModalJson(hierarchicalUserComponentsJson, DEFAULT_ROOT_LAZY_COLUMN_ID);

    let rootLazyColumn = designState.components.find(c => c.id === DEFAULT_ROOT_LAZY_COLUMN_ID && c.parentId === null) 
                         || createDefaultRootLazyColumn();
    rootLazyColumn.properties.children = userComponentsFlatList
        .filter(c => c.parentId === DEFAULT_ROOT_LAZY_COLUMN_ID) 
        .map(c => c.id);

    const finalComponents: DesignComponent[] = [rootLazyColumn, ...userComponentsFlatList];
    
    const allIds = new Set(finalComponents.map(c => c.id));
    if (allIds.size !== finalComponents.length) {
        const duplicateIds = finalComponents.map(c=>c.id).filter((id, index, arr) => arr.indexOf(id) !== index);
        console.error("Non-unique IDs after flattening modal JSON:", duplicateIds);
        return { success: false, error: `Invalid JSON: Component IDs are not unique. Duplicates: ${duplicateIds.join(', ')}`};
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
          if (typeof childId !== 'string' || !allIds.has(childId)) {
            return { success: false, error: `Invalid JSON: Component "${comp.name} (${comp.id})" lists non-existent or invalid childId "${childId}".`};
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
  }, [designState.components]);


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
        draggedComponent.properties = {...draggedComponent.properties};
        const oldParentId = draggedComponent.parentId;
        const actualTargetParentId = targetParentIdOrNull; 

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

        if (actualTargetParentId === null && newPosition) { 
            draggedComponent.properties.x = newPosition.x;
            draggedComponent.properties.y = newPosition.y;
        } else { 
            delete draggedComponent.properties.x;
            delete draggedComponent.properties.y;
        }
        currentComponents[draggedComponentIndex] = draggedComponent;

        if (oldParentId && oldParentId !== actualTargetParentId) {
            const oldParentIndex = currentComponents.findIndex(c => c.id === oldParentId);
            if (oldParentIndex !== -1) {
                const oldParent = {...currentComponents[oldParentIndex]};
                oldParent.properties = {...oldParent.properties};
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
                 newParent.properties = {...newParent.properties};
                 if (isContainerType(newParent.type, prev.customComponentTemplates)) {
                    let existingChildren = Array.isArray(newParent.properties.children) ? newParent.properties.children : [];
                    existingChildren = existingChildren.filter(childId => childId !== draggedId); 
                    newParent.properties.children = [...existingChildren, draggedId];
                    currentComponents[newParentIndex] = newParent;
                 } else {
                    console.warn(`Attempted to move component ${draggedId} into non-container ${actualTargetParentId}. Reverting.`);
                     draggedComponent.parentId = oldParentId; 
                     const originalComponent = prev.components[draggedComponentIndex];
                     draggedComponent.properties.x = originalComponent.properties.x;
                     draggedComponent.properties.y = originalComponent.properties.y;
                     currentComponents[draggedComponentIndex] = draggedComponent;
                     return prev;
                 }
            }
        }
        return { ...prev, components: currentComponents, selectedComponentId: draggedId };
    });
  }, []);

  const deleteCustomComponentTemplate = useCallback(async (templateId: string, firestoreId?: string) => {
    const idToDelete = firestoreId || templateId;
    try {
      if (db && idToDelete && !idToDelete.startsWith("local-")) { 
        await deleteDoc(doc(db, CUSTOM_TEMPLATES_COLLECTION, idToDelete));
      }
      setDesignState(prev => ({
        ...prev,
        customComponentTemplates: prev.customComponentTemplates.filter(t => t.templateId !== templateId),
      }));
      toast({ title: "Custom Template Deleted", description: `Template removed from library.` });
    } catch (error) {
      console.error("Error deleting custom template:", error);
      toast({ title: "Delete Failed", description: "Could not delete template.", variant: "destructive" });
    }
  }, [toast]);

  const renameCustomComponentTemplate = useCallback(async (templateId: string, newName: string, firestoreId?: string) => {
    const idToUpdate = firestoreId || templateId;
    try {
      if (db && idToUpdate && !idToUpdate.startsWith("local-")) { 
        const templateRef = doc(db, CUSTOM_TEMPLATES_COLLECTION, idToUpdate);
        await updateDoc(templateRef, { name: newName });
      }
      setDesignState(prev => ({
        ...prev,
        customComponentTemplates: prev.customComponentTemplates.map(t =>
          t.templateId === templateId ? { ...t, name: newName } : t
        ),
      }));
      toast({ title: "Custom Template Renamed", description: `Template renamed to "${newName}".` });
    } catch (error) {
      console.error("Error renaming custom template:", error);
      toast({ title: "Rename Failed", description: "Could not rename template.", variant: "destructive" });
    }
  }, [toast]);


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
    deleteCustomComponentTemplate,
    renameCustomComponentTemplate,
  };

  if (!isClient) {
    const initialContextValueForSSR: DesignContextType = {
      ...initialDesignState,
      addComponent: () => {},
      deleteComponent: () => {},
      selectComponent: () => {},
      updateComponent: () => {},
      updateComponentPosition: () => {},
      getComponentById: (id: string) => initialDesignState.components.find(comp => comp.id === id),
      clearDesign: () => {},
      setDesign: () => {},
      overwriteComponents: () => { return {success: false, error: "Context not ready on server."}; },
      moveComponent: () => {},
      saveSelectedAsCustomTemplate: () => {},
      deleteCustomComponentTemplate: async () => {},
      renameCustomComponentTemplate: async () => {},
    };
    return (
      <DesignContext.Provider value={initialContextValueForSSR}>
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
