
'use client';

import React from 'react';
import { DraggableComponentItem } from "./DraggableComponentItem";
import type { ComponentType, CustomComponentTemplate, SavedLayout } from "@/types/compose-spec";
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
  View, // Carousel icon
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
  Loader2,
  Download,
  CheckSquare,
  CircleDot,
  MenuSquare, // Added
  User,
  Settings,
  LayoutGrid,
  Home,
  Star,
  Heart,
} from "lucide-react";
import { Button } from '../ui/button';
import { LayoutPreview } from './LayoutPreview';
import { Badge } from '@/components/ui/badge';
import { getComponentIcon } from './ComponentIconMap';
import { TemplatePreview } from './TemplatePreview';


const availableBaseComponents: { type: ComponentType; icon: React.ElementType }[] = [
  { type: "Text", icon: Type },
  { type: "Button", icon: MousePointerSquareDashed },
  { type: "Image", icon: ImageIcon },
  { type: "Checkbox", icon: CheckSquare },
  { type: "RadioButton", icon: CircleDot },
  { type: "DropdownMenu", icon: MenuSquare }, // Added
  { type: "Column", icon: Columns },
  { type: "Row", icon: Rows },
  { type: "Box", icon: Box },
  { type: "Card", icon: CreditCard },
  { type: "Carousel", icon: View },
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

    const validTemplates = customComponentTemplates.filter(t => t && t.firestoreId);

    if (validTemplates.length === 0) {
        return <p className="text-xs text-center text-muted-foreground p-2">No custom components saved yet.</p>;
    }


    return (
      <div className="space-y-3">
          {validTemplates.map((template) => {
              return (
                  <div key={template.firestoreId} className="border border-sidebar-border rounded-lg bg-card shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                       <div className="p-2 border-b border-sidebar-border">
                           <p className="text-sm font-medium text-sidebar-foreground truncate" title={template.name}>{template.name}</p>
                       </div>
                       <DraggableComponentItem
                            type={template.templateId}
                            isCustomComponent={true}
                       >
                           <div className="flex justify-center items-center h-[60px] bg-muted/20 w-full overflow-hidden">
                               <div style={{width: '200px'}}>
                                   <TemplatePreview template={template} />
                               </div>
                           </div>
                       </DraggableComponentItem>
                       <div className="p-1 border-t border-sidebar-border flex justify-end items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-6 w-6" title="Edit Component" onClick={() => handleEdit(template)}>
                                <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10" title="Delete Component" onClick={() => handleDelete(template)}>
                                <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                  </div>
              );
          })}
      </div>
    );
}


function LayoutsList() {
    const { savedLayouts, isLoadingLayouts, loadLayout, deleteLayout, loadLayoutForEditing, customComponentTemplates, m3Theme, addLayoutToNavigation, removeLayoutFromNavigation, navigationItems } = useDesign();

    const handleLoad = (layout: SavedLayout) => {
        if (window.confirm(`This will replace your current canvas. Are you sure you want to load the layout "${layout.name}"?`)) {
            loadLayout(layout);
        }
    };

    const handleEdit = (layout: SavedLayout) => {
        loadLayoutForEditing(layout);
    };

    const handleDelete = (layout: SavedLayout) => {
        if (window.confirm(`Are you sure you want to delete the layout "${layout.name}"? This cannot be undone.`)) {
            deleteLayout(layout.firestoreId);
        }
    };

    const handleToggleNavigation = (layout: SavedLayout) => {
        const isInNav = navigationItems.some(item => item.firestoreId === layout.firestoreId);
        if (isInNav) {
            removeLayoutFromNavigation(layout.firestoreId);
        } else {
            addLayoutToNavigation(layout);
        }
    };
    
    if (isLoadingLayouts) {
        return (
            <div className="flex justify-center items-center h-full">
                <Loader2 className="h-6 w-6 animate-spin" />
            </div>
        )
    }

    if (!savedLayouts || savedLayouts.length === 0) {
        return <p className="text-xs text-center text-muted-foreground p-2">No layouts saved yet.</p>;
    }

    return (
      <div className="space-y-4">
          {savedLayouts.map((layout) => {
              const isInNav = navigationItems.some(item => item.firestoreId === layout.firestoreId);
              const IconForNav = layout.iconName ? (getComponentIcon(layout.iconName as any) || Star) : Star;

              return (
                <div key={layout.firestoreId} className="border border-sidebar-border rounded-lg bg-card shadow-sm hover:shadow-md p-2 space-y-2 flex flex-col">
                    <p className="text-sm font-medium text-sidebar-foreground flex-1 break-words pr-1 pt-1">{layout.name}</p>
                    <div className="flex justify-end items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-6 w-6" title="Load Layout" onClick={() => handleLoad(layout)}>
                            <Download className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6" title="Edit Layout" onClick={() => handleEdit(layout)}>
                            <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10" title="Delete Layout" onClick={() => handleDelete(layout)}>
                            <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                    </div>

                    <div className="w-full aspect-[9/16] bg-muted/30 rounded-md overflow-hidden relative border">
                        <LayoutPreview layout={layout} customComponentTemplates={customComponentTemplates} m3Theme={m3Theme} />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none" />
                    </div>
                    
                    <Button variant={isInNav ? "secondary" : "outline"} size="sm" className="w-full mt-2 h-8 text-xs" onClick={() => handleToggleNavigation(layout)}>
                        <IconForNav className="mr-2 h-3.5 w-3.5"/>
                        {isInNav ? 'Remove from Nav' : 'Add to Nav'}
                    </Button>
                </div>
              );
          })}
      </div>
    );
}

export function ComponentLibraryPanel() {
  const { customComponentTemplates, savedLayouts } = useDesign();

  const validCustomTemplatesCount = customComponentTemplates.filter(t => t && t.firestoreId).length;
  const validLayoutsCount = savedLayouts.filter(l => l && l.firestoreId).length;

  return (
    <aside className="w-72 border-r bg-sidebar p-4 flex flex-col shrink-0">
      <h2 className="text-xl font-semibold mb-2 text-sidebar-foreground font-headline">Components</h2>
      <TooltipProvider delayDuration={200}>
        <Tabs defaultValue="standard" className="flex-grow flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-3 mb-2 h-auto">
            <TabsTrigger value="standard" className="text-xs px-1 py-1.5">Standard</TabsTrigger>
            <TabsTrigger value="custom" className="text-xs px-1 py-1.5 relative">
              Custom
              {validCustomTemplatesCount > 0 && (
                <Badge variant="secondary" className="absolute -top-1 -right-2 h-4 px-1.5 text-xs font-bold">
                  {validCustomTemplatesCount}
                </Badge>
              )}
            </TabsTrigger>
             <TabsTrigger value="layouts" className="text-xs px-1 py-1.5 relative">
              Layouts
              {validLayoutsCount > 0 && (
                <Badge variant="secondary" className="absolute -top-1 -right-2 h-4 px-1.5 text-xs font-bold">
                  {validLayoutsCount}
                </Badge>
              )}
            </TabsTrigger>
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
           <TabsContent value="layouts" className="flex-grow overflow-hidden">
            <ScrollArea className="h-full pr-3">
              <LayoutsList />
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </TooltipProvider>
    </aside>
  );
}
