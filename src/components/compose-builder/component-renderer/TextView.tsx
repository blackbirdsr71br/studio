
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
    // color is set below
    // width and display are set below
  };

  if (backgroundColor) {
    style.backgroundColor = backgroundColor;
  }

  if (textColor !== undefined) {
    style.color = textColor;
  } else {
    // This var is set by ContainerView or RenderedComponentWrapper for context
    style.color = 'var(--effective-foreground-color, hsl(var(--foreground)))';
  }

  if (properties.fillMaxWidth) {
    style.width = '100%';
    style.display = 'block'; // Use 'block' so textAlign works as expected over the full width
  } else if (typeof properties.width === 'number') {
    style.width = `${properties.width}px`;
    style.display = 'block'; // If a specific width is set, it should behave as a block
  } else if (properties.width === 'wrap_content') {
    style.display = 'inline-block'; // Default wrap_content behavior
    style.width = 'auto';
  } else { // Fallback for undefined or other string values for width
    style.display = 'inline-block';
    style.width = 'auto';
  }

  // TextView typically wraps its height based on content, unless a specific height is given.
  // If fillMaxHeight were relevant here, similar logic would apply for height.
  if (typeof properties.height === 'number') {
    style.height = `${properties.height}px`;
    // Potentially add overflow handling if text exceeds fixed height
  } else if (properties.fillMaxHeight) {
    style.height = '100%';
    // Potentially add overflow handling
  }


  return (
    <div style={style} className="select-none">
      {text}
    </div>
  );
}
