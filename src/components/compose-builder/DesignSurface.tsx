
'use client';

import React, { useRef, useCallback } from 'react';
import { useDesign } from '@/contexts/DesignContext';
import type { ComponentType, DesignComponent } from '@/types/compose-spec';
import { RenderedComponentWrapper } from './RenderedComponentWrapper';
import { cn } from '@/lib/utils';
import { useDrop, type XYCoord } from 'react-dnd';
import { ItemTypes } from '@/lib/dnd-types';

interface LibraryItem {
  type: ComponentType | string; // Can be base type or custom templateId
}

export function DesignSurface() {
  const { components, addComponent, selectComponent, updateComponentPosition, moveComponent, getComponentById } = useDesign();
  const surfaceRef = useRef<HTMLDivElement>(null);

  const [{ isOverCanvas, canDropOnCanvas }, dropRef] = useDrop(() => ({
    accept: ItemTypes.COMPONENT_LIBRARY_ITEM,
    drop: (item: LibraryItem, monitor) => {
      const surfaceBounds = surfaceRef.current?.getBoundingClientRect();
      if (!surfaceBounds) return;

      const clientOffset = monitor.getClientOffset();
      if (!clientOffset) return;
      
      let dropX = clientOffset.x - surfaceBounds.left;
      let dropY = clientOffset.y - surfaceBounds.top;
      let parentContainerId: string | null = null;

      // Check if dropping onto a container. We need to iterate up from the actual drop target element.
      // monitor.getTargetIds() might give drop targets, but we need the *specific* one from event.
      // This part is tricky because react-dnd abstracts the native event target for its items.
      // For new items, let's simplify: if a react-dnd drop target *is* a container, use its ID.
      // This requires containers to also be drop targets for ItemTypes.COMPONENT_LIBRARY_ITEM.
      // For now, we assume new library items are dropped onto the main surface (root) or a specific container target.
      // To make library items droppable into containers, those containers (RenderedComponentWrapper for them)
      // would also need to be `useDrop` targets accepting library items.
      // Let's assume for now that addComponent handles the dropPosition relative to the parent correctly if parentId is given.
      
      // Simplified: For library items, they are always added to root for now via this drop.
      // To drop into containers, containers themselves would need to be drop targets for library items.
      // The current logic adds to root based on surface drop.
      addComponent(item.type, null, { x: dropX, y: dropY });
    },
    collect: (monitor) => ({
      isOverCanvas: !!monitor.isOver() && monitor.canDrop(),
      canDropOnCanvas: !!monitor.canDrop(),
    }),
  }), [addComponent]);

  // Attach the react-dnd drop ref to the surface
  dropRef(surfaceRef);

  const handleNativeDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    
    const surfaceBounds = surfaceRef.current?.getBoundingClientRect();
    if (!surfaceBounds) return;

    const draggedComponentId = event.dataTransfer.getData("application/component-id");
    
    if (draggedComponentId) { // Moving existing component (native D&D)
      const dropX = event.clientX - surfaceBounds.left;
      const dropY = event.clientY - surfaceBounds.top;
      let targetElement = event.target as HTMLElement;
      let parentContainerId: string | null = null;

      // Traverse up to find if the drop target is within a container or is the surface itself
      let currentElement: HTMLElement | null = targetElement;
      while (currentElement && currentElement !== surfaceRef.current) {
          if (currentElement.classList.contains('component-container')) {
              parentContainerId = currentElement.dataset.containerId || null;
              break;
          }
          currentElement = currentElement.parentElement;
      }
      
      const currentlyDraggedComponent = getComponentById(draggedComponentId);
      if (!currentlyDraggedComponent) return;

      if (parentContainerId && parentContainerId !== draggedComponentId) { 
          // Dropped into a container
          // Position within container is handled by flex/grid, not absolute x/y.
          // So we don't pass newPosition to moveComponent here for x,y update for the component itself.
          moveComponent(draggedComponentId, parentContainerId);
      } else if (!parentContainerId) {
          // Dropped onto the main surface (becomes a root component)
          // If it was in a container, moveComponent(..., null) handles removing from old parent.
          // Then update its absolute position on the canvas.
          moveComponent(draggedComponentId, null, { x: dropX, y: dropY });
      }
    }
    
    // Clear visual cues
    document.querySelectorAll('.drag-over-surface, .drag-over-container').forEach(el => {
        el.classList.remove('drag-over-surface', 'drag-over-container');
    });

  }, [moveComponent, getComponentById]); // Removed addComponent, updateComponentPosition as moveComponent handles this now

  const handleNativeDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault(); 
    const isDraggingComponent = event.dataTransfer.types.includes("application/component-id");
    const isDraggingLibraryItem = event.dataTransfer.types.includes("application/component-type") || (isOverCanvas && canDropOnCanvas);


    if (isDraggingComponent) { // Moving an existing component
      event.dataTransfer.dropEffect = "move";
    } else if (isDraggingLibraryItem) { // Dragging a new component from library
       event.dataTransfer.dropEffect = "copy";
    } else {
      event.dataTransfer.dropEffect = "none";
      return; // Not a draggable item we care about
    }

    // Visual highlighting for native drag over (for existing components)
    // react-dnd handles its own preview for library items via isOverCanvas state.
    document.querySelectorAll('.drag-over-surface, .drag-over-container').forEach(el => {
      if (el !== event.target && !el.contains(event.target as Node)) {
        el.classList.remove('drag-over-surface', 'drag-over-container');
      }
    });
    
    let targetElement = event.target as HTMLElement;
    let onContainer = false;
     while (targetElement && targetElement !== surfaceRef.current) {
        if (targetElement.classList.contains('component-container') && isDraggingComponent) {
            onContainer = true;
            targetElement.classList.add('drag-over-container');
            surfaceRef.current?.classList.remove('drag-over-surface'); // Remove surface highlight if on container
            return; 
        }
        targetElement = targetElement.parentElement as HTMLElement;
    }
    // If not on a container (or not dragging a component that can go in a container) and on surface
    if (!onContainer && surfaceRef.current && (isDraggingComponent || isDraggingLibraryItem)) {
        surfaceRef.current.classList.add('drag-over-surface');
    }
  };

  const handleNativeDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    // Only remove class if the mouse truly left the element, not just moved to a child
    if (event.currentTarget.contains(event.relatedTarget as Node)) {
      return;
    }
    (event.currentTarget as HTMLElement).classList.remove('drag-over-surface', 'drag-over-container');
    // If leaving the main surface, clear all container highlights too
    if (event.currentTarget === surfaceRef.current) {
        document.querySelectorAll('.drag-over-container').forEach(el => el.classList.remove('drag-over-container'));
    }
  };

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
          // Highlight from react-dnd for new library items
          // Native D&D for existing components uses direct class manipulation in onDragOver
          'drag-over-surface': isOverCanvas && canDropOnCanvas && !document.querySelector('.drag-over-container'), 
        }
      )}
      onDrop={handleNativeDrop} 
      onDragOver={handleNativeDragOver} 
      onDragLeave={handleNativeDragLeave} 
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
          background-color: hsla(var(--accent-hsl), 0.1); 
        }
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
    </div>
  );
}
