
'use client';

import { DraggableComponentItem } from "./DraggableComponentItem";
import type { ComponentType } from "@/types/compose-spec";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useDesign } from '@/contexts/DesignContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
    <aside className="w-64 border-r bg-sidebar p-4 flex flex-col shrink-0"> {/* Increased width to w-64 */}
      <h2 className="text-xl font-semibold mb-2 text-sidebar-foreground font-headline">Components</h2>
      <TooltipProvider delayDuration={200}>
        <Tabs defaultValue="standard" className="flex-grow flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-2 mb-2 h-auto">
            <TabsTrigger value="standard" className="text-xs px-1 py-1.5">Standard</TabsTrigger>
            <TabsTrigger value="custom" disabled={customComponentTemplates.length === 0} className="text-xs px-1 py-1.5">
              Custom ({customComponentTemplates.length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="standard" className="flex-grow overflow-hidden">
            <ScrollArea className="h-full pr-3"> {/* Added pr-3 for scrollbar spacing */}
              <div className="grid grid-cols-2 gap-2"> {/* Added grid for two columns */}
                {availableBaseComponents.map(({ type, icon }) => (
                  <DraggableComponentItem key={type} type={type} Icon={icon} />
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
          <TabsContent value="custom" className="flex-grow overflow-hidden">
            {customComponentTemplates.length > 0 ? (
              <ScrollArea className="h-full pr-3"> {/* Added pr-3 for scrollbar spacing */}
                <div className="grid grid-cols-2 gap-2"> {/* Added grid for two columns */}
                  {customComponentTemplates.map((template) => (
                    <DraggableComponentItem 
                      key={template.templateId} 
                      type={template.templateId} 
                      displayName={template.name}
                      Icon={BoxSelect} 
                    />
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-sidebar-foreground/70 text-center p-2">
                No custom components saved yet. Select a component on the canvas and use the "Save" icon in the properties panel to create one.
              </div>
            )}
          </TabsContent>
        </Tabs>
      </TooltipProvider>
    </aside>
  );
}
