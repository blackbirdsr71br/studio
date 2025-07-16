
'use client';

import type { ComponentType, CustomComponentTemplate, DesignComponent, SavedLayout } from "@/types/compose-spec";
import type { DesignContextType } from "@/contexts/DesignContext";
import { getComponentDisplayName, ROOT_SCAFFOLD_ID, isContainerType } from "@/types/compose-spec";
import type { Icon as LucideIcon } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { useDrag } from 'react-dnd';
import { ItemTypes } from '@/lib/dnd-types';
import { cn } from "@/lib/utils";
import { DesignContext, useDesign } from '@/contexts/DesignContext';
import { useMemo, FC, ReactNode } from "react";
import { RenderedComponentWrapper } from './RenderedComponentWrapper';

// A read-only, self-contained provider for rendering previews.
// This sandboxes the rendering so it doesn't interfere with the main canvas.
const PreviewDesignProvider: FC<{ components: DesignComponent[], children: ReactNode }> = ({ components, children }) => {
  const { customComponentTemplates: allTemplates } = useDesign(); // Get all templates from the main context
  
  const dummyContextValue = useMemo(() => {
    const contextComponents = components; // No data modification needed here anymore
    const getComponentById = (id: string) => contextComponents.find(c => c.id === id);

    const value: DesignContextType = {
        components: contextComponents,
        getComponentById,
        customComponentTemplates: allTemplates,
        selectedComponentId: null,
        nextId: 0,
        editingTemplateInfo: null,
        editingLayoutInfo: null,
        savedLayouts: [],
        galleryImages: [],
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
        addImageToGallery: async () => {},
        removeImageFromGallery: async () => {},
    };
    return value;
  }, [components, allTemplates]);

  return <DesignContext.Provider value={dummyContextValue}>{children}</DesignContext.Provider>
};

const CustomComponentPreview = ({ template }: { template: CustomComponentTemplate }) => {
  const rootComponent = template.componentTree.find(c => c.id === template.rootComponentId);

  if (!rootComponent) {
    return <div className="text-xs text-destructive">Preview Error</div>;
  }
  
  const PREVIEW_VIEWPORT_WIDTH = 210;
  const PREVIEW_VIEWPORT_HEIGHT = 120;

  let unscaledWidth: number;
  if (typeof rootComponent.properties.width === 'number') {
    unscaledWidth = rootComponent.properties.width;
  } else if (rootComponent.properties.fillMaxWidth || rootComponent.properties.fillMaxSize) {
    unscaledWidth = 432;
  } else {
    unscaledWidth = 150;
  }

  let unscaledHeight: number;
  if (typeof rootComponent.properties.height === 'number') {
    unscaledHeight = rootComponent.properties.height;
  } else if (rootComponent.properties.fillMaxHeight || rootComponent.properties.fillMaxSize) {
    unscaledHeight = 400;
  } else {
    // A better heuristic for wrap_content height, assuming a standard aspect ratio if not defined
    unscaledHeight = isContainerType(rootComponent.type, []) ? unscaledWidth * (4/3) : 100;
  }
  
  const scaleX = unscaledWidth > 0 ? PREVIEW_VIEWPORT_WIDTH / unscaledWidth : 1;
  const scaleY = unscaledHeight > 0 ? PREVIEW_VIEWPORT_HEIGHT / unscaledHeight : 1;
  
  const scale = Math.min(scaleX, scaleY);
  
  return (
    <div className="w-full h-32 bg-background rounded-sm overflow-hidden border border-sidebar-border/50 mb-1 pointer-events-none flex items-center justify-center">
      <div style={{ transform: `scale(${scale})`, transformOrigin: 'center' }}>
         <div style={{ 
              width: `${unscaledWidth}px`,
              height: `${unscaledHeight}px`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
           <PreviewDesignProvider components={template.componentTree}>
              <RenderedComponentWrapper component={rootComponent} isPreview={true} />
           </PreviewDesignProvider>
         </div>
      </div>
    </div>
  );
};

export const SavedLayoutPreview = ({ layout }: { layout: SavedLayout }) => {
  const rootComponent = layout.components.find(c => c.id === ROOT_SCAFFOLD_ID && c.parentId === null);

  if (!rootComponent) {
    return <div className="text-xs text-destructive flex items-center justify-center h-full">Preview Error: No Scaffold</div>;
  }
  
  const PREVIEW_VIEWPORT_WIDTH = 210;
  const PREVIEW_VIEWPORT_HEIGHT = 120;

  const LAYOUT_WIDTH = 432;
  const LAYOUT_HEIGHT = 896;
  
  const scaleX = PREVIEW_VIEWPORT_WIDTH / LAYOUT_WIDTH;
  const scaleY = PREVIEW_VIEWPORT_HEIGHT / LAYOUT_HEIGHT;
  
  const scale = Math.min(scaleX, scaleY);
  
  return (
    <div className="w-full h-32 bg-muted/20 rounded-sm overflow-hidden border border-sidebar-border/50 mb-1 pointer-events-none flex items-center justify-center">
      <div style={{ transform: `scale(${scale})`, transformOrigin: 'center' }}>
         <div style={{ 
              width: `${LAYOUT_WIDTH}px`,
              height: `${LAYOUT_HEIGHT}px`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
           <PreviewDesignProvider components={layout.components}>
              <RenderedComponentWrapper component={rootComponent} isPreview={true} />
           </PreviewDesignProvider>
         </div>
      </div>
    </div>
  );
};


interface DraggableComponentItemProps {
  type: ComponentType | string;
  Icon: LucideIcon;
  displayName?: string;
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

    
