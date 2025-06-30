
'use client';

import type { ReactNode} from 'react';
import React, from 'react';
import type { DesignComponent, DesignState, ComponentType, BaseComponentProps, CustomComponentTemplate, SavedLayout } from '@/types/compose-spec';
import { getDefaultProperties, CUSTOM_COMPONENT_TYPE_PREFIX, isCustomComponentType, isContainerType, getComponentDisplayName, ROOT_SCAFFOLD_ID, DEFAULT_CONTENT_LAZY_COLUMN_ID, DEFAULT_TOP_APP_BAR_ID, DEFAULT_BOTTOM_NAV_BAR_ID, CORE_SCAFFOLD_ELEMENT_IDS } from '@/types/compose-spec';
import { db } from '@/lib/firebase';
import { collection, doc, setDoc, getDocs, deleteDoc, updateDoc, query, orderBy } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";


interface DesignContextType extends DesignState {
  addComponent: (typeOrTemplateId: ComponentType | string, parentId?: string | null, dropPosition?: { x: number; y: number }, index?: number) => void;
  deleteComponent: (id: string) => void;
  selectComponent: (id: string | null) => void;
  updateComponent: (id: string, updates: { name?: string; properties?: Partial<BaseComponentProps>; templateIdRef?: string }) => void;
  updateComponentPosition: (id: string, position: { x: number; y: number }) => void;
  getComponentById: (id: string) => DesignComponent | undefined;
  clearDesign: () => void;
  setDesign: (newDesign: DesignState) => void;
  overwriteComponents: (hierarchicalUserComponentsJson: any[]) => { success: boolean, error?: string };
  moveComponent: (draggedId: string, newParentId: string | null, newIndex?: number) => void;
  saveSelectedAsCustomTemplate: (name: string) => Promise<void>;
  deleteCustomComponentTemplate: (templateId: string, firestoreDocId?: string) => Promise<void>;
  renameCustomComponentTemplate: (templateId: string, newName: string, firestoreDocId?: string) => Promise<void>;
  saveCurrentCanvasAsLayout: (name: string) => Promise<void>;
  loadLayoutToCanvas: (layoutId: string) => void;
  deleteSavedLayout: (layoutId: string, firestoreDocId?: string) => Promise<void>;
  renameSavedLayout: (layoutId: string, newName: string, firestoreDocId?: string) => Promise<void>;
  loadTemplateForEditing: (templateId: string) => void;
  updateCustomTemplate: () => Promise<void>;
  loadLayoutForEditing: (layoutId: string) => void;
  updateSavedLayout: () => Promise<void>;
  undo: () => void;
  redo: () => void;
  copyComponent: (id: string) => void;
  pasteComponent: (targetParentId?: string | null) => void;
}

const DesignContext = React.createContext<DesignContextType | undefined>(undefined);

const CUSTOM_TEMPLATES_COLLECTION = 'customComponentTemplates';
const SAVED_LAYOUTS_COLLECTION = 'savedLayouts';


const deepClone = <T>(obj: T): T => {
  return JSON.parse(JSON.stringify(obj));
};

// Helper function to remove properties with undefined values recursively
const sanitizeForFirestore = (obj: any): any => {
  if (obj === null || typeof obj !== 'object') {
    return obj; // Primitives and null are fine
  }

  if (Array.isArray(obj)) {
    // Sanitize each item, then filter out any that became undefined
    return obj.map(item => sanitizeForFirestore(item)).filter(item => item !== undefined);
  }

  const sanitizedObj: { [key: string]: any } = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];
      // Skip original undefined values immediately
      if (value === undefined) {
        continue;
      }
      const sanitizedValue = sanitizeForFirestore(value);
      // Only add the property if its sanitized value is not undefined
      if (sanitizedValue !== undefined) {
        sanitizedObj[key] = sanitizedValue;
      }
    }
  }
  return sanitizedObj;
};


export function createInitialScaffoldDesign(): { components: DesignComponent[], nextId: number, selectedId: string } {
  const scaffoldProps = getDefaultProperties('Scaffold', ROOT_SCAFFOLD_ID);
  const topAppBarProps = getDefaultProperties('TopAppBar', DEFAULT_TOP_APP_BAR_ID);
  const contentLazyColumnProps = getDefaultProperties('LazyColumn', DEFAULT_CONTENT_LAZY_COLUMN_ID);
  const bottomNavBarProps = getDefaultProperties('BottomNavigationBar', DEFAULT_BOTTOM_NAV_BAR_ID);

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
    properties: topAppBarProps,
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
    properties: bottomNavBarProps,
    parentId: ROOT_SCAFFOLD_ID,
  };

  return {
    components: [rootScaffold, topAppBar, contentLazyColumn, bottomNavBar],
    nextId: 1, // Start user component IDs from 1
    selectedId: DEFAULT_CONTENT_LAZY_COLUMN_ID, // Default selection to content area
  };
}


const { components: initialComponents, nextId: initialNextId, selectedId: initialSelectedId } = createInitialScaffoldDesign();
const initialDesignState: DesignState = {
  components: initialComponents,
  selectedComponentId: initialSelectedId,
  nextId: initialNextId,
  customComponentTemplates: [],
  savedLayouts: [],
  editingTemplateInfo: null,
  editingLayoutInfo: null,
  history: [],
  future: [],
  clipboard: null,
};


const flattenComponentsFromModalJson = (
  modalNodes: any[],
  forcedParentId: string // This should be DEFAULT_CONTENT_LAZY_COLUMN_ID for modal JSON
): DesignComponent[] => {
  let flatList: DesignComponent[] = [];

  for (const modalNode of modalNodes) {
    // Ensure modalNode and modalNode.properties exist before destructuring
    const { properties: modalNodeProperties, parentId: _modalNodeOriginalParentId, templateIdRef, ...baseModalNodeData } = modalNode || {};
    const { children: nestedModalChildrenObjects, ...scalarModalProperties } = modalNodeProperties || {};

    // If essential baseModalNodeData (like id, type, name) is missing, skip this node
    if (!baseModalNodeData.id || !baseModalNodeData.type || !baseModalNodeData.name) {
      console.warn("Skipping invalid modal node during flatten:", modalNode);
      continue;
    }
    
    const designComponentProperties: BaseComponentProps = { ...scalarModalProperties };
    let designComponentChildIds: string[] = [];

    if (nestedModalChildrenObjects && Array.isArray(nestedModalChildrenObjects)) {
      // Recursively flatten children, passing the current modalNode.id as their parent context
      const flattenedNestedChildren = flattenComponentsFromModalJson(
        nestedModalChildrenObjects,
        modalNode.id // Children's parentId will be this node's ID
      );
      flatList = flatList.concat(flattenedNestedChildren);
      // Collect IDs of direct children for the current node's properties.children array
      designComponentChildIds = flattenedNestedChildren
        .filter(fc => fc.parentId === modalNode.id)
        .map(fc => fc.id);
    }

    const newDesignComponent: DesignComponent = {
      ...baseModalNodeData,
      // The parentId for top-level items from the modal JSON is forcedParentId (DEFAULT_CONTENT_LAZY_COLUMN_ID)
      // For nested items, their parentId is already set correctly by the recursive call.
      parentId: baseModalNodeData.parentId || forcedParentId,
      properties: {
        ...designComponentProperties,
        children: designComponentChildIds, // This should only contain direct children IDs
      },
      templateIdRef: templateIdRef, // Carry over templateIdRef if present
    };
    flatList.push(newDesignComponent);
  }
  return flatList;
};


export const DesignProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [designState, setDesignState] = React.useState<DesignState>(initialDesignState);
  const [isClient, setIsClient] = React.useState(false);
  const [isLoadingTemplates, setIsLoadingTemplates] = React.useState(true);
  const [isLoadingLayouts, setIsLoadingLayouts] = React.useState(true);
  const { toast } = useToast();

  const updateStateWithHistory = React.useCallback((
    updater: (prevState: DesignState) => Partial<DesignState>,
    actionDescription?: string
  ) => {
    setDesignState(prev => {
        const updates = updater(prev);
        // If components are being updated, manage history.
        if (updates.components) {
            const newHistory = [...prev.history, prev.components];
            // Limit history size to avoid memory issues
            if (newHistory.length > 50) {
                newHistory.shift();
            }
            return {
                ...prev,
                ...updates,
                history: newHistory,
                future: [], // Clear future on new action
            };
        }
        // For non-component updates (like selection), don't alter history.
        return { ...prev, ...updates };
    });
  }, []);


  React.useEffect(() => {
    setIsClient(true);
    const loadInitialData = async () => {
      if (!db) {
        console.warn("Firestore instance (db) is not available. Skipping loading custom templates and layouts.");
        setIsLoadingTemplates(false);
        setIsLoadingLayouts(false);
        toast({ title: "Offline Mode", description: "Cannot connect to database. Changes will be local.", variant: "default" });
        return;
      }
      try {
        setIsLoadingTemplates(true);
        const templatesQuery = query(collection(db, CUSTOM_TEMPLATES_COLLECTION));
        const templatesSnapshot = await getDocs(templatesQuery);
        const templates: CustomComponentTemplate[] = [];
        templatesSnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.templateId && data.name && data.rootComponentId && data.componentTree) {
            templates.push({
              firestoreId: docSnap.id, 
              templateId: data.templateId as string, 
              name: data.name as string,
              rootComponentId: data.rootComponentId as string,
              componentTree: data.componentTree as DesignComponent[],
            });
          } else {
            console.warn("Found invalid custom template in Firestore:", docSnap.id, data);
          }
        });
        setDesignState(prev => ({ ...prev, customComponentTemplates: templates }));
      } catch (error) {
        console.error("Error loading custom templates from Firestore:", error);
        let detail = "Could not load custom templates.";
        if (error instanceof Error) {
            const firebaseError = error as any;
            if (firebaseError.code) {
                detail += ` (Error: ${firebaseError.code} - ${firebaseError.message})`;
            } else {
                detail += ` (${firebaseError.message})`;
            }
        }
        toast({ title: "Loading Failed", description: detail, variant: "destructive" });
      } finally {
        setIsLoadingTemplates(false);
      }

      try {
        setIsLoadingLayouts(true);
        const layoutsQuery = query(collection(db, SAVED_LAYOUTS_COLLECTION), orderBy("timestamp", "desc"));
        const layoutsSnapshot = await getDocs(layoutsQuery);
        const layouts: SavedLayout[] = [];
        layoutsSnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.layoutId && data.name && data.components && typeof data.nextId === 'number') {
            layouts.push({
              firestoreId: docSnap.id, 
              layoutId: data.layoutId as string, 
              name: data.name as string,
              components: data.components as DesignComponent[],
              nextId: data.nextId as number,
              timestamp: data.timestamp as number | undefined,
            });
          } else {
            console.warn("Found invalid saved layout in Firestore:", docSnap.id, data);
          }
        });
        setDesignState(prev => ({ ...prev, savedLayouts: layouts }));
      } catch (error) {
        console.error("Error loading saved layouts from Firestore:", error);
        let detail = "Could not load saved layouts.";
         if (error instanceof Error) {
            const firebaseError = error as any;
            if (firebaseError.code) {
                detail += ` (Error: ${firebaseError.code} - ${firebaseError.message})`;
            } else {
                detail += ` (${firebaseError.message})`;
            }
        }
        toast({ title: "Loading Failed", description: detail, variant: "destructive" });
      } finally {
        setIsLoadingLayouts(false);
      }
    };
    loadInitialData();
  }, [toast]); 

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
      let currentNextId = prev.nextId;
      let updatedComponentsList = [...prev.components];
      let finalSelectedComponentId = '';
      let componentsToAdd: DesignComponent[] = [];
      let effectiveParentId = parentIdOrNull;
  
      const rootScaffold = updatedComponentsList.find(c => c.id === ROOT_SCAFFOLD_ID);
      if (!rootScaffold) {
        console.error("Root Scaffold not found. Cannot add component.");
        return {};
      }
      
      if (typeOrTemplateId === 'TopAppBar') {
        effectiveParentId = ROOT_SCAFFOLD_ID;
        const existingTopAppBar = updatedComponentsList.find(c => c.parentId === ROOT_SCAFFOLD_ID && c.type === 'TopAppBar');
        if (existingTopAppBar && existingTopAppBar.id !== DEFAULT_TOP_APP_BAR_ID) {
             toast({title: "Info", description: "A TopAppBar already exists. Replace it or add items to it.", variant: "default"});
             return {};
        }
      } else if (typeOrTemplateId === 'BottomNavigationBar') {
        effectiveParentId = ROOT_SCAFFOLD_ID;
        const existingBottomNav = updatedComponentsList.find(c => c.parentId === ROOT_SCAFFOLD_ID && c.type === 'BottomNavigationBar');
        if (existingBottomNav && existingBottomNav.id !== DEFAULT_BOTTOM_NAV_BAR_ID) {
             toast({title: "Info", description: "A BottomNavigationBar already exists. Replace it or add items to it.", variant: "default"});
             return {};
        }
      } else if (parentIdOrNull === ROOT_SCAFFOLD_ID) {
        effectiveParentId = DEFAULT_CONTENT_LAZY_COLUMN_ID;
      } else if (!parentIdOrNull) {
        effectiveParentId = DEFAULT_CONTENT_LAZY_COLUMN_ID;
      }
  
      let parentComponent = updatedComponentsList.find(c => c.id === effectiveParentId);
      if (!parentComponent || !isContainerType(parentComponent.type, prev.customComponentTemplates)) {
        const originalTarget = updatedComponentsList.find(c => c.id === parentIdOrNull);
        if(originalTarget && originalTarget.parentId && updatedComponentsList.find(c => c.id === originalTarget.parentId && isContainerType(c.type, prev.customComponentTemplates))) {
            effectiveParentId = originalTarget.parentId;
        } else {
            console.warn(`Target parent ${effectiveParentId} for new component is not a valid container or not found. Defaulting to content area.`);
            effectiveParentId = DEFAULT_CONTENT_LAZY_COLUMN_ID;
        }
      }
  
      if (isCustomComponentType(typeOrTemplateId)) {
        const appTemplateId = typeOrTemplateId;
        const template = prev.customComponentTemplates.find(t => t.templateId === appTemplateId);
  
        if (!template) {
          console.error(`Custom template ${appTemplateId} not found.`);
          return {};
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
          const clonedTemplateComp = deepClone(templateComp);
          
          const newInstanceComp: DesignComponent = {
            id: newInstanceCompId,
            type: clonedTemplateComp.type,
            name: clonedTemplateComp.name,
            properties: {
              ...getDefaultProperties(clonedTemplateComp.type as ComponentType, newInstanceCompId),
              ...clonedTemplateComp.properties,
            },
            parentId: templateComp.parentId ? finalIdMap[templateComp.parentId] : null,
          };
  
          if (templateComp.id === template.rootComponentId) {
            newInstanceComp.name = template.name;
            instantiatedTemplateRootId = newInstanceCompId;
            newInstanceComp.parentId = effectiveParentId;
            newInstanceComp.templateIdRef = appTemplateId;
          }
  
          if (newInstanceComp.properties.children && Array.isArray(newInstanceComp.properties.children)) {
            newInstanceComp.properties.children = newInstanceComp.properties.children
              .map(childIdFromTemplate => finalIdMap[childIdFromTemplate])
              .filter(childId => !!childId);
          }
          if (templateComp.id !== template.rootComponentId) {
            delete newInstanceComp.templateIdRef;
          }
          finalNewComponentsBatch.push(newInstanceComp);
        });
  
        finalSelectedComponentId = instantiatedTemplateRootId;
        componentsToAdd.push(...finalNewComponentsBatch);
        updatedComponentsList.push(...componentsToAdd);
  
      } else {
        const newId = `comp-${currentNextId++}`;
        finalSelectedComponentId = newId;
        const defaultProps = getDefaultProperties(typeOrTemplateId as ComponentType, newId);
  
        const newComponent: DesignComponent = {
          id: newId,
          type: typeOrTemplateId as ComponentType,
          name: `${getComponentDisplayName(typeOrTemplateId as ComponentType)} ${newId.split('-')[1]}`,
          properties: { ...defaultProps },
          parentId: effectiveParentId,
        };
  
        componentsToAdd.push(newComponent);
        updatedComponentsList.push(...componentsToAdd);
      }
  
      if (effectiveParentId && componentsToAdd.length > 0) {
        const parentCompIndex = updatedComponentsList.findIndex(c => c.id === effectiveParentId);
        if (parentCompIndex !== -1) {
            const currentParent = updatedComponentsList[parentCompIndex];
            if (isContainerType(currentParent.type, prev.customComponentTemplates) || currentParent.templateIdRef) {
                const childrenIdsToAdd = componentsToAdd
                    .filter(c => c.parentId === effectiveParentId)
                    .map(c => c.id);
                let existingChildren = Array.isArray(currentParent.properties.children) ? [...currentParent.properties.children] : [];
                
                if (index !== undefined && index >= 0 && index <= existingChildren.length) {
                    existingChildren.splice(index, 0, ...childrenIdsToAdd);
                } else {
                    existingChildren.push(...childrenIdsToAdd);
                }

                updatedComponentsList[parentCompIndex] = {
                    ...currentParent,
                    properties: {
                        ...currentParent.properties,
                        children: existingChildren
                    }
                };
            }
        }
      }
      
      if (effectiveParentId === ROOT_SCAFFOLD_ID && (typeOrTemplateId === 'TopAppBar' || typeOrTemplateId === 'BottomNavigationBar')) {
        const scaffoldIndex = updatedComponentsList.findIndex(c => c.id === ROOT_SCAFFOLD_ID);
        if (scaffoldIndex !== -1) {
          const scaffold = updatedComponentsList[scaffoldIndex];
          const newChildId = componentsToAdd[0].id;
          let scaffoldChildren = [...(scaffold.properties.children || [])];
          if (typeOrTemplateId === 'TopAppBar') {
            const existingTopBarIndex = scaffoldChildren.indexOf(DEFAULT_TOP_APP_BAR_ID);
            if(existingTopBarIndex !== -1) scaffoldChildren.splice(existingTopBarIndex, 1, newChildId);
            else scaffoldChildren.unshift(newChildId);
          } else if (typeOrTemplateId === 'BottomNavigationBar') {
             const existingBottomNavIndex = scaffoldChildren.indexOf(DEFAULT_BOTTOM_NAV_BAR_ID);
             if(existingBottomNavIndex !== -1) scaffoldChildren.splice(existingBottomNavIndex, 1, newChildId);
             else scaffoldChildren.push(newChildId);
          }
          updatedComponentsList[scaffoldIndex] = {
            ...scaffold,
            properties: {...scaffold.properties, children: Array.from(new Set(scaffoldChildren))}
          };
        }
      }
  
      const finalUniqueComponents = updatedComponentsList.filter((comp, index, self) => index === self.findIndex(t => t.id === comp.id));
  
      return {
        components: finalUniqueComponents,
        selectedComponentId: finalSelectedComponentId || prev.selectedComponentId,
        nextId: currentNextId,
      };
    });
  }, [getComponentById, toast, updateStateWithHistory]);


  const saveSelectedAsCustomTemplate = React.useCallback(async (name: string) => {
    if (!db) {
        toast({ title: "Save Failed", description: "Firestore instance (db) is not available. Cannot save custom template.", variant: "destructive" });
        return;
    }
    if (!designState.selectedComponentId) return;
    const selectedComponent = getComponentById(designState.selectedComponentId);
    if (!selectedComponent) return;

    if (CORE_SCAFFOLD_ELEMENT_IDS.includes(selectedComponent.id)) {
        toast({
          title: "Action Prevented",
          description: "Core scaffold elements cannot be saved as custom components.",
          variant: "destructive",
        });
        return;
    }
     if (selectedComponent.templateIdRef) { // Check if it's already an instance of a custom component
        toast({
            title: "Action Prevented",
            description: "Cannot save an instance of a custom component as a new custom component template directly. Consider detaching or rebuilding.",
            variant: "destructive",
        });
        return;
    }


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
      delete clonedComp.templateIdRef; // Templates themselves don't have templateIdRefs


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
        toast({ title: "Save Failed", description: "Internal error creating template structure.", variant: "destructive" });
        return;
    }

    const baseName = name.replace(/\s+/g, '_').toLowerCase().replace(/[^a-z0-9_-]/g, '');
    const timestamp = Date.now();
    const firestoreDocumentId = `${baseName}-${timestamp}`.replace(/\//g, '_'); 
    const applicationTemplateId = `${CUSTOM_COMPONENT_TYPE_PREFIX}${firestoreDocumentId}`; 

    const newTemplateForState: CustomComponentTemplate = {
      firestoreId: firestoreDocumentId, 
      templateId: applicationTemplateId, 
      name: name,
      rootComponentId: templateRootComponent.id,
      componentTree: templateComponentTree,
    };

    setDesignState(prev => {
      const updatedCustomComponentTemplates = [...prev.customComponentTemplates, newTemplateForState];
      return { ...prev, customComponentTemplates: updatedCustomComponentTemplates };
    });
    toast({ title: "Custom Template Saved", description: `"${name}" saved locally. Attempting to sync...` });

    const dataToSaveToFirestore = {
      templateId: applicationTemplateId, 
      name: name,
      rootComponentId: templateRootComponent.id,
      componentTree: templateComponentTree,
    };
    const newTemplateDataForFirestore = sanitizeForFirestore(dataToSaveToFirestore);

    try {
      console.log(`Attempting to save custom template to Firestore with ID: ${firestoreDocumentId}`);
      console.log("Sanitized Data to save (template):", JSON.stringify(newTemplateDataForFirestore, null, 2));
      const templateRef = doc(db, CUSTOM_TEMPLATES_COLLECTION, firestoreDocumentId);
      await setDoc(templateRef, newTemplateDataForFirestore);
      
      toast({ title: "Sync Successful", description: `Template "${name}" saved to Firestore.` });

    } catch (error) {
      console.error("Firestore operation error (saveSelectedAsCustomTemplate):", error);
      let detail = "Could not save template to Firestore.";
      if (error instanceof Error) {
        const firebaseError = error as any; 
        detail += ` (Error: ${firebaseError.code || 'UNKNOWN'} - ${firebaseError.message || 'No message'})`;
      }
      toast({ title: "Save Failed (Firestore Sync)", description: `${detail}. Template remains saved locally.`, variant: "destructive" });
    }
  }, [designState.selectedComponentId, getComponentById, toast, designState.customComponentTemplates]);


  const deleteComponent = React.useCallback((id: string) => {
    if (CORE_SCAFFOLD_ELEMENT_IDS.includes(id)) {
        toast({ title: "Action Prevented", description: "Cannot delete core scaffold structure elements.", variant: "destructive" });
        return;
    }

    updateStateWithHistory(prev => {
        const componentToDelete = prev.components.find(c => c.id === id);
        if (!componentToDelete) return {};

        // 1. Collect all IDs to delete (the component and all its descendants)
        const idsToDelete = new Set<string>();
        const queue: string[] = [id];
        while (queue.length > 0) {
            const currentId = queue.shift()!;
            if (idsToDelete.has(currentId)) continue;
            idsToDelete.add(currentId);

            const currentComp = prev.components.find(c => c.id === currentId);
            if (currentComp?.properties.children && Array.isArray(currentComp.properties.children)) {
                queue.push(...currentComp.properties.children);
            }
        }
        
        // 2. Create new component list, filtering out deleted ones and updating the parent
        const parentId = componentToDelete.parentId;
        const newComponents = prev.components
            .filter(c => !idsToDelete.has(c.id))
            .map(c => {
                // If this component is the parent of the initially deleted node, update its children
                if (c.id === parentId) {
                    const newChildren = (c.properties.children || []).filter(childId => childId !== id);
                    return {
                        ...c,
                        properties: {
                            ...c.properties,
                            children: newChildren
                        }
                    };
                }
                return c;
            });

        // 3. Determine new selection
        const newSelectedComponentId = idsToDelete.has(prev.selectedComponentId || "")
            ? (parentId || DEFAULT_CONTENT_LAZY_COLUMN_ID)
            : prev.selectedComponentId;

        return {
            components: newComponents,
            selectedComponentId: newSelectedComponentId,
        };
    });
  }, [toast, updateStateWithHistory]);


  const selectComponent = React.useCallback((id: string | null) => {
    updateStateWithHistory(prev => ({ selectedComponentId: id }));
  }, [updateStateWithHistory]);

  const updateComponent = React.useCallback((id: string, updates: { name?: string; properties?: Partial<BaseComponentProps>; templateIdRef?: string }) => {
    updateStateWithHistory(prev => ({
      components: prev.components.map(comp => {
        if (comp.id === id) {
          let newComp = { ...comp, properties: { ...comp.properties} };
          if (updates.name !== undefined) {
            if (CORE_SCAFFOLD_ELEMENT_IDS.includes(id) && !comp.templateIdRef) { // Only prevent renaming core scaffold elements if they are not part of a custom template instance
                if (id === ROOT_SCAFFOLD_ID) newComp.name = "Root Scaffold";
                else if (id === DEFAULT_TOP_APP_BAR_ID) newComp.name = "Top App Bar";
                else if (id === DEFAULT_CONTENT_LAZY_COLUMN_ID) newComp.name = "Main Content Area";
                else if (id === DEFAULT_BOTTOM_NAV_BAR_ID) newComp.name = "Bottom Navigation Bar";
            } else {
                newComp.name = updates.name;
            }
          }
          if (updates.properties !== undefined) {
            newComp.properties = { ...newComp.properties, ...updates.properties };
          }
          if (updates.templateIdRef !== undefined) { // Allow updating templateIdRef
            newComp.templateIdRef = updates.templateIdRef;
          }
          return newComp;
        }
        return comp;
      }),
    }));
  }, [updateStateWithHistory]);

  const updateComponentPosition = React.useCallback((_id: string, _position: { x: number; y: number }) => {
     // This function might be deprecated or adapted if absolute positioning is not used with Scaffold slots.
     // For now, log a warning.
     console.warn("updateComponentPosition is deprecated with the new Scaffold layout model.");
  }, []);

  const clearDesign = React.useCallback(() => {
    updateStateWithHistory(prev => {
        const { components: newScaffoldComponents, nextId: newNextId, selectedId: newSelectedId } = createInitialScaffoldDesign();
        return {
            components: newScaffoldComponents,
            selectedComponentId: newSelectedId,
            nextId: newNextId,
            editingTemplateInfo: null,
            editingLayoutInfo: null,
        };
    });
  }, [updateStateWithHistory]);

  const setDesign = React.useCallback((newDesign: DesignState) => {
    let finalComponents = newDesign.components;
    let finalSelectedId = newDesign.selectedComponentId;
    let finalNextId = newDesign.nextId;

    // Ensure the core Scaffold structure is present
    const loadedRootScaffold = finalComponents.find(c => c.id === ROOT_SCAFFOLD_ID && c.parentId === null && c.type === 'Scaffold');
    const loadedTopBar = finalComponents.find(c => c.id === DEFAULT_TOP_APP_BAR_ID && c.parentId === ROOT_SCAFFOLD_ID);
    const loadedContentArea = finalComponents.find(c => c.id === DEFAULT_CONTENT_LAZY_COLUMN_ID && c.parentId === ROOT_SCAFFOLD_ID);
    const loadedBottomBar = finalComponents.find(c => c.id === DEFAULT_BOTTOM_NAV_BAR_ID && c.parentId === ROOT_SCAFFOLD_ID);

    if (!loadedRootScaffold || !loadedTopBar || !loadedContentArea || !loadedBottomBar) {
      console.warn("Loaded layout does not conform to the root Scaffold structure. Re-initializing with defaults and attempting to place user components in content area.");
      const defaultScaffoldDesign = createInitialScaffoldDesign();
      
      // Filter out any default scaffold components from the loaded design to avoid duplicates
      const userProvidedComponents = finalComponents.filter(c => !CORE_SCAFFOLD_ELEMENT_IDS.includes(c.id));
      
      // Re-parent user components that were at root or had missing parents to the new content area
      const reparentedUserComponents = userProvidedComponents.map(c => {
        const parentExists = userProvidedComponents.find(p => p.id === c.parentId);
        if (c.parentId === null || c.parentId === ROOT_SCAFFOLD_ID || !parentExists) {
          return {...c, parentId: DEFAULT_CONTENT_LAZY_COLUMN_ID};
        }
        return c;
      });

      const newContentArea = defaultScaffoldDesign.components.find(c => c.id === DEFAULT_CONTENT_LAZY_COLUMN_ID)!;
      newContentArea.properties.children = reparentedUserComponents
          .filter(c => c.parentId === DEFAULT_CONTENT_LAZY_COLUMN_ID)
          .map(c => c.id);

      finalComponents = [
        defaultScaffoldDesign.components.find(c => c.id === ROOT_SCAFFOLD_ID)!,
        defaultScaffoldDesign.components.find(c => c.id === DEFAULT_TOP_APP_BAR_ID)!,
        newContentArea,
        defaultScaffoldDesign.components.find(c => c.id === DEFAULT_BOTTOM_NAV_BAR_ID)!,
        ...reparentedUserComponents
      ];
      // Remove duplicates by ID, keeping the first occurrence
      finalComponents = finalComponents.filter((v,i,a)=>a.findIndex(t=>(t.id === v.id))===i);
      
      finalNextId = Math.max(finalNextId, defaultScaffoldDesign.nextId); // Ensure nextId is high enough
    }

    if (!finalSelectedId || !finalComponents.find(c => c.id === finalSelectedId)) {
        finalSelectedId = DEFAULT_CONTENT_LAZY_COLUMN_ID; // Default selection if current is invalid
    }

    updateStateWithHistory(prev => ({
        ...prev,
        components: finalComponents,
        selectedComponentId: finalSelectedId,
        nextId: finalNextId,
        history: [],
        future: [],
    }));
  }, [updateStateWithHistory]);


  const overwriteComponents = React.useCallback((hierarchicalUserComponentsJson: any[]): { success: boolean, error?: string } => {
    if (!db && (hierarchicalUserComponentsJson.length > 0) ) { // Only check db if there's something to save
        toast({ title: "Warning", description: "Firestore not available. Changes will be local only.", variant: "default" });
    }
    if (!Array.isArray(hierarchicalUserComponentsJson)) {
      return { success: false, error: "Invalid JSON: Data must be an array of components." };
    }
    let errorResult: { success: boolean, error?: string } = { success: true };

    updateStateWithHistory(prev => {
        const userComponentsFlatList = flattenComponentsFromModalJson(hierarchicalUserComponentsJson, DEFAULT_CONTENT_LAZY_COLUMN_ID);

        const currentRootScaffold = prev.components.find(c => c.id === ROOT_SCAFFOLD_ID && c.parentId === null);
        const currentTopBar = prev.components.find(c => c.id === DEFAULT_TOP_APP_BAR_ID);
        const currentContentLazyColumn = prev.components.find(c => c.id === DEFAULT_CONTENT_LAZY_COLUMN_ID);
        const currentBottomNav = prev.components.find(c => c.id === DEFAULT_BOTTOM_NAV_BAR_ID);
        if (!currentRootScaffold || !currentTopBar || !currentContentLazyColumn || !currentBottomNav) {
            errorResult = { success: false, error: "Core scaffold structure missing. Cannot overwrite components." };
            return {};
        }

        const updatedContentLazyColumn = {
          ...currentContentLazyColumn,
          properties: {
            ...currentContentLazyColumn.properties,
            children: userComponentsFlatList
              .filter(c => c.parentId === DEFAULT_CONTENT_LAZY_COLUMN_ID)
              .map(c => c.id),
          }
        };

        const finalComponents: DesignComponent[] = [
            currentRootScaffold,
            currentTopBar,
            updatedContentLazyColumn,
            currentBottomNav,
        ];
        userComponentsFlatList.forEach(userComp => {
            if (!CORE_SCAFFOLD_ELEMENT_IDS.includes(userComp.id) && !finalComponents.find(fc => fc.id === userComp.id)) {
                finalComponents.push(userComp);
            }
        });
        
        const allIds = new Set(finalComponents.map(c => c.id));
        if (allIds.size !== finalComponents.length) {
            const duplicateIds = finalComponents.map(c=>c.id).filter((id, index, arr) => arr.indexOf(id) !== index);
            errorResult = { success: false, error: `Invalid JSON: Component IDs are not unique. Duplicates: ${duplicateIds.join(', ')}`};
            return {};
        }

        for (const comp of finalComponents) {
          if (comp.parentId && !allIds.has(comp.parentId) && comp.parentId !== null) {
            if (comp.id !== ROOT_SCAFFOLD_ID) {
              errorResult = { success: false, error: `Invalid JSON: Component "${comp.name} (${comp.id})" has a non-existent parentId "${comp.parentId}".`};
              return {};
            }
          }
          if (comp.properties.children) {
            if (!Array.isArray(comp.properties.children)) {
               errorResult = { success: false, error: `Invalid JSON: Component "${comp.name} (${comp.id})" has non-array children property.`};
               return {};
            }
            for (const childId of comp.properties.children) {
              if (typeof childId !== 'string' || !allIds.has(childId)) {
                errorResult = { success: false, error: `Invalid JSON: Component "${comp.name} (${comp.id})" lists non-existent or invalid childId "${childId}".`};
                return {};
              }
            }
          }
        }

        let maxIdNum = prev.nextId -1;
        finalComponents.forEach(comp => {
          const idParts = comp.id.split('-');
          const numStr = idParts[idParts.length -1];
          if (/^\d+$/.test(numStr)) {
            const num = parseInt(numStr, 10);
            if (num > maxIdNum) maxIdNum = num;
          }
        });

        return {
          components: finalComponents.filter((c, index, self) => self.findIndex(other => other.id === c.id) === index),
          nextId: maxIdNum + 1,
          selectedComponentId: DEFAULT_CONTENT_LAZY_COLUMN_ID,
        };
    });
    return errorResult;
  }, [toast, updateStateWithHistory]);


  const moveComponent = React.useCallback((draggedId: string, newParentId: string | null, newIndex?: number) => {
    updateStateWithHistory(prev => {
        let currentComponents = [...prev.components];
        const draggedComponentIndexInState = currentComponents.findIndex(c => c.id === draggedId);
        if (draggedComponentIndexInState === -1) { return {}; }
        if (CORE_SCAFFOLD_ELEMENT_IDS.includes(draggedId) && !currentComponents[draggedComponentIndexInState].templateIdRef) {
            toast({title: "Move Prevented", description: "Core scaffold elements cannot be moved arbitrarily.", variant: "destructive"});
            return {};
        }

        let draggedComponent = { ...currentComponents[draggedComponentIndexInState] };
        draggedComponent.properties = { ...draggedComponent.properties };
        const oldParentId = draggedComponent.parentId;
        
        let effectiveNewParentId = newParentId;
        if (newParentId === ROOT_SCAFFOLD_ID) {
            if (draggedComponent.type === 'TopAppBar' || draggedComponent.type === 'BottomNavigationBar') {
                effectiveNewParentId = ROOT_SCAFFOLD_ID;
            } else {
                effectiveNewParentId = DEFAULT_CONTENT_LAZY_COLUMN_ID;
            }
        } else if (!newParentId) {
            effectiveNewParentId = DEFAULT_CONTENT_LAZY_COLUMN_ID;
        }

        let checkParentLoop = effectiveNewParentId;
        while(checkParentLoop) {
            if (checkParentLoop === draggedId) { return {}; }
            const parentComp = currentComponents.find(c => c.id === checkParentLoop);
            checkParentLoop = parentComp ? parentComp.parentId : null;
        }

        if (oldParentId) {
            const oldParentIndexInState = currentComponents.findIndex(c => c.id === oldParentId);
            if (oldParentIndexInState !== -1) {
                const oldParent = { ...currentComponents[oldParentIndexInState] };
                oldParent.properties = { ...oldParent.properties };
                if (Array.isArray(oldParent.properties.children)) {
                    oldParent.properties.children = oldParent.properties.children.filter(childId => childId !== draggedId);
                    currentComponents[oldParentIndexInState] = oldParent;
                }
            }
        }

        draggedComponent.parentId = effectiveNewParentId;
        currentComponents[draggedComponentIndexInState] = draggedComponent;

        if (effectiveNewParentId) {
            const newParentActualIndexInState = currentComponents.findIndex(c => c.id === effectiveNewParentId);
            if (newParentActualIndexInState !== -1) {
                const newParent = { ...currentComponents[newParentActualIndexInState] };
                newParent.properties = { ...newParent.properties };

                if (isContainerType(newParent.type, prev.customComponentTemplates) || newParent.templateIdRef) {
                    let childrenArray = Array.isArray(newParent.properties.children) ? [...newParent.properties.children] : [];
                    childrenArray = childrenArray.filter(id => id !== draggedId);

                    if (newIndex !== undefined && newIndex >= 0 && newIndex <= childrenArray.length) {
                        childrenArray.splice(newIndex, 0, draggedId);
                    } else {
                        childrenArray.push(draggedId);
                    }
                    newParent.properties.children = childrenArray;
                    currentComponents[newParentActualIndexInState] = newParent;
                } else {
                    draggedComponent.parentId = oldParentId; 
                    currentComponents[draggedComponentIndexInState] = draggedComponent; 
                     if (oldParentId) {
                        const oldParentIdx = currentComponents.findIndex(c => c.id === oldParentId);
                        if (oldParentIdx !== -1 && currentComponents[oldParentIdx].properties.children && !currentComponents[oldParentIdx].properties.children!.includes(draggedId)) {
                           currentComponents[oldParentIdx].properties.children!.push(draggedId);
                        }
                     }
                    return {};
                }
            }
        }
        return { components: currentComponents.filter(Boolean), selectedComponentId: draggedId };
    });
  }, [toast, updateStateWithHistory]);

  const deleteCustomComponentTemplate = React.useCallback(async (appTemplateId: string, firestoreDocId?: string) => {
    if (!db) {
        toast({ title: "Delete Failed", description: "Firestore instance (db) is not available. Cannot delete custom template.", variant: "destructive" });
        return;
    }
    const idToDeleteInFirestore = firestoreDocId;
    if (!idToDeleteInFirestore) {
        toast({ title: "Delete Failed", description: "Firestore ID for template is missing.", variant: "destructive" });
        return;
    }
    
    let templateName = "Template";
    setDesignState(prev => {
      const template = prev.customComponentTemplates.find(t => t.templateId === appTemplateId);
      if (template) templateName = template.name;
      const newTemplates = prev.customComponentTemplates.filter(t => t.templateId !== appTemplateId);
      return { ...prev, customComponentTemplates: newTemplates };
    });
    toast({ title: "Custom Template Deleted", description: `Template "${templateName}" removed locally. Attempting to sync...` });

    try {
        if (!idToDeleteInFirestore.startsWith("local-")) { 
            console.log(`Attempting to delete custom template from Firestore with ID: ${idToDeleteInFirestore}`);
            await deleteDoc(doc(db, CUSTOM_TEMPLATES_COLLECTION, idToDeleteInFirestore));
            toast({ title: "Sync Successful", description: `Template "${templateName}" also deleted from Firestore.` });
        } else {
            toast({ title: "Sync Successful", description: `Template "${templateName}" was local, no Firestore delete needed.` });
        }
    } catch (error) {
        console.error("Firestore operation error (deleteCustomComponentTemplate):", error);
        let detail = "Could not delete template from Firestore.";
        if (error instanceof Error) {
            const firebaseError = error as any;
            detail += ` (Error: ${firebaseError.code || 'UNKNOWN'} - ${firebaseError.message || 'No message'})`;
        }
        toast({ title: "Delete Failed (Firestore Sync)", description: `${detail}. Template remains deleted locally.`, variant: "destructive" });
    }
  }, [toast, designState.customComponentTemplates]);

  const renameCustomComponentTemplate = React.useCallback(async (appTemplateId: string, newName: string, firestoreDocId?: string) => {
    if (!db) {
        toast({ title: "Rename Failed", description: "Firestore instance (db) is not available. Cannot rename custom template.", variant: "destructive" });
        return;
    }
    const idToUpdateInFirestore = firestoreDocId;
     if (!idToUpdateInFirestore) {
        toast({ title: "Rename Failed", description: "Firestore ID for template is missing.", variant: "destructive" });
        return;
    }

    setDesignState(prev => {
      const newTemplates = prev.customComponentTemplates.map(t =>
        t.templateId === appTemplateId ? { ...t, name: newName } : t
      );
      return { ...prev, customComponentTemplates: newTemplates };
    });
    toast({ title: "Custom Template Renamed", description: `Template renamed to "${newName}" locally. Attempting to sync...` });
    
    try {
        if (!idToUpdateInFirestore.startsWith("local-")) {
            console.log(`Attempting to rename custom template in Firestore with ID: ${idToUpdateInFirestore} to "${newName}"`);
            const templateRef = doc(db, CUSTOM_TEMPLATES_COLLECTION, idToUpdateInFirestore);
            await updateDoc(templateRef, { name: newName });
            toast({ title: "Sync Successful", description: `Template rename to "${newName}" synced with Firestore.` });
        } else {
            toast({ title: "Sync Successful", description: `Template "${newName}" was local, no Firestore update needed.` });
        }
    } catch (error) {
        console.error("Firestore operation error (renameCustomComponentTemplate):", error);
        let detail = "Could not rename template in Firestore.";
        if (error instanceof Error) {
            const firebaseError = error as any;
            detail += ` (Error: ${firebaseError.code || 'UNKNOWN'} - ${firebaseError.message || 'No message'})`;
        }
        toast({ title: "Rename Failed (Firestore Sync)", description: `${detail}. Renamed locally.`, variant: "destructive" });
    }
  }, [toast, designState.customComponentTemplates]);

  const saveCurrentCanvasAsLayout = React.useCallback(async (name: string) => {
    if (!db) {
        toast({ title: "Save Failed", description: "Firestore not available. Layout saved locally only.", variant: "destructive" });
    }
    const currentTimestamp = Date.now();
    const layoutIdForFirestore = `layout-${currentTimestamp}`.replace(/\//g, '_'); 
    const clonedComponents = deepClone(designState.components);

    const newLayoutForState: SavedLayout = {
      firestoreId: layoutIdForFirestore, 
      layoutId: layoutIdForFirestore, 
      name,
      components: clonedComponents,
      nextId: designState.nextId,
      timestamp: currentTimestamp,
    };
    
    setDesignState(prev => {
      const updatedSavedLayouts = [newLayoutForState, ...(prev.savedLayouts || [])]
        .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      return { ...prev, savedLayouts: updatedSavedLayouts };
    });
    toast({ title: "Layout Saved", description: `Layout "${name}" saved locally.${db ? " Attempting to sync..." : ""}` });

    if (db) {
      const layoutDataForFirestore = {
        layoutId: newLayoutForState.layoutId,
        name: newLayoutForState.name,
        components: newLayoutForState.components,
        nextId: newLayoutForState.nextId,
        timestamp: newLayoutForState.timestamp,
      };
      const newLayoutDataForFirestore = sanitizeForFirestore(layoutDataForFirestore);
      
      try {
        console.log(`Attempting to save layout to Firestore with ID: ${layoutIdForFirestore}`);
        console.log("Sanitized Data to save (layout):", JSON.stringify(newLayoutDataForFirestore, null, 2));

        const layoutRef = doc(db, SAVED_LAYOUTS_COLLECTION, layoutIdForFirestore);
        await setDoc(layoutRef, newLayoutDataForFirestore);
        
        toast({ title: "Sync Successful", description: `Layout "${name}" has been saved to Firestore.` });

      } catch (error) {
        console.error("Firestore operation error (saveCurrentCanvasAsLayout):", error);
        let detail = "Could not save layout to Firestore.";
        if (error instanceof Error) {
          const firebaseError = error as any;
          detail += ` (Error: ${firebaseError.code || 'UNKNOWN'} - ${firebaseError.message || 'No message'})`;
        }
        toast({ title: "Save Layout Failed (Firestore Sync)", description: `${detail}. Layout remains saved locally.`, variant: "destructive" });
      }
    }
  }, [designState.components, designState.nextId, toast, designState.savedLayouts]);

  const loadLayoutToCanvas = React.useCallback((layoutId: string) => {
    const layoutToLoad = designState.savedLayouts.find(l => l.layoutId === layoutId);
    if (layoutToLoad) {
      setDesign({ // Use the enhanced setDesign to ensure Scaffold structure
        ...designState,
        components: deepClone(layoutToLoad.components),
        nextId: layoutToLoad.nextId,
        selectedComponentId: DEFAULT_CONTENT_LAZY_COLUMN_ID, // Default to content
        editingLayoutInfo: null,
      });
      toast({ title: "Layout Loaded", description: `Layout "${layoutToLoad.name}" has been loaded onto the canvas.` });
    } else {
      toast({ title: "Load Failed", description: "Could not find the specified layout.", variant: "destructive" });
    }
  }, [designState, toast, setDesign]);


  const deleteSavedLayout = React.useCallback(async (layoutId: string, firestoreDocId?: string) => {
    if (!db) {
        toast({ title: "Delete Failed", description: "Firestore not available. Layout deleted locally only.", variant: "destructive" });
    }
    const idToDeleteInFirestore = firestoreDocId || layoutId;
    if (!idToDeleteInFirestore || typeof idToDeleteInFirestore !== 'string' || idToDeleteInFirestore.trim() === '') {
        console.error("deleteSavedLayout: No valid ID (firestoreDocId or layoutId) provided for deletion.");
        toast({ title: "Delete Error", description: "Cannot delete layout: Invalid ID.", variant: "destructive" });
        return;
    }

    let layoutName = "Layout";
    setDesignState(prev => {
      const layout = (prev.savedLayouts || []).find(l => l.layoutId === layoutId);
      if(layout) layoutName = layout.name;
      const newLayouts = (prev.savedLayouts || []).filter(l => l.layoutId !== layoutId);
      return { ...prev, savedLayouts: newLayouts };
    });
    toast({ title: "Layout Deleted", description: `Layout "${layoutName}" removed locally.${db ? " Attempting to sync..." : ""}` });

    if (db) {
        try {
            if (!idToDeleteInFirestore.startsWith("local-")) { 
                console.log(`Attempting to delete layout from Firestore with ID: ${idToDeleteInFirestore}`);
                await deleteDoc(doc(db, SAVED_LAYOUTS_COLLECTION, idToDeleteInFirestore));
                toast({ title: "Sync Successful", description: `Layout "${layoutName}" also deleted from Firestore.` });
            } else {
                toast({ title: "Sync Successful", description: `Layout "${layoutName}" was local, no Firestore delete needed.` });
            }
        } catch (error) {
            console.error("Firestore operation error (deleteSavedLayout):", error);
            let detail = "Could not delete layout from Firestore.";
            if (error instanceof Error) {
                const firebaseError = error as any;
                detail += ` (Error: ${firebaseError.code || 'UNKNOWN'} - ${firebaseError.message || 'No message'})`;
            }
            toast({ title: "Delete Layout Failed (Firestore Sync)", description: `${detail}. Removed locally.`, variant: "destructive" });
        }
    }
  }, [toast, designState.savedLayouts]);

  const renameSavedLayout = React.useCallback(async (layoutId: string, newName: string, firestoreDocId?: string) => {
     if (!db) {
        toast({ title: "Rename Failed", description: "Firestore not available. Layout renamed locally only.", variant: "destructive" });
    }
    const idToUpdateInFirestore = firestoreDocId || layoutId;
     if (!idToUpdateInFirestore || typeof idToUpdateInFirestore !== 'string' || idToUpdateInFirestore.trim() === '') {
        console.error("renameSavedLayout: No valid ID (firestoreDocId or layoutId) provided for renaming.");
        toast({ title: "Rename Error", description: "Cannot rename layout: Invalid ID.", variant: "destructive" });
        return;
    }
    
    setDesignState(prev => {
        const newLayouts = (prev.savedLayouts || []).map(l =>
            l.layoutId === layoutId ? { ...l, name: newName } : l
        ).sort((a,b) => (b.timestamp || 0) - (a.timestamp || 0));
        return { ...prev, savedLayouts: newLayouts };
    });
    toast({ title: "Layout Renamed", description: `Layout renamed to "${newName}" locally.${db ? " Attempting to sync..." : ""}` });

    if (db) {
        try {
            if (!idToUpdateInFirestore.startsWith("local-")) {
                console.log(`Attempting to rename layout in Firestore with ID: ${idToUpdateInFirestore} to "${newName}"`);
                const layoutRef = doc(db, SAVED_LAYOUTS_COLLECTION, idToUpdateInFirestore);
                await updateDoc(layoutRef, { name: newName });
                toast({ title: "Sync Successful", description: `Layout rename to "${newName}" synced with Firestore.` });
            } else {
                 toast({ title: "Sync Successful", description: `Layout "${newName}" was local, no Firestore update needed.` });
            }
        } catch (error) {
            console.error("Firestore operation error (renameSavedLayout):", error);
            let detail = "Could not rename layout in Firestore.";
            if (error instanceof Error) {
                const firebaseError = error as any;
                detail += ` (Error: ${firebaseError.code || 'UNKNOWN'} - ${firebaseError.message || 'No message'})`;
            }
            toast({ title: "Rename Layout Failed (Firestore Sync)", description: `${detail}. Renamed locally.`, variant: "destructive" });
        }
    }
  }, [toast, designState.savedLayouts]);
  
  const loadTemplateForEditing = React.useCallback((templateId: string) => {
    const template = designState.customComponentTemplates.find(t => t.templateId === templateId);
    if (!template) {
        toast({ title: "Error", description: "Could not find template to edit.", variant: "destructive" });
        return;
    }

    if (window.confirm(`This will replace the current canvas with the "${template.name}" template for editing. Are you sure?`)) {
        let maxId = 0;
        template.componentTree.forEach(comp => {
            const idNum = parseInt(comp.id.split('-').pop() || '0', 10);
            if (!isNaN(idNum) && idNum > maxId) {
                maxId = idNum;
            }
        });
        
        updateStateWithHistory(prev => ({
            components: deepClone(template.componentTree),
            nextId: maxId + 1,
            selectedComponentId: template.rootComponentId,
            editingTemplateInfo: {
                templateId: template.templateId,
                firestoreId: template.firestoreId,
                name: template.name,
            },
            editingLayoutInfo: null,
            history: [],
            future: [],
        }));
    }
  }, [designState.customComponentTemplates, toast, updateStateWithHistory]);

  const loadLayoutForEditing = React.useCallback((layoutId: string) => {
    const layout = designState.savedLayouts.find(l => l.layoutId === layoutId);
    if (!layout) {
        toast({ title: "Error", description: "Could not find layout to edit.", variant: "destructive" });
        return;
    }
    
    const rootComponent = layout.components.find(c => c.parentId === null);

    updateStateWithHistory(prev => ({
        components: deepClone(layout.components),
        nextId: layout.nextId,
        selectedComponentId: rootComponent?.id || DEFAULT_CONTENT_LAZY_COLUMN_ID,
        editingTemplateInfo: null,
        editingLayoutInfo: {
            layoutId: layout.layoutId,
            firestoreId: layout.firestoreId,
            name: layout.name,
        },
        history: [],
        future: [],
    }));
  }, [designState.savedLayouts, toast, updateStateWithHistory]);
  
  const updateCustomTemplate = React.useCallback(async () => {
    if (!designState.editingTemplateInfo) return;
    if (!db) {
        toast({ title: "Update Failed", description: "Firestore not available. Cannot update template.", variant: "destructive" });
        return;
    }

    const { templateId, firestoreId, name } = designState.editingTemplateInfo;
    const currentComponents = deepClone(designState.components);
    const rootComponent = currentComponents.find(c => c.parentId === null);

    if (!rootComponent) {
        toast({ title: "Update Failed", description: "Could not find root component in the edited template.", variant: "destructive" });
        return;
    }
    
    const updatedTemplate: CustomComponentTemplate = {
        templateId,
        firestoreId,
        name,
        rootComponentId: rootComponent.id,
        componentTree: currentComponents
    };
    
    const sanitizedTemplateForFirestore = sanitizeForFirestore({
        templateId: updatedTemplate.templateId,
        name: updatedTemplate.name,
        rootComponentId: updatedTemplate.rootComponentId,
        componentTree: updatedTemplate.componentTree
    });

    try {
        if (firestoreId) {
            console.log(`Attempting to update custom template in Firestore with ID: ${firestoreId}`);
            const templateRef = doc(db, CUSTOM_TEMPLATES_COLLECTION, firestoreId);
            await setDoc(templateRef, sanitizedTemplateForFirestore, { merge: true });
            
            setDesignState(prev => ({
                ...prev,
                customComponentTemplates: prev.customComponentTemplates.map(t => t.templateId === templateId ? updatedTemplate : t)
            }));
            
            toast({ title: "Template Updated", description: `Template "${name}" has been updated successfully.` });
            clearDesign(); // Exit editing mode
        } else {
             toast({ title: "Update Failed", description: "Firestore ID is missing for the template.", variant: "destructive" });
        }

    } catch (error) {
        console.error("Firestore operation error (updateCustomTemplate):", error);
        let detail = "Could not update template in Firestore.";
        if (error instanceof Error) {
            const firebaseError = error as any;
            detail += ` (Error: ${firebaseError.code || 'UNKNOWN'} - ${firebaseError.message || 'No message'})`;
        }
        toast({ title: "Update Failed (Firestore Sync)", description: `${detail}.`, variant: "destructive" });
    }
  }, [designState.editingTemplateInfo, designState.components, toast, clearDesign]);

  const updateSavedLayout = React.useCallback(async () => {
    if (!designState.editingLayoutInfo) return;
    if (!db) {
      toast({ title: "Update Failed", description: "Firestore not available. Cannot update layout.", variant: "destructive" });
      return;
    }

    const { layoutId, firestoreId, name } = designState.editingLayoutInfo;
    const currentComponents = deepClone(designState.components);
    const currentNextId = designState.nextId;
    const currentTimestamp = Date.now();

    const updatedLayout: SavedLayout = {
      layoutId,
      firestoreId,
      name,
      components: currentComponents,
      nextId: currentNextId,
      timestamp: currentTimestamp
    };

    const sanitizedLayoutForFirestore = sanitizeForFirestore({
      layoutId: updatedLayout.layoutId,
      name: updatedLayout.name,
      components: updatedLayout.components,
      nextId: updatedLayout.nextId,
      timestamp: updatedLayout.timestamp,
    });

    try {
      if (firestoreId) {
        console.log(`Attempting to update saved layout in Firestore with ID: ${firestoreId}`);
        const layoutRef = doc(db, SAVED_LAYOUTS_COLLECTION, firestoreId);
        await setDoc(layoutRef, sanitizedLayoutForFirestore, { merge: true });

        setDesignState(prev => ({
          ...prev,
          savedLayouts: prev.savedLayouts.map(l => l.layoutId === layoutId ? updatedLayout : l).sort((a,b) => (b.timestamp || 0) - (a.timestamp || 0))
        }));

        toast({ title: "Layout Updated", description: `Layout "${name}" has been updated successfully.` });
        clearDesign(); // Exit editing mode
      } else {
        toast({ title: "Update Failed", description: "Firestore ID is missing for the layout.", variant: "destructive" });
      }
    } catch (error) {
      console.error("Firestore operation error (updateSavedLayout):", error);
      let detail = "Could not update layout in Firestore.";
      if (error instanceof Error) {
        const firebaseError = error as any;
        detail += ` (Error: ${firebaseError.code || 'UNKNOWN'} - ${firebaseError.message || 'No message'})`;
      }
      toast({ title: "Update Failed (Firestore Sync)", description: `${detail}.`, variant: "destructive" });
    }
  }, [designState.editingLayoutInfo, designState.components, designState.nextId, toast, clearDesign]);

  const undo = React.useCallback(() => {
    setDesignState(prev => {
        if (prev.history.length === 0) return prev;
        const newHistory = [...prev.history];
        const previousComponents = newHistory.pop();
        const newFuture = [prev.components, ...prev.future];
        return {
            ...prev,
            components: previousComponents!,
            history: newHistory,
            future: newFuture,
            selectedComponentId: null, // Deselect on undo
        };
    });
  }, []);

  const redo = React.useCallback(() => {
    setDesignState(prev => {
        if (prev.future.length === 0) return prev;
        const newFuture = [...prev.future];
        const nextComponents = newFuture.shift();
        const newHistory = [...prev.history, prev.components];
        return {
            ...prev,
            components: nextComponents!,
            history: newHistory,
            future: newFuture,
            selectedComponentId: null, // Deselect on redo
        };
    });
  }, []);

  const copyComponent = React.useCallback((id: string) => {
    const componentToCopy = getComponentById(id);
    if (!componentToCopy || CORE_SCAFFOLD_ELEMENT_IDS.includes(id)) {
        toast({ title: "Copy Failed", description: "Cannot copy this component.", variant: "destructive" });
        return;
    }

    const collectDescendants = (compId: string, allComps: DesignComponent[]): DesignComponent[] => {
        const comp = allComps.find(c => c.id === compId);
        if (!comp) return [];
        let descendants: DesignComponent[] = [deepClone(comp)];
        if (comp.properties.children && Array.isArray(comp.properties.children)) {
            comp.properties.children.forEach(childId => {
                descendants = [...descendants, ...collectDescendants(childId, allComps)];
            });
        }
        return descendants;
    };
    
    const copiedTree = collectDescendants(id, designState.components);
    // Make parentId of the root of the copied tree null, so it can be pasted anywhere
    if (copiedTree.length > 0) {
        copiedTree[0].parentId = null;
    }
    
    setDesignState(prev => ({ ...prev, clipboard: copiedTree }));
    toast({ title: "Component Copied", description: `"${componentToCopy.name}" and its children copied to clipboard.` });

  }, [getComponentById, designState.components, toast]);


  const pasteComponent = React.useCallback((targetParentId?: string | null) => {
    if (!designState.clipboard) {
      toast({ title: "Paste Failed", description: "Clipboard is empty.", variant: "default" });
      return;
    }
  
    // Prepare all data outside the state updater
    let nextIdCounter = designState.nextId;
    const idMap: Record<string, string> = {};
    const pastedComponents: DesignComponent[] = [];
  
    designState.clipboard.forEach(clipboardComp => {
      const newId = `comp-${nextIdCounter++}`;
      idMap[clipboardComp.id] = newId;
    });
  
    designState.clipboard.forEach(clipboardComp => {
      const newComp = deepClone(clipboardComp);
      newComp.id = idMap[newComp.id];
      if (newComp.parentId) {
        newComp.parentId = idMap[newComp.parentId];
      }
      if (newComp.properties.children && Array.isArray(newComp.properties.children)) {
        newComp.properties.children = newComp.properties.children.map(childId => idMap[childId]);
      }
      pastedComponents.push(newComp);
    });
  
    let finalParentId = targetParentId;
    if (finalParentId === undefined) {
      const selectedComp = designState.selectedComponentId ? designState.components.find(c => c.id === designState.selectedComponentId) : null;
      if (selectedComp) {
        finalParentId = isContainerType(selectedComp.type, designState.customComponentTemplates) ? selectedComp.id : selectedComp.parentId;
      }
    }
    if (!finalParentId || !designState.components.find(c => c.id === finalParentId)) {
      finalParentId = DEFAULT_CONTENT_LAZY_COLUMN_ID;
    }
  
    const rootPastedComponent = pastedComponents.find(c => c.parentId === null);
    if (!rootPastedComponent) {
      toast({ title: "Paste Error", description: "Could not identify root of pasted component.", variant: "destructive" });
      return;
    }
    rootPastedComponent.parentId = finalParentId;
    const rootPastedComponentId = rootPastedComponent.id;
  
    // Perform the state update
    updateStateWithHistory(prev => {
      const newComponents = [...prev.components];
      const parentIndex = newComponents.findIndex(c => c.id === finalParentId);
  
      if (parentIndex !== -1) {
        const parentComp = { ...newComponents[parentIndex] };
        const newChildren = [...(parentComp.properties.children || []), rootPastedComponentId];
        parentComp.properties = { ...parentComp.properties, children: newChildren };
        newComponents[parentIndex] = parentComp;
      }
  
      return {
        components: [...newComponents, ...pastedComponents],
        nextId: nextIdCounter,
        selectedComponentId: rootPastedComponentId,
      };
    });
  
    // Show toast *after* the state update is queued
    toast({ title: "Pasted", description: `Component "${rootPastedComponent.name}" pasted.` });
  }, [designState.clipboard, designState.nextId, designState.components, designState.customComponentTemplates, designState.selectedComponentId, toast, updateStateWithHistory]);


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
    saveCurrentCanvasAsLayout,
    loadLayoutToCanvas,
    deleteSavedLayout,
    renameSavedLayout,
    loadTemplateForEditing,
    updateCustomTemplate,
    loadLayoutForEditing,
    updateSavedLayout,
    undo,
    redo,
    copyComponent,
    pasteComponent,
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
      saveSelectedAsCustomTemplate: async () => {},
      deleteCustomComponentTemplate: async () => {},
      renameCustomComponentTemplate: async () => {},
      saveCurrentCanvasAsLayout: async () => {},
      loadLayoutToCanvas: () => {},
      deleteSavedLayout: async () => {},
      renameSavedLayout: async () => {},
      loadTemplateForEditing: () => {},
      updateCustomTemplate: async () => {},
      loadLayoutForEditing: async () => {},
      updateSavedLayout: async () => {},
      undo: () => {},
      redo: () => {},
      copyComponent: () => {},
      pasteComponent: () => {},
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
  const context = React.useContext(DesignContext);
  if (context === undefined) {
    throw new Error('useDesign must be used within a DesignProvider');
  }
  return context;
};
