
'use client';

import React, { useRef, useCallback } from 'react';
import { useDesign } from '@/contexts/DesignContext';
import type { ComponentType } from '@/types/compose-spec';
import { RenderedComponentWrapper } from './RenderedComponentWrapper';
import { cn } from '@/lib/utils';

export function DesignSurface() {
  const { components, addComponent, selectComponent, selectedComponentId, updateComponentPosition, moveComponent, getComponentById } = useDesign();
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
      const currentlyDraggedComponent = getComponentById(draggedComponentId);

      if (parentContainerId && parentContainerId !== draggedComponentId) { // Dropped into a valid container (and not itself)
          moveComponent(draggedComponentId, parentContainerId);
          // Position update for children is handled by CSS flex layout, not absolute x/y.
          // No need to call updateComponentPosition here if it's becoming a child.
      } else if (!parentContainerId) { // Dropped onto root canvas
          // If component was child and now on root, or was on root and moved on root
          if (currentlyDraggedComponent && currentlyDraggedComponent.parentId !== null) {
             moveComponent(draggedComponentId, null); // Ensure parent is set to null
          }
          // Always update position if dropped on root, regardless of previous parent.
          updateComponentPosition(draggedComponentId, { x: dropX, y: dropY });
      }
      // If parentContainerId IS draggedComponentId, do nothing (can't drop into self - DesignContext handles this).
      // If parentContainerId is null and draggedComponent was already on root, only position is updated (handled by updateComponentPosition).
    }
    
    // Clean up drag-over classes from all elements that might have it
    document.querySelectorAll('.drag-over-surface, .drag-over-container').forEach(el => {
        el.classList.remove('drag-over-surface', 'drag-over-container');
    });

  }, [addComponent, updateComponentPosition, moveComponent, getComponentById]);

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault(); 
    event.dataTransfer.dropEffect = "move";

    // Clear previous drag-over highlights on other elements before applying to current target
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
            surfaceRef.current?.classList.remove('drag-over-surface'); // Remove surface highlight if over container
            return; // Found a container, highlight it and stop
        }
        targetElement = targetElement.parentElement as HTMLElement;
    }
    // If no container was found by traversing up, and we are over the surfaceRef itself
    if (!onContainer && surfaceRef.current) {
        surfaceRef.current.classList.add('drag-over-surface');
    }
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    // Check if the mouse is leaving for a child element; if so, don't remove class yet.
    if (event.currentTarget.contains(event.relatedTarget as Node)) {
      return;
    }
    (event.currentTarget as HTMLElement).classList.remove('drag-over-surface', 'drag-over-container');
    
    // If leaving the surface itself, clear all container highlights too
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
        "w-full h-full" 
      )}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
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
          background-color: hsla(var(--accent-hsl), 0.1); /* Ensure --accent-hsl is defined or use a direct HSL value */
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
