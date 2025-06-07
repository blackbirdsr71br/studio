
'use client';

import type { ComponentType } from "@/types/compose-spec";
import { getComponentDisplayName } from "@/types/compose-spec";
import { GripVertical } from "lucide-react";
import type { Icon as LucideIcon } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { useDrag } from 'react-dnd';
import { ItemTypes } from '@/lib/dnd-types';
import { cn } from "@/lib/utils";

interface DraggableComponentItemProps {
  type: ComponentType;
  Icon: LucideIcon;
}

export function DraggableComponentItem({ type, Icon }: DraggableComponentItemProps) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.COMPONENT_LIBRARY_ITEM,
    item: { type }, // This is the data that will be available on drop
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          ref={drag} // Attach the drag source ref here
          className={cn(
            "flex items-center p-0.5 mb-2 border border-sidebar bg-card rounded-md shadow-sm hover:shadow-md cursor-grab transition-all duration-150 ease-in-out active:cursor-grabbing hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            isDragging && "opacity-50 cursor-grabbing"
          )}
          aria-label={`Drag to add ${getComponentDisplayName(type)} component`}
        >
          <GripVertical className="h-[30px] w-[30px] text-sidebar-foreground opacity-70" />
          <Icon className="h-[30px] w-[30px] text-sidebar-primary ml-1" />
        </div>
      </TooltipTrigger>
      <TooltipContent side="right" align="center">
        <p>{getComponentDisplayName(type)}</p>
      </TooltipContent>
    </Tooltip>
  );
}
