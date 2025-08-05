
'use client';

import type { ComponentType } from "@/types/compose-spec";
import { getComponentDisplayName } from "@/types/compose-spec";
import type { Icon as LucideIcon } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { useDrag } from 'react-dnd';
import { ItemTypes } from '@/lib/dnd-types';
import { cn } from "@/lib/utils";

interface DraggableComponentItemProps {
  type: ComponentType | string;
  Icon?: LucideIcon;
  displayName?: string;
  isCustomComponent?: boolean;
  children?: React.ReactNode;
}

export function DraggableComponentItem({ type, Icon, displayName, isCustomComponent = false, children }: DraggableComponentItemProps) {
  // Gracefully handle cases where a template might not have a valid ID yet.
  if (!type) {
    return null;
  }
  
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.COMPONENT_LIBRARY_ITEM,
    item: { type }, 
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));

  const nameForDisplay = displayName || getComponentDisplayName(type);

  if (isCustomComponent) {
    return (
      <div
        ref={drag}
        className={cn(
          "cursor-grab active:cursor-grabbing",
          isDragging && "opacity-50"
        )}
        aria-label={`Drag to add ${nameForDisplay} component`}
      >
        {children}
      </div>
    );
  }


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
          <div className="flex flex-col items-center justify-center py-2">
              {Icon && <Icon className="h-7 w-7 text-sidebar-primary mb-1" />}
          </div>
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
