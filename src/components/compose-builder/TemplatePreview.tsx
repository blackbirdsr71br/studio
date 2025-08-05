
'use client';

import React from 'react';
import type { CustomComponentTemplate, DesignComponent } from '@/types/compose-spec';
import { useDesign } from '@/contexts/DesignContext';
import { RenderedComponentWrapper } from './component-renderer/RenderedComponentWrapper';
import { MobileFrame } from './MobileFrame';

interface TemplatePreviewProps {
  template: CustomComponentTemplate;
}

export function TemplatePreview({ template }: TemplatePreviewProps) {
  const { getComponentById: getTemplateComponentById } = useDesign();

  // Create a temporary "DesignProvider" like environment for the preview.
  const previewContext = {
    components: template.componentTree,
    getComponentById: (id: string) => template.componentTree.find(c => c.id === id),
  };

  const rootComponent = previewContext.getComponentById(template.rootComponentId);

  if (!rootComponent) {
    return <div className="p-2 text-xs text-destructive">Preview Error: Root component not found.</div>;
  }

  // Override the getComponentById for child components to use the template's tree
  const originalGetComponentById = useDesign().getComponentById;
  (useDesign as any).prototype.getComponentById = previewContext.getComponentById;


  return (
    <div 
        className="w-full h-full transform scale-[0.2] origin-top-left bg-background"
        style={{'--zoom-level': 0.2} as React.CSSProperties}
    >
      <div className="w-[500%] h-[500%]">
          <RenderedComponentWrapper
            component={rootComponent}
            isPreview={true}
          />
      </div>
    </div>
  );
}
