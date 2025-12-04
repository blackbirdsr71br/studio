
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

  // The new logic is handled by ContainerView. This component might be deprecated or simplified.
  // For now, let's keep a simplified preview logic if needed elsewhere, but the main render path is through ContainerView.

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

  // This simplified view is for the main canvas, handled by ContainerView now.
  // We can return a placeholder or simplified button.
  return (
    <div
      style={{ ...style, width: '100%', height: '100%' }}
      className="select-none"
    >
      <span>{text}</span>
      <ChevronDown size={18} />
    </div>
  );
}
