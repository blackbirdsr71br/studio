
'use client';
import type { BaseComponentProps } from '@/types/compose-spec';
import { getContrastingTextColor } from '@/lib/utils';

interface ButtonViewProps {
  properties: BaseComponentProps;
}

export function ButtonView({ properties }: ButtonViewProps) {
  const {
    text = 'Button',
    backgroundColor = '#3F51B5',
    textColor,
    fontSize = 14,
    padding, 
    paddingTop,
    paddingBottom,
    paddingStart,
    paddingEnd,
    fillMaxWidth, // Added to consume for styling
  } = properties;

  let effectiveTextColor;
  if (textColor && textColor.trim() !== '') {
    effectiveTextColor = textColor;
  } else {
    effectiveTextColor = getContrastingTextColor(backgroundColor);
  }

  const style: React.CSSProperties = {
    backgroundColor,
    color: effectiveTextColor,
    fontSize: `${fontSize}px`,
    paddingTop: `${paddingTop ?? padding ?? 8}px`,
    paddingBottom: `${paddingBottom ?? padding ?? 8}px`,
    paddingLeft: `${paddingStart ?? padding ?? 12}px`,
    paddingRight: `${paddingEnd ?? padding ?? 12}px`,
    borderRadius: '4px',
    border: 'none',
    display: 'flex', // Default to flex, will be overridden for wrap_content
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    width: '100%', 
    height: '100%', 
    boxSizing: 'border-box', 
  };

  // If not fillMaxWidth and width is wrap_content (default or explicit), adjust width
  if (!fillMaxWidth && (properties.width === 'wrap_content' || properties.width === undefined)) {
    style.width = 'auto'; // Let the button size to its content + padding
    style.display = 'inline-flex'; // Behave more like an inline element if not filling width
  }


  // Use a div instead of a disabled button to avoid blocking pointer events.
  return (
    <div style={style} className="select-none">
      {text}
    </div>
  );
}

    
