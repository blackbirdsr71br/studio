export type ComponentType = 'Text' | 'Button' | 'Column' | 'Row' | 'Image';

export interface ComponentPropertyOption {
  label: string;
  value: string;
}
export interface ComponentProperty {
  name: string;
  type: 'string' | 'number' | 'color' | 'boolean' | 'enum';
  value: string | number | boolean;
  options?: ComponentPropertyOption[]; // For enum type
  label: string;
  placeholder?: string;
}

export interface BaseComponentProps {
  [key: string]: any; 
  text?: string;
  fontSize?: number;
  textColor?: string; // Renamed from color to avoid conflict with html color attribute
  backgroundColor?: string; 
  width?: 'wrap_content' | 'match_parent' | number; // number is dp
  height?: 'wrap_content' | 'match_parent' | number; // number is dp
  padding?: number; // All sides, in dp
  id?: string; // HTML id for DOM elements, not the component's logical id
  x?: number; // For absolute positioning on canvas
  y?: number; // For absolute positioning on canvas
  children?: string[]; // IDs of child components, only for containers
  contentDescription?: string; // For Image accessibility
  src?: string; // For Image
  "data-ai-hint"?: string; // For placeholder images
}

export interface DesignComponent {
  id: string;
  type: ComponentType;
  name: string; 
  properties: BaseComponentProps;
  parentId?: string | null; 
}

export interface DesignState {
  components: DesignComponent[];
  selectedComponentId: string | null;
  nextId: number;
}

export const getDefaultProperties = (type: ComponentType): BaseComponentProps => {
  const common = { x: 50, y: 50 };
  switch (type) {
    case 'Text':
      return { ...common, text: 'Sample Text', fontSize: 16, textColor: '#000000' };
    case 'Button':
      return { ...common, text: 'Click Me', backgroundColor: '#3F51B5', textColor: '#FFFFFF', padding: 12 };
    case 'Image':
      return { ...common, src: 'https://placehold.co/200x100.png', contentDescription: 'Placeholder Image', width: 200, height: 100, "data-ai-hint": "abstract pattern" };
    case 'Column':
      return { ...common, children: [], padding: 8, backgroundColor: 'rgba(224, 224, 224, 0.5)', width: 200, height: 200 };
    case 'Row':
      return { ...common, children: [], padding: 8, backgroundColor: 'rgba(224, 224, 224, 0.5)', width: 200, height: 100 };
    default:
      return common;
  }
};

export const getComponentDisplayName = (type: ComponentType): string => {
  switch (type) {
    case 'Text': return 'Text';
    case 'Button': return 'Button';
    case 'Column': return 'Column Layout';
    case 'Row': return 'Row Layout';
    case 'Image': return 'Image';
    default: return 'Unknown';
  }
};

export const propertyDefinitions: Record<ComponentType, Omit<ComponentProperty, 'value'>[]> = {
  Text: [
    { name: 'text', type: 'string', label: 'Text Content', placeholder: 'Enter text' },
    { name: 'fontSize', type: 'number', label: 'Font Size (sp)', placeholder: '16' },
    { name: 'textColor', type: 'color', label: 'Text Color' },
    { name: 'padding', type: 'number', label: 'Padding (dp)', placeholder: '0' },
  ],
  Button: [
    { name: 'text', type: 'string', label: 'Button Text', placeholder: 'Button' },
    { name: 'backgroundColor', type: 'color', label: 'Background Color' },
    { name: 'textColor', type: 'color', label: 'Text Color' },
    { name: 'padding', type: 'number', label: 'Padding (dp)', placeholder: '12' },
  ],
  Image: [
    { name: 'src', type: 'string', label: 'Image URL', placeholder: 'https://example.com/image.png' },
    { name: 'contentDescription', type: 'string', label: 'Content Description', placeholder: 'Image description' },
    { name: 'width', type: 'number', label: 'Width (dp)', placeholder: '100' },
    { name: 'height', type: 'number', label: 'Height (dp)', placeholder: '100' },
  ],
  Column: [
    { name: 'padding', type: 'number', label: 'Padding (dp)', placeholder: '8' },
    { name: 'backgroundColor', type: 'color', label: 'Background Color' },
    { name: 'width', type: 'number', label: 'Width (dp)', placeholder: '200' },
    { name: 'height', type: 'number', label: 'Height (dp)', placeholder: '200' },
  ],
  Row: [
    { name: 'padding', type: 'number', label: 'Padding (dp)', placeholder: '8' },
    { name: 'backgroundColor', type: 'color', label: 'Background Color' },
    { name: 'width', type: 'number', label: 'Width (dp)', placeholder: '200' },
    { name: 'height', type: 'number', label: 'Height (dp)', placeholder: '100' },
  ],
};
