
'use client';

import type { ComponentType } from "@/types/compose-spec";
import { getComponentDisplayName } from "@/types/compose-spec";
import { GripVertical } from "lucide-react";
import type { Icon as LucideIcon } from "lucide-react";

interface DraggableComponentItemProps {
  type: ComponentType;
  Icon: LucideIcon; 
}

export function DraggableComponentItem({ type, Icon }: DraggableComponentItemProps) {
  const handleDragStart = (event: React.DragEvent<HTMLDivElement>) => {
    event.dataTransfer.setData("application/component-type", type);
    event.dataTransfer.effectAllowed = "copy";
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className="flex items-center p-3 mb-2 border border-sidebar bg-card rounded-md shadow-sm hover:shadow-md cursor-grab transition-all duration-150 ease-in-out active:cursor-grabbing hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      aria-label={`Drag to add ${getComponentDisplayName(type)} component`}
    >
      <GripVertical className="h-5 w-5 text-sidebar-foreground opacity-70 mr-3" />
      <Icon className="h-5 w-5 text-sidebar-primary mr-3" />
      <span className="text-sm font-medium text-card-foreground">{getComponentDisplayName(type)}</span>
    </div>
  );
}

