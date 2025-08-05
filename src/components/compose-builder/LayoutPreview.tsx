
'use client';

import React from 'react';
import type { SavedLayout, DesignComponent } from '@/types/compose-spec';
import { ReadonlyRenderedComponentWrapper } from './component-renderer/ReadonlyRenderedComponentWrapper';
import { ROOT_SCAFFOLD_ID } from '@/types/compose-spec';
import { MobileFrame, FRAME_WIDTH, FRAME_HEIGHT } from './MobileFrame';

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
  
  // These are the dimensions of the container this preview will be in
  const previewContainerWidth = 200; 
  const previewContainerHeight = (previewContainerWidth * 9) / 16; 

  // Calculate the scale factor to fit the entire MobileFrame within the preview container
  const scale = Math.min(
    previewContainerWidth / FRAME_WIDTH, 
    previewContainerHeight / FRAME_HEIGHT, 
    1
  );

  return (
    <div 
        className="w-full h-full flex items-center justify-center overflow-hidden bg-background"
    >
      <div 
        className="transform-gpu origin-center" // Use transform-gpu for better performance
        style={{
            transform: `scale(${scale})`,
            transformOrigin: 'center center',
            // Define a size for the div that contains the scaled element
            // This helps the browser with layout calculation.
            width: FRAME_WIDTH,
            height: FRAME_HEIGHT,
        }}
      >
          <MobileFrame isPreview={true}>
            <ReadonlyRenderedComponentWrapper
                component={rootComponent}
                getComponentById={getLayoutComponentById}
                isPreview={true}
            />
          </MobileFrame>
      </div>
    </div>
  );
}
