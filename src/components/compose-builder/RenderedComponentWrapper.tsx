
'use client';

import type { DesignComponent } from '@/types/compose-spec';
import { useDesign } from '@/contexts/DesignContext';
import { cn } from '@/lib/utils';
import { TextView } from './component-renderer/TextView';
import { ButtonView } from './component-renderer/ButtonView';
import { ImageView } from './component-renderer/ImageView';
import { ContainerView } from './component-renderer/ContainerView';
import React, { useState, useEffect, useRef } from 'react';
import { useDrag, useDrop, type XYCoord } from 'react-dnd';
import { ItemTypes } from '@/lib/dnd-types';
import { isContainerType } from '@/types/compose-spec';

interface RenderedComponentWrapperProps {
  component: DesignComponent;
}

interface DraggedCanvasItem {
  id: string;
  type: typeof ItemTypes.CANVAS_COMPONENT_ITEM; // To distinguish from library items
}

interface DraggedLibraryItem {
  type: string; // ComponentType or custom templateId
}


export function RenderedComponentWrapper({ component }: RenderedComponentWrapperProps) {
  const { selectedComponentId, selectComponent, getComponentById, addComponent, moveComponent, customComponentTemplates } = useDesign();
  const ref = useRef<HTMLDivElement>(null);

  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.CANVAS_COMPONENT_ITEM,
    item: { id: component.id, type: ItemTypes.CANVAS_COMPONENT_ITEM }, // Add type explicitly
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
    // Optional: canDrag can be used to prevent dragging certain items if needed
    // canDrag: () => !component.properties.isLocked, 
  }));

  const [{ canDrop, isOver }, drop] = useDrop(() => ({
    accept: [ItemTypes.COMPONENT_LIBRARY_ITEM, ItemTypes.CANVAS_COMPONENT_ITEM],
    canDrop: (item: DraggedCanvasItem | DraggedLibraryItem, monitor) => {
      if (!isContainerType(component.type, customComponentTemplates)) {
        return false; // Only containers can be drop targets
      }
      // Prevent dropping a component onto itself
      if ('id' in item && item.id === component.id) {
        return false;
      }
      // TODO: Prevent dropping a parent into one of its own children (cycle prevention)
      // This would require traversing up the tree from `component.id` to see if `item.id` is an ancestor.
      return true;
    },
    hover: (item: DraggedCanvasItem | DraggedLibraryItem, monitor) => {
      // You can add hover effects here if needed, e.g., for reordering within a list
      // For now, the main visual cue will be on the container itself via isOver
    },
    drop: (item: DraggedCanvasItem | DraggedLibraryItem, monitor) => {
      if (monitor.didDrop() || !isContainerType(component.type, customComponentTemplates)) {
        // If already handled by a child, or this isn't a container, bail.
        return;
      }

      const itemTypeFromMonitor = monitor.getItemType(); // More reliable way to get the type of the dragged item

      if (itemTypeFromMonitor === ItemTypes.COMPONENT_LIBRARY_ITEM) {
        const libraryItem = item as DraggedLibraryItem;
        // Dropping a NEW component from the library into this container
        // Position within the container is usually handled by flex/grid, not absolute coords
        addComponent(libraryItem.type, component.id);
      } else if (itemTypeFromMonitor === ItemTypes.CANVAS_COMPONENT_ITEM) {
        const canvasItem = item as DraggedCanvasItem;
        // Moving an EXISTING component into this container
        if (canvasItem.id !== component.id) { // Ensure not dropping onto self
          moveComponent(canvasItem.id, component.id);
        }
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver({ shallow: true }), // shallow: true for nested drop targets
      canDrop: monitor.canDrop(),
    }),
  }), [component.id, component.type, addComponent, moveComponent, customComponentTemplates, isContainerType]);

  // Attach drag and drop refs
  drag(drop(ref)); // If it's a container, it's both draggable and a drop target. If not, drop is a no-op.

  const [position, setPosition] = useState({ x: component.properties.x || 0, y: component.properties.y || 0 });

  useEffect(() => {
    if (!component.parentId) {
      setPosition({ x: component.properties.x || 0, y: component.properties.y || 0 });
    }
  }, [component.properties.x, component.properties.y, component.parentId]);

  const isSelected = component.id === selectedComponentId;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    selectComponent(component.id);
  };

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
             return <ContainerView component={component} childrenComponents={children} isRow={false} />;
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
    transition: isDragging ? 'none' : 'box-shadow 0.2s ease-in-out, border-color 0.2s ease-in-out',
  };

  // Visual feedback for drop target (container)
  const containerDropTargetStyle = isContainerType(component.type, customComponentTemplates) && isOver && canDrop 
    ? 'drag-over-container' // This class is defined in DesignSurface global styles
    : '';

  return (
    <div
      ref={ref}
      style={wrapperStyle}
      className={cn(
        'p-0.5 border border-transparent hover:border-primary/50',
        {
          'ring-2 ring-primary ring-offset-2 shadow-lg !border-primary': isSelected,
          'opacity-50': isDragging, // Visual feedback for dragging item
        },
        containerDropTargetStyle // Visual feedback for container being hovered over
      )}
      onClick={handleClick}
      data-component-id={component.id}
    >
      {renderSpecificComponent()}
    </div>
  );
}
