
'use client';
import type { BaseComponentProps } from '@/types/compose-spec';
import { getContrastingTextColor } from '@/lib/utils';
import * as icons from 'lucide-react';

interface ButtonViewProps {
  properties: BaseComponentProps;
}

// Helper to convert strings to PascalCase for icon names
// e.g., "arrow-right" -> "ArrowRight", "check" -> "Check"
const toPascalCase = (str: string) => {
    if (!str) return '';
    return str
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, char => char.toUpperCase())
        .replace(/\s/g, '');
};


const DynamicLucideIcon = ({ name, ...props }: { name: string } & icons.LucideProps) => {
    const iconNameInPascalCase = toPascalCase(name);
    const LucideIcon = (icons as any)[iconNameInPascalCase];

    if (!LucideIcon) {
        // Fallback for invalid icon names, provides visual feedback
        return <icons.HelpCircle {...props} title={`Invalid icon name: ${name}`} />;
    }

    return <LucideIcon {...props} />;
};


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
    fillMaxWidth,
    cornerRadius = 4,
    iconName,
    iconPosition = 'Start',
    iconSize = 16,
    iconSpacing = 8,
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
    borderRadius: `${cornerRadius}px`,
    border: 'none',
    display: 'flex', 
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    width: '100%', 
    height: '100%', 
    boxSizing: 'border-box',
    gap: `${iconName && text ? iconSpacing : 0}px`
  };

  // If not fillMaxWidth and width is wrap_content (default or explicit), adjust width
  if (!fillMaxWidth && (properties.width === 'wrap_content' || properties.width === undefined)) {
    style.width = 'auto'; // Let the button size to its content + padding
    style.display = 'inline-flex'; // Behave more like an inline element if not filling width
  }
  
  const iconElement = iconName ? (
    <DynamicLucideIcon name={iconName} size={iconSize} color={effectiveTextColor} />
  ) : null;

  return (
    <div style={style} className="select-none">
      {iconPosition === 'Start' && iconElement}
      {text && <span>{text}</span>}
      {iconPosition === 'End' && iconElement}
    </div>
  );
}
