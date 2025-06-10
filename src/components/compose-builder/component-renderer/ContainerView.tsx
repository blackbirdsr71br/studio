
'use client';
import type { DesignComponent } from '@/types/compose-spec';
import { RenderedComponentWrapper } from '../RenderedComponentWrapper';
import { getComponentDisplayName, DEFAULT_ROOT_LAZY_COLUMN_ID } from '@/types/compose-spec';

interface ContainerViewProps {
  component: DesignComponent;
  childrenComponents: DesignComponent[];
  isRow: boolean; 
}

export function ContainerView({ component, childrenComponents, isRow }: ContainerViewProps) {
  const { type, properties, id: componentId } = component;
  const {
    padding = (componentId === DEFAULT_ROOT_LAZY_COLUMN_ID ? 8 : 0), // Default padding 8 for root, 0 for others unless specified
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
    defaultWidth = 200; // Default for basic Column/Row
    defaultHeight = isRow ? 100 : 200;
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

  // Default overflow for most containers; Lazy types will override.
  if (componentId !== DEFAULT_ROOT_LAZY_COLUMN_ID && type !== 'LazyColumn' && type !== 'LazyRow' && type !== 'LazyVerticalGrid' && type !== 'LazyHorizontalGrid') {
     specificStyles.overflow = 'hidden';
  }


  switch (type) {
    case 'Card':
      specificStyles.boxShadow = `0 ${elevation}px ${elevation * 1.5}px rgba(0,0,0,0.1), 0 ${elevation/2}px ${elevation/2}px rgba(0,0,0,0.06)`;
      specificStyles.backgroundColor = properties.backgroundColor || '#FFFFFF';
      break;
    case 'LazyColumn':
    case 'LazyVerticalGrid': // Vertical grids flow like columns for item layout within flex
      flexDirection = reverseLayout ? 'column-reverse' : 'column';
      specificStyles.overflowY = properties.userScrollEnabled !== false ? 'auto' : 'hidden';
      specificStyles.minHeight = '100px'; // Minimum scrollable area
      if (type === 'LazyColumn') delete specificStyles.borderRadius;

      // Vertical Arrangement (maps to justify-content for column flex)
      switch (properties.verticalArrangement) {
        case 'Top': specificStyles.justifyContent = reverseLayout ? 'flex-end' : 'flex-start'; break;
        case 'Bottom': specificStyles.justifyContent = reverseLayout ? 'flex-start' : 'flex-end'; break;
        case 'Center': specificStyles.justifyContent = 'center'; break;
        case 'SpaceAround': specificStyles.justifyContent = 'space-around'; break;
        case 'SpaceBetween': specificStyles.justifyContent = 'space-between'; break;
        case 'SpaceEvenly': specificStyles.justifyContent = 'space-evenly'; break;
        default: specificStyles.justifyContent = reverseLayout ? 'flex-end' : 'flex-start';
      }
      // Horizontal Alignment (maps to align-items for column flex)
      switch (properties.horizontalAlignment) {
        case 'Start': specificStyles.alignItems = 'flex-start'; break;
        case 'CenterHorizontally': specificStyles.alignItems = 'center'; break;
        case 'End': specificStyles.alignItems = 'flex-end'; break;
        default: specificStyles.alignItems = 'flex-start';
      }
      if (type === 'LazyVerticalGrid') {
        flexDirection = 'row'; // Grid items actually flow in rows and wrap
        specificStyles.flexWrap = 'wrap';
        // For vertical grid, primary axis is column-like, but items flow row-wise before wrapping.
        // justifyContent here refers to how items are spaced on the cross-axis (horizontally for each "line" if items wrap).
        // alignItems refers to how items are aligned on the main-axis (vertically within their "cell").
        // This needs careful mapping for true grid behavior. For now, use column-like defaults.
      }
      break;
    case 'LazyRow':
    case 'LazyHorizontalGrid': // Horizontal grids flow like rows for item layout within flex
      flexDirection = reverseLayout ? 'row-reverse' : 'row';
      specificStyles.overflowX = properties.userScrollEnabled !== false ? 'auto' : 'hidden';
      specificStyles.minHeight = '80px'; // Minimum scrollable area
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
          flexDirection = 'column'; // Grid items actually flow in columns and wrap
          specificStyles.flexWrap = 'wrap';
          specificStyles.height = styleHeight; // Explicit height needed for column-flow wrap
          // Similar to VerticalGrid, true grid behavior mapping is complex. Using row-like defaults.
      }
      break;
    case 'Box':
      // Default is fine
      break;
    default: // Covers Column, Row, and custom components
      if (type === 'Column' || (type.startsWith('custom/') && !isRow) ) {
          // Vertical Arrangement
          switch (properties.verticalArrangement) {
            case 'Top': specificStyles.justifyContent = reverseLayout ? 'flex-end' : 'flex-start'; break;
            case 'Bottom': specificStyles.justifyContent = reverseLayout ? 'flex-start' : 'flex-end'; break;
            case 'Center': specificStyles.justifyContent = 'center'; break;
            case 'SpaceAround': specificStyles.justifyContent = 'space-around'; break;
            case 'SpaceBetween': specificStyles.justifyContent = 'space-between'; break;
            case 'SpaceEvenly': specificStyles.justifyContent = 'space-evenly'; break;
            default: specificStyles.justifyContent = reverseLayout ? 'flex-end' : 'flex-start';
          }
          // Horizontal Alignment
          switch (properties.horizontalAlignment) {
            case 'Start': specificStyles.alignItems = 'flex-start'; break;
            case 'CenterHorizontally': specificStyles.alignItems = 'center'; break;
            case 'End': specificStyles.alignItems = 'flex-end'; break;
            default: specificStyles.alignItems = 'flex-start';
          }
      } else if (type === 'Row' || (type.startsWith('custom/') && isRow)) {
           // Horizontal Arrangement
          switch (properties.horizontalArrangement) {
              case 'Start': specificStyles.justifyContent = reverseLayout ? 'flex-end' : 'flex-start'; break;
              case 'End': specificStyles.justifyContent = reverseLayout ? 'flex-start' : 'flex-end'; break;
              case 'Center': specificStyles.justifyContent = 'center'; break;
              case 'SpaceAround': specificStyles.justifyContent = 'space-around'; break;
              case 'SpaceBetween': specificStyles.justifyContent = 'space-between'; break;
              case 'SpaceEvenly': specificStyles.justifyContent = 'space-evenly'; break;
              default: specificStyles.justifyContent = reverseLayout ? 'flex-end' : 'flex-start';
          }
          // Vertical Alignment
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
    position: 'relative', // Important for children positioning and drop targets
    minWidth: (componentId === DEFAULT_ROOT_LAZY_COLUMN_ID || properties.width === 'match_parent' ) ? '100%' : (properties.width === 'wrap_content' ? 'auto' : '60px'),
    minHeight: (componentId === DEFAULT_ROOT_LAZY_COLUMN_ID || properties.height === 'match_parent') ? '100%' : (properties.height === 'wrap_content' ? 'auto' : '60px'),
    boxSizing: 'border-box', // Ensure padding and border are included in width/height
    ...specificStyles,
  };
  
  if (componentId === DEFAULT_ROOT_LAZY_COLUMN_ID) {
    baseStyle.backgroundColor = properties.backgroundColor || 'transparent';
    baseStyle.overflowY = 'auto'; // Ensure root is always scrollable if content exceeds
    baseStyle.overflowX = 'hidden';
  }

  const placeholderText = `Drop components into this ${getComponentDisplayName(type)}`;

  return (
    <div style={baseStyle} className="select-none component-container" data-container-id={component.id} data-container-type={type}>
      {childrenComponents.length === 0 && componentId !== DEFAULT_ROOT_LAZY_COLUMN_ID && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground/70 text-xs pointer-events-none p-2 text-center leading-tight">
          {placeholderText}
          {(type === 'LazyVerticalGrid' && properties.columns) && <span className="mt-1 text-xxs opacity-70">({properties.columns} columns)</span>}
          {(type === 'LazyHorizontalGrid' && properties.rows) && <span className="mt-1 text-xxs opacity-70">({properties.rows} rows)</span>}
        </div>
      )}
      {/* If it's the root canvas and it's empty, DesignSurface will show a different placeholder */}
      {childrenComponents.map(child => (
        <RenderedComponentWrapper key={child.id} component={child} />
      ))}
    </div>
  );
}
