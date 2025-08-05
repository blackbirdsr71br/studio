
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
  // The container in the panel is a 16:9 box inside a 224px wide column (minus paddings).
  const previewWidth = 200; 
  const previewHeight = (previewWidth * 9) / 16; 
  
  const componentWidth = typeof rootComponent.properties.width === 'number' ? rootComponent.properties.width : previewWidth;
  const componentHeight = typeof rootComponent.properties.height === 'number' ? rootComponent.properties.height : previewHeight;

  // Calculate the scale needed to fit the component's width and height within the preview area.
  // Take the smaller of the two scales to ensure the whole component fits.
  // Add a max scale of 1 so we don't enlarge small components.
  const scale = Math.min(previewWidth / componentWidth, previewHeight / componentHeight, 1);

  return (
    <div 
        className="w-full h-full flex items-center justify-center overflow-hidden bg-background"
    >
      <div 
        className="transform origin-center"
        style={{
            transform: `scale(${scale})`,
            // Set the div size to the component's original size before scaling
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
