
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
  isRow: boolean;
}

const isNumericString = (value: any): boolean => {
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
    if (typeof dimValue === 'string' && isNumericString(dimValue)) return `${Number(dimValue)}px`;
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

  if (componentId !== DEFAULT_CONTENT_LAZY_COLUMN_ID &&
      (cornerRadiusTopLeft > 0 || cornerRadiusTopRight > 0 || cornerRadiusBottomLeft > 0 || cornerRadiusBottomRight > 0)) {
    specificStyles.overflow = 'hidden';
  }


  if (explicitContentColor && typeof explicitContentColor === 'string' && explicitContentColor.trim() !== '') {
    (specificStyles as any)['--effective-foreground-color'] = explicitContentColor;
  } else if (containerBackgroundColor && typeof containerBackgroundColor === 'string' && containerBackgroundColor !== 'transparent') {
    const contrastingColor = getContrastingTextColor(containerBackgroundColor);
    (specificStyles as any)['--effective-foreground-color'] = contrastingColor;
  } else {
    if (type === 'TopAppBar' || type === 'BottomNavigationBar') {
      (specificStyles as any)['--effective-foreground-color'] = 'hsl(var(--foreground))';
    }
  }


  switch (type) {
    case 'Card':
      specificStyles.boxShadow = `0 ${elevation}px ${elevation * 1.5}px rgba(0,0,0,0.1), 0 ${elevation/2}px ${elevation/2}px rgba(0,0,0,0.06)`;
      specificStyles.backgroundColor = containerBackgroundColor || '#FFFFFF';
      if (typeof borderWidth === 'number' && borderWidth > 0 && borderColor) {
        specificStyles.border = `${borderWidth}px solid ${borderColor}`;
      } else {
         specificStyles.border = (componentId === DEFAULT_CONTENT_LAZY_COLUMN_ID || type.startsWith('Lazy')) ? 'none' : '1px solid hsl(var(--border) / 0.5)';
      }
      break;
    case 'LazyColumn':
    case 'LazyVerticalGrid':
      flexDirection = reverseLayout ? 'column-reverse' : 'column';
      // Only apply overflowY if it's NOT the main content area, which is handled by RenderedComponentWrapper
      if (componentId !== DEFAULT_CONTENT_LAZY_COLUMN_ID) {
          specificStyles.overflowY = properties.userScrollEnabled !== false ? 'auto' : 'hidden';
      }
      specificStyles.minHeight = '100px'; 

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
    case 'TopAppBar':
    case 'BottomNavigationBar':
      specificStyles.backgroundColor = containerBackgroundColor || 'hsl(var(--secondary))';
      specificStyles.alignItems = properties.verticalAlignment ? (properties.verticalAlignment.toLowerCase().includes('center') ? 'center' : properties.verticalAlignment.toLowerCase() as any) : 'center';
      specificStyles.justifyContent = properties.horizontalArrangement ? properties.horizontalArrangement.toLowerCase().replace('space', 'space-') as any : (type === 'TopAppBar' ? 'flex-start' : 'space-around');
      specificStyles.color = explicitContentColor || getContrastingTextColor(specificStyles.backgroundColor as string);
      (specificStyles as any)['--effective-foreground-color'] = specificStyles.color; 
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
    paddingTop: `${effectivePaddingTop}px`,
    paddingBottom: `${effectivePaddingBottom}px`,
    paddingLeft: `${effectivePaddingStart}px`,
    paddingRight: `${effectivePaddingEnd}px`,
    width: styleWidth,
    height: styleHeight,
    display: 'flex',
    flexDirection: flexDirection,
    border: (componentId === DEFAULT_CONTENT_LAZY_COLUMN_ID || type.startsWith('Lazy') || type === 'Card' || type === 'TopAppBar' || type === 'BottomNavigationBar') ? specificStyles.border || 'none' : '1px dashed hsl(var(--border) / 0.3)',
    position: 'relative',
    minWidth: (componentId === DEFAULT_CONTENT_LAZY_COLUMN_ID || properties.width === 'match_parent' ) ? '100%' : (properties.width === 'wrap_content' || !isNumericString(properties.width) ? 'auto' : '60px'),
    minHeight: (componentId === DEFAULT_CONTENT_LAZY_COLUMN_ID || properties.height === 'match_parent' || type === 'TopAppBar' || type === 'BottomNavigationBar') ? styleHeight : (properties.height === 'wrap_content' || !isNumericString(properties.height) ? 'auto' : '60px'),
    boxSizing: 'border-box',
    ...specificStyles,
  };

  if (componentId === DEFAULT_CONTENT_LAZY_COLUMN_ID) {
    baseStyle.backgroundColor = containerBackgroundColor || 'transparent'; 
    // Remove explicit overflowY from here; it's handled by RenderedComponentWrapper for the content slot
    baseStyle.overflowX = 'hidden';
    baseStyle.width = '100%'; 
    baseStyle.height = '100%'; 
    delete baseStyle.overflow; // Remove if set by cornerRadius logic
    delete baseStyle.overflowY; // Explicitly remove
  }
  
  const showPlaceholder = (componentId === DEFAULT_TOP_APP_BAR_ID && !title && childrenComponents.length === 0) ||
                        (componentId === DEFAULT_BOTTOM_NAV_BAR_ID && childrenComponents.length === 0) ||
                        (componentId === DEFAULT_CONTENT_LAZY_COLUMN_ID && childrenComponents.length === 0) ||
                        (![DEFAULT_CONTENT_LAZY_COLUMN_ID, DEFAULT_TOP_APP_BAR_ID, DEFAULT_BOTTOM_NAV_BAR_ID].includes(componentId) && childrenComponents.length === 0);

  const placeholderText = `Drop components into this ${getComponentDisplayName(type, customComponentTemplates.find(t => t.templateId === type)?.name)}`;

  const isWeightedContainer = type === 'Row' || type === 'Column';

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
      {childrenComponents.map(child => {
        let childSpecificStyle: React.CSSProperties = {};
        if (isWeightedContainer && child.properties.layoutWeight && child.properties.layoutWeight > 0) {
            childSpecificStyle.flexGrow = child.properties.layoutWeight;
            childSpecificStyle.flexShrink = 1; 
            childSpecificStyle.flexBasis = '0%'; 
            if (flexDirection === 'row') {
                childSpecificStyle.width = 'auto'; 
            } else {
                childSpecificStyle.height = 'auto'; 
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

