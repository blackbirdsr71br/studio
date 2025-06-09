
'use client';
import type { DesignComponent } from '@/types/compose-spec';
import { RenderedComponentWrapper } from '../RenderedComponentWrapper';
import { getComponentDisplayName } from '@/types/compose-spec'; // Import for placeholder

interface ContainerViewProps {
  component: DesignComponent;
  childrenComponents: DesignComponent[];
  isRow: boolean; // True for Row-like layouts, False for Column-like
}

export function ContainerView({ component, childrenComponents, isRow }: ContainerViewProps) {
  const { type, properties } = component;
  const {
    padding = 8,
    elevation = 2, // Default for Card
    cornerRadius = 0, // Default for Box, Card will override if set
  } = properties;

  // Helper to process dimension values (number, 'match_parent', 'wrap_content')
  const processDimension = (
    dimValue: string | number | undefined,
    defaultValueIfUndefined: string | number
  ): string => {
    if (typeof dimValue === 'number') return `${dimValue}px`;
    if (dimValue === 'match_parent') return '100%';
    if (dimValue === 'wrap_content') return 'auto'; // 'fit-content' could also be an option
    if (typeof dimValue === 'string' && dimValue.endsWith('%')) return dimValue; // Allow passing through percentages
    // Fallback to default if undefined or unrecognized string
    return typeof defaultValueIfUndefined === 'number' ? `${defaultValueIfUndefined}px` : defaultValueIfUndefined.toString();
  };

  // Determine default width/height based on type before processing
  let defaultWidth: string | number = 200;
  let defaultHeight: string | number = isRow ? 100 : 200;

  if (type === 'LazyColumn' || type === 'LazyVerticalGrid') {
    defaultWidth = '100%'; // 'match_parent' effectively
    defaultHeight = 300;
  } else if (type === 'LazyRow' || type === 'LazyHorizontalGrid') {
    defaultWidth = '100%'; // 'match_parent' effectively
    defaultHeight = type === 'LazyRow' ? 120 : 200;
  } else if (type === 'Card') {
    defaultWidth = 200;
    defaultHeight = 150;
  } else if (type === 'Box') {
    defaultWidth = 100;
    defaultHeight = 100;
  }


  const styleWidth = processDimension(properties.width, defaultWidth);
  const styleHeight = processDimension(properties.height, defaultHeight);

  let flexDirection: 'row' | 'column' = isRow ? 'row' : 'column';
  let specificStyles: React.CSSProperties = {
    overflow: 'hidden', // Default, can be overridden
    borderRadius: `${cornerRadius}px`,
  };

  switch (type) {
    case 'Card':
      specificStyles.boxShadow = `0 ${elevation}px ${elevation * 1.5}px rgba(0,0,0,0.1), 0 ${elevation/2}px ${elevation/2}px rgba(0,0,0,0.06)`;
      specificStyles.backgroundColor = properties.backgroundColor || '#FFFFFF';
      break;
    case 'LazyColumn':
      flexDirection = 'column';
      specificStyles.overflowY = 'auto';
      specificStyles.minHeight = '100px'; // Ensure it's scrollable
      delete specificStyles.borderRadius; // Lazy lists typically don't have their own border radius
      break;
    case 'LazyRow':
      flexDirection = 'row';
      specificStyles.overflowX = 'auto';
      specificStyles.minHeight = '80px'; // Ensure it's scrollable if children are tall
      delete specificStyles.borderRadius;
      break;
    case 'LazyVerticalGrid':
      flexDirection = 'row';
      specificStyles.flexWrap = 'wrap';
      specificStyles.alignContent = 'flex-start';
      specificStyles.overflowY = 'auto'; // If content exceeds height
      specificStyles.minHeight = '100px';
      delete specificStyles.borderRadius;
      break;
    case 'LazyHorizontalGrid': // Visually like LazyRow
      flexDirection = 'row';
      specificStyles.overflowX = 'auto';
      specificStyles.minHeight = '100px'; // Allow children to define height of items in row
      delete specificStyles.borderRadius;
      break;
    case 'Box':
      // Default container styles are fine
      break;
  }

  const baseStyle: React.CSSProperties = {
    backgroundColor: properties.backgroundColor || (type === 'Card' ? '#FFFFFF' : 'rgba(200, 200, 200, 0.2)'), // Softer default BG
    padding: `${padding}px`,
    width: styleWidth,
    height: styleHeight,
    display: 'flex',
    flexDirection: flexDirection,
    gap: '8px',
    border: '1px dashed hsl(var(--border))',
    position: 'relative',
    minWidth: '60px', // Slightly larger min size
    minHeight: '60px',
    ...specificStyles,
  };

  const placeholderText = `Drop components into this ${getComponentDisplayName(type)}`;

  return (
    <div style={baseStyle} className="select-none component-container" data-container-id={component.id}>
      {childrenComponents.length === 0 && (
        <div className="flex flex-col items-center justify-center text-muted-foreground text-xs h-full pointer-events-none p-2 text-center">
          {placeholderText}
          {(type === 'LazyVerticalGrid' && properties.columns) && <span className="mt-1 text-xxs opacity-70">({properties.columns} columns)</span>}
          {(type === 'LazyHorizontalGrid' && properties.rows) && <span className="mt-1 text-xxs opacity-70">({properties.rows} rows)</span>}
        </div>
      )}
      {childrenComponents.map(child => (
        <RenderedComponentWrapper key={child.id} component={child} />
      ))}
    </div>
  );
}
