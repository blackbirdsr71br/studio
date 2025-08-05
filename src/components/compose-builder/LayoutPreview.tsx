
'use client';

import React from 'react';
import type { SavedLayout, DesignComponent } from '@/types/compose-spec';
import { ReadonlyRenderedComponentWrapper } from './component-renderer/ReadonlyRenderedComponentWrapper';
import { ROOT_SCAFFOLD_ID } from '@/types/compose-spec';
import { MobileFrame } from './MobileFrame';

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
  
  const previewContainerWidth = 200; 
  const previewContainerHeight = (previewContainerWidth * 16) / 9;

  // Use the actual frame dimensions for accurate scaling
  const frameWidth = 432 + (8 * 2); // SCREEN_WIDTH_TARGET + (FRAME_BODY_PADDING * 2) from MobileFrame.tsx
  const frameHeight = 896 + (8 * 2) + 24 + 4; // SCREEN_HEIGHT_TARGET + paddings + speaker bar from MobileFrame.tsx

  const scale = Math.min(previewContainerWidth / frameWidth, previewContainerHeight / frameHeight, 1);

  return (
    <div 
        className="w-full h-full flex items-center justify-center overflow-hidden bg-background"
    >
      <div 
        className="transform origin-center"
        style={{
            transform: `scale(${scale})`,
            transformOrigin: 'center center',
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
