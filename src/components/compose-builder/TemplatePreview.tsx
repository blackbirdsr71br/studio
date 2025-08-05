
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
  
  // Calculate a scaling factor to fit the component proportionally
  const previewWidth = 200; // The width of the preview container in ComponentLibraryPanel
  const previewHeight = (previewWidth * 9) / 16; // Maintain 16:9 aspect ratio
  
  const componentWidth = typeof rootComponent.properties.width === 'number' ? rootComponent.properties.width : previewWidth;
  const componentHeight = typeof rootComponent.properties.height === 'number' ? rootComponent.properties.height : previewHeight;

  const scale = Math.min(previewWidth / componentWidth, previewHeight / componentHeight, 1);

  return (
    <div 
        className="w-full h-full flex items-center justify-center overflow-hidden bg-background"
    >
      <div 
        className="transform origin-center"
        style={{
            transform: `scale(${scale})`,
            width: `${componentWidth}px`,
            height: `${componentHeight}px`,
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
