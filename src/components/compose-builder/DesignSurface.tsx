
'use client';

import React, { useRef, useCallback } from 'react';
import { useDesign } from '@/contexts/DesignContext';
import type { ComponentType, DesignComponent } from '@/types/compose-spec';
import { RenderedComponentWrapper } from './RenderedComponentWrapper';
import { cn } from '@/lib/utils';
import { useDrop, type XYCoord } from 'react-dnd';
import { ItemTypes } from '@/lib/dnd-types';
import { DEFAULT_ROOT_LAZY_COLUMN_ID } from '@/types/compose-spec';

interface LibraryItem {
  type: ComponentType | string; 
}

interface CanvasItem {
  id: string; 
  type: typeof ItemTypes.CANVAS_COMPONENT_ITEM;
}

export function DesignSurface() {
  const { components, addComponent, selectComponent, moveComponent, getComponentById } = useDesign();
  const surfaceRef = useRef<HTMLDivElement>(null);

  const [{ isOverSurface, canDropOnSurface }, dropRef] = useDrop(() => ({
    accept: [ItemTypes.COMPONENT_LIBRARY_ITEM, ItemTypes.CANVAS_COMPONENT_ITEM],
    drop: (item: LibraryItem | CanvasItem, monitor) => {
      const surfaceBounds = surfaceRef.current?.getBoundingClientRect();
      if (!surfaceBounds || monitor.didDrop()) return; 

      const clientOffset = monitor.getClientOffset();
      if (!clientOffset) return;
      
      const dropX = clientOffset.x - surfaceBounds.left;
      const dropY = clientOffset.y - surfaceBounds.top;
      
      const itemType = monitor.getItemType();

      if (itemType === ItemTypes.COMPONENT_LIBRARY_ITEM) {
        const libItem = item as LibraryItem;
        // Pass null as parentId for direct surface drops, addComponent in context will handle centering
        addComponent(libItem.type, null, { x: dropX, y: dropY });
      } else if (itemType === ItemTypes.CANVAS_COMPONENT_ITEM) {
        const canvasItem = item as CanvasItem;
        const draggedComponent = getComponentById(canvasItem.id);
        if (draggedComponent) {
            let finalX = dropX;
            let finalY = dropY;
            let offsetX = 0;
            let offsetY = 0;

            const compWidth = draggedComponent.properties.width;
            const compHeight = draggedComponent.properties.height;

            if (typeof compWidth === 'number') {
                offsetX = compWidth / 2;
            } else if (compWidth && typeof compWidth === 'string' && !['match_parent', 'wrap_content'].includes(compWidth)) {
                const parsedWidth = parseFloat(compWidth);
                if (!isNaN(parsedWidth)) offsetX = parsedWidth / 2;
            }

            if (typeof compHeight === 'number') {
                offsetY = compHeight / 2;
            } else if (compHeight && typeof compHeight === 'string' && !['match_parent', 'wrap_content'].includes(compHeight)) {
                const parsedHeight = parseFloat(compHeight);
                if (!isNaN(parsedHeight)) offsetY = parsedHeight / 2;
            }
            finalX = dropX - offsetX;
            finalY = dropY - offsetY;

            // Pass null as parentId for direct surface drops, moveComponent in context will handle x,y
            moveComponent(canvasItem.id, null, { x: Math.round(finalX), y: Math.round(finalY) });
        }
      }
    },
    collect: (monitor) => ({
      isOverSurface: !!monitor.isOver({ shallow: true }), 
      canDropOnSurface: !!monitor.canDrop(),
    }),
  }), [addComponent, moveComponent, getComponentById]);

  dropRef(surfaceRef); 

  const handleSurfaceClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // When clicking the surface itself, we select nothing (or a conceptual root)
    // For now, let's make it select null to deselect any component.
    // Or, if DEFAULT_ROOT_LAZY_COLUMN_ID is meant to be selectable when clicking empty space,
    // then selectComponent(DEFAULT_ROOT_LAZY_COLUMN_ID);
    if (e.target === surfaceRef.current) {
       selectComponent(null); // Deselect if clicking on empty surface
    }
  };
  
  // Render free-floating components (parentId is null)
  const freeFloatingComponents = components.filter(c => c.parentId === null);

  // The DEFAULT_ROOT_LAZY_COLUMN_ID might be one of the freeFloatingComponents if its parentId is null.
  // If it's not, it means it was parented to something else, which is unlikely for the root.

  let showPlaceholder = false;
  let placeholderText = "";
  
  // Show placeholder if there are no free-floating components other than potentially the root,
  // and the root itself (if it's the only thing) has no children.
  const rootComponent = components.find(c => c.id === DEFAULT_ROOT_LAZY_COLUMN_ID);
  if (freeFloatingComponents.length === 0) {
    showPlaceholder = true;
    placeholderText = "Drag components onto the canvas";
  } else if (freeFloatingComponents.length === 1 && freeFloatingComponents[0].id === DEFAULT_ROOT_LAZY_COLUMN_ID) {
    if (!rootComponent || (rootComponent.properties.children && rootComponent.properties.children.length === 0)) {
        showPlaceholder = true;
        placeholderText = "Drag components into the Root Canvas or alongside it";
    }
  }


  return (
    <div
      ref={surfaceRef}
      className={cn(
        "bg-background relative border-2 border-transparent transition-colors duration-200", 
        "w-full h-full", 
        { 
          'drag-over-surface': isOverSurface && canDropOnSurface,
        }
      )}
      onClick={handleSurfaceClick}
      id="design-surface"
    >
      <style jsx global>{`
        .drag-over-surface { 
          border-color: hsl(var(--primary) / 0.5) !important;
          background-color: hsl(var(--primary) / 0.1) !important;
        }
        .drag-over-container { 
          outline: 2px dashed hsl(var(--accent));
          background-color: hsla(var(--accent-hsl, 291 64% 42%) / 0.1) !important; 
        }
        .resize-handle {
          position: absolute;
          width: 10px;
          height: 10px;
          background-color: hsl(var(--primary));
          border: 1px solid hsl(var(--primary-foreground));
          border-radius: 2px;
          z-index: 10; 
        }
        .resize-handle.nw { cursor: nwse-resize; top: -5px; left: -5px; }
        .resize-handle.ne { cursor: nesw-resize; top: -5px; right: -5px; }
        .resize-handle.sw { cursor: nesw-resize; bottom: -5px; left: -5px; }
        .resize-handle.se { cursor: nwse-resize; bottom: -5px; right: -5px; }
        .resize-handle.n { cursor: ns-resize; top: -5px; left: 50%; transform: translateX(-50%); }
        .resize-handle.s { cursor: ns-resize; bottom: -5px; left: 50%; transform: translateX(-50%); }
        .resize-handle.w { cursor: ew-resize; top: 50%; left: -5px; transform: translateY(-50%); }
        .resize-handle.e { cursor: ew-resize; top: 50%; right: -5px; transform: translateY(-50%); }
      `}</style>
      
      {freeFloatingComponents.map(component => (
        <RenderedComponentWrapper key={component.id} component={component} />
      ))}

      {showPlaceholder && (
         <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground pointer-events-none p-4 text-center">
            <p className="text-lg">{placeholderText}</p>
            <p className="text-xs mt-1">(This is your app screen)</p>
        </div>
      )}
    </div>
  );
}
