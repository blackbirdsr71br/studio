
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
  children?: string[];
  contentDescription?: string;
  src?: string;
  "data-ai-hint"?: string;
  elevation?: number; // For Card
  cornerRadius?: number; // For Card, Box
  columns?: number; // For LazyVerticalGrid
  rows?: number; // For LazyHorizontalGrid
  maxLines?: number; // For Text
  textOverflow?: 'Clip' | 'Ellipsis' | 'Visible'; // For Text
  contentScale?: 'Crop' | 'Fit' | 'FillBounds' | 'Inside' | 'None' | 'FillWidth' | 'FillHeight'; // For Image
  // Properties for LazyColumn
  verticalArrangementSpacing?: number;
  userScrollEnabled?: boolean;
  reverseLayout?: boolean;
  // Properties for LazyRow (some may overlap, like userScrollEnabled and reverseLayout)
  horizontalArrangementSpacing?: number;
}

export interface DesignComponent {
  id: string;
  type: ComponentType; // Base component type
  name: string;
  properties: BaseComponentProps;
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

export const getDefaultProperties = (type: ComponentType): BaseComponentProps => {
  const common = { x: 50, y: 50 };
  switch (type) {
    case 'Text':
      return { ...common, text: 'Sample Text', fontSize: 16, textColor: '#000000', padding: 0, maxLines: undefined, textOverflow: 'Clip' };
    case 'Button':
      return { ...common, text: 'Click Me', backgroundColor: '#3F51B5', textColor: '#FFFFFF', padding: 12 };
    case 'Image':
      return { ...common, src: 'https://placehold.co/200x100.png', contentDescription: 'Placeholder Image', width: 200, height: 100, "data-ai-hint": "abstract pattern", contentScale: 'Crop' };
    case 'Column':
      return { ...common, children: [], padding: 8, backgroundColor: 'rgba(224, 224, 224, 0.5)', width: 200, height: 200 };
    case 'Row':
      return { ...common, children: [], padding: 8, backgroundColor: 'rgba(224, 224, 224, 0.5)', width: 200, height: 100 };
    case 'Box':
      return { ...common, children: [], padding: 0, backgroundColor: 'rgba(220, 220, 220, 0.3)', width: 100, height: 100, cornerRadius: 4 };
    case 'Card':
      return { ...common, children: [], padding: 16, backgroundColor: '#FFFFFF', width: 200, height: 150, elevation: 2, cornerRadius: 8 };
    case 'LazyColumn':
      return { ...common, children: [], padding: 8, backgroundColor: 'rgba(200, 240, 200, 0.3)', width: 'match_parent', height: 300, verticalArrangementSpacing: 0, userScrollEnabled: true, reverseLayout: false };
    case 'LazyRow':
      return { ...common, children: [], padding: 8, backgroundColor: 'rgba(200, 200, 240, 0.3)', width: 'match_parent', height: 120, horizontalArrangementSpacing: 0, userScrollEnabled: true, reverseLayout: false };
    case 'LazyVerticalGrid':
      return { ...common, children: [], padding: 8, backgroundColor: 'rgba(240, 200, 200, 0.3)', width: 'match_parent', height: 300, columns: 2 };
    case 'LazyHorizontalGrid':
      return { ...common, children: [], padding: 8, backgroundColor: 'rgba(240, 240, 200, 0.3)', width: 'match_parent', height: 200, rows: 2 };
    default:
      return common;
  }
};

export const getComponentDisplayName = (type: ComponentType | string, templateName?: string): string => {
  if (type.startsWith(CUSTOM_COMPONENT_TYPE_PREFIX)) {
    return templateName || type.replace(CUSTOM_COMPONENT_TYPE_PREFIX, "");
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
    { name: 'data-ai-hint', type: 'string', label: 'AI Hint (for placeholder)', placeholder: 'e.g. "landscape"', group: 'Content'},
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
    { name: 'padding', type: 'number', label: 'Padding (dp)', placeholder: '8', group: 'Layout' },
    { name: 'backgroundColor', type: 'color', label: 'Background Color', group: 'Appearance' },
    { name: 'width', type: 'number', label: 'Width (dp)', placeholder: '200', group: 'Layout' },
    { name: 'height', type: 'number', label: 'Height (dp)', placeholder: '200', group: 'Layout' },
  ],
  Row: [
    { name: 'padding', type: 'number', label: 'Padding (dp)', placeholder: '8', group: 'Layout' },
    { name: 'backgroundColor', type: 'color', label: 'Background Color', group: 'Appearance' },
    { name: 'width', type: 'number', label: 'Width (dp)', placeholder: '200', group: 'Layout' },
    { name: 'height', type: 'number', label: 'Height (dp)', placeholder: '100', group: 'Layout' },
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
    { name: 'width', type: 'number', label: 'Width (dp)', placeholder: '300', group: 'Layout' },
    { name: 'height', type: 'number', label: 'Height (dp)', placeholder: '300', group: 'Layout' },
    { name: 'verticalArrangementSpacing', type: 'number', label: 'Item Spacing (dp)', placeholder: '0', group: 'Layout' },
    { name: 'userScrollEnabled', type: 'boolean', label: 'Enable Scrolling', group: 'Behavior' },
    { name: 'reverseLayout', type: 'boolean', label: 'Reverse Layout', group: 'Behavior' },
  ],
  LazyRow: [
    { name: 'padding', type: 'number', label: 'Padding (dp)', placeholder: '8', group: 'Layout' },
    { name: 'backgroundColor', type: 'color', label: 'Background Color', group: 'Appearance' },
    { name: 'width', type: 'number', label: 'Width (dp)', placeholder: '300', group: 'Layout' },
    { name: 'height', type: 'number', label: 'Height (dp)', placeholder: '120', group: 'Layout' },
    { name: 'horizontalArrangementSpacing', type: 'number', label: 'Item Spacing (dp)', placeholder: '0', group: 'Layout' },
    { name: 'userScrollEnabled', type: 'boolean', label: 'Enable Scrolling', group: 'Behavior' },
    { name: 'reverseLayout', type: 'boolean', label: 'Reverse Layout', group: 'Behavior' },
  ],
  LazyVerticalGrid: [
    { name: 'padding', type: 'number', label: 'Padding (dp)', placeholder: '8', group: 'Layout' },
    { name: 'backgroundColor', type: 'color', label: 'Background Color', group: 'Appearance' },
    { name: 'width', type: 'number', label: 'Width (dp)', placeholder: '300', group: 'Layout' },
    { name: 'height', type: 'number', label: 'Height (dp)', placeholder: '300', group: 'Layout' },
    { name: 'columns', type: 'number', label: 'Number of Columns', placeholder: '2', group: 'Layout' },
  ],
  LazyHorizontalGrid: [
    { name: 'padding', type: 'number', label: 'Padding (dp)', placeholder: '8', group: 'Layout' },
    { name: 'backgroundColor', type: 'color', label: 'Background Color', group: 'Appearance' },
    { name: 'width', type: 'number', label: 'Width (dp)', placeholder: '300', group: 'Layout' },
    { name: 'height', type: 'number', label: 'Height (dp)', placeholder: '200', group: 'Layout' },
    { name: 'rows', type: 'number', label: 'Number of Rows', placeholder: '2', group: 'Layout' },
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
    // For custom components, we check if their template's root component is a container.
    // This allows custom components to act as containers if their underlying structure is a container.
    if (customTemplates) {
      const template = customTemplates.find(t => t.templateId === type);
      if (template && template.rootComponentId) {
        const rootOfTemplate = template.componentTree.find(c => c.id === template.rootComponentId);
        if (rootOfTemplate) {
          // Recursively check, but prevent infinite loop for simple cases.
          // Essentially, a custom component is a container if its root is a base container type.
          return CONTAINER_TYPES.includes(rootOfTemplate.type as ComponentType);
        }
      }
    }
    return false; // Default custom components are not containers unless their root is.
  }
  return CONTAINER_TYPES.includes(type as ComponentType);
}
