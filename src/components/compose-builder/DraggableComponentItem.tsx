
'use client';

import type { ComponentType, CustomComponentTemplate } from "@/types/compose-spec";
import type { DesignContextType } from "@/contexts/DesignContext";
import { getComponentDisplayName } from "@/types/compose-spec";
import type { Icon as LucideIcon } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { useDrag } from 'react-dnd';
import { ItemTypes } from '@/lib/dnd-types';
import { cn } from "@/lib/utils";
import { DesignContext, useDesign } from '@/contexts/DesignContext';
import { useMemo, FC, ReactNode } from "react";
import { RenderedComponentWrapper } from './RenderedComponentWrapper';

// A read-only, self-contained provider for rendering previews.
const PreviewDesignProvider: FC<{ template: CustomComponentTemplate, children: ReactNode }> = ({ template, children }) => {
  const { customComponentTemplates: allTemplates } = useDesign(); // Get all templates from the main context
  
  const dummyContextValue = useMemo(() => {
    const components = template.componentTree;
    const getComponentById = (id: string) => components.find(c => c.id === id);

    const value: DesignContextType = {
        components,
        getComponentById,
        customComponentTemplates: allTemplates,
        selectedComponentId: null,
        nextId: 0,
        editingTemplateInfo: null,
        editingLayoutInfo: null,
        savedLayouts: [],
        history: [],
        future: [],
        clipboard: null,
        addComponent: () => {},
        deleteComponent: () => {},
        selectComponent: () => {},
        updateComponent: () => {},
        updateComponentPosition: () => {},
        clearDesign: () => {},
        setDesign: () => {},
        overwriteComponents: () => ({success: true}),
        moveComponent: () => {},
        saveSelectedAsCustomTemplate: async () => {},
        deleteCustomComponentTemplate: async () => {},
        renameCustomComponentTemplate: async () => {},
        saveCurrentCanvasAsLayout: async () => {},
        loadLayoutToCanvas: () => {},
        deleteSavedLayout: async () => {},
        renameSavedLayout: async () => {},
        loadTemplateForEditing: () => {},
        updateCustomTemplate: async () => {},
        loadLayoutForEditing: () => {},
        updateSavedLayout: async () => {},
        undo: () => {},
        redo: () => {},
        copyComponent: () => {},
        pasteComponent: () => {},
    };
    return value;
  }, [template, allTemplates]);

  return <DesignContext.Provider value={dummyContextValue}>{children}</DesignContext.Provider>
};

const CustomComponentPreview = ({ template }: { template: CustomComponentTemplate }) => {
  const rootComponent = template.componentTree.find(c => c.id === template.rootComponentId);

  if (!rootComponent) {
    return <div className="text-xs text-destructive">Preview Error</div>;
  }
  
  return (
    <div className="w-full h-32 bg-background rounded-sm overflow-hidden border border-sidebar-border/50 mb-1 pointer-events-none flex items-center justify-center">
      <div style={{ transform: 'scale(0.35)', transformOrigin: 'center' }}>
         <div style={{ width: '432px' }}>
           <PreviewDesignProvider template={template}>
              <RenderedComponentWrapper component={rootComponent} zoomLevel={1} />
           </PreviewDesignProvider>
         </div>
      </div>
    </div>
  );
};


interface DraggableComponentItemProps {
  type: ComponentType | string; // Can be base type or custom templateId
  Icon: LucideIcon;
  displayName?: string; // Explicit display name for custom components
  template?: CustomComponentTemplate;
}

export function DraggableComponentItem({ type, Icon, displayName, template }: DraggableComponentItemProps) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.COMPONENT_LIBRARY_ITEM,
    item: { type }, 
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));

  const nameForDisplay = displayName || getComponentDisplayName(type);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          ref={drag} 
          className={cn(
            "flex flex-col items-stretch text-center p-2 mb-2 border border-sidebar-border bg-card rounded-md shadow-sm hover:shadow-md cursor-grab transition-all duration-150 ease-in-out active:cursor-grabbing hover:bg-sidebar-accent hover:text-sidebar-accent-foreground group",
            isDragging && "opacity-50 cursor-grabbing"
          )}
          aria-label={`Drag to add ${nameForDisplay} component`}
        >
          {template ? (
            <CustomComponentPreview template={template} />
          ) : (
            <div className="flex flex-col items-center justify-center py-2">
               <Icon className="h-7 w-7 text-sidebar-primary mb-1" />
            </div>
          )}
          <p className="text-xs text-sidebar-foreground group-hover:text-sidebar-accent-foreground break-words w-full px-1">
            {nameForDisplay}
          </p>
        </div>
      </TooltipTrigger>
      <TooltipContent side="right" align="center">
        <p>{nameForDisplay}</p>
      </TooltipContent>
    </Tooltip>
  );
}
