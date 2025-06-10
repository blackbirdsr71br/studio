
'use client';
import type { BaseComponentProps } from '@/types/compose-spec';

interface TextViewProps {
  properties: BaseComponentProps;
}

export function TextView({ properties }: TextViewProps) {
  const {
    text = 'Text',
    fontSize = 16,
    textColor, // Do not provide a default here, let it be undefined
    padding = 0,
    fontWeight = 'Normal',
    fontStyle = 'Normal',
    textAlign = 'Start',
    textDecoration = 'None',
    lineHeight = 1.4, // Use the new lineHeight property
  } = properties;
  
  const style: React.CSSProperties = {
    fontSize: `${fontSize}px`, // Assuming sp is roughly px for web display
    padding: `${padding}px`,
    whiteSpace: 'pre-wrap', // To respect newlines in text
    wordBreak: 'break-word',
    lineHeight: lineHeight, // Apply the configurable lineHeight
    display: 'inline-block', // To make padding effective
    fontWeight: fontWeight.toLowerCase() as 'normal' | 'bold', // CSS values
    fontStyle: fontStyle.toLowerCase() as 'normal' | 'italic', // CSS values
    textAlign: textAlign.toLowerCase() as 'left' | 'center' | 'right' | 'justify' | 'start' | 'end', // CSS values
    textDecorationLine: textDecoration === 'LineThrough' ? 'line-through' : textDecoration.toLowerCase(), // CSS values
  };

  // Only apply color if textColor is explicitly defined in properties
  if (textColor !== undefined) {
    style.color = textColor;
  }

  return (
    <div style={style} className="select-none">
      {text}
    </div>
  );
}

    
