'use client';
import type { BaseComponentProps } from '@/types/compose-spec';

interface TextViewProps {
  properties: BaseComponentProps;
}

export function TextView({ properties }: TextViewProps) {
  const { text = 'Text', fontSize = 16, textColor = '#000000', padding = 0 } = properties;
  
  const style: React.CSSProperties = {
    fontSize: `${fontSize}px`, // Assuming sp is roughly px for web display
    color: textColor,
    padding: `${padding}px`,
    whiteSpace: 'pre-wrap', // To respect newlines in text
    wordBreak: 'break-word',
    lineHeight: '1.4',
    display: 'inline-block', // To make padding effective
  };

  return (
    <div style={style} className="select-none">
      {text}
    </div>
  );
}
