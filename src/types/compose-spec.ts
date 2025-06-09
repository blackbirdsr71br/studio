
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
  | 'LazyHorizontalGrid';

// Added to distinguish custom component types in the library
export const CUSTOM_COMPONENT_TYPE_PREFIX = "custom/";
export const DEFAULT_ROOT_LAZY_COLUMN_ID = 'default-root-lazy-column';

export interface ComponentPropertyOption {
  label: string;
  value: string;
}
export interface ComponentProperty {
  name:string;
  type: 'string' | 'number' | 'color' | 'boolean' | 'enum';
  value: string | number | boolean; // Default value for the definition
  options?: ComponentPropertyOption[]; // For enum type
  label: string;
  placeholder?: string;
  group: 'Layout' | 'Appearance' | 'Content' | 'Behavior'; // Added group for tabbing
}

export interface BaseComponentProps {
  [key: string]: any;
  text?: string;
  fontSize?: number;
  textColor?: string;
  backgroundColor?: string;
  width?: 'wrap_content' | 'match_parent' | number;
  height?: 'wrap_content' | 'match_parent' | number;
  padding?: number;
  id?: string;
  x?: number;
  y?: number;
  children?: string[] | any[]; // any[] for modal JSON, string[] for DesignComponent
  contentDescription?: string;
  src?: string;
  "data-ai-hint"?: string;
  elevation?: number; // For Card
  cornerRadius?: number; // For Card, Box, Image
  columns?: number; // For LazyVerticalGrid
  rows?: number; // For LazyHorizontalGrid
  maxLines?: number; // For Text
  textOverflow?: 'Clip' | 'Ellipsis' | 'Visible'; // For Text
  contentScale?: 'Crop' | 'Fit' | 'FillBounds' | 'Inside' | 'None' | 'FillWidth' | 'FillHeight'; // For Image
  // Properties for LazyColumn / LazyRow
  itemSpacing?: number; // Renamed from verticalArrangementSpacing / horizontalArrangementSpacing
  userScrollEnabled?: boolean;
  reverseLayout?: boolean;
  // New LazyColumn specific layout properties
  verticalArrangement?: 'Top' | 'Bottom' | 'Center' | 'SpaceAround' | 'SpaceBetween' | 'SpaceEvenly';
  horizontalAlignment?: 'Start' | 'CenterHorizontally' | 'End';
  // New LazyRow specific layout properties
  horizontalArrangement?: 'Start' | 'End' | 'Center' | 'SpaceAround' | 'SpaceBetween' | 'SpaceEvenly';
  verticalAlignment?: 'Top' | 'CenterVertically' | 'Bottom';

  // New Text properties
  fontWeight?: 'Normal' | 'Bold';
  fontStyle?: 'Normal' | 'Italic';
  textAlign?: 'Left' | 'Center' | 'Right' | 'Justify' | 'Start' | 'End';
  textDecoration?: 'None' | 'Underline' | 'LineThrough';
  lineHeight?: number; // Added lineHeight
}

export interface DesignComponent {
  id: string;
  type: ComponentType | string; // Allow string for custom types
  name: string;
  properties: BaseComponentProps & { children?: string[] }; // DesignComponent uses string[] for children IDs
  parentId?: string | null;
}

export interface CustomComponentTemplate {
  firestoreId?: string; // Firestore document ID
  templateId: string; // e.g., "custom/MyHeader" - acts as its type
  name: string; // User-friendly name, e.g., "My Header"
  rootComponentId: string; // The ID of the root component within this template's componentTree
  componentTree: DesignComponent[]; // All components forming this template, with relative parentIds.
                                   // IDs within this tree are template-local.
}

export interface DesignState {
  components: DesignComponent[];
  selectedComponentId: string | null;
  nextId: number;
  customComponentTemplates: CustomComponentTemplate[];
}

export const getDefaultProperties = (type: ComponentType | string): BaseComponentProps => {
  const common = { x: 50, y: 50 };
  switch (type) {
    case 'Text':
      return {
        ...common,
        text: 'Sample Text',
        fontSize: 16,
        textColor: '#000000',
        padding: 0,
        maxLines: undefined,
        textOverflow: 'Clip',
        fontWeight: 'Normal',
        fontStyle: 'Normal',
        textAlign: 'Start',
        textDecoration: 'None',
        lineHeight: 1.4, // Default lineHeight
      };
    case 'Button':
      return { ...common, text: 'Click Me', backgroundColor: '#3F51B5', textColor: '#FFFFFF', padding: 12 };
    case 'Image':
      return { ...common, src: 'https://placehold.co/200x100.png', contentDescription: 'Placeholder Image', width: 200, height: 100, "data-ai-hint": "abstract pattern", contentScale: 'Crop', cornerRadius: 0 };
    case 'Column':
      return { ...common, children: [], padding: 8, backgroundColor: 'rgba(224, 224, 224, 0.5)', width: 200, height: 200, itemSpacing: 0, verticalArrangement: 'Top', horizontalAlignment: 'Start' };
    case 'Row':
      return { ...common, children: [], padding: 8, backgroundColor: 'rgba(224, 224, 224, 0.5)', width: 200, height: 100, itemSpacing: 0, horizontalArrangement: 'Start', verticalAlignment: 'Top' };
    case 'Box':
      return { ...common, children: [], padding: 0, backgroundColor: 'rgba(220, 220, 220, 0.3)', width: 100, height: 100, cornerRadius: 4 };
    case 'Card':
      return { ...common, children: [], padding: 16, backgroundColor: '#FFFFFF', width: 200, height: 150, elevation: 2, cornerRadius: 8 };
    case 'LazyColumn':
      return {
        ...common,
        children: [],
        padding: 8,
        backgroundColor: 'rgba(200, 240, 200, 0.3)',
        width: 'match_parent',
        height: 300,
        itemSpacing: 0,
        userScrollEnabled: true,
        reverseLayout: false,
        verticalArrangement: 'Top',
        horizontalAlignment: 'Start',
      };
    case 'LazyRow':
      return {
        ...common,
        children: [],
        padding: 8,
        backgroundColor: 'rgba(200, 200, 240, 0.3)',
        width: 'match_parent',
        height: 120,
        itemSpacing: 0,
        userScrollEnabled: true,
        reverseLayout: false,
        horizontalArrangement: 'Start',
        verticalAlignment: 'Top',
      };
    case 'LazyVerticalGrid':
      return { ...common, children: [], padding: 8, backgroundColor: 'rgba(240, 200, 200, 0.3)', width: 'match_parent', height: 300, columns: 2, itemSpacing: 0, verticalArrangement: 'Top', horizontalAlignment: 'Start' };
    case 'LazyHorizontalGrid':
      return { ...common, children: [], padding: 8, backgroundColor: 'rgba(240, 240, 200, 0.3)', width: 'match_parent', height: 200, rows: 2, itemSpacing: 0, horizontalArrangement: 'Start', verticalAlignment: 'Top' };
    default:
      // For custom components, we might not have specific defaults here.
      // The template itself defines the defaults.
      if (isCustomComponentType(type)) {
        return { ...common, children: [] };
      }
      return common;
  }
};

export const getComponentDisplayName = (type: ComponentType | string, templateName?: string): string => {
  if (type.startsWith(CUSTOM_COMPONENT_TYPE_PREFIX)) {
    return templateName || type.replace(CUSTOM_COMPONENT_TYPE_PREFIX, "").replace(/-\d+$/, ""); // Clean up potential timestamp
  }
  switch (type as ComponentType) {
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
    default: return 'Unknown';
  }
};

export const propertyDefinitions: Record<ComponentType, (Omit<ComponentProperty, 'value'>)[]> = {
  Text: [
    { name: 'text', type: 'string', label: 'Text Content', placeholder: 'Enter text', group: 'Content' },
    { name: 'fontSize', type: 'number', label: 'Font Size (sp)', placeholder: '16', group: 'Appearance' },
    { name: 'textColor', type: 'color', label: 'Text Color', group: 'Appearance' },
    { name: 'padding', type: 'number', label: 'Padding (dp)', placeholder: '0', group: 'Layout' },
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
    { name: 'text', type: 'string', label: 'Button Text', placeholder: 'Button', group: 'Content' },
    { name: 'backgroundColor', type: 'color', label: 'Background Color', group: 'Appearance' },
    { name: 'textColor', type: 'color', label: 'Text Color', group: 'Appearance' },
    { name: 'padding', type: 'number', label: 'Padding (dp)', placeholder: '12', group: 'Layout' },
  ],
  Image: [
    { name: 'src', type: 'string', label: 'Image URL', placeholder: 'https://example.com/image.png', group: 'Content' },
    { name: 'contentDescription', type: 'string', label: 'Content Description', placeholder: 'Image description', group: 'Content' },
    { name: 'width', type: 'number', label: 'Width (dp)', placeholder: '100', group: 'Layout' },
    { name: 'height', type: 'number', label: 'Height (dp)', placeholder: '100', group: 'Layout' },
    { name: 'data-ai-hint', type: 'string', label: 'AI Hint (for placeholder/generation)', placeholder: 'e.g. "landscape sunset"', group: 'Content'},
    { name: 'cornerRadius', type: 'number', label: 'Corner Radius (dp)', placeholder: '0', group: 'Appearance' },
    {
      name: 'contentScale',
      type: 'enum',
      label: 'Content Scale',
      group: 'Appearance',
      options: [
        { label: 'Crop', value: 'Crop' }, // Fills bounds, crops excess
        { label: 'Fit', value: 'Fit' }, // Fits inside bounds, letter/pillarbox
        { label: 'Fill Bounds', value: 'FillBounds' }, // Stretches to fill bounds
        { label: 'Inside', value: 'Inside' }, // Scales down to fit, no upscaling
        { label: 'None', value: 'None' }, // No scaling
        { label: 'Fill Width', value: 'FillWidth' }, // Scales to fill width, height adjusts
        { label: 'Fill Height', value: 'FillHeight' }, // Scales to fill height, width adjusts
      ]
    },
  ],
  Column: [
    { name: 'padding', type: 'number', label: 'Padding (dp)', placeholder: '8', group: 'Layout' },
    { name: 'backgroundColor', type: 'color', label: 'Background Color', group: 'Appearance' },
    { name: 'width', type: 'number', label: 'Width (dp)', placeholder: '200', group: 'Layout' },
    { name: 'height', type: 'number', label: 'Height (dp)', placeholder: '200', group: 'Layout' },
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
  ],
  Row: [
    { name: 'padding', type: 'number', label: 'Padding (dp)', placeholder: '8', group: 'Layout' },
    { name: 'backgroundColor', type: 'color', label: 'Background Color', group: 'Appearance' },
    { name: 'width', type: 'number', label: 'Width (dp)', placeholder: '200', group: 'Layout' },
    { name: 'height', type: 'number', label: 'Height (dp)', placeholder: '100', group: 'Layout' },
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
  ],
  Box: [
    { name: 'padding', type: 'number', label: 'Padding (dp)', placeholder: '0', group: 'Layout' },
    { name: 'backgroundColor', type: 'color', label: 'Background Color', group: 'Appearance' },
    { name: 'cornerRadius', type: 'number', label: 'Corner Radius (dp)', placeholder: '4', group: 'Appearance' },
    { name: 'width', type: 'number', label: 'Width (dp)', placeholder: '100', group: 'Layout' },
    { name: 'height', type: 'number', label: 'Height (dp)', placeholder: '100', group: 'Layout' },
  ],
  Card: [
    { name: 'padding', type: 'number', label: 'Padding (dp)', placeholder: '16', group: 'Layout' },
    { name: 'backgroundColor', type: 'color', label: 'Background Color', group: 'Appearance' },
    { name: 'cornerRadius', type: 'number', label: 'Corner Radius (dp)', placeholder: '8', group: 'Appearance' },
    { name: 'width', type: 'number', label: 'Width (dp)', placeholder: '200', group: 'Layout' },
    { name: 'height', type: 'number', label: 'Height (dp)', placeholder: '150', group: 'Layout' },
    { name: 'elevation', type: 'number', label: 'Elevation (dp)', placeholder: '2', group: 'Appearance' },
  ],
  LazyColumn: [
    { name: 'padding', type: 'number', label: 'Padding (dp)', placeholder: '8', group: 'Layout' },
    { name: 'backgroundColor', type: 'color', label: 'Background Color', group: 'Appearance' },
    { name: 'width', type: 'number', label: 'Width (dp)', placeholder: '300', group: 'Layout' }, // Default might be 'match_parent' in logic
    { name: 'height', type: 'number', label: 'Height (dp)', placeholder: '300', group: 'Layout' }, // Default might be 'match_parent' in logic
    { name: 'itemSpacing', type: 'number', label: 'Item Spacing (dp)', placeholder: '0', group: 'Layout' },
    {
      name: 'verticalArrangement',
      type: 'enum',
      label: 'Vertical Arrangement',
      group: 'Layout',
      options: [
        { label: 'Top', value: 'Top' },
        { label: 'Bottom', value: 'Bottom' },
        { label: 'Center', value: 'Center' },
        { label: 'Space Around', value: 'SpaceAround' },
        { label: 'Space Between', value: 'SpaceBetween' },
        { label: 'Space Evenly', value: 'SpaceEvenly' },
      ],
    },
    {
      name: 'horizontalAlignment',
      type: 'enum',
      label: 'Horizontal Alignment',
      group: 'Layout',
      options: [
        { label: 'Start', value: 'Start' },
        { label: 'Center Horizontally', value: 'CenterHorizontally' },
        { label: 'End', value: 'End' },
      ],
    },
    { name: 'userScrollEnabled', type: 'boolean', label: 'Enable Scrolling', group: 'Behavior' },
    { name: 'reverseLayout', type: 'boolean', label: 'Reverse Layout', group: 'Behavior' },
  ],
  LazyRow: [
    { name: 'padding', type: 'number', label: 'Padding (dp)', placeholder: '8', group: 'Layout' },
    { name: 'backgroundColor', type: 'color', label: 'Background Color', group: 'Appearance' },
    { name: 'width', type: 'number', label: 'Width (dp)', placeholder: '300', group: 'Layout' },
    { name: 'height', type: 'number', label: 'Height (dp)', placeholder: '120', group: 'Layout' },
    { name: 'itemSpacing', type: 'number', label: 'Item Spacing (dp)', placeholder: '0', group: 'Layout' },
    {
      name: 'horizontalArrangement',
      type: 'enum',
      label: 'Horizontal Arrangement',
      group: 'Layout',
      options: [
        { label: 'Start', value: 'Start' },
        { label: 'End', value: 'End' },
        { label: 'Center', value: 'Center' },
        { label: 'Space Around', value: 'SpaceAround' },
        { label: 'Space Between', value: 'SpaceBetween' },
        { label: 'Space Evenly', value: 'SpaceEvenly' },
      ],
    },
    {
      name: 'verticalAlignment',
      type: 'enum',
      label: 'Vertical Alignment',
      group: 'Layout',
      options: [
        { label: 'Top', value: 'Top' },
        { label: 'Center Vertically', value: 'CenterVertically' },
        { label: 'Bottom', value: 'Bottom' },
      ],
    },
    { name: 'userScrollEnabled', type: 'boolean', label: 'Enable Scrolling', group: 'Behavior' },
    { name: 'reverseLayout', type: 'boolean', label: 'Reverse Layout', group: 'Behavior' },
  ],
  LazyVerticalGrid: [
    { name: 'padding', type: 'number', label: 'Padding (dp)', placeholder: '8', group: 'Layout' },
    { name: 'backgroundColor', type: 'color', label: 'Background Color', group: 'Appearance' },
    { name: 'width', type: 'number', label: 'Width (dp)', placeholder: '300', group: 'Layout' },
    { name: 'height', type: 'number', label: 'Height (dp)', placeholder: '300', group: 'Layout' },
    { name: 'columns', type: 'number', label: 'Number of Columns', placeholder: '2', group: 'Layout' },
    { name: 'itemSpacing', type: 'number', label: 'Item Spacing (dp)', placeholder: '0', group: 'Layout' },
    {
      name: 'verticalArrangement', type: 'enum', label: 'Vertical Arrangement (Items)', group: 'Layout',
      options: [
        { label: 'Top', value: 'Top' }, { label: 'Bottom', value: 'Bottom' }, { label: 'Center', value: 'Center' },
        { label: 'Space Around', value: 'SpaceAround' }, { label: 'Space Between', value: 'SpaceBetween' }, { label: 'Space Evenly', value: 'SpaceEvenly' },
      ]
    },
    {
      name: 'horizontalAlignment', type: 'enum', label: 'Horizontal Alignment (Items)', group: 'Layout',
      options: [
        { label: 'Start', value: 'Start' }, { label: 'Center Horizontally', value: 'CenterHorizontally' }, { label: 'End', value: 'End' },
      ]
    },
  ],
  LazyHorizontalGrid: [
    { name: 'padding', type: 'number', label: 'Padding (dp)', placeholder: '8', group: 'Layout' },
    { name: 'backgroundColor', type: 'color', label: 'Background Color', group: 'Appearance' },
    { name: 'width', type: 'number', label: 'Width (dp)', placeholder: '300', group: 'Layout' },
    { name: 'height', type: 'number', label: 'Height (dp)', placeholder: '200', group: 'Layout' },
    { name: 'rows', type: 'number', label: 'Number of Rows', placeholder: '2', group: 'Layout' },
    { name: 'itemSpacing', type: 'number', label: 'Item Spacing (dp)', placeholder: '0', group: 'Layout' },
     {
      name: 'horizontalArrangement', type: 'enum', label: 'Horizontal Arrangement (Items)', group: 'Layout',
      options: [
        { label: 'Start', value: 'Start' }, { label: 'End', value: 'End' }, { label: 'Center', value: 'Center' },
        { label: 'Space Around', value: 'SpaceAround' }, { label: 'Space Between', value: 'SpaceBetween' }, { label: 'Space Evenly', value: 'SpaceEvenly' },
      ]
    },
    {
      name: 'verticalAlignment', type: 'enum', label: 'Vertical Alignment (Items)', group: 'Layout',
      options: [
        { label: 'Top', value: 'Top' }, { label: 'Center Vertically', value: 'CenterVertically' }, { label: 'Bottom', value: 'Bottom' },
      ]
    },
  ],
};

// Helper to check if a type string is for a custom component
export const isCustomComponentType = (type: string): boolean => {
  return type.startsWith(CUSTOM_COMPONENT_TYPE_PREFIX);
};

export const CONTAINER_TYPES: ReadonlyArray<ComponentType> = [
  'Column', 'Row', 'Box', 'Card',
  'LazyColumn', 'LazyRow', 'LazyVerticalGrid', 'LazyHorizontalGrid'
];

// Helper function to determine if a component type is a container
export function isContainerType(type: ComponentType | string, customTemplates?: CustomComponentTemplate[]): boolean {
  if (isCustomComponentType(type)) {
    if (customTemplates) {
      const template = customTemplates.find(t => t.templateId === type);
      if (template && template.rootComponentId) {
        const rootOfTemplate = template.componentTree.find(c => c.id === template.rootComponentId);
        if (rootOfTemplate) {
          return CONTAINER_TYPES.includes(rootOfTemplate.type as ComponentType);
        }
      }
    }
    return false;
  }
  return CONTAINER_TYPES.includes(type as ComponentType);
}


// Zod Schemas for Modal JSON Validation
const BaseModalPropertiesSchema = z.object({
  text: z.string().optional(),
  fontSize: z.number().optional(),
  textColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Must be a valid hex color").optional(),
  backgroundColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Must be a valid hex color").optional(),
  width: z.union([z.literal('wrap_content'), z.literal('match_parent'), z.number().min(0)]).optional(),
  height: z.union([z.literal('wrap_content'), z.literal('match_parent'), z.number().min(0)]).optional(),
  padding: z.number().min(0).optional(),
  contentDescription: z.string().optional(),
  src: z.string().url("Must be a valid URL for Image src").or(z.string().startsWith("data:image/")).optional(), // Allow data URIs
  "data-ai-hint": z.string().optional(),
  elevation: z.number().min(0).optional(),
  cornerRadius: z.number().min(0).optional(),
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
}).catchall(z.any()); // Allows unspecified properties, useful for forward compatibility or custom props not in schema

// Define the type for a node in the modal JSON structure, including recursive children
type ModalComponentNodePlain = {
  id: string;
  type: string; // Using string to accommodate custom types like "custom/MyHeader-12345"
  name: string;
  parentId: string | null; // parentId in modal JSON refers to parent *within the modal JSON structure*
  properties?: Partial<BaseComponentProps> & { children?: ModalComponentNodePlain[] };
};

// Zod schema for a single component node in the modal JSON
const ModalComponentNodeSchema: z.ZodType<ModalComponentNodePlain> = z.lazy(() =>
  z.object({
    id: z.string().min(1, "Component ID cannot be empty"),
    type: z.string().min(1, "Component type cannot be empty"),
    name: z.string().min(1, "Component name cannot be empty"),
    // parentId in the JSON from the modal refers to its parent *within that JSON structure*.
    // When flattened, DesignContext.overwriteComponents will determine the actual parentId in the global component list.
    // For top-level items in the modal's JSON array, this parentId from JSON will be the ID of the DEFAULT_ROOT_LAZY_COLUMN.
    // For nested items, it will be the ID of their JSON parent.
    parentId: z.string().nullable(), // Can be null for top-level items from user's perspective (children of root canvas)
    properties: BaseModalPropertiesSchema.extend({
      children: z.array(ModalComponentNodeSchema).optional(),
    }).optional(), // Make the 'properties' object itself optional
  }).refine(data => {
    if (data.type === 'Image') {
      if (data.properties?.src && !z.string().url().or(z.string().startsWith("data:image/")).safeParse(data.properties.src).success) {
        // This custom refinement is a bit tricky with .optional() on properties.
        // It might be better to handle this in a superRefine on the BaseModalPropertiesSchema if stricter src validation is needed.
        // For now, rely on the src validation within BaseModalPropertiesSchema.
      }
    }
    return true;
  })
);

// Zod schema for the entire JSON structure in the modal (an array of root-level user components)
export const ModalJsonSchema = z.array(ModalComponentNodeSchema);

    