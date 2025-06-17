
'use client';

import type { ReactNode} from 'react';
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { DesignComponent, DesignState, ComponentType, BaseComponentProps, CustomComponentTemplate, SavedLayout } from '@/types/compose-spec';
import { getDefaultProperties, CUSTOM_COMPONENT_TYPE_PREFIX, isCustomComponentType, isContainerType, getComponentDisplayName, ROOT_SCAFFOLD_ID, DEFAULT_CONTENT_LAZY_COLUMN_ID, DEFAULT_TOP_APP_BAR_ID, DEFAULT_BOTTOM_NAV_BAR_ID } from '@/types/compose-spec';
import { db } from '@/lib/firebase';
import { collection, doc, setDoc, getDocs, deleteDoc, updateDoc, query, orderBy } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";


interface DesignContextType extends DesignState {
  addComponent: (type: ComponentType | string, parentId?: string | null, dropPosition?: { x: number; y: number }) => void;
  deleteComponent: (id: string) => void;
  selectComponent: (id: string | null) => void;
  updateComponent: (id: string, updates: { name?: string; properties?: Partial<BaseComponentProps> }) => void;
  updateComponentPosition: (id: string, position: { x: number; y: number }) => void;
  getComponentById: (id: string) => DesignComponent | undefined;
  clearDesign: () => void;
  setDesign: (newDesign: DesignState) => void;
  overwriteComponents: (hierarchicalUserComponentsJson: any[]) => { success: boolean, error?: string };
  moveComponent: (draggedId: string, newParentId: string | null, newIndex?: number) => void;
  saveSelectedAsCustomTemplate: (name: string) => void;
  deleteCustomComponentTemplate: (templateId: string, firestoreId?: string) => Promise<void>;
  renameCustomComponentTemplate: (templateId: string, newName: string, firestoreId?: string) => Promise<void>;
  saveCurrentCanvasAsLayout: (name: string) => Promise<void>;
  loadLayoutToCanvas: (layoutId: string) => void;
  deleteSavedLayout: (layoutId: string, firestoreId?: string) => Promise<void>;
  renameSavedLayout: (layoutId: string, newName: string, firestoreId?: string) => Promise<void>;
}

const DesignContext = createContext<DesignContextType | undefined>(undefined);

const CUSTOM_TEMPLATES_COLLECTION = 'customComponentTemplates';
const SAVED_LAYOUTS_COLLECTION = 'savedLayouts';

const CORE_SCAFFOLD_ELEMENT_IDS = [ROOT_SCAFFOLD_ID, DEFAULT_TOP_APP_BAR_ID, DEFAULT_CONTENT_LAZY_COLUMN_ID, DEFAULT_BOTTOM_NAV_BAR_ID];


const deepClone = <T>(obj: T): T => {
  return JSON.parse(JSON.stringify(obj));
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
    nextId: 1,
    selectedId: DEFAULT_CONTENT_LAZY_COLUMN_ID,
  };
}


const { components: initialComponents, nextId: initialNextId, selectedId: initialSelectedId } = createInitialScaffoldDesign();
const initialDesignState: DesignState = {
  components: initialComponents,
  selectedComponentId: initialSelectedId,
  nextId: initialNextId,
  customComponentTemplates: [],
  savedLayouts: [],
};


const flattenComponentsFromModalJson = (
  modalNodes: any[],
  forcedParentId: string
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

    const newDesignComponent: DesignComponent = {
      ...baseModalNodeData,
      parentId: baseModalNodeData.id === modalNodes[0].id ? forcedParentId : baseModalNodeData.parentId || forcedParentId,
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
  const [isLoadingLayouts, setIsLoadingLayouts] = useState(true);
  const { toast } = useToast();


  useEffect(() => {
    setIsClient(true);
    const loadInitialData = async () => {
      if (!db) {
        console.warn("Firestore not initialized, skipping loading custom templates and layouts.");
        setIsLoadingTemplates(false);
        setIsLoadingLayouts(false);
        return;
      }
      try {
        setIsLoadingTemplates(true);
        const templatesQuery = query(collection(db, CUSTOM_TEMPLATES_COLLECTION));
        const templatesSnapshot = await getDocs(templatesQuery);
        const templates: CustomComponentTemplate[] = [];
        templatesSnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          // data.templateId should have the "custom/" prefix
          // docSnap.id is the Firestore document ID (without prefix)
          if (data.templateId && data.name && data.rootComponentId && data.componentTree) {
            templates.push({
              firestoreId: docSnap.id, // ID of the document (without prefix)
              templateId: data.templateId as string, // ID used in the app (with prefix)
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
        if (error instanceof Error && 'code' in error && typeof (error as any).code === 'string') {
            detail += ` (Error: ${(error as any).code} - ${error.message})`;
        } else if (error instanceof Error) {
            detail += ` (${error.message})`;
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
           // data.layoutId is the ID used in the app and as Firestore doc ID (no prefix)
          if (data.layoutId && data.name && data.components && typeof data.nextId === 'number') {
            layouts.push({
              firestoreId: docSnap.id, // Should be same as data.layoutId
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
         if (error instanceof Error && 'code' in error && typeof (error as any).code === 'string') {
            detail += ` (Error: ${(error as any).code} - ${error.message})`;
        } else if (error instanceof Error) {
            detail += ` (${error.message})`;
        }
        toast({ title: "Loading Failed", description: detail, variant: "destructive" });
      } finally {
        setIsLoadingLayouts(false);
      }
    };
    loadInitialData();
  }, [toast]);

  const getComponentById = useCallback(
    (id: string) => designState.components.find(comp => comp.id === id),
    [designState.components]
  );

  const getComponentDisplayNameResolved = useCallback((type: ComponentType | string): string => {
    return getComponentDisplayName(type, designState.customComponentTemplates.find(t => t.templateId === type)?.name);
  }, [designState.customComponentTemplates]);


  const addComponent = useCallback((
    type: ComponentType | string, // This 'type' can be "custom/my_template-123"
    parentIdOrNull: string | null = DEFAULT_CONTENT_LAZY_COLUMN_ID,
    _dropPosition?: { x: number; y: number }
  ) => {
    setDesignState(prev => {
      let currentNextId = prev.nextId;
      let updatedComponentsList = [...prev.components];
      let finalSelectedComponentId = '';
      let componentsToAdd: DesignComponent[] = [];

      let parentToUpdateId = parentIdOrNull;

      if (!parentToUpdateId || parentToUpdateId === ROOT_SCAFFOLD_ID) {
        parentToUpdateId = DEFAULT_CONTENT_LAZY_COLUMN_ID;
      }

      let parentComponent = updatedComponentsList.find(c => c.id === parentToUpdateId);


      if (!parentComponent) {
         console.warn(`Target parent ${parentToUpdateId} for addComponent not found. Defaulting to content area.`);
         parentToUpdateId = DEFAULT_CONTENT_LAZY_COLUMN_ID;
         parentComponent = updatedComponentsList.find(c => c.id === parentToUpdateId);
      }

      if (parentComponent && !isContainerType(parentComponent.type, prev.customComponentTemplates)) {
         const grandParentId = parentComponent.parentId;
         const grandParentComponent = grandParentId ? updatedComponentsList.find(c=> c.id === grandParentId) : null;
         if (grandParentComponent && isContainerType(grandParentComponent.type, prev.customComponentTemplates) &&
             (grandParentId === DEFAULT_TOP_APP_BAR_ID || grandParentId === DEFAULT_BOTTOM_NAV_BAR_ID || grandParentId === DEFAULT_CONTENT_LAZY_COLUMN_ID || updatedComponentsList.find(c=> c.id === grandParentId)?.parentId === DEFAULT_CONTENT_LAZY_COLUMN_ID)) {
            parentToUpdateId = grandParentId;
         } else {
            console.warn(`Parent of target ${parentComponent.id} is also not a valid drop zone. Defaulting to content area.`);
            parentToUpdateId = DEFAULT_CONTENT_LAZY_COLUMN_ID;
         }
      }

      if (isCustomComponentType(type as string)) {
        const appTemplateId = type as string; // e.g., "custom/my_template-123"
        const template = prev.customComponentTemplates.find(t => t.templateId === appTemplateId);

        if (!template) {
          console.error(`Custom template ${appTemplateId} not found.`);
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

          // Crucially, the 'type' of the instantiated root component (and any nested custom ones)
          // should be the appTemplateId (e.g., "custom/my_template-123")
          // For base components within the template, their type remains (e.g., "Text", "Column")
          // The template.componentTree already has the correct 'type' for its root component
          // IF it was saved correctly. The template.rootComponentId refers to a component
          // in template.componentTree whose 'type' might be a base type.
          // We need to ensure the *instance* of the template root has the template's ID as its type.
          // This is implicitly handled if the DraggableComponentItem for custom templates uses template.templateId as its 'type'
          // and the 'type' property of DesignComponent is what we mean.

          if (templateComp.id === template.rootComponentId) {
            newInstanceComp.name = `${template.name} Instance`;
            instantiatedTemplateRootId = newInstanceCompId;
            newInstanceComp.parentId = parentToUpdateId;
            // The type of this root instance should reflect it's an instance of THIS template
            newInstanceComp.type = appTemplateId; // Ensure instance type IS the template's app ID
          } else {
            newInstanceComp.parentId = templateComp.parentId ? finalIdMap[templateComp.parentId] : null;
          }

          if (newInstanceComp.properties.children && Array.isArray(newInstanceComp.properties.children)) {
            newInstanceComp.properties.children = newInstanceComp.properties.children
              .map(childIdFromTemplate => finalIdMap[childIdFromTemplate])
              .filter(childId => !!childId);
          }
          finalNewComponentsBatch.push(newInstanceComp);
        });

        finalSelectedComponentId = instantiatedTemplateRootId;
        componentsToAdd.push(...finalNewComponentsBatch);
        updatedComponentsList.push(...componentsToAdd);

      } else {
        const newId = `comp-${currentNextId++}`;
        finalSelectedComponentId = newId;
        const defaultProps = getDefaultProperties(type as ComponentType, newId);

        const newComponent: DesignComponent = {
          id: newId,
          type: type as ComponentType,
          name: `${getComponentDisplayNameResolved(type as ComponentType)} ${newId.split('-')[1]}`,
          properties: { ...defaultProps },
          parentId: parentToUpdateId,
        };

        componentsToAdd.push(newComponent);
        updatedComponentsList.push(...componentsToAdd);
      }

      if (parentToUpdateId && componentsToAdd.length > 0) {
        const parentCompIndex = updatedComponentsList.findIndex(c => c.id === parentToUpdateId);
        if (parentCompIndex !== -1) {
            const currentParent = updatedComponentsList[parentCompIndex];
            if (isContainerType(currentParent.type, prev.customComponentTemplates)) {
                const childrenIdsToAdd = componentsToAdd.filter(c => c.parentId === parentToUpdateId).map(c => c.id);
                const existingChildren = Array.isArray(currentParent.properties.children) ? currentParent.properties.children : [];
                const newChildrenSet = new Set([...existingChildren, ...childrenIdsToAdd]);

                updatedComponentsList[parentCompIndex] = {
                    ...currentParent,
                    properties: {
                        ...currentParent.properties,
                        children: Array.from(newChildrenSet)
                    }
                };
            }
        }
      }

      const finalUniqueComponents = updatedComponentsList.filter((comp, index, self) => index === self.findIndex(t => t.id === comp.id));

      return {
        ...prev,
        components: finalUniqueComponents,
        selectedComponentId: finalSelectedComponentId || prev.selectedComponentId,
        nextId: currentNextId,
      };
    });
  }, [getComponentById, designState.customComponentTemplates, getComponentDisplayNameResolved, isLoadingTemplates]);


  const saveSelectedAsCustomTemplate = useCallback(async (name: string) => {
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

    const baseName = name.replace(/\s+/g, '_').toLowerCase();
    const timestamp = Date.now();
    const firestoreDocId = `${baseName}-${timestamp}`; // ID for Firestore (no prefix, no '/')
    const appUsableTemplateId = `${CUSTOM_COMPONENT_TYPE_PREFIX}${firestoreDocId}`; // ID for application logic (with prefix)


    // Data to be stored IN the Firestore document
    const newTemplateDataForFirestore = {
      templateId: appUsableTemplateId, // Store the app-usable ID with prefix
      name: name,
      rootComponentId: templateRootComponent.id, // This is the internal ID within the componentTree
      componentTree: templateComponentTree,
    };

    // Object for the local state in DesignContext
    const newTemplateForState: CustomComponentTemplate = {
      firestoreId: firestoreDocId,       // Firestore document ID (clean)
      templateId: appUsableTemplateId,  // App-usable ID (with prefix)
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
          customComponentTemplates: [...prev.customComponentTemplates, newTemplateForState],
        }));
        return;
      }
      // Use firestoreDocId (clean ID) for the document reference
      const templateRef = doc(db, CUSTOM_TEMPLATES_COLLECTION, firestoreDocId);
      await setDoc(templateRef, newTemplateDataForFirestore); // Save data containing appUsableTemplateId

      toast({ title: "Custom Template Saved", description: `"${name}" saved to library and Firestore.` });
      setDesignState(prev => ({
        ...prev,
        customComponentTemplates: [...prev.customComponentTemplates, newTemplateForState],
      }));
    } catch (error) {
      console.error("Error saving custom template to Firestore:", error);
      let detail = "Could not save template to Firestore.";
      if (error instanceof Error && 'code' in error && typeof (error as any).code === 'string') {
        detail += ` (Error: ${(error as any).code} - ${error.message})`;
      } else if (error instanceof Error) {
        detail += ` (${error.message})`;
      }
      toast({ title: "Save Failed", description: `${detail}. Saved locally.`, variant: "destructive" });
       setDesignState(prev => ({ // Still add to local state on Firestore error
        ...prev,
        customComponentTemplates: [...prev.customComponentTemplates, newTemplateForState],
      }));
    }
  }, [designState.selectedComponentId, getComponentById, toast]);


  const deleteComponent = useCallback((id: string) => {
    if (CORE_SCAFFOLD_ELEMENT_IDS.includes(id)) {
      toast({ title: "Action Prevented", description: "Cannot delete core scaffold structure elements.", variant: "destructive" });
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

      const newSelectedComponentId = deletedIdsArray.includes(prev.selectedComponentId || "")
        ? (componentToDelete.parentId || DEFAULT_CONTENT_LAZY_COLUMN_ID)
        : prev.selectedComponentId;

      return {
        ...prev,
        components: remainingComponents,
        selectedComponentId: newSelectedComponentId,
      };
    });
  }, [toast]);


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
            if (CORE_SCAFFOLD_ELEMENT_IDS.includes(id)) {
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
          return newComp;
        }
        return comp;
      }),
    }));
  }, []);

  const updateComponentPosition = useCallback((_id: string, _position: { x: number; y: number }) => {
     console.warn("updateComponentPosition is deprecated with the new Scaffold layout model.");
  }, []);

  const clearDesign = useCallback(() => {
    const { components: newScaffoldComponents, nextId: newNextId, selectedId: newSelectedId } = createInitialScaffoldDesign();
    setDesignState(prev => ({
        ...prev,
        components: newScaffoldComponents,
        selectedComponentId: newSelectedId,
        nextId: newNextId,
    }));
  }, []);

  const setDesign = useCallback((newDesign: DesignState) => {
    let finalComponents = newDesign.components;
    let finalSelectedId = newDesign.selectedComponentId;
    let finalNextId = newDesign.nextId;

    const loadedRootScaffold = finalComponents.find(c => c.id === ROOT_SCAFFOLD_ID && c.parentId === null && c.type === 'Scaffold');
    const loadedContentArea = finalComponents.find(c => c.id === DEFAULT_CONTENT_LAZY_COLUMN_ID && c.parentId === ROOT_SCAFFOLD_ID);

    if (!loadedRootScaffold || !loadedContentArea) {
      console.warn("Loaded layout does not conform to the root Scaffold structure. Attempting to adapt.");
      const defaultScaffold = createInitialScaffoldDesign();

      const userProvidedRootComponents = finalComponents.filter(c =>
        !CORE_SCAFFOLD_ELEMENT_IDS.includes(c.id) &&
        (c.parentId === null || !finalComponents.find(p => p.id === c.parentId))
      );

      const newContentArea = defaultScaffold.components.find(c => c.id === DEFAULT_CONTENT_LAZY_COLUMN_ID)!;
      newContentArea.properties.children = userProvidedRootComponents.map(c => c.id);

      finalComponents = [
        defaultScaffold.components.find(c => c.id === ROOT_SCAFFOLD_ID)!,
        defaultScaffold.components.find(c => c.id === DEFAULT_TOP_APP_BAR_ID)!,
        newContentArea,
        defaultScaffold.components.find(c => c.id === DEFAULT_BOTTOM_NAV_BAR_ID)!,
        ...userProvidedRootComponents.map(c => ({...c, parentId: DEFAULT_CONTENT_LAZY_COLUMN_ID })),
        ...finalComponents.filter(c =>
            !CORE_SCAFFOLD_ELEMENT_IDS.includes(c.id) &&
            !userProvidedRootComponents.find(upc => upc.id === c.id) &&
            c.parentId !== null && finalComponents.find(p => p.id === c.parentId)
        )
      ];
      finalComponents = finalComponents.filter((v,i,a)=>a.findIndex(t=>(t.id === v.id))===i);
      finalNextId = Math.max(finalNextId, defaultScaffold.nextId);
    }

    if (!finalSelectedId || !finalComponents.find(c => c.id === finalSelectedId)) {
        finalSelectedId = DEFAULT_CONTENT_LAZY_COLUMN_ID;
    }

    setDesignState(prev => ({
        ...prev,
        components: finalComponents,
        selectedComponentId: finalSelectedId,
        nextId: finalNextId,
    }));
  }, []);


  const overwriteComponents = useCallback((hierarchicalUserComponentsJson: any[]): { success: boolean, error?: string } => {
    if (!Array.isArray(hierarchicalUserComponentsJson)) {
      return { success: false, error: "Invalid JSON: Data must be an array of components." };
    }

    const userComponentsFlatList = flattenComponentsFromModalJson(hierarchicalUserComponentsJson, DEFAULT_CONTENT_LAZY_COLUMN_ID);

    const currentRootScaffold = designState.components.find(c => c.id === ROOT_SCAFFOLD_ID && c.parentId === null);
    const currentTopBar = designState.components.find(c => c.id === DEFAULT_TOP_APP_BAR_ID);
    const currentContentLazyColumn = designState.components.find(c => c.id === DEFAULT_CONTENT_LAZY_COLUMN_ID);
    const currentBottomNav = designState.components.find(c => c.id === DEFAULT_BOTTOM_NAV_BAR_ID);

    if (!currentRootScaffold || !currentTopBar || !currentContentLazyColumn || !currentBottomNav) {
        return { success: false, error: "Core scaffold structure missing. Cannot overwrite components." };
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
        return { success: false, error: `Invalid JSON: Component IDs are not unique. Duplicates: ${duplicateIds.join(', ')}`};
    }

    for (const comp of finalComponents) {
      if (comp.parentId && !allIds.has(comp.parentId) && comp.parentId !== null) {
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

    let maxIdNum = designState.nextId -1;
    finalComponents.forEach(comp => {
      const idParts = comp.id.split('-');
      const numStr = idParts[idParts.length -1];
      if (/^\d+$/.test(numStr)) {
        const num = parseInt(numStr, 10);
        if (num > maxIdNum) maxIdNum = num;
      }
    });


    setDesignState(prev => ({
      ...prev,
      components: finalComponents.filter((c, index, self) => self.findIndex(other => other.id === c.id) === index),
      nextId: maxIdNum + 1,
      selectedComponentId: DEFAULT_CONTENT_LAZY_COLUMN_ID,
    }));
    return { success: true };
  }, [designState.components, designState.nextId]);


  const moveComponent = useCallback((draggedId: string, newParentId: string | null, newIndex?: number) => {
    setDesignState(prev => {
        let currentComponents = [...prev.components];
        const draggedComponentIndexInState = currentComponents.findIndex(c => c.id === draggedId);

        if (draggedComponentIndexInState === -1) {
             console.warn(`moveComponent: Dragged component with ID ${draggedId} not found.`);
             return prev;
        }

        let draggedComponent = { ...currentComponents[draggedComponentIndexInState] };
        draggedComponent.properties = { ...draggedComponent.properties };
        const oldParentId = draggedComponent.parentId;

        // Prevent dropping component into itself or its own children
        let checkParentLoop = newParentId;
        while(checkParentLoop) {
            if (checkParentLoop === draggedId) {
                console.warn("Cannot move component into itself or its descendants.");
                return prev;
            }
            const parentComp = currentComponents.find(c => c.id === checkParentLoop);
            checkParentLoop = parentComp ? parentComp.parentId : null;
        }

        // 1. Remove from old parent's children array
        if (oldParentId) {
            const oldParentIndexInState = currentComponents.findIndex(c => c.id === oldParentId);
            if (oldParentIndexInState !== -1) {
                const oldParent = { ...currentComponents[oldParentIndexInState] };
                oldParent.properties = { ...oldParent.properties };
                if (Array.isArray(oldParent.properties.children)) {
                    oldParent.properties.children = oldParent.properties.children.filter(childId => childId !== draggedId);
                    currentComponents[oldParentIndexInState] = oldParent;
                }
            } else {
                 console.warn(`moveComponent: Old parent with ID ${oldParentId} not found.`);
            }
        }

        // 2. Update dragged component's parentId
        draggedComponent.parentId = newParentId;
        currentComponents[draggedComponentIndexInState] = draggedComponent; // Update the component in the main list

        // 3. Add to new parent's children array
        if (newParentId) {
            const newParentActualIndexInState = currentComponents.findIndex(c => c.id === newParentId);
            if (newParentActualIndexInState !== -1) {
                const newParent = { ...currentComponents[newParentActualIndexInState] };
                newParent.properties = { ...newParent.properties };

                if (isContainerType(newParent.type, prev.customComponentTemplates)) {
                    let childrenArray = Array.isArray(newParent.properties.children) ? [...newParent.properties.children] : [];
                    childrenArray = childrenArray.filter(id => id !== draggedId); // Remove if already present (e.g. reordering)

                    if (newIndex !== undefined && newIndex >= 0 && newIndex <= childrenArray.length) {
                        childrenArray.splice(newIndex, 0, draggedId);
                    } else {
                        childrenArray.push(draggedId); // Add to end if no index or invalid index
                    }
                    newParent.properties.children = childrenArray;
                    currentComponents[newParentActualIndexInState] = newParent;
                } else {
                    console.warn(`moveComponent: Attempted to move component ${draggedId} into non-container ${newParentId}.`);
                    // Revert parentId change if new parent is not a container (should be caught by canDrop)
                    draggedComponent.parentId = oldParentId;
                    currentComponents[draggedComponentIndexInState] = prev.components[draggedComponentIndexInState]; // Revert to original dragged component state from prev
                    // Also need to re-add to old parent if it was removed
                     if (oldParentId) {
                        const oldParentIndex = currentComponents.findIndex(c => c.id === oldParentId);
                        if (oldParentIndex !== -1) {
                           currentComponents[oldParentIndex] = prev.components[oldParentIndex]; // Revert old parent too
                        }
                     }
                    return prev;
                }
            } else {
                 console.warn(`moveComponent: New parent with ID ${newParentId} not found. Dragged component might be orphaned.`);
                 // If new parent not found, perhaps revert parentId? For now, it stays with newParentId but won't be in children.
            }
        }

        // Filter out any potential undefined components from list before setting state
        const finalComponents = currentComponents.filter(Boolean);

        return { ...prev, components: finalComponents, selectedComponentId: draggedId };
    });
  }, []);

  const deleteCustomComponentTemplate = useCallback(async (appTemplateId: string, firestoreDocId?: string) => {
    const idToDeleteInFirestore = firestoreDocId; // This is the clean ID for Firestore
    try {
      if (db && idToDeleteInFirestore && !idToDeleteInFirestore.startsWith("local-")) { // Check if it's a Firestore ID
        await deleteDoc(doc(db, CUSTOM_TEMPLATES_COLLECTION, idToDeleteInFirestore));
      }
      setDesignState(prev => ({
        ...prev,
        // Filter local state using appTemplateId (which includes prefix)
        customComponentTemplates: prev.customComponentTemplates.filter(t => t.templateId !== appTemplateId),
      }));
      toast({ title: "Custom Template Deleted", description: `Template removed from library.` });
    } catch (error) {
      console.error("Error deleting custom template from Firestore:", error);
      let detail = "Could not delete template.";
      if (error instanceof Error && 'code' in error && typeof (error as any).code === 'string') {
        detail += ` (Error: ${(error as any).code} - ${error.message})`;
      } else if (error instanceof Error) {
        detail += ` (${error.message})`;
      }
      toast({ title: "Delete Failed", description: detail, variant: "destructive" });
    }
  }, [toast]);

  const renameCustomComponentTemplate = useCallback(async (appTemplateId: string, newName: string, firestoreDocId?: string) => {
    const idToUpdateInFirestore = firestoreDocId; // This is the clean ID for Firestore
    try {
      if (db && idToUpdateInFirestore && !idToUpdateInFirestore.startsWith("local-")) { // Check if it's a Firestore ID
        const templateRef = doc(db, CUSTOM_TEMPLATES_COLLECTION, idToUpdateInFirestore);
        await updateDoc(templateRef, { name: newName });
      }
      setDesignState(prev => ({
        ...prev,
        // Update local state using appTemplateId (which includes prefix)
        customComponentTemplates: prev.customComponentTemplates.map(t =>
          t.templateId === appTemplateId ? { ...t, name: newName } : t
        ),
      }));
      toast({ title: "Custom Template Renamed", description: `Template renamed to "${newName}".` });
    } catch (error) {
      console.error("Error renaming custom template in Firestore:", error);
      let detail = "Could not rename template.";
      if (error instanceof Error && 'code' in error && typeof (error as any).code === 'string') {
        detail += ` (Error: ${(error as any).code} - ${error.message})`;
      } else if (error instanceof Error) {
        detail += ` (${error.message})`;
      }
      toast({ title: "Rename Failed", description: detail, variant: "destructive" });
    }
  }, [toast]);

  const saveCurrentCanvasAsLayout = useCallback(async (name: string) => {
    const newLayoutId = `layout-${Date.now()}`; // Clean ID for Firestore and app

    // Data for Firestore (layoutId is the doc ID, so not included as a field)
    const newLayoutDataForFirestore = {
      layoutId: newLayoutId, // Store layoutId as a field as well for consistency
      name,
      components: deepClone(designState.components),
      nextId: designState.nextId,
      timestamp: Date.now(),
    };

    // Object for local state
    const newLayoutForState: SavedLayout = {
      firestoreId: newLayoutId, // Same as layoutId
      layoutId: newLayoutId,
      name,
      components: deepClone(designState.components),
      nextId: designState.nextId,
      timestamp: newLayoutDataForFirestore.timestamp,
    };

    try {
      if (!db) {
        console.warn("Firestore not initialized. Layout saved to local state only.");
        toast({ title: "Layout Saved (Locally)", description: `"${name}" saved. Firestore not connected.`});
        setDesignState(prev => ({
          ...prev,
          savedLayouts: [newLayoutForState, ...prev.savedLayouts].sort((a,b) => (b.timestamp || 0) - (a.timestamp || 0)),
        }));
        return;
      }
      const layoutRef = doc(db, SAVED_LAYOUTS_COLLECTION, newLayoutId);
      await setDoc(layoutRef, newLayoutDataForFirestore);
      toast({ title: "Layout Saved", description: `Layout "${name}" has been saved to Firestore.` });
      setDesignState(prev => ({
        ...prev,
        savedLayouts: [newLayoutForState, ...prev.savedLayouts].sort((a,b) => (b.timestamp || 0) - (a.timestamp || 0)),
      }));
    } catch (error) {
      console.error("Error saving layout to Firestore:", error);
      let detail = "Could not save layout to Firestore.";
      if (error instanceof Error && 'code' in error && typeof (error as any).code === 'string') {
        detail += ` (Error: ${(error as any).code} - ${error.message})`;
      } else if (error instanceof Error) {
        detail += ` (${error.message})`;
      }
      toast({ title: "Save Layout Failed", description: `${detail}. Saved locally.`, variant: "destructive" });
      setDesignState(prev => ({ // Still add to local state on Firestore error
          ...prev,
          savedLayouts: [newLayoutForState, ...prev.savedLayouts].sort((a,b) => (b.timestamp || 0) - (a.timestamp || 0)),
      }));
    }
  }, [designState.components, designState.nextId, toast]);

  const loadLayoutToCanvas = useCallback((layoutId: string) => {
    const layoutToLoad = designState.savedLayouts.find(l => l.layoutId === layoutId);
    if (layoutToLoad) {
      setDesign({
        components: deepClone(layoutToLoad.components),
        nextId: layoutToLoad.nextId,
        selectedComponentId: DEFAULT_CONTENT_LAZY_COLUMN_ID, // Default selection after load
        customComponentTemplates: designState.customComponentTemplates, // Keep current templates
        savedLayouts: designState.savedLayouts, // Keep current layouts list
      });
      toast({ title: "Layout Loaded", description: `Layout "${layoutToLoad.name}" has been loaded onto the canvas.` });
    } else {
      toast({ title: "Load Failed", description: "Could not find the specified layout.", variant: "destructive" });
    }
  }, [designState.savedLayouts, designState.customComponentTemplates, toast, setDesign]);

  const deleteSavedLayout = useCallback(async (layoutId: string, firestoreDocId?: string) => {
    const idToDeleteInFirestore = firestoreDocId || layoutId; // layoutId is already clean
    try {
      if (db && idToDeleteInFirestore && !idToDeleteInFirestore.startsWith("local-")) {
        await deleteDoc(doc(db, SAVED_LAYOUTS_COLLECTION, idToDeleteInFirestore));
      }
      setDesignState(prev => ({
        ...prev,
        savedLayouts: prev.savedLayouts.filter(l => l.layoutId !== layoutId),
      }));
      toast({ title: "Layout Deleted", description: "Layout removed from library." });
    } catch (error) {
      console.error("Error deleting saved layout from Firestore:", error);
      let detail = "Could not delete layout.";
      if (error instanceof Error && 'code' in error && typeof (error as any).code === 'string') {
        detail += ` (Error: ${(error as any).code} - ${error.message})`;
      } else if (error instanceof Error) {
        detail += ` (${error.message})`;
      }
      toast({ title: "Delete Layout Failed", description: detail, variant: "destructive" });
    }
  }, [toast]);

  const renameSavedLayout = useCallback(async (layoutId: string, newName: string, firestoreDocId?: string) => {
    const idToUpdateInFirestore = firestoreDocId || layoutId; // layoutId is already clean
    try {
      if (db && idToUpdateInFirestore && !idToUpdateInFirestore.startsWith("local-")) {
        const layoutRef = doc(db, SAVED_LAYOUTS_COLLECTION, idToUpdateInFirestore);
        await updateDoc(layoutRef, { name: newName });
      }
      setDesignState(prev => ({
        ...prev,
        savedLayouts: prev.savedLayouts.map(l =>
          l.layoutId === layoutId ? { ...l, name: newName } : l
        ).sort((a,b) => (b.timestamp || 0) - (a.timestamp || 0)),
      }));
      toast({ title: "Layout Renamed", description: `Layout renamed to "${newName}".` });
    } catch (error) {
      console.error("Error renaming saved layout in Firestore:", error);
      let detail = "Could not rename layout.";
      if (error instanceof Error && 'code' in error && typeof (error as any).code === 'string') {
        detail += ` (Error: ${(error as any).code} - ${error.message})`;
      } else if (error instanceof Error) {
        detail += ` (${error.message})`;
      }
      toast({ title: "Rename Layout Failed", description: detail, variant: "destructive" });
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
    saveCurrentCanvasAsLayout,
    loadLayoutToCanvas,
    deleteSavedLayout,
    renameSavedLayout,
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
      saveCurrentCanvasAsLayout: async () => {},
      loadLayoutToCanvas: () => {},
      deleteSavedLayout: async () => {},
      renameSavedLayout: async () => {},
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

