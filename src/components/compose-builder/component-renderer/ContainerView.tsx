
'use client';
import type { DesignComponent, ComponentType as OriginalComponentType } from '@/types/compose-spec';
import { RenderedComponentWrapper } from '../RenderedComponentWrapper';
import { getComponentDisplayName, DEFAULT_CONTENT_LAZY_COLUMN_ID, isCustomComponentType, ROOT_SCAFFOLD_ID, DEFAULT_TOP_APP_BAR_ID, DEFAULT_BOTTOM_NAV_BAR_ID } from '@/types/compose-spec';
import { useDesign } from '@/contexts/DesignContext';
import { getContrastingTextColor, cn } from '@/lib/utils';
import { TextView } from './TextView'; 
import { useTheme } from '@/contexts/ThemeContext';

interface ContainerViewProps {
  component: DesignComponent;
  childrenComponents: DesignComponent[];
  isRow: boolean;
  zoomLevel?: number;
  isPreview?: boolean;
}

const isNumericValue = (value: any): boolean => {
  if (value === null || value === undefined || typeof value === 'boolean') {
    return false;
  }
  if (typeof value === 'number' && !isNaN(value)) {
    return true;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    return !isNaN(Number(value));
  }
  return false;
};


export function ContainerView({ component, childrenComponents, isRow: isRowPropHint, zoomLevel = 1, isPreview = false }: ContainerViewProps) {
  const { customComponentTemplates } = useDesign();
  const { resolvedTheme } = useTheme();

  let effectiveType: OriginalComponentType | string = component.type;
  let basePropertiesFromTemplateRoot: DesignComponent['properties'] = {};

  if (component.templateIdRef) {
    const template = customComponentTemplates.find(t => t.templateId === component.templateIdRef);
    if (template) {
      const rootTemplateComponent = template.componentTree.find(c => c.id === template.rootComponentId);
      if (rootTemplateComponent) {
        effectiveType = rootTemplateComponent.type; 
        basePropertiesFromTemplateRoot = { ...rootTemplateComponent.properties };
      } else {
        console.warn(`Root component for template ${component.templateIdRef} not found in its tree.`);
        effectiveType = component.type; 
      }
    } else {
        console.warn(`Custom template with ID ${component.templateIdRef} not found.`);
        effectiveType = component.type;
    }
  }
  
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
  } else if (effectiveType === 'Card' || effectiveType === 'AnimatedContent') {
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
  if (effectiveType === 'Row' || effectiveType === 'LazyRow' || effectiveType === 'LazyHorizontalGrid' || effectiveType === 'TopAppBar' || effectiveType === 'BottomNavigationBar') {
    finalFlexDirection = 'row';
  } else if (effectiveType === 'Column' || effectiveType === 'LazyColumn' || effectiveType === 'LazyVerticalGrid' || effectiveType === 'Card' || effectiveType === 'Box' || effectiveType === 'AnimatedContent') {
    finalFlexDirection = 'column';
  } else {
    finalFlexDirection = isRowPropHint ? 'row' : 'column'; 
  }

  if (reverseLayout) {
    finalFlexDirection = finalFlexDirection === 'row' ? 'row-reverse' : 'column-reverse';
  }

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
    minWidth: (component.id === DEFAULT_CONTENT_LAZY_COLUMN_ID || effectiveProperties.width === 'match_parent' || fillMaxWidth ) ? '100%' : (effectiveProperties.width === 'wrap_content' || !isNumericValue(effectiveProperties.width) ? 'auto' : '20px'),
    minHeight: (component.id === DEFAULT_CONTENT_LAZY_COLUMN_ID || effectiveProperties.height === 'match_parent' || fillMaxHeight || effectiveType === 'TopAppBar' || effectiveType === 'BottomNavigationBar') ? styleHeight : (effectiveProperties.height === 'wrap_content' || !isNumericValue(effectiveProperties.height) ? 'auto' : '20px'),
  };

  if (component.id !== DEFAULT_CONTENT_LAZY_COLUMN_ID &&
      (cornerRadiusTopLeft > 0 || cornerRadiusTopRight > 0 || cornerRadiusBottomLeft > 0 || cornerRadiusBottomRight > 0)) {
    baseStyle.overflow = 'hidden'; 
  }
  
  if (containerBackgroundColor) {
    baseStyle.backgroundColor = containerBackgroundColor;
  } else if (['Column', 'Row', 'Box', 'Card', 'LazyColumn', 'LazyRow', 'LazyVerticalGrid', 'LazyHorizontalGrid', 'AnimatedContent'].includes(effectiveType as string)) {
    // If no background color is set, apply theme-dependent default
    baseStyle.backgroundColor = resolvedTheme === 'dark' ? '#FFFFFF' : '#F0F0F0';
  } else {
    baseStyle.backgroundColor = 'transparent';
  }


  if (explicitContentColor && typeof explicitContentColor === 'string' && explicitContentColor.trim() !== '') {
    (baseStyle as any)['--effective-foreground-color'] = explicitContentColor;
     baseStyle.color = explicitContentColor; 
  } else if (baseStyle.backgroundColor && typeof baseStyle.backgroundColor === 'string' && baseStyle.backgroundColor !== 'transparent') {
    const contrastingColor = getContrastingTextColor(baseStyle.backgroundColor);
    (baseStyle as any)['--effective-foreground-color'] = contrastingColor;
    baseStyle.color = contrastingColor;
  } else {
    if (effectiveType === 'TopAppBar' || effectiveType === 'BottomNavigationBar') {
      (baseStyle as any)['--effective-foreground-color'] = 'hsl(var(--foreground))';
      baseStyle.color = 'hsl(var(--foreground))';
    }
  }

  const isLazyRowType = effectiveType === 'LazyRow' || effectiveType === 'LazyHorizontalGrid';
  const isLazyColumnType = effectiveType === 'LazyColumn' || effectiveType === 'LazyVerticalGrid';

  switch (effectiveType) {
    case 'Card':
    case 'AnimatedContent':
      baseStyle.boxShadow = `0 ${elevation}px ${elevation * 1.5}px rgba(0,0,0,0.1), 0 ${elevation/2}px ${elevation/2}px rgba(0,0,0,0.06)`;
      if (typeof borderWidth === 'number' && borderWidth > 0 && borderColor) {
        baseStyle.border = `${borderWidth}px solid ${borderColor === 'transparent' ? 'transparent' : borderColor}`;
      } else if (!baseStyle.border || baseStyle.border === 'none') { 
         baseStyle.border = '1px solid hsl(var(--border) / 0.5)';
      }
      baseStyle.flexDirection = reverseLayout ? 'column-reverse' : 'column'; 
      switch (effectiveProperties.verticalArrangement) { 
        case 'Top': baseStyle.justifyContent = reverseLayout ? 'flex-end' : 'flex-start'; break;
        case 'Bottom': baseStyle.justifyContent = reverseLayout ? 'flex-start' : 'flex-end'; break;
        case 'Center': baseStyle.justifyContent = 'center'; break;
        case 'SpaceAround': baseStyle.justifyContent = 'space-around'; break;
        case 'SpaceBetween': baseStyle.justifyContent = 'space-between'; break;
        case 'SpaceEvenly': baseStyle.justifyContent = 'space-evenly'; break;
        default: baseStyle.justifyContent = reverseLayout ? 'flex-end' : 'flex-start';
      }
      switch (effectiveProperties.horizontalAlignment) { 
        case 'Start': baseStyle.alignItems = 'flex-start'; break;
        case 'CenterHorizontally': baseStyle.alignItems = 'center'; break;
        case 'End': baseStyle.alignItems = 'flex-end'; break;
        default: baseStyle.alignItems = 'stretch'; 
      }
      break;
    case 'LazyColumn':
    case 'LazyVerticalGrid':
    case 'Column': 
      if (component.id !== DEFAULT_CONTENT_LAZY_COLUMN_ID && (effectiveType === 'LazyColumn' || effectiveType === 'LazyVerticalGrid')) {
          baseStyle.overflowY = effectiveProperties.userScrollEnabled !== false ? 'auto' : 'hidden';
      }
      baseStyle.minHeight = (effectiveType === 'LazyColumn' || effectiveType === 'LazyVerticalGrid') ? (effectiveProperties.height && isNumericValue(effectiveProperties.height) ? `${effectiveProperties.height}px` : '100px') : baseStyle.minHeight;
      switch (effectiveProperties.verticalArrangement) { 
        case 'Top': baseStyle.justifyContent = reverseLayout ? 'flex-end' : 'flex-start'; break;
        case 'Bottom': baseStyle.justifyContent = reverseLayout ? 'flex-start' : 'flex-end'; break;
        case 'Center': baseStyle.justifyContent = 'center'; break;
        case 'SpaceAround': baseStyle.justifyContent = 'space-around'; break;
        case 'SpaceBetween': baseStyle.justifyContent = 'space-between'; break;
        case 'SpaceEvenly': baseStyle.justifyContent = 'space-evenly'; break;
        default: baseStyle.justifyContent = reverseLayout ? 'flex-end' : 'flex-start';
      }
      switch (effectiveProperties.horizontalAlignment) { 
        case 'Start': baseStyle.alignItems = 'flex-start'; break;
        case 'CenterHorizontally': baseStyle.alignItems = 'center'; break;
        case 'End': baseStyle.alignItems = 'flex-end'; break;
        default: baseStyle.alignItems = 'stretch'; 
      }
      if (effectiveType === 'LazyVerticalGrid') {
        baseStyle.flexDirection = 'row'; 
        baseStyle.flexWrap = 'wrap';    
      }
      break;
    case 'LazyRow':
    case 'LazyHorizontalGrid':
    case 'Row':
      if (effectiveType === 'LazyRow' || effectiveType === 'LazyHorizontalGrid') {
        baseStyle.overflowX = effectiveProperties.userScrollEnabled !== false ? 'auto' : 'hidden';
        baseStyle.flexWrap = 'nowrap';
         baseStyle.minHeight = effectiveProperties.height ? undefined : '80px'; 
      } else { 
        baseStyle.flexWrap = 'wrap'; 
      }
      switch (effectiveProperties.horizontalArrangement) { 
        case 'Start': baseStyle.justifyContent = reverseLayout ? 'flex-end' : 'flex-start'; break;
        case 'End': baseStyle.justifyContent = reverseLayout ? 'flex-start' : 'flex-end'; break;
        case 'Center': baseStyle.justifyContent = 'center'; break;
        case 'SpaceAround': baseStyle.justifyContent = 'space-around'; break;
        case 'SpaceBetween': baseStyle.justifyContent = 'space-between'; break;
        case 'SpaceEvenly': baseStyle.justifyContent = 'space-evenly'; break;
        default: baseStyle.justifyContent = reverseLayout ? 'flex-end' : 'flex-start';
      }
      switch (effectiveProperties.verticalAlignment) { 
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
      baseStyle.flexDirection = 'row'; 
      baseStyle.flexWrap = 'nowrap';
      baseStyle.alignItems = effectiveProperties.verticalAlignment ? (effectiveProperties.verticalAlignment.toLowerCase().includes('center') ? 'center' : effectiveProperties.verticalAlignment.toLowerCase() as any) : 'center';
      baseStyle.justifyContent = effectiveProperties.horizontalArrangement ? effectiveProperties.horizontalArrangement.toLowerCase().replace('space', 'space-') as any : (effectiveType === 'TopAppBar' ? 'flex-start' : 'space-around');
      break;
  }
  
  if (component.id === DEFAULT_CONTENT_LAZY_COLUMN_ID) {
    baseStyle.backgroundColor = containerBackgroundColor || 'transparent';
    baseStyle.width = '100%';
    baseStyle.height = 'auto';
    baseStyle.minHeight = '100%';
    delete baseStyle.overflow;
    delete baseStyle.overflowY;
    baseStyle.alignItems = effectiveProperties.horizontalAlignment === 'Start' ? 'flex-start' : effectiveProperties.horizontalAlignment === 'CenterHorizontally' ? 'center' : effectiveProperties.horizontalAlignment === 'End' ? 'flex-end' : 'stretch';
  }

  const showPlaceholder = (component.id === DEFAULT_TOP_APP_BAR_ID && !title && childrenComponents.length === 0) ||
                        (component.id === DEFAULT_BOTTOM_NAV_BAR_ID && childrenComponents.length === 0) ||
                        (component.id === DEFAULT_CONTENT_LAZY_COLUMN_ID && childrenComponents.length === 0) ||
                        (![DEFAULT_CONTENT_LAZY_COLUMN_ID, DEFAULT_TOP_APP_BAR_ID, DEFAULT_BOTTOM_NAV_BAR_ID].includes(component.id) && childrenComponents.length === 0 && effectiveType !== 'Box');

  const placeholderText = `Drop components into this ${getComponentDisplayName(effectiveType as OriginalComponentType)}`;


  const topAppBarTitleElement = effectiveType === 'TopAppBar' && title ? (
    <div style={{ flexShrink: 0, marginRight: (childrenComponents.length > 0 ? (itemSpacing || 8) : 0) + 'px' }} className="top-app-bar-title-container">
      <TextView properties={{ text: title, fontSize: titleFontSize || 20, textColor: baseStyle.color as string }} />
    </div>
  ) : null;
  
  const containerClasses = cn(
    "select-none component-container",
    {
      'scrollbar-hidden': (isLazyRowType && baseStyle.overflowX === 'auto') || (isLazyColumnType && baseStyle.overflowY === 'auto' && component.id !== DEFAULT_CONTENT_LAZY_COLUMN_ID)
    }
  );

  return (
    <div style={baseStyle} className={containerClasses} data-container-id={component.id} data-container-type={effectiveType}>
      {showPlaceholder && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground/70 text-xs pointer-events-none p-2 text-center leading-tight">
          {placeholderText}
          {(effectiveType === 'LazyVerticalGrid' && effectiveProperties.columns) && <span className="mt-1 text-xxs opacity-70">({effectiveProperties.columns} columns)</span>}
          {(effectiveType === 'LazyHorizontalGrid' && effectiveProperties.rows) && <span className="mt-1 text-xxs opacity-70">({effectiveProperties.rows})</span>}
        </div>
      )}
      {topAppBarTitleElement}
      {childrenComponents.map(child => (
        <RenderedComponentWrapper key={child.id} component={child} zoomLevel={zoomLevel} isPreview={isPreview} />
      ))}
    </div>
  );
}
