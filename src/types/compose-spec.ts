

import { z } from 'zod';

export type ComponentType =
  | 'Text'
  | 'Button'
  | 'Column'
  | 'Row'
  | 'Image'
  | 'Box'
  | 'Card'
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
  group: 'Layout' | 'Appearance' | 'Content' | 'Behavior' | 'Slots' | 'Save' | 'Group' | 'Children Generation';
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
  iconPosition?: 'Start' | 'End';
  iconSize?: number;
  iconSpacing?: number;
  animationType?: 'Fade' | 'Scale' | 'SlideFromTop' | 'SlideFromBottom' | 'SlideFromStart' | 'SlideFromEnd';
  animationDuration?: number;
  shape?: 'Rectangle' | 'RoundedCorner' | 'Circle';
  checked?: boolean; // For Checkbox
  selected?: boolean; // For RadioButton
  enabled?: boolean; // For interactive components

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
  timestamp?: number; // For sorting and display
}

export interface GalleryImage {
  id: string; // Unique identifier for the image (e.g., timestamp-based, can be local)
  url: string;
  timestamp: number;
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
  } | null;
}


export interface DesignState {
  designs: SingleDesign[];
  activeDesignId: string;
  customComponentTemplates: CustomComponentTemplate[];
  savedLayouts: SavedLayout[];
  galleryImages: GalleryImage[];
}

export const isContainerType = (type: ComponentType | string, customTemplates: CustomComponentTemplate[] = []): boolean => {
    if (typeof type !== 'string') return false;

    const standardContainerTypes: (ComponentType | string)[] = [
        'Scaffold', 'Column', 'Row', 'Box', 'Card', 'LazyColumn', 'LazyRow',
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
        backgroundColor: 'transparent', // Scaffold itself usually doesn't have its own BG, relies on content
        children: [DEFAULT_CONTENT_LAZY_COLUMN_ID],
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
        backgroundColor: '#3F51B5',
        textColor: null,
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
        width: 200,
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
            text: 'Checkbox Label',
            checked: false,
            enabled: true,
            selfAlign: 'Inherit',
        };
    case 'RadioButton':
        return {
            ...commonLayout,
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
        backgroundColor: null,
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
        backgroundColor: null,
        width: 412, height: 100, itemSpacing: 8,
        horizontalArrangement: 'Start', verticalAlignment: 'Top',
        selfAlign: 'Inherit',
        ...defaultClickableBehavior,
      };
    case 'Box':
    case 'Group':
      return {
        ...commonLayout,
        children: [],
        padding: 0,
        backgroundColor: null,
        width: 100, height: 100,
        cornerRadiusTopLeft: 4, cornerRadiusTopRight: 4, cornerRadiusBottomRight: 4, cornerRadiusBottomLeft: 4,
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
        backgroundColor: null, contentColor: null,
        width: 200, height: 150, elevation: 2,
        cornerRadiusTopLeft: 8, cornerRadiusTopRight: 8, cornerRadiusBottomRight: 8, cornerRadiusBottomLeft: 8,
        borderWidth: 0, borderColor: '#000000',
        selfAlign: 'Inherit',
        ...defaultClickableBehavior,
      };
    case 'LazyColumn':
      const isContentArea = componentId === DEFAULT_CONTENT_LAZY_COLUMN_ID;
      return {
        ...commonLayout,
        fillMaxWidth: true,
        fillMaxHeight: true,
        children: [],
        padding: isContentArea ? 8 : 0, // Default padding for content area
        backgroundColor: isContentArea ? 'transparent' : undefined,
        width: undefined,
        height: undefined,
        itemSpacing: 8,
        userScrollEnabled: true, reverseLayout: false,
        verticalArrangement: 'Top', horizontalAlignment: 'Start',
        paddingBottom: isContentArea ? (8) : 8, // Add some bottom padding for scroll room
        selfAlign: 'Inherit',
        ...defaultClickableBehavior,
      };
    case 'LazyRow':
      return {
        ...commonLayout,
        fillMaxWidth: false,
        children: [],
        padding: 8,
        backgroundColor: null,
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
        backgroundColor: null,
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
        backgroundColor: null,
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
        padding: 0, paddingTop: 0, paddingBottom: 0, paddingStart: 0, paddingEnd: 0,
        fillMaxWidth: true, fillMaxHeight: false, // Usually fills width
        selfAlign: undefined,
        children: [], // For action items or navigation icon
        title: 'Screen Title',
        titleFontSize: 20,
        width: undefined,
        height: 56, // Standard height
        backgroundColor: '#3F51B5', // Example primary color
        contentColor: '#FFFFFF', // Example contrasting color for title/icons
        itemSpacing: 8,
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
        backgroundColor: '#F0F0F0', // Example light color
        contentColor: '#000000', // Example contrasting color
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
    default:
      if (type.startsWith(CUSTOM_COMPONENT_TYPE_PREFIX)) {
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
    { name: 'iconPosition', type: 'enum', label: 'Icon Position', group: 'Content', options: [{ label: 'Start', value: 'Start' }, { label: 'End', value: 'End' }] },
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
    { name: 'selfAlign', type: 'enum', label: 'Self Align', group: 'Layout', options: [{label: 'Inherit', value: 'Inherit'}, {label: 'Start', value: 'Start'}, {label: 'Center', value: 'Center'}, {label: 'End', value: 'End'}] },
  ],
  RadioButton: [
    { name: 'text', type: 'string', label: 'Label', group: 'Content', placeholder: 'Radio button label' },
    { name: 'selected', type: 'boolean', label: 'Selected', group: 'Behavior' },
    { name: 'enabled', type: 'boolean', label: 'Enabled', group: 'Behavior' },
    { name: 'selfAlign', type: 'enum', label: 'Self Align', group: 'Layout', options: [{label: 'Inherit', value: 'Inherit'}, {label: 'Start', value: 'Start'}, {label: 'Center', value: 'Center'}, {label: 'End', value: 'End'}] },
  ],
  DropdownMenu: [
    { name: 'text', type: 'string', label: 'Button Text', group: 'Content', placeholder: 'Menu' },
    { name: 'backgroundColor', type: 'color', label: 'Button BG Color', group: 'Appearance' },
    { name: 'textColor', type: 'color', label: 'Button Text Color', group: 'Appearance' },
    { name: 'cornerRadius', type: 'number', label: 'Button Corner Radius', group: 'Appearance', placeholder: '4' },
    { name: 'width', type: 'number', label: 'Width (dp)', group: 'Layout', placeholder: 'e.g., 150' },
    { name: 'height', type: 'number', label: 'Height (dp)', group: 'Layout', placeholder: 'e.g., 48' },
    { name: 'padding', type: 'number', label: 'Padding', group: 'Layout', placeholder: '8' },
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
  ],
  TopAppBar: [
    { name: 'title', type: 'string', label: 'Title', group: 'Content' },
    { name: 'titleFontSize', type: 'number', label: 'Title Font Size', group: 'Content' },
    { name: 'backgroundColor', type: 'color', label: 'Background Color', group: 'Appearance' },
    { name: 'contentColor', type: 'color', label: 'Content Color', group: 'Appearance' },
    { name: 'height', type: 'number', label: 'Height', group: 'Layout' },
    { name: 'itemSpacing', type: 'number', label: 'Item Spacing', group: 'Layout' },
    { name: 'horizontalArrangement', type: 'enum', label: 'Horizontal Arrangement', group: 'Layout', options: [{ label: 'Start', value: 'Start' }, { label: 'End', value: 'End' }, { label: 'Center', value: 'Center' }, { label: 'Space Around', value: 'SpaceAround' }, { label: 'Space Between', value: 'SpaceBetween' }, { label: 'Space Evenly', value: 'SpaceEvenly' }] },
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
  Group: [],
};
