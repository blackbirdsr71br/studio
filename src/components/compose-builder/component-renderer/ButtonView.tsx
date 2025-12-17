'use client';
import type { BaseComponentProps } from '@/types/compose-spec';
import { getDefaultProperties } from '@/types/compose-spec';
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
  const allProps = { ...getDefaultProperties('Button'), ...properties };
  const {
    text,
    backgroundColor,
    textColor,
    fontSize,
    padding, 
    paddingTop,
    paddingBottom,
    paddingStart,
    paddingEnd,
    fillMaxWidth,
    shape,
    cornerRadius,
    cornerRadiusTopLeft,
    cornerRadiusTopRight,
    cornerRadiusBottomRight,
    cornerRadiusBottomLeft,
    iconName,
    iconPosition,
    iconSize,
    iconSpacing,
  } = allProps;

  const style: React.CSSProperties = {
    backgroundColor: backgroundColor || 'var(--m3-primary)',
    color: textColor || 'var(--m3-on-primary)',
    fontSize: `${fontSize}px`,
    paddingTop: `${paddingTop ?? padding ?? 8}px`,
    paddingBottom: `${paddingBottom ?? padding ?? 8}px`,
    paddingLeft: `${paddingStart ?? padding ?? 12}px`,
    paddingRight: `${paddingEnd ?? padding ?? 12}px`,
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

  switch (shape) {
    case 'Rectangle':
      style.borderRadius = '0px';
      break;
    case 'Circle':
      style.borderRadius = '50%';
      style.aspectRatio = '1 / 1';
      // For circle, we might want to ensure width and height are equal if not set to fill
      if (properties.width && !properties.height) {
        style.height = style.width;
      } else if (properties.height && !properties.width) {
        style.width = style.height;
      }
      break;
    case 'RoundedCorner':
    default:
       // Prioritize individual corners if they are defined, otherwise use the general cornerRadius
      if (
        cornerRadiusTopLeft !== undefined ||
        cornerRadiusTopRight !== undefined ||
        cornerRadiusBottomLeft !== undefined ||
        cornerRadiusBottomRight !== undefined
      ) {
        style.borderTopLeftRadius = `${cornerRadiusTopLeft ?? cornerRadius ?? 4}px`;
        style.borderTopRightRadius = `${cornerRadiusTopRight ?? cornerRadius ?? 4}px`;
        style.borderBottomLeftRadius = `${cornerRadiusBottomLeft ?? cornerRadius ?? 4}px`;
        style.borderBottomRightRadius = `${cornerRadiusBottomRight ?? cornerRadius ?? 4}px`;
      } else {
        style.borderRadius = `${cornerRadius ?? 4}px`;
      }
      break;
  }

  // If not fillMaxWidth and width is wrap_content (default or explicit), adjust width
  if (!fillMaxWidth && (properties.width === 'wrap_content' || properties.width === undefined)) {
    style.width = 'auto'; // Let the button size to its content + padding
    style.display = 'inline-flex'; // Behave more like an inline element if not filling width
  }
  
  const iconElement = iconName ? (
    <DynamicLucideIcon name={iconName} size={iconSize} color={style.color as string} />
  ) : null;

  return (
    <div style={style} className="select-none">
      {iconPosition === 'Start' && iconElement}
      {text && <span>{text}</span>}
      {iconPosition === 'End' && iconElement}
    </div>
  );
}
