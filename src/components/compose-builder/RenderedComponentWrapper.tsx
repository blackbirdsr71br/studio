
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
import { isContainerType, isCustomComponentType, ROOT_SCAFFOLD_ID, DEFAULT_CONTENT_LAZY_COLUMN_ID, DEFAULT_TOP_APP_BAR_ID, DEFAULT_BOTTOM_NAV_BAR_ID, CORE_SCAFFOLD_ELEMENT_IDS } from '@/types/compose-spec';

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
    canDrag: () => ![ROOT_SCAFFOLD_ID, ...CORE_SCAFFOLD_ELEMENT_IDS].includes(component.id),
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
        setDropIndicator(null);
      }
    },
    canDrop: (item: DraggedCanvasItem | DraggedLibraryItem, monitor) => {
      if (!monitor.isOver({ shallow: true })) return false;

      const itemTypeFromMonitor = monitor.getItemType();
      const targetId = component.id; 

      if (targetId === DEFAULT_TOP_APP_BAR_ID) {
        return (item as DraggedLibraryItem).type === 'TopAppBar' || (item as DraggedLibraryItem).type === 'Text' || (item as DraggedLibraryItem).type === 'Image' || (item as DraggedLibraryItem).type === 'Button';
      }
      if (targetId === DEFAULT_BOTTOM_NAV_BAR_ID) {
        return (item as DraggedLibraryItem).type === 'BottomNavigationBar' || (item as DraggedLibraryItem).type === 'Text' || (item as DraggedLibraryItem).type === 'Image' || (item as DraggedLibraryItem).type === 'Button';
      }
      if (targetId === DEFAULT_CONTENT_LAZY_COLUMN_ID) {
        const libItemType = (item as DraggedLibraryItem).type;
        return libItemType !== 'Scaffold' && libItemType !== 'TopAppBar' && libItemType !== 'BottomNavigationBar';
      }
      
      if (itemTypeFromMonitor === ItemTypes.COMPONENT_LIBRARY_ITEM) {
        const libItemType = (item as DraggedLibraryItem).type;
        if (libItemType === 'Scaffold' ||
            (targetId !== DEFAULT_TOP_APP_BAR_ID && libItemType === 'TopAppBar') ||
            (targetId !== DEFAULT_BOTTOM_NAV_BAR_ID && libItemType === 'BottomNavigationBar')) {
          return false;
        }
      }


      if (itemTypeFromMonitor === ItemTypes.CANVAS_COMPONENT_ITEM) {
        const draggedId = (item as DraggedCanvasItem).id;
        if (draggedId === targetId) return false; 

        const draggedComponent = getComponentById(draggedId);
        const targetComponent = component;

        let currentParentIdToCheck = targetComponent.parentId;
        while (currentParentIdToCheck) {
          if (currentParentIdToCheck === draggedId) return false;
          const parentComp = getComponentById(currentParentIdToCheck);
          currentParentIdToCheck = parentComp ? parentComp.parentId : null;
        }
        
        if (draggedComponent &&
            draggedComponent.parentId === targetComponent.parentId &&
            targetComponent.parentId &&
            targetComponent.parentId !== ROOT_SCAFFOLD_ID) { 
          return true;
        }
      }
      
      if (isContainerType(component.type, customComponentTemplates)) return true;

      let parent = component.parentId ? getComponentById(component.parentId) : null;
      if (parent && isContainerType(parent.type, customComponentTemplates)) {
        return true;
      }
      
      return false;
    },
    drop: (item: DraggedCanvasItem | DraggedLibraryItem, monitor) => {
      if (monitor.didDrop() || !monitor.isOver({ shallow: true })) {
        setDropIndicator(null);
        return;
      }
      
      const itemTypeFromMonitor = monitor.getItemType();
      const targetComponentInstance = component; 

      if (itemTypeFromMonitor === ItemTypes.COMPONENT_LIBRARY_ITEM) {
        const libraryItem = item as DraggedLibraryItem;
        let targetParentIdForNewComponent = targetComponentInstance.id;

        if (targetComponentInstance.id === DEFAULT_TOP_APP_BAR_ID || targetComponentInstance.id === DEFAULT_BOTTOM_NAV_BAR_ID || targetComponentInstance.id === DEFAULT_CONTENT_LAZY_COLUMN_ID) {
            targetParentIdForNewComponent = targetComponentInstance.id;
        } else if (isContainerType(targetComponentInstance.type, customComponentTemplates)) {
            targetParentIdForNewComponent = targetComponentInstance.id;
        } else {
            targetParentIdForNewComponent = targetComponentInstance.parentId || DEFAULT_CONTENT_LAZY_COLUMN_ID;
        }
        addComponent(libraryItem.type, targetParentIdForNewComponent);

      } else if (itemTypeFromMonitor === ItemTypes.CANVAS_COMPONENT_ITEM) {
        const draggedCanvasItem = item as DraggedCanvasItem;
        const draggedId = draggedCanvasItem.id;
        
        const draggedComponent = getComponentById(draggedId);
        if (!draggedComponent) {
            setDropIndicator(null);
            return;
        }

        if (draggedComponent.parentId === targetComponentInstance.parentId &&
            targetComponentInstance.parentId &&
            targetComponentInstance.parentId !== ROOT_SCAFFOLD_ID &&
            dropIndicator) {
            
            const parentComp = getComponentById(targetComponentInstance.parentId);
            if (parentComp && parentComp.properties.children) {
                const childrenOfParent = parentComp.properties.children;
                let targetIndex = childrenOfParent.indexOf(targetComponentInstance.id);

                if (targetIndex === -1) {
                    setDropIndicator(null);
                    return;
                }
                if (dropIndicator === 'bottom') {
                    targetIndex += 1;
                }
                moveComponent(draggedId, targetComponentInstance.parentId, targetIndex);
            }
        }
        else if (isContainerType(targetComponentInstance.type, customComponentTemplates)) {
            moveComponent(draggedId, targetComponentInstance.id); 
        }
        else if (targetComponentInstance.parentId && targetComponentInstance.parentId !== draggedId) {
            const parentOfTarget = getComponentById(targetComponentInstance.parentId);
            if (parentOfTarget && isContainerType(parentOfTarget.type, customComponentTemplates)) {
                const childrenOfParent = parentOfTarget.properties.children || [];
                let targetIndex = childrenOfParent.indexOf(targetComponentInstance.id);
                if (targetIndex === -1) {
                     moveComponent(draggedId, targetComponentInstance.parentId);
                } else {
                    if (dropIndicator === 'bottom' || dropIndicator === null) {
                        targetIndex += 1;
                    }
                    moveComponent(draggedId, targetComponentInstance.parentId, targetIndex);
                }
            } else {
                 moveComponent(draggedId, DEFAULT_CONTENT_LAZY_COLUMN_ID);
            }
        }
      }
      setDropIndicator(null);
    },
    collect: (monitor) => ({
      isOverCurrent: monitor.isOver({ shallow: true }),
      canDropCurrent: monitor.canDrop(),
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
    if (CORE_SCAFFOLD_ELEMENT_IDS.includes(component.id)) return;

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
      
      const updatedProps: Record<string, any> = {};

      const isHorizontalResize = resizeDetails.handle.includes('e') || resizeDetails.handle.includes('w');
      const isVerticalResize = resizeDetails.handle.includes('n') || resizeDetails.handle.includes('s');

      if (isHorizontalResize) {
        let newWidth = resizeDetails.initialWidth;
        if (resizeDetails.handle.includes('e')) newWidth = resizeDetails.initialWidth + dx;
        if (resizeDetails.handle.includes('w')) newWidth = resizeDetails.initialWidth - dx;
        
        updatedProps.width = Math.round(Math.max(newWidth, MIN_DIMENSION));
        updatedProps.fillMaxWidth = false; // User is manually setting width
      }

      if (isVerticalResize) {
        let newHeight = resizeDetails.initialHeight;
        if (resizeDetails.handle.includes('s')) newHeight = resizeDetails.initialHeight + dy;
        if (resizeDetails.handle.includes('n')) newHeight = resizeDetails.initialHeight - dy;

        updatedProps.height = Math.round(Math.max(newHeight, MIN_DIMENSION));
        updatedProps.fillMaxHeight = false; // User is manually setting height
      }

      if (Object.keys(updatedProps).length > 0) {
        updateComponent(component.id, { properties: updatedProps });
      }
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
        const topBarChild = childrenToRender.find(c => c.type === 'TopAppBar' || c.id === DEFAULT_TOP_APP_BAR_ID);
        const contentChild = childrenToRender.find(c => c.type === 'LazyColumn' && c.id === DEFAULT_CONTENT_LAZY_COLUMN_ID);
        const bottomBarChild = childrenToRender.find(c => c.type === 'BottomNavigationBar' || c.id === DEFAULT_BOTTOM_NAV_BAR_ID);
        
        return (
          <div className="flex flex-col w-full h-full bg-[var(--scaffold-bg-color)]" style={{'--scaffold-bg-color': component.properties.backgroundColor || 'transparent'} as React.CSSProperties}>
            {topBarChild && (
              <div style={{ flexShrink: 0, width: '100%', height: `${topBarChild.properties.height || 56}px` }} className="flex w-full">
                <RenderedComponentWrapper component={topBarChild} />
              </div>
            )}
            {contentChild && (
              <div
                style={{ flexGrow: 1, minHeight: 0, width: '100%' }}
                className={cn("flex w-full", "overflow-y-auto overflow-x-hidden")}
              >
                <RenderedComponentWrapper component={contentChild} />
              </div>
            )}
            {bottomBarChild && (
              <div style={{ flexShrink: 0, width: '100%', height: `${bottomBarChild.properties.height || 56}px` }} className="flex w-full">
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
        if (component.templateIdRef && isCustomComponentType(component.templateIdRef)) {
           const template = customComponentTemplates.find(t => t.templateId === component.templateIdRef);
           if (template) {
             const rootTemplateComponent = template.componentTree.find(c => c.id === template.rootComponentId);
             if (rootTemplateComponent) {
                const isTemplateRootRowLike = ['Row', 'LazyRow', 'LazyVerticalGrid', 'TopAppBar', 'BottomNavigationBar'].includes(rootTemplateComponent.type);
                return <ContainerView component={component} childrenComponents={childrenToRender} isRow={isTemplateRootRowLike} />;
             }
           }
        }
        return <div className="p-2 border border-dashed border-red-500 text-xs">Unknown: {component.type}</div>;
    }
  };
  
  const getDimensionValue = (
    propName: 'width' | 'height',
    propValue: any,
    fillValue: boolean | undefined,
    componentType: string,
    componentId: string,
    parentId: string | null,
    getLocalComponentById: (id: string) => DesignComponent | undefined
  ): string => {
    if (componentId === ROOT_SCAFFOLD_ID) return '100%';
  
    if (componentId === DEFAULT_TOP_APP_BAR_ID || componentType === 'TopAppBar') {
      return propName === 'width' ? '100%' : (isNumericValue(propValue) ? `${propValue}px` : '56px');
    }
    if (componentId === DEFAULT_BOTTOM_NAV_BAR_ID || componentType === 'BottomNavigationBar') {
      return propName === 'width' ? '100%' : (isNumericValue(propValue) ? `${propValue}px` : '56px');
    }
    if (componentId === DEFAULT_CONTENT_LAZY_COLUMN_ID) {
      return '100%';
    }
  
    const parentComponent = parentId ? getLocalComponentById(parentId) : null;
  
    if (parentComponent) {
      let effectiveParentType = parentComponent.type;
      if (parentComponent.templateIdRef && isCustomComponentType(parentComponent.templateIdRef)) {
        const template = customComponentTemplates.find(t => t.templateId === parentComponent.templateIdRef);
        if (template) {
            const rootOfParentTemplate = template.componentTree.find(c => c.id === template.rootComponentId);
            if(rootOfParentTemplate) effectiveParentType = rootOfParentTemplate.type;
        }
      }

      const parentIsRowLike = ['LazyRow', 'LazyHorizontalGrid', 'TopAppBar', 'BottomNavigationBar', 'Row'].includes(effectiveParentType);
      
      if (propName === 'width' && parentIsRowLike) {
        if (fillValue || propValue === 'match_parent') {
          return component.properties.layoutWeight && component.properties.layoutWeight > 0 ? '100%' : 'auto';
        }
      }
      if (propName === 'height' && !parentIsRowLike) { // Parent is Column-like
         if (fillValue || propValue === 'match_parent') {
          return component.properties.layoutWeight && component.properties.layoutWeight > 0 ? '100%' : 'auto';
        }
      }
    }
  
    if (fillValue) return '100%';
    if (propValue === 'match_parent') return '100%';
    if (propValue === 'wrap_content') return 'auto';
    if (isNumericValue(propValue)) return `${propValue}px`;
    return 'auto'; 
  };
  
  const wrapperStyle: React.CSSProperties = {
    transition: isDragging || isResizing ? 'none' : 'box-shadow 0.2s ease-in-out, border-color 0.2s ease-in-out',
    width: getDimensionValue('width', component.properties.width, component.properties.fillMaxWidth, component.type, component.id, component.parentId, getComponentById),
    height: getDimensionValue('height', component.properties.height, component.properties.fillMaxHeight, component.type, component.id, component.parentId, getComponentById),
    position: 'relative', // Needed for resize handles and drop indicator
    display: 'block', // Changed from 'flex'
  };
  
  if (component.properties.layoutWeight && component.properties.layoutWeight > 0) {
    wrapperStyle.flexGrow = component.properties.layoutWeight;
    wrapperStyle.flexShrink = 1; 
    wrapperStyle.flexBasis = '0%'; 
    
    const parentComp = component.parentId ? getComponentById(component.parentId) : null;
    if (parentComp) {
        let parentIsRowLike = ['Row', 'LazyRow', 'TopAppBar', 'BottomNavigationBar', 'LazyHorizontalGrid'].includes(parentComp.type);
        if (parentComp.templateIdRef && isCustomComponentType(parentComp.templateIdRef)) {
            const template = customComponentTemplates.find(t => t.templateId === parentComp.templateIdRef);
            if (template) {
                const rootOfTemplate = template.componentTree.find(c => c.id === template.rootComponentId);
                if (rootOfTemplate) parentIsRowLike = ['Row', 'LazyRow', 'TopAppBar', 'BottomNavigationBar', 'LazyHorizontalGrid'].includes(rootOfTemplate.type);
            }
        }

        if (parentIsRowLike) { 
            wrapperStyle.height = '100%'; 
            if (!component.properties.fillMaxWidth && !isNumericValue(component.properties.width) && component.properties.width !=='wrap_content') {
                 wrapperStyle.width = 'auto'; 
            }
        } else { 
            wrapperStyle.width = '100%'; 
             if (!component.properties.fillMaxHeight && !isNumericValue(component.properties.height) && component.properties.height !=='wrap_content') {
                 wrapperStyle.height = 'auto';
            }
        }
    }
  }

  const parent = component.parentId ? getComponentById(component.parentId) : null;
  if (parent && isContainerType(parent.type, customComponentTemplates)) {
    let parentIsRowLike = ['Row', 'LazyRow', 'TopAppBar', 'BottomNavigationBar', 'LazyHorizontalGrid'].includes(parent.type);
    if (parent.templateIdRef && isCustomComponentType(parent.templateIdRef)) {
        const template = customComponentTemplates.find(t => t.templateId === parent.templateIdRef);
        if(template) {
            const rootOfTemplate = template.componentTree.find(c => c.id === template.rootComponentId);
            if(rootOfTemplate) parentIsRowLike = ['Row', 'LazyRow', 'TopAppBar', 'BottomNavigationBar', 'LazyHorizontalGrid'].includes(rootOfTemplate.type);
        }
    }

    const selfAlignProp = component.properties.selfAlign;

    if (selfAlignProp && selfAlignProp !== 'Inherit') {
      if (parentIsRowLike) { 
        if (selfAlignProp === 'Start') wrapperStyle.alignSelf = 'flex-start';
        else if (selfAlignProp === 'Center') wrapperStyle.alignSelf = 'center';
        else if (selfAlignProp === 'End') wrapperStyle.alignSelf = 'flex-end';
        else if (component.properties.fillMaxHeight) wrapperStyle.alignSelf = 'stretch';

      } else { 
        if (selfAlignProp === 'Start') wrapperStyle.alignSelf = 'flex-start';
        else if (selfAlignProp === 'Center') wrapperStyle.alignSelf = 'center';
        else if (selfAlignProp === 'End') wrapperStyle.alignSelf = 'flex-end';
        else if (component.properties.fillMaxWidth) wrapperStyle.alignSelf = 'stretch';
      }
    } else { 
      if (parentIsRowLike && component.properties.fillMaxHeight) {
        wrapperStyle.alignSelf = 'stretch';
      } else if (!parentIsRowLike && component.properties.fillMaxWidth) {
        wrapperStyle.alignSelf = 'stretch';
      }
    }
  }


  if (component.id === ROOT_SCAFFOLD_ID) {
    wrapperStyle.backgroundColor = component.properties.backgroundColor || 'transparent';
  }

  const hasCornerRadius = (component.properties.cornerRadiusTopLeft || 0) > 0 ||
                          (component.properties.cornerRadiusTopRight || 0) > 0 ||
                          (component.properties.cornerRadiusBottomRight || 0) > 0 ||
                          (component.properties.cornerRadiusBottomLeft || 0) > 0;

  if (hasCornerRadius) {
    wrapperStyle.borderTopLeftRadius = `${component.properties.cornerRadiusTopLeft || 0}px`;
    wrapperStyle.borderTopRightRadius = `${component.properties.cornerRadiusTopRight || 0}px`;
    wrapperStyle.borderBottomRightRadius = `${component.properties.cornerRadiusBottomRight || 0}px`;
    wrapperStyle.borderBottomLeftRadius = `${component.properties.cornerRadiusBottomLeft || 0}px`;
    if (component.type === 'Image') {
      wrapperStyle.overflow = 'hidden';
    }
  }

  const containerDropTargetStyle = (isContainerType(component.type, customComponentTemplates) || CORE_SCAFFOLD_ELEMENT_IDS.includes(component.id)) && isOverCurrent && canDropCurrent
    ? 'drag-over-container'
    : '';

  const canResize = isSelected &&
                    !CORE_SCAFFOLD_ELEMENT_IDS.includes(component.id) &&
                    !component.properties.fillMaxWidth &&
                    !component.properties.fillMaxHeight &&
                    isNumericValue(component.properties.width) &&
                    isNumericValue(component.properties.height);
  
  const canResizeHorizontally = isSelected && !CORE_SCAFFOLD_ELEMENT_IDS.includes(component.id) && !component.properties.fillMaxWidth && isNumericValue(component.properties.width);
  const canResizeVertically = isSelected && !CORE_SCAFFOLD_ELEMENT_IDS.includes(component.id) && !component.properties.fillMaxHeight && isNumericValue(component.properties.height);

  const isReorderTarget = isOverCurrent && canDropCurrent && dropIndicator !== null;


  return (
    <div
      ref={ref}
      style={wrapperStyle}
      className={cn(
        'border border-transparent',
        { 
          'ring-4 ring-primary ring-offset-2 ring-offset-background shadow-lg': isSelected && ![ROOT_SCAFFOLD_ID, ...CORE_SCAFFOLD_ELEMENT_IDS].includes(component.id),
          'ring-2 ring-accent ring-offset-2 ring-offset-background': isSelected && CORE_SCAFFOLD_ELEMENT_IDS.includes(component.id) && component.id !== ROOT_SCAFFOLD_ID,
          'opacity-50': isDragging,
          'cursor-grab': !isResizing && ![ROOT_SCAFFOLD_ID, ...CORE_SCAFFOLD_ELEMENT_IDS, 'Spacer'].includes(component.id) && component.type !== 'Spacer',
          'cursor-default': component.type === 'Spacer' || [ROOT_SCAFFOLD_ID, ...CORE_SCAFFOLD_ELEMENT_IDS].includes(component.id),
          'cursor-grabbing': isDragging,
          'relative': isReorderTarget, 
        },
        containerDropTargetStyle,
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
          {canResize && (['nw', 'ne', 'sw', 'se'] as HandleType[]).map(handle => (
            <div key={handle} className={`resize-handle ${handle}`} onMouseDown={(e) => handleMouseDownOnResizeHandle(e, handle)} />
          ))}
          {canResizeVertically && !canResizeHorizontally && (['n', 's'] as HandleType[]).map(handle => (
            <div key={handle} className={`resize-handle ${handle}`} onMouseDown={(e) => handleMouseDownOnResizeHandle(e, handle)} />
          ))}
          {canResizeHorizontally && !canResizeVertically && (['e', 'w'] as HandleType[]).map(handle => (
            <div key={handle} className={`resize-handle ${handle}`} onMouseDown={(e) => handleMouseDownOnResizeHandle(e, handle)} />
          ))}
        </>
      )}
    </div>
  );
}
