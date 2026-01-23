

import { z } from 'zod';

export type ComponentType =
  | 'Text'
  | 'Button'
  | 'Column'
  | 'Row'
  | 'Image'
  | 'Box'
  | 'Card'
  | 'Carousel' // Added
  | 'LazyColumn'
  | 'LazyRow'
  | 'LazyVerticalGrid'
  | 'LazyHorizontalGrid'
  | 'Spacer'
  | 'TopAppBar' // Added
  | 'BottomNavigationBar' // Added
  | 'AnimatedContent' // Added
  | 'Group' // Added for grouping functionality
  | 'Checkbox'
  | 'RadioButton'
  | 'DropdownMenu' // Added
  | 'Scaffold'; // Explicitly a root type

export const CUSTOM_COMPONENT_TYPE_PREFIX = "custom/";
export const ROOT_SCAFFOLD_ID = 'root-scaffold';
export const DEFAULT_CONTENT_LAZY_COLUMN_ID = 'scaffold-content-lazy-column';
export const DEFAULT_TOP_APP_BAR_ID = 'scaffold-top-app-bar';
export const DEFAULT_BOTTOM_NAV_BAR_ID = 'scaffold-bottom-nav-bar';
export const CORE_SCAFFOLD_ELEMENT_IDS = [ROOT_SCAFFOLD_ID, DEFAULT_TOP_APP_BAR_ID, DEFAULT_CONTENT_LAZY_COLUMN_ID, DEFAULT_BOTTOM_NAV_BAR_ID];

// Firestore and localStorage collection names
export const DESIGNS_COLLECTION = "designs";
export const MAIN_DESIGN_DOC_ID = "main-design-doc";
export const CUSTOM_TEMPLATES_COLLECTION = "custom-component-templates";
export const SAVED_LAYOUTS_COLLECTION = "saved-layouts";
export const GALLERY_IMAGES_COLLECTION = "gallery-images";
export const APP_THEME_COLLECTION = "app-theme";
export const M3_THEME_DOC_ID = "m3-theme";


export interface ComponentPropertyOption {
  label: string;
  value: string;
}
export interface ComponentProperty {
  name:string;
  type: 'string' | 'number' | 'color' | 'boolean' | 'enum' | 'action' | 'gradient';
  value: string | number | boolean;
  options?: ComponentPropertyOption[];
  label: string;
  placeholder?: string;
  group: 'Layout' | 'Appearance' | 'Content' | 'Behavior' | 'Slots' | 'Save' | 'Group' | 'Children Generation' | 'Carousel Settings';
  showIf?: (props: BaseComponentProps, editingLayoutInfo?: SingleDesign['editingLayoutInfo']) => boolean;
}

export interface ClickAction {
  type: 'NAVIGATE' | 'SHOW_TOAST' | 'CUSTOM_EVENT';
  value: string;
}

export interface DataSource {
  url?: string;
  schema?: string[]; // Array of keys from the fetched data
}

export interface LinearGradient {
    type: 'linearGradient';
    colors: string[];
    angle: number;
}

export interface BaseComponentProps {
  [key: string]: any;
  text?: string;
  fontFamily?: string;
  fontSize?: number;
  titleFontSize?: number;
  textColor?: string | null;
  backgroundColor?: string | LinearGradient | null;
  contentColor?: string | null;
  width?: number | string | undefined;
  height?: number | string | undefined;
  fillMaxSize?: boolean;
  fillMaxWidth?: boolean;
  fillMaxHeight?: boolean;
  layoutWeight?: number;
  padding?: number;
  paddingTop?: number;
  paddingBottom?: number;
  paddingStart?: number;
  paddingEnd?: number;
  id?: string;
  children?: string[] | any[];
  contentDescription?: string;
  src?: string | { binding: string };
  "data-ai-hint"?: string;
  elevation?: number;
  cornerRadius?: number;
  cornerRadiusTopLeft?: number;
  cornerRadiusTopRight?: number;
  cornerRadiusBottomRight?: number;
  cornerRadiusBottomLeft?: number;
  borderWidth?: number;
  borderColor?: string;
  columns?: number;
  rows?: number;
  maxLines?: number;
  textOverflow?: 'Clip' | 'Ellipsis' | 'Visible';
  contentScale?: 'Crop' | 'Fit' | 'FillBounds' | 'Inside' | 'None' | 'FillWidth' | 'FillHeight';
  itemSpacing?: number;
  userScrollEnabled?: boolean;
  reverseLayout?: boolean;
  verticalArrangement?: 'Top' | 'Bottom' | 'Center' | 'SpaceAround' | 'SpaceBetween' | 'SpaceEvenly';
  horizontalAlignment?: 'Start' | 'CenterHorizontally' | 'End';
  horizontalArrangement?: 'Start' | 'End' | 'Center' | 'SpaceAround' | 'SpaceBetween' | 'SpaceEvenly';
  verticalAlignment?: 'Top' | 'CenterVertically' | 'Bottom';
  fontWeight?: 'Normal' | 'Semibold' | 'Bold';
  fontStyle?: 'Normal' | 'Italic';
  textAlign?: 'Left' | 'Center' | 'Right' | 'Justify' | 'Start' | 'End';
  textDecoration?: 'None' | 'Underline' | 'LineThrough';
  lineHeight?: number;
  title?: string;
  selfAlign?: 'Inherit' | 'Start' | 'Center' | 'End';
  clickable?: boolean;
  onClickAction?: ClickAction; // Replaces clickId
  iconName?: string;
  iconPosition?: 'Start' | 'End' | 'Top' | 'Bottom';
  iconSize?: number;
  iconSpacing?: number;
  animationType?: 'Fade' | 'Scale' | 'SlideFromTop' | 'SlideFromBottom' | 'SlideFromStart' | 'SlideFromEnd';
  animationDuration?: number;
  shape?: 'Rectangle' | 'RoundedCorner' | 'Circle';
  checked?: boolean; // For Checkbox
  selected?: boolean; // For RadioButton
  enabled?: boolean; // For interactive components
  
  // New Carousel properties
  carouselStyle?: 'Pager' | 'MultiBrowse';
  carouselOrientation?: 'Horizontal' | 'Vertical';
  carouselContentPadding?: number; // For peeking items
  preferredItemWidth?: number; // For MultiBrowseCarousel

  // Properties for Scaffold structure, used by AI generation
  topBarId?: string; // ID of the TopAppBar component
  contentId?: string; // ID of the main content container (e.g., LazyColumn)
  bottomBarId?: string; // ID of the BottomNavigationBar component
  
  // New properties for data binding
  dataSource?: DataSource;
  dataBindings?: Record<string, string>; // e.g., { text: '{name}', src: '{avatar}' }
  childrenTemplate?: DesignComponent; // Stores the template component for lazy containers
}

export interface DesignComponent {
  id: string;
  type: ComponentType | string; // For instances of custom components, this will be the original base type.
  name: string;
  properties: BaseComponentProps & { children?: string[] };
  parentId?: string | null;
  templateIdRef?: string; // If this component is an instance of a custom template, this holds the templateId (e.g., "custom/my-template-123")
}

export interface CustomComponentTemplate {
  firestoreId: string; // ID of the document in Firestore
  templateId: string; // The ID used as a reference (e.g., "custom/my-template-123")
  name: string;
  rootComponentId: string; // The local ID of the root component within componentTree
  componentTree: DesignComponent[]; // The structure of the template
}

export interface SavedLayout {
  firestoreId: string; // ID of the document in Firestore (which is its name)
  name: string;
  components: DesignComponent[];
  nextId: number;
  iconName?: string;
  timestamp?: number; // For sorting and display
}

export interface GalleryImage {
  id: string; // Unique identifier for the image (e.g., timestamp-based, can be local)
  url: string;
  timestamp: number;
}

export interface NavigationItem {
  firestoreId: string; // ID of the SavedLayout document
  name: string;
  iconName: string;
}


export interface SingleDesign {
  id: string;
  name: string;
  components: DesignComponent[];
  selectedComponentId: string | null;
  nextId: number;
  history: { components: DesignComponent[]; nextId: number; selectedComponentId: string | null }[];
  future: { components: DesignComponent[]; nextId: number; selectedComponentId: string | null }[];
  clipboard: DesignComponent[] | null;
  editingTemplateInfo?: {
    templateId: string;
    firestoreId: string;
    name: string;
    rootComponentId: string;
  } | null;
  editingLayoutInfo?: {
    firestoreId: string;
    name: string;
    iconName?: string;
  } | null;
}

export interface M3Colors {
  primary: string;
  onPrimary: string;
  primaryContainer: string;
  onPrimaryContainer: string;
  secondary: string;
  onSecondary: string;
  secondaryContainer: string;
  onSecondaryContainer: string;
  tertiary: string;
  onTertiary: string;
  tertiaryContainer: string;
  onTertiaryContainer: string;
  error: string;
  onError: string;
  errorContainer: string;
  onErrorContainer: string;
  background: string;
  onBackground: string;
  surface: string;
  onSurface: string;
  surfaceVariant: string;
  onSurfaceVariant: string;
  outline: string;
}

export interface CustomColor {
  name: string;
  color: string;
}

export interface TextStyle {
  fontFamily: string;
  fontWeight: 'Normal' | 'Medium' | 'Bold';
  fontSize: number;
}

export interface M3Typography {
  displayLarge: TextStyle;
  displayMedium: TextStyle;
  displaySmall: TextStyle;
  headlineLarge: TextStyle;
  headlineMedium: TextStyle;
  headlineSmall: TextStyle;
  titleLarge: TextStyle;
  titleMedium: TextStyle;
  titleSmall: TextStyle;
  bodyLarge: TextStyle;
  bodyMedium: TextStyle;
  bodySmall: TextStyle;
  labelLarge: TextStyle;
  labelMedium: TextStyle;
  labelSmall: TextStyle;
}

export interface M3Shapes {
  extraSmall: number;
  small: number;
  medium: number;
  large: number;
  extraLarge: number;
}


export interface DesignState {
  designs: SingleDesign[];
  activeDesignId: string;
  activeView: 'design' | 'navigation';
  customComponentTemplates: CustomComponentTemplate[];
  savedLayouts: SavedLayout[];
  galleryImages: GalleryImage[];
  navigationItems: NavigationItem[];
  activeM3ThemeScheme: 'light' | 'dark';
  isUpdating: boolean; // For cascading updates
  m3Theme: {
    lightColors: M3Colors;
    darkColors: M3Colors;
    customLightColors: any[];
    customDarkColors: any[];
    typography: M3Typography;
    shapes: M3Shapes;
  };
}

export interface DesignContextType extends DesignState {
  // ... (existing properties)
  addNewDesign: () => void;
  closeDesign: (designId: string) => void;
  setActiveDesign: (designId: string) => void;
  updateDesignName: (designId: string, newName: string) => void;
  activeDesign: SingleDesign | undefined;
  
  activeView: 'design' | 'navigation';
  setActiveView: (view: 'design' | 'navigation') => void;

  m3Theme: {
    lightColors: M3Colors;
    darkColors: M3Colors;
    customLightColors: any[];
    customDarkColors: any[];
    typography: M3Typography;
    shapes: M3Shapes;
  };
  setM3Theme: React.Dispatch<React.SetStateAction<DesignContextType['m3Theme']>>;
  activeM3ThemeScheme: 'light' | 'dark';
  setActiveM3ThemeScheme: React.Dispatch<React.SetStateAction<'light' | 'dark'>>;

  navigationItems: NavigationItem[];
  addLayoutToNavigation: (layout: SavedLayout) => void;
  removeLayoutFromNavigation: (layoutFirestoreId: string) => void;
  clearNavigation: () => void;

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
  saveCurrentCanvasAsLayout: (layoutName: string, iconName?: string) => Promise<void>;
  loadLayout: (layout: SavedLayout) => void;
  loadLayoutForEditing: (layout: SavedLayout) => void;
  updateEditingLayoutInfo: (updater: (prev: SingleDesign['editingLayoutInfo']) => SingleDesign['editingLayoutInfo']) => void;
  updateLayout: () => Promise<void>;
  deleteLayout: (firestoreId: string) => Promise<void>;
  addImageToGallery: (url: string) => Promise<{success: boolean, message: string}>;
  removeImageFromGallery: (id: string) => Promise<{success: boolean, message: string}>;
  generateChildrenFromDataSource: (parentId: string) => Promise<void>;
  generateStaticChildren: (parentId: string, childTypeOrTemplateId: string, count: number) => void;
  isLoadingCustomTemplates: boolean;
  isLoadingLayouts: boolean;
  
  openCarouselWizard: (carouselId: string) => void;

  zoomLevel: number;
  setZoomLevel: React.Dispatch<React.SetStateAction<number>>;
}

export const isContainerType = (type: ComponentType | string, customTemplates: CustomComponentTemplate[] = []): boolean => {
    if (typeof type !== 'string') return false;

    const standardContainerTypes: (ComponentType | string)[] = [
        'Scaffold', 'Column', 'Row', 'Box', 'Card', 'Carousel', 'LazyColumn', 'LazyRow',
        'LazyVerticalGrid', 'LazyHorizontalGrid', 'TopAppBar', 'BottomNavigationBar',
        'AnimatedContent', 'DropdownMenu'
    ];

    if (standardContainerTypes.includes(type)) {
        return true;
    }

    if (type.startsWith(CUSTOM_COMPONENT_TYPE_PREFIX)) {
        const template = customTemplates.find(t => t.templateId === type);
        if (!template) return false; // If template not found, assume not a container
        const rootComponent = template.componentTree.find(c => c.id === template.rootComponentId);
        if (!rootComponent) return false;
        // Recursively check if the root of the template is a container
        return isContainerType(rootComponent.type, customTemplates);
    }
    
    return false;
};

export const getDefaultProperties = (type: ComponentType | string, componentId?: string): BaseComponentProps => {
  const commonLayout = {
    layoutWeight: 0,
    padding: undefined, paddingTop: undefined, paddingBottom: undefined, paddingStart: undefined, paddingEnd: undefined,
    fillMaxSize: false, fillMaxWidth: false, fillMaxHeight: false,
    selfAlign: 'Inherit' as 'Inherit' | 'Start' | 'Center' | 'End',
  };
   const defaultClickableBehavior = {
    clickable: false,
    onClickAction: { type: 'SHOW_TOAST', value: 'Component clicked!' } as ClickAction,
  };

  switch (type) {
    case 'Scaffold':
      return {
        fillMaxSize: true, fillMaxWidth: true, fillMaxHeight: true,
        backgroundColor: undefined,
        children: [DEFAULT_CONTENT_LAZY_COLUMN_ID],
        iconName: 'LayoutTemplate',
      };
    case 'Text':
      return {
        ...commonLayout,
        text: 'Sample Text',
        fontFamily: 'Inter',
        fontSize: 16,
        textColor: undefined,
        backgroundColor: null,
        padding: 0,
        width: 120,
        height: 25,
        maxLines: undefined,
        textOverflow: 'Clip',
        fontWeight: 'Normal',
        fontStyle: 'Normal',
        textAlign: 'Start',
        textDecoration: 'None',
        lineHeight: 1.5,
        selfAlign: 'Inherit',
        ...defaultClickableBehavior,
      };
    case 'Button':
      return {
        ...commonLayout,
        text: 'Click Me',
        fontSize: 14,
        backgroundColor: undefined,
        textColor: undefined,
        padding: 12,
        width: 120,
        height: 50,
        selfAlign: 'Inherit',
        shape: 'RoundedCorner',
        cornerRadius: 4,
        cornerRadiusTopLeft: 4,
        cornerRadiusTopRight: 4,
        cornerRadiusBottomLeft: 4,
        cornerRadiusBottomRight: 4,
        iconName: '',
        iconPosition: 'Start',
        iconSize: 16,
        iconSpacing: 8,
        ...defaultClickableBehavior,
        onClickAction: { type: 'SHOW_TOAST', value: 'Button tapped!' } as ClickAction,
      };
    case 'Image':
      return {
        ...commonLayout,
        src: 'https://placehold.co/300x200.png',
        contentDescription: 'Placeholder Image',
        backgroundColor: null,
        width: 150,
        height: 100,
        "data-ai-hint": "abstract pattern",
        contentScale: 'Crop',
        cornerRadiusTopLeft: 0, cornerRadiusTopRight: 0, cornerRadiusBottomRight: 0, cornerRadiusBottomLeft: 0,
        padding: 0,
        selfAlign: 'Inherit',
        ...defaultClickableBehavior,
      };
    case 'Checkbox':
        return {
            ...commonLayout,
            width: 155, height: 35, padding: 4,
            text: 'Checkbox Label',
            checked: false,
            enabled: true,
            selfAlign: 'Inherit',
        };
    case 'RadioButton':
        return {
            ...commonLayout,
            width: 155, height: 35, padding: 4,
            text: 'Radio Option',
            selected: false,
            enabled: true,
            selfAlign: 'Inherit',
        };
    case 'DropdownMenu':
      return {
        ...commonLayout,
        children: [],
        text: 'Menu',
        backgroundColor: '#FFFFFF',
        textColor: '#000000',
        padding: 8,
        width: 150, height: 48,
        cornerRadius: 4,
        selfAlign: 'Inherit',
      };
    case 'Column':
      return {
        ...commonLayout,
        children: [],
        padding: 8,
        backgroundColor: undefined,
        width: 200, height: 200, itemSpacing: 8,
        verticalArrangement: 'Top', horizontalAlignment: 'Start',
        selfAlign: 'Inherit',
        ...defaultClickableBehavior,
      };
    case 'Row':
      return {
        ...commonLayout,
        children: [],
        padding: 8,
        backgroundColor: undefined,
        width: 412, height: 100, itemSpacing: 8,
        horizontalArrangement: 'Start', verticalAlignment: 'Top',
        selfAlign: 'Inherit',
        ...defaultClickableBehavior,
      };
    case 'Box':
      return {
        ...commonLayout,
        children: [],
        padding: 0,
        backgroundColor: undefined,
        width: 100, height: 100,
        shape: 'RoundedCorner',
        cornerRadiusTopLeft: 4, cornerRadiusTopRight: 4, cornerRadiusBottomLeft: 4, cornerRadiusBottomRight: 4,
        selfAlign: 'Inherit',
        ...defaultClickableBehavior,
      };
    case 'Card':
      return {
        ...commonLayout,
        horizontalAlignment: 'Start', 
        verticalArrangement: 'Top',   
        itemSpacing: 8,               
        children: [],
        padding: 16,
        backgroundColor: undefined, contentColor: null,
        width: 200, height: 150, elevation: 1,
        shape: 'RoundedCorner',
        cornerRadiusTopLeft: 8, cornerRadiusTopRight: 8, cornerRadiusBottomRight: 8, cornerRadiusBottomLeft: 8,
        borderWidth: 0, borderColor: '#000000',
        selfAlign: 'Inherit',
        ...defaultClickableBehavior,
      };
    case 'Carousel':
      return {
        ...commonLayout,
        children: [],
        width: undefined,
        height: 200,
        fillMaxWidth: true,
        carouselStyle: 'Pager',
        carouselOrientation: 'Horizontal',
        carouselContentPadding: 0,
        itemSpacing: 8,
        verticalAlignment: 'CenterVertically',
        userScrollEnabled: true,
        preferredItemWidth: 186,
      };
    case 'LazyColumn':
      const isContentArea = componentId === DEFAULT_CONTENT_LAZY_COLUMN_ID;
      return {
        ...commonLayout,
        fillMaxWidth: isContentArea, // True only for the main content area
        fillMaxHeight: isContentArea, // True only for the main content area
        width: isContentArea ? undefined : 400,
        height: isContentArea ? undefined : 300,
        children: [],
        padding: isContentArea ? 8 : 0, 
        backgroundColor: undefined,
        itemSpacing: 8,
        userScrollEnabled: true, reverseLayout: false,
        verticalArrangement: 'Top', horizontalAlignment: 'Start',
        paddingBottom: isContentArea ? (8) : 8, 
        selfAlign: 'Inherit',
        ...defaultClickableBehavior,
      };
    case 'LazyRow':
      return {
        ...commonLayout,
        fillMaxWidth: false,
        children: [],
        padding: 8,
        backgroundColor: undefined,
        width: 412, height: 120, itemSpacing: 8,
        userScrollEnabled: true, reverseLayout: false,
        horizontalArrangement: 'Start', verticalAlignment: 'Top',
        selfAlign: 'Inherit',
        ...defaultClickableBehavior,
      };
    case 'LazyVerticalGrid':
      return {
        ...commonLayout,
        fillMaxWidth: false,
        children: [],
        padding: 8,
        backgroundColor: undefined,
        width: 412, height: 300, columns: 2, itemSpacing: 8,
        verticalArrangement: 'Top', horizontalAlignment: 'Start',
        selfAlign: 'Inherit',
        ...defaultClickableBehavior,
      };
    case 'LazyHorizontalGrid':
      return {
        ...commonLayout,
        fillMaxWidth: true,
        children: [],
        padding: 8,
        backgroundColor: undefined,
        width: undefined, height: 200, rows: 2, itemSpacing: 8,
        horizontalArrangement: 'Start', verticalAlignment: 'Top',
        selfAlign: 'Inherit',
        ...defaultClickableBehavior,
      };
    case 'Spacer':
      return {
        layoutWeight: 0,
        padding: undefined, paddingTop: undefined, paddingBottom: undefined, paddingStart: undefined, paddingEnd: undefined,
        fillMaxWidth: false, fillMaxHeight: false,
        width: 8,
        height: 8,
        selfAlign: undefined,
        clickable: false,
        onClickAction: undefined,
      };
    case 'TopAppBar': // New default for TopAppBar
      return {
        layoutWeight: 0,
        padding: 0, paddingTop: 0, paddingBottom: 0, paddingStart: 16, paddingEnd: 4,
        fillMaxWidth: true, fillMaxHeight: false, // Usually fills width
        selfAlign: undefined,
        children: [], // For action items or navigation icon
        title: 'Screen Title',
        titleFontSize: 20,
        width: undefined,
        height: 56, // Standard height
        backgroundColor: undefined, 
        contentColor: undefined,
        itemSpacing: 4,
        horizontalArrangement: 'Start', // For title and actions
        verticalAlignment: 'CenterVertically',
        ...defaultClickableBehavior,
      };
    case 'BottomNavigationBar': // New default for BottomNavigationBar
      return {
        layoutWeight: 0,
        padding: 0, paddingTop: 0, paddingBottom: 0, paddingStart: 0, paddingEnd: 0,
        fillMaxWidth: true, fillMaxHeight: false, // Usually fills width
        selfAlign: undefined,
        children: [], // For navigation items
        width: undefined,
        height: 56, // Standard height
        backgroundColor: undefined, 
        contentColor: undefined, 
        itemSpacing: 0, // Items usually have their own padding
        horizontalArrangement: 'SpaceAround', // Common for nav items
        verticalAlignment: 'CenterVertically',
        ...defaultClickableBehavior,
      };
    case 'AnimatedContent':
      return {
        ...commonLayout,
        children: [],
        padding: 8,
        backgroundColor: null,
        width: 200, height: 200, itemSpacing: 8,
        verticalArrangement: 'Top', horizontalAlignment: 'Start',
        animationType: 'Fade',
        animationDuration: 300,
        selfAlign: 'Inherit',
        ...defaultClickableBehavior,
      };
    case 'Group':
      return {
        ...commonLayout,
        children: [],
        padding: 0,
        backgroundColor: undefined,
        width: 100, height: 100,
        cornerRadiusTopLeft: 4, cornerRadiusTopRight: 4, cornerRadiusBottomLeft: 4, cornerRadiusBottomRight: 4,
        selfAlign: 'Inherit',
        ...defaultClickableBehavior,
      };
    default:
      if (typeof type === 'string' && type.startsWith(CUSTOM_COMPONENT_TYPE_PREFIX)) {
         console.warn(`getDefaultProperties called with a custom template ID '${type}'. This is unexpected. Returning generic defaults.`);
         return { ...commonLayout, children: [], width: undefined, height: undefined, padding: 0, fillMaxWidth: false, fillMaxHeight: false, selfAlign: 'Inherit' };
      }
      return {...commonLayout, width: undefined, height: undefined, padding: 0, fillMaxWidth: false, fillMaxHeight: false, selfAlign: 'Inherit' };
  }
};

export const getComponentDisplayName = (type: ComponentType | string): string => {
  switch (type as ComponentType) {
    case 'Scaffold': return 'Scaffold (Root)';
    case 'Text': return 'Text';
    case 'Button': return 'Button';
    case 'Checkbox': return 'Checkbox';
    case 'RadioButton': return 'Radio Button';
    case 'DropdownMenu': return 'Dropdown Menu';
    case 'Column': return 'Column (Layout)';
    case 'Row': return 'Row (Layout)';
    case 'Image': return 'Image';
    case 'Box': return 'Box (Container)';
    case 'Group': return 'Group (Container)';
    case 'Card': return 'Card (Container)';
    case 'Carousel': return 'Carousel';
    case 'LazyColumn': return 'Lazy Column';
    case 'LazyRow': return 'Lazy Row';
    case 'LazyVerticalGrid': return 'Lazy Vertical Grid';
    case 'LazyHorizontalGrid': return 'Lazy Horizontal Grid';
    case 'Spacer': return 'Spacer';
    case 'TopAppBar': return 'Top App Bar';
    case 'BottomNavigationBar': return 'Bottom Nav Bar';
    case 'AnimatedContent': return 'Animated Content';
    default: 
      if (typeof type === 'string' && type.startsWith(CUSTOM_COMPONENT_TYPE_PREFIX)) {
        return type.replace(CUSTOM_COMPONENT_TYPE_PREFIX, "").replace(/-\d+$/, "").replace(/-/g, ' ');
      }
      return 'Unknown Component';
  }
};

export const availableFonts = [ 'Inter', 'Roboto', 'Lato', 'Oswald', 'Merriweather', 'Playfair Display', 'Source Code Pro', 'Poppins', 'Montserrat', 'Raleway', 'Nunito', 'Open Sans', 'EB Garamond', 'DM Sans' ];
export const availableFontWeights = ['Normal', 'Medium', 'Bold'];

export const defaultLightColors: M3Colors = {
    primary: '#6750A4', onPrimary: '#FFFFFF', primaryContainer: '#EADDFF', onPrimaryContainer: '#21005D',
    secondary: '#625B71', onSecondary: '#FFFFFF', secondaryContainer: '#E8DEF8', onSecondaryContainer: '#1D192B',
    tertiary: '#7D5260', onTertiary: '#FFFFFF', tertiaryContainer: '#FFD8E4', onTertiaryContainer: '#31111D',
    error: '#B3261E', onError: '#FFFFFF', errorContainer: '#F9DEDC', onErrorContainer: '#410E0B',
    background: '#FEF7FF', onBackground: '#1D1B20',
    surface: '#FEF7FF', onSurface: '#1D1B20',
    surfaceVariant: '#E7E0EC', onSurfaceVariant: '#49454F',
    outline: '#79747E',
};

export const defaultDarkColors: M3Colors = {
    primary: '#D0BCFF', onPrimary: '#381E72', primaryContainer: '#4F378B', onPrimaryContainer: '#EADDFF',
    secondary: '#CCC2DC', onSecondary: '#332D41', secondaryContainer: '#4A4458', onSecondaryContainer: '#E8DEF8',
    tertiary: '#EFB8C8', onTertiary: '#492532', tertiaryContainer: '#633B48', onTertiaryContainer: '#FFD8E4',
    error: '#F2B8B5', onError: '#601410', errorContainer: '#8C1D18', onErrorContainer: '#F9DEDC',
    background: '#141218', onBackground: '#E6E1E5',
    surface: '#141218', onSurface: '#E6E1E5',
    surfaceVariant: '#49454F', onSurfaceVariant: '#CAC4D0',
    outline: '#938F99',
};

export const defaultTypography: M3Typography = {
    displayLarge: { fontFamily: 'Roboto', fontWeight: 'Normal', fontSize: 57 },
    displayMedium: { fontFamily: 'Roboto', fontWeight: 'Normal', fontSize: 45 },
    displaySmall: { fontFamily: 'Roboto', fontWeight: 'Normal', fontSize: 36 },
    headlineLarge: { fontFamily: 'Roboto', fontWeight: 'Normal', fontSize: 32 },
    headlineMedium: { fontFamily: 'Roboto', fontWeight: 'Normal', fontSize: 28 },
    headlineSmall: { fontFamily: 'Roboto', fontWeight: 'Normal', fontSize: 24 },
    titleLarge: { fontFamily: 'Roboto', fontWeight: 'Normal', fontSize: 22 },
    titleMedium: { fontFamily: 'Roboto', fontWeight: 'Medium', fontSize: 16 },
    titleSmall: { fontFamily: 'Roboto', fontWeight: 'Medium', fontSize: 14 },
    bodyLarge: { fontFamily: 'Roboto', fontWeight: 'Normal', fontSize: 16 },
    bodyMedium: { fontFamily: 'Roboto', fontWeight: 'Normal', fontSize: 14 },
    bodySmall: { fontFamily: 'Roboto', fontWeight: 'Normal', fontSize: 12 },
    labelLarge: { fontFamily: 'Roboto', fontWeight: 'Medium', fontSize: 14 },
    labelMedium: { fontFamily: 'Roboto', fontWeight: 'Medium', fontSize: 12 },
    labelSmall: { fontFamily: 'Roboto', fontWeight: 'Medium', fontSize: 11 },
};

export const defaultShapes: M3Shapes = {
    extraSmall: 4,
    small: 8,
    medium: 12,
    large: 16,
    extraLarge: 28,
};

const ColorStringSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Must be a valid hex color").or(z.literal('transparent'));

const ClickActionSchema = z.object({
  type: z.enum(['NAVIGATE', 'SHOW_TOAST', 'CUSTOM_EVENT']),
  value: z.string(),
});

const BaseModalPropertiesSchema = z.object({
  text: z.string().optional(),
  fontFamily: z.string().optional(),
  fontSize: z.number().min(0, "Font size must be non-negative").optional(),
  titleFontSize: z.number().min(0, "Font size must be non-negative").optional(),
  textColor: ColorStringSchema.nullable().optional(),
  backgroundColor: ColorStringSchema.nullable().optional(),
  contentColor: ColorStringSchema.nullable().optional(),
  width: z.union([z.number().min(0), z.string()]).optional(),
  height: z.union([z.number().min(0), z.string()]).optional(),
  fillMaxSize: z.boolean().optional(),
  fillMaxWidth: z.boolean().optional(),
  fillMaxHeight: z.boolean().optional(),
  layoutWeight: z.number().min(0).optional(),
  padding: z.number().min(0).optional(),
  paddingTop: z.number().min(0).optional(),
  paddingBottom: z.number().min(0).optional(),
  paddingStart: z.number().min(0).optional(),
  paddingEnd: z.number().min(0).optional(),
  contentDescription: z.string().optional(),
  src: z.union([
        z.string().url("Must be a valid HTTP/S URL"),
        z.string().startsWith("data:image/"),
        z.object({ binding: z.string() })
    ]).optional(),
  "data-ai-hint": z.string().optional(),
  elevation: z.number().min(0).optional(),
  cornerRadius: z.number().min(0).optional(),
  cornerRadiusTopLeft: z.number().min(0).optional(),
  cornerRadiusTopRight: z.number().min(0).optional(),
  cornerRadiusBottomRight: z.number().min(0).optional(),
  cornerRadiusBottomLeft: z.number().min(0).optional(),
  borderWidth: z.number().min(0).optional(),
  borderColor: ColorStringSchema.optional(),
  columns: z.number().int().min(1).optional(),
  rows: z.number().int().min(1).optional(),
  maxLines: z.number().int().min(1).optional(),
  textOverflow: z.enum(['Clip', 'Ellipsis', 'Visible']).optional(),
  contentScale: z.enum(['Crop', 'Fit', 'FillBounds', 'Inside', 'None', 'FillWidth', 'FillHeight']).optional(),
  itemSpacing: z.number().min(0).optional(),
  userScrollEnabled: z.boolean().optional(),
  reverseLayout: z.boolean().optional(),
  verticalArrangement: z.enum(['Top', 'Bottom', 'Center', 'SpaceAround', 'SpaceBetween', 'SpaceEvenly']).optional(),
  horizontalAlignment: z.enum(['Start', 'CenterHorizontally', 'End']).optional(),
  horizontalArrangement: z.enum(['Start', 'End', 'Center', 'SpaceAround', 'SpaceBetween', 'SpaceEvenly']).optional(),
  verticalAlignment: z.enum(['Top', 'CenterVertically', 'Bottom']).optional(),
  fontWeight: z.enum(['Normal', 'Semibold', 'Bold']).optional(),
  fontStyle: z.enum(['Normal', 'Italic']).optional(),
  textAlign: z.enum(['Left', 'Center', 'Right', 'Justify', 'Start', 'End']).optional(),
  textDecoration: z.enum(['None', 'Underline', 'LineThrough']).optional(),
  lineHeight: z.number().min(0).optional(),
  title: z.string().optional(),
  selfAlign: z.enum(['Inherit', 'Start', 'Center', 'End']).optional(),
  clickable: z.boolean().optional(),
  onClickAction: ClickActionSchema.optional(), // Replaces clickId
  iconName: z.string().optional(),
  iconPosition: z.enum(['Start', 'End']).optional(),
  iconSize: z.number().min(0).optional(),
  iconSpacing: z.number().min(0).optional(),
  animationType: z.enum(['Fade', 'Scale', 'SlideFromTop', 'SlideFromBottom', 'SlideFromStart', 'SlideFromEnd']).optional(),
  animationDuration: z.number().int().min(0).optional(),
  shape: z.enum(['Rectangle', 'RoundedCorner', 'Circle']).optional(),
  checked: z.boolean().optional(),
  selected: z.boolean().optional(),
  enabled: z.boolean().optional(),
  dataSource: z.object({
      url: z.string().url().optional(),
      schema: z.array(z.string()).optional(),
  }).optional(),
  dataBindings: z.record(z.string()).optional(),
}).catchall(z.any()); 


type ModalComponentNodePlain = {
  id: string;
  type: string;
  name: string;
  parentId: string | null;
  templateIdRef?: string;
  properties?: Partial<BaseComponentProps> & { children?: ModalComponentNodePlain[] };
};

const ModalComponentNodeSchema: z.ZodType<ModalComponentNodePlain> = z.lazy(() =>
  z.object({
    id: z.string().min(1, "Component ID cannot be empty"),
    type: z.string().min(1, "Component type cannot be empty"),
    name: z.string().min(1, "Component name cannot be empty"),
    parentId: z.string().nullable(),
    templateIdRef: z.string().startsWith(CUSTOM_COMPONENT_TYPE_PREFIX).optional(),
    properties: BaseModalPropertiesSchema.extend({
      children: z.array(ModalComponentNodeSchema).optional(),
    }).optional(),
  })
);

export const ModalJsonSchema = z.array(ModalComponentNodeSchema);

export const propertyDefinitions: Record<ComponentType, (Omit<ComponentProperty, 'value'>)[]> = {
  Text: [
    { name: 'text', type: 'string', label: 'Text', group: 'Content', placeholder: 'Enter text' },
    { name: 'fontFamily', type: 'enum', label: 'Font Family', group: 'Content', options: [
        { label: 'Inter', value: 'Inter' },
        { label: 'Roboto', value: 'Roboto' },
        { label: 'Lato', value: 'Lato' },
        { label: 'Oswald', value: 'Oswald' },
        { label: 'Merriweather', value: 'Merriweather' },
        { label: 'Playfair Display', value: 'Playfair Display' },
        { label: 'Source Code Pro', value: 'Source Code Pro' },
        { label: 'Poppins', value: 'Poppins' },
        { label: 'Montserrat', value: 'Montserrat' },
        { label: 'Raleway', value: 'Raleway' },
        { label: 'Nunito', value: 'Nunito' },
        { label: 'Open Sans', value: 'Open Sans' },
        { label: 'EB Garamond', value: 'EB Garamond' },
        { label: 'DM Sans', value: 'DM Sans' },
    ]},
    { name: 'fontSize', type: 'number', label: 'Font Size', group: 'Content', placeholder: '16' },
    { name: 'textColor', type: 'color', label: 'Text Color', group: 'Content' },
    { name: 'fontWeight', type: 'enum', label: 'Font Weight', group: 'Content', options: [{ label: 'Normal', value: 'Normal' }, { label: 'Semibold', value: 'Semibold' }, { label: 'Bold', value: 'Bold' }] },
    { name: 'fontStyle', type: 'enum', label: 'Font Style', group: 'Content', options: [{ label: 'Normal', value: 'Normal' }, { label: 'Italic', value: 'Italic' }] },
    { name: 'textAlign', type: 'enum', label: 'Text Align', group: 'Content', options: [{ label: 'Start', value: 'Start' }, { label: 'Center', value: 'Center' }, { label: 'End', value: 'End' }, { label: 'Justify', value: 'Justify' }] },
    { name: 'textDecoration', type: 'enum', label: 'Text Decoration', group: 'Content', options: [{ label: 'None', value: 'None' }, { label: 'Underline', value: 'Underline' }, { label: 'Line Through', value: 'LineThrough' }] },
    { name: 'lineHeight', type: 'number', label: 'Line Height', group: 'Content', placeholder: '1.5' },
    { name: 'maxLines', type: 'number', label: 'Max Lines', group: 'Content', placeholder: 'e.g., 2' },
    { name: 'textOverflow', type: 'enum', label: 'Overflow', group: 'Content', options: [{label: 'Clip', value: 'Clip'}, {label: 'Ellipsis', value: 'Ellipsis'}, {label: 'Visible', value: 'Visible'}] },
    { name: 'width', type: 'number', label: 'Width (dp)', group: 'Layout', placeholder: 'e.g., 120' },
    { name: 'height', type: 'number', label: 'Height (dp)', group: 'Layout', placeholder: 'e.g., 25' },
    { name: 'fillMaxWidth', type: 'boolean', label: 'Fill Max Width', group: 'Layout' },
    { name: 'fillMaxHeight', type: 'boolean', label: 'Fill Max Height', group: 'Layout' },
    { name: 'fillMaxSize', type: 'boolean', label: 'Fill Max Size', group: 'Layout' },
    { name: 'layoutWeight', type: 'number', label: 'Layout Weight', group: 'Layout', placeholder: 'e.g., 1.0' },
    { name: 'selfAlign', type: 'enum', label: 'Self Align', group: 'Layout', options: [{label: 'Inherit', value: 'Inherit'}, {label: 'Start', value: 'Start'}, {label: 'Center', value: 'Center'}, {label: 'End', value: 'End'}] },
    { name: 'padding', type: 'number', label: 'Padding (All)', group: 'Layout', placeholder: 'e.g., 8' },
    { name: 'paddingTop', type: 'number', label: 'Padding Top', group: 'Layout', placeholder: 'e.g., 8' },
    { name: 'paddingBottom', type: 'number', label: 'Padding Bottom', group: 'Layout', placeholder: 'e.g., 8' },
    { name: 'paddingStart', type: 'number', label: 'Padding Start', group: 'Layout', placeholder: 'e.g., 8' },
    { name: 'paddingEnd', type: 'number', label: 'Padding End', group: 'Layout', placeholder: 'e.g., 8' },
    { name: 'backgroundColor', type: 'gradient', label: 'Background', group: 'Appearance' },
    { name: 'clickable', type: 'boolean', label: 'Clickable', group: 'Behavior' },
    { name: 'onClickAction', type: 'action', label: 'Click Action', group: 'Behavior' },
  ],
  Button: [
    { name: 'text', type: 'string', label: 'Text', group: 'Content', placeholder: 'Enter button text' },
    { name: 'iconName', type: 'string', label: 'Icon Name (Lucide)', group: 'Content', placeholder: 'e.g., check, arrow-right' },
    { name: 'iconPosition', type: 'enum', label: 'Icon Position', group: 'Content', options: [{ label: 'Start', value: 'Start' }, { label: 'End', value: 'End' }, { label: 'Top', value: 'Top' }, { label: 'Bottom', value: 'Bottom' }] },
    { name: 'iconSize', type: 'number', label: 'Icon Size (dp)', group: 'Content', placeholder: '16' },
    { name: 'iconSpacing', type: 'number', label: 'Icon Spacing (dp)', group: 'Content', placeholder: '8' },
    { name: 'fontSize', type: 'number', label: 'Font Size', group: 'Content', placeholder: '14' },
    { name: 'textColor', type: 'color', label: 'Text Color', group: 'Content' },
    { name: 'backgroundColor', type: 'color', label: 'Background Color', group: 'Appearance' },
    { name: 'shape', type: 'enum', label: 'Shape', group: 'Appearance', options: [{ label: 'Rounded Corner', value: 'RoundedCorner' }, { label: 'Rectangle', value: 'Rectangle' }, { label: 'Circle', value: 'Circle' }] },
    { name: 'cornerRadius', type: 'number', label: 'Corner Radius (dp)', group: 'Appearance', placeholder: 'e.g., 4' },
    { name: 'width', type: 'number', label: 'Width (dp)', group: 'Layout', placeholder: 'e.g., 120' },
    { name: 'height', type: 'number', label: 'Height (dp)', group: 'Layout', placeholder: 'e.g., 50' },
    { name: 'fillMaxWidth', type: 'boolean', label: 'Fill Max Width', group: 'Layout' },
    { name: 'fillMaxHeight', type: 'boolean', label: 'Fill Max Height', group: 'Layout' },
    { name: 'fillMaxSize', type: 'boolean', label: 'Fill Max Size', group: 'Layout' },
    { name: 'layoutWeight', type: 'number', label: 'Layout Weight', group: 'Layout', placeholder: 'e.g., 1.0' },
    { name: 'selfAlign', type: 'enum', label: 'Self Align', group: 'Layout', options: [{label: 'Inherit', value: 'Inherit'}, {label: 'Start', value: 'Start'}, {label: 'Center', value: 'Center'}, {label: 'End', value: 'End'}] },
    { name: 'padding', type: 'number', label: 'Padding (All)', group: 'Layout', placeholder: 'e.g., 12' },
    { name: 'clickable', type: 'boolean', label: 'Clickable', group: 'Behavior' },
    { name: 'onClickAction', type: 'action', label: 'Click Action', group: 'Behavior' },
  ],
  Checkbox: [
    { name: 'text', type: 'string', label: 'Label', group: 'Content', placeholder: 'Checkbox label' },
    { name: 'checked', type: 'boolean', label: 'Checked', group: 'Behavior' },
    { name: 'enabled', type: 'boolean', label: 'Enabled', group: 'Behavior' },
    { name: 'width', type: 'number', label: 'Width (dp)', group: 'Layout', placeholder: 'e.g., 155' },
    { name: 'height', type: 'number', label: 'Height (dp)', group: 'Layout', placeholder: 'e.g., 50' },
    { name: 'fillMaxWidth', type: 'boolean', label: 'Fill Max Width', group: 'Layout' },
    { name: 'fillMaxHeight', type: 'boolean', label: 'Fill Max Height', group: 'Layout' },
    { name: 'fillMaxSize', type: 'boolean', label: 'Fill Max Size', group: 'Layout' },
    { name: 'layoutWeight', type: 'number', label: 'Layout Weight', group: 'Layout' },
    { name: 'selfAlign', type: 'enum', label: 'Self Align', group: 'Layout', options: [{label: 'Inherit', value: 'Inherit'}, {label: 'Start', value: 'Start'}, {label: 'Center', value: 'Center'}, {label: 'End', value: 'End'}] },
    { name: 'padding', type: 'number', label: 'Padding (All)', group: 'Layout' },
    { name: 'paddingTop', type: 'number', label: 'Padding Top', group: 'Layout' },
    { name: 'paddingBottom', type: 'number', label: 'Padding Bottom', group: 'Layout' },
    { name: 'paddingStart', type: 'number', label: 'Padding Start', group: 'Layout' },
    { name: 'paddingEnd', type: 'number', label: 'Padding End', group: 'Layout' },
  ],
  RadioButton: [
    { name: 'text', type: 'string', label: 'Label', group: 'Content', placeholder: 'Radio button label' },
    { name: 'selected', type: 'boolean', label: 'Selected', group: 'Behavior' },
    { name: 'enabled', type: 'boolean', label: 'Enabled', group: 'Behavior' },
    { name: 'width', type: 'number', label: 'Width (dp)', group: 'Layout', placeholder: 'e.g., 155' },
    { name: 'height', type: 'number', label: 'Height (dp)', group: 'Layout', placeholder: 'e.g., 50' },
    { name: 'fillMaxWidth', type: 'boolean', label: 'Fill Max Width', group: 'Layout' },
    { name: 'fillMaxHeight', type: 'boolean', label: 'Fill Max Height', group: 'Layout' },
    { name: 'fillMaxSize', type: 'boolean', label: 'Fill Max Size', group: 'Layout' },
    { name: 'layoutWeight', type: 'number', label: 'Layout Weight', group: 'Layout' },
    { name: 'selfAlign', type: 'enum', label: 'Self Align', group: 'Layout', options: [{label: 'Inherit', value: 'Inherit'}, {label: 'Start', value: 'Start'}, {label: 'Center', value: 'Center'}, {label: 'End', value: 'End'}] },
    { name: 'padding', type: 'number', label: 'Padding (All)', group: 'Layout' },
    { name: 'paddingTop', type: 'number', label: 'Padding Top', group: 'Layout' },
    { name: 'paddingBottom', type: 'number', label: 'Padding Bottom', group: 'Layout' },
    { name: 'paddingStart', type: 'number', label: 'Padding Start', group: 'Layout' },
    { name: 'paddingEnd', type: 'number', label: 'Padding End', group: 'Layout' },
  ],
  DropdownMenu: [
    { name: 'text', type: 'string', label: 'Button Text', group: 'Content', placeholder: 'Menu' },
    { name: 'backgroundColor', type: 'color', label: 'Button BG Color', group: 'Appearance' },
    { name: 'textColor', type: 'color', label: 'Button Text Color', group: 'Appearance' },
    { name: 'cornerRadius', type: 'number', label: 'Button Corner Radius', group: 'Appearance', placeholder: '4' },
    { name: 'width', type: 'number', label: 'Width (dp)', group: 'Layout', placeholder: 'e.g., 150' },
    { name: 'height', type: 'number', label: 'Height (dp)', group: 'Layout', placeholder: 'e.g., 48' },
    { name: 'fillMaxWidth', type: 'boolean', label: 'Fill Max Width', group: 'Layout' },
    { name: 'fillMaxHeight', type: 'boolean', label: 'Fill Max Height', group: 'Layout' },
    { name: 'fillMaxSize', type: 'boolean', label: 'Fill Max Size', group: 'Layout' },
    { name: 'layoutWeight', type: 'number', label: 'Layout Weight', group: 'Layout' },
    { name: 'selfAlign', type: 'enum', label: 'Self Align', group: 'Layout', options: [{label: 'Inherit', value: 'Inherit'}, {label: 'Start', value: 'Start'}, {label: 'Center', value: 'Center'}, {label: 'End', value: 'End'}] },
    { name: 'padding', type: 'number', label: 'Padding', group: 'Layout', placeholder: '8' },
    { name: 'paddingTop', type: 'number', label: 'Padding Top', group: 'Layout' },
    { name: 'paddingBottom', type: 'number', label: 'Padding Bottom', group: 'Layout' },
    { name: 'paddingStart', type: 'number', label: 'Padding Start', group: 'Layout' },
    { name: 'paddingEnd', type: 'number', label: 'Padding End', group: 'Layout' },
  ],
  Image: [
    { name: 'src', type: 'string', label: 'Source URL', group: 'Content', placeholder: 'https://...' },
    { name: 'data-ai-hint', type: 'string', label: 'AI Hint', group: 'Content', placeholder: 'e.g., abstract pattern' },
    { name: 'contentDescription', type: 'string', label: 'Content Description', group: 'Content', placeholder: 'Accessibility text' },
    { name: 'contentScale', type: 'enum', label: 'Content Scale', group: 'Appearance', options: [{ label: 'Crop', value: 'Crop' }, { label: 'Fit', value: 'Fit' }, { label: 'Fill Bounds', value: 'FillBounds' }, { label: 'Inside', value: 'Inside' }, { label: 'None', value: 'None' }, { label: 'Fill Width', value: 'FillWidth' }, { label: 'Fill Height', value: 'FillHeight' }] },
    { name: 'backgroundColor', type: 'color', label: 'Background Color', group: 'Appearance' },
    { name: 'cornerRadiusTopLeft', type: 'number', label: 'Corner Radius TL (dp)', group: 'Appearance' },
    { name: 'cornerRadiusTopRight', type: 'number', label: 'Corner Radius TR (dp)', group: 'Appearance' },
    { name: 'cornerRadiusBottomLeft', type: 'number', label: 'Corner Radius BL (dp)', group: 'Appearance' },
    { name: 'cornerRadiusBottomRight', type: 'number', label: 'Corner Radius BR (dp)', group: 'Appearance' },
    { name: 'width', type: 'number', label: 'Width (dp)', group: 'Layout', placeholder: 'e.g., 200' },
    { name: 'height', type: 'number', label: 'Height (dp)', group: 'Layout', placeholder: 'e.g., 100' },
    { name: 'fillMaxWidth', type: 'boolean', label: 'Fill Max Width', group: 'Layout' },
    { name: 'fillMaxHeight', type: 'boolean', label: 'Fill Max Height', group: 'Layout' },
    { name: 'fillMaxSize', type: 'boolean', label: 'Fill Max Size', group: 'Layout' },
    { name: 'layoutWeight', type: 'number', label: 'Layout Weight', group: 'Layout', placeholder: 'e.g., 1.0' },
    { name: 'selfAlign', type: 'enum', label: 'Self Align', group: 'Layout', options: [{label: 'Inherit', value: 'Inherit'}, {label: 'Start', value: 'Start'}, {label: 'Center', value: 'Center'}, {label: 'End', value: 'End'}] },
    { name: 'padding', type: 'number', label: 'Padding (All)', group: 'Layout', placeholder: 'e.g., 8' },
    { name: 'clickable', type: 'boolean', label: 'Clickable', group: 'Behavior' },
    { name: 'onClickAction', type: 'action', label: 'Click Action', group: 'Behavior' },
  ],
  Column: [
    { name: 'verticalArrangement', type: 'enum', label: 'Vertical Arrangement', group: 'Layout', options: [{ label: 'Top', value: 'Top' }, { label: 'Bottom', value: 'Bottom' }, { label: 'Center', value: 'Center' }, { label: 'Space Around', value: 'SpaceAround' }, { label: 'Space Between', value: 'SpaceBetween' }, { label: 'Space Evenly', value: 'SpaceEvenly' }] },
    { name: 'horizontalAlignment', type: 'enum', label: 'Horizontal Alignment', group: 'Layout', options: [{ label: 'Start', value: 'Start' }, { label: 'Center Horizontally', value: 'CenterHorizontally' }, { label: 'End', value: 'End' }] },
    { name: 'itemSpacing', type: 'number', label: 'Item Spacing (dp)', group: 'Layout', placeholder: 'e.g., 8' },
    { name: 'width', type: 'number', label: 'Width (dp)', group: 'Layout' },
    { name: 'height', type: 'number', label: 'Height (dp)', group: 'Layout' },
    { name: 'fillMaxWidth', type: 'boolean', label: 'Fill Max Width', group: 'Layout' },
    { name: 'fillMaxHeight', type: 'boolean', label: 'Fill Max Height', group: 'Layout' },
    { name: 'fillMaxSize', type: 'boolean', label: 'Fill Max Size', group: 'Layout' },
    { name: 'layoutWeight', type: 'number', label: 'Layout Weight', group: 'Layout', placeholder: 'e.g., 1.0' },
    { name: 'selfAlign', type: 'enum', label: 'Self Align', group: 'Layout', options: [{label: 'Inherit', value: 'Inherit'}, {label: 'Start', value: 'Start'}, {label: 'Center', value: 'Center'}, {label: 'End', value: 'End'}] },
    { name: 'padding', type: 'number', label: 'Padding (All)', group: 'Layout' },
    { name: 'backgroundColor', type: 'color', label: 'Background Color', group: 'Appearance' },
    { name: 'clickable', type: 'boolean', label: 'Clickable', group: 'Behavior' },
    { name: 'onClickAction', type: 'action', label: 'Click Action', group: 'Behavior' },
  ],
  Row: [
    { name: 'horizontalArrangement', type: 'enum', label: 'Horizontal Arrangement', group: 'Layout', options: [{ label: 'Start', value: 'Start' }, { label: 'End', value: 'End' }, { label: 'Center', value: 'Center' }, { label: 'Space Around', value: 'SpaceAround' }, { label: 'Space Between', value: 'SpaceBetween' }, { label: 'Space Evenly', value: 'SpaceEvenly' }] },
    { name: 'verticalAlignment', type: 'enum', label: 'Vertical Alignment', group: 'Layout', options: [{ label: 'Top', value: 'Top' }, { label: 'Center Vertically', value: 'CenterVertically' }, { label: 'Bottom', value: 'Bottom' }] },
    { name: 'itemSpacing', type: 'number', label: 'Item Spacing (dp)', group: 'Layout', placeholder: 'e.g., 8' },
    { name: 'width', type: 'number', label: 'Width (dp)', group: 'Layout' },
    { name: 'height', type: 'number', label: 'Height (dp)', group: 'Layout' },
    { name: 'fillMaxWidth', type: 'boolean', label: 'Fill Max Width', group: 'Layout' },
    { name: 'fillMaxHeight', type: 'boolean', label: 'Fill Max Height', group: 'Layout' },
    { name: 'fillMaxSize', type: 'boolean', label: 'Fill Max Size', group: 'Layout' },
    { name: 'layoutWeight', type: 'number', label: 'Layout Weight', group: 'Layout', placeholder: 'e.g., 1.0' },
    { name: 'selfAlign', type: 'enum', label: 'Self Align', group: 'Layout', options: [{label: 'Inherit', value: 'Inherit'}, {label: 'Start', value: 'Start'}, {label: 'Center', value: 'Center'}, {label: 'End', value: 'End'}] },
    { name: 'padding', type: 'number', label: 'Padding (All)', group: 'Layout' },
    { name: 'backgroundColor', type: 'color', label: 'Background Color', group: 'Appearance' },
    { name: 'clickable', type: 'boolean', label: 'Clickable', group: 'Behavior' },
    { name: 'onClickAction', type: 'action', label: 'Click Action', group: 'Behavior' },
  ],
  Box: [
    { name: 'shape', type: 'enum', label: 'Shape', group: 'Appearance', options: [{ label: 'Rounded Corner', value: 'RoundedCorner' }, { label: 'Rectangle', value: 'Rectangle' }, { label: 'Circle', value: 'Circle' }] },
    { name: 'width', type: 'number', label: 'Width (dp)', group: 'Layout' },
    { name: 'height', type: 'number', label: 'Height (dp)', group: 'Layout' },
    { name: 'fillMaxWidth', type: 'boolean', label: 'Fill Max Width', group: 'Layout' },
    { name: 'fillMaxHeight', type: 'boolean', label: 'Fill Max Height', group: 'Layout' },
    { name: 'fillMaxSize', type: 'boolean', label: 'Fill Max Size', group: 'Layout' },
    { name: 'layoutWeight', type: 'number', label: 'Layout Weight', group: 'Layout', placeholder: 'e.g., 1.0' },
    { name: 'selfAlign', type: 'enum', label: 'Self Align', group: 'Layout', options: [{label: 'Inherit', value: 'Inherit'}, {label: 'Start', value: 'Start'}, {label: 'Center', value: 'Center'}, {label: 'End', value: 'End'}] },
    { name: 'padding', type: 'number', label: 'Padding (All)', group: 'Layout' },
    { name: 'backgroundColor', type: 'color', label: 'Background Color', group: 'Appearance' },
    { name: 'cornerRadiusTopLeft', type: 'number', label: 'Corner Radius TL (dp)', group: 'Appearance' },
    { name: 'cornerRadiusTopRight', type: 'number', label: 'Corner Radius TR (dp)', group: 'Appearance' },
    { name: 'cornerRadiusBottomLeft', type: 'number', label: 'Corner Radius BL (dp)', group: 'Appearance' },
    { name: 'cornerRadiusBottomRight', type: 'number', label: 'Corner Radius BR (dp)', group: 'Appearance' },
    { name: 'clickable', type: 'boolean', label: 'Clickable', group: 'Behavior' },
    { name: 'onClickAction', type: 'action', label: 'Click Action', group: 'Behavior' },
  ],
  Card: [
    { name: 'shape', type: 'enum', label: 'Shape', group: 'Appearance', options: [{ label: 'Rounded Corner', value: 'RoundedCorner' }, { label: 'Rectangle', value: 'Rectangle' }, { label: 'Circle', value: 'Circle' }] },
    { name: 'verticalArrangement', type: 'enum', label: 'Vertical Arrangement', group: 'Layout', options: [{ label: 'Top', value: 'Top' }, { label: 'Bottom', value: 'Bottom' }, { label: 'Center', value: 'Center' }, { label: 'Space Around', value: 'SpaceAround' }, { label: 'Space Between', value: 'SpaceBetween' }, { label: 'Space Evenly', value: 'SpaceEvenly' }] },
    { name: 'horizontalAlignment', type: 'enum', label: 'Horizontal Alignment', group: 'Layout', options: [{ label: 'Start', value: 'Start' }, { label: 'Center Horizontally', value: 'CenterHorizontally' }, { label: 'End', value: 'End' }] },
    { name: 'itemSpacing', type: 'number', label: 'Item Spacing (dp)', group: 'Layout' },
    { name: 'elevation', type: 'number', label: 'Elevation (Shadow)', group: 'Appearance' },
    { name: 'backgroundColor', type: 'color', label: 'Background Color', group: 'Appearance' },
    { name: 'contentColor', type: 'color', label: 'Content Color', group: 'Appearance' },
    { name: 'cornerRadiusTopLeft', type: 'number', label: 'Corner Radius TL (dp)', group: 'Appearance' },
    { name: 'cornerRadiusTopRight', type: 'number', label: 'Corner Radius TR (dp)', group: 'Appearance' },
    { name: 'cornerRadiusBottomLeft', type: 'number', label: 'Corner Radius BL (dp)', group: 'Appearance' },
    { name: 'cornerRadiusBottomRight', type: 'number', label: 'Corner Radius BR (dp)', group: 'Appearance' },
    { name: 'borderWidth', type: 'number', label: 'Border Width (dp)', group: 'Appearance' },
    { name: 'borderColor', type: 'color', label: 'Border Color', group: 'Appearance' },
    { name: 'width', type: 'number', label: 'Width (dp)', group: 'Layout' },
    { name: 'height', type: 'number', label: 'Height (dp)', group: 'Layout' },
    { name: 'fillMaxWidth', type: 'boolean', label: 'Fill Max Width', group: 'Layout' },
    { name: 'fillMaxHeight', type: 'boolean', label: 'Fill Max Height', group: 'Layout' },
    { name: 'fillMaxSize', type: 'boolean', label: 'Fill Max Size', group: 'Layout' },
    { name: 'layoutWeight', type: 'number', label: 'Layout Weight', group: 'Layout', placeholder: 'e.g., 1.0' },
    { name: 'selfAlign', type: 'enum', label: 'Self Align', group: 'Layout', options: [{label: 'Inherit', value: 'Inherit'}, {label: 'Start', value: 'Start'}, {label: 'Center', value: 'Center'}, {label: 'End', value: 'End'}] },
    { name: 'padding', type: 'number', label: 'Padding (All)', group: 'Layout' },
    { name: 'clickable', type: 'boolean', label: 'Clickable', group: 'Behavior' },
    { name: 'onClickAction', type: 'action', label: 'Click Action', group: 'Behavior' },
  ],
  Carousel: [
    { name: 'carouselStyle', type: 'enum', label: 'Carousel Style', group: 'Carousel Settings', options: [{ label: 'Paginador', value: 'Pager' }, { label: 'Multi-Navegación', value: 'MultiBrowse' }] },
    { name: 'carouselOrientation', type: 'enum', label: 'Orientation', group: 'Carousel Settings', options: [{ label: 'Horizontal', value: 'Horizontal' }, { label: 'Vertical', value: 'Vertical' }], showIf: (props) => props.carouselStyle === 'Pager' },
    { name: 'preferredItemWidth', type: 'number', label: 'Ancho Preferido del Ítem (dp)', group: 'Carousel Settings', placeholder: 'e.g., 186', showIf: (props) => props.carouselStyle === 'MultiBrowse' },
    { name: 'itemSpacing', type: 'number', label: 'Item Spacing (dp)', group: 'Carousel Settings', placeholder: 'e.g., 8' },
    { name: 'carouselContentPadding', type: 'number', label: 'Content Padding (dp)', group: 'Carousel Settings', placeholder: 'e.g., 16' },
    { name: 'verticalAlignment', type: 'enum', label: 'Vertical Alignment', group: 'Layout', options: [{ label: 'Top', value: 'Top' }, { label: 'Center Vertically', value: 'CenterVertically' }, { label: 'Bottom', value: 'Bottom' }] },
    { name: 'width', type: 'number', label: 'Width (dp)', group: 'Layout' },
    { name: 'height', type: 'number', label: 'Height (dp)', group: 'Layout' },
    { name: 'fillMaxWidth', type: 'boolean', label: 'Fill Max Width', group: 'Layout' },
    { name: 'fillMaxHeight', type: 'boolean', label: 'Fill Max Height', group: 'Layout' },
    { name: 'fillMaxSize', type: 'boolean', label: 'Fill Max Size', group: 'Layout' },
    { name: 'userScrollEnabled', type: 'boolean', label: 'Enable Scrolling', group: 'Behavior' },
  ],
  LazyColumn: [
    { name: 'verticalArrangement', type: 'enum', label: 'Vertical Arrangement', group: 'Layout', options: [{ label: 'Top', value: 'Top' }, { label: 'Bottom', value: 'Bottom' }, { label: 'Center', value: 'Center' }, { label: 'Space Around', value: 'SpaceAround' }, { label: 'Space Between', value: 'SpaceBetween' }, { label: 'Space Evenly', value: 'SpaceEvenly' }] },
    { name: 'horizontalAlignment', type: 'enum', label: 'Horizontal Alignment', group: 'Layout', options: [{ label: 'Start', value: 'Start' }, { label: 'Center Horizontally', value: 'CenterHorizontally' }, { label: 'End', value: 'End' }] },
    { name: 'itemSpacing', type: 'number', label: 'Item Spacing (dp)', group: 'Layout' },
    { name: 'userScrollEnabled', type: 'boolean', label: 'Enable Scrolling', group: 'Behavior' },
    { name: 'reverseLayout', type: 'boolean', label: 'Reverse Layout', group: 'Behavior' },
    { name: 'width', type: 'number', label: 'Width (dp)', group: 'Layout' },
    { name: 'height', type: 'number', label: 'Height (dp)', group: 'Layout' },
    { name: 'fillMaxWidth', type: 'boolean', label: 'Fill Max Width', group: 'Layout' },
    { name: 'fillMaxHeight', type: 'boolean', label: 'Fill Max Height', group: 'Layout' },
    { name: 'fillMaxSize', type: 'boolean', label: 'Fill Max Size', group: 'Layout' },
    { name: 'layoutWeight', type: 'number', label: 'Layout Weight', group: 'Layout', placeholder: 'e.g., 1.0' },
    { name: 'selfAlign', type: 'enum', label: 'Self Align', group: 'Layout', options: [{label: 'Inherit', value: 'Inherit'}, {label: 'Start', value: 'Start'}, {label: 'Center', value: 'Center'}, {label: 'End', value: 'End'}] },
    { name: 'padding', type: 'number', label: 'Padding (All)', group: 'Layout' },
    { name: 'backgroundColor', type: 'color', label: 'Background Color', group: 'Appearance' },
  ],
  LazyRow: [
    { name: 'horizontalArrangement', type: 'enum', label: 'Horizontal Arrangement', group: 'Layout', options: [{ label: 'Start', value: 'Start' }, { label: 'End', value: 'End' }, { label: 'Center', value: 'Center' }, { label: 'Space Around', value: 'SpaceAround' }, { label: 'Space Between', value: 'SpaceBetween' }, { label: 'Space Evenly', value: 'SpaceEvenly' }] },
    { name: 'verticalAlignment', type: 'enum', label: 'Vertical Alignment', group: 'Layout', options: [{ label: 'Top', value: 'Top' }, { label: 'Center Vertically', value: 'CenterVertically' }, { label: 'Bottom', value: 'Bottom' }] },
    { name: 'itemSpacing', type: 'number', label: 'Item Spacing (dp)', group: 'Layout' },
    { name: 'userScrollEnabled', type: 'boolean', label: 'Enable Scrolling', group: 'Behavior' },
    { name: 'reverseLayout', type: 'boolean', label: 'Reverse Layout', group: 'Behavior' },
    { name: 'width', type: 'number', label: 'Width (dp)', group: 'Layout' },
    { name: 'height', type: 'number', label: 'Height (dp)', group: 'Layout' },
    { name: 'fillMaxWidth', type: 'boolean', label: 'Fill Max Width', group: 'Layout' },
    { name: 'fillMaxHeight', type: 'boolean', label: 'Fill Max Height', group: 'Layout' },
    { name: 'fillMaxSize', type: 'boolean', label: 'Fill Max Size', group: 'Layout' },
    { name: 'layoutWeight', type: 'number', label: 'Layout Weight', group: 'Layout', placeholder: 'e.g., 1.0' },
    { name: 'selfAlign', type: 'enum', label: 'Self Align', group: 'Layout', options: [{label: 'Inherit', value: 'Inherit'}, {label: 'Start', value: 'Start'}, {label: 'Center', value: 'Center'}, {label: 'End', value: 'End'}] },
    { name: 'padding', type: 'number', label: 'Padding (All)', group: 'Layout' },
    { name: 'backgroundColor', type: 'color', label: 'Background Color', group: 'Appearance' },
  ],
  LazyVerticalGrid: [
    { name: 'columns', type: 'number', label: 'Columns', group: 'Layout' },
    { name: 'itemSpacing', type: 'number', label: 'Item Spacing (dp)', group: 'Layout' },
    { name: 'width', type: 'number', label: 'Width (dp)', group: 'Layout' },
    { name: 'height', type: 'number', label: 'Height (dp)', group: 'Layout' },
    { name: 'fillMaxWidth', type: 'boolean', label: 'Fill Max Width', group: 'Layout' },
    { name: 'fillMaxHeight', type: 'boolean', label: 'Fill Max Height', group: 'Layout' },
    { name: 'fillMaxSize', type: 'boolean', label: 'Fill Max Size', group: 'Layout' },
    { name: 'padding', type: 'number', label: 'Padding (All)', group: 'Layout' },
    { name: 'backgroundColor', type: 'color', label: 'Background Color', group: 'Appearance' },
  ],
  LazyHorizontalGrid: [
    { name: 'rows', type: 'number', label: 'Rows', group: 'Layout' },
    { name: 'itemSpacing', type: 'number', label: 'Item Spacing (dp)', group: 'Layout' },
    { name: 'width', type: 'number', label: 'Width (dp)', group: 'Layout' },
    { name: 'height', type: 'number', label: 'Height (dp)', group: 'Layout' },
    { name: 'fillMaxWidth', type: 'boolean', label: 'Fill Max Width', group: 'Layout' },
    { name: 'fillMaxHeight', type: 'boolean', label: 'Fill Max Height', group: 'Layout' },
    { name: 'fillMaxSize', type: 'boolean', label: 'Fill Max Size', group: 'Layout' },
    { name: 'padding', type: 'number', label: 'Padding (All)', group: 'Layout' },
    { name: 'backgroundColor', type: 'color', label: 'Background Color', group: 'Appearance' },
  ],
  Spacer: [
    { name: 'width', type: 'number', label: 'Width (dp)', group: 'Layout' },
    { name: 'height', type: 'number', label: 'Height (dp)', group: 'Layout' },
    { name: 'layoutWeight', type: 'number', label: 'Layout Weight', group: 'Layout' },
  ],
  Scaffold: [
    { name: 'backgroundColor', type: 'color', label: 'Background Color', group: 'Appearance' },
    { 
        name: 'iconName', 
        type: 'enum', 
        label: 'Icono de Navegación', 
        group: 'Appearance', 
        options: [
            { label: 'Home', value: 'Home' }, { label: 'Star', value: 'Star' }, 
            { label: 'Heart', value: 'Heart' }, { label: 'Settings', value: 'Settings' },
            { label: 'User', value: 'User' }, { label: 'Credit Card', value: 'CreditCard' },
            { label: 'Search', value: 'Search' }, { label: 'Mail', value: 'Mail' },
            { label: 'Notifications', value: 'Bell' }, { label: 'Shopping Cart', value: 'ShoppingCart' },
            { label: 'Messages', value: 'MessageSquare' }, { label: 'Explore', value: 'Compass' },
            { label: 'Location', value: 'MapPin' }, { label: 'Work', value: 'Briefcase' },
            { label: 'Calendar', value: 'Calendar' }, { label: 'Camera', value: 'Camera' },
            { label: 'List', value: 'List' }
        ],
        showIf: (_, editingLayoutInfo) => !!editingLayoutInfo,
    },
  ],
  TopAppBar: [
    { name: 'title', type: 'string', label: 'Title', group: 'Content' },
    { name: 'titleFontSize', type: 'number', label: 'Title Font Size', group: 'Content' },
    { name: 'backgroundColor', type: 'color', label: 'Background Color', group: 'Appearance' },
    { name: 'contentColor', type: 'color', label: 'Content Color', group: 'Appearance' },
    { name: 'height', type: 'number', label: 'Height', group: 'Layout' },
    { name: 'itemSpacing', type: 'number', label: 'Item Spacing', group: 'Layout' },
    { name: 'horizontalArrangement', type: 'enum', label: 'Horizontal Arrangement', group: 'Layout', options: [{ label: 'Start', value: 'Start' }, { label: 'End', value: 'End' }, { label: 'Center', value: 'Center' }, { label: 'Space Around', value: 'SpaceAround' }, { label: 'Space Between', value: 'SpaceBetween' }, { label: 'Space Evenly', value: 'SpaceEvenly' }] },
    { name: 'paddingStart', type: 'number', label: 'Padding Start', group: 'Layout', placeholder: 'e.g., 16' },
    { name: 'paddingEnd', type: 'number', label: 'Padding End', group: 'Layout', placeholder: 'e.g., 4' },
  ],
  BottomNavigationBar: [
    { name: 'backgroundColor', type: 'color', label: 'Background Color', group: 'Appearance' },
    { name: 'contentColor', type: 'color', label: 'Content Color', group: 'Appearance' },
    { name: 'height', type: 'number', label: 'Height', group: 'Layout' },
    { name: 'itemSpacing', type: 'number', label: 'Item Spacing', group: 'Layout' },
    { name: 'horizontalArrangement', type: 'enum', label: 'Horizontal Arrangement', group: 'Layout', options: [{ label: 'Start', value: 'Start' }, { label: 'End', value: 'End' }, { label: 'Center', value: 'Center' }, { label: 'Space Around', value: 'SpaceAround' }, { label: 'Space Between', value: 'SpaceBetween' }, { label: 'Space Evenly', value: 'SpaceEvenly' }] },
  ],
  AnimatedContent: [
    { name: 'animationType', type: 'enum', label: 'Animation Type', group: 'Behavior', options: [{label: 'Fade', value: 'Fade'}, {label: 'Scale', value: 'Scale'}, {label: 'SlideFromTop', value: 'SlideFromTop'}, {label: 'SlideFromBottom', value: 'SlideFromBottom'}, {label: 'SlideFromStart', value: 'SlideFromStart'}, {label: 'SlideFromEnd', value: 'SlideFromEnd'}] },
    { name: 'animationDuration', type: 'number', label: 'Duration (ms)', group: 'Behavior' },
    { name: 'padding', type: 'number', label: 'Padding (All)', group: 'Layout' },
    { name: 'backgroundColor', type: 'color', label: 'Background Color', group: 'Appearance' },
    { name: 'width', type: 'number', label: 'Width (dp)', group: 'Layout' },
    { name: 'height', type: 'number', label: 'Height (dp)', group: 'Layout' },
  ],
  Group: [
    { name: 'width', type: 'number', label: 'Width (dp)', group: 'Layout' },
    { name: 'height', type: 'number', label: 'Height (dp)', group: 'Layout' },
    { name: 'fillMaxWidth', type: 'boolean', label: 'Fill Max Width', group: 'Layout' },
    { name: 'fillMaxHeight', type: 'boolean', label: 'Fill Max Height', group: 'Layout' },
    { name: 'fillMaxSize', type: 'boolean', label: 'Fill Max Size', group: 'Layout' },
    { name: 'padding', type: 'number', label: 'Padding (All)', group: 'Layout' },
    { name: 'backgroundColor', type: 'color', label: 'Background Color', group: 'Appearance' },
    { name: 'cornerRadiusTopLeft', type: 'number', label: 'Corner Radius TL (dp)', group: 'Appearance' },
    { name: 'cornerRadiusTopRight', type: 'number', label: 'Corner Radius TR (dp)', group: 'Appearance' },
    { name: 'cornerRadiusBottomLeft', type: 'number', label: 'Corner Radius BL (dp)', group: 'Appearance' },
    { name: 'cornerRadiusBottomRight', type: 'number', label: 'Corner Radius BR (dp)', group: 'Appearance' },
    { name: 'clickable', type: 'boolean', label: 'Clickable', group: 'Behavior' },
    { name: 'onClickAction', type: 'action', label: 'Click Action', group: 'Behavior' },
  ],
};



    

    





