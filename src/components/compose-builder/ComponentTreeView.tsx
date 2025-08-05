
'use client';

import { useState, useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { useDesign } from '@/contexts/DesignContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { DesignComponent } from '@/types/compose-spec';
import { getComponentIcon } from './ComponentIconMap';
import { ROOT_SCAFFOLD_ID, getComponentDisplayName, isContainerType, CORE_SCAFFOLD_ELEMENT_IDS } from '@/types/compose-spec';
import { ChevronRight, Trash2 } from 'lucide-react';
import { ItemTypes } from '@/lib/dnd-types';


interface DraggedItem {
  id: string;
  type: typeof ItemTypes.CANVAS_COMPONENT_ITEM;
}

interface TreeItemProps {
  componentId: string;
  level: number;
  collapsedNodes: Set<string>;
  toggleNode: (nodeId: string) => void;
}

const RecursiveTreeItem = ({ componentId, level, collapsedNodes, toggleNode }: TreeItemProps) => {
  const { components, getComponentById, selectComponent, selectedComponentId, customComponentTemplates, moveComponent, deleteComponent } = useDesign();
  const component = getComponentById(componentId);
  const ref = useRef<HTMLDivElement>(null);
  const dropIndicatorRef = useRef<'top' | 'bottom' | 'inside' | null>(null);

  // This state is just to trigger re-renders for visual feedback
  const [visualDropIndicator, setVisualDropIndicator] = useState<'top' | 'bottom' | 'inside' | null>(null);

  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.CANVAS_COMPONENT_ITEM,
    item: () => ({ id: componentId, type: ItemTypes.CANVAS_COMPONENT_ITEM }),
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    canDrag: !CORE_SCAFFOLD_ELEMENT_IDS.includes(componentId)
  });

  const [{ isOver, canDrop }, drop] = useDrop<DraggedItem, void, { isOver: boolean; canDrop: boolean; }>({
    accept: ItemTypes.CANVAS_COMPONENT_ITEM,
    hover: (item, monitor) => {
      if (!ref.current || !monitor.isOver({ shallow: true })) {
        if (visualDropIndicator !== null) {
            setVisualDropIndicator(null);
            dropIndicatorRef.current = null;
        }
        return;
      }

      const draggedId = item.id;
      const targetId = componentId;

      if (draggedId === targetId) {
          dropIndicatorRef.current = null;
          setVisualDropIndicator(null);
          return;
      }
      
      const clientOffset = monitor.getClientOffset();
      if (!clientOffset) return;

      const hoverBoundingRect = ref.current.getBoundingClientRect();
      const hoverClientY = clientOffset.y - hoverBoundingRect.top;
      
      let indicator: 'top' | 'bottom' | 'inside' | null = null;
      
      if (isContainerType(component.type, customComponentTemplates)) {
          const topThird = hoverBoundingRect.height / 3;
          const bottomThird = hoverBoundingRect.height * (2/3);

          if (hoverClientY < topThird) indicator = 'top';
          else if (hoverClientY > bottomThird) indicator = 'bottom';
          else indicator = 'inside';
      } else {
          const hoverMiddleY = hoverBoundingRect.height / 2;
          if (hoverClientY < hoverMiddleY) indicator = 'top';
          else indicator = 'bottom';
      }
      
      if (indicator !== visualDropIndicator) {
        dropIndicatorRef.current = indicator;
        setVisualDropIndicator(indicator);
      }
    },
    canDrop: (item) => {
      if (item.id === componentId) return false;
      
      let p = component.parentId;
      while(p) {
        if (p === item.id) return false;
        const parentComp = getComponentById(p);
        p = parentComp ? parentComp.parentId : null;
      }

      return true;
    },
    drop: (item) => {
      const draggedId = item.id;
      const targetId = componentId;
      const dropAction = dropIndicatorRef.current;
      const targetComponent = getComponentById(targetId);

      if (!targetComponent || !dropAction) return;

      if (dropAction === 'inside' && isContainerType(targetComponent.type, customComponentTemplates)) {
          moveComponent(draggedId, targetId);
      } else if (dropAction === 'top' || dropAction === 'bottom') {
          const targetParentId = targetComponent.parentId;
          if (!targetParentId) return;

          const parentComponent = getComponentById(targetParentId);
          if (!parentComponent?.properties.children) return;
          
          let targetIndex = parentComponent.properties.children.indexOf(targetId);
          if (targetIndex === -1) return;

          const finalIndex = dropAction === 'bottom' ? targetIndex + 1 : targetIndex;
          moveComponent(draggedId, targetParentId, finalIndex);
      }

      dropIndicatorRef.current = null;
      setVisualDropIndicator(null);
    },
    collect: (monitor) => ({
        isOver: monitor.isOver({ shallow: true }),
        canDrop: monitor.canDrop(),
    }),
  });

  drop(drag(ref));

  if (!component) return null;

  const isSelected = selectedComponentId === component.id;
  const isEffectivelyContainer = isContainerType(component.type, customComponentTemplates);
  const hasChildren = component.properties.children && component.properties.children.length > 0;
  const isCollapsible = isEffectivelyContainer && hasChildren;
  const isCollapsed = collapsedNodes.has(component.id);

  const showDropInside = isOver && canDrop && visualDropIndicator === 'inside';
  const showDropTop = isOver && canDrop && visualDropIndicator === 'top';
  const showDropBottom = isOver && canDrop && visualDropIndicator === 'bottom';
  

  let componentTypeForIcon = component.type;
  let componentNameForDisplay = component.name;

  if (component.templateIdRef) {
    const template = customComponentTemplates.find(t => t.templateId === component.templateIdRef);
    if(template) {
        const rootOfTemplate = template.componentTree.find(c => c.id === template.rootComponentId);
        if(rootOfTemplate) componentTypeForIcon = rootOfTemplate.type;
        componentNameForDisplay = component.name; 
    }
  }

  const Icon = getComponentIcon(componentTypeForIcon);

  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    selectComponent(component.id);
  };
  
  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if(isCollapsible) {
      toggleNode(component.id);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete "${component.name}" and all its children?`)) {
        deleteComponent(component.id);
    }
  };
  
  const rootComponentOnCanvas = components.find(c => c.parentId === null);
  const isRootOfCanvas = component.id === rootComponentOnCanvas?.id;
  const isDeletable = !CORE_SCAFFOLD_ELEMENT_IDS.includes(component.id) && !isRootOfCanvas;

  return (
    <div ref={ref} className="relative">
      {showDropTop && <div className="absolute top-0 left-2 right-2 h-[2px] bg-primary z-10 pointer-events-none" />}
      <div
        onClick={handleSelect}
        className={cn(
          'group flex items-center gap-1.5 p-1.5 rounded-md cursor-pointer text-sidebar-foreground',
          isSelected && 'bg-accent text-accent-foreground',
          isDragging && 'opacity-40',
          !isSelected && !showDropInside && 'hover:bg-accent/10',
          showDropInside && 'bg-primary/20 ring-1 ring-primary'
        )}
        style={{ paddingLeft: `${level * 1.0 + 0.375}rem` }}
        title={`${component.name} (${getComponentDisplayName(component.type)})`}
      >
        <button
          onClick={handleToggle}
          className={cn(
            'flex items-center justify-center h-4 w-4 rounded-sm text-muted-foreground hover:bg-accent/20',
            !isCollapsible && 'invisible',
            isSelected && 'text-accent-foreground'
          )}
          aria-label={isCollapsed ? `Expand ${componentNameForDisplay}` : `Collapse ${componentNameForDisplay}`}
        >
          <ChevronRight className={cn("h-4 w-4 shrink-0 transition-transform duration-200", !isCollapsed && "rotate-90")} />
        </button>

        <Icon className={cn("h-4 w-4 shrink-0", isSelected ? 'text-accent-foreground' : 'text-primary')} />
        <span className="text-sm flex-grow min-w-0 whitespace-nowrap overflow-hidden text-ellipsis">{componentNameForDisplay}</span>
        
        {isDeletable && (
            <button
                onClick={handleDelete}
                className="ml-auto p-0.5 rounded-sm text-destructive/70 hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label={`Delete ${componentNameForDisplay}`}
            >
                <Trash2 className="h-3.5 w-3.5" />
            </button>
        )}
      </div>
      {showDropBottom && <div className="absolute bottom-0 left-2 right-2 h-[2px] bg-primary z-10 pointer-events-none" />}
      {!isCollapsed && hasChildren && (
        <div className="relative pl-4">
           {component.properties.children.map(childId => (
             <RecursiveTreeItem key={childId} componentId={childId} level={level + 1} collapsedNodes={collapsedNodes} toggleNode={toggleNode}/>
           ))}
        </div>
      )}
    </div>
  );
};

export const ComponentTreeView = () => {
  const { components } = useDesign();
  // Find the root component by looking for the one with no parent. This works for both the main canvas and template editing.
  const rootComponent = components.find(c => c.parentId === null);
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());

  const toggleNode = (nodeId: string) => {
    setCollapsedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };

  return (
    <ScrollArea className="h-full -mx-4">
      <div className="p-2 space-y-0.5 min-w-max">
        {rootComponent ? (
          <RecursiveTreeItem 
            componentId={rootComponent.id} 
            level={0} 
            collapsedNodes={collapsedNodes} 
            toggleNode={toggleNode}
          />
        ) : (
          <p className="text-sm text-muted-foreground p-2">Loading component tree...</p>
        )}
      </div>
    </ScrollArea>
  );
};
