
'use client';
import type { DesignComponent, ComponentType as OriginalComponentType } from '@/types/compose-spec';
import { RenderedComponentWrapper } from '../RenderedComponentWrapper';
import { getComponentDisplayName, DEFAULT_CONTENT_LAZY_COLUMN_ID, isCustomComponentType, ROOT_SCAFFOLD_ID, DEFAULT_TOP_APP_BAR_ID, DEFAULT_BOTTOM_NAV_BAR_ID } from '@/types/compose-spec';
import { useDesign } from '@/contexts/DesignContext';
import { getContrastingTextColor } from '@/lib/utils';
import { TextView } from './TextView'; 

interface ContainerViewProps {
  component: DesignComponent;
  childrenComponents: DesignComponent[];
  isRow: boolean; // Determines default flex-direction if not overridden by specific type (still useful for top-level RenderedComponentWrapper decisions)
}

const isNumericValue = (value: any): boolean => {
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


export function ContainerView({ component, childrenComponents, isRow: isRowPropHint }: ContainerViewProps) {
  const { customComponentTemplates } = useDesign();

  let effectiveType: OriginalComponentType | string = component.type;
  let basePropertiesFromTemplateRoot: DesignComponent['properties'] = {};

  if (isCustomComponentType(component.type)) {
    const template = customComponentTemplates.find(t => t.templateId === component.type);
    if (template) {
      const rootTemplateComponent = template.componentTree.find(c => c.id === template.rootComponentId);
      if (rootTemplateComponent) {
        effectiveType = rootTemplateComponent.type;
        basePropertiesFromTemplateRoot = { ...rootTemplateComponent.properties };
      }
    }
  }
  
  // Merge template root properties with instance properties, instance overrides.
  // Children from the instance (component.properties.children) should generally be used if available,
  // as they represent the current children being passed for rendering, not template's internal structure.
  const effectiveProperties = { 
    ...basePropertiesFromTemplateRoot, 
    ...component.properties 
  };


  const defaultRadiusForType = (currentType: OriginalComponentType | string) => {
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
    elevation = (effectiveType === 'Card' ? 2 : 0),
    cornerRadiusTopLeft = defaultRadiusForType(effectiveType),
    cornerRadiusTopRight = defaultRadiusForType(effectiveType),
    cornerRadiusBottomRight = defaultRadiusForType(effectiveType),
    cornerRadiusBottomLeft = defaultRadiusForType(effectiveType),
    itemSpacing = 0,
    reverseLayout = false,
    backgroundColor: containerBackgroundColor,
    contentColor: explicitContentColor,
    borderWidth,
    borderColor,
    title, 
    titleFontSize,
    fillMaxWidth, 
    fillMaxHeight 
  } = effectiveProperties;

  const defaultAllSidesPadding = (component.id === DEFAULT_CONTENT_LAZY_COLUMN_ID ? 8 : (effectiveType === 'Card' ? 16 : 0));
  const effectivePaddingTop = paddingTop ?? padding ?? (effectiveType === 'TopAppBar' || effectiveType === 'BottomNavigationBar' ? 0 : defaultAllSidesPadding) ;
  let effectivePaddingBottom = paddingBottom ?? padding ?? (effectiveType === 'TopAppBar' || effectiveType === 'BottomNavigationBar' ? 0 : defaultAllSidesPadding);
  const effectivePaddingStart = paddingStart ?? padding ?? (effectiveType === 'TopAppBar' || effectiveType === 'BottomNavigationBar' ? 0 : defaultAllSidesPadding);
  const effectivePaddingEnd = paddingEnd ?? padding ?? (effectiveType === 'TopAppBar' || effectiveType === 'BottomNavigationBar' ? 0 : defaultAllSidesPadding);


  if (component.id === DEFAULT_CONTENT_LAZY_COLUMN_ID && component.parentId === ROOT_SCAFFOLD_ID) {
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

  if (component.id === DEFAULT_TOP_APP_BAR_ID || effectiveType === 'TopAppBar') {
    defaultWidth = 'match_parent';
    defaultHeight = effectiveProperties.height || 56; 
  } else if (effectiveType === 'BottomNavigationBar') {
    defaultWidth = 'match_parent';
    defaultHeight = effectiveProperties.height || 56;
  } else if (component.id === DEFAULT_CONTENT_LAZY_COLUMN_ID || effectiveType === 'LazyColumn' || effectiveType === 'LazyVerticalGrid') {
    defaultWidth = 'match_parent';
    defaultHeight = (component.id === DEFAULT_CONTENT_LAZY_COLUMN_ID || effectiveType === 'LazyColumn') ? 'match_parent' : 300;
  } else if (effectiveType === 'LazyRow' || effectiveType === 'LazyHorizontalGrid') {
    defaultWidth = 'match_parent';
    defaultHeight = effectiveType === 'LazyRow' ? 120 : 200;
  } else if (effectiveType === 'Card') {
    defaultWidth = 200;
    defaultHeight = 150;
  } else if (effectiveType === 'Box') {
    defaultWidth = 100;
    defaultHeight = 100;
  } else if (effectiveType === 'Column' || effectiveType === 'Row') {
    defaultWidth = 200;
    defaultHeight = (effectiveType === 'Row') ? 100 : 200;
  }


  let styleWidth = processDimension(effectiveProperties.width, defaultWidth);
  let styleHeight = processDimension(effectiveProperties.height, defaultHeight);

  if (fillMaxWidth) {
    styleWidth = '100%';
  }
  if (fillMaxHeight) {
    styleHeight = '100%';
  }

  let finalFlexDirection: 'row' | 'column';
  // Determine primary flex direction based on effectiveType, then consider isRowPropHint as a fallback
  if (effectiveType === 'Row' || effectiveType === 'LazyRow' || effectiveType === 'LazyHorizontalGrid' || effectiveType === 'TopAppBar' || effectiveType === 'BottomNavigationBar') {
    finalFlexDirection = 'row';
  } else if (effectiveType === 'Column' || effectiveType === 'LazyColumn' || effectiveType === 'LazyVerticalGrid' || effectiveType === 'Card' || effectiveType === 'Box') {
    finalFlexDirection = 'column';
  } else {
    finalFlexDirection = isRowPropHint ? 'row' : 'column'; // Fallback for unknown or generic custom types
  }

  if (reverseLayout) {
    finalFlexDirection = finalFlexDirection === 'row' ? 'row-reverse' : 'column-reverse';
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
    position: 'relative', 
    border: (component.id === DEFAULT_CONTENT_LAZY_COLUMN_ID || (effectiveType as string).startsWith('Lazy') || effectiveType === 'Card' || effectiveType === 'TopAppBar' || effectiveType === 'BottomNavigationBar') ? 'none' : '1px dashed hsl(var(--border) / 0.3)',
    minWidth: (component.id === DEFAULT_CONTENT_LAZY_COLUMN_ID || effectiveProperties.width === 'match_parent' || fillMaxWidth ) ? '100%' : (effectiveProperties.width === 'wrap_content' || !isNumericValue(effectiveProperties.width) ? 'auto' : '60px'),
    minHeight: (component.id === DEFAULT_CONTENT_LAZY_COLUMN_ID || effectiveProperties.height === 'match_parent' || fillMaxHeight || effectiveType === 'TopAppBar' || effectiveType === 'BottomNavigationBar') ? styleHeight : (effectiveProperties.height === 'wrap_content' || !isNumericValue(effectiveProperties.height) ? 'auto' : '60px'),
  };

  if (component.id !== DEFAULT_CONTENT_LAZY_COLUMN_ID &&
      (cornerRadiusTopLeft > 0 || cornerRadiusTopRight > 0 || cornerRadiusBottomLeft > 0 || cornerRadiusBottomRight > 0)) {
    baseStyle.overflow = 'hidden'; 
  }

  if (explicitContentColor && typeof explicitContentColor === 'string' && explicitContentColor.trim() !== '') {
    (baseStyle as any)['--effective-foreground-color'] = explicitContentColor;
     baseStyle.color = explicitContentColor; 
  } else if (containerBackgroundColor && typeof containerBackgroundColor === 'string' && containerBackgroundColor !== 'transparent') {
    const contrastingColor = getContrastingTextColor(containerBackgroundColor);
    (baseStyle as any)['--effective-foreground-color'] = contrastingColor;
    baseStyle.color = contrastingColor;
  } else {
    if (effectiveType === 'TopAppBar' || effectiveType === 'BottomNavigationBar') {
      (baseStyle as any)['--effective-foreground-color'] = 'hsl(var(--foreground))';
      baseStyle.color = 'hsl(var(--foreground))';
    }
  }
  baseStyle.backgroundColor = containerBackgroundColor || 'transparent';

  // Flex alignment and arrangement properties based on effectiveType
  switch (effectiveType) {
    case 'Card':
      baseStyle.boxShadow = `0 ${elevation}px ${elevation * 1.5}px rgba(0,0,0,0.1), 0 ${elevation/2}px ${elevation/2}px rgba(0,0,0,0.06)`;
      if (typeof borderWidth === 'number' && borderWidth > 0 && borderColor) {
        baseStyle.border = `${borderWidth}px solid ${borderColor}`;
      } else if (!baseStyle.border || baseStyle.border === 'none') { 
         baseStyle.border = '1px solid hsl(var(--border) / 0.5)';
      }
      baseStyle.flexDirection = reverseLayout ? 'column-reverse' : 'column'; // Card is column-like
      switch (effectiveProperties.verticalArrangement) { // Main axis for Card (column)
        case 'Top': baseStyle.justifyContent = reverseLayout ? 'flex-end' : 'flex-start'; break;
        case 'Bottom': baseStyle.justifyContent = reverseLayout ? 'flex-start' : 'flex-end'; break;
        case 'Center': baseStyle.justifyContent = 'center'; break;
        case 'SpaceAround': baseStyle.justifyContent = 'space-around'; break;
        case 'SpaceBetween': baseStyle.justifyContent = 'space-between'; break;
        case 'SpaceEvenly': baseStyle.justifyContent = 'space-evenly'; break;
        default: baseStyle.justifyContent = reverseLayout ? 'flex-end' : 'flex-start';
      }
      switch (effectiveProperties.horizontalAlignment) { // Cross axis for Card (column)
        case 'Start': baseStyle.alignItems = 'flex-start'; break;
        case 'CenterHorizontally': baseStyle.alignItems = 'center'; break;
        case 'End': baseStyle.alignItems = 'flex-end'; break;
        default: baseStyle.alignItems = 'stretch'; 
      }
      break;
    case 'LazyColumn':
    case 'LazyVerticalGrid':
    case 'Column': 
      // baseStyle.flexDirection is already 'column' or 'column-reverse'
      if (component.id !== DEFAULT_CONTENT_LAZY_COLUMN_ID && (effectiveType === 'LazyColumn' || effectiveType === 'LazyVerticalGrid')) {
          baseStyle.overflowY = effectiveProperties.userScrollEnabled !== false ? 'auto' : 'hidden';
      }
      baseStyle.minHeight = (effectiveType === 'LazyColumn' || effectiveType === 'LazyVerticalGrid') ? (effectiveProperties.height && isNumericValue(effectiveProperties.height) ? `${effectiveProperties.height}px` : '100px') : baseStyle.minHeight;
      switch (effectiveProperties.verticalArrangement) { // Main axis for Column
        case 'Top': baseStyle.justifyContent = reverseLayout ? 'flex-end' : 'flex-start'; break;
        case 'Bottom': baseStyle.justifyContent = reverseLayout ? 'flex-start' : 'flex-end'; break;
        case 'Center': baseStyle.justifyContent = 'center'; break;
        case 'SpaceAround': baseStyle.justifyContent = 'space-around'; break;
        case 'SpaceBetween': baseStyle.justifyContent = 'space-between'; break;
        case 'SpaceEvenly': baseStyle.justifyContent = 'space-evenly'; break;
        default: baseStyle.justifyContent = reverseLayout ? 'flex-end' : 'flex-start';
      }
      switch (effectiveProperties.horizontalAlignment) { // Cross-axis for Column
        case 'Start': baseStyle.alignItems = 'flex-start'; break;
        case 'CenterHorizontally': baseStyle.alignItems = 'center'; break;
        case 'End': baseStyle.alignItems = 'flex-end'; break;
        default: baseStyle.alignItems = 'stretch'; 
      }
      if (effectiveType === 'LazyVerticalGrid') {
        baseStyle.flexDirection = 'row'; // Grid items form rows
        baseStyle.flexWrap = 'wrap';    
      }
      break;
    case 'LazyRow':
    case 'LazyHorizontalGrid':
    case 'Row':
      // baseStyle.flexDirection is already 'row' or 'row-reverse'
      if (effectiveType === 'LazyRow' || effectiveType === 'LazyHorizontalGrid') {
        baseStyle.overflowX = effectiveProperties.userScrollEnabled !== false ? 'auto' : 'hidden';
        baseStyle.flexWrap = 'nowrap';
         baseStyle.minHeight = effectiveProperties.height ? undefined : '80px'; 
      } else { 
        baseStyle.flexWrap = 'wrap'; 
      }
      switch (effectiveProperties.horizontalArrangement) { // Main-axis for Row
        case 'Start': baseStyle.justifyContent = reverseLayout ? 'flex-end' : 'flex-start'; break;
        case 'End': baseStyle.justifyContent = reverseLayout ? 'flex-start' : 'flex-end'; break;
        case 'Center': baseStyle.justifyContent = 'center'; break;
        case 'SpaceAround': baseStyle.justifyContent = 'space-around'; break;
        case 'SpaceBetween': baseStyle.justifyContent = 'space-between'; break;
        case 'SpaceEvenly': baseStyle.justifyContent = 'space-evenly'; break;
        default: baseStyle.justifyContent = reverseLayout ? 'flex-end' : 'flex-start';
      }
      switch (effectiveProperties.verticalAlignment) { // Cross-axis for Row
        case 'Top': baseStyle.alignItems = 'flex-start'; break;
        case 'CenterVertically': baseStyle.alignItems = 'center'; break;
        case 'Bottom': baseStyle.alignItems = 'flex-end'; break;
        default: baseStyle.alignItems = 'stretch'; 
      }
       if (effectiveType === 'LazyHorizontalGrid') {
        baseStyle.flexDirection = 'column'; 
        baseStyle.flexWrap = 'wrap';   
        baseStyle.height = styleHeight;
        baseStyle.minHeight = effectiveProperties.height ? undefined : '150px';
      }
      break;
    case 'Box':
      switch (effectiveProperties.contentAlignment) { 
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
      baseStyle.flexDirection = 'row'; // Already set by finalFlexDirection
      baseStyle.flexWrap = 'nowrap';
      baseStyle.alignItems = effectiveProperties.verticalAlignment ? (effectiveProperties.verticalAlignment.toLowerCase().includes('center') ? 'center' : effectiveProperties.verticalAlignment.toLowerCase() as any) : 'center';
      baseStyle.justifyContent = effectiveProperties.horizontalArrangement ? effectiveProperties.horizontalArrangement.toLowerCase().replace('space', 'space-') as any : (effectiveType === 'TopAppBar' ? 'flex-start' : 'space-around');
      break;
    // No default case needed here as `finalFlexDirection` covers the base, and specific type overrides are above.
  }
  
  if (component.id === DEFAULT_CONTENT_LAZY_COLUMN_ID) {
    baseStyle.backgroundColor = containerBackgroundColor || 'transparent'; 
    baseStyle.width = '100%'; 
    baseStyle.height = '100%'; 
    delete baseStyle.overflow; 
    delete baseStyle.overflowY; 
    baseStyle.alignItems = effectiveProperties.horizontalAlignment === 'Start' ? 'flex-start' : effectiveProperties.horizontalAlignment === 'CenterHorizontally' ? 'center' : effectiveProperties.horizontalAlignment === 'End' ? 'flex-end' : 'stretch'; 
  }

  const showPlaceholder = (component.id === DEFAULT_TOP_APP_BAR_ID && !title && childrenComponents.length === 0) ||
                        (component.id === DEFAULT_BOTTOM_NAV_BAR_ID && childrenComponents.length === 0) ||
                        (component.id === DEFAULT_CONTENT_LAZY_COLUMN_ID && childrenComponents.length === 0) ||
                        (![DEFAULT_CONTENT_LAZY_COLUMN_ID, DEFAULT_TOP_APP_BAR_ID, DEFAULT_BOTTOM_NAV_BAR_ID].includes(component.id) && childrenComponents.length === 0 && effectiveType !== 'Box');

  const placeholderText = `Drop components into this ${getComponentDisplayName(effectiveType, component.name)}`;


  const topAppBarTitleElement = effectiveType === 'TopAppBar' && title ? (
    <div style={{ flexShrink: 0, marginRight: (childrenComponents.length > 0 ? (itemSpacing || 8) : 0) + 'px' }} className="top-app-bar-title-container">
      <TextView properties={{ text: title, fontSize: titleFontSize || 20, textColor: baseStyle.color as string }} />
    </div>
  ) : null;

  return (
    <div style={baseStyle} className="select-none component-container" data-container-id={component.id} data-container-type={effectiveType}>
      {showPlaceholder && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground/70 text-xs pointer-events-none p-2 text-center leading-tight">
          {placeholderText}
          {(effectiveType === 'LazyVerticalGrid' && effectiveProperties.columns) && <span className="mt-1 text-xxs opacity-70">({effectiveProperties.columns} columns)</span>}
          {(effectiveType === 'LazyHorizontalGrid' && effectiveProperties.rows) && <span className="mt-1 text-xxs opacity-70">({effectiveProperties.rows} rows)</span>}
        </div>
      )}
      {topAppBarTitleElement}
      {childrenComponents.map(child => (
        <RenderedComponentWrapper key={child.id} component={child} />
      ))}
    </div>
  );
}
