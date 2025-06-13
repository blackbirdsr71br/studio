
'use client';

import type { DesignComponent } from '@/types/compose-spec';
import { useDesign } from '@/contexts/DesignContext';
import { cn } from '@/lib/utils';
import { TextView } from './component-renderer/TextView';
import { ButtonView } from './component-renderer/ButtonView';
import { ImageView } from './component-renderer/ImageView';
import { ContainerView } from './component-renderer/ContainerView'; 
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
  } | null>(null);


  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.CANVAS_COMPONENT_ITEM,
    item: { id: component.id, type: ItemTypes.CANVAS_COMPONENT_ITEM },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
    canDrag: () => ![ROOT_SCAFFOLD_ID, DEFAULT_TOP_APP_BAR_ID, DEFAULT_CONTENT_LAZY_COLUMN_ID, DEFAULT_BOTTOM_NAV_BAR_ID].includes(component.id),
  }));

  const [{ canDrop, isOver }, drop] = useDrop(() => ({
    accept: [ItemTypes.COMPONENT_LIBRARY_ITEM, ItemTypes.CANVAS_COMPONENT_ITEM],
    canDrop: (item: DraggedCanvasItem | DraggedLibraryItem, monitor) => {
      // Prevent dropping onto itself
      if (monitor.getItemType() === ItemTypes.CANVAS_COMPONENT_ITEM && (item as DraggedCanvasItem).id === component.id) {
        return false;
      }
      // Prevent dropping into its own children/descendants
      if (monitor.getItemType() === ItemTypes.CANVAS_COMPONENT_ITEM) {
        let currentParentIdToCheck = component.parentId;
        while (currentParentIdToCheck) {
          if (currentParentIdToCheck === (item as DraggedCanvasItem).id) return false;
          const parentComponent = getComponentById(currentParentIdToCheck);
          currentParentIdToCheck = parentComponent ? parentComponent.parentId : null;
        }
      }

      // Target must be a container type
      if (!isContainerType(component.type, customComponentTemplates)) {
        return false;
      }
      
      // Allow drops into TopAppBar, BottomNavBar, ContentArea, or their container descendants
      const isTargetTopAppBar = component.id === DEFAULT_TOP_APP_BAR_ID;
      const isTargetBottomNavBar = component.id === DEFAULT_BOTTOM_NAV_BAR_ID;
      const isTargetContentArea = component.id === DEFAULT_CONTENT_LAZY_COLUMN_ID;

      if (isTargetTopAppBar || isTargetBottomNavBar || isTargetContentArea) {
        return true;
      }

      // Check if descendant of allowed areas
      let tempParent = getComponentById(component.parentId || "");
      while(tempParent){
        if(tempParent.id === DEFAULT_TOP_APP_BAR_ID || 
           tempParent.id === DEFAULT_BOTTOM_NAV_BAR_ID || 
           tempParent.id === DEFAULT_CONTENT_LAZY_COLUMN_ID){
          return true; // Is a descendant of one of the primary drop zones
        }
        if (tempParent.id === ROOT_SCAFFOLD_ID) break; // Stop if we reach scaffold root without finding a zone
        tempParent = getComponentById(tempParent.parentId || "");
      }
      
      return false; // If not one of the primary zones or their container descendants
    },
    drop: (item: DraggedCanvasItem | DraggedLibraryItem, monitor) => {
      if (monitor.didDrop()) return;
      
      let targetParentIdForDrop = component.id;
      // If the direct drop target component itself isn't a container (e.g., a Text inside TopAppBar),
      // then the item should be added to the parent of this non-container component (which should be the TopAppBar).
      if (!isContainerType(component.type, customComponentTemplates)) {
         targetParentIdForDrop = component.parentId || DEFAULT_CONTENT_LAZY_COLUMN_ID; 
      }


      const itemTypeFromMonitor = monitor.getItemType();
      if (itemTypeFromMonitor === ItemTypes.COMPONENT_LIBRARY_ITEM) {
        const libraryItem = item as DraggedLibraryItem;
        addComponent(libraryItem.type, targetParentIdForDrop);
      } else if (itemTypeFromMonitor === ItemTypes.CANVAS_COMPONENT_ITEM) {
        const canvasItem = item as DraggedCanvasItem;
        if (canvasItem.id !== targetParentIdForDrop) { 
          moveComponent(canvasItem.id, targetParentIdForDrop);
        }
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver({ shallow: true }), // shallow: true means only for this specific component, not if over a child
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
    const childrenToRender = (component.properties.children || [])
      .map(id => getComponentById(id))
      .filter(Boolean) as DesignComponent[];
    
    switch (component.type) {
      case 'Scaffold':
        const topBarChild = childrenToRender.find(c => c.id === DEFAULT_TOP_APP_BAR_ID);
        const contentChild = childrenToRender.find(c => c.id === DEFAULT_CONTENT_LAZY_COLUMN_ID);
        const bottomBarChild = childrenToRender.find(c => c.id === DEFAULT_BOTTOM_NAV_BAR_ID);
        
        return (
          <div className="flex flex-col w-full h-full">
            {topBarChild && (
              <div style={{ flexShrink: 0, width: '100%', height: `${topBarChild.properties.height || 30}px` }} className="flex w-full">
                <RenderedComponentWrapper component={topBarChild} />
              </div>
            )}
            {contentChild && (
              <div
                style={{ flexGrow: 1, minHeight: 0, overflowY: 'auto', width: '100%' }}
                className={cn("flex w-full", "scrollbar-hidden")}
              >
                <RenderedComponentWrapper component={contentChild} />
              </div>
            )}
            {bottomBarChild && (
              <div style={{ flexShrink: 0, width: '100%', height: `${bottomBarChild.properties.height || 48}px` }} className="flex w-full">
                 <RenderedComponentWrapper component={bottomBarChild} />
              </div>
            )}
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
      case 'LazyColumn': 
        return <ContainerView component={component} childrenComponents={childrenToRender} isRow={false} />;

      case 'Row':
      case 'LazyRow':
      case 'LazyVerticalGrid': 
      case 'LazyHorizontalGrid': 
      case 'TopAppBar': 
      case 'BottomNavigationBar':
        return <ContainerView component={component} childrenComponents={childrenToRender} isRow={true} />;
      
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
             const isTemplateRootRowLike = rootTemplateComponent ? ['Row', 'LazyRow', 'LazyVerticalGrid', 'TopAppBar', 'BottomNavigationBar'].includes(rootTemplateComponent.type) : false;
             return <ContainerView component={component} childrenComponents={childrenToRender} isRow={isTemplateRootRowLike} />;
           }
        }
        return <div className="p-2 border border-dashed border-red-500 text-xs">Unknown: {component.type}</div>;
    }
  };
  
  const getDimensionValue = (propName: 'width' | 'height', propValue: any, fillValue: boolean | undefined, componentType: string, componentId: string): string => {
    if (componentId === ROOT_SCAFFOLD_ID) return '100%'; 
    
    if (component.parentId === ROOT_SCAFFOLD_ID) { // TopAppBar, ContentLazyColumn, BottomNavBar
        if (propName === 'width') return '100%';
        // Height for these is now controlled by the Scaffold's rendering logic via direct style on their divs
        if (componentId === DEFAULT_CONTENT_LAZY_COLUMN_ID && propName === 'height') return '100%'; // It will grow
        // For TopAppBar/BottomNavBar, their height is set by Scaffold's direct style on the wrapper div based on their own height prop
        // so here we can return 'auto' or '100%' to fill their allocated slot.
        return '100%'; 
    }

    if (fillValue) return '100%';
    if (propValue === 'match_parent') return '100%';
    if (propValue === 'wrap_content') return 'auto';
    if (isNumericValue(propValue)) return `${propValue}px`;
    return 'auto';
  };
  
  const wrapperStyle: React.CSSProperties = {
    transition: isDragging || isResizing ? 'none' : 'box-shadow 0.2s ease-in-out, border-color 0.2s ease-in-out',
    width: getDimensionValue('width', component.properties.width, component.properties.fillMaxWidth, component.type, component.id),
    height: getDimensionValue('height', component.properties.height, component.properties.fillMaxHeight, component.type, component.id),
    position: 'relative', 
  };
  
  if (component.id === ROOT_SCAFFOLD_ID) {
    wrapperStyle.backgroundColor = component.properties.backgroundColor || 'transparent';
  }
  if (component.id === DEFAULT_CONTENT_LAZY_COLUMN_ID) {
    wrapperStyle.backgroundColor = component.properties.backgroundColor || 'hsl(var(--background))'; 
  }


  if (component.type === 'Image' || component.type === 'Card' || (component.properties.cornerRadiusTopLeft || 0) > 0 || (component.properties.cornerRadiusTopRight || 0) > 0 || (component.properties.cornerRadiusBottomLeft || 0) > 0 || (component.properties.cornerRadiusBottomRight || 0) > 0) {
    wrapperStyle.overflow = 'hidden'; 
    wrapperStyle.borderTopLeftRadius = `${component.properties.cornerRadiusTopLeft || 0}px`;
    wrapperStyle.borderTopRightRadius = `${component.properties.cornerRadiusTopRight || 0}px`;
    wrapperStyle.borderBottomRightRadius = `${component.properties.cornerRadiusBottomRight || 0}px`;
    wrapperStyle.borderBottomLeftRadius = `${component.properties.cornerRadiusBottomLeft || 0}px`;
  }

  const containerDropTargetStyle = (isContainerType(component.type, customComponentTemplates)) && isOver && canDrop
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

  const flexItemClass = (component.parentId === ROOT_SCAFFOLD_ID || component.id === ROOT_SCAFFOLD_ID) ? 'flex w-full' : '';


  return (
    <div
      ref={ref}
      style={wrapperStyle}
      className={cn(
        'p-0.5 border border-transparent', 
        flexItemClass,
        {
          'ring-4 ring-primary ring-offset-[6px] ring-offset-background shadow-lg': isSelected && ![ROOT_SCAFFOLD_ID, DEFAULT_TOP_APP_BAR_ID, DEFAULT_CONTENT_LAZY_COLUMN_ID, DEFAULT_BOTTOM_NAV_BAR_ID].includes(component.id),
          'ring-2 ring-accent ring-offset-2 ring-offset-background': isSelected && [DEFAULT_TOP_APP_BAR_ID, DEFAULT_CONTENT_LAZY_COLUMN_ID, DEFAULT_BOTTOM_NAV_BAR_ID].includes(component.id),
          'opacity-50': isDragging,
          'cursor-grab': !isResizing && ![ROOT_SCAFFOLD_ID, DEFAULT_TOP_APP_BAR_ID, DEFAULT_CONTENT_LAZY_COLUMN_ID, DEFAULT_BOTTOM_NAV_BAR_ID, 'Spacer'].includes(component.id) && component.type !== 'Spacer',
          'cursor-default': component.type === 'Spacer' || [ROOT_SCAFFOLD_ID, DEFAULT_TOP_APP_BAR_ID, DEFAULT_BOTTOM_NAV_BAR_ID].includes(component.id), 
          'cursor-grabbing': isDragging,
        },
        containerDropTargetStyle,
        (component.id === ROOT_SCAFFOLD_ID) ? 'flex' : '' 
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
          {showVerticalResizeHandles && !showHorizontalResizeHandles && (['n', 's'] as HandleType[]).map(handle => (
            <div key={handle} className={`resize-handle ${handle}`} onMouseDown={(e) => handleMouseDownOnResizeHandle(e, handle)} />
          ))}
          {showHorizontalResizeHandles && !showVerticalResizeHandles && (['e', 'w'] as HandleType[]).map(handle => (
            <div key={handle} className={`resize-handle ${handle}`} onMouseDown={(e) => handleMouseDownOnResizeHandle(e, handle)} />
          ))}
        </>
      )}
    </div>
  );
}
