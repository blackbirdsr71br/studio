
'use client';

import React, { useRef, useCallback } from 'react';
import { useDesign } from '@/contexts/DesignContext';
import type { ComponentType, DesignComponent } from '@/types/compose-spec';
import { RenderedComponentWrapper } from './RenderedComponentWrapper';
import { cn } from '@/lib/utils';
import { useDrop, type XYCoord } from 'react-dnd';
import { ItemTypes } from '@/lib/dnd-types';

interface LibraryItem {
  type: ComponentType;
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
      
      const dropX = clientOffset.x - surfaceBounds.left;
      const dropY = clientOffset.y - surfaceBounds.top;

      // Determine if dropping onto a container - for react-dnd, this requires containers to also be drop targets
      // For now, this drop target is only for the main surface for NEW components.
      // The targetElement logic for parentContainerId would need to be integrated with react-dnd's monitor.getTargetIds()
      // if containers were also react-dnd drop targets for library items.
      // For simplicity, we assume new items from library dropped on surface are root items.
      // TODO: Extend to allow dropping new library items directly into react-dnd enabled containers.
      
      addComponent(item.type, null, { x: dropX, y: dropY });
    },
    collect: (monitor) => ({
      isOverCanvas: !!monitor.isOver() && monitor.canDrop(), // isOver applies to this specific drop target
      canDropOnCanvas: !!monitor.canDrop(),
    }),
  }), [addComponent]);

  // Attach the react-dnd drop ref to the surface
  dropRef(surfaceRef);

  // Native HTML5 D&D handlers for moving EXISTING components (for now)
  const handleNativeDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    
    const surfaceBounds = surfaceRef.current?.getBoundingClientRect();
    if (!surfaceBounds) return;

    // Check if react-dnd has handled a drop (e.g. via monitor.didDrop() if we had access to monitor here, or by checking item type)
    // For now, we rely on the dataTransfer type to differentiate.
    const draggedComponentId = event.dataTransfer.getData("application/component-id");
    const droppedComponentType = event.dataTransfer.getData("application/component-type"); // This will be empty if from react-dnd

    if (droppedComponentType) {
      // This case should ideally not happen if react-dnd is capturing library drops.
      // Fallback or ensure react-dnd drop handler stops propagation if it handles it.
      // For safety, let's add the component if data is present.
      // console.warn("Native drop handler caught a library item drop, react-dnd should handle this.");
      // const dropX = event.clientX - surfaceBounds.left;
      // const dropY = event.clientY - surfaceBounds.top;
      // addComponent(droppedComponentType as ComponentType, null, { x: dropX, y: dropY });
      // return; 
      // If react-dnd handles it, this block might not be needed.
      // If react-dnd's drop doesn't stopPropagation, this might run.
    } else if (draggedComponentId) { // Moving existing component (still using native D&D for this part)
      const dropX = event.clientX - surfaceBounds.left;
      const dropY = event.clientY - surfaceBounds.top;
      let targetElement = event.target as HTMLElement;
      let parentContainerId: string | null = null;

      while (targetElement && targetElement !== surfaceRef.current) {
          if (targetElement.classList.contains('component-container')) {
              parentContainerId = targetElement.dataset.containerId || null;
              break;
          }
          targetElement = targetElement.parentElement as HTMLElement;
      }
      
      const currentlyDraggedComponent = getComponentById(draggedComponentId);
      if (parentContainerId && parentContainerId !== draggedComponentId) {
          moveComponent(draggedComponentId, parentContainerId);
      } else if (!parentContainerId) {
          if (currentlyDraggedComponent && currentlyDraggedComponent.parentId !== null) {
             moveComponent(draggedComponentId, null);
          }
          updateComponentPosition(draggedComponentId, { x: dropX, y: dropY });
      }
    }
    
    document.querySelectorAll('.drag-over-surface, .drag-over-container').forEach(el => {
        el.classList.remove('drag-over-surface', 'drag-over-container');
    });

  }, [addComponent, updateComponentPosition, moveComponent, getComponentById]);

  const handleNativeDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault(); 
    // For native D&D of existing components. react-dnd handles its own preview.
    const draggedComponentId = event.dataTransfer.types.includes("application/component-id");
    if (draggedComponentId) {
      event.dataTransfer.dropEffect = "move";
    } else if (event.dataTransfer.types.includes("application/component-type")) {
       // This might be redundant if react-dnd provides visual cues via isOverCanvas
       event.dataTransfer.dropEffect = "copy";
    }


    // Visual highlighting for native drag over
    document.querySelectorAll('.drag-over-surface, .drag-over-container').forEach(el => {
      if (el !== event.target && !el.contains(event.target as Node)) {
        el.classList.remove('drag-over-surface', 'drag-over-container');
      }
    });
    
    let targetElement = event.target as HTMLElement;
    let onContainer = false;
     while (targetElement && targetElement !== surfaceRef.current) {
        if (targetElement.classList.contains('component-container')) {
            onContainer = true;
            targetElement.classList.add('drag-over-container');
            surfaceRef.current?.classList.remove('drag-over-surface');
            return; 
        }
        targetElement = targetElement.parentElement as HTMLElement;
    }
    if (!onContainer && surfaceRef.current && (draggedComponentId || event.dataTransfer.types.includes("application/component-type"))) {
        surfaceRef.current.classList.add('drag-over-surface');
    }
  };

  const handleNativeDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    if (event.currentTarget.contains(event.relatedTarget as Node)) {
      return;
    }
    (event.currentTarget as HTMLElement).classList.remove('drag-over-surface', 'drag-over-container');
    if (event.currentTarget === surfaceRef.current) {
        document.querySelectorAll('.drag-over-container').forEach(el => el.classList.remove('drag-over-container'));
    }
  };

  const handleSurfaceClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Check if the click target is the surface itself, not a child component or part of react-dnd interaction
    if (e.target === surfaceRef.current) {
      selectComponent(null);
    }
  };

  const rootComponents = components.filter(c => !c.parentId);

  return (
    <div
      ref={surfaceRef} // react-dnd's dropRef is already attached. Native handlers use this ref too.
      className={cn(
        "bg-background relative overflow-auto border-2 border-transparent transition-colors duration-200",
        "w-full h-full",
        { 
          'drag-over-surface': isOverCanvas && canDropOnCanvas, // Highlight from react-dnd
        }
      )}
      onDrop={handleNativeDrop} // For existing component moves (native D&D)
      onDragOver={handleNativeDragOver} // For existing component moves (native D&D)
      onDragLeave={handleNativeDragLeave} // For existing component moves (native D&D)
      onClick={handleSurfaceClick}
      id="design-surface"
    >
      <style jsx global>{`
        .drag-over-surface { /* Used by both react-dnd via state and native D&D via direct class manipulation */
          border-color: hsl(var(--primary) / 0.5) !important;
          background-color: hsl(var(--primary) / 0.1) !important;
        }
        .drag-over-container { /* Still used by native D&D for highlighting containers */
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
