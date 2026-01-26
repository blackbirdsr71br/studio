
'use client';

import type { DesignComponent, CustomComponentTemplate, BaseComponentProps } from '@/types/compose-spec';
import { cn } from '@/lib/utils';
import { TextView } from './TextView';
import { ButtonView } from './ButtonView';
import { ImageView } from './ImageView';
import { ContainerView } from './ContainerView';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useDrag, useDrop, type DndProvider } from 'react-dnd';
import { ItemTypes } from '@/lib/dnd-types';
import { isContainerType, ROOT_SCAFFOLD_ID, DEFAULT_CONTENT_LAZY_COLUMN_ID, DEFAULT_TOP_APP_BAR_ID, DEFAULT_BOTTOM_NAV_BAR_ID, CORE_SCAFFOLD_ELEMENT_IDS, getComponentDisplayName, isCustomComponentType } from '@/types/compose-spec';
import { CheckboxView } from './CheckboxView';
import { RadioButtonView } from './RadioButtonView';


interface RenderedComponentWrapperProps {
  component: DesignComponent;
  isPreview?: boolean;
  getComponentById: (id: string) => DesignComponent | undefined;
  customComponentTemplates: CustomComponentTemplate[];
  activeDesignId: string | null;
  zoomLevel: number;
  selectComponent: (id: string) => void;
  addComponent: (typeOrTemplateId: string, parentId: string | null, dropPosition?: { x: number; y: number }, index?: number) => void;
  moveComponent: (draggedId: string, newParentId: string | null, newIndex?: number) => void;
  updateComponent: (id: string, updates: { properties: Partial<BaseComponentProps> }) => void;
}


interface DraggedCanvasItem {
  id: string;
  type: typeof ItemTypes.CANVAS_COMPONENT_ITEM;
}

interface DraggedLibraryItem {
  type: string;
}

type DropIndicatorPosition = 'top' | 'bottom' | null;
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
    return !isNaN(Number(value));
  }
  return false;
};

export function RenderedComponentWrapper({
  component,
  isPreview = false,
  getComponentById,
  customComponentTemplates,
  activeDesignId,
  zoomLevel,
  selectComponent,
  addComponent,
  moveComponent,
  updateComponent,
 }: RenderedComponentWrapperProps) {
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
    canDrag: () => !isPreview && !CORE_SCAFFOLD_ELEMENT_IDS.includes(component.id),
  }));

  const [{ isOverCurrent, canDropCurrent }, drop] = useDrop(() => ({
    accept: [ItemTypes.COMPONENT_LIBRARY_ITEM, ItemTypes.CANVAS_COMPONENT_ITEM],
    hover(item: DraggedCanvasItem | DraggedLibraryItem, monitor) {
      if (!ref.current || !monitor.isOver({ shallow: true }) || isPreview) {
        if (dropIndicator !== null) setDropIndicator(null);
        return;
      }

      const draggedId = (item as any).id || (item as any).type;
      const targetId = component.id;
      if (draggedId === targetId || CORE_SCAFFOLD_ELEMENT_IDS.includes(targetId)) {
        if (dropIndicator !== null) setDropIndicator(null);
        return;
      }

      const clientOffset = monitor.getClientOffset();
      if (!clientOffset) return;

      const hoverBoundingRect = ref.current.getBoundingClientRect();
      const hoverClientY = clientOffset.y - hoverBoundingRect.top;

      let newIndicator: DropIndicatorPosition = null;

      if (isContainerType(component.type, customComponentTemplates)) {
        const topThird = hoverBoundingRect.height / 3;
        const bottomThird = hoverBoundingRect.height * (2 / 3);
        if (hoverClientY < topThird) newIndicator = 'top';
        else if (hoverClientY > bottomThird) newIndicator = 'bottom';
        else newIndicator = null;
      } else {
        const hoverMiddleY = hoverBoundingRect.height / 2;
        if (hoverClientY < hoverMiddleY) newIndicator = 'top';
        else newIndicator = 'bottom';
      }

      if (newIndicator !== dropIndicator) {
        setDropIndicator(newIndicator);
      }
    },
    canDrop(item: DraggedCanvasItem | DraggedLibraryItem, monitor) {
       if (isPreview || !monitor.isOver({ shallow: true })) return false;

       const targetId = component.id;
       if (targetId === ROOT_SCAFFOLD_ID) return false;

       if (monitor.getItemType() === ItemTypes.CANVAS_COMPONENT_ITEM) {
           const draggedId = (item as DraggedCanvasItem).id;
           if (draggedId === targetId) return false;

           let p = component.parentId;
           while(p) {
               if (p === draggedId) return false;
               const parentComp = getComponentById(p);
               p = parentComp ? parentComp.parentId : null;
           }
       }
       return true;
    },
    drop(item, monitor) {
        if (isPreview || monitor.didDrop() || !monitor.isOver({ shallow: true })) {
            setDropIndicator(null);
            return;
        }

        const itemType = monitor.getItemType();
        const targetId = component.id;

        if (dropIndicator === null && isContainerType(component.type, customComponentTemplates)) {
            if (itemType === ItemTypes.CANVAS_COMPONENT_ITEM) {
                moveComponent((item as DraggedCanvasItem).id, targetId);
            } else {
                addComponent((item as DraggedLibraryItem).type, targetId);
            }
        }
        else if (component.parentId) {
            const parentComp = getComponentById(component.parentId);
            if (parentComp?.properties.children) {
                let targetIndex = parentComp.properties.children.indexOf(targetId);
                if (targetIndex === -1) { setDropIndicator(null); return; }

                if (dropIndicator === 'bottom') {
                    targetIndex++;
                }

                if (itemType === ItemTypes.CANVAS_COMPONENT_ITEM) {
                    moveComponent((item as DraggedCanvasItem).id, component.parentId, targetIndex);
                } else {
                    addComponent((item as DraggedLibraryItem).type, component.parentId, undefined, targetIndex);
                }
            }
        }

        setDropIndicator(null);
    }
  }), [component.id, component.type, component.parentId, addComponent, moveComponent, getComponentById, customComponentTemplates, dropIndicator, isPreview]);

  drag(drop(ref));

  const isSelected = !isPreview && activeDesignId === component.id;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isPreview) {
      selectComponent(component.id);
    }
  };

  const handleMouseDownOnResizeHandle = useCallback((event: React.MouseEvent<HTMLDivElement>, handle: HandleType) => {
    event.stopPropagation();
    event.preventDefault();
    if (isPreview || CORE_SCAFFOLD_ELEMENT_IDS.includes(component.id)) return;

    selectComponent(component.id);

    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;

    setIsResizing(true);
    setResizeDetails({
      handle,
      startX: event.clientX,
      startY: event.clientY,
      initialWidth: rect.width,
      initialHeight: rect.height,
    });
  }, [component.id, selectComponent, isPreview]);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!isResizing || !resizeDetails || !ref.current) return;

      const dx = (event.clientX - resizeDetails.startX) / zoomLevel;
      const dy = (event.clientY - resizeDetails.startY) / zoomLevel;

      const updatedProps: Record<string, any> = {};

      const initialUnscaledWidth = resizeDetails.initialWidth / zoomLevel;
      const initialUnscaledHeight = resizeDetails.initialHeight / zoomLevel;

      const isHorizontalResize = resizeDetails.handle.includes('e') || resizeDetails.handle.includes('w');
      const isVerticalResize = resizeDetails.handle.includes('n') || resizeDetails.handle.includes('s');

      if (isHorizontalResize) {
        let newWidth = initialUnscaledWidth;
        if (resizeDetails.handle.includes('e')) newWidth += dx;
        if (resizeDetails.handle.includes('w')) newWidth -= dx;

        updatedProps.width = Math.round(Math.max(newWidth, MIN_DIMENSION));
        updatedProps.fillMaxWidth = false;
        updatedProps.fillMaxSize = false;
      }

      if (isVerticalResize) {
        let newHeight = initialUnscaledHeight;
        if (resizeDetails.handle.includes('s')) newHeight += dy;
        if (resizeDetails.handle.includes('n')) newHeight -= dy;

        updatedProps.height = Math.round(Math.max(newHeight, MIN_DIMENSION));
        updatedProps.fillMaxHeight = false;
        updatedProps.fillMaxSize = false;
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
  }, [isResizing, resizeDetails, component.id, updateComponent, zoomLevel]);


  const renderSpecificComponent = () => {
    const childrenToRender = (component.properties.children || [])
      .map(id => getComponentById(id))
      .filter(Boolean) as DesignComponent[];

    const propsToPass = {
        getComponentById,
        customComponentTemplates,
        activeDesignId,
        zoomLevel,
        selectComponent,
        addComponent,
        moveComponent,
        updateComponent,
    };

    let effectiveType = component.type;
    let isRowLike = ['Row', 'LazyRow', 'LazyHorizontalGrid', 'TopAppBar', 'BottomNavigationBar', 'Carousel'].includes(effectiveType);
    if (component.templateIdRef) {
        const template = customComponentTemplates.find(t => t.templateId === component.templateIdRef);
        if(template) {
            const rootOfTemplate = template.componentTree.find(c => c.id === template.rootComponentId);
            if (rootOfTemplate) {
                effectiveType = rootOfTemplate.type;
                isRowLike = ['Row', 'LazyRow', 'LazyHorizontalGrid', 'TopAppBar', 'BottomNavigationBar', 'Carousel'].includes(effectiveType);
            }
        }
    }


    switch (component.type) {
      case 'Scaffold':
        const topBarChild = childrenToRender.find(c => c.id === DEFAULT_TOP_APP_BAR_ID);
        const contentChild = childrenToRender.find(c => c.id === DEFAULT_CONTENT_LAZY_COLUMN_ID);
        const bottomBarChild = childrenToRender.find(c => c.id === DEFAULT_BOTTOM_NAV_BAR_ID);
        
        return (
          <div className="flex flex-col w-full h-full bg-[var(--m3-background)]" style={{'--scaffold-bg-color': component.properties.backgroundColor || 'var(--m3-background)'} as React.CSSProperties}>
            {topBarChild && (
              <div style={{ flexShrink: 0, width: '100%'}} className="flex w-full">
                <RenderedComponentWrapper
                    component={topBarChild}
                    isPreview={isPreview}
                    {...propsToPass}
                />
              </div>
            )}
            {contentChild && (
              <div
                style={{ flexGrow: 1, minHeight: 0, width: '100%' }}
                className={cn("flex w-full", "overflow-y-auto overflow-x-hidden")}
              >
                <RenderedComponentWrapper
                    component={contentChild}
                    isPreview={isPreview}
                    {...propsToPass}
                />
              </div>
            )}
            {bottomBarChild && (
              <div style={{ flexShrink: 0, width: '100%'}} className="flex w-full">
                 <RenderedComponentWrapper
                    component={bottomBarChild}
                    isPreview={isPreview}
                    {...propsToPass}
                 />
              </div>
            )}
          </div>
        );
      case 'Text':
        return <TextView properties={component.properties} />;
      case 'Button':
        return <ButtonView properties={component.properties} />;
      case 'Image':
        return <ImageView properties={component.properties} isPreview={isPreview} />;
      case 'Checkbox':
        return <CheckboxView properties={component.properties} />;
      case 'RadioButton':
        return <RadioButtonView properties={component.properties} />;
      
      case 'Column':
      case 'Box':
      case 'Card':
      case 'LazyColumn':
      case 'AnimatedContent':
      case 'DropdownMenu':
      case 'Carousel':
        return <ContainerView component={component} childrenComponents={childrenToRender} isRow={false} isPreview={isPreview} passThroughProps={propsToPass} />;

      case 'Row':
      case 'LazyRow':
      case 'LazyVerticalGrid':
      case 'LazyHorizontalGrid':
      case 'TopAppBar':
      case 'BottomNavigationBar':
        return <ContainerView component={component} childrenComponents={childrenToRender} isRow={true} isPreview={isPreview} passThroughProps={propsToPass} />;

      case 'Spacer':
        return (
          <div
            style={{
              width: `${component.properties.width ?? 8}px`,
              height: `${component.properties.height ?? 8}px`,
              flexShrink: 0,
            }}
            className="select-none"
          />
        );

      default:
        if (component.templateIdRef) {
           return <ContainerView component={component} childrenComponents={childrenToRender} isRow={isRowLike} isPreview={isPreview} passThroughProps={passThroughProps} />;
        }
        return <div className="p-2 border border-dashed border-red-500 text-xs">Unknown: {component.type}</div>;
    }
  };

  const parent = component.parentId ? getComponentById(component.parentId) : null;
  let parentIsRowLike = false;
  let parentIsColumnLike = false;
  
  const isTemplateRoot = !parent && component.type !== 'Scaffold' && !isPreview;

  if (isTemplateRoot) {
      parentIsColumnLike = true;
  } else if (parent) {
      let effectiveParentType = parent.type;
      if (parent.templateIdRef) {
          const template = customComponentTemplates.find(t => t.templateId === parent.templateIdRef);
          if (template) {
              const rootOfTemplate = template.componentTree.find(c => c.id === template.rootComponentId);
              if (rootOfTemplate) effectiveParentType = rootOfTemplate.type;
          }
      }
      parentIsRowLike = ['Row', 'LazyRow', 'LazyHorizontalGrid', 'TopAppBar', 'BottomNavigationBar', 'Carousel'].includes(effectiveParentType);
      parentIsColumnLike = ['LazyColumn', 'LazyVerticalGrid', 'Column', 'Card', 'Box', 'Scaffold', 'DropdownMenu', 'AnimatedContent'].includes(effectiveParentType);
  }

  const wrapperStyle: React.CSSProperties = {
    position: 'relative',
    transition: isDragging || isResizing ? 'none' : 'box-shadow 0.2s ease-in-out, border-color 0.2s ease-in-out',
    display: 'flex',
    flexShrink: 0,
  };

  const { selfAlign, fillMaxWidth, fillMaxHeight, fillMaxSize, layoutWeight } = component.properties;

  if (layoutWeight && layoutWeight > 0) {
      wrapperStyle.flexGrow = layoutWeight;
      wrapperStyle.flexShrink = 1;
      wrapperStyle.flexBasis = '0%';
      if (parentIsColumnLike) wrapperStyle.height = '0px';
      if (parentIsRowLike) wrapperStyle.width = '0px';
  } else {
      if (parentIsColumnLike) {
          if (fillMaxHeight || fillMaxSize) {
            wrapperStyle.flexGrow = 1;
            wrapperStyle.flexBasis = '0%';
            wrapperStyle.height = 'auto'; // Let flex-grow handle it
          } else {
            wrapperStyle.height = isNumericValue(component.properties.height) ? `${component.properties.height}px` : 'auto';
          }
          
          if (fillMaxWidth || fillMaxSize) {
              wrapperStyle.alignSelf = 'stretch';
          } else {
              wrapperStyle.width = isNumericValue(component.properties.width) ? `${component.properties.width}px` : 'auto';
              if (selfAlign && selfAlign !== 'Inherit') {
                const alignMap = { Start: 'flex-start', Center: 'center', End: 'flex-end' };
                wrapperStyle.alignSelf = alignMap[selfAlign as keyof typeof alignMap] || 'auto';
              }
          }
      } else if (parentIsRowLike) {
          if (fillMaxWidth || fillMaxSize) {
            wrapperStyle.flexGrow = 1;
            wrapperStyle.flexBasis = '0%';
            wrapperStyle.width = 'auto'; // Let flex-grow handle it
          } else {
            wrapperStyle.width = isNumericValue(component.properties.width) ? `${component.properties.width}px` : 'auto';
          }
          
          if (fillMaxHeight || fillMaxSize) {
              wrapperStyle.alignSelf = 'stretch';
          } else {
             if (selfAlign && selfAlign !== 'Inherit') {
                 const alignMap = { Start: 'flex-start', Center: 'center', End: 'flex-end' };
                 wrapperStyle.alignSelf = alignMap[selfAlign as keyof typeof alignMap] || 'auto';
             }
             wrapperStyle.height = isNumericValue(component.properties.height) ? `${component.properties.height}px` : 'auto';
          }
      } else {
          wrapperStyle.width = isNumericValue(component.properties.width) ? `${component.properties.width}px` : 'auto';
          wrapperStyle.height = isNumericValue(component.properties.height) ? `${component.properties.height}px` : 'auto';
      }
  }

  const hasCornerRadius = (component.properties.cornerRadius || 0) > 0 ||
                          (component.properties.cornerRadiusTopLeft || 0) > 0 ||
                          (component.properties.cornerRadiusTopRight || 0) > 0 ||
                          (component.properties.cornerRadiusBottomRight || 0) > 0 ||
                          (component.properties.cornerRadiusBottomLeft || 0) > 0;

  if (hasCornerRadius) {
    wrapperStyle.borderTopLeftRadius = `${component.properties.cornerRadiusTopLeft ?? component.properties.cornerRadius ?? 0}px`;
    wrapperStyle.borderTopRightRadius = `${component.properties.cornerRadiusTopRight ?? component.properties.cornerRadius ?? 0}px`;
    wrapperStyle.borderBottomRightRadius = `${component.properties.cornerRadiusBottomRight ?? component.properties.cornerRadius ?? 0}px`;
    wrapperStyle.borderBottomLeftRadius = `${component.properties.cornerRadiusBottomLeft ?? component.properties.cornerRadius ?? 0}px`;
    if (component.type === 'Image') {
      wrapperStyle.overflow = 'hidden';
    }
  }

  const containerDropTargetStyle = (isContainerType(component.type, customComponentTemplates) || CORE_SCAFFOLD_ELEMENT_IDS.includes(component.id)) && isOverCurrent && canDropCurrent && dropIndicator === null
    ? 'bg-accent/10'
    : '';

  const canResizeHorizontally = !CORE_SCAFFOLD_ELEMENT_IDS.includes(component.id) && !component.properties.fillMaxWidth && !component.properties.fillMaxSize;
  const canResizeVertically = !CORE_SCAFFOLD_ELEMENT_IDS.includes(component.id) && !component.properties.fillMaxHeight && !component.properties.fillMaxSize;
  const canResize = canResizeHorizontally || canResizeVertically;

  const isReorderTarget = isOverCurrent && canDropCurrent && dropIndicator !== null;

  const SELECTION_OFFSET = 8;

  return (
    <div
      ref={ref}
      style={wrapperStyle}
      className={cn(
        'border border-transparent',
        {
          'opacity-50': isDragging,
          'cursor-grabbing': isDragging,
          'cursor-pointer': !isDragging && (component.properties.clickable || !isPreview),
          'cursor-grab': !isDragging && !component.properties.clickable && !CORE_SCAFFOLD_ELEMENT_IDS.includes(component.id) && !isPreview,
        },
        containerDropTargetStyle,
      )}
      onClick={handleClick}
      data-component-id={component.id}
      data-component-type={component.type}
    >
      <div className="w-full h-full relative">
        {isSelected && !isPreview && (
          <div
              className="pointer-events-none absolute z-50 border-2 border-primary"
              style={{
                  top: `-${SELECTION_OFFSET}px`,
                  left: `-${SELECTION_OFFSET}px`,
                  right: `-${SELECTION_OFFSET}px`,
                  bottom: `-${SELECTION_OFFSET}px`,
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
        )}
        {isReorderTarget && dropIndicator === 'top' && (
            <div className="absolute top-[-2px] left-0 right-0 h-[4px] bg-primary z-20 pointer-events-none" />
        )}
        {renderSpecificComponent()}
        {isReorderTarget && dropIndicator === 'bottom' && (
            <div className="absolute bottom-[-2px] left-0 right-0 h-[4px] bg-primary z-20 pointer-events-none" />
        )}
      </div>
    </div>
  );
}
