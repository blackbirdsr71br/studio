
'use client';
import type { BaseComponentProps } from '@/types/compose-spec';

interface TextViewProps {
  properties: BaseComponentProps;
}

export function TextView({ properties }: TextViewProps) {
  const {
    text = 'Text',
    fontSize = 16,
    textColor,
    padding, // All sides padding
    paddingTop,
    paddingBottom,
    paddingStart,
    paddingEnd,
    fontWeight = 'Normal',
    fontStyle = 'Normal',
    textAlign = 'Start',
    textDecoration = 'None',
    lineHeight = 1.4,
  } = properties;

  const style: React.CSSProperties = {
    fontSize: `${fontSize}px`,
    paddingTop: `${paddingTop ?? padding ?? 0}px`,
    paddingBottom: `${paddingBottom ?? padding ?? 0}px`,
    paddingLeft: `${paddingStart ?? padding ?? 0}px`,
    paddingRight: `${paddingEnd ?? padding ?? 0}px`,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    lineHeight: lineHeight,
    display: 'inline-block',
    fontWeight: fontWeight.toLowerCase() as 'normal' | 'bold',
    fontStyle: fontStyle.toLowerCase() as 'normal' | 'italic',
    textAlign: textAlign.toLowerCase() as 'left' | 'center' | 'right' | 'justify' | 'start' | 'end',
    textDecorationLine: textDecoration === 'LineThrough' ? 'line-through' : textDecoration.toLowerCase(),
  };

  if (textColor !== undefined) {
    style.color = textColor;
  } else {
    style.color = 'var(--effective-foreground-color, hsl(var(--foreground)))';
  }

  return (
    <div style={style} className="select-none">
      {text}
    </div>
  );
}

    