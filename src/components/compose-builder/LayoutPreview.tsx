
'use client';

import React from 'react';
import type { SavedLayout, DesignComponent } from '@/types/compose-spec';
import { ReadonlyRenderedComponentWrapper } from './component-renderer/ReadonlyRenderedComponentWrapper';
import { ROOT_SCAFFOLD_ID } from '@/types/compose-spec';

interface LayoutPreviewProps {
  layout: SavedLayout;
}

export function LayoutPreview({ layout }: LayoutPreviewProps) {
  
  const getLayoutComponentById = (id: string): DesignComponent | undefined => {
    return layout.components.find(c => c.id === id);
  };

  const rootComponent = getLayoutComponentById(ROOT_SCAFFOLD_ID);

  if (!rootComponent) {
    return <div className="p-2 text-xs text-destructive">Preview Error: Root scaffold component not found in layout.</div>;
  }
  
  const previewWidth = 200; 
  const previewHeight = (previewWidth * 16) / 9; 
  
  const componentWidth = 432;
  const componentHeight = 896; 

  const scale = Math.min(previewWidth / componentWidth, previewHeight / componentHeight, 1);

  return (
    <div 
        className="w-full h-full flex items-center justify-center overflow-hidden bg-background"
    >
      <div 
        className="transform origin-center border border-border"
        style={{
            transform: `scale(${scale})`,
            width: `${componentWidth}px`,
            height: `${componentHeight}px`,
        }}
      >
          <ReadonlyRenderedComponentWrapper
            component={rootComponent}
            getComponentById={getLayoutComponentById}
            isPreview={true}
          />
      </div>
    </div>
  );
}
