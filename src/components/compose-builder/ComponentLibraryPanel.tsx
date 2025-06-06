
'use client';

import { DraggableComponentItem } from "./DraggableComponentItem";
import type { ComponentType } from "@/types/compose-spec";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Type, Image as ImageIcon, Columns, Rows, MousePointerSquareDashed } from "lucide-react";

const availableComponents: { type: ComponentType; icon: React.ElementType }[] = [
  { type: "Text", icon: Type },
  { type: "Button", icon: MousePointerSquareDashed },
  { type: "Image", icon: ImageIcon },
  { type: "Column", icon: Columns },
  { type: "Row", icon: Rows },
];

export function ComponentLibraryPanel() {
  return (
    <aside className="w-72 border-r bg-sidebar p-4 flex flex-col shrink-0">
      <h2 className="text-xl font-semibold mb-4 text-sidebar-foreground font-headline">Components</h2>
      <ScrollArea className="flex-grow">
        <div className="pr-2">
          {availableComponents.map(({ type, icon }) => (
            <DraggableComponentItem key={type} type={type} Icon={icon} />
          ))}
        </div>
      </ScrollArea>
    </aside>
  );
}
