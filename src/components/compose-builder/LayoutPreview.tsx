
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
  // Typically, the panel width is 256px, minus padding of 16px on each side = 224px.
  // The scrollbar reduces this slightly more, let's use a safe value.
  const previewContainerWidth = 200; 

  // Calculate the scale factor to fit the entire MobileFrame within the preview container width
  const scale = previewContainerWidth / FRAME_WIDTH;

  return (
    <div 
        className="w-full h-full flex items-center justify-center overflow-hidden bg-background relative"
    >
      <div 
        className="transform-gpu" 
        style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: FRAME_WIDTH,
            height: FRAME_HEIGHT,
            transform: `translate(-50%, -50%) scale(${scale})`,
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
