
'use client';

import React from 'react';
import { DraggableComponentItem } from "./DraggableComponentItem";
import type { ComponentType, CustomComponentTemplate } from "@/types/compose-spec";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDesign } from '@/contexts/DesignContext';
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
  Pencil,
  Trash2,
  BoxSelect, 
  Loader2
} from "lucide-react";
import { Button } from '../ui/button';
import { getComponentIcon } from './ComponentIconMap';

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


function CustomComponentsList() {
    const { customComponentTemplates, isLoadingCustomTemplates, loadTemplateForEditing, deleteCustomTemplate } = useDesign();

    const handleEdit = (template: CustomComponentTemplate) => {
        loadTemplateForEditing(template);
    };

    const handleDelete = (template: CustomComponentTemplate) => {
        if (window.confirm(`Are you sure you want to delete the component "${template.name}"? This cannot be undone.`)) {
            deleteCustomTemplate(template.firestoreId as string);
        }
    };
    
    if (isLoadingCustomTemplates) {
        return (
            <div className="flex justify-center items-center h-full">
                <Loader2 className="h-6 w-6 animate-spin" />
            </div>
        )
    }

    if (!customComponentTemplates || customComponentTemplates.length === 0) {
        return <p className="text-xs text-center text-muted-foreground p-2">No custom components saved yet.</p>;
    }

    return (
        <div className="space-y-2">
            {customComponentTemplates.map((template) => {
                const rootComponent = template.componentTree.find(c => c.id === template.rootComponentId);
                const Icon = rootComponent ? getComponentIcon(rootComponent.type) : BoxSelect;

                return (
                    <div key={template.templateId} className="relative group/custom-item">
                        <DraggableComponentItem
                            type={template.templateId}
                            Icon={Icon}
                            displayName={template.name}
                        />
                        <div className="absolute top-1 right-1 flex items-center gap-1 opacity-0 group-hover/custom-item:opacity-100 transition-opacity duration-200">
                             <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleEdit(template)}>
                                <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(template)}>
                                <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}


export function ComponentLibraryPanel() {
  return (
    <aside className="w-64 border-r bg-sidebar p-4 flex flex-col shrink-0">
      <h2 className="text-xl font-semibold mb-2 text-sidebar-foreground font-headline">Components</h2>
      <TooltipProvider delayDuration={200}>
        <Tabs defaultValue="standard" className="flex-grow flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-2 mb-2 h-auto">
            <TabsTrigger value="standard" className="text-xs px-1 py-1.5">Standard</TabsTrigger>
            <TabsTrigger value="custom" className="text-xs px-1 py-1.5">Custom</TabsTrigger>
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
           <TabsContent value="custom" className="flex-grow overflow-hidden">
            <ScrollArea className="h-full pr-3">
              <CustomComponentsList />
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </TooltipProvider>
    </aside>
  );
}
