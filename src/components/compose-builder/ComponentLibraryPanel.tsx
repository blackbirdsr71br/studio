
'use client';

import React, { useState } from 'react';
import { DraggableComponentItem } from "./DraggableComponentItem";
import type { ComponentType, CustomComponentTemplate } from "@/types/compose-spec";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useDesign } from '@/contexts/DesignContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  BoxSelect, // Icon for custom components
  Trash2,
  Pencil,
  Space, // Icon for Spacer
} from "lucide-react";
import { useToast } from '@/hooks/use-toast';

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
  { type: "Spacer", icon: Space }, // Added Spacer
];

export function ComponentLibraryPanel() {
  const { customComponentTemplates, deleteCustomComponentTemplate, renameCustomComponentTemplate } = useDesign();
  const { toast } = useToast();

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<CustomComponentTemplate | null>(null);

  const handleDeleteClick = (template: CustomComponentTemplate) => {
    setTemplateToDelete(template);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (templateToDelete) {
      await deleteCustomComponentTemplate(templateToDelete.templateId, templateToDelete.firestoreId);
      setTemplateToDelete(null);
    }
    setIsDeleteDialogOpen(false);
  };

  const handleRenameClick = async (template: CustomComponentTemplate) => {
    const newName = window.prompt("Enter new name for the custom component:", template.name);
    if (newName && newName.trim() !== "") {
      await renameCustomComponentTemplate(template.templateId, newName.trim(), template.firestoreId);
    } else if (newName !== null) { // User didn't cancel, but entered empty name
      toast({
        title: "Rename Failed",
        description: "New name cannot be empty.",
        variant: "destructive",
      });
    }
  };


  return (
    <aside className="w-64 border-r bg-sidebar p-4 flex flex-col shrink-0">
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
            <ScrollArea className="h-full pr-3">
              <div className="grid grid-cols-2 gap-2">
                {availableBaseComponents.map(({ type, icon }) => (
                  <DraggableComponentItem key={type} type={type} Icon={icon} />
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
          <TabsContent value="custom" className="flex-grow overflow-hidden">
            {customComponentTemplates.length > 0 ? (
              <ScrollArea className="h-full pr-3">
                <div className="grid grid-cols-1 gap-2"> {/* Changed to 1 column for custom items with actions */}
                  {customComponentTemplates.map((template) => (
                    <div key={template.templateId} className="bg-card border border-sidebar-border rounded-md shadow-sm overflow-hidden">
                      <DraggableComponentItem
                        type={template.templateId}
                        displayName={template.name}
                        Icon={BoxSelect}
                      />
                      <div className="p-1 flex justify-end items-center space-x-1 border-t border-sidebar-border/50 bg-muted/30">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-sidebar-foreground hover:bg-sidebar-accent/20"
                          onClick={(e) => { e.stopPropagation(); handleRenameClick(template);}}
                          aria-label={`Rename ${template.name}`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive hover:bg-destructive/20"
                           onClick={(e) => { e.stopPropagation(); handleDeleteClick(template);}}
                          aria-label={`Delete ${template.name}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
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

      {templateToDelete && (
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure you want to delete "{templateToDelete.name}"?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will remove the template from the library.
                Existing instances on the canvas will not be automatically removed but may no longer be addable or editable as this template.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </aside>
  );
}

    