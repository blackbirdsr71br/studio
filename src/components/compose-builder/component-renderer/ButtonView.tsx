'use client';
import type { BaseComponentProps } from '@/types/compose-spec';

interface ButtonViewProps {
  properties: BaseComponentProps;
}

export function ButtonView({ properties }: ButtonViewProps) {
  const { text = 'Button', backgroundColor = '#3F51B5', textColor = '#FFFFFF', fontSize = 14, padding = 8 } = properties;
  
  const style: React.CSSProperties = {
    backgroundColor,
    color: textColor,
    fontSize: `${fontSize}px`,
    padding: `${padding}px ${padding*1.5}px`, // More horizontal padding for buttons
    borderRadius: '4px',
    border: 'none',
    cursor: 'default', // Not clickable on canvas
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
