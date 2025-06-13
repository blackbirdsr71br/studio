
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
  | 'TopAppBar'
  | 'BottomNavigationBar'
  | 'Scaffold';

export const CUSTOM_COMPONENT_TYPE_PREFIX = "custom/";
export const ROOT_SCAFFOLD_ID = 'root-scaffold';
export const DEFAULT_CONTENT_LAZY_COLUMN_ID = 'scaffold-content-lazy-column';
export const DEFAULT_TOP_APP_BAR_ID = 'scaffold-top-app-bar';
export const DEFAULT_BOTTOM_NAV_BAR_ID = 'scaffold-bottom-nav-bar';


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
  group: 'Layout' | 'Appearance' | 'Content' | 'Behavior' | 'Slots';
}

export interface BaseComponentProps {
  [key: string]: any;
  text?: string;
  fontSize?: number; // Added for general use
  titleFontSize?: number; // Specific for TopAppBar title
  textColor?: string;
  backgroundColor?: string;
  contentColor?: string;
  width?: 'wrap_content' | 'match_parent' | number | string;
  height?: 'wrap_content' | 'match_parent' | number | string;
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
  fontWeight?: 'Normal' | 'Bold';
  fontStyle?: 'Normal' | 'Italic';
  textAlign?: 'Left' | 'Center' | 'Right' | 'Justify' | 'Start' | 'End';
  textDecoration?: 'None' | 'Underline' | 'LineThrough';
  lineHeight?: number;
  title?: string;

  topBarId?: string;
  contentId?: string;
  bottomBarId?: string;
}

export interface DesignComponent {
  id: string;
  type: ComponentType | string;
  name: string;
  properties: BaseComponentProps & { children?: string[] };
  parentId?: string | null;
}

export interface CustomComponentTemplate {
  firestoreId?: string;
  templateId: string;
  name: string;
  rootComponentId: string;
  componentTree: DesignComponent[];
}

export interface SavedLayout {
  firestoreId?: string;
  layoutId: string;
  name: string;
  components: DesignComponent[];
  nextId: number;
  timestamp?: number;
}

export interface DesignState {
  components: DesignComponent[];
  selectedComponentId: string | null;
  nextId: number;
  customComponentTemplates: CustomComponentTemplate[];
  savedLayouts: SavedLayout[];
}

export const getDefaultProperties = (type: ComponentType | string, componentId?: string): BaseComponentProps => {
  const commonLayout = {
    layoutWeight: 0,
    padding: undefined, paddingTop: undefined, paddingBottom: undefined, paddingStart: undefined, paddingEnd: undefined,
    fillMaxWidth: false, fillMaxHeight: false,
  };
  switch (type) {
    case 'Scaffold':
      return {
        width: 'match_parent',
        height: 'match_parent',
        backgroundColor: 'transparent', 
        children: [DEFAULT_TOP_APP_BAR_ID, DEFAULT_CONTENT_LAZY_COLUMN_ID, DEFAULT_BOTTOM_NAV_BAR_ID]
      };
    case 'Text':
      return {
        ...commonLayout,
        text: 'Sample Text',
        fontSize: 16,
        textColor: undefined,
        padding: 0,
        width: 'wrap_content',
        height: 'wrap_content',
        maxLines: undefined,
        textOverflow: 'Clip',
        fontWeight: 'Normal',
        fontStyle: 'Normal',
        textAlign: 'Start',
        textDecoration: 'None',
        lineHeight: 1.4,
      };
    case 'Button':
      return {
        ...commonLayout,
        text: 'Click Me',
        fontSize: 14,
        backgroundColor: '#3F51B5',
        textColor: undefined,
        padding: 12, // Default button padding
        width: 'wrap_content',
        height: 'wrap_content'
      };
    case 'Image':
      return {
        ...commonLayout,
        src: 'https://placehold.co/300x200.png',
        contentDescription: 'Placeholder Image',
        width: 200,
        height: 100,
        "data-ai-hint": "abstract pattern",
        contentScale: 'Crop',
        cornerRadiusTopLeft: 0, cornerRadiusTopRight: 0, cornerRadiusBottomRight: 0, cornerRadiusBottomLeft: 0,
        padding: 0,
      };
    case 'Column':
      return {
        ...commonLayout,
        children: [],
        padding: 8,
        backgroundColor: 'rgba(224, 224, 224, 0.5)',
        width: 200, height: 200, itemSpacing: 8,
        verticalArrangement: 'Top', horizontalAlignment: 'Start'
      };
    case 'Row':
      return {
        ...commonLayout,
        children: [],
        padding: 8,
        backgroundColor: 'rgba(224, 224, 224, 0.5)',
        width: 200, height: 100, itemSpacing: 8,
        horizontalArrangement: 'Start', verticalAlignment: 'Top'
      };
    case 'Box':
      return {
        ...commonLayout,
        children: [],
        padding: 0,
        backgroundColor: 'rgba(220, 220, 220, 0.3)',
        width: 100, height: 100,
        cornerRadiusTopLeft: 4, cornerRadiusTopRight: 4, cornerRadiusBottomRight: 4, cornerRadiusBottomLeft: 4
      };
    case 'Card':
      return {
        ...commonLayout,
        children: [],
        padding: 16,
        backgroundColor: '#FFFFFF', contentColor: undefined,
        width: 200, height: 150, elevation: 2,
        cornerRadiusTopLeft: 8, cornerRadiusTopRight: 8, cornerRadiusBottomRight: 8, cornerRadiusBottomLeft: 8,
        borderWidth: 0, borderColor: '#000000'
      };
    case 'LazyColumn':
      const isContentArea = componentId === DEFAULT_CONTENT_LAZY_COLUMN_ID;
      return {
        ...commonLayout,
        children: [],
        padding: isContentArea ? 8 : 0,
        backgroundColor: isContentArea ? 'transparent' : 'rgba(200, 240, 200, 0.3)', 
        width: 'match_parent',
        height: 'match_parent',
        itemSpacing: 8,
        userScrollEnabled: true, reverseLayout: false,
        verticalArrangement: 'Top', horizontalAlignment: 'Start', 
        paddingBottom: isContentArea ? (8 + 60) : 8, // Default paddingBottom for LazyColumn is 8
      };
    case 'LazyRow':
      return {
        ...commonLayout,
        children: [],
        padding: 8,
        backgroundColor: 'rgba(200, 200, 240, 0.3)',
        width: 'match_parent', height: 120, itemSpacing: 8,
        userScrollEnabled: true, reverseLayout: false,
        horizontalArrangement: 'Start', verticalAlignment: 'Top',
      };
    case 'LazyVerticalGrid':
      return {
        ...commonLayout,
        children: [],
        padding: 8,
        backgroundColor: 'rgba(240, 200, 200, 0.3)',
        width: 'match_parent', height: 300, columns: 2, itemSpacing: 8,
        verticalArrangement: 'Top', horizontalAlignment: 'Start'
      };
    case 'LazyHorizontalGrid':
      return {
        ...commonLayout,
        children: [],
        padding: 8,
        backgroundColor: 'rgba(240, 240, 200, 0.3)',
        width: 'match_parent', height: 200, rows: 2, itemSpacing: 8,
        horizontalArrangement: 'Start', verticalAlignment: 'Top'
      };
    case 'Spacer':
      return {
        ...commonLayout,
        width: 8,
        height: 8,
        layoutWeight: 0,
      };
    case 'TopAppBar':
      return {
        ...commonLayout,
        children: [],
        title: 'Screen Title',
        titleFontSize: 20,
        width: 'match_parent',
        height: 30, 
        padding: 0,
        paddingStart: 16,
        paddingEnd: 16,
        backgroundColor: '#3F51B5',
        contentColor: '#FFFFFF',
        itemSpacing: 8,
        horizontalArrangement: 'SpaceBetween', // Default arrangement
        verticalAlignment: 'CenterVertically'
      };
    case 'BottomNavigationBar':
      return {
        ...commonLayout,
        children: [],
        width: 'match_parent',
        height: 48,
        padding: 0,
        backgroundColor: '#F0F0F0',
        contentColor: '#000000',
        itemSpacing: 0,
        horizontalArrangement: 'SpaceAround',
        verticalAlignment: 'CenterVertically'
      };
    default:
      if (isCustomComponentType(type)) {
        return { ...commonLayout, children: [], width: 'wrap_content', height: 'wrap_content', padding: 0, fillMaxWidth: false, fillMaxHeight: false };
      }
      return {...commonLayout, width: 'wrap_content', height: 'wrap_content', padding: 0, fillMaxWidth: false, fillMaxHeight: false };
  }
};

export const getComponentDisplayName = (type: ComponentType | string, templateName?: string): string => {
  if (type.startsWith(CUSTOM_COMPONENT_TYPE_PREFIX)) {
    return templateName || type.replace(CUSTOM_COMPONENT_TYPE_PREFIX, "").replace(/-\d+$/, "");
  }
  switch (type as ComponentType) {
    case 'Scaffold': return 'Scaffold (Root)';
    case 'Text': return 'Text';
    case 'Button': return 'Button';
    case 'Column': return 'Column (Layout)';
    case 'Row': return 'Row (Layout)';
    case 'Image': return 'Image';
    case 'Box': return 'Box (Container)';
    case 'Card': return 'Card (Container)';
    case 'LazyColumn': return 'Lazy Column';
    case 'LazyRow': return 'Lazy Row';
    case 'LazyVerticalGrid': return 'Lazy Vertical Grid';
    case 'LazyHorizontalGrid': return 'Lazy Horizontal Grid';
    case 'Spacer': return 'Spacer';
    case 'TopAppBar': return 'Top App Bar';
    case 'BottomNavigationBar': return 'Bottom Nav Bar';
    default: return 'Unknown';
  }
};

const commonLayoutProperties: (Omit<ComponentProperty, 'value'>)[] = [
    { name: 'fillMaxWidth', type: 'boolean', label: 'Fill Max Width', group: 'Layout' },
    { name: 'width', type: 'string', label: 'Width (dp, match_parent, wrap_content)', placeholder: 'e.g., 100, match_parent', group: 'Layout' },
    { name: 'fillMaxHeight', type: 'boolean', label: 'Fill Max Height', group: 'Layout' },
    { name: 'height', type: 'string', label: 'Height (dp, match_parent, wrap_content)', placeholder: 'e.g., 100, wrap_content', group: 'Layout' },
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
    name: 'horizontalAlignment', type: 'enum', label: 'Horizontal Alignment', group: 'Layout',
    options: [
      { label: 'Start', value: 'Start' }, { label: 'Center Horizontally', value: 'CenterHorizontally' }, { label: 'End', value: 'End' },
    ]
  },
];


export const propertyDefinitions: Record<ComponentType | string, (Omit<ComponentProperty, 'value'>)[]> = {
  Scaffold: [
    { name: 'backgroundColor', type: 'color', label: 'Background Color (Scaffold Body)', group: 'Appearance' },
  ],
  Text: [
    ...commonLayoutProperties,
    { name: 'text', type: 'string', label: 'Text Content', placeholder: 'Enter text', group: 'Content' },
    { name: 'fontSize', type: 'number', label: 'Font Size (sp)', placeholder: '16', group: 'Appearance' },
    { name: 'textColor', type: 'color', label: 'Text Color', group: 'Appearance' },
    { name: 'lineHeight', type: 'number', label: 'Line Height (multiplier)', placeholder: '1.4', group: 'Appearance' },
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
    {
      name: 'fontWeight',
      type: 'enum',
      label: 'Font Weight',
      group: 'Appearance',
      options: [
        { label: 'Normal', value: 'Normal' },
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
  ],
  Button: [
    ...commonLayoutProperties,
    { name: 'text', type: 'string', label: 'Button Text', placeholder: 'Button', group: 'Content' },
    { name: 'fontSize', type: 'number', label: 'Font Size (sp)', placeholder: '14', group: 'Appearance' },
    { name: 'backgroundColor', type: 'color', label: 'Background Color', group: 'Appearance' },
    { name: 'textColor', type: 'color', label: 'Text Color', group: 'Appearance' },
  ],
  Image: [
    ...commonLayoutProperties,
    { name: 'src', type: 'string', label: 'Image URL', placeholder: 'https://example.com/image.png', group: 'Content' },
    { name: 'contentDescription', type: 'string', label: 'Content Description', placeholder: 'Image description', group: 'Content' },
    { name: 'data-ai-hint', type: 'string', label: 'AI Hint (for placeholder/generation)', placeholder: 'e.g. "landscape sunset"', group: 'Content'},
    { name: 'cornerRadiusTopLeft', type: 'number', label: 'Corner Radius TL (dp)', placeholder: '0', group: 'Appearance' },
    { name: 'cornerRadiusTopRight', type: 'number', label: 'Corner Radius TR (dp)', placeholder: '0', group: 'Appearance' },
    { name: 'cornerRadiusBottomRight', type: 'number', label: 'Corner Radius BR (dp)', placeholder: '0', group: 'Appearance' },
    { name: 'cornerRadiusBottomLeft', type: 'number', label: 'Corner Radius BL (dp)', placeholder: '0', group: 'Appearance' },
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
  ],
  Column: [
    ...commonLayoutProperties,
    ...columnSpecificLayoutProperties,
    { name: 'backgroundColor', type: 'color', label: 'Background Color', group: 'Appearance' },
  ],
  Row: [
    ...commonLayoutProperties,
    ...rowSpecificLayoutProperties,
    { name: 'backgroundColor', type: 'color', label: 'Background Color', group: 'Appearance' },
  ],
  Box: [
    ...commonLayoutProperties,
    { name: 'backgroundColor', type: 'color', label: 'Background Color', group: 'Appearance' },
    { name: 'cornerRadiusTopLeft', type: 'number', label: 'Corner Radius TL (dp)', placeholder: '0', group: 'Appearance' },
    { name: 'cornerRadiusTopRight', type: 'number', label: 'Corner Radius TR (dp)', placeholder: '0', group: 'Appearance' },
    { name: 'cornerRadiusBottomRight', type: 'number', label: 'Corner Radius BR (dp)', placeholder: '0', group: 'Appearance' },
    { name: 'cornerRadiusBottomLeft', type: 'number', label: 'Corner Radius BL (dp)', placeholder: '0', group: 'Appearance' },
  ],
  Card: [
    ...commonLayoutProperties,
    ...columnSpecificLayoutProperties,
    { name: 'backgroundColor', type: 'color', label: 'Background Color', group: 'Appearance' },
    { name: 'contentColor', type: 'color', label: 'Content Color (Overrides default contrast)', group: 'Appearance' },
    { name: 'cornerRadiusTopLeft', type: 'number', label: 'Corner Radius TL (dp)', placeholder: '8', group: 'Appearance' },
    { name: 'cornerRadiusTopRight', type: 'number', label: 'Corner Radius TR (dp)', placeholder: '8', group: 'Appearance' },
    { name: 'cornerRadiusBottomRight', type: 'number', label: 'Corner Radius BR (dp)', placeholder: '8', group: 'Appearance' },
    { name: 'cornerRadiusBottomLeft', type: 'number', label: 'Corner Radius BL (dp)', placeholder: '8', group: 'Appearance' },
    { name: 'elevation', type: 'number', label: 'Elevation (dp)', placeholder: '2', group: 'Appearance' },
    { name: 'borderWidth', type: 'number', label: 'Border Width (dp)', placeholder: '0', group: 'Appearance' },
    { name: 'borderColor', type: 'color', label: 'Border Color', group: 'Appearance' },
  ],
  LazyColumn: [
    ...commonLayoutProperties,
    ...columnSpecificLayoutProperties,
    { name: 'backgroundColor', type: 'color', label: 'Background Color', group: 'Appearance' },
    { name: 'userScrollEnabled', type: 'boolean', label: 'Enable Scrolling', group: 'Behavior' },
    { name: 'reverseLayout', type: 'boolean', label: 'Reverse Layout', group: 'Behavior' },
  ],
  LazyRow: [
    ...commonLayoutProperties,
    ...rowSpecificLayoutProperties,
    { name: 'backgroundColor', type: 'color', label: 'Background Color', group: 'Appearance' },
    { name: 'userScrollEnabled', type: 'boolean', label: 'Enable Scrolling', group: 'Behavior' },
    { name: 'reverseLayout', type: 'boolean', label: 'Reverse Layout', group: 'Behavior' },
  ],
  LazyVerticalGrid: [
    ...commonLayoutProperties,
    ...columnSpecificLayoutProperties,
    { name: 'backgroundColor', type: 'color', label: 'Background Color', group: 'Appearance' },
    { name: 'columns', type: 'number', label: 'Number of Columns', placeholder: '2', group: 'Layout' },
  ],
  LazyHorizontalGrid: [
    ...commonLayoutProperties,
    ...rowSpecificLayoutProperties,
    { name: 'backgroundColor', type: 'color', label: 'Background Color', group: 'Appearance' },
    { name: 'rows', type: 'number', label: 'Number of Rows', placeholder: '2', group: 'Layout' },
  ],
  Spacer: [
    { name: 'width', type: 'number', label: 'Width (dp)', placeholder: '8', group: 'Layout' },
    { name: 'height', type: 'number', label: 'Height (dp)', placeholder: '8', group: 'Layout' },
    { name: 'layoutWeight', type: 'number', label: 'Layout Weight', placeholder: '0 (no weight)', group: 'Layout' },
  ],
  TopAppBar: [
    ...commonLayoutProperties.filter(p => !['padding', 'paddingTop', 'paddingBottom', 'layoutWeight', 'fillMaxHeight', 'fillMaxWidth', 'height'].includes(p.name) ),
    { name: 'height', type: 'number', label: 'Height (dp)', placeholder: '30', group: 'Layout' }, // Default height
    { name: 'title', type: 'string', label: 'Title', placeholder: 'Screen Title', group: 'Content' },
    { name: 'titleFontSize', type: 'number', label: 'Title Font Size (sp)', placeholder: '20', group: 'Appearance' },
    { name: 'backgroundColor', type: 'color', label: 'Background Color', group: 'Appearance' },
    { name: 'contentColor', type: 'color', label: 'Content Color (Title, Icons)', group: 'Appearance' },
    ...rowSpecificLayoutProperties, // Includes itemSpacing, horizontalArrangement, verticalAlignment
  ],
  BottomNavigationBar: [
     ...commonLayoutProperties.filter(p => !['padding', 'paddingTop', 'paddingBottom', 'layoutWeight', 'fillMaxHeight', 'fillMaxWidth', 'height'].includes(p.name) ),
    { name: 'height', type: 'number', label: 'Height (dp)', placeholder: '48', group: 'Layout' },
    { name: 'backgroundColor', type: 'color', label: 'Background Color', group: 'Appearance' },
    { name: 'contentColor', type: 'color', label: 'Content Color (Icons, Labels)', group: 'Appearance' },
    ...rowSpecificLayoutProperties, // Includes itemSpacing, horizontalArrangement, verticalAlignment
  ],
};

export const isCustomComponentType = (type: string): boolean => {
  return type.startsWith(CUSTOM_COMPONENT_TYPE_PREFIX);
};

export const CONTAINER_TYPES: ReadonlyArray<ComponentType | string > = [
  'Column', 'Row', 'Box', 'Card',
  'LazyColumn', 'LazyRow', 'LazyVerticalGrid', 'LazyHorizontalGrid',
  'TopAppBar', 'BottomNavigationBar',
  'Scaffold'
];

export function isContainerType(type: ComponentType | string, customTemplates?: CustomComponentTemplate[]): boolean {
  if (type === 'Spacer') return false;
  if (isCustomComponentType(type)) {
    if (customTemplates) {
      const template = customTemplates.find(t => t.templateId === type);
      if (template && template.rootComponentId) {
        const rootOfTemplate = template.componentTree.find(c => c.id === template.rootComponentId);
        if (rootOfTemplate) {

          return isContainerType(rootOfTemplate.type, customTemplates);
        }
      }
    }
    return false;
  }
  return CONTAINER_TYPES.includes(type as ComponentType);
}


const BaseModalPropertiesSchema = z.object({
  text: z.string().optional(),
  fontSize: z.number().optional(),
  titleFontSize: z.number().optional(),
  textColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Must be a valid hex color").optional().or(z.literal(undefined)),
  backgroundColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Must be a valid hex color").optional(),
  contentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Must be a valid hex color").optional().or(z.literal(undefined)),
  width: z.union([z.literal('wrap_content'), z.literal('match_parent'), z.number().min(0), z.string()]).optional(),
  height: z.union([z.literal('wrap_content'), z.literal('match_parent'), z.number().min(0), z.string()]).optional(),
  fillMaxWidth: z.boolean().optional(),
  fillMaxHeight: z.boolean().optional(),
  layoutWeight: z.number().min(0).optional(),
  padding: z.number().min(0).optional(),
  paddingTop: z.number().min(0).optional(),
  paddingBottom: z.number().min(0).optional(),
  paddingStart: z.number().min(0).optional(),
  paddingEnd: z.number().min(0).optional(),
  contentDescription: z.string().optional(),
  src: z.string().url("Must be a valid URL for Image src").or(z.string().startsWith("data:image/")).optional(),
  "data-ai-hint": z.string().optional(),
  elevation: z.number().min(0).optional(),
  cornerRadiusTopLeft: z.number().min(0).optional(),
  cornerRadiusTopRight: z.number().min(0).optional(),
  cornerRadiusBottomRight: z.number().min(0).optional(),
  cornerRadiusBottomLeft: z.number().min(0).optional(),
  borderWidth: z.number().min(0).optional(),
  borderColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Must be a valid hex color").optional(),
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
  fontWeight: z.enum(['Normal', 'Bold']).optional(),
  fontStyle: z.enum(['Normal', 'Italic']).optional(),
  textAlign: z.enum(['Left', 'Center', 'Right', 'Justify', 'Start', 'End']).optional(),
  textDecoration: z.enum(['None', 'Underline', 'LineThrough']).optional(),
  lineHeight: z.number().min(0).optional(),
  title: z.string().optional(),

}).catchall(z.any());


type ModalComponentNodePlain = {
  id: string;
  type: string;
  name: string;
  parentId: string | null;
  properties?: Partial<BaseComponentProps> & { children?: ModalComponentNodePlain[] };
};

const ModalComponentNodeSchema: z.ZodType<ModalComponentNodePlain> = z.lazy(() =>
  z.object({
    id: z.string().min(1, "Component ID cannot be empty"),
    type: z.string().min(1, "Component type cannot be empty"),
    name: z.string().min(1, "Component name cannot be empty"),
    parentId: z.string().nullable(),
    properties: BaseModalPropertiesSchema.extend({
      children: z.array(ModalComponentNodeSchema).optional(),
    }).optional(),
  }).refine(data => {

    if (data.type === 'Image') {
      if (data.properties?.src && !z.string().url().or(z.string().startsWith("data:image/")).safeParse(data.properties.src).success) {
        // This would be caught by BaseModalPropertiesSchema's .url() or .startsWith()
      }
    }

    if (data.type === 'Spacer') {
        const props = data.properties || {};
        const hasWeight = typeof props.layoutWeight === 'number' && props.layoutWeight > 0;
        const hasWidth = typeof props.width === 'number' && props.width > 0;
        const hasHeight = typeof props.height === 'number' && props.height > 0;
        if (!hasWeight && !hasWidth && !hasHeight) {
          // This is a validation, not a type error. Zod's .refine needs to return false for error.
        }
    }
    return true;
  })
);

export const ModalJsonSchema = z.array(ModalComponentNodeSchema);

    