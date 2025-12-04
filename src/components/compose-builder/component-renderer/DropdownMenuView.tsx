'use client';

import type { BaseComponentProps, DesignComponent } from '@/types/compose-spec';
import { getContrastingTextColor } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';
import { RenderedComponentWrapper } from './RenderedComponentWrapper';

interface DropdownMenuViewProps {
  component: DesignComponent;
  childrenComponents: DesignComponent[];
  isPreview?: boolean;
}

export function DropdownMenuView({ component, childrenComponents, isPreview = false }: DropdownMenuViewProps) {
  const {
    text = 'Menu',
    backgroundColor = '#6200EE',
    textColor,
    fontSize = 14,
    padding,
    paddingTop,
    paddingBottom,
    paddingStart,
    paddingEnd,
    cornerRadius = 4,
  } = component.properties;

  const effectiveTextColor = textColor || getContrastingTextColor(backgroundColor);

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
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    position: 'relative',
  };

  // In preview mode, we can show the menu items below the button
  if (isPreview) {
    return (
      <div className="flex flex-col items-start">
        <div style={style} className="select-none">
          <span>{text}</span>
          <ChevronDown size={18} />
        </div>
        <div className="flex flex-col items-start mt-1 p-2 border rounded-md bg-background shadow-lg">
          {childrenComponents.length > 0 ? (
            childrenComponents.map(child => (
              <div key={child.id} className="p-1 w-full text-left text-sm">
                <RenderedComponentWrapper component={child} isPreview={true} />
              </div>
            ))
          ) : (
            <p className="text-xs text-muted-foreground p-1">No menu items</p>
          )}
        </div>
      </div>
    );
  }

  // In the main editor, we just show the button and a placeholder for children
  return (
    <div
      style={{ ...style, minWidth: '100px', minHeight: '36px' }}
      className="select-none"
    >
      <span>{text}</span>
      <ChevronDown size={18} />
      {/* A simple indicator that it contains children */}
      {childrenComponents.length > 0 && (
        <div className="absolute -bottom-2 -right-2 text-xs bg-accent text-accent-foreground rounded-full h-4 w-4 flex items-center justify-center pointer-events-none">
          {childrenComponents.length}
        </div>
      )}
    </div>
  );
}
