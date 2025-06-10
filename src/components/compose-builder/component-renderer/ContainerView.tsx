
'use client';
import type { DesignComponent } from '@/types/compose-spec';
import { RenderedComponentWrapper } from '../RenderedComponentWrapper';
import { getComponentDisplayName, DEFAULT_ROOT_LAZY_COLUMN_ID, isCustomComponentType } from '@/types/compose-spec';
import { useDesign } from '@/contexts/DesignContext';


interface ContainerViewProps {
  component: DesignComponent;
  childrenComponents: DesignComponent[];
  isRow: boolean; 
}

export function ContainerView({ component, childrenComponents, isRow }: ContainerViewProps) {
  const { type, properties, id: componentId } = component;
  const { customComponentTemplates } = useDesign(); // For checking root of custom component template

  const {
    padding = (componentId === DEFAULT_ROOT_LAZY_COLUMN_ID ? 8 : 0),
    elevation = (type === 'Card' ? 2 : 0),
    cornerRadius = (type === 'Card' ? 8 : (type === 'Box' ? 4 : 0)),
    itemSpacing = 0,
    reverseLayout = false,
  } = properties;

  const processDimension = (
    dimValue: string | number | undefined,
    defaultValueIfUndefined: string | number
  ): string => {
    if (typeof dimValue === 'number') return `${dimValue}px`;
    if (dimValue === 'match_parent') return '100%';
    if (dimValue === 'wrap_content') return 'auto';
    if (typeof dimValue === 'string' && dimValue.endsWith('%')) return dimValue;
    return typeof defaultValueIfUndefined === 'number' ? `${defaultValueIfUndefined}px` : defaultValueIfUndefined.toString();
  };

  let defaultWidth: string | number = 'wrap_content';
  let defaultHeight: string | number = 'wrap_content';

  if (componentId === DEFAULT_ROOT_LAZY_COLUMN_ID || type === 'LazyColumn' || type === 'LazyVerticalGrid') {
    defaultWidth = '100%'; 
    defaultHeight = (componentId === DEFAULT_ROOT_LAZY_COLUMN_ID || type === 'LazyColumn') ? '100%' : 300;
  } else if (type === 'LazyRow' || type === 'LazyHorizontalGrid') {
    defaultWidth = '100%';
    defaultHeight = type === 'LazyRow' ? 120 : 200;
  } else if (type === 'Card') {
    defaultWidth = 200;
    defaultHeight = 150;
  } else if (type === 'Box') {
    defaultWidth = 100;
    defaultHeight = 100;
  } else if (type === 'Column' || type === 'Row') {
    defaultWidth = 200; 
    defaultHeight = isRow ? 100 : 200;
  } else if (isCustomComponentType(type)) {
    const template = customComponentTemplates.find(t => t.templateId === type);
    if (template) {
        const rootTemplateComp = template.componentTree.find(c => c.id === template.rootComponentId);
        if (rootTemplateComp) {
            // Use defaults from the template's root component properties if available
            defaultWidth = rootTemplateComp.properties.width || 'wrap_content';
            defaultHeight = rootTemplateComp.properties.height || 'wrap_content';
        }
    }
  }


  const styleWidth = processDimension(properties.width, defaultWidth);
  const styleHeight = processDimension(properties.height, defaultHeight);

  let flexDirection: 'row' | 'column' = isRow ? 'row' : 'column';
  if (reverseLayout) {
    flexDirection = isRow ? 'row-reverse' : 'column-reverse';
  }

  let specificStyles: React.CSSProperties = {
    borderRadius: `${cornerRadius}px`,
    gap: `${itemSpacing}px`,
  };

  if (componentId !== DEFAULT_ROOT_LAZY_COLUMN_ID && type !== 'LazyColumn' && type !== 'LazyRow' && type !== 'LazyVerticalGrid' && type !== 'LazyHorizontalGrid') {
     specificStyles.overflow = 'hidden';
  }


  switch (type) {
    case 'Card':
      specificStyles.boxShadow = `0 ${elevation}px ${elevation * 1.5}px rgba(0,0,0,0.1), 0 ${elevation/2}px ${elevation/2}px rgba(0,0,0,0.06)`;
      specificStyles.backgroundColor = properties.backgroundColor || '#FFFFFF';
      break;
    case 'LazyColumn':
    case 'LazyVerticalGrid': 
      flexDirection = reverseLayout ? 'column-reverse' : 'column';
      specificStyles.overflowY = properties.userScrollEnabled !== false ? 'auto' : 'hidden';
      specificStyles.minHeight = '100px'; 
      if (type === 'LazyColumn') delete specificStyles.borderRadius;

      switch (properties.verticalArrangement) {
        case 'Top': specificStyles.justifyContent = reverseLayout ? 'flex-end' : 'flex-start'; break;
        case 'Bottom': specificStyles.justifyContent = reverseLayout ? 'flex-start' : 'flex-end'; break;
        case 'Center': specificStyles.justifyContent = 'center'; break;
        case 'SpaceAround': specificStyles.justifyContent = 'space-around'; break;
        case 'SpaceBetween': specificStyles.justifyContent = 'space-between'; break;
        case 'SpaceEvenly': specificStyles.justifyContent = 'space-evenly'; break;
        default: specificStyles.justifyContent = reverseLayout ? 'flex-end' : 'flex-start';
      }
      switch (properties.horizontalAlignment) {
        case 'Start': specificStyles.alignItems = 'flex-start'; break;
        case 'CenterHorizontally': specificStyles.alignItems = 'center'; break;
        case 'End': specificStyles.alignItems = 'flex-end'; break;
        default: specificStyles.alignItems = 'flex-start';
      }
      if (type === 'LazyVerticalGrid') {
        flexDirection = 'row'; 
        specificStyles.flexWrap = 'wrap';
      }
      break;
    case 'LazyRow':
    case 'LazyHorizontalGrid': 
      flexDirection = reverseLayout ? 'row-reverse' : 'row';
      specificStyles.overflowX = properties.userScrollEnabled !== false ? 'auto' : 'hidden';
      specificStyles.minHeight = '80px'; 
      if (type === 'LazyRow') delete specificStyles.borderRadius;

      switch (properties.horizontalArrangement) {
          case 'Start': specificStyles.justifyContent = reverseLayout ? 'flex-end' : 'flex-start'; break;
          case 'End': specificStyles.justifyContent = reverseLayout ? 'flex-start' : 'flex-end'; break;
          case 'Center': specificStyles.justifyContent = 'center'; break;
          case 'SpaceAround': specificStyles.justifyContent = 'space-around'; break;
          case 'SpaceBetween': specificStyles.justifyContent = 'space-between'; break;
          case 'SpaceEvenly': specificStyles.justifyContent = 'space-evenly'; break;
          default: specificStyles.justifyContent = reverseLayout ? 'flex-end' : 'flex-start';
      }
      switch (properties.verticalAlignment) {
          case 'Top': specificStyles.alignItems = 'flex-start'; break;
          case 'CenterVertically': specificStyles.alignItems = 'center'; break;
          case 'Bottom': specificStyles.alignItems = 'flex-end'; break;
          default: specificStyles.alignItems = 'flex-start';
      }
       if (type === 'LazyHorizontalGrid') {
          flexDirection = 'column'; 
          specificStyles.flexWrap = 'wrap';
          specificStyles.height = styleHeight; 
      }
      break;
    case 'Box':
      break;
    default: // Covers Column, Row, and custom components
      if (type === 'Column' || (isCustomComponentType(type) && !isRow) ) {
          switch (properties.verticalArrangement) {
            case 'Top': specificStyles.justifyContent = reverseLayout ? 'flex-end' : 'flex-start'; break;
            case 'Bottom': specificStyles.justifyContent = reverseLayout ? 'flex-start' : 'flex-end'; break;
            case 'Center': specificStyles.justifyContent = 'center'; break;
            case 'SpaceAround': specificStyles.justifyContent = 'space-around'; break;
            case 'SpaceBetween': specificStyles.justifyContent = 'space-between'; break;
            case 'SpaceEvenly': specificStyles.justifyContent = 'space-evenly'; break;
            default: specificStyles.justifyContent = reverseLayout ? 'flex-end' : 'flex-start';
          }
          switch (properties.horizontalAlignment) {
            case 'Start': specificStyles.alignItems = 'flex-start'; break;
            case 'CenterHorizontally': specificStyles.alignItems = 'center'; break;
            case 'End': specificStyles.alignItems = 'flex-end'; break;
            default: specificStyles.alignItems = 'flex-start';
          }
      } else if (type === 'Row' || (isCustomComponentType(type) && isRow)) {
          switch (properties.horizontalArrangement) {
              case 'Start': specificStyles.justifyContent = reverseLayout ? 'flex-end' : 'flex-start'; break;
              case 'End': specificStyles.justifyContent = reverseLayout ? 'flex-start' : 'flex-end'; break;
              case 'Center': specificStyles.justifyContent = 'center'; break;
              case 'SpaceAround': specificStyles.justifyContent = 'space-around'; break;
              case 'SpaceBetween': specificStyles.justifyContent = 'space-between'; break;
              case 'SpaceEvenly': specificStyles.justifyContent = 'space-evenly'; break;
              default: specificStyles.justifyContent = reverseLayout ? 'flex-end' : 'flex-start';
          }
          switch (properties.verticalAlignment) {
              case 'Top': specificStyles.alignItems = 'flex-start'; break;
              case 'CenterVertically': specificStyles.alignItems = 'center'; break;
              case 'Bottom': specificStyles.alignItems = 'flex-end'; break;
              default: specificStyles.alignItems = 'flex-start';
          }
      }
      break;
  }

  const baseStyle: React.CSSProperties = {
    backgroundColor: properties.backgroundColor || (type === 'Card' ? '#FFFFFF' : 'transparent'),
    padding: `${padding}px`,
    width: styleWidth,
    height: styleHeight,
    display: 'flex',
    flexDirection: flexDirection,
    border: componentId === DEFAULT_ROOT_LAZY_COLUMN_ID ? 'none' : '1px dashed hsl(var(--border) / 0.3)',
    position: 'relative', 
    minWidth: (componentId === DEFAULT_ROOT_LAZY_COLUMN_ID || properties.width === 'match_parent' ) ? '100%' : (properties.width === 'wrap_content' ? 'auto' : '60px'),
    minHeight: (componentId === DEFAULT_ROOT_LAZY_COLUMN_ID || properties.height === 'match_parent') ? '100%' : (properties.height === 'wrap_content' ? 'auto' : '60px'),
    boxSizing: 'border-box', 
    ...specificStyles,
  };
  
  if (componentId === DEFAULT_ROOT_LAZY_COLUMN_ID) {
    baseStyle.backgroundColor = properties.backgroundColor || 'transparent'; // Ensure root matches context
    baseStyle.overflowY = 'auto'; 
    baseStyle.overflowX = 'hidden';
  }

  const placeholderText = `Drop components into this ${getComponentDisplayName(type, customComponentTemplates.find(t => t.templateId === type)?.name)}`;

  return (
    <div style={baseStyle} className="select-none component-container" data-container-id={component.id} data-container-type={type}>
      {childrenComponents.length === 0 && componentId !== DEFAULT_ROOT_LAZY_COLUMN_ID && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground/70 text-xs pointer-events-none p-2 text-center leading-tight">
          {placeholderText}
          {(type === 'LazyVerticalGrid' && properties.columns) && <span className="mt-1 text-xxs opacity-70">({properties.columns} columns)</span>}
          {(type === 'LazyHorizontalGrid' && properties.rows) && <span className="mt-1 text-xxs opacity-70">({properties.rows} rows)</span>}
        </div>
      )}
      {childrenComponents.map(child => (
        <RenderedComponentWrapper key={child.id} component={child} />
      ))}
    </div>
  );
}


    