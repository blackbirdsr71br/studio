
'use client';
import type { DesignComponent } from '@/types/compose-spec';
import { RenderedComponentWrapper } from '../RenderedComponentWrapper';
import { getComponentDisplayName, DEFAULT_ROOT_LAZY_COLUMN_ID, isCustomComponentType } from '@/types/compose-spec';
import { useDesign } from '@/contexts/DesignContext';
import { getContrastingTextColor } from '@/lib/utils';

interface ContainerViewProps {
  component: DesignComponent;
  childrenComponents: DesignComponent[];
  isRow: boolean; 
}

// Helper function to check if a value is a number or a string representing a number
const isNumericString = (value: any): boolean => {
  if (value === null || value === undefined || typeof value === 'boolean') {
    return false;
  }
  if (typeof value === 'number' && !isNaN(value)) {
    return true; // It's a number
  }
  if (typeof value === 'string' && value.trim() !== '') {
    // Ensure it's not one of the keywords before attempting to parse as number
    if (value === 'match_parent' || value === 'wrap_content') return false;
    return !isNaN(Number(value)); // It's a string that can be converted to a number
  }
  return false;
};


export function ContainerView({ component, childrenComponents, isRow }: ContainerViewProps) {
  const { type, properties, id: componentId } = component;
  const { customComponentTemplates } = useDesign(); 

  const defaultRadiusForType = (currentType: DesignComponent['type']) => {
    if (currentType === 'Card') return 8;
    if (currentType === 'Box') return 4;
    return 0;
  };

  const {
    padding = (componentId === DEFAULT_ROOT_LAZY_COLUMN_ID ? 8 : 0),
    elevation = (type === 'Card' ? 2 : 0),
    cornerRadiusTopLeft = defaultRadiusForType(type),
    cornerRadiusTopRight = defaultRadiusForType(type),
    cornerRadiusBottomRight = defaultRadiusForType(type),
    cornerRadiusBottomLeft = defaultRadiusForType(type),
    itemSpacing = 0,
    reverseLayout = false,
    backgroundColor: containerBackgroundColor, 
    contentColor: explicitContentColor, 
    borderWidth, 
    borderColor, 
  } = properties;

  const processDimension = (
    dimValue: string | number | undefined,
    defaultValueIfUndefined: string | number,
    isInnerDimension = false 
  ): string => {
    if (typeof dimValue === 'number') return `${dimValue}px`;
    if (dimValue === 'match_parent') return '100%'; 
    if (dimValue === 'wrap_content') return 'auto';
    if (typeof dimValue === 'string' && isNumericString(dimValue)) return `${Number(dimValue)}px`; // Handle numeric strings
    if (typeof dimValue === 'string' && dimValue.endsWith('%')) return dimValue; 
    
    if (typeof defaultValueIfUndefined === 'number') return `${defaultValueIfUndefined}px`;
    if (defaultValueIfUndefined === 'match_parent') return '100%';
    if (defaultValueIfUndefined === 'wrap_content') return 'auto';
    return defaultValueIfUndefined.toString();
  };
  

  let defaultWidth: string | number = 'wrap_content';
  let defaultHeight: string | number = 'wrap_content';

  if (componentId === DEFAULT_ROOT_LAZY_COLUMN_ID || type === 'LazyColumn' || type === 'LazyVerticalGrid') {
    defaultWidth = 'match_parent'; 
    defaultHeight = (componentId === DEFAULT_ROOT_LAZY_COLUMN_ID || type === 'LazyColumn') ? 'match_parent' : 300;
  } else if (type === 'LazyRow' || type === 'LazyHorizontalGrid') {
    defaultWidth = 'match_parent';
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
    borderTopLeftRadius: `${cornerRadiusTopLeft}px`,
    borderTopRightRadius: `${cornerRadiusTopRight}px`,
    borderBottomRightRadius: `${cornerRadiusBottomRight}px`,
    borderBottomLeftRadius: `${cornerRadiusBottomLeft}px`,
    gap: `${itemSpacing}px`,
  };
  
  // Apply overflow: hidden if any corner radius is set, except for the root canvas
  if (componentId !== DEFAULT_ROOT_LAZY_COLUMN_ID && 
      (cornerRadiusTopLeft > 0 || cornerRadiusTopRight > 0 || cornerRadiusBottomLeft > 0 || cornerRadiusBottomRight > 0)) {
    specificStyles.overflow = 'hidden';
  }


  if (type === 'Card') {
    if (explicitContentColor && typeof explicitContentColor === 'string' && explicitContentColor.trim() !== '') {
      (specificStyles as any)['--effective-foreground-color'] = explicitContentColor;
    } else if (containerBackgroundColor && typeof containerBackgroundColor === 'string' && containerBackgroundColor !== 'transparent') {
      const contrastingColor = getContrastingTextColor(containerBackgroundColor);
      (specificStyles as any)['--effective-foreground-color'] = contrastingColor;
    }
  } else if (containerBackgroundColor && typeof containerBackgroundColor === 'string' && containerBackgroundColor !== 'transparent') {
    const contrastingColor = getContrastingTextColor(containerBackgroundColor);
    (specificStyles as any)['--effective-foreground-color'] = contrastingColor;
  }


  switch (type) {
    case 'Card':
      specificStyles.boxShadow = `0 ${elevation}px ${elevation * 1.5}px rgba(0,0,0,0.1), 0 ${elevation/2}px ${elevation/2}px rgba(0,0,0,0.06)`;
      specificStyles.backgroundColor = containerBackgroundColor || '#FFFFFF'; 
      if (typeof borderWidth === 'number' && borderWidth > 0 && borderColor) {
        specificStyles.border = `${borderWidth}px solid ${borderColor}`;
      } else {
         specificStyles.border = (componentId === DEFAULT_ROOT_LAZY_COLUMN_ID || type.startsWith('Lazy')) ? 'none' : '1px dashed hsl(var(--border) / 0.3)';
      }
      break;
    case 'LazyColumn':
    case 'LazyVerticalGrid': 
      flexDirection = reverseLayout ? 'column-reverse' : 'column';
      specificStyles.overflowY = properties.userScrollEnabled !== false ? 'auto' : 'hidden';
      specificStyles.minHeight = '100px'; 
      // For LazyColumn, radii are generally not applied to the scroll container itself unless specifically designed
      // but if they are, overflow:hidden (added above) will clip.
      
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
      // Similarly for LazyRow, radii are not typical for the scroll container itself.

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
      specificStyles.backgroundColor = containerBackgroundColor || 'transparent';
      break;
    default: 
      specificStyles.backgroundColor = containerBackgroundColor || 'transparent';
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
    padding: `${padding}px`,
    width: styleWidth,
    height: styleHeight,
    display: 'flex',
    flexDirection: flexDirection,
    border: (componentId === DEFAULT_ROOT_LAZY_COLUMN_ID || type.startsWith('Lazy') || type === 'Card') ? specificStyles.border : '1px dashed hsl(var(--border) / 0.3)',
    position: 'relative', 
    minWidth: (componentId === DEFAULT_ROOT_LAZY_COLUMN_ID || properties.width === 'match_parent' ) ? '100%' : (properties.width === 'wrap_content' || !isNumericString(properties.width) ? 'auto' : '60px'),
    minHeight: (componentId === DEFAULT_ROOT_LAZY_COLUMN_ID || properties.height === 'match_parent') ? '100%' : (properties.height === 'wrap_content' || !isNumericString(properties.height) ? 'auto' : '60px'),
    boxSizing: 'border-box', 
    ...specificStyles,
  };
  
  if (componentId === DEFAULT_ROOT_LAZY_COLUMN_ID) {
    baseStyle.backgroundColor = containerBackgroundColor || 'transparent'; 
    baseStyle.overflowY = 'auto'; 
    baseStyle.overflowX = 'hidden';
    baseStyle.width = '100%';
    baseStyle.height = '100%';
    delete baseStyle.overflow; // Ensure root canvas is scrollable and not hidden
  }

  const placeholderText = `Drop components into this ${getComponentDisplayName(type, customComponentTemplates.find(t => t.templateId === type)?.name)}`;

  const isWeightedContainer = type === 'Row' || type === 'Column';

  return (
    <div style={baseStyle} className="select-none component-container" data-container-id={component.id} data-container-type={type}>
      {childrenComponents.length === 0 && componentId !== DEFAULT_ROOT_LAZY_COLUMN_ID && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground/70 text-xs pointer-events-none p-2 text-center leading-tight">
          {placeholderText}
          {(type === 'LazyVerticalGrid' && properties.columns) && <span className="mt-1 text-xxs opacity-70">({properties.columns} columns)</span>}
          {(type === 'LazyHorizontalGrid' && properties.rows) && <span className="mt-1 text-xxs opacity-70">({properties.rows} rows)</span>}
        </div>
      )}
      {childrenComponents.map(child => {
        let childSpecificStyle: React.CSSProperties = {};
        if (isWeightedContainer && child.properties.layoutWeight && child.properties.layoutWeight > 0) {
            childSpecificStyle.flexGrow = child.properties.layoutWeight;
            childSpecificStyle.flexShrink = 1; 
            childSpecificStyle.flexBasis = '0%'; 
            if (flexDirection === 'row') {
                // If weighted in a row, width is controlled by weight, height can be set
                childSpecificStyle.width = 'auto'; // or processDimension for child.properties.width if you want to allow fixed width too
            } else { // Column
                // If weighted in a column, height is controlled by weight, width can be set
                childSpecificStyle.height = 'auto'; // or processDimension for child.properties.height
            }
        }
        return (
          <div key={child.id} style={childSpecificStyle} className="flex"> 
            <RenderedComponentWrapper component={child} />
          </div>
        );
      })}
    </div>
  );
}

