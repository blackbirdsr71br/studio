'use client';

import { useState } from 'react';
import { useDesign } from '@/contexts/DesignContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { DesignComponent } from '@/types/compose-spec';
import { getComponentIcon } from './ComponentIconMap';
import { ROOT_SCAFFOLD_ID, getComponentDisplayName, isContainerType } from '@/types/compose-spec';
import { ChevronRight } from 'lucide-react';


interface TreeItemProps {
  componentId: string;
  level: number;
  collapsedNodes: Set<string>;
  toggleNode: (nodeId: string) => void;
}

const RecursiveTreeItem = ({ componentId, level, collapsedNodes, toggleNode }: TreeItemProps) => {
  const { getComponentById, selectComponent, selectedComponentId, customComponentTemplates } = useDesign();
  const component = getComponentById(componentId);

  if (!component) return null;

  const isSelected = selectedComponentId === component.id;
  const isEffectivelyContainer = isContainerType(component.type, customComponentTemplates);
  const hasChildren = component.properties.children && component.properties.children.length > 0;
  const isCollapsible = isEffectivelyContainer && hasChildren;
  const isCollapsed = collapsedNodes.has(component.id);

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

  return (
    <>
      <div
        onClick={handleSelect}
        className={cn(
          'flex items-center gap-1.5 p-1.5 rounded-md cursor-pointer text-sidebar-foreground hover:bg-accent/10',
          isSelected && 'bg-accent text-accent-foreground hover:bg-accent'
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
        <span className="text-sm truncate">{componentNameForDisplay}</span>
      </div>
      {!isCollapsed && hasChildren && (
        <div className="relative">
           {component.properties.children.map(childId => (
             <RecursiveTreeItem key={childId} componentId={childId} level={level + 1} collapsedNodes={collapsedNodes} toggleNode={toggleNode}/>
           ))}
        </div>
      )}
    </>
  );
};

export const ComponentTreeView = () => {
  const { components } = useDesign();
  const rootComponent = components.find(c => c.id === ROOT_SCAFFOLD_ID);
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
      <div className="p-2 space-y-0.5">
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
