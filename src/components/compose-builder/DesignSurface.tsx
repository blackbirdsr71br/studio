
'use client';

import React, { useRef, useCallback } from 'react';
import { useDesign } from '@/contexts/DesignContext';
import type { ComponentType } from '@/types/compose-spec';
import { RenderedComponentWrapper } from './RenderedComponentWrapper';
import { cn } from '@/lib/utils';

export function DesignSurface() {
  const { components, addComponent, selectComponent, selectedComponentId, updateComponentPosition, moveComponent } = useDesign();
  const surfaceRef = useRef<HTMLDivElement>(null);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    
    const surfaceBounds = surfaceRef.current?.getBoundingClientRect();
    if (!surfaceBounds) return;

    const droppedComponentType = event.dataTransfer.getData("application/component-type") as ComponentType;
    const draggedComponentId = event.dataTransfer.getData("application/component-id");

    const dropX = event.clientX - surfaceBounds.left;
    const dropY = event.clientY - surfaceBounds.top;

    // Determine if dropping onto a container
    let targetElement = event.target as HTMLElement;
    let parentContainerId: string | null = null;
    while (targetElement && targetElement !== surfaceRef.current) {
        if (targetElement.classList.contains('component-container')) {
            parentContainerId = targetElement.dataset.containerId || null;
            break;
        }
        targetElement = targetElement.parentElement as HTMLElement;
    }

    if (droppedComponentType) { // New component from library
        addComponent(droppedComponentType, parentContainerId, { x: dropX, y: dropY });
    } else if (draggedComponentId) { // Moving existing component
      if (parentContainerId && parentContainerId !== draggedComponentId) { // Dropped into a valid container
          moveComponent(draggedComponentId, parentContainerId);
          // Position update for children is handled by CSS flex layout, not absolute x/y
      } else if (!parentContainerId) { // Dropped onto root canvas
          moveComponent(draggedComponentId, null); // Set parent to null
          updateComponentPosition(draggedComponentId, { x: dropX, y: dropY });
      }
    }
    
    (event.target as HTMLElement).classList.remove('drag-over-surface', 'drag-over-container');

  }, [addComponent, updateComponentPosition, moveComponent]);

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault(); // Necessary to allow drop
    event.dataTransfer.dropEffect = "move";

    let targetElement = event.target as HTMLElement;
    let onContainer = false;
     while (targetElement && targetElement !== surfaceRef.current) {
        if (targetElement.classList.contains('component-container')) {
            onContainer = true;
            targetElement.classList.add('drag-over-container');
            break;
        }
        targetElement = targetElement.parentElement as HTMLElement;
    }
    if (!onContainer && surfaceRef.current) {
        surfaceRef.current.classList.add('drag-over-surface');
    }
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    (event.target as HTMLElement).classList.remove('drag-over-surface', 'drag-over-container');
    let relatedTarget = event.relatedTarget as Node | null;
    // Ensure drag leave doesn't remove class if still over a child
    if (surfaceRef.current && relatedTarget && surfaceRef.current.contains(relatedTarget)) {
        return;
    }
    surfaceRef.current?.classList.remove('drag-over-surface');
    document.querySelectorAll('.drag-over-container').forEach(el => el.classList.remove('drag-over-container'));
  };

  const handleSurfaceClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Deselect if clicked on empty surface area
    if (e.target === surfaceRef.current) {
      selectComponent(null);
    }
  };

  const rootComponents = components.filter(c => !c.parentId);

  return (
    <div
      ref={surfaceRef}
      className={cn(
        "bg-background relative overflow-auto border-2 border-transparent transition-colors duration-200", // Removed flex-grow as size is dictated by MobileFrame
        "drag-over-surface:border-primary/50 drag-over-surface:bg-primary/10", // Adjusted drag-over style
        "w-full h-full" // Ensure it fills the 'screen' area of MobileFrame
      )}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={handleSurfaceClick}
      id="design-surface"
      // style={{ minHeight: '400px' }} // This is now controlled by the frame
    >
      <style jsx global>{`
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
