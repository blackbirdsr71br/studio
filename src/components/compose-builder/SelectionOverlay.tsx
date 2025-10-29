
'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useDesign } from '@/contexts/DesignContext';
import { CORE_SCAFFOLD_ELEMENT_IDS } from '@/types/compose-spec';

interface SelectionOverlayProps {
  selectionRect: {
    top: number;
    left: number;
    width: number;
    height: number;
  } | null;
  zoomLevel: number;
  componentId: string | null;
}

type HandleType = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';
const MIN_DIMENSION = 20;

export function SelectionOverlay({ selectionRect, zoomLevel, componentId }: SelectionOverlayProps) {
  const { getComponentById, updateComponent } = useDesign();

  const [isResizing, setIsResizing] = useState(false);
  const [resizeDetails, setResizeDetails] = useState<{
    handle: HandleType;
    startX: number;
    startY: number;
    initialWidth: number;
    initialHeight: number;
  } | null>(null);

  const handleMouseDownOnResizeHandle = useCallback((event: React.MouseEvent<HTMLDivElement>, handle: HandleType) => {
    event.stopPropagation();
    event.preventDefault();
    if (!selectionRect) return;

    setIsResizing(true);
    setResizeDetails({
      handle,
      startX: event.clientX,
      startY: event.clientY,
      initialWidth: selectionRect.width,
      initialHeight: selectionRect.height,
    });
  }, [selectionRect]);
  
  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
        if (!isResizing || !resizeDetails || !componentId) return;

        const dx = (event.clientX - resizeDetails.startX);
        const dy = (event.clientY - resizeDetails.startY);

        const currentComponent = getComponentById(componentId);
        if (!currentComponent) return;

        const updatedProps: Record<string, any> = {};

        const initialUnscaledWidth = (resizeDetails.initialWidth - 16) / zoomLevel; 
        const initialUnscaledHeight = (resizeDetails.initialHeight - 16) / zoomLevel;

        const isHorizontalResize = resizeDetails.handle.includes('e') || resizeDetails.handle.includes('w');
        const isVerticalResize = resizeDetails.handle.includes('n') || resizeDetails.handle.includes('s');

        if (isHorizontalResize) {
            let newWidth = initialUnscaledWidth;
            if (resizeDetails.handle.includes('e')) newWidth += (dx / zoomLevel);
            if (resizeDetails.handle.includes('w')) newWidth -= (dx / zoomLevel);
            
            updatedProps.width = Math.round(Math.max(newWidth, MIN_DIMENSION));
            updatedProps.fillMaxWidth = false; 
            updatedProps.fillMaxSize = false;
        }

        if (isVerticalResize) {
            let newHeight = initialUnscaledHeight;
            if (resizeDetails.handle.includes('s')) newHeight += (dy / zoomLevel);
            if (resizeDetails.handle.includes('n')) newHeight -= (dy / zoomLevel);

            updatedProps.height = Math.round(Math.max(newHeight, MIN_DIMENSION));
            updatedProps.fillMaxHeight = false; 
            updatedProps.fillMaxSize = false;
        }

        if (Object.keys(updatedProps).length > 0) {
            updateComponent(componentId, { properties: updatedProps });
        }
    };

    const handleMouseUp = () => {
        if (isResizing) {
            setIsResizing(false);
            setResizeDetails(null);
        }
    };

    if (isResizing) {
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
    };
}, [isResizing, resizeDetails, componentId, updateComponent, zoomLevel, getComponentById]);


  if (!selectionRect || !componentId) {
    return null;
  }

  const component = getComponentById(componentId);
  if (!component) return null;

  const canResizeHorizontally = !CORE_SCAFFOLD_ELEMENT_IDS.includes(component.id) && !component.properties.fillMaxWidth && !component.properties.fillMaxSize;
  const canResizeVertically = !CORE_SCAFFOLD_ELEMENT_IDS.includes(component.id) && !component.properties.fillMaxHeight && !component.properties.fillMaxSize;
  const canResize = canResizeHorizontally || canResizeVertically;

  return (
    <div
      className="pointer-events-none absolute z-50 border-2 border-primary"
      style={{
        top: `${selectionRect.top}px`,
        left: `${selectionRect.left}px`,
        width: `${selectionRect.width}px`,
        height: `${selectionRect.height}px`,
        boxSizing: 'border-box',
      }}
    >
      {canResize && (
        <>
          {canResizeVertically && canResizeHorizontally && ['nw', 'ne', 'sw', 'se'].map(handle => (
            <div key={handle} className={`resize-handle ${handle} pointer-events-auto`} onMouseDown={(e) => handleMouseDownOnResizeHandle(e, handle as HandleType)} />
          ))}
          {canResizeVertically && ['n', 's'].map(handle => (
            <div key={handle} className={`resize-handle ${handle} pointer-events-auto`} onMouseDown={(e) => handleMouseDownOnResizeHandle(e, handle as HandleType)} />
          ))}
          {canResizeHorizontally && ['e', 'w'].map(handle => (
            <div key={handle} className={`resize-handle ${handle} pointer-events-auto`} onMouseDown={(e) => handleMouseDownOnResizeHandle(e, handle as HandleType)} />
          ))}
          <style jsx>{`
            .resize-handle {
              position: absolute;
              width: 12px;
              height: 12px;
              background-color: hsl(var(--primary));
              border: 1px solid hsl(var(--primary-foreground));
              border-radius: 2px;
              z-index: 10; 
            }
            .resize-handle.nw { cursor: nwse-resize; top: -6px; left: -6px; }
            .resize-handle.ne { cursor: nesw-resize; top: -6px; right: -6px; }
            .resize-handle.sw { cursor: nesw-resize; bottom: -6px; left: -6px; }
            .resize-handle.se { cursor: nwse-resize; bottom: -6px; right: -6px; }
            .resize-handle.n { cursor: ns-resize; top: -6px; left: 50%; transform: translateX(-50%); }
            .resize-handle.s { cursor: ns-resize; bottom: -6px; left: 50%; transform: translateX(-50%); }
            .resize-handle.w { cursor: ew-resize; top: 50%; left: -6px; transform: translateY(-50%); }
            .resize-handle.e { cursor: ew-resize; top: 50%; right: -6px; transform: translateY(-50%); }
          `}</style>
        </>
      )}
    </div>
  );
}

    