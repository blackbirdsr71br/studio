'use client';
import type { BaseComponentProps } from '@/types/compose-spec';
import { getDefaultProperties } from '@/types/compose-spec';
import { cn } from '@/lib/utils';

interface TextViewProps {
  properties: BaseComponentProps;
}

export function TextView({ properties }: TextViewProps) {
  const allProps = { ...getDefaultProperties('Text'), ...properties };
  const {
    text,
    fontSize,
    textColor,
    padding, // All sides padding
    paddingTop,
    paddingBottom,
    paddingStart,
    paddingEnd,
    fontWeight,
    fontStyle,
    fontFamily,
    textAlign,
    textDecoration,
    lineHeight,
    backgroundColor,
  } = allProps;

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

  // Convert the friendly name (e.g., "Playfair Display") to its CSS variable name (e.g., "--font-playfair-display")
  const getFontFamilyVariable = (fontName: string) => {
    return `var(--font-${fontName.toLowerCase().replace(/ /g, '-')})`;
  }

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
    textDecorationLine: textDecoration === 'LineThrough' ? 'line-through' : textDecoration.toLowerCase(),
    fontFamily: getFontFamilyVariable(fontFamily || 'Inter'), // Apply the font family via CSS variable
    color: textColor || 'var(--m3-on-surface)',
    width: '100%',
    height: '100%',
    boxSizing: 'border-box',
    display: 'flex',
    alignItems: 'center', // for vertical centering
  };

  // Map Compose textAlign to flexbox justify-content for horizontal alignment
  const justifyContentMap = {
      'Start': 'flex-start',
      'Left': 'flex-start',
      'Center': 'center',
      'End': 'flex-end',
      'Right': 'flex-end',
  };
  style.justifyContent = justifyContentMap[textAlign as keyof typeof justifyContentMap] || 'flex-start';

  // For Justify, we need text-align property and a full-width child
  let spanClassName = '';
  if (textAlign === 'Justify') {
      style.textAlign = 'justify';
      spanClassName = 'w-full';
  }


  if (backgroundColor) {
     if (typeof backgroundColor === 'object' && backgroundColor.type === 'linearGradient') {
      const angle = backgroundColor.angle || 0;
      const colorStops = backgroundColor.colors.join(', ');
      style.background = `linear-gradient(${angle}deg, ${colorStops})`;
      // Apply gradient to text
      style.WebkitBackgroundClip = 'text';
      style.backgroundClip = 'text';
      style.color = 'transparent';
    } else if (typeof backgroundColor === 'string') {
      style.backgroundColor = backgroundColor;
    }
  }
  
  return (
    <div style={style} className="select-none">
      <span className={cn(spanClassName)}>{text}</span>
    </div>
  );
}
