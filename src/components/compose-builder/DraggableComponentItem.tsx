
'use client';

import type { ComponentType } from "@/types/compose-spec";
import { getComponentDisplayName } from "@/types/compose-spec";
// GripVertical removed as it's no longer used in the new design
import type { Icon as LucideIcon } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { useDrag } from 'react-dnd';
import { ItemTypes } from '@/lib/dnd-types';
import { cn } from "@/lib/utils";

interface DraggableComponentItemProps {
  type: ComponentType | string; // Can be base type or custom templateId
  Icon: LucideIcon;
  displayName?: string; // Explicit display name for custom components
}

export function DraggableComponentItem({ type, Icon, displayName }: DraggableComponentItemProps) {
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
            "flex flex-col items-center p-2 mb-2 border border-sidebar-border bg-card rounded-md shadow-sm hover:shadow-md cursor-grab transition-all duration-150 ease-in-out active:cursor-grabbing hover:bg-sidebar-accent hover:text-sidebar-accent-foreground group", // Added 'group' for hover effects on children
            isDragging && "opacity-50 cursor-grabbing"
          )}
          aria-label={`Drag to add ${nameForDisplay} component`}
        >
          <Icon className="h-7 w-7 text-sidebar-primary mb-1" /> {/* Icon (image) */}
          <p className="text-xs text-center text-sidebar-foreground group-hover:text-sidebar-accent-foreground break-words w-full px-1">
            {nameForDisplay} {/* Text below */}
          </p>
        </div>
      </TooltipTrigger>
      <TooltipContent side="right" align="center">
        <p>{nameForDisplay}</p>
      </TooltipContent>
    </Tooltip>
  );
}
