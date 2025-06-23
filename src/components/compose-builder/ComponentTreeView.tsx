'use client';

import { useDesign } from '@/contexts/DesignContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { DesignComponent } from '@/types/compose-spec';
import { getComponentIcon } from './ComponentIconMap';
import { ROOT_SCAFFOLD_ID, getComponentDisplayName } from '@/types/compose-spec';


interface TreeItemProps {
  componentId: string;
  level: number;
}

const RecursiveTreeItem = ({ componentId, level }: TreeItemProps) => {
  const { getComponentById, selectComponent, selectedComponentId, customComponentTemplates } = useDesign();
  const component = getComponentById(componentId);

  if (!component) return null;

  const isSelected = selectedComponentId === component.id;
  
  let componentTypeForIcon = component.type;
  let componentNameForDisplay = component.name;

  if (component.templateIdRef) {
    const template = customComponentTemplates.find(t => t.templateId === component.templateIdRef);
    if(template) {
        const rootOfTemplate = template.componentTree.find(c => c.id === template.rootComponentId);
        if(rootOfTemplate) componentTypeForIcon = rootOfTemplate.type;
        // Use the instance name, which might be the template name by default or user-edited
        componentNameForDisplay = component.name; 
    }
  }

  const Icon = getComponentIcon(componentTypeForIcon);

  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    selectComponent(component.id);
  };

  return (
    <>
      <div
        onClick={handleSelect}
        className={cn(
          'flex items-center gap-2 p-1.5 rounded-md cursor-pointer text-sidebar-foreground hover:bg-accent/10',
          isSelected && 'bg-accent text-accent-foreground hover:bg-accent'
        )}
        style={{ paddingLeft: `${level * 1.25 + 0.375}rem` }}
        title={`${component.name} (${getComponentDisplayName(component.type)})`}
      >
        <Icon className={cn("h-4 w-4 shrink-0", isSelected ? 'text-accent-foreground' : 'text-primary')} />
        <span className="text-sm truncate">{componentNameForDisplay}</span>
      </div>
      {component.properties.children && component.properties.children.length > 0 && (
        <div className="relative">
           {component.properties.children.map(childId => (
             <RecursiveTreeItem key={childId} componentId={childId} level={level + 1} />
           ))}
        </div>
      )}
    </>
  );
};

export const ComponentTreeView = () => {
  const { components } = useDesign();
  const rootComponent = components.find(c => c.id === ROOT_SCAFFOLD_ID);

  return (
    <ScrollArea className="h-full -mx-4">
      <div className="p-2 space-y-0.5">
        {rootComponent ? (
          <RecursiveTreeItem componentId={rootComponent.id} level={0} />
        ) : (
          <p className="text-sm text-muted-foreground p-2">Loading component tree...</p>
        )}
      </div>
    </ScrollArea>
  );
};
