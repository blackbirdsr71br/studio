
'use client';

import type { ComponentType } from "@/types/compose-spec";
import { getComponentDisplayName } from "@/types/compose-spec";
import { GripVertical } from "lucide-react";
import type { Icon as LucideIcon } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

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
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          draggable
          onDragStart={handleDragStart}
          className="flex items-center p-1.5 mb-2 border border-sidebar bg-card rounded-md shadow-sm hover:shadow-md cursor-grab transition-all duration-150 ease-in-out active:cursor-grabbing hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          aria-label={`Drag to add ${getComponentDisplayName(type)} component`}
        >
          <GripVertical className="h-4 w-4 text-sidebar-foreground opacity-70 mr-1.5" />
          <Icon className="h-4 w-4 text-sidebar-primary" />
        </div>
      </TooltipTrigger>
      <TooltipContent side="right" align="center">
        <p>{getComponentDisplayName(type)}</p>
      </TooltipContent>
    </Tooltip>
  );
}

