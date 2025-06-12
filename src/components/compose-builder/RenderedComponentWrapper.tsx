
'use client';

import type { DesignComponent } from '@/types/compose-spec';
import { useDesign } from '@/contexts/DesignContext';
import { cn } from '@/lib/utils';
import { TextView } from './component-renderer/TextView';
import { ButtonView } from './component-renderer/ButtonView';
import { ImageView } from './component-renderer/ImageView';
import { ContainerView } from './component-renderer/ContainerView'; // Used for Column, Row, Box, Card, Lazy*, AppBars
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { ItemTypes } from '@/lib/dnd-types';
import { isContainerType, isCustomComponentType, ROOT_SCAFFOLD_ID, DEFAULT_CONTENT_LAZY_COLUMN_ID, DEFAULT_TOP_APP_BAR_ID, DEFAULT_BOTTOM_NAV_BAR_ID } from '@/types/compose-spec';

interface RenderedComponentWrapperProps {
  component: DesignComponent;
}

interface DraggedCanvasItem {
  id: string;
  type: typeof ItemTypes.CANVAS_COMPONENT_ITEM;
}

interface DraggedLibraryItem {
  type: string; // ComponentType or custom templateId
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
  } | null>(null);


  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.CANVAS_COMPONENT_ITEM,
    item: { id: component.id, type: ItemTypes.CANVAS_COMPONENT_ITEM },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
    // Prevent dragging the root scaffold or its direct slot components
    canDrag: () => ![ROOT_SCAFFOLD_ID, DEFAULT_TOP_APP_BAR_ID, DEFAULT_CONTENT_LAZY_COLUMN_ID, DEFAULT_BOTTOM_NAV_BAR_ID].includes(component.id),
  }));

  const [{ canDrop, isOver }, drop] = useDrop(() => ({
    accept: [ItemTypes.COMPONENT_LIBRARY_ITEM, ItemTypes.CANVAS_COMPONENT_ITEM],
    canDrop: (item: DraggedCanvasItem | DraggedLibraryItem, monitor) => {
      // Only the content LazyColumn (or other user-added containers) can accept drops
      if (component.id !== DEFAULT_CONTENT_LAZY_COLUMN_ID && !isContainerType(component.type, customComponentTemplates)) {
        return false;
      }
      // Prevent dropping on self or into own descendant (standard DND checks)
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
      if (monitor.didDrop()) return;
      
      // Ensure drops only happen on the content area or valid containers within it
      let targetParentIdForDrop = component.id;
      if (component.id !== DEFAULT_CONTENT_LAZY_COLUMN_ID && !isContainerType(component.type, customComponentTemplates)) {
        targetParentIdForDrop = DEFAULT_CONTENT_LAZY_COLUMN_ID; // Fallback to content area
      }


      const itemTypeFromMonitor = monitor.getItemType();
      if (itemTypeFromMonitor === ItemTypes.COMPONENT_LIBRARY_ITEM) {
        const libraryItem = item as DraggedLibraryItem;
        addComponent(libraryItem.type, targetParentIdForDrop);
      } else if (itemTypeFromMonitor === ItemTypes.CANVAS_COMPONENT_ITEM) {
        const canvasItem = item as DraggedCanvasItem;
        if (canvasItem.id !== targetParentIdForDrop) { // Ensure not dropping on self
          moveComponent(canvasItem.id, targetParentIdForDrop);
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
    // Allow selecting Scaffold, TopAppBar, ContentLazyColumn, BottomNavBar
    if ([ROOT_SCAFFOLD_ID, DEFAULT_TOP_APP_BAR_ID, DEFAULT_CONTENT_LAZY_COLUMN_ID, DEFAULT_BOTTOM_NAV_BAR_ID].includes(component.id) || component.parentId === DEFAULT_CONTENT_LAZY_COLUMN_ID || getComponentById(component.parentId || "")?.parentId === DEFAULT_CONTENT_LAZY_COLUMN_ID) {
        selectComponent(component.id);
    } else if (component.parentId) { // For deeper nested components
        selectComponent(component.id);
    }
  };

  const handleMouseDownOnResizeHandle = useCallback((event: React.MouseEvent<HTMLDivElement>, handle: HandleType) => {
    event.stopPropagation();
    event.preventDefault();
    if ([ROOT_SCAFFOLD_ID, DEFAULT_TOP_APP_BAR_ID, DEFAULT_CONTENT_LAZY_COLUMN_ID, DEFAULT_BOTTOM_NAV_BAR_ID].includes(component.id)) return;

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
    });
  }, [component.id, selectComponent]);

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
        fillMaxWidth: false,
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
    // For Scaffold, its children are TopAppBar, ContentLazyColumn, BottomNavBar
    // For other containers, children are user-added components
    const childrenToRender = (component.properties.children || [])
      .map(id => getComponentById(id))
      .filter(Boolean) as DesignComponent[];
    
    switch (component.type) {
      case 'Scaffold': // Scaffold is a flex column orchestrating its slots
        return (
          <div className="flex flex-col w-full h-full">
            {childrenToRender.map(childComp => {
                // Apply specific flex styling for scaffold slots
                let slotStyle: React.CSSProperties = {};
                if (childComp.id === DEFAULT_TOP_APP_BAR_ID || childComp.id === DEFAULT_BOTTOM_NAV_BAR_ID) {
                    slotStyle.flexShrink = 0;
                } else if (childComp.id === DEFAULT_CONTENT_LAZY_COLUMN_ID) {
                    slotStyle.flexGrow = 1;
                    slotStyle.minHeight = 0; // Important for flex-grow in column
                    slotStyle.overflowY = 'auto';
                }
                return (
                    <div key={childComp.id} style={slotStyle} className="flex"> {/* Ensure child RenderedComponentWrapper can expand */}
                        <RenderedComponentWrapper component={childComp} />
                    </div>
                );
            })}
          </div>
        );
      case 'Text':
        return <TextView properties={component.properties} />;
      case 'Button':
        return <ButtonView properties={component.properties} />;
      case 'Image':
        return <ImageView properties={component.properties} />;
      
      case 'Column':
      case 'Box':
      case 'Card':
      case 'LazyColumn': // This now includes the main content LazyColumn
        return <ContainerView component={component} childrenComponents={childrenToRender} isRow={false} />;

      case 'Row':
      case 'LazyRow':
      case 'LazyVerticalGrid': 
      case 'LazyHorizontalGrid': 
      case 'TopAppBar': // TopAppBar and BottomNavBar are rendered as row-like containers
      case 'BottomNavigationBar':
        return <ContainerView component={component} childrenComponents={childrenToRender} isRow={true} />;
      
      case 'Spacer':
        return (
          <div
            style={{
              width: isNumericValue(component.properties.width) ? `${component.properties.width}px` : '8px',
              height: isNumericValue(component.properties.height) ? `${component.properties.height}px` : '8px',
              flexShrink: 0, // Spacers should not shrink
            }}
            className="select-none"
          />
        );

      default:
        if (isCustomComponentType(component.type)) {
           const template = customComponentTemplates.find(t => t.templateId === component.type);
           if (template) {
             const rootTemplateComponent = template.componentTree.find(c => c.id === template.rootComponentId);
             const isTemplateRootRowLike = rootTemplateComponent ? ['Row', 'LazyRow', 'LazyVerticalGrid', 'TopAppBar', 'BottomNavigationBar'].includes(rootTemplateComponent.type) : false;
             return <ContainerView component={component} childrenComponents={childrenToRender} isRow={isTemplateRootRowLike} />;
           }
        }
        return <div className="p-2 border border-dashed border-red-500 text-xs">Unknown: {component.type}</div>;
    }
  };
  
  const getDimensionValue = (propValue: any, fillValue: boolean | undefined, componentType: string, componentId: string): string => {
    if (componentId === ROOT_SCAFFOLD_ID) return '100%'; // Root scaffold always fills
    if (componentType === 'TopAppBar' || componentType === 'BottomNavigationBar' || componentId === DEFAULT_CONTENT_LAZY_COLUMN_ID) {
        // These are direct children of Scaffold and should fill width
        if (propValue === 'height') { // height is fixed or grows for content
             if (isNumericValue(component.properties.height)) return `${component.properties.height}px`;
             return componentId === DEFAULT_CONTENT_LAZY_COLUMN_ID ? '100%' : 'auto'; // Content LazyColumn height is by flex-grow
        }
        return '100%'; // Width is always 100% for these slots
    }

    if (fillValue) return '100%';
    if (propValue === 'match_parent') return '100%';
    if (propValue === 'wrap_content') return 'auto';
    if (isNumericValue(propValue)) return `${propValue}px`;
    return 'auto';
  };
  
  const wrapperStyle: React.CSSProperties = {
    transition: isDragging || isResizing ? 'none' : 'box-shadow 0.2s ease-in-out, border-color 0.2s ease-in-out',
    width: getDimensionValue(component.properties.width, component.properties.fillMaxWidth, component.type, component.id),
    height: getDimensionValue(component.properties.height, component.properties.fillMaxHeight, component.type, component.id),
    position: 'relative', // All components are now relatively positioned within their parent (flex items)
    // No left/top needed for flex items
  };
  
  // Special handling for root scaffold background
  if (component.id === ROOT_SCAFFOLD_ID) {
    wrapperStyle.backgroundColor = component.properties.backgroundColor || 'transparent'; // Or a default canvas bg
  }
  // For content area, ensure its background is distinct or uses theme.
  if (component.id === DEFAULT_CONTENT_LAZY_COLUMN_ID) {
    wrapperStyle.backgroundColor = component.properties.backgroundColor || 'hsl(var(--background))'; // Default to theme background
  }


  if (component.type === 'Image' || component.type === 'Card' || (component.properties.cornerRadiusTopLeft || 0) > 0 || (component.properties.cornerRadiusTopRight || 0) > 0 || (component.properties.cornerRadiusBottomLeft || 0) > 0 || (component.properties.cornerRadiusBottomRight || 0) > 0) {
    wrapperStyle.overflow = 'hidden';
    wrapperStyle.borderTopLeftRadius = `${component.properties.cornerRadiusTopLeft || 0}px`;
    wrapperStyle.borderTopRightRadius = `${component.properties.cornerRadiusTopRight || 0}px`;
    wrapperStyle.borderBottomRightRadius = `${component.properties.cornerRadiusBottomRight || 0}px`;
    wrapperStyle.borderBottomLeftRadius = `${component.properties.cornerRadiusBottomLeft || 0}px`;
  }

  const containerDropTargetStyle = (component.id === DEFAULT_CONTENT_LAZY_COLUMN_ID || isContainerType(component.type, customComponentTemplates)) && isOver && canDrop
    ? 'drag-over-container'
    : '';

  const showResizeHandles = isSelected &&
                          ![ROOT_SCAFFOLD_ID, DEFAULT_TOP_APP_BAR_ID, DEFAULT_CONTENT_LAZY_COLUMN_ID, DEFAULT_BOTTOM_NAV_BAR_ID].includes(component.id) &&
                          !component.properties.fillMaxWidth && 
                          !component.properties.fillMaxHeight && 
                          isNumericValue(component.properties.width) &&
                          isNumericValue(component.properties.height);
  
  const showHorizontalResizeHandles = isSelected &&
                                ![ROOT_SCAFFOLD_ID, DEFAULT_TOP_APP_BAR_ID, DEFAULT_CONTENT_LAZY_COLUMN_ID, DEFAULT_BOTTOM_NAV_BAR_ID].includes(component.id) &&
                                !component.properties.fillMaxWidth &&
                                isNumericValue(component.properties.width);

  const showVerticalResizeHandles = isSelected &&
                              ![ROOT_SCAFFOLD_ID, DEFAULT_TOP_APP_BAR_ID, DEFAULT_CONTENT_LAZY_COLUMN_ID, DEFAULT_BOTTOM_NAV_BAR_ID].includes(component.id) &&
                              !component.properties.fillMaxHeight &&
                              isNumericValue(component.properties.height);


  return (
    <div
      ref={ref}
      style={wrapperStyle}
      className={cn(
        'p-0.5 border border-transparent', // Removed hover:border-primary/50 to avoid nesting issues
        {
          'ring-4 ring-primary ring-offset-[6px] ring-offset-background shadow-lg': isSelected && ![ROOT_SCAFFOLD_ID, DEFAULT_TOP_APP_BAR_ID, DEFAULT_CONTENT_LAZY_COLUMN_ID, DEFAULT_BOTTOM_NAV_BAR_ID].includes(component.id),
           // Special selection for scaffold slots
          'ring-2 ring-accent ring-offset-2 ring-offset-background': isSelected && [DEFAULT_TOP_APP_BAR_ID, DEFAULT_CONTENT_LAZY_COLUMN_ID, DEFAULT_BOTTOM_NAV_BAR_ID].includes(component.id),
          'opacity-50': isDragging,
          'cursor-grab': !isResizing && ![ROOT_SCAFFOLD_ID, DEFAULT_TOP_APP_BAR_ID, DEFAULT_CONTENT_LAZY_COLUMN_ID, DEFAULT_BOTTOM_NAV_BAR_ID, 'Spacer'].includes(component.id) && component.type !== 'Spacer',
          'cursor-default': component.type === 'Spacer' || [ROOT_SCAFFOLD_ID, DEFAULT_TOP_APP_BAR_ID, DEFAULT_BOTTOM_NAV_BAR_ID].includes(component.id), // Make scaffold structure non-grabbable by default
          'cursor-grabbing': isDragging,
        },
        containerDropTargetStyle,
        // Ensure flex layout for direct children of Scaffold's visual slots
        (component.parentId === ROOT_SCAFFOLD_ID || component.id === ROOT_SCAFFOLD_ID) ? 'flex' : '' 
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
