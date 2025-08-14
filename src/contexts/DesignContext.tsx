
'use client';

import type { ReactNode} from 'react';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { DesignComponent, DesignState, ComponentType, BaseComponentProps, CustomComponentTemplate, SavedLayout, GalleryImage } from '@/types/compose-spec';
import { getDefaultProperties, CUSTOM_COMPONENT_TYPE_PREFIX, isContainerType, getComponentDisplayName, ROOT_SCAFFOLD_ID, DEFAULT_CONTENT_LAZY_COLUMN_ID, CORE_SCAFFOLD_ELEMENT_IDS, CUSTOM_TEMPLATES_COLLECTION, SAVED_LAYOUTS_COLLECTION, GALLERY_IMAGES_COLLECTION, DESIGNS_COLLECTION, MAIN_DESIGN_DOC_ID } from '@/types/compose-spec';
import { db } from '@/lib/firebase';
import { collection, doc, setDoc, getDocs, deleteDoc, query, orderBy, onSnapshot, Unsubscribe } from "firebase/firestore";
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
  undo: () => void;
  redo: () => void;
  clearDesign: () => void;
  saveSelectedAsCustomTemplate: (templateName: string) => Promise<void>;
  loadTemplateForEditing: (template: CustomComponentTemplate) => void;
  updateCustomTemplate: () => Promise<void>;
  deleteCustomTemplate: (firestoreId: string) => Promise<void>;
  saveCurrentCanvasAsLayout: (layoutName: string) => Promise<void>;
  loadLayout: (layout: SavedLayout) => void;
  loadLayoutForEditing: (layout: SavedLayout) => void;
  updateLayout: () => Promise<void>;
  deleteLayout: (firestoreId: string) => Promise<void>;
  addImageToGallery: (url: string) => Promise<{success: boolean, message: string}>;
  removeImageFromGallery: (id: string) => Promise<{success: boolean, message: string}>;
  isLoadingCustomTemplates: boolean;
  isLoadingLayouts: boolean;
  
  // Zoom functionality
  zoomLevel: number;
  setZoomLevel: React.Dispatch<React.SetStateAction<number>>;
}


const DesignContext = React.createContext<DesignContextType | undefined>(undefined);

const deepClone = <T>(obj: T): T => {
  return JSON.parse(JSON.stringify(obj));
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
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/segurosazteca.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/comprainternacional.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/elektramotos.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/benelli.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/bfgoodrich.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/firestone.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/hero.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/italika.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/lth.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/michelin.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/uniroyal.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/dbebe.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/evenflo.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/joykoo.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/juguetibici.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/lego.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/conair.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/dermaline.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/divya.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/gamaprofessional.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/letmex.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/perfumesarabes.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/perfumegallery.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/fragance.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/america.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/dormimundo.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/luuna.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/restonic.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/sognare.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/springair.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/benotto.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/teton.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/veloci.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/clevercel.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/edifier.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/hp.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/jvc.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/klipsch.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/macstore.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/motorola.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/nintendo.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/oppo.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/playstation.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/selectsound.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/sony.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/steren.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/stf.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/vak.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/farmaenvios.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/dewalt.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/gutstark.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/jardimex.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/makita.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/truper.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/gandhi.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/thesaifhouse.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/blackanddecker.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/brother.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/hisense.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/lg.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/mabe.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/ninja.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/tcl.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/tfal.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/teka.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/tramontina.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/vasconia.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/kessamuebles.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/mele.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/mundoin.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/cvdirecto.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/hkpro.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/honor.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/lenovo.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/princo.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/redlemon.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/roomi.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/carnival.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/coach.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/dcshoes.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/flexi.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/furor.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/joyeriasbizzarro.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/invicta.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/jansport.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/kswiss.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/lee.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/lens.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/lotto.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/marcjacobs.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/michaelkors.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/nike.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/oggi.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/pirma.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/playtex.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/puma.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/reebok.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/roxy.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/salvajetentacion.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/stylo.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/swissbrand.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/quiksilver.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/bet365.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/cvdirecto.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/hkpro.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/honor.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/lenovo.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/princo.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/redlemon.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/roomi.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/bet365.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Categorias/electronica.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Categorias/moneyfreeflex.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Categorias/telefonia.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Categorias/lineablanca.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Categorias/zapatos.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Categorias/computo.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Categorias/muebles.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Categorias/videojuegos.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Categorias/bellezaycuidadopersonal.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Categorias/hogar.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Categorias/deportes.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Categorias/colchonesyboxes.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Categorias/todas.png",
];

const uniqueDefaultUrls = [...new Set(defaultGalleryUrls)];

const defaultGalleryImages: GalleryImage[] = uniqueDefaultUrls.map((url, index) => ({
    id: `default-gallery-${Date.now()}-${index}`,
    url,
    timestamp: Date.now() - index,
}));

/**
 * Recursively removes `undefined` values from an object or array.
 * This is crucial for Firestore compatibility, as it does not support `undefined`.
 * @param data The object or array to sanitize.
 * @returns A new object or array with all `undefined` values removed.
 */
function sanitizeForFirebase<T>(data: T): T {
    if (Array.isArray(data)) {
        // If it's an array, map over its elements and sanitize each one.
        return data.map(item => sanitizeForFirebase(item)) as any;
    }
    if (data !== null && typeof data === 'object') {
        const sanitizedObject: { [key: string]: any } = {};
        for (const key in data) {
            // Check if the key belongs to the object itself, not its prototype.
            if (Object.prototype.hasOwnProperty.call(data, key)) {
                const value = (data as any)[key];
                // If the value is not undefined, process it further.
                if (value !== undefined) {
                    // Recursively sanitize nested objects.
                    sanitizedObject[key] = sanitizeForFirebase(value);
                }
            }
        }
        return sanitizedObject as T;
    }
    // Return primitives and null as they are.
    return data;
}

export const DesignProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [designState, setDesignState] = React.useState<DesignState>(initialDesignState);
  const [isClient, setIsClient] = React.useState(false);
  const { toast } = useToast();
  const [zoomLevel, setZoomLevel] = useState(0.7);
  const [isLoadingCustomTemplates, setIsLoadingCustomTemplates] = useState(true);
  const [isLoadingLayouts, setIsLoadingLayouts] = useState(true);

  const mainDesignCanvasStateRef = useRef<DesignComponent[]>(createInitialComponents());

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
      
      return nextState;
    });
  }, []);
  
  useEffect(() => {
    setIsClient(true);

    const unsubscribers: Unsubscribe[] = [];
    if (db) {
        setIsLoadingCustomTemplates(true);
        setIsLoadingLayouts(true);
        
        // Subscribe to Custom Templates
        const templatesCollection = collection(db, CUSTOM_TEMPLATES_COLLECTION);
        const templatesQuery = query(templatesCollection, orderBy('name'));
        const templatesUnsub = onSnapshot(templatesQuery, 
            (snapshot) => {
                const templates: CustomComponentTemplate[] = snapshot.docs.map(doc => ({
                    firestoreId: doc.id,
                    ...doc.data(),
                } as CustomComponentTemplate));
                setDesignState(prev => ({...prev, customComponentTemplates: templates}));
                setIsLoadingCustomTemplates(false);
            },
            (error) => {
                console.error("Error loading custom component templates:", error);
                toast({ title: "Data Load Error", description: "Could not load custom components.", variant: "destructive" });
                setIsLoadingCustomTemplates(false);
            }
        );
        unsubscribers.push(templatesUnsub);

        // Subscribe to Saved Layouts
        const layoutsCollection = collection(db, SAVED_LAYOUTS_COLLECTION);
        const layoutsQuery = query(layoutsCollection, orderBy('timestamp', 'desc'));
        const layoutsUnsub = onSnapshot(layoutsQuery,
            (snapshot) => {
                const layouts: SavedLayout[] = snapshot.docs.map(doc => ({
                    firestoreId: doc.id,
                    ...doc.data(),
                } as SavedLayout));
                setDesignState(prev => ({ ...prev, savedLayouts: layouts }));
                setIsLoadingLayouts(false);
            },
            (error) => {
                console.error("Error loading saved layouts:", error);
                toast({ title: "Data Load Error", description: "Could not load saved layouts.", variant: "destructive" });
                setIsLoadingLayouts(false);
            }
        );
        unsubscribers.push(layoutsUnsub);
    }
    
    return () => {
        unsubscribers.forEach(unsub => unsub());
    };
  }, [toast]);

  useEffect(() => {
    try {
      const savedImagesJson = localStorage.getItem(GALLERY_IMAGES_COLLECTION);
      const userAddedImages = savedImagesJson ? (JSON.parse(savedImagesJson) as GalleryImage[]).filter(img => !uniqueDefaultUrls.includes(img.url)) : [];
      
      // Start with the full, up-to-date default list
      const finalGallery = [...defaultGalleryImages, ...userAddedImages];
      
      // Use a Map to ensure uniqueness based on URL, keeping the most recent entry if there are duplicates.
      const uniqueGalleryMap = new Map<string, GalleryImage>();
      finalGallery.sort((a,b) => a.timestamp - b.timestamp).forEach(img => {
          uniqueGalleryMap.set(img.url, img);
      });
      
      const galleryToSet = Array.from(uniqueGalleryMap.values()).sort((a, b) => b.timestamp - a.timestamp);

      localStorage.setItem(GALLERY_IMAGES_COLLECTION, JSON.stringify(galleryToSet));
      setDesignState(prev => ({ ...prev, galleryImages: galleryToSet }));

    } catch (error) {
      console.error("Error loading gallery from localStorage:", error);
      setDesignState(prev => ({ ...prev, galleryImages: defaultGalleryImages.sort((a,b) => b.timestamp - a.timestamp) }));
    }
  }, []);

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
        if (template) {
          const idMap: Record<string, string> = {};
          const newTemplateComponents: DesignComponent[] = deepClone(template.componentTree).map((c: DesignComponent) => {
              const newId = `comp-${currentNextId++}`;
              idMap[c.id] = newId;
              return { ...c, id: newId };
          });

          newTemplateComponents.forEach(c => {
              c.parentId = c.parentId ? idMap[c.parentId] : null;
              if (c.properties.children) {
                  c.properties.children = c.properties.children.map(childId => idMap[childId]);
              }
          });
          
          const rootOfPasted = newTemplateComponents.find(c => c.parentId === null)!;
          rootOfPasted.parentId = effectiveParentId;
          rootOfPasted.templateIdRef = template.templateId; // Add the reference
          rootOfPasted.name = template.name;
          
          finalSelectedComponentId = rootOfPasted.id;
          componentsToAdd.push(...newTemplateComponents);

        } else {
            console.error(`Template with ID ${typeOrTemplateId} not found!`);
            return {};
        }

      } else { // Standard component
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
      // If editing a template or layout, this action should exit editing mode
      if (prev.editingTemplateInfo || prev.editingLayoutInfo) {
          return {
              components: mainDesignCanvasStateRef.current,
              editingTemplateInfo: null,
              editingLayoutInfo: null,
              selectedComponentId: null,
          }
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
  
  const saveSelectedAsCustomTemplate = useCallback(async (templateName: string) => {
    const { selectedComponentId, components } = designState;
    if (!selectedComponentId) {
        toast({ title: "Error", description: "No component selected.", variant: "destructive" });
        return;
    }
    const collectDescendants = (compId: string): DesignComponent[] => {
        const comp = components.find(c => c.id === compId);
        if (!comp) return [];
        let descendants = [deepClone(comp)];
        if (comp.properties.children) {
            descendants.push(...comp.properties.children.flatMap(collectDescendants));
        }
        return descendants;
    };
    const componentTree = collectDescendants(selectedComponentId);
    if (componentTree.length === 0) {
        toast({ title: "Error", description: "Cannot save an empty component.", variant: "destructive" });
        return;
    }

    const rootComponentIdInTemplate = componentTree[0].id;
    componentTree[0].parentId = null; 

    const firestoreSafeComponentTree = sanitizeForFirebase(componentTree);

    const templateId = `${CUSTOM_COMPONENT_TYPE_PREFIX}${templateName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
    const newTemplate: Omit<CustomComponentTemplate, 'firestoreId'> = {
        templateId,
        name: templateName,
        rootComponentId: rootComponentIdInTemplate,
        componentTree: firestoreSafeComponentTree,
    };
    try {
        const docRef = doc(db, CUSTOM_TEMPLATES_COLLECTION, templateName);
        await setDoc(docRef, newTemplate);
        toast({ title: "Success", description: `Component "${templateName}" saved.` });
    } catch (error) {
        console.error("Error saving custom template:", error);
        toast({ title: "Save Failed", description: `Could not save component to Firestore: ${error instanceof Error ? error.message : 'Unknown error'}`, variant: "destructive" });
    }
  }, [designState, toast]);

  const loadTemplateForEditing = useCallback((template: CustomComponentTemplate) => {
    mainDesignCanvasStateRef.current = deepClone(designState.components);
    setDesignState(prev => ({
        ...prev,
        components: template.componentTree,
        editingTemplateInfo: {
            templateId: template.templateId,
            firestoreId: template.firestoreId,
            name: template.name,
        },
        selectedComponentId: template.rootComponentId,
        history: [],
        future: [],
    }));
  }, [designState.components]);

  const updateCustomTemplate = useCallback(async () => {
    const { editingTemplateInfo, components } = designState;
    if (!editingTemplateInfo || !editingTemplateInfo.firestoreId) {
        toast({ title: "Error", description: "No template is currently being edited.", variant: "destructive" });
        return;
    }
    const updatedTemplateData = {
        name: editingTemplateInfo.name,
        componentTree: sanitizeForFirebase(components),
    };
    try {
        const templateDocRef = doc(db, CUSTOM_TEMPLATES_COLLECTION, editingTemplateInfo.firestoreId);
        await setDoc(templateDocRef, updatedTemplateData, { merge: true });
        toast({ title: "Success", description: `Template "${editingTemplateInfo.name}" updated.` });

        // Exit editing mode
        setDesignState(prev => ({
            ...prev,
            components: mainDesignCanvasStateRef.current,
            editingTemplateInfo: null,
            selectedComponentId: null,
            history: [],
            future: [],
        }));

    } catch (error) {
        console.error("Error updating custom template:", error);
        toast({ title: "Update Failed", description: "Could not update template in Firestore.", variant: "destructive" });
    }
  }, [designState, toast]);

  const deleteCustomTemplate = useCallback(async (firestoreId: string) => {
    try {
        await deleteDoc(doc(db, CUSTOM_TEMPLATES_COLLECTION, firestoreId));
        toast({ title: "Template Deleted", description: "The custom component has been deleted." });
    } catch (error) {
        console.error("Error deleting custom template:", error);
        toast({ title: "Delete Failed", description: "Could not delete the template from Firestore.", variant: "destructive" });
    }
  }, [toast]);
  
  const saveCurrentCanvasAsLayout = useCallback(async (layoutName: string) => {
    const { components, nextId } = designState;
    const newLayout: Omit<SavedLayout, 'firestoreId'> = {
        name: layoutName,
        components: deepClone(components),
        nextId,
        timestamp: Date.now(),
    };
    try {
        const docRef = doc(db, SAVED_LAYOUTS_COLLECTION, layoutName);
        await setDoc(docRef, sanitizeForFirebase(newLayout));
        toast({ title: "Success", description: `Layout "${layoutName}" saved.` });
    } catch (error) {
        console.error("Error saving layout:", error);
        toast({ title: "Save Failed", description: "Could not save layout to Firestore.", variant: "destructive" });
        throw error; // Re-throw to be caught in the modal
    }
  }, [designState, toast]);

  const loadLayout = useCallback((layout: SavedLayout) => {
    updateStateWithHistory(prev => ({
        components: layout.components,
        nextId: layout.nextId,
        selectedComponentId: null,
        editingLayoutInfo: null,
        editingTemplateInfo: null,
    }));
  }, [updateStateWithHistory]);

  const loadLayoutForEditing = useCallback((layout: SavedLayout) => {
    mainDesignCanvasStateRef.current = deepClone(designState.components);
    setDesignState(prev => ({
        ...prev,
        components: layout.components,
        nextId: layout.nextId,
        editingLayoutInfo: {
            firestoreId: layout.firestoreId,
            name: layout.name,
        },
        selectedComponentId: null,
        history: [],
        future: [],
    }));
  }, [designState.components]);

  const updateLayout = useCallback(async () => {
    const { editingLayoutInfo, components, nextId } = designState;
    if (!editingLayoutInfo || !editingLayoutInfo.firestoreId) {
        toast({ title: "Error", description: "No layout is currently being edited.", variant: "destructive" });
        return;
    }
    const updatedLayoutData = {
        name: editingLayoutInfo.name,
        components: components,
        nextId,
        timestamp: Date.now(),
    };
    try {
        const layoutDocRef = doc(db, SAVED_LAYOUTS_COLLECTION, editingLayoutInfo.firestoreId);
        await setDoc(layoutDocRef, sanitizeForFirebase(updatedLayoutData), { merge: true });
        toast({ title: "Success", description: `Layout "${editingLayoutInfo.name}" updated.` });

        // Exit editing mode
        setDesignState(prev => ({
            ...prev,
            components: mainDesignCanvasStateRef.current,
            editingLayoutInfo: null,
            selectedComponentId: null,
            history: [],
            future: [],
        }));

    } catch (error) {
        console.error("Error updating layout:", error);
        toast({ title: "Update Failed", description: "Could not update layout in Firestore.", variant: "destructive" });
    }
  }, [designState, toast]);

  const deleteLayout = useCallback(async (firestoreId: string) => {
    try {
        await deleteDoc(doc(db, SAVED_LAYOUTS_COLLECTION, firestoreId));
        toast({ title: "Layout Deleted", description: "The layout has been deleted." });
    } catch (error) {
        console.error("Error deleting layout:", error);
        toast({ title: "Delete Failed", description: "Could not delete the layout from Firestore.", variant: "destructive" });
    }
  }, [toast]);


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
    undo, redo, copyComponent, pasteComponent, 
    saveSelectedAsCustomTemplate, loadTemplateForEditing, updateCustomTemplate, deleteCustomTemplate,
    saveCurrentCanvasAsLayout, loadLayout, loadLayoutForEditing, updateLayout, deleteLayout,
    addImageToGallery, removeImageFromGallery,
    isLoadingCustomTemplates,
    isLoadingLayouts,
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
