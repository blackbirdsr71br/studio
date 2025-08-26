
'use client';
import type { BaseComponentProps } from '@/types/compose-spec';
import { cn } from '@/lib/utils';

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
    fontFamily = 'Inter',
    textAlign = 'Start',
    textDecoration = 'None',
    lineHeight = 1,
    backgroundColor,
  } = properties;

  const getFontWeightValue = (weight: 'Normal' | 'Semibold' | 'Bold'): 'normal' | 'bold' | number => {
    switch (weight) {
      case 'Bold':
        return 'bold';
      case 'Semibold':
        return 600;
      case 'Normal':
      default:
        return 'normal';
    }
  };

  const style: React.CSSProperties = {
    fontSize: `${fontSize}px`,
    paddingTop: `${paddingTop ?? padding ?? 0}px`,
    paddingBottom: `${paddingBottom ?? padding ?? 0}px`,
    paddingLeft: `${paddingStart ?? padding ?? 0}px`,
    paddingRight: `${paddingEnd ?? padding ?? 0}px`,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    lineHeight: lineHeight,
    fontWeight: getFontWeightValue(fontWeight),
    fontStyle: fontStyle.toLowerCase() as 'normal' | 'italic',
    textAlign: textAlign.toLowerCase() as 'left' | 'center' | 'right' | 'justify' | 'start' | 'end',
    textDecorationLine: textDecoration === 'LineThrough' ? 'line-through' : textDecoration.toLowerCase(),
  };

  if (backgroundColor) {
    style.backgroundColor = backgroundColor;
  }

  if (textColor !== undefined) {
    style.color = textColor;
  } else {
    style.color = 'var(--effective-foreground-color, hsl(var(--foreground)))';
  }

  if (properties.fillMaxWidth) {
    style.width = '100%';
    style.display = 'block';
  } else if (typeof properties.width === 'number') {
    style.width = `${properties.width}px`;
    style.display = 'block';
  } else if (properties.width === 'wrap_content') {
    style.display = 'inline-block';
    style.width = 'auto';
  } else {
    style.display = 'inline-block';
    style.width = 'auto';
  }

  if (typeof properties.height === 'number') {
    style.height = `${properties.height}px`;
  } else if (properties.fillMaxHeight) {
    style.height = '100%';
  }
  
  const fontClassName = `font-${(fontFamily || 'Inter').toLowerCase().replace(/ /g, '-')}`;

  return (
    <div style={style} className={cn("select-none", fontClassName)}>
      {text}
    </div>
  );
}
