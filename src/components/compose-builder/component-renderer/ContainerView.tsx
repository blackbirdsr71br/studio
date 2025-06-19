
'use client';
import type { DesignComponent } from '@/types/compose-spec';
import { RenderedComponentWrapper } from '../RenderedComponentWrapper';
import { getComponentDisplayName, DEFAULT_CONTENT_LAZY_COLUMN_ID, isCustomComponentType, ROOT_SCAFFOLD_ID, DEFAULT_TOP_APP_BAR_ID, DEFAULT_BOTTOM_NAV_BAR_ID } from '@/types/compose-spec';
import { useDesign } from '@/contexts/DesignContext';
import { getContrastingTextColor } from '@/lib/utils';
import { TextView } from './TextView'; 

interface ContainerViewProps {
  component: DesignComponent;
  childrenComponents: DesignComponent[];
  isRow: boolean; // Determines default flex-direction if not overridden by specific type
}

const isNumericValue = (value: any): boolean => { // Renamed from isNumericString for clarity
  if (value === null || value === undefined || typeof value === 'boolean') {
    return false;
  }
  if (typeof value === 'number' && !isNaN(value)) {
    return true;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    if (value === 'match_parent' || value === 'wrap_content') return false;
    return !isNaN(Number(value));
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
    padding, 
    paddingTop,
    paddingBottom,
    paddingStart,
    paddingEnd,
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
    title, 
    titleFontSize,
    fillMaxWidth, // Added to directly use this property
    fillMaxHeight // Added to directly use this property
  } = properties;

  const defaultAllSidesPadding = (componentId === DEFAULT_CONTENT_LAZY_COLUMN_ID ? 8 : (type === 'Card' ? 16 : 0));
  const effectivePaddingTop = paddingTop ?? padding ?? (type === 'TopAppBar' || type === 'BottomNavigationBar' ? 0 : defaultAllSidesPadding) ;
  let effectivePaddingBottom = paddingBottom ?? padding ?? (type === 'TopAppBar' || type === 'BottomNavigationBar' ? 0 : defaultAllSidesPadding);
  const effectivePaddingStart = paddingStart ?? padding ?? (type === 'TopAppBar' || type === 'BottomNavigationBar' ? 0 : defaultAllSidesPadding);
  const effectivePaddingEnd = paddingEnd ?? padding ?? (type === 'TopAppBar' || type === 'BottomNavigationBar' ? 0 : defaultAllSidesPadding);


  if (componentId === DEFAULT_CONTENT_LAZY_COLUMN_ID && component.parentId === ROOT_SCAFFOLD_ID) {
    effectivePaddingBottom += 60; 
  }


  const processDimension = (
    dimValue: string | number | undefined,
    defaultValueIfUndefined: string | number,
  ): string => {
    if (typeof dimValue === 'number') return `${dimValue}px`;
    if (dimValue === 'match_parent') return '100%';
    if (dimValue === 'wrap_content') return 'auto';
    if (typeof dimValue === 'string' && isNumericValue(dimValue)) return `${Number(dimValue)}px`;
    if (typeof dimValue === 'string' && dimValue.endsWith('%')) return dimValue;

    if (typeof defaultValueIfUndefined === 'number') return `${defaultValueIfUndefined}px`;
    if (defaultValueIfUndefined === 'match_parent') return '100%';
    if (defaultValueIfUndefined === 'wrap_content') return 'auto';
    return defaultValueIfUndefined.toString();
  };


  let defaultWidth: string | number = 'wrap_content';
  let defaultHeight: string | number = 'wrap_content';

  if (componentId === DEFAULT_TOP_APP_BAR_ID || type === 'TopAppBar') {
    defaultWidth = 'match_parent';
    defaultHeight = properties.height || 30; 
  } else if (type === 'BottomNavigationBar') {
    defaultWidth = 'match_parent';
    defaultHeight = properties.height || 48;
  } else if (componentId === DEFAULT_CONTENT_LAZY_COLUMN_ID || type === 'LazyColumn' || type === 'LazyVerticalGrid') {
    defaultWidth = 'match_parent';
    defaultHeight = (componentId === DEFAULT_CONTENT_LAZY_COLUMN_ID || type === 'LazyColumn') ? 'match_parent' : 300;
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

  let styleWidth = processDimension(properties.width, defaultWidth);
  let styleHeight = processDimension(properties.height, defaultHeight);

  if (fillMaxWidth) {
    styleWidth = '100%';
  }
  if (fillMaxHeight) {
    styleHeight = '100%';
  }

  let finalFlexDirection: 'row' | 'column' = isRow ? 'row' : 'column';
  if (reverseLayout) {
    finalFlexDirection = isRow ? 'row-reverse' : 'column-reverse';
  }

  // Base styles for the container itself
  const baseStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: finalFlexDirection,
    paddingTop: `${effectivePaddingTop}px`,
    paddingBottom: `${effectivePaddingBottom}px`,
    paddingLeft: `${effectivePaddingStart}px`,
    paddingRight: `${effectivePaddingEnd}px`,
    width: styleWidth,
    height: styleHeight,
    borderTopLeftRadius: `${cornerRadiusTopLeft}px`,
    borderTopRightRadius: `${cornerRadiusTopRight}px`,
    borderBottomRightRadius: `${cornerRadiusBottomRight}px`,
    borderBottomLeftRadius: `${cornerRadiusBottomLeft}px`,
    gap: `${itemSpacing}px`,
    boxSizing: 'border-box',
    position: 'relative', // For placeholder positioning
    border: (componentId === DEFAULT_CONTENT_LAZY_COLUMN_ID || type.startsWith('Lazy') || type === 'Card' || type === 'TopAppBar' || type === 'BottomNavigationBar') ? 'none' : '1px dashed hsl(var(--border) / 0.3)',
    minWidth: (componentId === DEFAULT_CONTENT_LAZY_COLUMN_ID || properties.width === 'match_parent' || fillMaxWidth ) ? '100%' : (properties.width === 'wrap_content' || !isNumericValue(properties.width) ? 'auto' : '60px'),
    minHeight: (componentId === DEFAULT_CONTENT_LAZY_COLUMN_ID || properties.height === 'match_parent' || fillMaxHeight || type === 'TopAppBar' || type === 'BottomNavigationBar') ? styleHeight : (properties.height === 'wrap_content' || !isNumericValue(properties.height) ? 'auto' : '60px'),
  };

  if (componentId !== DEFAULT_CONTENT_LAZY_COLUMN_ID &&
      (cornerRadiusTopLeft > 0 || cornerRadiusTopRight > 0 || cornerRadiusBottomLeft > 0 || cornerRadiusBottomRight > 0)) {
    baseStyle.overflow = 'hidden'; // Apply overflow hidden to the container itself for rounded corners
  }

  if (explicitContentColor && typeof explicitContentColor === 'string' && explicitContentColor.trim() !== '') {
    (baseStyle as any)['--effective-foreground-color'] = explicitContentColor;
     baseStyle.color = explicitContentColor; // Directly set color for text within this container if contentColor is specified
  } else if (containerBackgroundColor && typeof containerBackgroundColor === 'string' && containerBackgroundColor !== 'transparent') {
    const contrastingColor = getContrastingTextColor(containerBackgroundColor);
    (baseStyle as any)['--effective-foreground-color'] = contrastingColor;
    baseStyle.color = contrastingColor;
  } else {
    if (type === 'TopAppBar' || type === 'BottomNavigationBar') {
      (baseStyle as any)['--effective-foreground-color'] = 'hsl(var(--foreground))';
      baseStyle.color = 'hsl(var(--foreground))';
    }
  }
  baseStyle.backgroundColor = containerBackgroundColor || 'transparent';


  // Flex alignment and arrangement properties
  switch (type) {
    case 'Card':
      baseStyle.boxShadow = `0 ${elevation}px ${elevation * 1.5}px rgba(0,0,0,0.1), 0 ${elevation/2}px ${elevation/2}px rgba(0,0,0,0.06)`;
      if (typeof borderWidth === 'number' && borderWidth > 0 && borderColor) {
        baseStyle.border = `${borderWidth}px solid ${borderColor}`;
      } else if (!baseStyle.border || baseStyle.border === 'none') { // Only set default if no border already from above
         baseStyle.border = '1px solid hsl(var(--border) / 0.5)';
      }
      // Card behaves like a Column for its children by default
      baseStyle.flexDirection = reverseLayout ? 'column-reverse' : 'column';
      switch (properties.verticalArrangement) {
        case 'Top': baseStyle.justifyContent = reverseLayout ? 'flex-end' : 'flex-start'; break;
        case 'Bottom': baseStyle.justifyContent = reverseLayout ? 'flex-start' : 'flex-end'; break;
        case 'Center': baseStyle.justifyContent = 'center'; break;
        case 'SpaceAround': baseStyle.justifyContent = 'space-around'; break;
        case 'SpaceBetween': baseStyle.justifyContent = 'space-between'; break;
        case 'SpaceEvenly': baseStyle.justifyContent = 'space-evenly'; break;
        default: baseStyle.justifyContent = reverseLayout ? 'flex-end' : 'flex-start';
      }
      switch (properties.horizontalAlignment) {
        case 'Start': baseStyle.alignItems = 'flex-start'; break;
        case 'CenterHorizontally': baseStyle.alignItems = 'center'; break;
        case 'End': baseStyle.alignItems = 'flex-end'; break;
        default: baseStyle.alignItems = 'stretch'; // Stretch by default for card children
      }
      break;
    case 'LazyColumn':
    case 'LazyVerticalGrid':
    case 'Column': 
      baseStyle.flexDirection = reverseLayout ? 'column-reverse' : 'column';
      if (componentId !== DEFAULT_CONTENT_LAZY_COLUMN_ID && (type === 'LazyColumn' || type === 'LazyVerticalGrid')) {
          baseStyle.overflowY = properties.userScrollEnabled !== false ? 'auto' : 'hidden';
      }
      baseStyle.minHeight = (type === 'LazyColumn' || type === 'LazyVerticalGrid') ? (properties.height && isNumericValue(properties.height) ? `${properties.height}px` : '100px') : baseStyle.minHeight;
      switch (properties.verticalArrangement) {
        case 'Top': baseStyle.justifyContent = reverseLayout ? 'flex-end' : 'flex-start'; break;
        case 'Bottom': baseStyle.justifyContent = reverseLayout ? 'flex-start' : 'flex-end'; break;
        case 'Center': baseStyle.justifyContent = 'center'; break;
        case 'SpaceAround': baseStyle.justifyContent = 'space-around'; break;
        case 'SpaceBetween': baseStyle.justifyContent = 'space-between'; break;
        case 'SpaceEvenly': baseStyle.justifyContent = 'space-evenly'; break;
        default: baseStyle.justifyContent = reverseLayout ? 'flex-end' : 'flex-start';
      }
      switch (properties.horizontalAlignment) { // Cross-axis alignment for Column
        case 'Start': baseStyle.alignItems = 'flex-start'; break;
        case 'CenterHorizontally': baseStyle.alignItems = 'center'; break;
        case 'End': baseStyle.alignItems = 'flex-end'; break;
        default: baseStyle.alignItems = 'stretch'; // Default for Column children
      }
      if (type === 'LazyVerticalGrid') {
        baseStyle.flexDirection = 'row'; // Grid items form rows
        baseStyle.flexWrap = 'wrap';    // Then wrap to new rows
        // justifyContent and alignItems for grid would be complex, often managed by grid layout itself
        // For flex fallback, these might affect row/column alignment if grid not full
      }
      break;
    case 'LazyRow':
    case 'LazyHorizontalGrid':
    case 'Row':
      baseStyle.flexDirection = reverseLayout ? 'row-reverse' : 'row';
      if (type === 'LazyRow' || type === 'LazyHorizontalGrid') {
        baseStyle.overflowX = properties.userScrollEnabled !== false ? 'auto' : 'hidden';
        baseStyle.flexWrap = 'nowrap';
         baseStyle.minHeight = properties.height ? undefined : '80px'; 
      } else { // Regular Row
        baseStyle.flexWrap = 'wrap'; // Rows typically wrap
      }
      switch (properties.horizontalArrangement) { // Main-axis arrangement for Row
        case 'Start': baseStyle.justifyContent = reverseLayout ? 'flex-end' : 'flex-start'; break;
        case 'End': baseStyle.justifyContent = reverseLayout ? 'flex-start' : 'flex-end'; break;
        case 'Center': baseStyle.justifyContent = 'center'; break;
        case 'SpaceAround': baseStyle.justifyContent = 'space-around'; break;
        case 'SpaceBetween': baseStyle.justifyContent = 'space-between'; break;
        case 'SpaceEvenly': baseStyle.justifyContent = 'space-evenly'; break;
        default: baseStyle.justifyContent = reverseLayout ? 'flex-end' : 'flex-start';
      }
      switch (properties.verticalAlignment) { // Cross-axis alignment for Row
        case 'Top': baseStyle.alignItems = 'flex-start'; break;
        case 'CenterVertically': baseStyle.alignItems = 'center'; break;
        case 'Bottom': baseStyle.alignItems = 'flex-end'; break;
        default: baseStyle.alignItems = 'stretch'; // Default for Row children
      }
       if (type === 'LazyHorizontalGrid') {
        baseStyle.flexDirection = 'column'; // Grid items form columns
        baseStyle.flexWrap = 'wrap';   // Then wrap to new columns
        baseStyle.height = styleHeight;
        baseStyle.minHeight = properties.height ? undefined : '150px';
      }
      break;
    case 'Box':
      // Box typically uses contentAlignment from properties to align children if they overlay.
      // If used as a simple flex container:
      switch (properties.contentAlignment) { // Assuming maps to justify-content and align-items for center
        case 'TopStart': baseStyle.justifyContent = 'flex-start'; baseStyle.alignItems = 'flex-start'; break;
        case 'TopCenter': baseStyle.justifyContent = 'flex-start'; baseStyle.alignItems = 'center'; break;
        case 'TopEnd': baseStyle.justifyContent = 'flex-start'; baseStyle.alignItems = 'flex-end'; break;
        case 'CenterStart': baseStyle.justifyContent = 'center'; baseStyle.alignItems = 'flex-start'; break;
        case 'Center': baseStyle.justifyContent = 'center'; baseStyle.alignItems = 'center'; break;
        case 'CenterEnd': baseStyle.justifyContent = 'center'; baseStyle.alignItems = 'flex-end'; break;
        case 'BottomStart': baseStyle.justifyContent = 'flex-end'; baseStyle.alignItems = 'flex-start'; break;
        case 'BottomCenter': baseStyle.justifyContent = 'flex-end'; baseStyle.alignItems = 'center'; break;
        case 'BottomEnd': baseStyle.justifyContent = 'flex-end'; baseStyle.alignItems = 'flex-end'; break;
        default: baseStyle.justifyContent = 'flex-start'; baseStyle.alignItems = 'flex-start';
      }
      break;
    case 'TopAppBar':
    case 'BottomNavigationBar':
      baseStyle.flexDirection = 'row';
      baseStyle.flexWrap = 'nowrap';
      baseStyle.alignItems = properties.verticalAlignment ? (properties.verticalAlignment.toLowerCase().includes('center') ? 'center' : properties.verticalAlignment.toLowerCase() as any) : 'center';
      baseStyle.justifyContent = properties.horizontalArrangement ? properties.horizontalArrangement.toLowerCase().replace('space', 'space-') as any : (type === 'TopAppBar' ? 'flex-start' : 'space-around');
      break;
    default: 
      if (isCustomComponentType(type)) {
          const template = customComponentTemplates.find(t => t.templateId === type);
          const rootTemplateComp = template?.componentTree.find(c => c.id === template.rootComponentId);
          const isTemplateRootRowLike = rootTemplateComp ? ['Row', 'LazyRow', 'LazyHorizontalGrid', 'TopAppBar', 'BottomNavigationBar'].includes(rootTemplateComp.type) : isRow;

          if (!isTemplateRootRowLike) { // Column-like custom component
              baseStyle.flexDirection = reverseLayout ? 'column-reverse' : 'column';
              switch (properties.verticalArrangement) { /* main axis */
                  case 'Top': baseStyle.justifyContent = reverseLayout ? 'flex-end' : 'flex-start'; break;
                  // ... other cases for verticalArrangement
                  default: baseStyle.justifyContent = reverseLayout ? 'flex-end' : 'flex-start';
              }
              switch (properties.horizontalAlignment) { /* cross axis */
                  case 'Start': baseStyle.alignItems = 'flex-start'; break;
                  // ... other cases for horizontalAlignment
                  default: baseStyle.alignItems = 'stretch';
              }
          } else { // Row-like custom component
              baseStyle.flexDirection = reverseLayout ? 'row-reverse' : 'row';
              switch (properties.horizontalArrangement) { /* main axis */
                  case 'Start': baseStyle.justifyContent = reverseLayout ? 'flex-end' : 'flex-start'; break;
                  // ... other cases for horizontalArrangement
                  default: baseStyle.justifyContent = reverseLayout ? 'flex-end' : 'flex-start';
              }
              switch (properties.verticalAlignment) { /* cross axis */
                  case 'Top': baseStyle.alignItems = 'flex-start'; break;
                  // ... other cases for verticalAlignment
                  default: baseStyle.alignItems = 'stretch';
              }
          }
      }
      break;
  }
  
  if (componentId === DEFAULT_CONTENT_LAZY_COLUMN_ID) {
    baseStyle.backgroundColor = containerBackgroundColor || 'transparent'; 
    baseStyle.width = '100%'; 
    baseStyle.height = '100%'; 
    delete baseStyle.overflow; 
    delete baseStyle.overflowY; 
    baseStyle.alignItems = properties.horizontalAlignment === 'Start' ? 'flex-start' : properties.horizontalAlignment === 'CenterHorizontally' ? 'center' : properties.horizontalAlignment === 'End' ? 'flex-end' : 'stretch'; // Default for content children
  }

  const showPlaceholder = (componentId === DEFAULT_TOP_APP_BAR_ID && !title && childrenComponents.length === 0) ||
                        (componentId === DEFAULT_BOTTOM_NAV_BAR_ID && childrenComponents.length === 0) ||
                        (componentId === DEFAULT_CONTENT_LAZY_COLUMN_ID && childrenComponents.length === 0) ||
                        (![DEFAULT_CONTENT_LAZY_COLUMN_ID, DEFAULT_TOP_APP_BAR_ID, DEFAULT_BOTTOM_NAV_BAR_ID].includes(componentId) && childrenComponents.length === 0 && type !== 'Box');

  const placeholderText = `Drop components into this ${getComponentDisplayName(type, customComponentTemplates.find(t => t.templateId === type)?.name)}`;


  const topAppBarTitleElement = type === 'TopAppBar' && title ? (
    <div style={{ flexShrink: 0, marginRight: (childrenComponents.length > 0 ? (itemSpacing || 8) : 0) + 'px' }} className="top-app-bar-title-container">
      <TextView properties={{ text: title, fontSize: titleFontSize || 20, textColor: baseStyle.color as string }} />
    </div>
  ) : null;

  return (
    <div style={baseStyle} className="select-none component-container" data-container-id={component.id} data-container-type={type}>
      {showPlaceholder && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground/70 text-xs pointer-events-none p-2 text-center leading-tight">
          {placeholderText}
          {(type === 'LazyVerticalGrid' && properties.columns) && <span className="mt-1 text-xxs opacity-70">({properties.columns} columns)</span>}
          {(type === 'LazyHorizontalGrid' && properties.rows) && <span className="mt-1 text-xxs opacity-70">({properties.rows} rows)</span>}
        </div>
      )}
      {topAppBarTitleElement}
      {childrenComponents.map(child => (
        <RenderedComponentWrapper key={child.id} component={child} />
      ))}
    </div>
  );
}

