
'use client';

import React, { useRef } from 'react';
import { useDesign } from '@/contexts/DesignContext';
import type { DesignComponent } from '@/types/compose-spec';
import { RenderedComponentWrapper } from './component-renderer/RenderedComponentWrapper';
import { cn } from '@/lib/utils';
import { ROOT_SCAFFOLD_ID, DEFAULT_CONTENT_LAZY_COLUMN_ID } from '@/types/compose-spec';

export function DesignSurface() {
  const { activeDesign, selectComponent } = useDesign();
  const surfaceRef = useRef<HTMLDivElement>(null);

  const handleSurfaceClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === surfaceRef.current) {
       selectComponent(activeDesign?.editingTemplateInfo ? activeDesign.editingTemplateInfo.rootComponentId : DEFAULT_CONTENT_LAZY_COLUMN_ID);
    }
  };
  
  const rootComponent = activeDesign?.editingTemplateInfo
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
      <style jsx global>{`
        .drag-over-container { 
          outline: 2px dashed hsl(var(--accent));
          background-color: hsla(var(--accent-hsl, 291 64% 42%) / 0.1) !important; 
        }
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
      
      {rootComponent ? (
        <RenderedComponentWrapper component={rootComponent} />
      ) : (
         <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground pointer-events-none p-4 text-center">
            <p className="text-lg">{activeDesign?.editingTemplateInfo ? `Loading template "${activeDesign.editingTemplateInfo.name}"...` : 'Initializing canvas...'}</p>
        </div>
      )}

    </div>
  );
}
