'use client';
import type { DesignComponent, ComponentType as OriginalComponentType, BaseComponentProps } from '@/types/compose-spec';
import { RenderedComponentWrapper } from '../component-renderer/RenderedComponentWrapper';
import { getComponentDisplayName, DEFAULT_CONTENT_LAZY_COLUMN_ID, isCustomComponentType, ROOT_SCAFFOLD_ID, DEFAULT_TOP_APP_BAR_ID, DEFAULT_BOTTOM_NAV_BAR_ID, getDefaultProperties } from '@/types/compose-spec';
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

const processDimension = (
  dimValue: string | number | undefined,
  defaultValueIfUndefined: string | number | undefined,
): string => {
  if (typeof dimValue === 'number') return `${dimValue}px`;
  if (dimValue === 'match_parent') return '100%';
  if (dimValue === 'wrap_content') return 'auto';
  if (typeof dimValue === 'string' && isNumericValue(dimValue)) return `${Number(dimValue)}px`;
  if (typeof dimValue === 'string' && dimValue.endsWith('%')) return dimValue;

  if (defaultValueIfUndefined === undefined) return 'auto';

  if (typeof defaultValueIfUndefined === 'number') return `${defaultValueIfUndefined}px`;
  if (defaultValueIfUndefined === 'match_parent') return '100%';
  if (defaultValueIfUndefined === 'wrap_content') return 'auto';
  
  return defaultValueIfUndefined.toString();
};

export function ContainerView({ component, childrenComponents, isRow: isRowPropHint, isPreview = false, getComponentByIdOverride }: ContainerViewProps) {
  const { customComponentTemplates, getComponentById: getComponentFromContext } = useDesign();
  const getComponentById = getComponentByIdOverride || getComponentFromContext;
  const { resolvedTheme } = useTheme();

  let effectiveType: OriginalComponentType | string = component.type;

  if (component.templateIdRef) {
    const template = customComponentTemplates.find(t => t.templateId === component.templateIdRef);
    if (template) {
      const rootTemplateComponent = template.componentTree.find(c => c.id === template.rootComponentId);
      if (rootTemplateComponent) {
        effectiveType = rootTemplateComponent.type; 
      } else {
        console.warn(`Root component for template ${component.templateIdRef} not found in its tree.`);
      }
    } else {
        console.warn(`Custom template with ID ${component.templateIdRef} not found.`);
    }
  }
  
  const defaultProps = getDefaultProperties(effectiveType as OriginalComponentType, component.id);
  const effectiveProperties = { ...defaultProps, ...component.properties };

  const {
    padding, 
    paddingTop,
    paddingBottom,
    paddingStart,
    paddingEnd,
    elevation,
    itemSpacing,
    reverseLayout,
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

  const defaultAllSidesPadding = 0;
  const effectivePaddingTop = paddingTop ?? padding ?? defaultAllSidesPadding ;
  let effectivePaddingBottom = paddingBottom ?? padding ?? defaultAllSidesPadding;
  const effectivePaddingStart = paddingStart ?? padding ?? defaultAllSidesPadding;
  const effectivePaddingEnd = paddingEnd ?? padding ?? defaultAllSidesPadding;


  if (component.id === DEFAULT_CONTENT_LAZY_COLUMN_ID && component.parentId === ROOT_SCAFFOLD_ID) {
    effectivePaddingBottom += 60; 
  }

  const { width: defaultWidth, height: defaultHeight } = defaultProps;

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
    border: '1px solid var(--m3-outline, hsl(var(--border) / 0.5))',
    minWidth: '20px',
    minHeight: '20px',
    boxShadow: elevation > 0 ? `0 ${elevation}px ${elevation * 2}px rgba(0,0,0,0.1)` : 'none'
  };
  
    if (typeof effectiveProperties.cornerRadius === 'number' && effectiveProperties.cornerRadius > 0) {
      baseStyle.borderRadius = `${effectiveProperties.cornerRadius}px`;
    } else if (
        typeof effectiveProperties.cornerRadiusTopLeft === 'number' ||
        typeof effectiveProperties.cornerRadiusTopRight === 'number' ||
        typeof effectiveProperties.cornerRadiusBottomLeft === 'number' ||
        typeof effectiveProperties.cornerRadiusBottomRight === 'number'
    ) {
        baseStyle.borderTopLeftRadius = `${effectiveProperties.cornerRadiusTopLeft || 0}px`;
        baseStyle.borderTopRightRadius = `${effectiveProperties.cornerRadiusTopRight || 0}px`;
        baseStyle.borderBottomLeftRadius = `${effectiveProperties.cornerRadiusBottomLeft || 0}px`;
        baseStyle.borderBottomRightRadius = `${effectiveProperties.cornerRadiusBottomRight || 0}px`;
    }

  if (isLazyRowType) {
    baseStyle.flexDirection = 'row';
    baseStyle.overflow = 'auto';
    baseStyle.flexWrap = 'nowrap';
  }

  if (isLazyColumnType && effectiveProperties.userScrollEnabled !== false) {
    baseStyle.overflowY = 'auto';
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
  } else if (['Card', 'TopAppBar', 'BottomNavigationBar'].includes(effectiveType)) {
    baseStyle.backgroundColor = 'var(--m3-surface, hsl(var(--card)))';
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
      (baseStyle as any)['--effective-foreground-color'] = 'var(--m3-on-surface, hsl(var(--card-foreground)))';
      baseStyle.color = 'var(--m3-on-surface, hsl(var(--card-foreground)))';
    }
  }

  if (component.id === DEFAULT_CONTENT_LAZY_COLUMN_ID) {
    if (typeof containerBackgroundColor === 'string') {
        baseStyle.backgroundColor = containerBackgroundColor;
    } else {
        baseStyle.backgroundColor = 'var(--m3-background, transparent)';
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
    placeholderText = "Drop components into this Dropdown Menu";
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
        backgroundColor: effectiveProperties.backgroundColor as string || 'var(--m3-primary)',
        color: explicitContentColor || 'var(--m3-on-primary)',
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
      'scrollbar-hidden': (baseStyle.overflow === 'auto' || baseStyle.overflowX === 'auto' || baseStyle.overflowY === 'auto')
    }
  );
  
  const childrenContainerStyle: React.CSSProperties = {
     display: 'flex',
     flexDirection: finalFlexDirection,
     gap: `${itemSpacing}px`,
     width: '100%',
     flexGrow: 1, // Make this container take available space
  };

  if (isLazyRowType) {
    childrenContainerStyle.flexDirection = 'row';
    childrenContainerStyle.flexWrap = 'nowrap';
  } else {
    childrenContainerStyle.flexWrap = 'wrap';
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
    childrenContainerStyle.flexDirection = 'row';
    childrenContainerStyle.flexWrap = 'nowrap';
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
  
  const placeholderStyle: React.CSSProperties = {};
  if (effectiveType === 'LazyVerticalGrid') {
    placeholderStyle.gridColumn = '1 / -1';
  }


  return (
    <div style={baseStyle} className={containerClasses} data-container-id={component.id} data-container-type={effectiveType}>
      {dropdownButtonElement && (
        <div className="flex-shrink-0">
          {dropdownButtonElement}
        </div>
      )}
      {topAppBarTitleElement}

      <div style={childrenContainerStyle} className={cn({"p-2 space-y-1": effectiveType === 'DropdownMenu'})}>
        {showPlaceholder ? (
            <div style={placeholderStyle} className="flex-grow flex flex-col items-center justify-center text-muted-foreground/70 text-xs pointer-events-none p-2 text-center leading-tight">
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
