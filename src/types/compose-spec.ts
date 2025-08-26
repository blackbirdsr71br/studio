
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
  type: 'string' | 'number' | 'color' | 'boolean' | 'enum';
  value: string | number | boolean;
  options?: ComponentPropertyOption[];
  label: string;
  placeholder?: string;
  group: 'Layout' | 'Appearance' | 'Content' | 'Behavior' | 'Slots' | 'Save' | 'Group';
}

export interface BaseComponentProps {
  [key: string]: any;
  text?: string;
  fontFamily?: string;
  fontSize?: number;
  titleFontSize?: number;
  textColor?: string;
  backgroundColor?: string;
  contentColor?: string;
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
  src?: string;
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
  clickId?: string;
  iconName?: string;
  iconPosition?: 'Start' | 'End';
  iconSize?: number;
  iconSpacing?: number;
  animationType?: 'Fade' | 'Scale' | 'SlideFromTop' | 'SlideFromBottom' | 'SlideFromStart' | 'SlideFromEnd';
  animationDuration?: number;
  shape?: 'Rectangle' | 'RoundedCorner' | 'Circle';

  // Properties for Scaffold structure, used by AI generation
  topBarId?: string; // ID of the TopAppBar component
  contentId?: string; // ID of the main content container (e.g., LazyColumn)
  bottomBarId?: string; // ID of the BottomNavigationBar component
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
  id: string; // e.g., 'design-1'
  name: string; // e.g., 'Main Screen'
  components: DesignComponent[];
  selectedComponentIds: string[];
  nextId: number;
  history: { components: DesignComponent[]; nextId: number; selectedComponentIds: string[] }[];
  future: { components: DesignComponent[]; nextId: number; selectedComponentIds: string[] }[];
  clipboard: DesignComponent[] | null;
}


export interface DesignState {
  designs: SingleDesign[];
  activeDesignId: string;
  customComponentTemplates: CustomComponentTemplate[];
  savedLayouts: SavedLayout[];
  galleryImages: GalleryImage[];

  editingTemplateInfo?: {
    templateId: string;
    firestoreId: string;
    name: string;
  } | null;
  editingLayoutInfo?: {
    firestoreId: string;
    name: string;
  } | null;
}

export const getDefaultProperties = (type: ComponentType | string, componentId?: string): BaseComponentProps => {
  const commonLayout = {
    layoutWeight: 0,
    padding: undefined, paddingTop: undefined, paddingBottom: undefined, paddingStart: undefined, paddingEnd: undefined,
    fillMaxSize: false, fillMaxWidth: false, fillMaxHeight: false,
    selfAlign: 'Inherit' as 'Inherit' | 'Start' | 'Center' | 'End',
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
        fontSize: 16,
        fontFamily: 'Inter',
        textColor: undefined,
        backgroundColor: undefined,
        padding: 0,
        width: undefined,
        height: undefined,
        maxLines: undefined,
        textOverflow: 'Clip',
        fontWeight: 'Normal',
        fontStyle: 'Normal',
        textAlign: 'Start',
        textDecoration: 'None',
        lineHeight: 1,
        selfAlign: 'Inherit',
        clickable: false,
        clickId: 'text_clicked',
      };
    case 'Button':
      return {
        ...commonLayout,
        text: 'Click Me',
        fontSize: 14,
        backgroundColor: '#3F51B5',
        textColor: undefined,
        padding: 12,
        width: undefined,
        height: undefined,
        selfAlign: 'Inherit',
        clickable: false,
        clickId: 'button_clicked',
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
      };
    case 'Image':
      return {
        ...commonLayout,
        src: 'https://placehold.co/300x200.png',
        contentDescription: 'Placeholder Image',
        backgroundColor: undefined,
        width: 200,
        height: 100,
        "data-ai-hint": "abstract pattern",
        contentScale: 'Crop',
        cornerRadiusTopLeft: 0, cornerRadiusTopRight: 0, cornerRadiusBottomRight: 0, cornerRadiusBottomLeft: 0,
        padding: 0,
        selfAlign: 'Inherit',
        clickable: false,
        clickId: 'image_clicked',
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
        clickable: false,
        clickId: 'column_clicked',
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
        clickable: false,
        clickId: 'row_clicked',
      };
    case 'Box':
    case 'Group':
      return {
        ...commonLayout,
        children: [],
        padding: 0,
        backgroundColor: undefined,
        width: 100, height: 100,
        cornerRadiusTopLeft: 4, cornerRadiusTopRight: 4, cornerRadiusBottomRight: 4, cornerRadiusBottomLeft: 4,
        selfAlign: 'Inherit',
        clickable: false,
        clickId: type === 'Group' ? 'group_clicked' : 'box_clicked',
      };
    case 'Card':
      return {
        ...commonLayout,
        horizontalAlignment: 'Start', 
        verticalArrangement: 'Top',   
        itemSpacing: 8,               
        children: [],
        padding: 16,
        backgroundColor: undefined, contentColor: undefined,
        width: 200, height: 150, elevation: 2,
        cornerRadiusTopLeft: 8, cornerRadiusTopRight: 8, cornerRadiusBottomRight: 8, cornerRadiusBottomLeft: 8,
        borderWidth: 0, borderColor: '#000000',
        selfAlign: 'Inherit',
        clickable: false,
        clickId: 'card_clicked',
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
        clickable: false,
        clickId: 'lazy_column_clicked',
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
        clickable: false,
        clickId: 'lazy_row_clicked',
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
        clickable: false,
        clickId: 'lazy_vertical_grid_clicked',
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
        clickable: false,
        clickId: 'lazy_horizontal_grid_clicked',
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
        clickId: 'spacer_clicked',
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
        clickable: false,
        clickId: 'top_app_bar_clicked',
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
        clickable: false,
        clickId: 'bottom_nav_bar_clicked',
      };
    case 'AnimatedContent':
      return {
        ...commonLayout,
        children: [],
        padding: 8,
        backgroundColor: undefined,
        width: 200, height: 200, itemSpacing: 8,
        verticalArrangement: 'Top', horizontalAlignment: 'Start',
        animationType: 'Fade',
        animationDuration: 300,
        selfAlign: 'Inherit',
        clickable: false,
        clickId: 'animated_content_clicked',
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

const selfAlignProperty: Omit<ComponentProperty, 'value'> = {
  name: 'selfAlign',
  type: 'enum',
  label: 'Self Horizontal Alignment',
  group: 'Layout',
  options: [
    { label: 'Inherit from Parent', value: 'Inherit' },
    { label: 'Start', value: 'Start' },
    { label: 'Center', value: 'Center' },
    { label: 'End', value: 'End' },
  ],
  placeholder: 'Inherit from Parent',
};

const commonLayoutProperties: (Omit<ComponentProperty, 'value'>)[] = [
    { name: 'fillMaxSize', type: 'boolean', label: 'Fill Max Size', group: 'Layout' },
    { name: 'fillMaxWidth', type: 'boolean', label: 'Fill Max Width', group: 'Layout' },
    { name: 'width', type: 'number', label: 'Width (dp)', placeholder: 'e.g., 100', group: 'Layout' },
    { name: 'fillMaxHeight', type: 'boolean', label: 'Fill Max Height', group: 'Layout' },
    { name: 'height', type: 'number', label: 'Height (dp)', placeholder: 'e.g., 100', group: 'Layout' },
    { name: 'layoutWeight', type: 'number', label: 'Layout Weight', placeholder: '0 (no weight)', group: 'Layout' },
    { name: 'padding', type: 'number', label: 'Padding (All Sides, dp)', placeholder: 'e.g., 8', group: 'Layout' },
    { name: 'paddingStart', type: 'number', label: 'Padding Start (dp)', placeholder: 'Overrides "All Sides"', group: 'Layout' },
    { name: 'paddingEnd', type: 'number', label: 'Padding End (dp)', placeholder: 'Overrides "All Sides"', group: 'Layout' },
    { name: 'paddingTop', type: 'number', label: 'Padding Top (dp)', placeholder: 'Overrides "All Sides"', group: 'Layout' },
    { name: 'paddingBottom', type: 'number', label: 'Padding Bottom (dp)', placeholder: 'Overrides "All Sides"', group: 'Layout' },
];

const rowSpecificLayoutProperties: (Omit<ComponentProperty, 'value'>)[] = [
  { name: 'itemSpacing', type: 'number', label: 'Item Spacing (dp)', placeholder: '0', group: 'Layout' },
  {
    name: 'horizontalArrangement', type: 'enum', label: 'Horizontal Arrangement', group: 'Layout',
    options: [
      { label: 'Start', value: 'Start' }, { label: 'End', value: 'End' }, { label: 'Center', value: 'Center' },
      { label: 'Space Around', value: 'SpaceAround' }, { label: 'Space Between', value: 'SpaceBetween' }, { label: 'Space Evenly', value: 'SpaceEvenly' },
    ]
  },
  {
    name: 'verticalAlignment', type: 'enum', label: 'Vertical Alignment', group: 'Layout',
    options: [
      { label: 'Top', value: 'Top' }, { label: 'Center Vertically', value: 'CenterVertically' }, { label: 'Bottom', value: 'Bottom' },
    ]
  },
];

const columnSpecificLayoutProperties: (Omit<ComponentProperty, 'value'>)[] = [
  { name: 'itemSpacing', type: 'number', label: 'Item Spacing (dp)', placeholder: '0', group: 'Layout' },
  {
    name: 'verticalArrangement', type: 'enum', label: 'Vertical Arrangement', group: 'Layout',
    options: [
      { label: 'Top', value: 'Top' }, { label: 'Bottom', value: 'Bottom' }, { label: 'Center', value: 'Center' },
      { label: 'Space Around', value: 'SpaceAround' }, { label: 'Space Between', value: 'SpaceBetween' }, { label: 'Space Evenly', value: 'SpaceEvenly' },
    ]
  },
  {
    name: 'horizontalAlignment', type: 'enum', label: 'Horizontal Alignment (Children)', group: 'Layout',
    options: [
      { label: 'Start', value: 'Start' }, { label: 'Center Horizontally', value: 'CenterHorizontally' }, { label: 'End', value: 'End' },
    ]
  },
];

const clickableProperties: (Omit<ComponentProperty, 'value'>)[] = [
    { name: 'clickable', type: 'boolean', label: 'Is Clickable', group: 'Behavior' },
    { name: 'clickId', type: 'string', label: 'Click ID', placeholder: 'e.g., action_name', group: 'Behavior' },
];

const cornerRadiusProperties: (Omit<ComponentProperty, 'value'>)[] = [
    { name: 'cornerRadiusTopLeft', type: 'number', label: 'Corner Radius TL (dp)', placeholder: '0', group: 'Appearance' },
    { name: 'cornerRadiusTopRight', type: 'number', label: 'Corner Radius TR (dp)', placeholder: '0', group: 'Appearance' },
    { name: 'cornerRadiusBottomRight', type: 'number', label: 'Corner Radius BR (dp)', placeholder: '0', group: 'Appearance' },
    { name: 'cornerRadiusBottomLeft', type: 'number', label: 'Corner Radius BL (dp)', placeholder: '0', group: 'Appearance' },
];

const borderProperties: (Omit<ComponentProperty, 'value'>)[] = [
    { name: 'borderWidth', type: 'number', label: 'Border Width (dp)', placeholder: '0', group: 'Appearance' },
    { name: 'borderColor', type: 'color', label: 'Border Color', group: 'Appearance' },
];

const fontProperties: (Omit<ComponentProperty, 'value'>)[] = [
  { name: 'fontSize', type: 'number', label: 'Font Size (sp)', placeholder: '16', group: 'Appearance' },
  {
      name: 'fontFamily',
      type: 'enum',
      label: 'Font Family',
      group: 'Appearance',
      options: [
          { label: 'Inter', value: 'Inter' },
          { label: 'Roboto', value: 'Roboto' },
          { label: 'Lato', value: 'Lato' },
          { label: 'Oswald', value: 'Oswald' },
          { label: 'Merriweather', value: 'Merriweather' },
          { label: 'Playfair Display', value: 'Playfair Display' },
          { label: 'Source Code Pro', value: 'Source Code Pro' },
      ]
  },
  {
    name: 'fontWeight',
    type: 'enum',
    label: 'Font Weight',
    group: 'Appearance',
    options: [
      { label: 'Normal', value: 'Normal' },
      { label: 'Semibold', value: 'Semibold' },
      { label: 'Bold', value: 'Bold' },
    ]
  },
  {
    name: 'fontStyle',
    type: 'enum',
    label: 'Font Style',
    group: 'Appearance',
    options: [
      { label: 'Normal', value: 'Normal' },
      { label: 'Italic', value: 'Italic' },
    ]
  },
  {
    name: 'textAlign',
    type: 'enum',
    label: 'Text Align',
    group: 'Appearance',
    options: [
      { label: 'Start', value: 'Start' },
      { label: 'End', value: 'End' },
      { label: 'Left', value: 'Left' },
      { label: 'Right', value: 'Right' },
      { label: 'Center', value: 'Center' },
      { label: 'Justify', value: 'Justify' },
    ]
  },
  {
    name: 'textDecoration',
    type: 'enum',
    label: 'Text Decoration',
    group: 'Appearance',
    options: [
      { label: 'None', value: 'None' },
      { label: 'Underline', value: 'Underline' },
      { label: 'LineThrough', value: 'LineThrough' },
    ]
  },
];


export const propertyDefinitions: Record<ComponentType | string, (Omit<ComponentProperty, 'value'>)[]> = {
  Scaffold: [
    { name: 'backgroundColor', type: 'color', label: 'Background Color (Scaffold Body)', group: 'Appearance' },
  ],
  Text: [
    ...commonLayoutProperties,
    selfAlignProperty,
    { name: 'text', type: 'string', label: 'Text Content', placeholder: 'Enter text', group: 'Content' },
    ...fontProperties,
    { name: 'textColor', type: 'color', label: 'Text Color', group: 'Appearance' },
    { name: 'backgroundColor', type: 'color', label: 'Background Color', group: 'Appearance' },
    { name: 'lineHeight', type: 'number', label: 'Line Height (multiplier)', placeholder: '1', group: 'Appearance' },
    { name: 'maxLines', type: 'number', label: 'Max Lines', placeholder: 'e.g., 2', group: 'Content' },
    {
      name: 'textOverflow',
      type: 'enum',
      label: 'Text Overflow',
      group: 'Content',
      options: [
        { label: 'Clip', value: 'Clip' },
        { label: 'Ellipsis', value: 'Ellipsis' },
        { label: 'Visible', value: 'Visible' },
      ]
    },
    ...clickableProperties,
  ],
  Button: [
    ...commonLayoutProperties,
    selfAlignProperty,
    { name: 'text', type: 'string', label: 'Button Text', placeholder: 'Button', group: 'Content' },
    { name: 'iconName', type: 'string', label: 'Icon Name (Lucide)', placeholder: 'e.g., Check, arrow-right', group: 'Content' },
    {
      name: 'iconPosition',
      type: 'enum',
      label: 'Icon Position',
      group: 'Content',
      options: [
        { label: 'Start', value: 'Start' },
        { label: 'End', value: 'End' },
      ]
    },
    { name: 'iconSize', type: 'number', label: 'Icon Size (px)', placeholder: '16', group: 'Appearance' },
    { name: 'iconSpacing', type: 'number', label: 'Icon Spacing (px)', placeholder: '8', group: 'Appearance' },
    { name: 'fontSize', type: 'number', label: 'Font Size (sp)', placeholder: '14', group: 'Appearance' },
    { name: 'backgroundColor', type: 'color', label: 'Background Color', group: 'Appearance' },
    { name: 'textColor', type: 'color', label: 'Text/Icon Color', group: 'Appearance' },
    {
      name: 'shape',
      type: 'enum',
      label: 'Shape',
      group: 'Appearance',
      options: [
        { label: 'Rounded Corner', value: 'RoundedCorner' },
        { label: 'Rectangle', value: 'Rectangle' },
        { label: 'Circle', value: 'Circle' },
      ]
    },
    { name: 'cornerRadius', type: 'number', label: 'Corner Radius (dp)', placeholder: '4', group: 'Appearance' },
    ...cornerRadiusProperties,
    ...clickableProperties,
  ],
  Image: [
    ...commonLayoutProperties,
    selfAlignProperty,
    { name: 'src', type: 'string', label: 'Image URL', placeholder: 'https://example.com/image.png', group: 'Content' },
    { name: 'contentDescription', type: 'string', label: 'Content Description', placeholder: 'Image description', group: 'Content' },
    { name: 'data-ai-hint', type: 'string', label: 'AI Hint (for placeholder/generation)', placeholder: 'e.g. "landscape sunset"', group: 'Content'},
    ...cornerRadiusProperties,
    {
      name: 'contentScale',
      type: 'enum',
      label: 'Content Scale',
      group: 'Appearance',
      options: [
        { label: 'Crop', value: 'Crop' },
        { label: 'Fit', value: 'Fit' },
        { label: 'Fill Bounds', value: 'FillBounds' },
        { label: 'Inside', value: 'Inside' },
        { label: 'None', value: 'None' },
        { label: 'Fill Width', value: 'FillWidth' },
        { label: 'Fill Height', value: 'FillHeight' },
      ]
    },
    { name: 'backgroundColor', type: 'color', label: 'Background Color', group: 'Appearance' },
    ...clickableProperties,
  ],
  Column: [
    ...commonLayoutProperties,
    ...columnSpecificLayoutProperties,
    selfAlignProperty,
    { name: 'backgroundColor', type: 'color', label: 'Background Color', group: 'Appearance' },
    ...clickableProperties,
  ],
  Row: [
    ...commonLayoutProperties,
    ...rowSpecificLayoutProperties,
    selfAlignProperty,
    { name: 'backgroundColor', type: 'color', label: 'Background Color', group: 'Appearance' },
    ...clickableProperties,
  ],
  Box: [
    ...commonLayoutProperties,
    selfAlignProperty,
    { name: 'backgroundColor', type: 'color', label: 'Background Color', group: 'Appearance' },
    ...cornerRadiusProperties,
    ...clickableProperties,
  ],
  Group: [
    ...commonLayoutProperties,
    ...columnSpecificLayoutProperties,
    selfAlignProperty,
    { name: 'backgroundColor', type: 'color', label: 'Background Color', group: 'Appearance' },
    ...cornerRadiusProperties,
    ...clickableProperties,
  ],
  Card: [
    ...commonLayoutProperties,
    ...columnSpecificLayoutProperties, // Card often behaves like a Column for its children
    selfAlignProperty,
    { name: 'backgroundColor', type: 'color', label: 'Background Color', group: 'Appearance' },
    { name: 'contentColor', type: 'color', label: 'Content Color (Overrides default contrast)', group: 'Appearance' },
    ...cornerRadiusProperties,
    { name: 'elevation', type: 'number', label: 'Elevation (dp)', placeholder: '2', group: 'Appearance' },
    ...borderProperties,
    ...clickableProperties,
  ],
  LazyColumn: [ // Properties for the content area LazyColumn
    ...commonLayoutProperties.filter(p => !p.name.startsWith('selfAlign')), // selfAlign not relevant for root content
    ...columnSpecificLayoutProperties,
    { name: 'backgroundColor', type: 'color', label: 'Background Color', group: 'Appearance' },
    { name: 'userScrollEnabled', type: 'boolean', label: 'Enable Scrolling', group: 'Behavior' },
    { name: 'reverseLayout', type: 'boolean', label: 'Reverse Layout', group: 'Behavior' },
    ...clickableProperties,
  ],
  LazyRow: [
    ...commonLayoutProperties,
    ...rowSpecificLayoutProperties,
    selfAlignProperty,
    { name: 'backgroundColor', type: 'color', label: 'Background Color', group: 'Appearance' },
    { name: 'userScrollEnabled', type: 'boolean', label: 'Enable Scrolling', group: 'Behavior' },
    { name: 'reverseLayout', type: 'boolean', label: 'Reverse Layout', group: 'Behavior' },
    ...clickableProperties,
  ],
  LazyVerticalGrid: [
    ...commonLayoutProperties,
    ...columnSpecificLayoutProperties, // Grids often share column-like child alignment
    selfAlignProperty,
    { name: 'backgroundColor', type: 'color', label: 'Background Color', group: 'Appearance' },
    { name: 'columns', type: 'number', label: 'Number of Columns', placeholder: '2', group: 'Layout' },
    ...clickableProperties,
  ],
  LazyHorizontalGrid: [
    ...commonLayoutProperties,
    ...rowSpecificLayoutProperties, // And row-like child alignment
    selfAlignProperty,
    { name: 'backgroundColor', type: 'color', label: 'Background Color', group: 'Appearance' },
    { name: 'rows', type: 'number', label: 'Number of Rows', placeholder: '2', group: 'Layout' },
    ...clickableProperties,
  ],
  Spacer: [
    { name: 'width', type: 'number', label: 'Width (dp)', placeholder: '8', group: 'Layout' },
    { name: 'height', type: 'number', label: 'Height (dp)', placeholder: '8', group: 'Layout' },
    { name: 'layoutWeight', type: 'number', label: 'Layout Weight', placeholder: '0 (no weight)', group: 'Layout' },
    ...clickableProperties,
  ],
  TopAppBar: [ // Properties specific to TopAppBar slot component
    ...commonLayoutProperties.filter(p => !['padding', 'paddingTop', 'paddingBottom', 'paddingStart', 'paddingEnd', 'layoutWeight', 'fillMaxHeight', 'height'].includes(p.name) ), // Basic layout, but height is fixed/managed
    { name: 'height', type: 'number', label: 'Height (dp)', placeholder: '56', group: 'Layout' },
    { name: 'title', type: 'string', label: 'Title', placeholder: 'Screen Title', group: 'Content' },
    { name: 'titleFontSize', type: 'number', label: 'Title Font Size (sp)', placeholder: '20', group: 'Appearance' },
    { name: 'backgroundColor', type: 'color', label: 'Background Color', group: 'Appearance' },
    { name: 'contentColor', type: 'color', label: 'Content Color (Title, Icons)', group: 'Appearance' },
    // TopAppBar behaves like a Row for its children (title, actions)
    ...rowSpecificLayoutProperties.filter(p => p.name !== 'itemSpacing'), // Use its own itemSpacing definition
    { name: 'itemSpacing', type: 'number', label: 'Action Item Spacing (dp)', placeholder: '8', group: 'Layout' },
    ...clickableProperties,
  ],
  BottomNavigationBar: [ // Properties specific to BottomNavigationBar slot component
     ...commonLayoutProperties.filter(p => !['padding', 'paddingTop', 'paddingBottom', 'paddingStart', 'paddingEnd', 'layoutWeight', 'fillMaxHeight', 'height'].includes(p.name) ),
    { name: 'height', type: 'number', label: 'Height (dp)', placeholder: '56', group: 'Layout' },
    { name: 'backgroundColor', type: 'color', label: 'Background Color', group: 'Appearance' },
    { name: 'contentColor', type: 'color', label: 'Content Color (Icons, Labels)', group: 'Appearance' },
    // BottomNavigationBar behaves like a Row for its children (nav items)
    ...rowSpecificLayoutProperties,
    ...clickableProperties,
  ],
  AnimatedContent: [
    ...commonLayoutProperties,
    ...columnSpecificLayoutProperties,
    selfAlignProperty,
    { name: 'backgroundColor', type: 'color', label: 'Background Color', group: 'Appearance' },
    {
      name: 'animationType',
      type: 'enum',
      label: 'Animation Type',
      group: 'Behavior',
      options: [
        { label: 'Fade', value: 'Fade' },
        { label: 'Scale', value: 'Scale' },
        { label: 'Slide From Top', value: 'SlideFromTop' },
        { label: 'Slide From Bottom', value: 'SlideFromBottom' },
        { label: 'Slide From Start', value: 'SlideFromStart' },
        { label: 'Slide From End', value: 'SlideFromEnd' },
      ]
    },
    { name: 'animationDuration', type: 'number', label: 'Animation Duration (ms)', placeholder: '300', group: 'Behavior' },
    ...clickableProperties,
  ],
};

export const isCustomComponentType = (type: string): boolean => {
  return type.startsWith(CUSTOM_COMPONENT_TYPE_PREFIX);
};

export const CONTAINER_TYPES: ReadonlyArray<ComponentType | string > = [
  'Column', 'Row', 'Box', 'Card', 'Group',
  'LazyColumn', 'LazyRow', 'LazyVerticalGrid', 'LazyHorizontalGrid',
  'TopAppBar', 'BottomNavigationBar', // These are now containers for their items
  'AnimatedContent',
  'Scaffold' // Scaffold is the root container
];

// Checks if a given component type string represents a container.
// If type is a custom component ID, customTemplates must be provided to resolve its base type.
export function isContainerType(type: ComponentType | string, customTemplates?: CustomComponentTemplate[]): boolean {
  if (type === 'Spacer') return false;

  if (isCustomComponentType(type)) {
    if (customTemplates) {
      const template = customTemplates.find(t => t.templateId === type);
      if (template && template.rootComponentId) {
        const rootOfTemplate = template.componentTree.find(c => c.id === template.rootComponentId);
        if (rootOfTemplate) {
          // Recursively check if the root of the custom component is a container (passing customTemplates down)
          return isContainerType(rootOfTemplate.type, customTemplates);
        }
      }
    }
    return false;
  }
  return CONTAINER_TYPES.includes(type as ComponentType);
}


const ColorStringSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Must be a valid hex color").or(z.literal('transparent'));

const BaseModalPropertiesSchema = z.object({
  text: z.string().optional(),
  fontFamily: z.string().optional(),
  fontSize: z.number().min(0, "Font size must be non-negative").optional(),
  titleFontSize: z.number().min(0, "Font size must be non-negative").optional(),
  textColor: ColorStringSchema.optional().or(z.literal(undefined)),
  backgroundColor: ColorStringSchema.optional(),
  contentColor: ColorStringSchema.optional().or(z.literal(undefined)),
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
  src: z.string().url("Must be a valid HTTP/S URL").or(z.string().startsWith("data:image/")).optional(),
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
  clickId: z.string().optional(),
  iconName: z.string().optional(),
  iconPosition: z.enum(['Start', 'End']).optional(),
  iconSize: z.number().min(0).optional(),
  iconSpacing: z.number().min(0).optional(),
  animationType: z.enum(['Fade', 'Scale', 'SlideFromTop', 'SlideFromBottom', 'SlideFromStart', 'SlideFromEnd']).optional(),
  animationDuration: z.number().int().min(0).optional(),
  shape: z.enum(['Rectangle', 'RoundedCorner', 'Circle']).optional(),
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
