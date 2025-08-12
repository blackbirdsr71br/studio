
'use client';

import React, { useRef, useLayoutEffect, useState } from 'react';
import type { CustomComponentTemplate, DesignComponent } from '@/types/compose-spec';
import { ReadonlyRenderedComponentWrapper } from './component-renderer/ReadonlyRenderedComponentWrapper';

interface TemplatePreviewProps {
  template: CustomComponentTemplate;
}

export function TemplatePreview({ template }: TemplatePreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  const getTemplateComponentById = (id: string): DesignComponent | undefined => {
    return template.componentTree.find(c => c.id === id);
  };
  
  const rootComponent = getTemplateComponentById(template.rootComponentId);

  useLayoutEffect(() => {
    if (!containerRef.current || !contentRef.current || !rootComponent) return;

    const containerWidth = containerRef.current.clientWidth;
    const containerHeight = containerRef.current.clientHeight;

    // Use defined properties, but fallback to something reasonable if not set
    const contentWidth = typeof rootComponent.properties.width === 'number' ? rootComponent.properties.width : 200;
    const contentHeight = typeof rootComponent.properties.height === 'number' ? rootComponent.properties.height : 150;

    if (contentWidth > 0 && contentHeight > 0) {
        const scaleX = containerWidth / contentWidth;
        const scaleY = containerHeight / contentHeight;
        setScale(Math.min(scaleX, scaleY, 1)); // Use the smaller scale factor, don't scale up
    }

  }, [rootComponent]);


  if (!rootComponent) {
    return <div className="p-2 text-xs text-destructive">Preview Error: Root component not found.</div>;
  }
  
  const componentWidth = typeof rootComponent.properties.width === 'number' ? rootComponent.properties.width : 200;
  const componentHeight = typeof rootComponent.properties.height === 'number' ? rootComponent.properties.height : 150;
  
  return (
    <div 
        ref={containerRef}
        className="w-full h-full flex items-center justify-center bg-background"
    >
      <div 
        ref={contentRef}
        className="transform origin-center"
        style={{
            width: `${componentWidth}px`,
            height: `${componentHeight}px`,
            transform: `scale(${scale})`,
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
