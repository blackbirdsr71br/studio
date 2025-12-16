
'use client';
import type { DesignComponent, ComponentType as OriginalComponentType, BaseComponentProps } from '@/types/compose-spec';
import { RenderedComponentWrapper } from '../component-renderer/RenderedComponentWrapper';
import { getComponentDisplayName, DEFAULT_CONTENT_LAZY_COLUMN_ID, isCustomComponentType, ROOT_SCAFFOLD_ID, DEFAULT_TOP_APP_BAR_ID, DEFAULT_BOTTOM_NAV_BAR_ID } from '@/types/compose-spec';
import { useDesign } from '@/contexts/DesignContext';
import { getContrastingTextColor, cn } from '@/lib/utils';
import { TextView } from './TextView'; 
import { useTheme } from '@/contexts/ThemeContext';
import { ChevronDown } from 'lucide-react';

interface ContainerViewProps {
  component: DesignComponent;
  childrenComponents: DesignComponent[];
  isRow: boolean;
  isPreview?: boolean;
  getComponentByIdOverride?: (id: string) => DesignComponent | undefined;
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

export function ContainerView({ component, childrenComponents, isRow: isRowPropHint, isPreview = false, getComponentByIdOverride }: ContainerViewProps) {
  const { customComponentTemplates, getComponentById: getComponentFromContext } = useDesign();
  const getComponentById = getComponentByIdOverride || getComponentFromContext;
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
    cornerRadius,
    itemSpacing = 0,
    reverseLayout = false,
    backgroundColor: containerBackgroundColor,
    contentColor: explicitContentColor,
    borderWidth,
    borderColor,
    title, 
    titleFontSize,
    fillMaxWidth, 
    fillMaxHeight,
    dataSource,
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
  } else if (effectiveType === 'Card' || effectiveType === 'AnimatedContent' || effectiveType === 'DropdownMenu') {
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
  } else if (effectiveType === 'Column' || effectiveType === 'LazyColumn' || effectiveType === 'LazyVerticalGrid' || effectiveType === 'Card' || effectiveType === 'Box' || effectiveType === 'AnimatedContent' || effectiveType === 'DropdownMenu') {
    finalFlexDirection = 'column';
  } else {
    finalFlexDirection = isRowPropHint ? 'row' : 'column'; 
  }

  if (reverseLayout) {
    finalFlexDirection = finalFlexDirection === 'row' ? 'row-reverse' : 'column-reverse';
  }
  
  const isLazyRowType = effectiveType === 'LazyRow' || effectiveType === 'LazyHorizontalGrid';
  const isLazyColumnType = effectiveType === 'LazyColumn' || effectiveType === 'LazyVerticalGrid';

  const baseStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column', // Base container is always a column for dropdown/children layout
    paddingTop: `${effectivePaddingTop}px`,
    paddingBottom: `${effectivePaddingBottom}px`,
    paddingLeft: `${effectivePaddingStart}px`,
    paddingRight: `${effectivePaddingEnd}px`,
    width: '100%',
    height: '100%',
    boxSizing: 'border-box',
    position: 'relative', 
    border: (component.id === DEFAULT_CONTENT_LAZY_COLUMN_ID || (effectiveType as string).startsWith('Lazy') || effectiveType === 'Card' || effectiveType === 'TopAppBar' || effectiveType === 'BottomNavigationBar' || effectiveType === 'DropdownMenu') ? 'none' : '1px dashed hsl(var(--border) / 0.3)',
    minWidth: (component.id === DEFAULT_CONTENT_LAZY_COLUMN_ID || effectiveProperties.width === 'match_parent' || fillMaxWidth ) ? '100%' : (effectiveProperties.width === 'wrap_content' || !isNumericValue(effectiveProperties.width) ? 'auto' : '20px'),
    minHeight: (component.id === DEFAULT_CONTENT_LAZY_COLUMN_ID || effectiveProperties.height === 'match_parent' || fillMaxHeight || effectiveType === 'TopAppBar' || effectiveType === 'BottomNavigationBar') ? styleHeight : (effectiveProperties.height === 'wrap_content' || !isNumericValue(effectiveProperties.height) ? 'auto' : '20px'),
    overflow: (isLazyRowType || isLazyColumnType) && effectiveProperties.userScrollEnabled !== false ? 'auto' : 'hidden',
  };
  
  if (isLazyRowType) {
    baseStyle.flexDirection = 'row';
    baseStyle.flexWrap = 'nowrap';
  }

  if (cornerRadius) {
      baseStyle.borderRadius = `${cornerRadius}px`;
  }

  if (component.id !== DEFAULT_CONTENT_LAZY_COLUMN_ID && baseStyle.borderRadius) {
    if (!((isLazyRowType || isLazyColumnType) && effectiveProperties.userScrollEnabled !== false)) {
        baseStyle.overflow = 'hidden';
    }
  }
  
  if (containerBackgroundColor) {
    if (typeof containerBackgroundColor === 'object' && containerBackgroundColor.type === 'linearGradient') {
      const angle = containerBackgroundColor.angle || 0;
      const colorStops = containerBackgroundColor.colors.join(', ');
      baseStyle.background = `linear-gradient(${angle}deg, ${colorStops})`;
    } else if (typeof containerBackgroundColor === 'string') {
      baseStyle.backgroundColor = containerBackgroundColor;
    }
  } else if (['Column', 'Row', 'Box', 'Card', 'LazyColumn', 'LazyRow', 'LazyVerticalGrid', 'LazyHorizontalGrid', 'AnimatedContent'].includes(effectiveType as string)) {
    // If no background color is set, apply theme-dependent default
    baseStyle.backgroundColor = resolvedTheme === 'dark' ? 'hsl(var(--muted))' : '#F0F0F0';
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
    if (effectiveType === 'TopAppBar' || effectiveType === 'BottomNavigationBar' || effectiveType === 'DropdownMenu') {
      (baseStyle as any)['--effective-foreground-color'] = 'hsl(var(--foreground))';
      baseStyle.color = 'hsl(var(--foreground))';
    }
  }

  if (component.id === DEFAULT_CONTENT_LAZY_COLUMN_ID) {
    if (typeof containerBackgroundColor === 'string') {
        baseStyle.backgroundColor = containerBackgroundColor;
    } else {
        baseStyle.backgroundColor = 'transparent';
    }
    baseStyle.width = '100%';
    baseStyle.height = 'auto';
    baseStyle.minHeight = '100%';
    baseStyle.overflowY = 'auto'; // Always scrollable
    delete baseStyle.overflow;
  }

  const isDataBound = !!dataSource?.url;
  const showPlaceholder = !isDataBound && childrenComponents.length === 0;

  let placeholderText = `Drop components into this ${getComponentDisplayName(effectiveType as OriginalComponentType)}`;
  if (effectiveType === 'DropdownMenu') {
    placeholderText = "Drop menu items into this container";
  } else if (isDataBound) {
      placeholderText = `This ${getComponentDisplayName(effectiveType as OriginalComponentType)} is connected to a data source. Use the "Data" panel to generate children.`;
  }
  
  const topAppBarTitleElement = effectiveType === 'TopAppBar' && title ? (
    <div style={{ flexShrink: 0, marginRight: (childrenComponents.length > 0 ? (itemSpacing || 8) : 0) + 'px' }} className="top-app-bar-title-container">
      <TextView properties={{ text: title, fontSize: titleFontSize || 20, textColor: baseStyle.color as string }} />
    </div>
  ) : null;
  
  const dropdownButtonElement = effectiveType === 'DropdownMenu' ? (
    <div
      style={{
        backgroundColor: effectiveProperties.backgroundColor as string || 'hsl(var(--primary))',
        color: explicitContentColor || getContrastingTextColor(effectiveProperties.backgroundColor as string || 'hsl(var(--primary))'),
        padding: `${effectiveProperties.paddingTop ?? effectiveProperties.padding ?? 8}px ${effectiveProperties.paddingEnd ?? effectiveProperties.padding ?? 12}px ${effectiveProperties.paddingBottom ?? effectiveProperties.padding ?? 8}px ${effectiveProperties.paddingStart ?? effectiveProperties.padding ?? 12}px`,
        borderRadius: `${effectiveProperties.cornerRadius ?? 4}px`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        cursor: 'default',
        width: '100%',
        boxSizing: 'border-box'
      }}
      className="dropdown-button-anchor flex-shrink-0"
    >
      <span>{effectiveProperties.text as string || 'Menu'}</span>
      <ChevronDown size={18} />
    </div>
  ) : null;


  const containerClasses = cn(
    "select-none component-container",
    {
      'scrollbar-hidden': (baseStyle.overflow === 'auto')
    }
  );
  
  const childrenContainerStyle: React.CSSProperties = {
     display: 'flex',
     flexDirection: finalFlexDirection,
     gap: `${itemSpacing}px`,
     width: '100%',
     flexGrow: 1, // Make this container take available space
     flexWrap: (finalFlexDirection === 'row' && !isLazyRowType) ? 'wrap' : 'nowrap',
  };

  if (isLazyRowType) {
    childrenContainerStyle.flexDirection = 'row';
    childrenContainerStyle.flexWrap = 'nowrap';
  }


  // Special handling for lazy containers
  if (effectiveType === 'LazyVerticalGrid') {
    childrenContainerStyle.display = 'grid';
    childrenContainerStyle.gridTemplateColumns = `repeat(${effectiveProperties.columns || 2}, 1fr)`;
    delete childrenContainerStyle.flexDirection;
  } else if (effectiveType === 'LazyHorizontalGrid') {
     childrenContainerStyle.display = 'grid';
     childrenContainerStyle.gridTemplateRows = `repeat(${effectiveProperties.rows || 2}, 1fr)`;
     childrenContainerStyle.gridAutoFlow = 'column';
     delete childrenContainerStyle.flexDirection;
  }

  // The base container is always a column now, to stack the dropdown button and the children
  baseStyle.flexDirection = 'column';
  if (isLazyRowType) {
    baseStyle.flexDirection = 'row';
  } else if (isLazyColumnType) {
    baseStyle.flexDirection = 'column';
  }

  // The main container should have its own flex properties, independent of the children container.
  switch (effectiveType) {
    case 'Card':
    case 'AnimatedContent':
    case 'Column':
      baseStyle.justifyContent = effectiveProperties.verticalArrangement ? { 'Top': 'flex-start', 'Bottom': 'flex-end', 'Center': 'center', 'SpaceAround': 'space-around', 'SpaceBetween': 'space-between', 'SpaceEvenly': 'space-evenly' }[effectiveProperties.verticalArrangement] || 'flex-start' : 'flex-start';
      baseStyle.alignItems = effectiveProperties.horizontalAlignment ? { 'Start': 'flex-start', 'CenterHorizontally': 'center', 'End': 'flex-end' }[effectiveProperties.horizontalAlignment] || 'stretch' : 'stretch';
      break;
    case 'Row':
      baseStyle.justifyContent = effectiveProperties.horizontalArrangement ? { 'Start': 'flex-start', 'End': 'flex-end', 'Center': 'center', 'SpaceAround': 'space-around', 'SpaceBetween': 'space-between', 'SpaceEvenly': 'space-evenly' }[effectiveProperties.horizontalArrangement] || 'flex-start' : 'flex-start';
      baseStyle.alignItems = effectiveProperties.verticalAlignment ? { 'Top': 'flex-start', 'CenterVertically': 'center', 'Bottom': 'flex-end' }[effectiveProperties.verticalAlignment] || 'stretch' : 'stretch';
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
      baseStyle.alignItems = effectiveProperties.verticalAlignment === 'CenterVertically' ? 'center' : 'flex-start';
      baseStyle.justifyContent = effectiveProperties.horizontalArrangement === 'SpaceAround' ? 'space-around' : 'flex-start';
      break;
  }
  

  return (
    <div style={baseStyle} className={containerClasses} data-container-id={component.id} data-container-type={effectiveType}>
      {dropdownButtonElement}
      {topAppBarTitleElement}

      <div style={childrenContainerStyle} className="flex-grow">
        {showPlaceholder ? (
            <div className="flex-grow flex flex-col items-center justify-center text-muted-foreground/70 text-xs pointer-events-none p-2 text-center leading-tight">
              <span>{placeholderText}</span>
              {(!isDataBound && effectiveType === 'LazyVerticalGrid' && effectiveProperties.columns) && <span className="mt-1 text-xxs opacity-70">({effectiveProperties.columns} columns)</span>}
              {(!isDataBound && effectiveType === 'LazyHorizontalGrid' && effectiveProperties.rows) && <span className="mt-1 text-xxs opacity-70">({effectiveProperties.rows})</span>}
            </div>
          ) : (
             childrenComponents.map(child => (
              <RenderedComponentWrapper 
                  key={child.id} 
                  component={child} 
                  isPreview={isPreview} 
                  getComponentByIdOverride={getComponentByIdOverride}
              />
            ))
          )}
      </div>
    </div>
  );
}
