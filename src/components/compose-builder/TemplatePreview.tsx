
'use client';

import React from 'react';
import type { CustomComponentTemplate, DesignComponent, M3Theme } from '@/types/compose-spec';
import { RenderedComponentWrapper } from './component-renderer/RenderedComponentWrapper';
import { useDesign } from '@/contexts/DesignContext';
import { MobileFrame } from './MobileFrame';

interface TemplatePreviewProps {
  template: CustomComponentTemplate;
}

export function TemplatePreview({ template }: TemplatePreviewProps) {
  const { m3Theme } = useDesign();
  
  const getTemplateComponentById = (id: string): DesignComponent | undefined => {
    return template.componentTree.find(c => c.id === id);
  };
  
  const rootComponent = getTemplateComponentById(template.rootComponentId);

  if (!rootComponent) {
    return <div className="p-2 text-xs text-destructive">Preview Error: Root component not found.</div>;
  }
  
  const componentWidth = typeof rootComponent.properties.width === 'number' ? rootComponent.properties.width : 200;
  const componentHeight = typeof rootComponent.properties.height === 'number' ? rootComponent.properties.height : 150;
  
  return (
    <div 
        className="w-full h-full flex items-center justify-center bg-background"
    >
      <div 
        className="relative"
        style={{
            width: `${componentWidth}px`,
            height: `${componentHeight}px`,
            transform: `scale(${Math.min(220 / componentWidth, 60 / componentHeight)})`,
            transformOrigin: 'center center'
        }}
      >
        {/* We wrap with a simplified MobileFrame to inject the theme context */}
        <MobileFrame isPreview={true} themeOverride={m3Theme} getComponentById={getTemplateComponentById}>
            <RenderedComponentWrapper
                component={rootComponent}
                isPreview={true}
                getComponentById={getTemplateComponentById}
            />
        </MobileFrame>
      </div>
    </div>
  );
}
