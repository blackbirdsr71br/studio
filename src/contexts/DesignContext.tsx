
'use client';

import type { ReactNode} from 'react';
import React, { useState, useEffect, useCallback } from 'react';
import type { DesignComponent, DesignState, ComponentType, BaseComponentProps, CustomComponentTemplate, SavedLayout, GalleryImage } from '@/types/compose-spec';
import { getDefaultProperties, CUSTOM_COMPONENT_TYPE_PREFIX, isContainerType, getComponentDisplayName, ROOT_SCAFFOLD_ID, DEFAULT_CONTENT_LAZY_COLUMN_ID, CORE_SCAFFOLD_ELEMENT_IDS, CUSTOM_TEMPLATES_COLLECTION, SAVED_LAYOUTS_COLLECTION, GALLERY_IMAGES_COLLECTION, DESIGNS_COLLECTION, MAIN_DESIGN_DOC_ID } from '@/types/compose-spec';
import { db } from '@/lib/firebase';
import { collection, doc, setDoc, getDocs, deleteDoc, updateDoc, query, orderBy, getDoc, type Firestore } from "firebase/firestore";
import { useToast } from '@/hooks/use-toast';
import { useDebouncedCallback } from 'use-debounce';

interface DesignContextType extends DesignState {
  addComponent: (typeOrTemplateId: ComponentType | string, parentId?: string | null, dropPosition?: { x: number; y: number }, index?: number) => void;
  deleteComponent: (id: string) => void;
  selectComponent: (id: string | null) => void;
  updateComponent: (id: string, updates: { name?: string; properties?: Partial<BaseComponentProps>; templateIdRef?: string }) => void;
  updateComponentPosition: (id: string, position: { x: number; y: number }) => void;
  getComponentById: (id: string) => DesignComponent | undefined;
  overwriteComponents: (hierarchicalUserComponentsJson: any[]) => { success: boolean, error?: string };
  moveComponent: (draggedId: string, newParentId: string | null, newIndex?: number) => void;
  copyComponent: (id: string) => {success: boolean, message?: string};
  pasteComponent: (targetParentId?: string | null) => {success: boolean, message?: string};
  saveSelectedAsCustomTemplate: (name: string) => Promise<{success: boolean, message: string}>;
  deleteCustomComponentTemplate: (templateId: string, firestoreDocId?: string) => Promise<{success: boolean, message: string}>;
  renameCustomComponentTemplate: (templateId: string, newName: string, firestoreDocId?: string) => Promise<{success: boolean, message: string}>;
  saveCurrentCanvasAsLayout: (name: string) => Promise<{success: boolean, message: string}>;
  loadLayoutToCanvas: (layoutId: string) => {success: boolean, message: string};
  deleteSavedLayout: (layoutId: string, firestoreDocId?: string) => Promise<{success: boolean, message: string}>;
  renameSavedLayout: (layoutId: string, newName: string, firestoreDocId?: string) => Promise<{success: boolean, message: string}>;
  loadTemplateForEditing: (templateId: string) => {success: boolean, message: string};
  updateCustomTemplate: () => Promise<{success: boolean, message: string}>;
  loadLayoutForEditing: (layoutId: string) => void;
  updateSavedLayout: () => Promise<{success: boolean, message: string}>;
  undo: () => void;
  redo: () => void;
  clearDesign: () => void;
  addImageToGallery: (url: string) => Promise<{success: boolean, message: string}>;
  removeImageFromGallery: (id: string) => Promise<{success: boolean, message: string}>;
  
  // Zoom functionality
  zoomLevel: number;
  setZoomLevel: React.Dispatch<React.SetStateAction<number>>;
}


const DesignContext = React.createContext<DesignContextType | undefined>(undefined);

const deepClone = <T>(obj: T): T => {
  return JSON.parse(JSON.stringify(obj));
};

const sanitizeForFirestore = (obj: any): any => {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeForFirestore(item)).filter(item => item !== undefined);
  }

  const sanitizedObj: { [key: string]: any } = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];
      if (value === undefined) {
        continue;
      }
      const sanitizedValue = sanitizeForFirestore(value);
      if (sanitizedValue !== undefined) {
        sanitizedObj[key] = sanitizedValue;
      }
    }
  }
  return sanitizedObj;
};

const createInitialComponents = (): DesignComponent[] => {
  const rootScaffold: DesignComponent = {
    id: ROOT_SCAFFOLD_ID,
    type: 'Scaffold',
    name: 'Root Scaffold',
    properties: {
      ...getDefaultProperties('Scaffold', ROOT_SCAFFOLD_ID),
      children: [DEFAULT_CONTENT_LAZY_COLUMN_ID],
    },
    parentId: null,
  };
  const contentLazyColumn: DesignComponent = {
    id: DEFAULT_CONTENT_LAZY_COLUMN_ID,
    type: 'LazyColumn',
    name: 'Main Content Area',
    properties: {
      ...getDefaultProperties('LazyColumn', DEFAULT_CONTENT_LAZY_COLUMN_ID),
      children: [],
    },
    parentId: ROOT_SCAFFOLD_ID,
  };
  return [rootScaffold, contentLazyColumn];
};

const initialDesignState: DesignState = {
  components: createInitialComponents(),
  selectedComponentId: DEFAULT_CONTENT_LAZY_COLUMN_ID,
  nextId: 1,
  customComponentTemplates: [],
  savedLayouts: [],
  galleryImages: [],
  editingTemplateInfo: null,
  editingLayoutInfo: null,
  history: [],
  future: [],
  clipboard: null,
};


const flattenComponentsFromModalJson = (
  modalNodes: any[],
  forcedParentId: string
): DesignComponent[] => {
  let flatList: DesignComponent[] = [];

  for (const modalNode of modalNodes) {
    const { properties: modalNodeProperties, parentId: _modalNodeOriginalParentId, templateIdRef, ...baseModalNodeData } = modalNode || {};
    const { children: nestedModalChildrenObjects, ...scalarModalProperties } = modalNodeProperties || {};

    if (!baseModalNodeData.id || !baseModalNodeData.type || !baseModalNodeData.name) {
      console.warn("Skipping invalid modal node during flatten:", modalNode);
      continue;
    }
    
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
      parentId: baseModalNodeData.parentId || forcedParentId,
      properties: {
        ...designComponentProperties,
        children: designComponentChildIds,
      },
      templateIdRef: templateIdRef,
    };
    flatList.push(newDesignComponent);
  }
  return flatList;
};

const defaultGalleryUrls = [
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/elektra.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/PruebaColorContorno.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/bancoazteca.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/tvazteca.png",
];

const uniqueDefaultUrls = [...new Set(defaultGalleryUrls)];

const defaultGalleryImages: GalleryImage[] = uniqueDefaultUrls.map((url, index) => ({
    id: `default-gallery-${Date.now()}-${index}`,
    url,
    timestamp: Date.now() - index,
}));

export const DesignProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [designState, setDesignState] = React.useState<DesignState>(initialDesignState);
  const [isClient, setIsClient] = React.useState(false);
  const { toast } = useToast();
  const [zoomLevel, setZoomLevel] = useState(0.7);
  const [dbInstance, setDbInstance] = useState<Firestore | null>(null);

  const saveDesignToFirestore = useDebouncedCallback(async (stateToSave: DesignState) => {
    if (!dbInstance || stateToSave.editingTemplateInfo || stateToSave.editingLayoutInfo) return;
    try {
        const designDocRef = doc(dbInstance, DESIGNS_COLLECTION, MAIN_DESIGN_DOC_ID);
        const persistentState = {
            components: stateToSave.components,
            nextId: stateToSave.nextId,
        };
        await setDoc(designDocRef, sanitizeForFirestore(persistentState));
    } catch (e) {
        console.error("Failed to save design to Firestore:", e);
        toast({
            title: "Sync Error",
            description: "Could not save changes to the cloud. They are saved locally.",
            variant: "destructive"
        });
    }
  }, 1500);

  const updateStateWithHistory = React.useCallback((
    updater: (prevState: DesignState) => Partial<DesignState>,
  ) => {
    setDesignState(prev => {
      const updates = updater(prev);
      if (Object.keys(updates).length === 0) return prev;
  
      const newHistory = [...prev.history, { components: prev.components, nextId: prev.nextId, selectedComponentId: prev.selectedComponentId }];
      if (newHistory.length > 50) newHistory.shift();
      
      const nextState: DesignState = {
        ...prev,
        ...updates,
        history: newHistory,
        future: [],
      };
      
      if (!nextState.editingTemplateInfo && !nextState.editingLayoutInfo) {
        saveDesignToFirestore(nextState);
      }
      
      return nextState;
    });
  }, [saveDesignToFirestore]);
  
  useEffect(() => {
    setIsClient(true);
    if (db) {
        setDbInstance(db);
    } else {
        console.warn("Firestore DB instance not available on initial context mount.");
    }
  }, []);

  useEffect(() => {
    const loadInitialData = async () => {
        if (!dbInstance) {
            console.log("Firestore DB not ready, deferring initial data load.");
            return;
        }

        console.log("Firestore DB is ready. Loading initial data from Firestore...");
        try {
            const templatesQuery = query(collection(dbInstance, CUSTOM_TEMPLATES_COLLECTION));
            const templatesSnapshot = await getDocs(templatesQuery);
            const templates: CustomComponentTemplate[] = templatesSnapshot.docs.map(docSnap => ({ firestoreId: docSnap.id, ...docSnap.data() } as CustomComponentTemplate));
            
            const layoutsQuery = query(collection(dbInstance, SAVED_LAYOUTS_COLLECTION), orderBy("timestamp", "desc"));
            const layoutsSnapshot = await getDocs(layoutsQuery);
            const layouts: SavedLayout[] = layoutsSnapshot.docs.map(docSnap => ({ firestoreId: docSnap.id, ...docSnap.data() } as SavedLayout));

            const designDocRef = doc(dbInstance, DESIGNS_COLLECTION, MAIN_DESIGN_DOC_ID);
            const designDocSnap = await getDoc(designDocRef);
            let designComponents = createInitialComponents();
            let designNextId = 1;
            if (designDocSnap.exists()) {
                const data = designDocSnap.data() as {components: DesignComponent[], nextId: number};
                designComponents = data.components;
                designNextId = data.nextId;
            } else {
                await saveDesignToFirestore(initialDesignState); 
            }

            setDesignState(prev => ({
                ...prev,
                customComponentTemplates: templates,
                savedLayouts: layouts,
                components: designComponents,
                nextId: designNextId,
                history: [], 
                future: [], 
            }));
            console.log("Successfully loaded all data from Firestore.");

        } catch (error) {
            console.error("Error loading initial data from Firestore:", error);
            toast({
              title: "Data Load Error",
              description: "Could not load data from Firestore. Check console and security rules.",
              variant: "destructive"
            });
        }
    };
    
     try {
        const savedImagesJson = localStorage.getItem(GALLERY_IMAGES_COLLECTION);
        const galleryToSet = savedImagesJson ? JSON.parse(savedImagesJson) : defaultGalleryImages;
        if (!savedImagesJson) {
            localStorage.setItem(GALLERY_IMAGES_COLLECTION, JSON.stringify(galleryToSet));
        }
        setDesignState(prev => ({ ...prev, galleryImages: galleryToSet.sort((a:GalleryImage,b:GalleryImage) => b.timestamp - a.timestamp) }));
      } catch (error) {
        console.error("Error loading gallery from localStorage:", error);
        setDesignState(prev => ({ ...prev, galleryImages: defaultGalleryImages.sort((a,b) => b.timestamp - a.timestamp) }));
      }
      
      loadInitialData();

  }, [dbInstance, toast]);

  const getComponentById = React.useCallback(
    (id: string) => designState.components.find(comp => comp.id === id),
    [designState.components]
  );
  
  const addComponent = React.useCallback((
    typeOrTemplateId: ComponentType | string,
    parentIdOrNull: string | null = DEFAULT_CONTENT_LAZY_COLUMN_ID,
    _dropPosition?: { x: number; y: number },
    index?: number
  ) => {
    updateStateWithHistory(prev => {
      let { components: updatedComponentsList, nextId: currentNextId } = deepClone(prev);

      let finalSelectedComponentId = '';
      let componentsToAdd: DesignComponent[] = [];
      let effectiveParentId = parentIdOrNull;
  
      if (typeOrTemplateId === 'TopAppBar') effectiveParentId = ROOT_SCAFFOLD_ID;
      else if (typeOrTemplateId === 'BottomNavigationBar') effectiveParentId = ROOT_SCAFFOLD_ID;
      else if (parentIdOrNull === ROOT_SCAFFOLD_ID) effectiveParentId = DEFAULT_CONTENT_LAZY_COLUMN_ID;
      else if (!parentIdOrNull) effectiveParentId = DEFAULT_CONTENT_LAZY_COLUMN_ID;
  
      let parentComponent = updatedComponentsList.find(c => c.id === effectiveParentId);
      if (!parentComponent || !isContainerType(parentComponent.type, prev.customComponentTemplates)) {
        effectiveParentId = DEFAULT_CONTENT_LAZY_COLUMN_ID;
      }
  
      if (typeOrTemplateId.startsWith(CUSTOM_COMPONENT_TYPE_PREFIX)) {
        const template = prev.customComponentTemplates.find(t => t.templateId === typeOrTemplateId);
        if (!template) return {};
  
        const idMap: Record<string, string> = {};
        const newComponentsBatch: DesignComponent[] = [];
        let rootId = "";
  
        template.componentTree.forEach(tc => { idMap[tc.id] = `inst-${tc.type.toLowerCase()}-${currentNextId++}`; });
        template.componentTree.forEach(tc => {
          const newId = idMap[tc.id];
          const newComp: DesignComponent = {
            ...deepClone(tc),
            id: newId,
            parentId: tc.parentId ? idMap[tc.parentId] : null,
            properties: { ...getDefaultProperties(tc.type, newId), ...tc.properties },
          };
          if (tc.id === template.rootComponentId) {
            newComp.name = template.name;
            rootId = newId;
            newComp.parentId = effectiveParentId;
            newComp.templateIdRef = typeOrTemplateId;
          }
          if (newComp.properties.children) {
            newComp.properties.children = newComp.properties.children.map(cid => idMap[cid]).filter(Boolean);
          }
          newComponentsBatch.push(newComp);
        });
        finalSelectedComponentId = rootId;
        componentsToAdd.push(...newComponentsBatch);
      } else {
        const newId = `comp-${currentNextId++}`;
        finalSelectedComponentId = newId;
        componentsToAdd.push({
          id: newId,
          type: typeOrTemplateId as ComponentType,
          name: `${getComponentDisplayName(typeOrTemplateId as ComponentType)} ${newId.split('-')[1]}`,
          properties: { ...getDefaultProperties(typeOrTemplateId as ComponentType, newId) },
          parentId: effectiveParentId,
        });
      }
      
      updatedComponentsList.push(...componentsToAdd);
  
      if (effectiveParentId) {
        const parentIdx = updatedComponentsList.findIndex(c => c.id === effectiveParentId);
        if (parentIdx !== -1) {
            const parent = updatedComponentsList[parentIdx];
            if (isContainerType(parent.type, prev.customComponentTemplates) || parent.templateIdRef) {
                const childIdsToAdd = componentsToAdd.filter(c => c.parentId === effectiveParentId).map(c => c.id);
                let children = [...(parent.properties.children || [])];
                if (index !== undefined && index >= 0) children.splice(index, 0, ...childIdsToAdd);
                else children.push(...childIdsToAdd);
                updatedComponentsList[parentIdx] = { ...parent, properties: { ...parent.properties, children }};
            }
        }
      }
      
      return { components: updatedComponentsList, nextId: currentNextId, selectedComponentId: finalSelectedComponentId };
    });
  }, [updateStateWithHistory]);


  const saveSelectedAsCustomTemplate = React.useCallback(async (name: string): Promise<{success: boolean, message: string}> => {
    if (!designState.selectedComponentId) return { success: false, message: "No component selected."};
    const selectedComponent = getComponentById(designState.selectedComponentId);
    if (!selectedComponent || CORE_SCAFFOLD_ELEMENT_IDS.includes(selectedComponent.id) || selectedComponent.templateIdRef) {
        return { success: false, message: "Cannot save this component as a template." };
    }

    const templateComponentTree: DesignComponent[] = [];
    const idMap: Record<string, string> = {};
    let nextTmplId = 1;

    const cloneAndCollect = (originalId: string, newParentId: string | null) => {
      const originalComp = getComponentById(originalId);
      if (!originalComp) return;
      const tmplId = `tmpl-${originalComp.type.toLowerCase()}-${nextTmplId++}`;
      idMap[originalId] = tmplId;
      const cloned = { ...deepClone(originalComp), id: tmplId, parentId: newParentId };
      delete cloned.templateIdRef;
      if (cloned.properties.children) {
        const childIds = [...cloned.properties.children];
        cloned.properties.children = [];
        childIds.forEach(cid => {
          cloneAndCollect(cid, tmplId);
          if (idMap[cid]) cloned.properties.children!.push(idMap[cid]);
        });
      }
      templateComponentTree.push(cloned);
    };

    cloneAndCollect(selectedComponent.id, null);
    const rootTemplateComp = templateComponentTree.find(c => idMap[selectedComponent.id] === c.id);
    if (!rootTemplateComp) return { success: false, message: "Failed to process component tree."};

    const firestoreId = `${name.replace(/\s+/g, '_').toLowerCase()}-${Date.now()}`;
    const templateId = `${CUSTOM_COMPONENT_TYPE_PREFIX}${firestoreId}`; 
    const newTemplate: CustomComponentTemplate = { firestoreId, templateId, name, rootComponentId: rootTemplateComp.id, componentTree: templateComponentTree };

    if (!dbInstance) {
        return { success: false, message: "Database not connected. Cannot save template." };
    }

    try {
        await setDoc(doc(dbInstance, CUSTOM_TEMPLATES_COLLECTION, firestoreId), sanitizeForFirestore(newTemplate));
        setDesignState(prev => ({ ...prev, customComponentTemplates: [...prev.customComponentTemplates, newTemplate] }));
        toast({ title: "Template Saved", description: `Template "${name}" saved and synced successfully.` });
        return { success: true, message: `Template "${name}" saved and synced.`};
    } catch (e) {
        console.error("Firestore save error:", e);
        const errorMessage = e instanceof Error ? e.message : "An unknown error occurred.";
        toast({ title: "Save Failed", description: `Template could not be saved to the database: ${errorMessage}`, variant: "destructive" });
        return { success: false, message: "Template could not be saved to the database. " + (e as Error).message };
    }
  }, [designState.selectedComponentId, getComponentById, dbInstance, toast]);


  const deleteComponent = React.useCallback((id: string) => {
    updateStateWithHistory(prev => {
      if (CORE_SCAFFOLD_ELEMENT_IDS.includes(id)) return {};
      
      const { components: currentComponents } = deepClone(prev);

      const idsToDelete = new Set<string>();
      const queue: string[] = [id];
      while (queue.length > 0) {
        const currentId = queue.shift()!;
        if (idsToDelete.has(currentId)) continue;
        idsToDelete.add(currentId);
        const currentComp = currentComponents.find(c => c.id === currentId);
        if (currentComp?.properties.children) queue.push(...currentComp.properties.children);
      }

      let newComps = currentComponents.filter(c => !idsToDelete.has(c.id));
      const parentId = currentComponents.find(c => c.id === id)?.parentId;
      if (parentId) {
        const parent = newComps.find(c => c.id === parentId);
        if (parent?.properties.children) {
          parent.properties.children = parent.properties.children.filter(cid => cid !== id);
        }
      }
      const newSelectedId = idsToDelete.has(prev.selectedComponentId || "") ? (parentId || DEFAULT_CONTENT_LAZY_COLUMN_ID) : prev.selectedComponentId;
      
      return { components: newComps, selectedComponentId: newSelectedId };
    });
  }, [updateStateWithHistory]);


  const selectComponent = React.useCallback((id: string | null) => {
    setDesignState(prev => ({ ...prev, selectedComponentId: id }));
  }, []);

  const updateComponent = React.useCallback((id: string, updates: { name?: string; properties?: Partial<BaseComponentProps>; templateIdRef?: string }) => {
    updateStateWithHistory(prev => {
        const newComponents = prev.components.map(comp => {
            if (comp.id === id) {
                const newComp = { ...comp, properties: { ...comp.properties} };
                if (updates.name !== undefined && !(CORE_SCAFFOLD_ELEMENT_IDS.includes(id) && !comp.templateIdRef)) newComp.name = updates.name;
                if (updates.properties) newComp.properties = { ...newComp.properties, ...updates.properties };
                if (updates.templateIdRef !== undefined) newComp.templateIdRef = updates.templateIdRef;
                if (updates.properties?.fillMaxSize) {
                    newComp.properties.fillMaxWidth = true;
                    newComp.properties.fillMaxHeight = true;
                }
                return newComp;
            }
            return comp;
        });
        return { components: newComponents };
    });
  }, [updateStateWithHistory]);

  const updateComponentPosition = React.useCallback((_id: string, _position: { x: number; y: number }) => {
     console.warn("updateComponentPosition is deprecated.");
  }, []);

  const clearDesign = React.useCallback(() => {
    updateStateWithHistory(prev => {
      if(prev.editingLayoutInfo || prev.editingTemplateInfo) {
        // Just reset to the default blank canvas state. The user can load a layout if needed.
        return { 
          components: createInitialComponents(), 
          nextId: 1, 
          selectedComponentId: DEFAULT_CONTENT_LAZY_COLUMN_ID, 
          editingLayoutInfo: null, 
          editingTemplateInfo: null 
        };
      }
      return { components: createInitialComponents(), nextId: 1, selectedComponentId: DEFAULT_CONTENT_LAZY_COLUMN_ID };
    });
  }, [updateStateWithHistory]);

  const overwriteComponents = React.useCallback((hierarchicalUserComponentsJson: any[]): { success: boolean, error?: string } => {
    if (!Array.isArray(hierarchicalUserComponentsJson)) return { success: false, error: "Data must be an array." };
    
    let success = false;
    let error: string | undefined;

    updateStateWithHistory(prev => {
        try {
            const flatList = flattenComponentsFromModalJson(hierarchicalUserComponentsJson, DEFAULT_CONTENT_LAZY_COLUMN_ID);
            const newBaseComponents = createInitialComponents();
            
            const contentArea = newBaseComponents.find(c => c.id === DEFAULT_CONTENT_LAZY_COLUMN_ID)!;
            contentArea.properties.children = flatList.filter(c => c.parentId === DEFAULT_CONTENT_LAZY_COLUMN_ID).map(c => c.id);
            
            const finalComponents = [...newBaseComponents, ...flatList];
            const allIds = new Set(finalComponents.map(c => c.id));
            if (allIds.size !== finalComponents.length) {
                throw new Error("Duplicate IDs found in JSON.");
            }
            let maxIdNum = 0;
            finalComponents.forEach(c => { const n = parseInt(c.id.split('-').pop() || '0'); if (n > maxIdNum) maxIdNum = n; });
            
            success = true;
            return { components: finalComponents, nextId: maxIdNum + 1, selectedComponentId: DEFAULT_CONTENT_LAZY_COLUMN_ID };
        } catch(e) {
            error = e instanceof Error ? e.message : "An unknown error occurred during component overwrite.";
            return {}; // Return empty object to indicate no state change
        }
    });
    
    if (error) return { success: false, error };
    return { success: true };
  }, [updateStateWithHistory]);

  const moveComponent = React.useCallback((draggedId: string, newParentId: string | null, newIndex?: number) => {
    updateStateWithHistory(prev => {
        const comps = deepClone(prev.components);
        const draggedIdx = comps.findIndex(c => c.id === draggedId);
        if (draggedIdx === -1) return {};
        
        const oldParentId = comps[draggedIdx].parentId;
        if (oldParentId) {
            const oldParentIdx = comps.findIndex(c => c.id === oldParentId);
            if (oldParentIdx !== -1) {
                const p = comps[oldParentIdx];
                p.properties.children = p.properties.children?.filter(id => id !== draggedId);
            }
        }
        
        comps[draggedIdx].parentId = newParentId;

        if (newParentId) {
            const newParentIdx = comps.findIndex(c => c.id === newParentId);
            if (newParentIdx !== -1) {
                const p = comps[newParentIdx];
                const children = p.properties.children || [];
                if (newIndex !== undefined && newIndex >= 0) children.splice(newIndex, 0, draggedId);
                else children.push(draggedId);
                p.properties.children = children;
            }
        }
        
        return { components: comps, selectedComponentId: draggedId };
    });
  }, [updateStateWithHistory]);

  const deleteCustomComponentTemplate = React.useCallback(async (templateId: string, firestoreId?: string) => {
    if (dbInstance && firestoreId) {
        try {
            await deleteDoc(doc(dbInstance, CUSTOM_TEMPLATES_COLLECTION, firestoreId));
            setDesignState(prev => ({ ...prev, customComponentTemplates: prev.customComponentTemplates.filter(t => t.templateId !== templateId) }));
            return { success: true, message: "Template deleted from Firestore." };
        } catch (e) {
            return { success: false, message: "Could not delete from Firestore." };
        }
    }
    setDesignState(prev => ({ ...prev, customComponentTemplates: prev.customComponentTemplates.filter(t => t.templateId !== templateId) }));
    return { success: true, message: "Template deleted locally." };
  }, [dbInstance]);

  const renameCustomComponentTemplate = React.useCallback(async (templateId: string, newName: string, firestoreId?: string) => {
    if (dbInstance && firestoreId) {
        try {
            await updateDoc(doc(dbInstance, CUSTOM_TEMPLATES_COLLECTION, firestoreId), { name: newName });
            setDesignState(prev => ({ ...prev, customComponentTemplates: prev.customComponentTemplates.map(t => t.templateId === templateId ? { ...t, name: newName } : t) }));
            return { success: true, message: "Template renamed in Firestore." };
        } catch (e) {
            return { success: false, message: "Could not rename in Firestore." };
        }
    }
    setDesignState(prev => ({ ...prev, customComponentTemplates: prev.customComponentTemplates.map(t => t.templateId === templateId ? { ...t, name: newName } : t) }));
    return { success: true, message: "Template renamed locally." };
  }, [dbInstance]);

  const saveCurrentCanvasAsLayout = React.useCallback(async (name: string) => {
    const timestamp = Date.now();
    const layoutId = `layout-${timestamp}`;
    const newLayout: SavedLayout = { layoutId, name, components: deepClone(designState.components), nextId: designState.nextId, timestamp };
    setDesignState(prev => ({ ...prev, savedLayouts: [newLayout, ...prev.savedLayouts].sort((a,b) => (b.timestamp||0) - (a.timestamp||0)) }));
    if (dbInstance) {
        try {
            await setDoc(doc(dbInstance, SAVED_LAYOUTS_COLLECTION, layoutId), sanitizeForFirestore(newLayout));
            return { success: true, message: `Layout "${name}" saved and synced.` };
        } catch (e) {
            return { success: false, message: "Layout saved locally, but sync failed." };
        }
    }
    return { success: true, message: `Layout "${name}" saved locally.` };
  }, [designState.components, designState.nextId, dbInstance]);

  const loadLayoutToCanvas = React.useCallback((layoutId: string): {success: boolean, message: string} => {
    const layout = designState.savedLayouts.find(l => l.layoutId === layoutId);
    if (!layout) return { success: false, message: "Layout not found." };
    
    updateStateWithHistory(prev => ({
      components: layout.components,
      nextId: layout.nextId,
      selectedComponentId: layout.components.find(c => c.parentId === null)?.id || null,
      editingLayoutInfo: null,
      editingTemplateInfo: null,
    }));

    return { success: true, message: `Layout "${layout.name}" loaded.` };
  }, [designState.savedLayouts, updateStateWithHistory]);

  const deleteSavedLayout = React.useCallback(async (layoutId: string, firestoreId?: string) => {
    if (dbInstance && firestoreId) {
        try {
            await deleteDoc(doc(dbInstance, SAVED_LAYOUTS_COLLECTION, firestoreId));
            setDesignState(prev => ({ ...prev, savedLayouts: prev.savedLayouts.filter(l => l.layoutId !== layoutId) }));
            return { success: true, message: "Layout deleted from Firestore." };
        } catch (e) {
            return { success: false, message: "Could not delete layout from Firestore." };
        }
    }
    setDesignState(prev => ({ ...prev, savedLayouts: prev.savedLayouts.filter(l => l.layoutId !== layoutId) }));
    return { success: true, message: "Layout deleted locally." };
  }, [dbInstance]);

  const renameSavedLayout = React.useCallback(async (layoutId: string, newName: string, firestoreId?: string) => {
    if (dbInstance && firestoreId) {
        try {
            await updateDoc(doc(dbInstance, SAVED_LAYOUTS_COLLECTION, firestoreId), { name: newName });
            setDesignState(prev => ({ ...prev, savedLayouts: prev.savedLayouts.map(l => l.layoutId === layoutId ? { ...l, name: newName } : l) }));
            return { success: true, message: "Layout renamed in Firestore." };
        } catch (e) {
            return { success: false, message: "Could not rename layout." };
        }
    }
    setDesignState(prev => ({ ...prev, savedLayouts: prev.savedLayouts.map(l => l.layoutId === layoutId ? { ...l, name: newName } : l) }));
    return { success: true, message: "Layout renamed locally." };
  }, [dbInstance]);
  
  const loadTemplateForEditing = React.useCallback((templateId: string): {success: boolean, message: string} => {
    const template = designState.customComponentTemplates.find(t => t.templateId === templateId);
    if (!template) return { success: false, message: "Template not found."};

    let maxId = 0;
    template.componentTree.forEach(c => { const n = parseInt(c.id.split('-').pop() || '0'); if (n > maxId) maxId = n; });
    
    updateStateWithHistory(prev => ({
        components: deepClone(template.componentTree),
        nextId: maxId + 1,
        selectedComponentId: template.rootComponentId,
        editingTemplateInfo: { templateId, firestoreId: template.firestoreId, name: template.name },
        editingLayoutInfo: null,
    }));
    return { success: true, message: `Editing template "${template.name}".` };
  }, [designState.customComponentTemplates, updateStateWithHistory]);

  const loadLayoutForEditing = React.useCallback((layoutId: string) => {
    const layout = designState.savedLayouts.find(l => l.layoutId === layoutId);
    if (!layout) return;

    updateStateWithHistory(prev => ({
        components: deepClone(layout.components),
        nextId: layout.nextId,
        selectedComponentId: layout.components.find(c => c.parentId === null)?.id || DEFAULT_CONTENT_LAZY_COLUMN_ID,
        editingTemplateInfo: null,
        editingLayoutInfo: { layoutId, firestoreId: layout.firestoreId, name: layout.name },
    }));
  }, [designState.savedLayouts, updateStateWithHistory]);
  
  const updateCustomTemplate = React.useCallback(async (): Promise<{success: boolean, message: string}> => {
    const { editingTemplateInfo, components } = designState;
    if (!editingTemplateInfo) return { success: false, message: "Not in template editing mode."};
    if (!dbInstance) return { success: false, message: "Database not connected."};

    const rootComponent = components.find(c => c.parentId === null);
    if (!rootComponent) return { success: false, message: "No root component found in the edited template."};

    const updatedTemplate: CustomComponentTemplate = { 
        ...editingTemplateInfo, 
        rootComponentId: rootComponent.id, 
        componentTree: components 
    };

    try {
        await setDoc(doc(dbInstance, CUSTOM_TEMPLATES_COLLECTION, editingTemplateInfo.firestoreId!), sanitizeForFirestore(updatedTemplate));
        
        setDesignState(prev => {
            const newTemplates = prev.customComponentTemplates.map(t => 
                t.templateId === editingTemplateInfo.templateId ? updatedTemplate : t
            );
            return {
                ...prev,
                customComponentTemplates: newTemplates,
                editingTemplateInfo: null, // Exit editing mode
            };
        });
        
        clearDesign(); // Go back to the main canvas
        toast({ title: "Template Updated", description: `Template "${editingTemplateInfo.name}" has been saved.` });
        return { success: true, message: "Template updated and synced."};
    } catch(e) {
        toast({ title: "Update Failed", description: "Could not sync template update. " + (e as Error).message, variant: "destructive" });
        return { success: false, message: "Could not sync template update."};
    }
  }, [designState, clearDesign, dbInstance, toast]);

  const updateSavedLayout = React.useCallback(async (): Promise<{success: boolean, message: string}> => {
    const { editingLayoutInfo, components, nextId } = designState;
    if (!editingLayoutInfo || !dbInstance) return { success: false, message: "Not in layout editing mode or DB not connected."};
    const updatedLayout: SavedLayout = { ...editingLayoutInfo, components, nextId, timestamp: Date.now() };
    try {
        await setDoc(doc(dbInstance, SAVED_LAYOUTS_COLLECTION, editingLayoutInfo.firestoreId!), sanitizeForFirestore(updatedLayout));
        setDesignState(prev => ({...prev, savedLayouts: prev.savedLayouts.map(l => l.layoutId === editingLayoutInfo.layoutId ? updatedLayout : l).sort((a,b) => (b.timestamp||0) - (a.timestamp||0))}));
        clearDesign();
        return { success: true, message: "Layout updated and synced."};
    } catch(e) {
        return { success: false, message: "Could not sync layout update."};
    }
  }, [designState, clearDesign, dbInstance]);

  const undo = React.useCallback(() => {
    setDesignState(prev => {
        if (prev.history.length === 0) return prev;
        const lastState = prev.history[prev.history.length - 1];
        const newFuture = [{components: prev.components, nextId: prev.nextId, selectedComponentId: prev.selectedComponentId}, ...prev.future];
        return { ...prev, ...lastState, future: newFuture, history: prev.history.slice(0, prev.history.length-1) };
    });
  }, []);

  const redo = React.useCallback(() => {
    setDesignState(prev => {
        if (prev.future.length === 0) return prev;
        const nextState = prev.future[0];
        const newHistory = [...prev.history, {components: prev.components, nextId: prev.nextId, selectedComponentId: prev.selectedComponentId}];
        return { ...prev, ...nextState, future: prev.future.slice(1), history: newHistory };
    });
  }, []);

  const copyComponent = React.useCallback((id: string): {success: boolean, message?: string} => {
    const compToCopy = getComponentById(id);
    if (!compToCopy || CORE_SCAFFOLD_ELEMENT_IDS.includes(id)) {
        return { success: false, message: "Cannot copy this component." };
    }
    const collectDescendants = (compId: string): DesignComponent[] => {
        const comp = getComponentById(compId);
        if (!comp) return [];
        let descendants = [deepClone(comp)];
        if (comp.properties.children) {
            comp.properties.children.forEach(cid => {
                descendants = [...descendants, ...collectDescendants(cid)];
            });
        }
        return descendants;
    };
    const copiedTree = collectDescendants(id);
    if (copiedTree.length > 0) copiedTree[0].parentId = null;
    setDesignState(prev => ({ ...prev, clipboard: copiedTree }));
    return { success: true, message: `"${compToCopy.name}" copied.` };
  }, [getComponentById]);

  const pasteComponent = React.useCallback((targetParentId?: string | null): {success: boolean, message?: string} => {
    const { clipboard } = designState;
    if (!clipboard) {
        return { success: false, message: "Clipboard is empty." };
    }
  
    let success = false;
    let message = "";

    updateStateWithHistory(prev => {
        const { components, nextId, selectedComponentId, customComponentTemplates } = prev;
        const newComponents = deepClone(components);
        let newNextId = nextId;

        const idMap: Record<string, string> = {};
        const pastedComps: DesignComponent[] = clipboard.map(c => {
            const newId = `comp-${newNextId++}`;
            idMap[c.id] = newId;
            return { ...deepClone(c), id: newId };
        });

        pastedComps.forEach(c => {
            if (c.parentId) c.parentId = idMap[c.parentId];
            if (c.properties.children) c.properties.children = c.properties.children.map(cid => idMap[cid]);
        });
        
        const rootPasted = pastedComps.find(c => c.parentId === null)!;
        
        let parentId = targetParentId;
        if(parentId === undefined) {
            const selected = newComponents.find(c => c.id === selectedComponentId);
            parentId = selected ? (isContainerType(selected.type, customComponentTemplates) ? selected.id : selected.parentId) : DEFAULT_CONTENT_LAZY_COLUMN_ID;
        }
        if (!parentId) parentId = DEFAULT_CONTENT_LAZY_COLUMN_ID;
        rootPasted.parentId = parentId;

        const parentIdx = newComponents.findIndex(c => c.id === parentId);
        if (parentIdx === -1) {
            success = false;
            message = "Target parent not found.";
            return {};
        }

        newComponents.push(...pastedComps);
        const parent = newComponents[parentIdx];
        parent.properties.children = [...(parent.properties.children || []), rootPasted.id];

        success = true;
        message = `Pasted "${rootPasted.name}".`;
        
        return { components: newComponents, nextId: newNextId, selectedComponentId: rootPasted.id };
    });

    return { success, message };
  }, [designState, updateStateWithHistory]);

  const addImageToGallery = React.useCallback(async (url: string): Promise<{success: boolean, message: string}> => {
    try { new URL(url); } catch (_) { return { success: false, message: "Invalid URL."}; }
    const newImage: GalleryImage = { id: `gallery-${Date.now()}`, url, timestamp: Date.now() };
    const newGallery = [newImage, ...designState.galleryImages].sort((a,b) => b.timestamp - a.timestamp);
    localStorage.setItem(GALLERY_IMAGES_COLLECTION, JSON.stringify(newGallery));
    setDesignState(prev => ({ ...prev, galleryImages: newGallery }));
    return { success: true, message: "Image Added." };
  }, [designState.galleryImages]);

  const removeImageFromGallery = React.useCallback(async (id: string): Promise<{success: boolean, message: string}> => {
    const newGallery = designState.galleryImages.filter(img => img.id !== id);
    localStorage.setItem(GALLERY_IMAGES_COLLECTION, JSON.stringify(newGallery));
    setDesignState(prev => ({ ...prev, galleryImages: newGallery }));
    return { success: true, message: "Image Removed." };
  }, [designState.galleryImages]);

  const contextValue: DesignContextType = {
    ...designState,
    addComponent, deleteComponent, selectComponent, updateComponent, updateComponentPosition,
    getComponentById, clearDesign, overwriteComponents, moveComponent,
    saveSelectedAsCustomTemplate, deleteCustomComponentTemplate, renameCustomComponentTemplate,
    saveCurrentCanvasAsLayout, loadLayoutToCanvas, deleteSavedLayout, renameSavedLayout,
    loadTemplateForEditing, updateCustomTemplate, loadLayoutForEditing, updateSavedLayout,
    undo, redo, copyComponent, pasteComponent, addImageToGallery, removeImageFromGallery,
    zoomLevel, setZoomLevel,
  };

  if (!isClient) {
    const dummyContext = initialDesignState;
    return (
      <DesignContext.Provider value={{...dummyContext, getComponentById: (id: string) => dummyContext.components.find(c => c.id === id)} as any}>
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
  const context = React.useContext(DesignContext);
  if (context === undefined) {
    throw new Error('useDesign must be used within a DesignProvider');
  }
  return context;
};

export { DesignContext };
    
    





    