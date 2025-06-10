'use client';
import type { BaseComponentProps } from '@/types/compose-spec';
import { getContrastingTextColor } from '@/lib/utils';

interface ButtonViewProps {
  properties: BaseComponentProps;
}

export function ButtonView({ properties }: ButtonViewProps) {
  const { text = 'Button', backgroundColor = '#3F51B5', textColor, fontSize = 14, padding = 8 } = properties;
  
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
    padding: `${padding}px ${padding*1.5}px`, 
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
