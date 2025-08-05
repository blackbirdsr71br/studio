
'use client';

import React from 'react';
import { DraggableComponentItem } from "./DraggableComponentItem";
import type { ComponentType } from "@/types/compose-spec";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TooltipProvider } from "@/components/ui/tooltip";
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
  Space,
  PanelTop, 
  PanelBottom, 
  Film, 
} from "lucide-react";

// "ScaffoldStructure" removed as the canvas root is now always a Scaffold
const availableBaseComponents: { type: ComponentType; icon: React.ElementType }[] = [
  { type: "Text", icon: Type },
  { type: "Button", icon: MousePointerSquareDashed },
  { type: "Image", icon: ImageIcon },
  { type: "Column", icon: Columns },
  { type: "Row", icon: Rows },
  { type: "Box", icon: Box },
  { type: "Card", icon: CreditCard },
  { type: "AnimatedContent", icon: Film },
  { type: "LazyColumn", icon: GalleryVertical },
  { type: "LazyRow", icon: GalleryHorizontal },
  { type: "LazyVerticalGrid", icon: Grid3x3 },
  { type: "LazyHorizontalGrid", icon: GalleryThumbnails },
  { type: "Spacer", icon: Space },
  { type: "TopAppBar", icon: PanelTop }, 
  { type: "BottomNavigationBar", icon: PanelBottom },
];

export function ComponentLibraryPanel() {
  return (
    <aside className="w-64 border-r bg-sidebar p-4 flex flex-col shrink-0">
      <h2 className="text-xl font-semibold mb-2 text-sidebar-foreground font-headline">Components</h2>
      <TooltipProvider delayDuration={200}>
        <Tabs defaultValue="standard" className="flex-grow flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-1 mb-2 h-auto">
            <TabsTrigger value="standard" className="text-xs px-1 py-1.5">Standard</TabsTrigger>
          </TabsList>

          <TabsContent value="standard" className="flex-grow overflow-hidden">
            <ScrollArea className="h-full pr-3">
              <div className="grid grid-cols-2 gap-2">
                {availableBaseComponents.map(({ type, icon }) => (
                  <DraggableComponentItem key={type as string} type={type as string} Icon={icon} />
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </TooltipProvider>
    </aside>
  );
}
