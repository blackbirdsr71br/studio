
'use client';

import React, { useRef } from 'react';
import { useDesign } from '@/contexts/DesignContext';
import type { DesignComponent } from '@/types/compose-spec';
import { RenderedComponentWrapper } from './component-renderer/RenderedComponentWrapper';
import { cn } from '@/lib/utils';
import { ROOT_SCAFFOLD_ID, DEFAULT_CONTENT_LAZY_COLUMN_ID } from '@/types/compose-spec';

export function DesignSurface() {
  const { activeDesign, selectComponent, getComponentById } = useDesign();
  const surfaceRef = useRef<HTMLDivElement>(null);

  const handleSurfaceClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === surfaceRef.current) {
       selectComponent(activeDesign?.editingTemplateInfo ? activeDesign.editingTemplateInfo.rootComponentId : DEFAULT_CONTENT_LAZY_COLUMN_ID);
    }
  };
  
  const isEditingTemplate = !!activeDesign?.editingTemplateInfo;
  const rootComponent = isEditingTemplate
    ? activeDesign.components.find(c => c.parentId === null)
    : activeDesign?.components.find(c => c.id === ROOT_SCAFFOLD_ID && c.parentId === null);

  return (
    <div
      ref={surfaceRef}
      className={cn(
        "bg-background relative border-2 border-transparent", 
        "w-full h-full", 
        "flex flex-col overflow-hidden" 
      )}
      onClick={handleSurfaceClick}
      id="design-surface"
    >
      {rootComponent ? (
        <RenderedComponentWrapper component={rootComponent} getComponentById={getComponentById} />
      ) : (
         <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground pointer-events-none p-4 text-center">
            <p className="text-lg">{activeDesign?.editingTemplateInfo ? `Loading template "${activeDesign.editingTemplateInfo.name}"...` : 'Initializing canvas...'}</p>
        </div>
      )}

    </div>
  );
}
