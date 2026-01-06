

'use client';

import type { ReactNode} from 'react';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { DesignComponent, DesignState, ComponentType, BaseComponentProps, CustomComponentTemplate, SavedLayout, GalleryImage, SingleDesign, M3Colors, M3Typography, M3Shapes } from '@/types/compose-spec';
import {
    getDefaultProperties, CUSTOM_COMPONENT_TYPE_PREFIX, isContainerType as isContainerTypeUtil, getComponentDisplayName, ROOT_SCAFFOLD_ID, DEFAULT_CONTENT_LAZY_COLUMN_ID, CORE_SCAFFOLD_ELEMENT_IDS, CUSTOM_TEMPLATES_COLLECTION, SAVED_LAYOUTS_COLLECTION, GALLERY_IMAGES_COLLECTION, defaultLightColors, defaultDarkColors, defaultTypography, defaultShapes,
    APP_THEME_COLLECTION,
    M3_THEME_DOC_ID
} from '@/types/compose-spec';
import { db } from '@/lib/firebase';
import { collection, doc, setDoc, getDocs, deleteDoc, query, orderBy, onSnapshot, Unsubscribe, getDoc } from "firebase/firestore";
import { useToast } from '@/hooks/use-toast';
import { useDebouncedCallback } from 'use-debounce';
import { fetchAndAnalyzeEndpoint } from '@/app/actions';
import type { CarouselWizardModalRef } from '@/components/compose-builder/CarouselWizardModal';

interface DesignContextType extends DesignState {
  // New tab management functions
  addNewDesign: () => void;
  closeDesign: (designId: string) => void;
  setActiveDesign: (designId: string) => void;
  updateDesignName: (designId: string, newName: string) => void;
  activeDesign: SingleDesign | undefined;

  // M3 Theme state and updater
  m3Theme: {
    lightColors: M3Colors;
    darkColors: M3Colors;
    customLightColors: any[]; // Define more strictly if needed
    customDarkColors: any[]; // Define more strictly if needed
    typography: M3Typography;
    shapes: M3Shapes;
  };
  setM3Theme: React.Dispatch<React.SetStateAction<DesignContextType['m3Theme']>>;
  activeM3ThemeScheme: 'light' | 'dark';
  setActiveM3ThemeScheme: React.Dispatch<React.SetStateAction<'light' | 'dark'>>;


  // Existing functions, now adapted for multi-tab
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
  generateChildrenFromDataSource: (parentId: string) => Promise<void>;
  generateStaticChildren: (parentId: string, childTypeOrTemplateId: string, count: number) => void;
  isLoadingCustomTemplates: boolean;
  isLoadingLayouts: boolean;
  
  // Carousel Wizard
  openCarouselWizard: (carouselId: string) => void;

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


const createNewDesign = (id: string, name: string, components?: DesignComponent[], nextId?: number): SingleDesign => ({
    id,
    name,
    components: components || createInitialComponents(),
    selectedComponentId: components ? null : DEFAULT_CONTENT_LAZY_COLUMN_ID,
    nextId: nextId || 1,
    history: [],
    future: [],
    clipboard: null,
    editingTemplateInfo: null,
    editingLayoutInfo: null,
});


const defaultThemeState = {
  lightColors: defaultLightColors,
  darkColors: defaultDarkColors,
  customLightColors: [],
  customDarkColors: [],
  typography: defaultTypography,
  shapes: defaultShapes,
};


const createInitialDesignState = (): DesignState => ({
  designs: [createNewDesign('design-1', 'Untitled-1')],
  activeDesignId: 'design-1',
  customComponentTemplates: [],
  savedLayouts: [],
  galleryImages: [],
  activeM3ThemeScheme: 'light',
  m3Theme: defaultThemeState,
});


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

function sanitizeForFirebase(data: any): any {
  if (data === undefined) {
    return null;
  }
  if (data === null || typeof data !== 'object') {
    return data;
  }
  if (Array.isArray(data)) {
    return data.map(item => sanitizeForFirebase(item));
  }
  const newObj: { [key: string]: any } = {};
  for (const key in data) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      const value = data[key];
      newObj[key] = sanitizeForFirebase(value);
    }
  }
  return newObj;
}

interface DesignProviderProps {
  children: ReactNode;
  carouselWizardModalRef: React.RefObject<CarouselWizardModalRef>;
}

export const DesignProvider: React.FC<DesignProviderProps> = ({ children, carouselWizardModalRef }) => {
  const [designState, setDesignState] = React.useState<DesignState>(createInitialDesignState());
  const { toast } = useToast();
  const [zoomLevel, setZoomLevel] = useState(0.7);
  const [isLoadingCustomTemplates, setIsLoadingCustomTemplates] = useState(true);
  const [isLoadingLayouts, setIsLoadingLayouts] = useState(true);


  // This ref now stores the state of the *non-editing* designs when entering an editing mode.
  const mainDesignTabsStateRef = useRef<SingleDesign[]>([]);

  // Find the active design
  const activeDesign = designState.designs.find(d => d.id === designState.activeDesignId);

  // --- M3 Theme Persistence ---
  const { m3Theme, activeM3ThemeScheme } = designState;

  // Debounced function to save the theme to Firestore
  const debouncedSaveTheme = useDebouncedCallback((themeToSave: DesignContextType['m3Theme']) => {
      if (db) {
          const themeDocRef = doc(db, APP_THEME_COLLECTION, M3_THEME_DOC_ID);
          // We use setDoc with merge:true to be safe, although we are saving the whole object.
          setDoc(themeDocRef, sanitizeForFirebase(themeToSave), { merge: true }).catch(error => {
              console.error("Failed to save theme to Firestore:", error);
              toast({
                  title: "Theme Save Error",
                  description: "Could not save theme changes to the cloud.",
                  variant: "destructive"
              });
          });
      }
  }, 500); // 500ms debounce delay

  const setM3Theme = (
    updater: React.SetStateAction<DesignContextType['m3Theme']>
  ) => {
    setDesignState(prev => {
      const newM3Theme = typeof updater === 'function' ? updater(prev.m3Theme) : updater;
      if (newM3Theme !== prev.m3Theme) {
        // Save to Firestore upon update
        debouncedSaveTheme(newM3Theme);
        return { ...prev, m3Theme: newM3Theme };
      }
      return prev;
    });
  };
  
  const setActiveM3ThemeScheme = (scheme: 'light' | 'dark') => {
      setDesignState(prev => ({...prev, activeM3ThemeScheme: scheme}));
  }

  // Effect to load theme from Firestore, ONLY on the client after hydration
  useEffect(() => {
    if (db) {
      const themeDocRef = doc(db, APP_THEME_COLLECTION, M3_THEME_DOC_ID);
      const unsubscribe = onSnapshot(themeDocRef, (docSnap) => {
        if (docSnap.exists()) {
          const loadedTheme = docSnap.data();
          // Basic validation
          if (loadedTheme.lightColors && loadedTheme.darkColors && loadedTheme.typography && loadedTheme.shapes) {
            setDesignState(prev => ({...prev, m3Theme: loadedTheme as DesignContextType['m3Theme'] }));
          }
        } else {
          console.log("No custom theme found in Firestore, using default.");
          // Optionally, save the default theme to Firestore if it doesn't exist
          getDoc(themeDocRef).then(doc => {
            if (!doc.exists()) {
               setDoc(themeDocRef, sanitizeForFirebase(defaultThemeState)).catch(e => console.error("Could not save initial default theme:", e));
            }
          });
        }
      }, (error) => {
        console.error("Error loading theme from Firestore:", error);
        toast({
          title: "Theme Load Error",
          description: "Could not load theme from the cloud.",
          variant: "destructive"
        });
      });

      return () => unsubscribe(); // Cleanup subscription on unmount
    }
  }, [toast]);

  
  // Wrapper for state updates to manage history for the active design
  const updateActiveDesignWithHistory = useCallback((
    updater: (activeDesign: SingleDesign) => Partial<Omit<SingleDesign, 'id' | 'name'>> | null
  ) => {
    setDesignState(prev => {
      const activeDesignIndex = prev.designs.findIndex(d => d.id === prev.activeDesignId);
      if (activeDesignIndex === -1) return prev;

      const currentActiveDesign = prev.designs[activeDesignIndex];
      const updates = updater(currentActiveDesign);

      if (updates === null) return prev; // No change

      const newHistory = [...currentActiveDesign.history, { 
          components: currentActiveDesign.components, 
          nextId: currentActiveDesign.nextId, 
          selectedComponentId: currentActiveDesign.selectedComponentId 
      }];
      if (newHistory.length > 50) newHistory.shift();
      
      const newActiveDesign: SingleDesign = {
        ...currentActiveDesign,
        ...updates,
        history: newHistory,
        future: [],
      };

      const newDesigns = [...prev.designs];
      newDesigns[activeDesignIndex] = newActiveDesign;
      
      return { ...prev, designs: newDesigns };
    });
  }, []);

  const addNewDesign = useCallback(() => {
    setDesignState(prev => {
      const newId = `design-${Date.now()}`;
      const newName = `Untitled-${prev.designs.length + 1}`;
      const newDesign = createNewDesign(newId, newName);
      return {
        ...prev,
        designs: [...prev.designs, newDesign],
        activeDesignId: newId,
      }
    });
  }, []);

  const closeDesign = useCallback((designId: string) => {
    setDesignState(prev => {
      // If we are closing an editing tab, just go back to the main designs.
      const designToClose = prev.designs.find(d => d.id === designId);
      if (designToClose && (designToClose.editingLayoutInfo || designToClose.editingTemplateInfo)) {
          return {
              ...prev,
              designs: mainDesignTabsStateRef.current.length > 0 ? mainDesignTabsStateRef.current : [createNewDesign('design-1', 'Untitled-1')],
              activeDesignId: mainDesignTabsStateRef.current[0]?.id || 'design-1',
          }
      }

      if (prev.designs.length <= 1) return prev;

      const newDesigns = prev.designs.filter(d => d.id !== designId);
      let newActiveId = prev.activeDesignId;

      if (newActiveId === designId) {
        const closingIndex = prev.designs.findIndex(d => d.id === designId);
        newActiveId = (newDesigns[closingIndex] || newDesigns[closingIndex - 1] || newDesigns[0]).id;
      }
      return { ...prev, designs: newDesigns, activeDesignId: newActiveId };
    });
  }, []);

  const setActiveDesign = useCallback((designId: string) => {
    setDesignState(prev => ({ ...prev, activeDesignId: designId }));
  }, []);

  const updateDesignName = useCallback((designId: string, newName: string) => {
    setDesignState(prev => {
      const newDesigns = prev.designs.map(d => d.id === designId ? {...d, name: newName} : d);
      return { ...prev, designs: newDesigns };
    });
  }, []);
  
  useEffect(() => {
    // Firestore subscriptions
    const unsubscribers: Unsubscribe[] = [];
    if (db) {
        setIsLoadingCustomTemplates(true);
        setIsLoadingLayouts(true);
        
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
      
      const finalGallery = [...defaultGalleryImages, ...userAddedImages];
      
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
    (id: string) => activeDesign?.components.find(comp => comp.id === id),
    [activeDesign]
  );

  const openCarouselWizard = useCallback((carouselId: string) => {
    if (carouselWizardModalRef?.current) {
        carouselWizardModalRef.current.openModal(carouselId);
    } else {
        console.error("CarouselWizardModal ref not available in DesignContext!");
    }
  }, [carouselWizardModalRef]);
  
  const addComponent = React.useCallback((
    typeOrTemplateId: ComponentType | string,
    parentIdOrNull: string | null = DEFAULT_CONTENT_LAZY_COLUMN_ID,
    _dropPosition?: { x: number; y: number },
    index?: number
  ) => {
    updateActiveDesignWithHistory(activeDesign => {
      let { components: updatedComponentsList, nextId: currentNextId } = deepClone(activeDesign);
  
      let finalSelectedComponentId = '';
      const componentsToAdd: DesignComponent[] = [];
      let effectiveParentId = parentIdOrNull;
  
      if (typeOrTemplateId === 'TopAppBar') effectiveParentId = ROOT_SCAFFOLD_ID;
      else if (typeOrTemplateId === 'BottomNavigationBar') effectiveParentId = ROOT_SCAFFOLD_ID;
      else if (parentIdOrNull === ROOT_SCAFFOLD_ID) effectiveParentId = DEFAULT_CONTENT_LAZY_COLUMN_ID;
      else if (!parentIdOrNull) effectiveParentId = DEFAULT_CONTENT_LAZY_COLUMN_ID;
  
      let parentComponent = updatedComponentsList.find(c => c.id === effectiveParentId);
      if (!parentComponent || !isContainerTypeUtil(parentComponent.type, designState.customComponentTemplates)) {
        effectiveParentId = DEFAULT_CONTENT_LAZY_COLUMN_ID;
      }
  
      const newId = `comp-${currentNextId++}`;
      finalSelectedComponentId = newId;
      const defaultProps = getDefaultProperties(typeOrTemplateId as ComponentType, newId);

      const newComponentBase: DesignComponent = {
        id: newId,
        type: typeOrTemplateId as ComponentType,
        name: `${getComponentDisplayName(typeOrTemplateId as ComponentType)} ${newId.split('-')[1]}`,
        properties: defaultProps,
        parentId: effectiveParentId,
      };
      
      if (typeOrTemplateId.startsWith(CUSTOM_COMPONENT_TYPE_PREFIX)) {
        const template = designState.customComponentTemplates.find(t => t.templateId === typeOrTemplateId);
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
          return null;
        }
      } else {
        componentsToAdd.push(newComponentBase);
      }
  
      updatedComponentsList.push(...componentsToAdd);
  
      if (effectiveParentId) {
        const parentIdx = updatedComponentsList.findIndex(c => c.id === effectiveParentId);
        if (parentIdx !== -1) {
          const parent = updatedComponentsList[parentIdx];
          if (isContainerTypeUtil(parent.type, designState.customComponentTemplates) || parent.templateIdRef) {
            const childIdsToAdd = componentsToAdd.filter(c => c.parentId === effectiveParentId).map(c => c.id);
            let children = [...(parent.properties.children || [])];
            if (index !== undefined && index >= 0) {
              children.splice(index, 0, ...childIdsToAdd);
            } else {
              children.push(...childIdsToAdd);
            }
            updatedComponentsList[parentIdx] = { ...parent, properties: { ...parent.properties, children } };
          }
        }
      }
  
      if (typeOrTemplateId === 'Carousel') {
        setTimeout(() => openCarouselWizard(finalSelectedComponentId), 50);
      }
  
      return { components: updatedComponentsList, nextId: currentNextId, selectedComponentId: finalSelectedComponentId };
    });
  }, [updateActiveDesignWithHistory, designState.customComponentTemplates, openCarouselWizard]);

 const generateChildrenFromDataSource = useCallback(async (parentId: string) => {
    if (!activeDesign) return;

    const parent = activeDesign.components.find(c => c.id === parentId);
    if (!parent || !parent.properties.dataSource?.url) {
      toast({ title: "Error", description: "Parent or data source URL not found.", variant: "destructive" });
      return;
    }
    const { url } = parent.properties.dataSource;
    const bindings = parent.properties.dataBindings || {};
    const childTemplateComponent = parent.properties.childrenTemplate;

    if (!childTemplateComponent) {
        toast({ title: "Error", description: "No child template selected for data binding.", variant: "destructive" });
        return;
    }

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      if (!Array.isArray(data)) throw new Error("Data source did not return an array.");

      updateActiveDesignWithHistory(currentActiveDesign => {
        let { components: updatedComponents, nextId: newNextId } = deepClone(currentActiveDesign);
        
        const parentComponentIdx = updatedComponents.findIndex(c => c.id === parentId);
        if (parentComponentIdx === -1) return null;

        // Clear existing children
        const childrenToRemove = new Set(updatedComponents[parentComponentIdx].properties.children || []);
        updatedComponents = updatedComponents.filter(c => !childrenToRemove.has(c.id));
        
        const allNewGeneratedComponents: DesignComponent[] = [];
        const newTopLevelChildIds: string[] = [];

        data.forEach((itemData: Record<string, any>) => {
          let componentsToClone: DesignComponent[] = [];
          if (childTemplateComponent.templateIdRef) {
            const template = designState.customComponentTemplates.find(t => t.templateId === childTemplateComponent.templateIdRef);
            if (template) componentsToClone = deepClone(template.componentTree);
          } else {
            componentsToClone = [deepClone(childTemplateComponent)];
          }

          if (componentsToClone.length === 0) return;

          const idMap: Record<string, string> = {};
          const newInstances = componentsToClone.map(comp => {
            const newId = `comp-${newNextId++}`;
            idMap[comp.id] = newId;
            return { ...comp, id: newId, name: `${comp.name} ${newId.split('-')[1]}` };
          });

          newInstances.forEach(instance => {
            if (instance.parentId) instance.parentId = idMap[instance.parentId];
            if (instance.properties.children) {
              instance.properties.children = instance.properties.children.map(cid => idMap[cid]);
            }
            // Apply data bindings
            Object.keys(bindings).forEach(propPath => {
              const [componentIdInTemplate, propName] = propPath.split('.');
              
              if(idMap[componentIdInTemplate] === instance.id) {
                 const bindingKey = bindings[propPath].replace(/[{}]/g, '');
                  if (itemData[bindingKey] !== undefined) {
                    (instance.properties as any)[propName] = itemData[bindingKey];
                  }
              }
            });
          });

          const rootInstance = newInstances.find(i => !i.parentId || i.parentId === null);
          if (rootInstance) {
            rootInstance.parentId = parentId;
            newTopLevelChildIds.push(rootInstance.id);
          }
          allNewGeneratedComponents.push(...newInstances);
        });

        updatedComponents.push(...allNewGeneratedComponents);
        const finalParentIdx = updatedComponents.findIndex(c => c.id === parentId);
        if (finalParentIdx !== -1) {
          updatedComponents[finalParentIdx].properties.children = newTopLevelChildIds;
        }
        
        return {
          components: updatedComponents,
          nextId: newNextId,
          selectedComponentId: parentId,
        };
      });
      
      toast({ title: "Success", description: `${data.length} children generated from data source.` });

    } catch (error) {
      console.error("Error generating children from data source:", error);
      toast({ title: "Generation Failed", description: error instanceof Error ? error.message : "Unknown error", variant: "destructive" });
    }
  }, [activeDesign, toast, designState.customComponentTemplates, updateActiveDesignWithHistory]);


  const deleteComponent = React.useCallback((id: string) => {
    updateActiveDesignWithHistory(activeDesign => {
      if (CORE_SCAFFOLD_ELEMENT_IDS.includes(id)) return null;
      
      const { components: currentComponents } = deepClone(activeDesign);

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
      const newSelectedId = idsToDelete.has(activeDesign.selectedComponentId || "") ? (parentId || DEFAULT_CONTENT_LAZY_COLUMN_ID) : activeDesign.selectedComponentId;
      
      return { components: newComps, selectedComponentId: newSelectedId };
    });
  }, [updateActiveDesignWithHistory]);


  const selectComponent = React.useCallback((id: string | null) => {
    setDesignState(prev => {
        const activeDesignIndex = prev.designs.findIndex(d => d.id === prev.activeDesignId);
        if (activeDesignIndex === -1) return prev;
        
        const newDesigns = [...prev.designs];
        newDesigns[activeDesignIndex] = {
            ...newDesigns[activeDesignIndex],
            selectedComponentId: id,
        };

        return { ...prev, designs: newDesigns };
    });
  }, []);

  const updateComponent = React.useCallback((id: string, updates: { name?: string; properties?: Partial<BaseComponentProps>; templateIdRef?: string }) => {
    updateActiveDesignWithHistory(activeDesign => {
        const newComponents = activeDesign.components.map(comp => {
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
  }, [updateActiveDesignWithHistory]);

  const updateComponentPosition = React.useCallback((_id: string, _position: { x: number; y: number }) => {
     console.warn("updateComponentPosition is deprecated.");
  }, []);

  const clearDesign = React.useCallback(() => {
    if (activeDesign?.editingTemplateInfo || activeDesign?.editingLayoutInfo) {
      // If editing, this is the "close" action.
      closeDesign(designState.activeDesignId);
    } else {
      updateActiveDesignWithHistory(activeDesign => ({
        components: createInitialComponents(),
        nextId: 1,
        selectedComponentId: DEFAULT_CONTENT_LAZY_COLUMN_ID,
        history: [], // Clear history for this tab
        future: [],
      }));
    }
  }, [activeDesign, updateActiveDesignWithHistory, closeDesign, designState.activeDesignId]);

  const overwriteComponents = React.useCallback((hierarchicalUserComponentsJson: any[]): { success: boolean, error?: string } => {
    if (!Array.isArray(hierarchicalUserComponentsJson)) return { success: false, error: "Data must be an array." };
    
    let success = false;
    let error: string | undefined;

    updateActiveDesignWithHistory(activeDesign => {
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
            return null; // Return null to indicate no state change
        }
    });
    
    if (error) return { success: false, error };
    return { success: true };
  }, [updateActiveDesignWithHistory]);

  const moveComponent = React.useCallback((draggedId: string, newParentId: string | null, newIndex?: number) => {
    updateActiveDesignWithHistory(activeDesign => {
        const comps = deepClone(activeDesign.components);
        const draggedIdx = comps.findIndex(c => c.id === draggedId);
        if (draggedIdx === -1) return null;
        
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
  }, [updateActiveDesignWithHistory]);

  const undo = React.useCallback(() => {
    setDesignState(prev => {
      const activeDesignIndex = prev.designs.findIndex(d => d.id === prev.activeDesignId);
      if (activeDesignIndex === -1) return prev;
      
      const activeDesign = prev.designs[activeDesignIndex];
      if (activeDesign.history.length === 0) return prev;

      const lastState = activeDesign.history[activeDesign.history.length - 1];
      const newFuture = [{components: activeDesign.components, nextId: activeDesign.nextId, selectedComponentId: activeDesign.selectedComponentId}, ...activeDesign.future];
      
      const updatedActiveDesign: SingleDesign = {
          ...activeDesign,
          ...lastState,
          history: activeDesign.history.slice(0, activeDesign.history.length - 1),
          future: newFuture,
      };

      const newDesigns = [...prev.designs];
      newDesigns[activeDesignIndex] = updatedActiveDesign;
      return { ...prev, designs: newDesigns };
    });
  }, []);

  const redo = React.useCallback(() => {
    setDesignState(prev => {
        const activeDesignIndex = prev.designs.findIndex(d => d.id === prev.activeDesignId);
        if (activeDesignIndex === -1) return prev;
        
        const activeDesign = prev.designs[activeDesignIndex];
        if (activeDesign.future.length === 0) return prev;

        const nextState = activeDesign.future[0];
        const newHistory = [...activeDesign.history, {components: activeDesign.components, nextId: activeDesign.nextId, selectedComponentId: activeDesign.selectedComponentId}];
        
        const updatedActiveDesign: SingleDesign = {
          ...activeDesign,
          ...nextState,
          history: newHistory,
          future: activeDesign.future.slice(1),
        };

        const newDesigns = [...prev.designs];
        newDesigns[activeDesignIndex] = updatedActiveDesign;
        return { ...prev, designs: newDesigns };
    });
  }, []);

  const copyComponent = React.useCallback((id: string): {success: boolean, message?: string} => {
    if (!activeDesign) return { success: false, message: "No active design." };
    const compToCopy = activeDesign.components.find(c => c.id === id);
    
    if (!compToCopy || CORE_SCAFFOLD_ELEMENT_IDS.includes(id)) {
        return { success: false, message: "Cannot copy this component." };
    }

    const collectDescendants = (startId: string, allComps: DesignComponent[]): DesignComponent[] => {
        const comp = allComps.find(c => c.id === startId);
        if (!comp) return [];
        let descendants = [deepClone(comp)];
        if (comp.properties.children) {
            comp.properties.children.forEach(cid => {
                descendants = [...descendants, ...collectDescendants(cid, allComps)];
            });
        }
        return descendants;
    };

    const copiedTree = collectDescendants(id, activeDesign.components);
    if (copiedTree.length > 0) copiedTree[0].parentId = null;

    updateActiveDesignWithHistory(ad => ({ clipboard: copiedTree }));

    return { success: true, message: `"${compToCopy.name}" copied.` };
  }, [activeDesign, updateActiveDesignWithHistory]);

  const pasteComponent = React.useCallback((targetParentId?: string | null): {success: boolean, message?: string} => {
    if (!activeDesign?.clipboard) {
        return { success: false, message: "Clipboard is empty." };
    }
  
    let success = false;
    let message = "";

    updateActiveDesignWithHistory(activeDesign => {
        const { clipboard } = activeDesign;
        if (!clipboard) return null;

        const newComponents = deepClone(activeDesign.components);
        let newNextId = activeDesign.nextId;

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
            const selected = newComponents.find(c => c.id === activeDesign.selectedComponentId);
            parentId = selected ? (isContainerTypeUtil(selected.type, designState.customComponentTemplates) ? selected.id : selected.parentId) : DEFAULT_CONTENT_LAZY_COLUMN_ID;
        }
        if (!parentId) parentId = DEFAULT_CONTENT_LAZY_COLUMN_ID;
        rootPasted.parentId = parentId;

        const parentIdx = newComponents.findIndex(c => c.id === parentId);
        if (parentIdx === -1) {
            success = false;
            message = "Target parent not found.";
            return null;
        }

        newComponents.push(...pastedComps);
        const parent = newComponents[parentIdx];
        parent.properties.children = [...(parent.properties.children || []), rootPasted.id];

        success = true;
        message = `Pasted "${rootPasted.name}".`;
        
        return { components: newComponents, nextId: newNextId, selectedComponentId: rootPasted.id };
    });

    if (success) {
        toast({ title: "Component Pasted", description: message });
    } else if (message) {
        toast({ title: "Paste Failed", description: message, variant: "destructive" });
    }

    return { success, message };
  }, [activeDesign, updateActiveDesignWithHistory, designState.customComponentTemplates, toast]);
  
  const saveSelectedAsCustomTemplate = useCallback(async (templateName: string) => {
    if (!activeDesign || !activeDesign.selectedComponentId) {
        toast({ title: "Error", description: "No active design or component selected.", variant: "destructive" });
        return;
    }
    const { selectedComponentId, components } = activeDesign;
    
    const collectDescendants = (startId: string, allComps: DesignComponent[]): DesignComponent[] => {
      const visited = new Set<string>();
      const result: DesignComponent[] = [];
      const queue: string[] = [startId];
      visited.add(startId);

      while (queue.length > 0) {
        const currentId = queue.shift()!;
        const component = allComps.find(c => c.id === currentId);
        if (component) {
          result.push(deepClone(component));
          if (component.properties.children) {
            for (const childId of component.properties.children) {
              if (!visited.has(childId)) {
                visited.add(childId);
                queue.push(childId);
              }
            }
          }
        }
      }
      return result;
    };
    
    const componentTree = collectDescendants(selectedComponentId, components);

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
        toast({ title: "Save Failed", description: `Could not save component to firestore: ${error instanceof Error ? error.message : 'Unknown error'}`, variant: "destructive" });
    }
  }, [activeDesign, toast]);

  const updateCustomTemplate = useCallback(async () => {
    if (!activeDesign?.editingTemplateInfo || !activeDesign.editingTemplateInfo.firestoreId) {
        toast({ title: "Error", description: "No template is currently being edited.", variant: "destructive" });
        return;
    }
    const { editingTemplateInfo, components } = activeDesign;
    const updatedTemplateData = {
        name: editingTemplateInfo.name,
        componentTree: sanitizeForFirebase(components),
    };
    try {
        const templateDocRef = doc(db, CUSTOM_TEMPLATES_COLLECTION, editingTemplateInfo.firestoreId);
        await setDoc(templateDocRef, updatedTemplateData, { merge: true });
        toast({ title: "Success", description: `Template "${editingTemplateInfo.name}" updated.` });
        closeDesign(designState.activeDesignId);
    } catch (error) {
        console.error("Error updating custom template:", error);
        toast({ title: "Update Failed", description: "Could not update template in Firestore.", variant: "destructive" });
    }
  }, [activeDesign, designState.activeDesignId, toast, closeDesign]);
  
  const loadTemplateForEditing = useCallback((template: CustomComponentTemplate) => {
    setDesignState(prev => {
      mainDesignTabsStateRef.current = deepClone(prev.designs);
      const newId = `edit-template-${template.firestoreId}`;
      const editDesign: SingleDesign = {
        id: newId,
        name: `Editing: ${template.name}`,
        components: template.componentTree,
        selectedComponentId: null, // Don't select anything by default
        nextId: 1000, // Arbitrary high number for temp IDs
        history: [],
        future: [],
        clipboard: null,
        editingTemplateInfo: {
          templateId: template.templateId,
          firestoreId: template.firestoreId,
          name: template.name,
          rootComponentId: template.rootComponentId,
        },
        editingLayoutInfo: null,
      };
      return {
        ...prev,
        designs: [editDesign],
        activeDesignId: newId,
      }
    });
  }, []);

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
    if (!activeDesign) {
        toast({ title: "Error", description: "No active design to save.", variant: "destructive" });
        throw new Error("No active design to save.");
    }
    const { components, nextId } = activeDesign;
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
        throw error;
    }
  }, [activeDesign, toast]);

  const loadLayout = useCallback((layout: SavedLayout) => {
     setDesignState(prev => {
        const newId = `layout-${layout.firestoreId}-${Date.now()}`;
        const newDesign = createNewDesign(newId, layout.name, layout.components, layout.nextId);
        return {
          ...prev,
          designs: [...prev.designs, newDesign],
          activeDesignId: newId,
        }
     });
  }, []);

  const loadLayoutForEditing = useCallback((layout: SavedLayout) => {
    setDesignState(prev => {
      mainDesignTabsStateRef.current = deepClone(prev.designs);
      const newId = `edit-layout-${layout.firestoreId}`;
      const editDesign: SingleDesign = {
        id: newId,
        name: `Editing: ${layout.name}`,
        components: layout.components,
        nextId: layout.nextId,
        selectedComponentId: null,
        history: [],
        future: [],
        clipboard: null,
        editingLayoutInfo: {
            firestoreId: layout.firestoreId,
            name: layout.name,
        },
        editingTemplateInfo: null,
      };
      return {
        ...prev,
        designs: [editDesign],
        activeDesignId: newId,
      }
    });
  }, []);

  const updateLayout = useCallback(async () => {
    if (!activeDesign?.editingLayoutInfo || !activeDesign.editingLayoutInfo.firestoreId) {
        toast({ title: "Error", description: "No layout is currently being edited.", variant: "destructive" });
        return;
    }
    const { editingLayoutInfo, components, nextId } = activeDesign;
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
        closeDesign(designState.activeDesignId);
    } catch (error) {
        console.error("Error updating layout:", error);
        toast({ title: "Update Failed", description: "Could not update layout in Firestore.", variant: "destructive" });
    }
  }, [activeDesign, designState.activeDesignId, toast, closeDesign]);

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
  
  const generateStaticChildren = useCallback((parentId: string, childTypeOrTemplateId: string, count: number) => {
    if (!activeDesign) return;

    if (window.confirm(`This will replace all existing children in the selected container. Are you sure you want to generate ${count} new children?`)) {
      updateActiveDesignWithHistory(ad => {
        let { components, nextId } = deepClone(ad);
        const parentIdx = components.findIndex(c => c.id === parentId);
        if (parentIdx === -1) return null;

        const oldChildrenIds = new Set(components[parentIdx].properties.children || []);
        components = components.filter(c => !oldChildrenIds.has(c.id));

        const parentComponent = components.find(c => c.id === parentId);
        if (!parentComponent) return null; // Should not happen after filtering
        parentComponent.properties.children = [];

        let currentNextId = nextId;
        const newChildRootIds: string[] = [];
        
        for (let i = 0; i < count; i++) {
            let componentsToAdd: DesignComponent[] = [];
            if (childTypeOrTemplateId.startsWith(CUSTOM_COMPONENT_TYPE_PREFIX)) {
                const template = designState.customComponentTemplates.find(t => t.templateId === childTypeOrTemplateId);
                if (template) {
                    const idMap: Record<string, string> = {};
                    const newTemplateComponents = deepClone(template.componentTree).map((c: DesignComponent) => {
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
                    rootOfPasted.parentId = parentId;
                    rootOfPasted.templateIdRef = template.templateId;
                    rootOfPasted.name = `${template.name} ${i + 1}`;
                    newChildRootIds.push(rootOfPasted.id);
                    componentsToAdd.push(...newTemplateComponents);
                }
            } else {
                const newId = `comp-${currentNextId++}`;
                newChildRootIds.push(newId);
                componentsToAdd.push({
                    id: newId,
                    type: childTypeOrTemplateId as ComponentType,
                    name: `${getComponentDisplayName(childTypeOrTemplateId as ComponentType)} ${i + 1}`,
                    properties: { ...getDefaultProperties(childTypeOrTemplateId as ComponentType, newId) },
                    parentId: parentId,
                });
            }
            components.push(...componentsToAdd);
        }
        
        const finalParent = components.find(c => c.id === parentId);
        if (finalParent) {
            finalParent.properties.children = newChildRootIds;
        }

        return {
          components,
          nextId: currentNextId,
          selectedComponentId: ad.selectedComponentId
        };
      });
    }
  }, [activeDesign, updateActiveDesignWithHistory, designState.customComponentTemplates]);


  const contextValue: DesignContextType = {
    ...designState,
    setM3Theme,
    setActiveM3ThemeScheme,
    activeDesign,
    addNewDesign, closeDesign, setActiveDesign, updateDesignName,
    addComponent, deleteComponent, selectComponent, updateComponent, updateComponentPosition,
    getComponentById, clearDesign, overwriteComponents, moveComponent,
    undo, redo, copyComponent, pasteComponent, 
    saveSelectedAsCustomTemplate, loadTemplateForEditing, updateCustomTemplate, deleteCustomTemplate,
    saveCurrentCanvasAsLayout, loadLayout, loadLayoutForEditing, updateLayout, deleteLayout,
    addImageToGallery, removeImageFromGallery,
    generateChildrenFromDataSource,
    generateStaticChildren,
    isLoadingCustomTemplates,
    isLoadingLayouts,
    openCarouselWizard,
    zoomLevel, setZoomLevel,
  };

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
