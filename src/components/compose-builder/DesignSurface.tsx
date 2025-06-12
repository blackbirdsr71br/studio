
'use client';

import React, { useRef } from 'react';
import { useDesign } from '@/contexts/DesignContext';
import type { DesignComponent } from '@/types/compose-spec';
import { RenderedComponentWrapper } from './RenderedComponentWrapper';
import { cn } from '@/lib/utils';
// useDrop, XYCoord, ItemTypes are not directly used by DesignSurface anymore for root drops
import { ROOT_SCAFFOLD_ID, DEFAULT_CONTENT_LAZY_COLUMN_ID } from '@/types/compose-spec';

export function DesignSurface() {
  const { components, selectComponent } = useDesign();
  const surfaceRef = useRef<HTMLDivElement>(null);

  const handleSurfaceClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // If click is directly on the surface (e.g. MobileFrame background visible through transparent Scaffold),
    // select the content area (LazyColumn) of the root Scaffold.
    if (e.target === surfaceRef.current) {
       selectComponent(DEFAULT_CONTENT_LAZY_COLUMN_ID);
    }
  };
  
  const rootScaffoldComponent = components.find(c => c.id === ROOT_SCAFFOLD_ID && c.parentId === null);

  let showPlaceholder = false;
  if (rootScaffoldComponent) {
    const contentArea = components.find(c => c.id === DEFAULT_CONTENT_LAZY_COLUMN_ID && c.parentId === ROOT_SCAFFOLD_ID);
    if (contentArea && (!contentArea.properties.children || contentArea.properties.children.length === 0)) {
      showPlaceholder = true;
    }
  } else {
    // Should not happen if context initializes correctly
    showPlaceholder = true; 
  }

  return (
    <div
      ref={surfaceRef}
      className={cn(
        "bg-background relative border-2 border-transparent", 
        "w-full h-full", 
        "flex flex-col overflow-hidden" // Ensures Scaffold (if it's the only root) fills space
      )}
      onClick={handleSurfaceClick}
      id="design-surface"
    >
      <style jsx global>{`
        /* drag-over-surface is no longer needed here, drop is handled by content area */
        .drag-over-container { 
          outline: 2px dashed hsl(var(--accent));
          background-color: hsla(var(--accent-hsl, 291 64% 42%) / 0.1) !important; 
        }
        .resize-handle {
          position: absolute;
          width: 12px; /* Increased size */
          height: 12px; /* Increased size */
          background-color: hsl(var(--primary));
          border: 1px solid hsl(var(--primary-foreground));
          border-radius: 2px;
          z-index: 10; 
        }
        .resize-handle.nw { cursor: nwse-resize; top: -6px; left: -6px; } /* Adjusted offset */
        .resize-handle.ne { cursor: nesw-resize; top: -6px; right: -6px; } /* Adjusted offset */
        .resize-handle.sw { cursor: nesw-resize; bottom: -6px; left: -6px; } /* Adjusted offset */
        .resize-handle.se { cursor: nwse-resize; bottom: -6px; right: -6px; } /* Adjusted offset */
        .resize-handle.n { cursor: ns-resize; top: -6px; left: 50%; transform: translateX(-50%); } /* Adjusted offset */
        .resize-handle.s { cursor: ns-resize; bottom: -6px; left: 50%; transform: translateX(-50%); } /* Adjusted offset */
        .resize-handle.w { cursor: ew-resize; top: 50%; left: -6px; transform: translateY(-50%); } /* Adjusted offset */
        .resize-handle.e { cursor: ew-resize; top: 50%; right: -6px; transform: translateY(-50%); } /* Adjusted offset */
      `}</style>
      
      {/* DesignSurface now only renders the single root Scaffold component */}
      {rootScaffoldComponent ? (
        <RenderedComponentWrapper component={rootScaffoldComponent} />
      ) : (
         <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground pointer-events-none p-4 text-center">
            <p className="text-lg">Scaffold not found. Initializing...</p>
        </div>
      )}

      {/* Placeholder is now conceptually inside the content LazyColumn, managed by its RenderedComponentWrapper */}
      {/* This placeholder logic might need to move or be adapted if DesignSurface no longer directly sees contentAreaComponent's children */}
    </div>
  );
}
