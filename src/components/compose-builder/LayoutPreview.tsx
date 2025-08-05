
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
  const previewContainerHeight = (previewContainerWidth * 16) / 9; // Maintain aspect ratio if needed, but we mostly care about width scale

  // Calculate the scale factor to fit the entire MobileFrame within the preview container width
  const scale = previewContainerWidth / FRAME_WIDTH;

  return (
    <div 
        className="w-full h-full flex items-center justify-center overflow-hidden bg-background"
    >
      <div 
        className="transform-gpu origin-center" // Use transform-gpu for better performance
        style={{
            // Scale the entire mobile frame down to fit
            transform: `scale(${scale})`,
            // Set the origin to the top-left to avoid weird positioning issues
            transformOrigin: 'top left',
            // Define a size for the container of the scaled element
            // Width should match the frame width to calculate scale against
            width: FRAME_WIDTH,
            // Height should match frame height
            height: FRAME_HEIGHT,
            // Translate the element to center it within the container after scaling
            // This is a bit tricky, but ensures it looks centered
            position: 'absolute',
            top: '50%',
            left: '50%',
            marginLeft: `-${FRAME_WIDTH / 2}px`,
            marginTop: `-${FRAME_HEIGHT / 2}px`,
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
