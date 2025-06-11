
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
import { isContainerType, DEFAULT_ROOT_LAZY_COLUMN_ID, isCustomComponentType } from '@/types/compose-spec';

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

const MIN_DIMENSION = 20;

const isNumericValue = (value: any): boolean => {
  if (value === null || value === undefined || typeof value === 'boolean') {
    return false;
  }
  if (typeof value === 'number' && !isNaN(value)) {
    return true;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    if (value === 'match_parent' || value === 'wrap_content') return false;
    return !isNaN(Number(value));
  }
  return false;
};


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
      if (monitor.getItemType() === ItemTypes.CANVAS_COMPONENT_ITEM && (item as DraggedCanvasItem).id === component.id) {
        return false;
      }
      if (monitor.getItemType() === ItemTypes.CANVAS_COMPONENT_ITEM) {
        let currentParentId = component.parentId;
        while(currentParentId) {
            if (currentParentId === (item as DraggedCanvasItem).id) return false;
            const parentComponent = getComponentById(currentParentId);
            currentParentId = parentComponent ? parentComponent.parentId : null;
        }
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
        const canvasItem = item as CanvasItem;
        if (canvasItem.id !== component.id) {
          moveComponent(canvasItem.id, component.id);
        }
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver({ shallow: true }),
      canDrop: monitor.canDrop(),
    }),
  }), [component.id, component.type, component.parentId, addComponent, moveComponent, customComponentTemplates, getComponentById, isContainerType]);

  drag(drop(ref));

  const isSelected = component.id === selectedComponentId;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    selectComponent(component.id);
  };

  const handleMouseDownOnResizeHandle = useCallback((event: React.MouseEvent<HTMLDivElement>, handle: HandleType) => {
    event.stopPropagation();
    event.preventDefault();
    if (component.id === DEFAULT_ROOT_LAZY_COLUMN_ID) return;

    selectComponent(component.id);
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
      
      if (resizeDetails.handle.includes('e')) newWidth = resizeDetails.initialWidth + dx;
      if (resizeDetails.handle.includes('w')) newWidth = resizeDetails.initialWidth - dx;
      if (resizeDetails.handle.includes('s')) newHeight = resizeDetails.initialHeight + dy;
      if (resizeDetails.handle.includes('n')) newHeight = resizeDetails.initialHeight - dy;
      
      newWidth = Math.max(newWidth, MIN_DIMENSION);
      newHeight = Math.max(newHeight, MIN_DIMENSION);

      const updatedProps: Record<string, any> = {
        width: Math.round(newWidth),
        height: Math.round(newHeight),
        fillMaxWidth: false, // Resizing implies specific dimensions
        fillMaxHeight: false,
      };
      
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
  }, [isResizing, resizeDetails, component.id, updateComponent]);


  const renderSpecificComponent = () => {
    const childrenComponents = (component.properties.children || [])
      .map(id => getComponentById(id))
      .filter(Boolean) as DesignComponent[];
    
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
        return <ContainerView component={component} childrenComponents={childrenComponents} isRow={false} />;

      case 'Row':
      case 'LazyRow':
      case 'LazyVerticalGrid': 
      case 'LazyHorizontalGrid': 
        return <ContainerView component={component} childrenComponents={childrenComponents} isRow={['Row', 'LazyRow', 'LazyVerticalGrid'].includes(component.type)} />;
      
      case 'Spacer':
        return (
          <div
            style={{
              width: isNumericValue(component.properties.width) ? `${component.properties.width}px` : '8px',
              height: isNumericValue(component.properties.height) ? `${component.properties.height}px` : '8px',
              flexShrink: 0,
            }}
            className="select-none"
          />
        );

      default:
        if (isCustomComponentType(component.type)) {
           const template = customComponentTemplates.find(t => t.templateId === component.type);
           if (template) {
             const rootTemplateComponent = template.componentTree.find(c => c.id === template.rootComponentId);
             const isTemplateRootRowLike = rootTemplateComponent ? ['Row', 'LazyRow', 'LazyVerticalGrid'].includes(rootTemplateComponent.type) : false;
             return <ContainerView component={component} childrenComponents={childrenComponents} isRow={isTemplateRootRowLike} />;
           }
        }
        return <div className="p-2 border border-dashed border-red-500 text-xs">Unknown: {component.type}</div>;
    }
  };
  
  const getDimensionValue = (propValue: any, fillValue: boolean | undefined): string => {
    if (fillValue) return '100%';
    if (propValue === 'match_parent') return '100%';
    if (propValue === 'wrap_content') return 'auto';
    if (isNumericValue(propValue)) return `${propValue}px`;
    return 'auto'; // Fallback for undefined or other non-numeric strings
  };
  
  const wrapperStyle: React.CSSProperties = {
    transition: isDragging || isResizing ? 'none' : 'box-shadow 0.2s ease-in-out, border-color 0.2s ease-in-out',
    width: getDimensionValue(component.properties.width, component.properties.fillMaxWidth),
    height: getDimensionValue(component.properties.height, component.properties.fillMaxHeight),
    position: component.id === DEFAULT_ROOT_LAZY_COLUMN_ID || component.parentId ? 'relative' : 'absolute',
    left: component.id !== DEFAULT_ROOT_LAZY_COLUMN_ID && !component.parentId ? `${component.properties.x || 0}px` : undefined,
    top: component.id !== DEFAULT_ROOT_LAZY_COLUMN_ID && !component.parentId ? `${component.properties.y || 0}px` : undefined,
  };
  
  if (component.id === DEFAULT_ROOT_LAZY_COLUMN_ID) {
      wrapperStyle.width = '100%';
      wrapperStyle.height = '100%';
  } else if (component.type === 'Image' || component.type === 'Card' || (component.properties.cornerRadiusTopLeft || 0) > 0 || (component.properties.cornerRadiusTopRight || 0) > 0 || (component.properties.cornerRadiusBottomLeft || 0) > 0 || (component.properties.cornerRadiusBottomRight || 0) > 0) {
    wrapperStyle.overflow = 'hidden';
    wrapperStyle.borderTopLeftRadius = `${component.properties.cornerRadiusTopLeft || 0}px`;
    wrapperStyle.borderTopRightRadius = `${component.properties.cornerRadiusTopRight || 0}px`;
    wrapperStyle.borderBottomRightRadius = `${component.properties.cornerRadiusBottomRight || 0}px`;
    wrapperStyle.borderBottomLeftRadius = `${component.properties.cornerRadiusBottomLeft || 0}px`;
  }

  const containerDropTargetStyle = isContainerType(component.type, customComponentTemplates) && isOver && canDrop 
    ? 'drag-over-container'
    : '';

  const showResizeHandles = isSelected &&
                          component.id !== DEFAULT_ROOT_LAZY_COLUMN_ID &&
                          !component.properties.fillMaxWidth && // Don't show width handles if fillMaxWidth
                          !component.properties.fillMaxHeight && // Don't show height handles if fillMaxHeight
                          isNumericValue(component.properties.width) &&
                          isNumericValue(component.properties.height);
  
  const showHorizontalResizeHandles = isSelected &&
                                component.id !== DEFAULT_ROOT_LAZY_COLUMN_ID &&
                                !component.properties.fillMaxWidth &&
                                isNumericValue(component.properties.width);

  const showVerticalResizeHandles = isSelected &&
                              component.id !== DEFAULT_ROOT_LAZY_COLUMN_ID &&
                              !component.properties.fillMaxHeight &&
                              isNumericValue(component.properties.height);


  return (
    <div
      ref={ref}
      style={wrapperStyle}
      className={cn(
        'p-0.5 border border-transparent hover:border-primary/50', 
        {
          'ring-2 ring-primary ring-offset-2 shadow-lg': isSelected && component.id !== DEFAULT_ROOT_LAZY_COLUMN_ID,
          'opacity-50': isDragging,
          'cursor-grab': !isResizing && component.id !== DEFAULT_ROOT_LAZY_COLUMN_ID && component.type !== 'Spacer',
          'cursor-default': component.type === 'Spacer',
          'cursor-grabbing': isDragging,
        },
        containerDropTargetStyle
      )}
      onClick={handleClick}
      data-component-id={component.id}
      data-component-type={component.type}
    >
      {renderSpecificComponent()}
      {component.type !== 'Spacer' && (
        <>
          {showVerticalResizeHandles && showHorizontalResizeHandles && (['nw', 'ne', 'sw', 'se'] as HandleType[]).map(handle => (
            <div key={handle} className={`resize-handle ${handle}`} onMouseDown={(e) => handleMouseDownOnResizeHandle(e, handle)} />
          ))}
          {showVerticalResizeHandles && (['n', 's'] as HandleType[]).map(handle => (
            <div key={handle} className={`resize-handle ${handle}`} onMouseDown={(e) => handleMouseDownOnResizeHandle(e, handle)} />
          ))}
          {showHorizontalResizeHandles && (['e', 'w'] as HandleType[]).map(handle => (
            <div key={handle} className={`resize-handle ${handle}`} onMouseDown={(e) => handleMouseDownOnResizeHandle(e, handle)} />
          ))}
        </>
      )}
    </div>
  );
}
