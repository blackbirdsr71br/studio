
'use client';

import React from 'react';
import type { CustomComponentTemplate, DesignComponent } from '@/types/compose-spec';
import { ReadonlyRenderedComponentWrapper } from './component-renderer/ReadonlyRenderedComponentWrapper';

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
  // The outer div in ComponentLibraryPanel provides the fixed height and width context.
  return (
    <div 
        className="w-full h-full flex items-center justify-center bg-background"
    >
      <div 
        className="relative"
        style={{
            width: `${componentWidth}px`,
            height: `${componentHeight}px`,
            // Scale the component down to fit within the container, but don't scale up
            // The max(0.1, ...) prevents it from becoming too small to see
            transform: `scale(${Math.max(0.1, Math.min(1, 248 / componentWidth, 60 / componentHeight))})`,
            transformOrigin: 'center center'
        }}
      >
          <ReadonlyRenderedComponentWrapper
            component={rootComponent}
            getComponentById={getTemplateComponentById}
            isPreview={true}
          />
      </div>
    </div>
  );
}
