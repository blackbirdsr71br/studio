
'use client';

import type { DesignComponent } from '@/types/compose-spec';
import { useDesign } from '@/contexts/DesignContext';
import { cn } from '@/lib/utils';
import { TextView } from './component-renderer/TextView';
import { ButtonView } from './component-renderer/ButtonView';
import { ImageView } from './component-renderer/ImageView';
import { ContainerView } from './component-renderer/ContainerView';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useDrag, useDrop, type XYCoord } from 'react-dnd';
import { ItemTypes } from '@/lib/dnd-types';
import { isContainerType, DEFAULT_ROOT_LAZY_COLUMN_ID } from '@/types/compose-spec';

interface RenderedComponentWrapperProps {
  component: DesignComponent;
}

interface DraggedCanvasItem {
  id: string;
  type: typeof ItemTypes.CANVAS_COMPONENT_ITEM;
}

interface DraggedLibraryItem {
  type: string;
}

type HandleType = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

const MIN_DIMENSION = 20; // Minimum width/height in pixels

export function RenderedComponentWrapper({ component }: RenderedComponentWrapperProps) {
  const { selectedComponentId, selectComponent, getComponentById, addComponent, moveComponent, updateComponent, customComponentTemplates } = useDesign();
  const ref = useRef<HTMLDivElement>(null);

  const [isResizing, setIsResizing] = useState(false);
  const [resizeDetails, setResizeDetails] = useState<{
    handle: HandleType;
    startX: number;
    startY: number;
    initialWidth: number;
    initialHeight: number;
    initialCompX: number;
    initialCompY: number;
  } | null>(null);


  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.CANVAS_COMPONENT_ITEM,
    item: { id: component.id, type: ItemTypes.CANVAS_COMPONENT_ITEM },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
    canDrag: () => component.id !== DEFAULT_ROOT_LAZY_COLUMN_ID,
  }));

  const [{ canDrop, isOver }, drop] = useDrop(() => ({
    accept: [ItemTypes.COMPONENT_LIBRARY_ITEM, ItemTypes.CANVAS_COMPONENT_ITEM],
    canDrop: (item: DraggedCanvasItem | DraggedLibraryItem, monitor) => {
      if (!isContainerType(component.type, customComponentTemplates)) {
        return false;
      }
      if ('id' in item && item.id === component.id) {
        return false;
      }
      return true;
    },
    drop: (item: DraggedCanvasItem | DraggedLibraryItem, monitor) => {
      if (monitor.didDrop() || !isContainerType(component.type, customComponentTemplates)) {
        return;
      }
      const itemTypeFromMonitor = monitor.getItemType();
      if (itemTypeFromMonitor === ItemTypes.COMPONENT_LIBRARY_ITEM) {
        const libraryItem = item as DraggedLibraryItem;
        addComponent(libraryItem.type, component.id);
      } else if (itemTypeFromMonitor === ItemTypes.CANVAS_COMPONENT_ITEM) {
        const canvasItem = item as DraggedCanvasItem;
        if (canvasItem.id !== component.id) {
          moveComponent(canvasItem.id, component.id);
        }
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver({ shallow: true }),
      canDrop: monitor.canDrop(),
    }),
  }), [component.id, component.type, addComponent, moveComponent, customComponentTemplates, isContainerType]);

  drag(drop(ref));

  const [position, setPosition] = useState({ x: component.properties.x || 0, y: component.properties.y || 0 });

  useEffect(() => {
    if (!component.parentId) {
      setPosition({ x: component.properties.x || 0, y: component.properties.y || 0 });
    }
  }, [component.properties.x, component.properties.y, component.parentId]);

  const isSelected = component.id === selectedComponentId;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (component.id !== DEFAULT_ROOT_LAZY_COLUMN_ID) {
      selectComponent(component.id);
    } else {
      selectComponent(DEFAULT_ROOT_LAZY_COLUMN_ID); // Allow selecting root but not showing handles etc.
    }
  };

  // Resize Handlers
  const handleMouseDownOnResizeHandle = useCallback((event: React.MouseEvent<HTMLDivElement>, handle: HandleType) => {
    event.stopPropagation();
    event.preventDefault();
    if (component.id === DEFAULT_ROOT_LAZY_COLUMN_ID) return;

    selectComponent(component.id); // Ensure component is selected when starting resize
    setIsResizing(true);
    
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;

    setResizeDetails({
      handle,
      startX: event.clientX,
      startY: event.clientY,
      initialWidth: rect.width,
      initialHeight: rect.height,
      initialCompX: component.properties.x || 0,
      initialCompY: component.properties.y || 0,
    });
  }, [component.id, component.properties.x, component.properties.y, selectComponent]);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!isResizing || !resizeDetails || !ref.current) return;

      const dx = event.clientX - resizeDetails.startX;
      const dy = event.clientY - resizeDetails.startY;

      let newWidth = resizeDetails.initialWidth;
      let newHeight = resizeDetails.initialHeight;
      let newX = resizeDetails.initialCompX;
      let newY = resizeDetails.initialCompY;

      // Calculate new dimensions and position based on handle
      if (resizeDetails.handle.includes('e')) {
        newWidth = resizeDetails.initialWidth + dx;
      }
      if (resizeDetails.handle.includes('w')) {
        newWidth = resizeDetails.initialWidth - dx;
        if (!component.parentId) newX = resizeDetails.initialCompX + dx;
      }
      if (resizeDetails.handle.includes('s')) {
        newHeight = resizeDetails.initialHeight + dy;
      }
      if (resizeDetails.handle.includes('n')) {
        newHeight = resizeDetails.initialHeight - dy;
        if (!component.parentId) newY = resizeDetails.initialCompY + dy;
      }
      
      newWidth = Math.max(newWidth, MIN_DIMENSION);
      newHeight = Math.max(newHeight, MIN_DIMENSION);

      const updatedProps: Record<string, any> = {
        width: Math.round(newWidth),
        height: Math.round(newHeight),
      };

      if (!component.parentId) { // Only update x,y for root components
        if (resizeDetails.handle.includes('w') || resizeDetails.handle.includes('n')) {
           if (newX !== resizeDetails.initialCompX) updatedProps.x = Math.round(newX);
           if (newY !== resizeDetails.initialCompY) updatedProps.y = Math.round(newY);
        }
      }
      
      updateComponent(component.id, { properties: updatedProps });
    };

    const handleMouseUp = () => {
      if (isResizing) {
        setIsResizing(false);
        setResizeDetails(null);
      }
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, resizeDetails, component.id, component.parentId, updateComponent]);


  const renderSpecificComponent = () => {
    const children = (component.properties.children || []).map(id => getComponentById(id)).filter(Boolean) as DesignComponent[];
    
    switch (component.type) {
      case 'Text':
        return <TextView properties={component.properties} />;
      case 'Button':
        return <ButtonView properties={component.properties} />;
      case 'Image':
        return <ImageView properties={component.properties} />;
      
      case 'Column':
      case 'Box':
      case 'Card':
      case 'LazyColumn':
        return <ContainerView component={component} childrenComponents={children} isRow={false} />;

      case 'Row':
      case 'LazyRow':
      case 'LazyVerticalGrid':
      case 'LazyHorizontalGrid': 
        return <ContainerView component={component} childrenComponents={children} isRow={true} />;
      
      default:
        if (component.type.startsWith("custom/")) {
           const template = customComponentTemplates.find(t => t.templateId === component.type);
           if (template) {
             // For custom components, we treat their root as a container for rendering purposes if it's a container type
             // The specific layout (row/column) depends on the template's root component type.
             // This might need refinement if custom components can have non-container roots but still accept children.
             // For now, assume if it has children, its root behaves like a container.
             const rootTemplateComponent = template.componentTree.find(c => c.id === template.rootComponentId);
             const isTemplateRootRowLike = rootTemplateComponent ? ['Row', 'LazyRow', 'LazyHorizontalGrid'].includes(rootTemplateComponent.type) : false;
             return <ContainerView component={component} childrenComponents={children} isRow={isTemplateRootRowLike} />;
           }
        }
        return <div className="p-2 border border-dashed border-red-500">Unknown: {component.type}</div>;
    }
  };

  const absolutePositionStyle: React.CSSProperties = !component.parentId ? {
    position: 'absolute',
    left: `${position.x}px`,
    top: `${position.y}px`,
  } : {
    position: 'relative', 
  };

  const wrapperStyle: React.CSSProperties = {
    ...absolutePositionStyle,
    transition: isDragging || isResizing ? 'none' : 'box-shadow 0.2s ease-in-out, border-color 0.2s ease-in-out',
    width: component.properties.width === 'match_parent' ? '100%' : component.properties.width === 'wrap_content' ? 'auto' : `${component.properties.width}px`,
    height: component.properties.height === 'match_parent' ? '100%' : component.properties.height === 'wrap_content' ? 'auto' : `${component.properties.height}px`,
  };
  
  if (component.id === DEFAULT_ROOT_LAZY_COLUMN_ID) {
      wrapperStyle.width = '100%';
      wrapperStyle.height = '100%';
  }


  const containerDropTargetStyle = isContainerType(component.type, customComponentTemplates) && isOver && canDrop 
    ? 'drag-over-container'
    : '';

  const showResizeHandles = isSelected && component.id !== DEFAULT_ROOT_LAZY_COLUMN_ID;

  return (
    <div
      ref={ref}
      style={wrapperStyle}
      className={cn(
        'p-0.5 border border-transparent hover:border-primary/50',
        {
          'ring-2 ring-primary ring-offset-2 shadow-lg !border-primary': isSelected && component.id !== DEFAULT_ROOT_LAZY_COLUMN_ID,
          'opacity-50': isDragging,
          'cursor-grab': !isResizing && component.id !== DEFAULT_ROOT_LAZY_COLUMN_ID,
          'cursor-grabbing': isDragging,
        },
        containerDropTargetStyle
      )}
      onClick={handleClick}
      data-component-id={component.id}
    >
      {renderSpecificComponent()}
      {showResizeHandles && (
        <>
          {(['nw', 'ne', 'sw', 'se', 'n', 's', 'e', 'w'] as HandleType[]).map(handle => (
            <div
              key={handle}
              className={`resize-handle ${handle}`}
              onMouseDown={(e) => handleMouseDownOnResizeHandle(e, handle)}
            />
          ))}
        </>
      )}
    </div>
  );
}

