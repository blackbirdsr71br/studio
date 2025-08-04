
'use client';

import type { ReactNode} from 'react';
import React, { useState, useEffect, useCallback } from 'react';
import type { DesignComponent, DesignState, ComponentType, BaseComponentProps, CustomComponentTemplate, SavedLayout, GalleryImage, Screen } from '@/types/compose-spec';
import { getDefaultProperties, CUSTOM_COMPONENT_TYPE_PREFIX, isContainerType, getComponentDisplayName, ROOT_SCAFFOLD_ID, DEFAULT_CONTENT_LAZY_COLUMN_ID, DEFAULT_TOP_APP_BAR_ID, DEFAULT_BOTTOM_NAV_BAR_ID, CORE_SCAFFOLD_ELEMENT_IDS } from '@/types/compose-spec';
import { db } from '@/lib/firebase';
import { collection, doc, setDoc, getDocs, deleteDoc, updateDoc, query, orderBy } from "firebase/firestore";

interface DesignContextType extends DesignState {
  // Methods for the active screen
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

  // Methods for managing screens
  addScreen: (name?: string, componentsToCopy?: DesignComponent[], nextIdToUse?: number) => string;
  deleteScreen: (screenId: string) => void;
  renameScreen: (screenId: string, newName: string) => void;
  setActiveScreen: (screenId: string) => void;
  duplicateScreen: (screenId: string) => void;
  
  // Methods for global items (templates, layouts, gallery)
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
  clearDesign: () => void; // Resets the active screen
  addImageToGallery: (url: string) => Promise<{success: boolean, message: string}>;
  removeImageFromGallery: (id: string) => Promise<{success: boolean, message: string}>;
}


const DesignContext = React.createContext<DesignContextType | undefined>(undefined);

const CUSTOM_TEMPLATES_COLLECTION = 'customComponentTemplates';
const SAVED_LAYOUTS_COLLECTION = 'savedLayouts';
const GALLERY_IMAGES_COLLECTION = 'galleryImages';


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

// Creates a single, fresh screen with a default scaffold structure.
export function createNewScreen(id: string, name: string, nextIdStart: number): Screen {
  const scaffoldProps = getDefaultProperties('Scaffold', ROOT_SCAFFOLD_ID);
  const topAppBarProps = getDefaultProperties('TopAppBar', DEFAULT_TOP_APP_BAR_ID);
  const contentLazyColumnProps = getDefaultProperties('LazyColumn', DEFAULT_CONTENT_LAZY_COLUMN_ID);
  const bottomNavBarProps = getDefaultProperties('BottomNavigationBar', DEFAULT_BOTTOM_NAV_BAR_ID);
  
  // Create default nav items for a new screen
  let currentNextId = nextIdStart;
  const navItems = ['Home', 'Store', 'Benefits', 'Profile'].map((item, index) => {
    const navItemId = `comp-${currentNextId++}`;
    return {
      id: navItemId,
      type: 'BottomNavigationItem',
      name: `${item} Nav Item`,
      properties: { ...getDefaultProperties('BottomNavigationItem', navItemId), text: item, iconName: item },
      parentId: DEFAULT_BOTTOM_NAV_BAR_ID,
    } as DesignComponent;
  });

  const rootScaffold: DesignComponent = {
    id: ROOT_SCAFFOLD_ID,
    type: 'Scaffold',
    name: 'Root Scaffold',
    properties: {
      ...scaffoldProps,
      children: [DEFAULT_TOP_APP_BAR_ID, DEFAULT_CONTENT_LAZY_COLUMN_ID, DEFAULT_BOTTOM_NAV_BAR_ID],
    },
    parentId: null,
  };

  const topAppBar: DesignComponent = {
    id: DEFAULT_TOP_APP_BAR_ID,
    type: 'TopAppBar',
    name: 'Top App Bar',
    properties: { ...topAppBarProps, title: name },
    parentId: ROOT_SCAFFOLD_ID,
  };

  const contentLazyColumn: DesignComponent = {
    id: DEFAULT_CONTENT_LAZY_COLUMN_ID,
    type: 'LazyColumn',
    name: 'Main Content Area',
    properties: {
      ...contentLazyColumnProps,
      children: [],
    },
    parentId: ROOT_SCAFFOLD_ID,
  };

  const bottomNavBar: DesignComponent = {
    id: DEFAULT_BOTTOM_NAV_BAR_ID,
    type: 'BottomNavigationBar',
    name: 'Bottom Navigation Bar',
    properties: {
      ...bottomNavBarProps,
      children: navItems.map(item => item.id),
    },
    parentId: ROOT_SCAFFOLD_ID,
  };

  return {
    id,
    name,
    components: [rootScaffold, topAppBar, contentLazyColumn, bottomNavBar, ...navItems],
    nextId: currentNextId,
  };
}

// Generates the initial state for the entire application, including one default screen.
const createInitialDesignState = (): DesignState => {
  const firstScreenId = `screen-${Date.now()}`;
  const firstScreen = createNewScreen(firstScreenId, 'Screen 1', 1);

  return {
    screens: [firstScreen],
    activeScreenId: firstScreen.id,
    components: firstScreen.components,
    selectedComponentId: DEFAULT_CONTENT_LAZY_COLUMN_ID,
    nextId: firstScreen.nextId,
    customComponentTemplates: [],
    savedLayouts: [],
    galleryImages: [],
    editingTemplateInfo: null,
    editingLayoutInfo: null,
    history: [],
    future: [],
    clipboard: null,
  };
}

const initialDesignState = createInitialDesignState();


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

  const updateStateWithHistory = React.useCallback((
    updater: (prevState: DesignState) => Partial<DesignState>,
  ) => {
    setDesignState(prev => {
      const updates = updater(prev);
      if (Object.keys(updates).length === 0) return prev;
  
      const newHistory = [...prev.history, { screens: prev.screens, activeScreenId: prev.activeScreenId }];
      if (newHistory.length > 50) newHistory.shift();
      
      const nextState: DesignState = {
        ...prev,
        ...updates,
        history: newHistory,
        future: [],
      };
      
      // If the active screen has changed, we also need to update the top-level component/nextId pointers
      if (updates.activeScreenId && updates.activeScreenId !== prev.activeScreenId) {
        const newActiveScreen = (updates.screens || prev.screens).find(s => s.id === updates.activeScreenId);
        if (newActiveScreen) {
          nextState.components = newActiveScreen.components;
          nextState.nextId = newActiveScreen.nextId;
        }
      }
      
      // If the screens array itself is updated, ensure top-level pointers are in sync
      if (updates.screens) {
          const currentActiveScreen = updates.screens.find(s => s.id === nextState.activeScreenId);
          if (currentActiveScreen) {
              nextState.components = currentActiveScreen.components;
              nextState.nextId = currentActiveScreen.nextId;
          }
      }

      return nextState;
    });
  }, []);

  React.useEffect(() => {
    setIsClient(true);
    const loadInitialData = async () => {
      try {
        let galleryToSet: GalleryImage[] = [];
        const savedImagesJson = localStorage.getItem(GALLERY_IMAGES_COLLECTION);
        
        if (savedImagesJson) {
          const savedImages = JSON.parse(savedImagesJson);
          if (Array.isArray(savedImages) && savedImages.length > 0) {
            galleryToSet = savedImages;
          } else {
            galleryToSet = defaultGalleryImages;
            localStorage.setItem(GALLERY_IMAGES_COLLECTION, JSON.stringify(galleryToSet));
          }
        } else {
          galleryToSet = defaultGalleryImages;
          localStorage.setItem(GALLERY_IMAGES_COLLECTION, JSON.stringify(galleryToSet));
        }
        setDesignState(prev => ({ ...prev, galleryImages: galleryToSet.sort((a, b) => b.timestamp - a.timestamp) }));
      } catch (error) {
        console.error("Error loading gallery images from localStorage:", error);
        setDesignState(prev => ({ ...prev, galleryImages: defaultGalleryImages.sort((a, b) => b.timestamp - a.timestamp) }));
      }

      if (!db) {
        console.warn("Firestore not available. Loading from local only.");
        return;
      }
      try {
        const templatesQuery = query(collection(db, CUSTOM_TEMPLATES_COLLECTION));
        const templatesSnapshot = await getDocs(templatesQuery);
        const templates: CustomComponentTemplate[] = templatesSnapshot.docs.map(docSnap => ({
          firestoreId: docSnap.id,
          ...docSnap.data(),
        } as CustomComponentTemplate));
        setDesignState(prev => ({ ...prev, customComponentTemplates: templates }));
      } catch (error) {
        console.error("Error loading custom templates:", error);
      }
      try {
        const layoutsQuery = query(collection(db, SAVED_LAYOUTS_COLLECTION), orderBy("timestamp", "desc"));
        const layoutsSnapshot = await getDocs(layoutsQuery);
        const layouts: SavedLayout[] = layoutsSnapshot.docs.map(docSnap => ({
          firestoreId: docSnap.id,
          ...docSnap.data(),
        } as SavedLayout));
        setDesignState(prev => ({ ...prev, savedLayouts: layouts }));
      } catch (error) {
        console.error("Error loading saved layouts:", error);
      }
    };
    loadInitialData();
  }, []); 

  const getComponentById = React.useCallback(
    (id: string) => designState.components.find(comp => comp.id === id),
    [designState.components]
  );
  
  const modifyActiveScreen = (updater: (screen: Screen) => Screen) => {
    updateStateWithHistory(prev => {
      const newScreens = prev.screens.map(s => {
        if (s.id === prev.activeScreenId) {
          return updater(s);
        }
        return s;
      });
      return { screens: newScreens };
    });
  }

  const addComponent = React.useCallback((
    typeOrTemplateId: ComponentType | string,
    parentIdOrNull: string | null = DEFAULT_CONTENT_LAZY_COLUMN_ID,
    _dropPosition?: { x: number; y: number },
    index?: number
  ) => {
    modifyActiveScreen(screen => {
      const newScreen = deepClone(screen);
      let { components: updatedComponentsList, nextId: currentNextId } = newScreen;

      let finalSelectedComponentId = '';
      let componentsToAdd: DesignComponent[] = [];
      let effectiveParentId = parentIdOrNull;
  
      const rootScaffold = updatedComponentsList.find(c => c.id === ROOT_SCAFFOLD_ID);
      if (!rootScaffold) return screen;
      
      if (typeOrTemplateId === 'TopAppBar') effectiveParentId = ROOT_SCAFFOLD_ID;
      else if (typeOrTemplateId === 'BottomNavigationBar') effectiveParentId = ROOT_SCAFFOLD_ID;
      else if (parentIdOrNull === ROOT_SCAFFOLD_ID) effectiveParentId = DEFAULT_CONTENT_LAZY_COLUMN_ID;
      else if (!parentIdOrNull) effectiveParentId = DEFAULT_CONTENT_LAZY_COLUMN_ID;
  
      let parentComponent = updatedComponentsList.find(c => c.id === effectiveParentId);
      if (!parentComponent || !isContainerType(parentComponent.type, designState.customComponentTemplates)) {
        effectiveParentId = DEFAULT_CONTENT_LAZY_COLUMN_ID;
      }
  
      if (typeOrTemplateId.startsWith(CUSTOM_COMPONENT_TYPE_PREFIX)) {
        const template = designState.customComponentTemplates.find(t => t.templateId === typeOrTemplateId);
        if (!template) return screen;
  
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
            if (isContainerType(parent.type, designState.customComponentTemplates) || parent.templateIdRef) {
                const childIdsToAdd = componentsToAdd.filter(c => c.parentId === effectiveParentId).map(c => c.id);
                let children = [...(parent.properties.children || [])];
                if (index !== undefined && index >= 0) children.splice(index, 0, ...childIdsToAdd);
                else children.push(...childIdsToAdd);
                updatedComponentsList[parentIdx] = { ...parent, properties: { ...parent.properties, children }};
            }
        }
      }
      
      newScreen.components = updatedComponentsList;
      newScreen.nextId = currentNextId;
      setDesignState(prev => ({...prev, selectedComponentId: finalSelectedComponentId || prev.selectedComponentId}));
      return newScreen;
    });
  }, [designState.customComponentTemplates, modifyActiveScreen]);


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

    setDesignState(prev => ({ ...prev, customComponentTemplates: [...prev.customComponentTemplates, newTemplate] }));

    if (db) {
      try {
        await setDoc(doc(db, CUSTOM_TEMPLATES_COLLECTION, firestoreId), sanitizeForFirestore(newTemplate));
        return { success: true, message: `Template "${name}" saved and synced.`};
      } catch (e) {
        console.error("Firestore save error:", e);
        return { success: false, message: "Template saved locally, but sync failed." };
      }
    }
    return { success: true, message: `Template "${name}" saved locally.` };
  }, [designState.selectedComponentId, getComponentById]);


  const deleteComponent = React.useCallback((id: string) => {
    modifyActiveScreen(screen => {
      if (CORE_SCAFFOLD_ELEMENT_IDS.includes(id)) return screen;
      
      const newScreen = deepClone(screen);
      const { components: currentComponents } = newScreen;

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
      const newSelectedId = idsToDelete.has(designState.selectedComponentId || "") ? (parentId || DEFAULT_CONTENT_LAZY_COLUMN_ID) : designState.selectedComponentId;
      setDesignState(prev => ({...prev, selectedComponentId: newSelectedId}));
      
      newScreen.components = newComps;
      return newScreen;
    });
  }, [modifyActiveScreen, designState.selectedComponentId]);


  const selectComponent = React.useCallback((id: string | null) => {
    setDesignState(prev => ({ ...prev, selectedComponentId: id }));
  }, []);

  const updateComponent = React.useCallback((id: string, updates: { name?: string; properties?: Partial<BaseComponentProps>; templateIdRef?: string }) => {
    modifyActiveScreen(screen => {
        const newScreen = deepClone(screen);
        newScreen.components = newScreen.components.map(comp => {
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
        return newScreen;
    });
  }, [modifyActiveScreen]);

  const updateComponentPosition = React.useCallback((_id: string, _position: { x: number; y: number }) => {
     console.warn("updateComponentPosition is deprecated.");
  }, []);

  const clearDesign = React.useCallback(() => {
    modifyActiveScreen(screen => {
      const newScreenContent = createNewScreen(screen.id, screen.name, 1);
      return newScreenContent;
    });
    setDesignState(prev => ({...prev, editingLayoutInfo: null, editingTemplateInfo: null}));
  }, [modifyActiveScreen]);

  const overwriteComponents = React.useCallback((hierarchicalUserComponentsJson: any[]): { success: boolean, error?: string } => {
    if (!Array.isArray(hierarchicalUserComponentsJson)) return { success: false, error: "Data must be an array." };
    
    let error: string | undefined;
    modifyActiveScreen(screen => {
        const flatList = flattenComponentsFromModalJson(hierarchicalUserComponentsJson, DEFAULT_CONTENT_LAZY_COLUMN_ID);
        const newScreen = createNewScreen(screen.id, screen.name, screen.nextId);
        
        const contentArea = newScreen.components.find(c => c.id === DEFAULT_CONTENT_LAZY_COLUMN_ID)!;
        contentArea.properties.children = flatList.filter(c => c.parentId === DEFAULT_CONTENT_LAZY_COLUMN_ID).map(c => c.id);
        
        const finalComponents = [...newScreen.components, ...flatList];
        const allIds = new Set(finalComponents.map(c => c.id));
        if (allIds.size !== finalComponents.length) {
            error = "Duplicate IDs found in JSON.";
            return screen; // Return original screen on error
        }
        let maxIdNum = 0;
        finalComponents.forEach(c => { const n = parseInt(c.id.split('-').pop() || '0'); if (n > maxIdNum) maxIdNum = n; });
        
        newScreen.components = finalComponents;
        newScreen.nextId = maxIdNum + 1;
        
        setDesignState(prev => ({...prev, selectedComponentId: DEFAULT_CONTENT_LAZY_COLUMN_ID}));
        return newScreen;
    });
    
    if (error) return { success: false, error };
    return { success: true };
  }, [modifyActiveScreen]);

  const moveComponent = React.useCallback((draggedId: string, newParentId: string | null, newIndex?: number) => {
    modifyActiveScreen(screen => {
        const newScreen = deepClone(screen);
        let comps = newScreen.components;
        const draggedIdx = comps.findIndex(c => c.id === draggedId);
        if (draggedIdx === -1) return screen;
        
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
                if (newIndex !== undefined) children.splice(newIndex, 0, draggedId);
                else children.push(draggedId);
                p.properties.children = children;
            }
        }
        
        setDesignState(prev => ({...prev, selectedComponentId: draggedId}));
        newScreen.components = comps;
        return newScreen;
    });
  }, [modifyActiveScreen]);

  const deleteCustomComponentTemplate = React.useCallback(async (templateId: string, firestoreId?: string) => {
    if (db && firestoreId) {
        try {
            await deleteDoc(doc(db, CUSTOM_TEMPLATES_COLLECTION, firestoreId));
            setDesignState(prev => ({ ...prev, customComponentTemplates: prev.customComponentTemplates.filter(t => t.templateId !== templateId) }));
            return { success: true, message: "Template deleted from Firestore." };
        } catch (e) {
            return { success: false, message: "Could not delete from Firestore." };
        }
    }
    setDesignState(prev => ({ ...prev, customComponentTemplates: prev.customComponentTemplates.filter(t => t.templateId !== templateId) }));
    return { success: true, message: "Template deleted locally." };
  }, []);

  const renameCustomComponentTemplate = React.useCallback(async (templateId: string, newName: string, firestoreId?: string) => {
    if (db && firestoreId) {
        try {
            await updateDoc(doc(db, CUSTOM_TEMPLATES_COLLECTION, firestoreId), { name: newName });
            setDesignState(prev => ({ ...prev, customComponentTemplates: prev.customComponentTemplates.map(t => t.templateId === templateId ? { ...t, name: newName } : t) }));
            return { success: true, message: "Template renamed in Firestore." };
        } catch (e) {
            return { success: false, message: "Could not rename in Firestore." };
        }
    }
    setDesignState(prev => ({ ...prev, customComponentTemplates: prev.customComponentTemplates.map(t => t.templateId === templateId ? { ...t, name: newName } : t) }));
    return { success: true, message: "Template renamed locally." };
  }, []);

  const saveCurrentCanvasAsLayout = React.useCallback(async (name: string) => {
    const timestamp = Date.now();
    const layoutId = `layout-${timestamp}`;
    const newLayout: SavedLayout = { layoutId, name, components: deepClone(designState.components), nextId: designState.nextId, timestamp };
    setDesignState(prev => ({ ...prev, savedLayouts: [newLayout, ...prev.savedLayouts].sort((a,b) => (b.timestamp||0) - (a.timestamp||0)) }));
    if (db) {
        try {
            await setDoc(doc(db, SAVED_LAYOUTS_COLLECTION, layoutId), sanitizeForFirestore(newLayout));
            return { success: true, message: `Layout "${name}" saved and synced.` };
        } catch (e) {
            return { success: false, message: "Layout saved locally, but sync failed." };
        }
    }
    return { success: true, message: `Layout "${name}" saved locally.` };
  }, [designState.components, designState.nextId]);

  const loadLayoutToCanvas = React.useCallback((layoutId: string): {success: boolean, message: string} => {
    const layout = designState.savedLayouts.find(l => l.layoutId === layoutId);
    if (!layout) return { success: false, message: "Layout not found." };
    
    modifyActiveScreen(screen => {
      const newScreen = {
        ...screen,
        components: layout.components,
        nextId: layout.nextId,
      };
      setDesignState(prev => ({...prev, editingLayoutInfo: null, editingTemplateInfo: null}));
      return newScreen;
    });

    return { success: true, message: `Layout "${layout.name}" loaded.` };
  }, [designState.savedLayouts, modifyActiveScreen]);

  const deleteSavedLayout = React.useCallback(async (layoutId: string, firestoreId?: string) => {
    if (db && firestoreId) {
        try {
            await deleteDoc(doc(db, SAVED_LAYOUTS_COLLECTION, firestoreId));
            setDesignState(prev => ({ ...prev, savedLayouts: prev.savedLayouts.filter(l => l.layoutId !== layoutId) }));
            return { success: true, message: "Layout deleted from Firestore." };
        } catch (e) {
            return { success: false, message: "Could not delete layout from Firestore." };
        }
    }
    setDesignState(prev => ({ ...prev, savedLayouts: prev.savedLayouts.filter(l => l.layoutId !== layoutId) }));
    return { success: true, message: "Layout deleted locally." };
  }, []);

  const renameSavedLayout = React.useCallback(async (layoutId: string, newName: string, firestoreId?: string) => {
    if (db && firestoreId) {
        try {
            await updateDoc(doc(db, SAVED_LAYOUTS_COLLECTION, firestoreId), { name: newName });
            setDesignState(prev => ({ ...prev, savedLayouts: prev.savedLayouts.map(l => l.layoutId === layoutId ? { ...l, name: newName } : l) }));
            return { success: true, message: "Layout renamed in Firestore." };
        } catch (e) {
            return { success: false, message: "Could not rename layout." };
        }
    }
    setDesignState(prev => ({ ...prev, savedLayouts: prev.savedLayouts.map(l => l.layoutId === layoutId ? { ...l, name: newName } : l) }));
    return { success: true, message: "Layout renamed locally." };
  }, []);
  
  const loadTemplateForEditing = React.useCallback((templateId: string): {success: boolean, message: string} => {
    const template = designState.customComponentTemplates.find(t => t.templateId === templateId);
    if (!template) return { success: false, message: "Template not found."};

    let maxId = 0;
    template.componentTree.forEach(c => { const n = parseInt(c.id.split('-').pop() || '0'); if (n > maxId) maxId = n; });
    
    // This action replaces the entire design state temporarily
    setDesignState(prev => ({
        ...prev,
        components: deepClone(template.componentTree),
        nextId: maxId + 1,
        selectedComponentId: template.rootComponentId,
        editingTemplateInfo: { templateId, firestoreId: template.firestoreId, name: template.name },
        editingLayoutInfo: null,
    }));
    return { success: true, message: `Editing template "${template.name}".` };
  }, [designState.customComponentTemplates]);

  const loadLayoutForEditing = React.useCallback((layoutId: string) => {
    const layout = designState.savedLayouts.find(l => l.layoutId === layoutId);
    if (!layout) return;

    // This action replaces the entire design state temporarily
    setDesignState(prev => ({
        ...prev,
        components: deepClone(layout.components),
        nextId: layout.nextId,
        selectedComponentId: layout.components.find(c => c.parentId === null)?.id || DEFAULT_CONTENT_LAZY_COLUMN_ID,
        editingTemplateInfo: null,
        editingLayoutInfo: { layoutId, firestoreId: layout.firestoreId, name: layout.name },
    }));
  }, [designState.savedLayouts]);
  
  const updateCustomTemplate = React.useCallback(async (): Promise<{success: boolean, message: string}> => {
    const { editingTemplateInfo, components } = designState;
    if (!editingTemplateInfo || !db) return { success: false, message: "Not in template editing mode or DB not connected."};
    const rootComponent = components.find(c => c.parentId === null);
    if (!rootComponent) return { success: false, message: "No root component found."};

    const updatedTemplate: CustomComponentTemplate = { ...editingTemplateInfo, rootComponentId: rootComponent.id, componentTree: components };
    try {
        await setDoc(doc(db, CUSTOM_TEMPLATES_COLLECTION, editingTemplateInfo.firestoreId!), sanitizeForFirestore(updatedTemplate));
        setDesignState(prev => ({...prev, customComponentTemplates: prev.customComponentTemplates.map(t => t.templateId === editingTemplateInfo.templateId ? updatedTemplate : t)}));
        clearDesign();
        return { success: true, message: "Template updated and synced."};
    } catch(e) {
        return { success: false, message: "Could not sync template update."};
    }
  }, [designState, clearDesign]);

  const updateSavedLayout = React.useCallback(async (): Promise<{success: boolean, message: string}> => {
    const { editingLayoutInfo, components, nextId } = designState;
    if (!editingLayoutInfo || !db) return { success: false, message: "Not in layout editing mode or DB not connected."};
    const updatedLayout: SavedLayout = { ...editingLayoutInfo, components, nextId, timestamp: Date.now() };
    try {
        await setDoc(doc(db, SAVED_LAYOUTS_COLLECTION, editingLayoutInfo.firestoreId!), sanitizeForFirestore(updatedLayout));
        setDesignState(prev => ({...prev, savedLayouts: prev.savedLayouts.map(l => l.layoutId === editingLayoutInfo.layoutId ? updatedLayout : l).sort((a,b) => (b.timestamp||0) - (a.timestamp||0))}));
        clearDesign();
        return { success: true, message: "Layout updated and synced."};
    } catch(e) {
        return { success: false, message: "Could not sync layout update."};
    }
  }, [designState, clearDesign]);

  const undo = React.useCallback(() => {
    setDesignState(prev => {
        if (prev.history.length === 0) return prev;
        const lastState = prev.history[prev.history.length - 1];
        const newHistory = prev.history.slice(0, prev.history.length - 1);
        const newFuture = [{screens: prev.screens, activeScreenId: prev.activeScreenId}, ...prev.future];

        const activeScreen = lastState.screens.find(s => s.id === lastState.activeScreenId);

        return {
            ...prev,
            ...lastState,
            components: activeScreen?.components || [],
            nextId: activeScreen?.nextId || 0,
            selectedComponentId: null,
            future: newFuture,
            history: newHistory,
        };
    });
  }, []);

  const redo = React.useCallback(() => {
    setDesignState(prev => {
        if (prev.future.length === 0) return prev;
        const nextState = prev.future[0];
        const newFuture = prev.future.slice(1);
        const newHistory = [...prev.history, {screens: prev.screens, activeScreenId: prev.activeScreenId}];
        
        const activeScreen = nextState.screens.find(s => s.id === nextState.activeScreenId);

        return {
            ...prev,
            ...nextState,
            components: activeScreen?.components || [],
            nextId: activeScreen?.nextId || 0,
            selectedComponentId: null,
            history: newHistory,
            future: newFuture,
        };
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
  
    let pasteSucceeded = false;
    let pasteMessage = "";

    modifyActiveScreen(screen => {
        const newScreen = deepClone(screen);
        let nextId = newScreen.nextId;

        const idMap: Record<string, string> = {};
        const newComps: DesignComponent[] = clipboard.map(c => {
            const newId = `comp-${nextId++}`;
            idMap[c.id] = newId;
            return { ...deepClone(c), id: newId };
        });
        newComps.forEach(c => {
            if (c.parentId) c.parentId = idMap[c.parentId];
            if (c.properties.children) c.properties.children = c.properties.children.map(cid => idMap[cid]);
        });
        const rootPasted = newComps.find(c => c.parentId === null)!;
        
        let parentId = targetParentId;
        if(parentId === undefined) {
            const selected = newScreen.components.find(c => c.id === designState.selectedComponentId);
            parentId = selected ? (isContainerType(selected.type, designState.customComponentTemplates) ? selected.id : selected.parentId) : DEFAULT_CONTENT_LAZY_COLUMN_ID;
        }
        if (!parentId) parentId = DEFAULT_CONTENT_LAZY_COLUMN_ID;
        rootPasted.parentId = parentId;

        const parentIdx = newScreen.components.findIndex(c => c.id === parentId);
        if (parentIdx === -1) {
            pasteSucceeded = false;
            pasteMessage = "Target parent not found.";
            return screen;
        }

        newScreen.components.push(...newComps);
        const parent = newScreen.components[parentIdx];
        parent.properties.children = [...(parent.properties.children || []), rootPasted.id];

        pasteSucceeded = true;
        pasteMessage = `Pasted "${rootPasted.name}".`;
        
        setDesignState(prev => ({...prev, selectedComponentId: rootPasted.id}));
        newScreen.nextId = nextId;
        return newScreen;
    });

    return { success: pasteSucceeded, message: pasteMessage };
  }, [designState.clipboard, modifyActiveScreen, designState.selectedComponentId, designState.customComponentTemplates]);

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

  // Screen management
  const addScreen = useCallback((name?: string, componentsToCopy?: DesignComponent[], nextIdToUse?: number): string => {
    const newScreenId = `screen-${Date.now()}`;
    let newScreen: Screen;

    if (componentsToCopy && nextIdToUse !== undefined) {
        newScreen = {
            id: newScreenId,
            name: name || `Screen ${designState.screens.length + 1}`,
            components: deepClone(componentsToCopy),
            nextId: nextIdToUse,
        };
    } else {
        const nextIdForNewScreen = Math.max(...designState.screens.map(s => s.nextId), 0) + 1;
        newScreen = createNewScreen(newScreenId, name || `Screen ${designState.screens.length + 1}`, nextIdForNewScreen);
    }

    updateStateWithHistory(prev => ({
        screens: [...prev.screens, newScreen],
        activeScreenId: newScreenId,
    }));
    return newScreenId;
  }, [updateStateWithHistory, designState.screens]);
  
  const deleteScreen = useCallback((screenId: string) => {
    if (designState.screens.length <= 1) return;
    updateStateWithHistory(prev => {
        const newScreens = prev.screens.filter(s => s.id !== screenId);
        const newActiveScreenId = prev.activeScreenId === screenId ? newScreens[0].id : prev.activeScreenId;
        return { screens: newScreens, activeScreenId: newActiveScreenId };
    });
  }, [designState.screens.length, updateStateWithHistory]);

  const renameScreen = useCallback((screenId: string, newName: string) => {
    updateStateWithHistory(prev => ({
      screens: prev.screens.map(s => s.id === screenId ? { ...s, name: newName } : s)
    }));
  }, [updateStateWithHistory]);

  const setActiveScreen = useCallback((screenId: string) => {
    updateStateWithHistory(prev => {
      if (prev.activeScreenId === screenId) return {};
      return { activeScreenId: screenId };
    });
  }, [updateStateWithHistory]);
  
  const duplicateScreen = useCallback((screenId: string) => {
    const screenToCopy = designState.screens.find(s => s.id === screenId);
    if (screenToCopy) {
      addScreen(`${screenToCopy.name} (Copy)`, screenToCopy.components, screenToCopy.nextId);
    }
  }, [designState.screens, addScreen]);

  const contextValue: DesignContextType = {
    ...designState,
    addComponent, deleteComponent, selectComponent, updateComponent, updateComponentPosition,
    getComponentById, clearDesign, overwriteComponents, moveComponent,
    saveSelectedAsCustomTemplate, deleteCustomComponentTemplate, renameCustomComponentTemplate,
    saveCurrentCanvasAsLayout, loadLayoutToCanvas, deleteSavedLayout, renameSavedLayout,
    loadTemplateForEditing, updateCustomTemplate, loadLayoutForEditing, updateSavedLayout,
    undo, redo, copyComponent, pasteComponent, addImageToGallery, removeImageFromGallery,
    addScreen, deleteScreen, renameScreen, setActiveScreen, duplicateScreen
  };

  if (!isClient) {
    const dummyContext = createInitialDesignState();
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
