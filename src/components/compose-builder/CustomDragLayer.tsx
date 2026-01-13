'use client';

import React from 'react';
import { useDragLayer } from 'react-dnd';
import { ItemTypes, type LibraryDragItem } from '@/lib/dnd-types';
import { TemplatePreview } from './TemplatePreview';
import { useDesign } from '@/contexts/DesignContext';

const layerStyles: React.CSSProperties = {
  position: 'fixed',
  pointerEvents: 'none',
  zIndex: 100,
  left: 0,
  top: 0,
  width: '100%',
  height: '100%',
};

function getItemStyles(
  initialOffset: { x: number, y: number } | null,
  currentOffset: { x: number, y: number } | null,
) {
  if (!initialOffset || !currentOffset) {
    return {
      display: 'none',
    };
  }

  let { x, y } = currentOffset;

  const transform = `translate(${x}px, ${y}px)`;
  return {
    transform,
    WebkitTransform: transform,
  };
}

export const CustomDragLayer: React.FC = () => {
  const {
    itemType,
    isDragging,
    item,
    initialOffset,
    currentOffset,
  } = useDragLayer((monitor) => ({
    item: monitor.getItem() as LibraryDragItem,
    itemType: monitor.getItemType(),
    initialOffset: monitor.getInitialSourceClientOffset(),
    currentOffset: monitor.getSourceClientOffset(),
    isDragging: monitor.isDragging(),
  }));

  const { customComponentTemplates } = useDesign();

  function renderItem() {
    switch (itemType) {
      case ItemTypes.COMPONENT_LIBRARY_ITEM:
        // We only want to render a preview for custom components here.
        // Standard components will use their default (or no) preview.
        if (item.isCustomComponent) {
          const template = customComponentTemplates.find(t => t.templateId === item.type);
          if (template) {
            return (
                <div style={{ width: '224px', opacity: 0.85,  }}>
                    <div className="border border-sidebar-border rounded-lg bg-card shadow-lg overflow-hidden">
                       <div className="p-2 border-b border-sidebar-border">
                           <p className="text-sm font-medium text-sidebar-foreground truncate" title={template.name}>{template.name}</p>
                       </div>
                       <div className="flex justify-center items-center h-[60px] bg-muted/20 w-full overflow-hidden">
                           <div style={{width: '200px'}}>
                               <TemplatePreview template={template} />
                           </div>
                       </div>
                  </div>
                </div>
            );
          }
        }
        return null;
      default:
        return null;
    }
  }

  if (!isDragging) {
    return null;
  }

  return (
    <div style={layerStyles}>
      <div
        style={getItemStyles(initialOffset, currentOffset)}
      >
        {renderItem()}
      </div>
    </div>
  );
};
