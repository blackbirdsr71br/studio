
'use client';

import React, { useRef, useCallback } from 'react';
import { useDesign } from '@/contexts/DesignContext';
import type { ComponentType, DesignComponent } from '@/types/compose-spec';
import { RenderedComponentWrapper } from './RenderedComponentWrapper';
import { cn } from '@/lib/utils';
import { useDrop, type XYCoord } from 'react-dnd';
import { ItemTypes } from '@/lib/dnd-types';

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
        addComponent(libItem.type, null, { x: dropX, y: dropY });
      } else if (itemType === ItemTypes.CANVAS_COMPONENT_ITEM) {
        const canvasItem = item as CanvasItem;
        const draggedComponent = getComponentById(canvasItem.id);
        if (draggedComponent && !draggedComponent.parentId) {
            moveComponent(canvasItem.id, null, { x: dropX, y: dropY });
        } else if (draggedComponent) {
            moveComponent(canvasItem.id, null, { x: dropX, y: dropY });
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
    if (e.target === surfaceRef.current) {
      selectComponent(null);
    }
  };

  const rootComponents = components.filter(c => !c.parentId);

  return (
    <div
      ref={surfaceRef}
      className={cn(
        "bg-background relative overflow-auto border-2 border-transparent transition-colors duration-200",
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
      {rootComponents.map((component) => (
        <RenderedComponentWrapper key={component.id} component={component} />
      ))}
      {components.length === 0 && (
         <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground pointer-events-none p-4 text-center">
            <p className="text-lg">Drag components here to start designing</p>
            <p className="text-xs mt-1">(This is your app screen)</p>
        </div>
      )}
       {components.length === 1 && components[0].id === "default-root-lazy-column" && components[0].properties.children?.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground pointer-events-none p-4 text-center">
            <p className="text-lg">Drag components into the Root Canvas</p>
            <p className="text-xs mt-1">(This is your app screen)</p>
        </div>
      )}
    </div>
  );
}

