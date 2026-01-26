
'use client';
import type { DesignComponent, ComponentType as OriginalComponentType, BaseComponentProps, CustomComponentTemplate, M3Theme } from '@/types/compose-spec';
import { RenderedComponentWrapper } from '../component-renderer/RenderedComponentWrapper';
import { getComponentDisplayName, DEFAULT_CONTENT_LAZY_COLUMN_ID, isCustomComponentType, ROOT_SCAFFOLD_ID, DEFAULT_TOP_APP_BAR_ID, DEFAULT_BOTTOM_NAV_BAR_ID, getDefaultProperties } from '@/types/compose-spec';
import { cn } from '@/lib/utils';
import { TextView } from './TextView'; 
import { useTheme } from '@/contexts/ThemeContext';
import { ChevronDown } from 'lucide-react';
import { useDesign } from '@/contexts/DesignContext';

interface ContainerViewProps {
  component: DesignComponent;
  childrenComponents: DesignComponent[];
  isRow: boolean;
  isPreview?: boolean;
  passThroughProps: {
      getComponentById: (id: string) => DesignComponent | undefined;
      customComponentTemplates: CustomComponentTemplate[];
      activeDesignId: string | null;
      zoomLevel: number;
      selectComponent: (id: string) => void;
      addComponent: (typeOrTemplateId: string, parentId: string | null, dropPosition?: { x: number; y: number }, index?: number) => void;
      moveComponent: (draggedId: string, newParentId: string | null, newIndex?: number) => void;
      updateComponent: (id: string, updates: { properties: Partial<BaseComponentProps> }) => void;
  }
}

const getThemeColorKeyForComponentBackground = (componentType: OriginalComponentType | string): keyof M3Theme['lightColors'] | null => {
    switch (componentType) {
        case 'Card':
        case 'TopAppBar':
        case 'BottomNavigationBar':
        case 'DropdownMenu':
            return 'surface';
        case 'Scaffold':
        case 'Column':
        case 'Row':
        case 'Box':
        case 'LazyColumn':
        case 'LazyRow':
        case 'LazyVerticalGrid':
        case 'LazyHorizontalGrid':
            return 'background';
    }
    return null;
}

export function ContainerView({ component, childrenComponents, isRow: isRowPropHint, isPreview = false, passThroughProps }: ContainerViewProps) {
  const { customComponentTemplates } = passThroughProps;
  const { m3Theme, activeM3ThemeScheme } = useDesign();

  let effectiveType: OriginalComponentType | string = component.type;
  if (component.templateIdRef) {
    const template = customComponentTemplates.find(t => t.templateId === component.templateIdRef);
    if (template) {
      const rootTemplateComponent = template.componentTree.find(c => c.id === template.rootComponentId);
      if (rootTemplateComponent) {
        effectiveType = rootTemplateComponent.type; 
      }
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
    backgroundColor: explicitBackgroundColor,
    contentColor: explicitContentColor,
    dataSource,
    carouselOrientation,
    carouselStyle,
    carouselContentPadding,
    title, 
    titleFontSize,
    shape,
    cornerRadius,
    cornerRadiusTopLeft,
    cornerRadiusTopRight,
    cornerRadiusBottomLeft,
    cornerRadiusBottomRight,
  } = effectiveProperties;

  const defaultAllSidesPadding = 0;
  const effectivePaddingTop = paddingTop ?? padding ?? defaultAllSidesPadding ;
  let effectivePaddingBottom = paddingBottom ?? padding ?? defaultAllSidesPadding;
  const effectivePaddingStart = paddingStart ?? padding ?? defaultAllSidesPadding;
  const effectivePaddingEnd = paddingEnd ?? defaultAllSidesPadding;


  if (component.id === DEFAULT_CONTENT_LAZY_COLUMN_ID && component.parentId === ROOT_SCAFFOLD_ID) {
    effectivePaddingBottom += 60; 
  }

  let parentIsRowLike = false;
  if(passThroughProps.getComponentById) {
      const parent = component.parentId ? passThroughProps.getComponentById(component.parentId) : null;
      if (parent) {
          let effectiveParentType = parent.type;
          if (parent.templateIdRef) {
              const template = customComponentTemplates.find(t => t.templateId === parent.templateIdRef);
              if (template) {
                  const rootOfTemplate = template.componentTree.find(c => c.id === template.rootComponentId);
                  if (rootOfTemplate) effectiveParentType = rootOfTemplate.type;
              }
          }
          parentIsRowLike = ['Row', 'LazyRow', 'LazyHorizontalGrid', 'TopAppBar', 'BottomNavigationBar', 'Carousel'].includes(effectiveParentType);
      }
  } else {
      parentIsRowLike = isRowPropHint;
  }
  
  let finalFlexDirection: 'row' | 'column';
  if (effectiveType === 'Row' || effectiveType === 'LazyRow' || effectiveType === 'LazyHorizontalGrid' || effectiveType === 'TopAppBar' || effectiveType === 'BottomNavigationBar') {
    finalFlexDirection = 'row';
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
    flexDirection: 'column', 
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
    boxShadow: elevation > 0 ? `0 ${elevation}px ${elevation * 2}px rgba(0,0,0,0.1)` : 'none',
  };

  if (component.id === DEFAULT_CONTENT_LAZY_COLUMN_ID) {
    baseStyle.flexGrow = 1;
    baseStyle.minHeight = 0;
  }
  
    if (shape === 'Rectangle') {
        baseStyle.borderRadius = '0px';
    } else if (shape === 'Circle') {
        baseStyle.borderRadius = '50%';
        baseStyle.aspectRatio = '1 / 1';
    } else { // RoundedCorner or undefined
        if (typeof cornerRadius === 'number' && cornerRadius > 0) {
            baseStyle.borderRadius = `${cornerRadius}px`;
        } else if (
            typeof cornerRadiusTopLeft === 'number' ||
            typeof cornerRadiusTopRight === 'number' ||
            typeof cornerRadiusBottomLeft === 'number' ||
            typeof cornerRadiusBottomRight === 'number'
        ) {
            baseStyle.borderTopLeftRadius = `${cornerRadiusTopLeft || 0}px`;
            baseStyle.borderTopRightRadius = `${cornerRadiusTopRight || 0}px`;
            baseStyle.borderBottomLeftRadius = `${cornerRadiusBottomLeft || 0}px`;
            baseStyle.borderBottomRightRadius = `${cornerRadiusBottomRight || 0}px`;
        }
    }
  
  if (explicitBackgroundColor) {
    if (typeof explicitBackgroundColor === 'object' && explicitBackgroundColor.type === 'linearGradient') {
      const angle = explicitBackgroundColor.angle || 0;
      const colorStops = explicitBackgroundColor.colors.join(', ');
      baseStyle.background = `linear-gradient(${angle}deg, ${colorStops})`;
    } else if (typeof explicitBackgroundColor === 'string') {
      baseStyle.backgroundColor = explicitBackgroundColor;
    }
  } else {
    const themeColorKey = getThemeColorKeyForComponentBackground(effectiveType);
    if (themeColorKey && m3Theme) {
        const currentColorScheme = activeM3ThemeScheme === 'dark' ? m3Theme.darkColors : m3Theme.lightColors;
        baseStyle.backgroundColor = currentColorScheme[themeColorKey];
    }
  }
  
  baseStyle.color = explicitContentColor || 'var(--m3-on-surface)';

  if (component.id === DEFAULT_CONTENT_LAZY_COLUMN_ID) {
      baseStyle.width = '100%';
      baseStyle.height = 'auto';
      baseStyle.minHeight = '100%';
      baseStyle.overflow = 'visible'; // Let the parent scroll
  }

  const isDataBound = !!dataSource?.url;
  const showPlaceholder = !isDataBound && childrenComponents.length === 0;

  let placeholderText = `Drop components into this ${getComponentDisplayName(effectiveType as OriginalComponentType)}`;
  if (effectiveType === 'DropdownMenu') {
    placeholderText = "Drop components into this Dropdown Menu";
  } else if (isDataBound) {
      placeholderText = `This ${getComponentDisplayName(effectiveType as OriginalComponentType)} is connected to a data source. Use the "Data" panel to generate children.`;
  }
  
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
  
  const childrenContainerStyle: React.CSSProperties = {
     display: 'flex',
     flexDirection: finalFlexDirection,
     gap: `${itemSpacing}px`,
     width: '100%',
     flexGrow: 1, 
  };
  
  const scrollContainerStyle: React.CSSProperties = {
      flexGrow: 1,
      minHeight: 0,
      minWidth: 0,
      display: 'flex',
      flexDirection: 'column',
  };


  if (isLazyRowType || isLazyColumnType || (effectiveType === 'Carousel' && carouselStyle === 'Pager')) {
    scrollContainerStyle.overflow = 'auto';
    if(isLazyRowType) {
        childrenContainerStyle.height = '100%';
        childrenContainerStyle.width = 'auto';
    }
  }


  if (isLazyRowType) {
    childrenContainerStyle.flexDirection = 'row';
    childrenContainerStyle.flexWrap = 'nowrap';
  } else {
    childrenContainerStyle.flexWrap = 'wrap';
  }

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
   if (effectiveType === 'Carousel') {
    if (carouselStyle === 'Pager') {
        scrollContainerStyle.overflowX = carouselOrientation === 'Horizontal' ? 'auto' : 'hidden';
        scrollContainerStyle.overflowY = carouselOrientation === 'Vertical' ? 'auto' : 'hidden';
        scrollContainerStyle.scrollSnapType = carouselOrientation === 'Horizontal' ? 'x mandatory' : 'y mandatory';
        childrenContainerStyle.flexDirection = carouselOrientation === 'Horizontal' ? 'row' : 'column';
        childrenContainerStyle.flexWrap = 'nowrap';
        childrenContainerStyle.paddingLeft = `${carouselContentPadding}px`;
        childrenContainerStyle.paddingRight = `${carouselContentPadding}px`;
    } else { // MultiBrowse
        scrollContainerStyle.overflowX = 'auto';
        scrollContainerStyle.overflowY = 'hidden';
        childrenContainerStyle.flexDirection = 'row';
        childrenContainerStyle.flexWrap = 'nowrap';
    }
  }

  baseStyle.flexDirection = 'column';
  
  switch (effectiveType) {
    case 'Card':
    case 'AnimatedContent':
    case 'Column':
      childrenContainerStyle.justifyContent = effectiveProperties.verticalArrangement ? { 'Top': 'flex-start', 'Bottom': 'flex-end', 'Center': 'center', 'SpaceAround': 'space-around', 'SpaceBetween': 'space-between', 'SpaceEvenly': 'space-evenly' }[effectiveProperties.verticalArrangement] || 'flex-start' : 'flex-start';
      childrenContainerStyle.alignItems = effectiveProperties.horizontalAlignment ? { 'Start': 'flex-start', 'CenterHorizontally': 'center', 'End': 'flex-end' }[effectiveProperties.horizontalAlignment] || 'flex-start' : 'flex-start';
      break;
    case 'Row':
      childrenContainerStyle.justifyContent = effectiveProperties.horizontalArrangement ? { 'Start': 'flex-start', 'End': 'flex-end', 'Center': 'center', 'SpaceAround': 'space-around', 'SpaceBetween': 'space-between', 'SpaceEvenly': 'space-evenly' }[effectiveProperties.horizontalArrangement] || 'flex-start' : 'flex-start';
      childrenContainerStyle.alignItems = effectiveProperties.verticalAlignment ? { 'Top': 'flex-start', 'CenterVertically': 'center', 'Bottom': 'flex-end' }[effectiveProperties.verticalAlignment] || 'flex-start' : 'flex-start';
      break;
    case 'Box':
       // For Box, alignment is about placing a single item (or overlapping items), not a flow.
       // We keep the original logic here as it's more about justification within the box area.
       switch (effectiveProperties.contentAlignment) { 
        case 'TopStart': childrenContainerStyle.justifyContent = 'flex-start'; childrenContainerStyle.alignItems = 'flex-start'; break;
        case 'TopCenter': childrenContainerStyle.justifyContent = 'flex-start'; childrenContainerStyle.alignItems = 'center'; break;
        case 'TopEnd': childrenContainerStyle.justifyContent = 'flex-start'; childrenContainerStyle.alignItems = 'flex-end'; break;
        case 'CenterStart': childrenContainerStyle.justifyContent = 'center'; childrenContainerStyle.alignItems = 'flex-start'; break;
        case 'Center': childrenContainerStyle.justifyContent = 'center'; childrenContainerStyle.alignItems = 'center'; break;
        case 'CenterEnd': childrenContainerStyle.justifyContent = 'center'; childrenContainerStyle.alignItems = 'flex-end'; break;
        case 'BottomStart': childrenContainerStyle.justifyContent = 'flex-end'; childrenContainerStyle.alignItems = 'flex-start'; break;
        case 'BottomCenter': childrenContainerStyle.justifyContent = 'flex-end'; childrenContainerStyle.alignItems = 'center'; break;
        case 'BottomEnd': childrenContainerStyle.justifyContent = 'flex-end'; childrenContainerStyle.alignItems = 'flex-end'; break;
        default: childrenContainerStyle.justifyContent = 'flex-start'; childrenContainerStyle.alignItems = 'flex-start';
      }
      break;
    case 'Carousel':
        childrenContainerStyle.alignItems = effectiveProperties.verticalAlignment ? { 'Top': 'flex-start', 'CenterVertically': 'center', 'Bottom': 'flex-end' }[effectiveProperties.verticalAlignment] || 'center' : 'center';
        break;
    case 'TopAppBar':
    case 'BottomNavigationBar':
      baseStyle.flexDirection = 'row';
      baseStyle.alignItems = 'center'; // Center vertically
      childrenContainerStyle.alignItems = 'center';
      childrenContainerStyle.justifyContent = effectiveProperties.horizontalArrangement ? { 'Start': 'flex-start', 'End': 'flex-end', 'Center': 'center', 'SpaceAround': 'space-around', 'SpaceBetween': 'space-between', 'SpaceEvenly': 'space-evenly' }[effectiveProperties.horizontalArrangement] || 'flex-start' : 'flex-start';
      scrollContainerStyle.flexDirection = 'row';
      break;
  }
  
  const placeholderStyle: React.CSSProperties = {};
  if (effectiveType === 'LazyVerticalGrid') {
    placeholderStyle.gridColumn = '1 / -1';
  }

  const topAppBarTitleElement = effectiveType === 'TopAppBar' && title ? (
    <div style={{ flexShrink: 0, marginRight: 'auto' }} className="top-app-bar-title-container">
      <TextView properties={{ text: title, fontSize: titleFontSize || 20, textColor: baseStyle.color as string, padding: 0 }} />
    </div>
  ) : null;

  return (
    <div style={baseStyle} className="select-none component-container" data-container-id={component.id} data-container-type={effectiveType}>
      {dropdownButtonElement && (
        <div className="flex-shrink-0">
          {dropdownButtonElement}
        </div>
      )}
      
      <div style={scrollContainerStyle} className="scrollbar-hidden">
        <div style={childrenContainerStyle}>
          {topAppBarTitleElement}
          {showPlaceholder && !topAppBarTitleElement ? (
              <div style={placeholderStyle} className="flex-grow flex flex-col items-center justify-center text-muted-foreground/70 text-xs pointer-events-none p-2 text-center leading-tight">
                <span>{placeholderText}</span>
                {(!isDataBound && effectiveType === 'LazyVerticalGrid' && effectiveProperties.columns) && <span className="mt-1 text-xxs opacity-70">({effectiveProperties.columns})</span>}
                {(!isDataBound && effectiveType === 'LazyHorizontalGrid' && effectiveProperties.rows) && <span className="mt-1 text-xxs opacity-70">({effectiveProperties.rows})</span>}
              </div>
            ) : (
               childrenComponents.map(child => {
                  const childWrapperStyle: React.CSSProperties = { flexShrink: 0 };
                   if (effectiveType === 'Carousel' && carouselStyle === 'Pager') {
                     childWrapperStyle.scrollSnapAlign = 'start';
                   }
                   if (effectiveType === 'Carousel' && carouselStyle === 'MultiBrowse') {
                      childWrapperStyle.width = `${effectiveProperties.preferredItemWidth}px`;
                  }
                  return (
                      <div key={child.id} style={childWrapperStyle}>
                          <RenderedComponentWrapper 
                              component={child} 
                              isPreview={isPreview}
                              {...passThroughProps}
                          />
                      </div>
                  );
               })
            )}
        </div>
      </div>
    </div>
  );
}
