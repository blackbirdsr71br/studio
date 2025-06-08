
'use client';

import { DraggableComponentItem } from "./DraggableComponentItem";
import type { ComponentType } from "@/types/compose-spec";
import { CUSTOM_COMPONENT_TYPE_PREFIX } from "@/types/compose-spec";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useDesign } from '@/contexts/DesignContext';
import { Separator } from '@/components/ui/separator';
import { 
  Type, 
  Image as ImageIcon, 
  Columns, 
  Rows, 
  MousePointerSquareDashed,
  Box,
  CreditCard,
  GalleryVertical,
  GalleryHorizontal,
  Grid3x3,
  GalleryThumbnails,
  BoxSelect // Icon for custom components
} from "lucide-react";

const availableBaseComponents: { type: ComponentType; icon: React.ElementType }[] = [
  { type: "Text", icon: Type },
  { type: "Button", icon: MousePointerSquareDashed },
  { type: "Image", icon: ImageIcon },
  { type: "Column", icon: Columns },
  { type: "Row", icon: Rows },
  { type: "Box", icon: Box },
  { type: "Card", icon: CreditCard },
  { type: "LazyColumn", icon: GalleryVertical },
  { type: "LazyRow", icon: GalleryHorizontal },
  { type: "LazyVerticalGrid", icon: Grid3x3 },
  { type: "LazyHorizontalGrid", icon: GalleryThumbnails },
];

export function ComponentLibraryPanel() {
  const { customComponentTemplates } = useDesign();

  return (
    <aside className="w-40 border-r bg-sidebar p-4 flex flex-col shrink-0">
      <h2 className="text-xl font-semibold mb-4 text-sidebar-foreground font-headline">Components</h2>
      <TooltipProvider delayDuration={200}>
        <ScrollArea className="flex-grow">
          <div className="pr-2">
            <p className="text-xs text-sidebar-foreground/70 mb-1">Standard</p>
            {availableBaseComponents.map(({ type, icon }) => (
              <DraggableComponentItem key={type} type={type} Icon={icon} />
            ))}
            
            {customComponentTemplates.length > 0 && (
              <>
                <Separator className="my-3 bg-sidebar-border" />
                <p className="text-xs text-sidebar-foreground/70 mb-1">Custom</p>
                {customComponentTemplates.map((template) => (
                  <DraggableComponentItem 
                    key={template.templateId} 
                    type={template.templateId} // Pass templateId as type
                    displayName={template.name} // Pass name for tooltip
                    Icon={BoxSelect} // Generic icon for custom components
                  />
                ))}
              </>
            )}
          </div>
        </ScrollArea>
      </TooltipProvider>
    </aside>
  );
}

    