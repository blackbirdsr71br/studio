
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
    padding, // All sides padding
    paddingTop,
    paddingBottom,
    paddingStart,
    paddingEnd,
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
    paddingTop: `${paddingTop ?? padding ?? 8}px`, // Default 'all' padding for button is 8 if nothing is set
    paddingBottom: `${paddingBottom ?? padding ?? 8}px`,
    paddingLeft: `${paddingStart ?? padding ?? 12}px`, // Horizontal padding is often more for buttons
    paddingRight: `${paddingEnd ?? padding ?? 12}px`,
    borderRadius: '4px',
    border: 'none',
    cursor: 'default',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '80px',
    minHeight: '36px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  };

  return (
    <button style={style} className="select-none" disabled>
      {text}
    </button>
  );
}

    