
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
type DropIndicatorPosition = 'top' | 'bottom' | null;


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
  const [dropIndicator, setDropIndicator] = useState<DropIndicatorPosition>(null);

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

  const [{ isOverCurrent, canDropCurrent }, drop] = useDrop(() => ({
    accept: [ItemTypes.COMPONENT_LIBRARY_ITEM, ItemTypes.CANVAS_COMPONENT_ITEM],
    hover: (item: DraggedCanvasItem | DraggedLibraryItem, monitor) => {
      if (!ref.current || !monitor.isOver({ shallow: true })) {
        setDropIndicator(null);
        return;
      }
      
      const clientOffset = monitor.getClientOffset();
      if (!clientOffset) {
        setDropIndicator(null);
        return;
      }

      if (monitor.getItemType() === ItemTypes.CANVAS_COMPONENT_ITEM) {
        const draggedInternalItem = item as DraggedCanvasItem;
        const draggedId = draggedInternalItem.id;
        const targetId = component.id;

        if (draggedId === targetId) {
            setDropIndicator(null);
            return;
        }

        const draggedComponent = getComponentById(draggedId);
        // Show reorder indicator only if dragging over a sibling in a valid reorderable parent container
        // (not ROOT_SCAFFOLD_ID itself, but its children like DEFAULT_CONTENT_LAZY_COLUMN_ID are valid parents for reordering).
        if (draggedComponent && 
            draggedComponent.parentId === component.parentId && 
            component.parentId && 
            component.parentId !== ROOT_SCAFFOLD_ID) {
            
            const hoverBoundingRect = ref.current.getBoundingClientRect();
            const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
            const hoverClientY = clientOffset.y - hoverBoundingRect.top;

            if (hoverClientY < hoverMiddleY) {
                setDropIndicator('top');
            } else {
                setDropIndicator('bottom');
            }
        } else {
            setDropIndicator(null);
        }
      } else {
        setDropIndicator(null); // Not a canvas item, so no reorder indicator
      }
    },
    canDrop: (item: DraggedCanvasItem | DraggedLibraryItem, monitor) => {
      if (!monitor.isOver({ shallow: true })) return false;

      const itemTypeFromMonitor = monitor.getItemType();
      const targetId = component.id;

      if (itemTypeFromMonitor === ItemTypes.CANVAS_COMPONENT_ITEM) {
        const draggedId = (item as DraggedCanvasItem).id;
        if (draggedId === targetId) return false; // Cannot drop on itself

        const draggedComponent = getComponentById(draggedId);
        const targetComponent = component;

        // Prevent dropping a parent into its child
        let currentParentIdToCheck = targetComponent.parentId;
        while (currentParentIdToCheck) {
          if (currentParentIdToCheck === draggedId) return false;
          const parentComp = getComponentById(currentParentIdToCheck);
          currentParentIdToCheck = parentComp ? parentComp.parentId : null;
        }
        
        // Allow drop if it's a sibling for reordering (within valid reorderable parent)
        if (draggedComponent && 
            draggedComponent.parentId === targetComponent.parentId && 
            targetComponent.parentId && 
            targetComponent.parentId !== ROOT_SCAFFOLD_ID) {
          return true;
        }
      }
      
      // Allow drop into TopAppBar, BottomNavBar, ContentArea, or their container descendants
      if (isContainerType(component.type, customComponentTemplates)) return true;

      // Allow drop *onto* an item if its parent is one of the main areas
      let parent = component.parentId ? getComponentById(component.parentId) : null;
      while(parent){
        if(parent.id === DEFAULT_TOP_APP_BAR_ID || 
           parent.id === DEFAULT_BOTTOM_NAV_BAR_ID || 
           parent.id === DEFAULT_CONTENT_LAZY_COLUMN_ID){
          return true; 
        }
        if (parent.id === ROOT_SCAFFOLD_ID) break;
        parent = parent.parentId ? getComponentById(parent.parentId) : null;
      }
      
      return false;
    },
    drop: (item: DraggedCanvasItem | DraggedLibraryItem, monitor) => {
      if (monitor.didDrop() || !monitor.isOver({ shallow: true })) {
        setDropIndicator(null);
        return;
      }
      
      const itemTypeFromMonitor = monitor.getItemType();

      if (itemTypeFromMonitor === ItemTypes.COMPONENT_LIBRARY_ITEM) {
        const libraryItem = item as DraggedLibraryItem;
        let targetParentIdForNewComponent = component.id;
        // If dropping onto a non-container, add to its parent.
        if (!isContainerType(component.type, customComponentTemplates)) {
            targetParentIdForNewComponent = component.parentId || DEFAULT_CONTENT_LAZY_COLUMN_ID;
        }
        addComponent(libraryItem.type, targetParentIdForNewComponent);

      } else if (itemTypeFromMonitor === ItemTypes.CANVAS_COMPONENT_ITEM) {
        const draggedCanvasItem = item as DraggedCanvasItem;
        const draggedId = draggedCanvasItem.id;
        const targetComponentInstance = component; // The component instance being dropped onto/hovered over
        
        const draggedComponent = getComponentById(draggedId);
        if (!draggedComponent) {
            setDropIndicator(null);
            return;
        }

        // Scenario 1: Reordering within the same parent
        if (draggedComponent.parentId === targetComponentInstance.parentId && 
            targetComponentInstance.parentId && 
            targetComponentInstance.parentId !== ROOT_SCAFFOLD_ID && 
            dropIndicator) {
            
            const parentComp = getComponentById(targetComponentInstance.parentId);
            if (parentComp && parentComp.properties.children) {
                const childrenOfParent = parentComp.properties.children;
                let targetIndex = childrenOfParent.indexOf(targetComponentInstance.id);

                if (targetIndex === -1) { // Should not happen with current logic
                    setDropIndicator(null);
                    return;
                }
                if (dropIndicator === 'bottom') {
                    targetIndex += 1;
                }
                moveComponent(draggedId, targetComponentInstance.parentId, targetIndex);
            }
        }
        // Scenario 2: Moving to become a child of this component (if it's a container)
        else if (isContainerType(targetComponentInstance.type, customComponentTemplates)) {
            moveComponent(draggedId, targetComponentInstance.id); // Adds to end by default
        }
        // Scenario 3: Moving to become a sibling of this component (when dropping on a non-container or for reordering in main areas)
        else if (targetComponentInstance.parentId && targetComponentInstance.parentId !== draggedId) {
            const parentOfTarget = getComponentById(targetComponentInstance.parentId);
            if (parentOfTarget && isContainerType(parentOfTarget.type, customComponentTemplates)) {
                const childrenOfParent = parentOfTarget.properties.children || [];
                let targetIndex = childrenOfParent.indexOf(targetComponentInstance.id);
                if (targetIndex === -1) {
                     moveComponent(draggedId, targetComponentInstance.parentId); // Add to end if target not in parent's children
                } else {
                    if (dropIndicator === 'bottom') { // dropIndicator might be null if not a reorder hover
                        targetIndex += 1;
                    } else if (dropIndicator === 'top') {
                        // index is already correct
                    } else {
                        // No specific indicator, default to adding after target if reordering was intended
                        // or just add to parent (moveComponent default is end)
                        // For now, let's be explicit if dropIndicator was set
                        if(draggedComponent.parentId === targetComponentInstance.parentId){ // implies reorder intention
                           // default to after if no clear indicator
                           targetIndex +=1;
                        } else {
                           // just move to this parent, index will be at end
                           moveComponent(draggedId, targetComponentInstance.parentId);
                           setDropIndicator(null);
                           return;
                        }
                    }
                    moveComponent(draggedId, targetComponentInstance.parentId, targetIndex);
                }
            } else {
                 // Fallback: if parent is not a container (should be caught by canDrop) or some other edge case.
                 // Move to the default content area.
                 moveComponent(draggedId, DEFAULT_CONTENT_LAZY_COLUMN_ID);
            }
        }
      }
      setDropIndicator(null);
    },
    collect: (monitor) => ({
      isOverCurrent: monitor.isOver({ shallow: true }),
      canDropCurrent: monitor.canDrop(),
      // draggedItemType: monitor.getItemType(), // Not strictly needed here
    }),
  }), [component.id, component.type, component.parentId, addComponent, moveComponent, getComponentById, customComponentTemplates, dropIndicator]);

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
                style={{ flexGrow: 1, minHeight: 0, width: '100%' }}
                className={cn("flex w-full scrollbar-hidden", "overflow-y-auto")} 
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
    
    if (component.parentId === ROOT_SCAFFOLD_ID) { 
        if (propName === 'width') return '100%';
        if (componentId === DEFAULT_CONTENT_LAZY_COLUMN_ID && propName === 'height') return '100%'; 
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

  const containerDropTargetStyle = (isContainerType(component.type, customComponentTemplates)) && isOverCurrent && canDropCurrent
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

  const isReorderTarget = isOverCurrent && canDropCurrent && dropIndicator !== null;

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
          'relative': isReorderTarget, // Ensure parent is relative for absolute positioned indicators
        },
        containerDropTargetStyle,
        (component.id === ROOT_SCAFFOLD_ID) ? 'flex' : '' 
      )}
      onClick={handleClick}
      data-component-id={component.id}
      data-component-type={component.type}
    >
      {isReorderTarget && dropIndicator === 'top' && (
          <div className="absolute top-[-2px] left-0 right-0 h-[4px] bg-primary z-20 pointer-events-none" />
      )}
      {renderSpecificComponent()}
      {isReorderTarget && dropIndicator === 'bottom' && (
          <div className="absolute bottom-[-2px] left-0 right-0 h-[4px] bg-primary z-20 pointer-events-none" />
      )}
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

