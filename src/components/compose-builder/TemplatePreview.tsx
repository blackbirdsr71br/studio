
'use client';

import React from 'react';
import type { CustomComponentTemplate, DesignComponent } from '@/types/compose-spec';
import { RenderedComponentWrapper } from './component-renderer/RenderedComponentWrapper';

interface TemplatePreviewProps {
  template: CustomComponentTemplate;
}

export function TemplatePreview({ template }: TemplatePreviewProps) {
  
  const getTemplateComponentById = (id: string): DesignComponent | undefined => {
    return template.componentTree.find(c => c.id === id);
  };
  
  const rootComponent = getTemplateComponentById(template.rootComponentId);

  if (!rootComponent) {
    return <div className="p-2 text-xs text-destructive">Preview Error: Root component not found.</div>;
  }
  
  const componentWidth = typeof rootComponent.properties.width === 'number' ? rootComponent.properties.width : 200;
  const componentHeight = typeof rootComponent.properties.height === 'number' ? rootComponent.properties.height : 150;
  
  // This wrapper ensures the content scales down to fit, but doesn't scale up.
  // The outer div in ComponentLibraryPanel provides the fixed height and width context (e.g., w-full, h-[60px]).
  return (
    <div 
        className="w-full h-full flex items-center justify-center bg-background"
    >
      <div 
        className="relative"
        style={{
            width: `${componentWidth}px`,
            height: `${componentHeight}px`,
            // This is the robust scaling logic. It finds the smaller of the two possible scales (width-based or height-based)
            // to ensure the entire component fits without being cropped or overflowing.
            // Container width is typically ~220px, height is 60px.
            transform: `scale(${Math.min(220 / componentWidth, 60 / componentHeight)})`,
            transformOrigin: 'center center'
        }}
      >
          <RenderedComponentWrapper
            component={rootComponent}
            isPreview={true}
          />
      </div>
    </div>
  );
}
