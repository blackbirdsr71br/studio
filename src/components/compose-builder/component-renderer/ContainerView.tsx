
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
    isInnerDimension = false // Added flag for children where 'match_parent' might mean something different or isn't directly applicable
  ): string => {
    if (typeof dimValue === 'number') return `${dimValue}px`;
    if (dimValue === 'match_parent') return isInnerDimension ? '100%' : '100%'; // For top-level wrapper, 100% is fine.
    if (dimValue === 'wrap_content') return 'auto';
    if (typeof dimValue === 'string' && dimValue.endsWith('%')) return dimValue; // Allow percentage strings directly
    
    // Fallback for default values
    if (typeof defaultValueIfUndefined === 'number') return `${defaultValueIfUndefined}px`;
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


  if (componentId !== DEFAULT_ROOT_LAZY_COLUMN_ID && type !== 'LazyColumn' && type !== 'LazyRow' && type !== 'LazyVerticalGrid' && type !== 'LazyHorizontalGrid') {
     specificStyles.overflow = 'hidden';
  }

  switch (type) {
    case 'Card':
      specificStyles.boxShadow = `0 ${elevation}px ${elevation * 1.5}px rgba(0,0,0,0.1), 0 ${elevation/2}px ${elevation/2}px rgba(0,0,0,0.06)`;
      specificStyles.backgroundColor = containerBackgroundColor || '#FFFFFF'; 
      if (typeof borderWidth === 'number' && borderWidth > 0 && borderColor) {
        specificStyles.border = `${borderWidth}px solid ${borderColor}`;
      } else {
        specificStyles.border = componentId === DEFAULT_ROOT_LAZY_COLUMN_ID ? 'none' : '1px dashed hsl(var(--border) / 0.3)';
      }
      break;
    case 'LazyColumn':
    case 'LazyVerticalGrid': 
      flexDirection = reverseLayout ? 'column-reverse' : 'column';
      specificStyles.overflowY = properties.userScrollEnabled !== false ? 'auto' : 'hidden';
      specificStyles.minHeight = '100px'; 
      if (type === 'LazyColumn') {
        delete specificStyles.borderTopLeftRadius;
        delete specificStyles.borderTopRightRadius;
        delete specificStyles.borderBottomRightRadius;
        delete specificStyles.borderBottomLeftRadius;
      }

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
       if (type === 'LazyRow') {
        delete specificStyles.borderTopLeftRadius;
        delete specificStyles.borderTopRightRadius;
        delete specificStyles.borderBottomRightRadius;
        delete specificStyles.borderBottomLeftRadius;
      }

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
    border: componentId === DEFAULT_ROOT_LAZY_COLUMN_ID || type === 'Card' ? specificStyles.border : '1px dashed hsl(var(--border) / 0.3)',
    position: 'relative', 
    minWidth: (componentId === DEFAULT_ROOT_LAZY_COLUMN_ID || properties.width === 'match_parent' ) ? '100%' : (properties.width === 'wrap_content' ? 'auto' : '60px'),
    minHeight: (componentId === DEFAULT_ROOT_LAZY_COLUMN_ID || properties.height === 'match_parent') ? '100%' : (properties.height === 'wrap_content' ? 'auto' : '60px'),
    boxSizing: 'border-box', 
    ...specificStyles,
  };
  
  if (componentId === DEFAULT_ROOT_LAZY_COLUMN_ID) {
    baseStyle.backgroundColor = containerBackgroundColor || 'transparent'; 
    baseStyle.overflowY = 'auto'; 
    baseStyle.overflowX = 'hidden';
    baseStyle.width = '100%';
    baseStyle.height = '100%';
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
            childSpecificStyle.flexShrink = 1; // Default shrink behavior for weighted items
            childSpecificStyle.flexBasis = '0%'; // Important for weight to work correctly
             // If weight is applied, explicit width/height on the child might conflict or be ignored by flexbox.
            // Depending on desired behavior, you might want to not set width/height here if weight is active,
            // or let flexbox manage it. For Compose's Modifier.weight, width/height on the weighted item are usually ignored for that axis.
            if (flexDirection === 'row') delete childSpecificStyle.width; else delete childSpecificStyle.height;
        }
        return (
          <div key={child.id} style={childSpecificStyle} className="flex"> {/* Wrapper div for flex properties */}
            <RenderedComponentWrapper component={child} />
          </div>
        );
      })}
    </div>
  );
}
