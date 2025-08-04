
'use client';

import React, { useState } from 'react';
import { DraggableComponentItem, SavedLayoutPreview, ScreenPreview } from "./DraggableComponentItem";
import type { ComponentType, CustomComponentTemplate, SavedLayout, Screen } from "@/types/compose-spec";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
  BoxSelect,
  Trash2,
  Pencil,
  Space,
  LayoutDashboard, 
  Download, 
  PanelTop, 
  PanelBottom, 
  FilePenLine, 
  Film, 
  AppWindow,
  Plus,
  Copy,
  Eye,
} from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// "ScaffoldStructure" removed as the canvas root is now always a Scaffold
const availableBaseComponents: { type: ComponentType; icon: React.ElementType; displayName?: string }[] = [
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
  { type: "BottomNavigationItem", icon: AppWindow, displayName: "Nav Item" },
];

export function ComponentLibraryPanel() {
  const {
    customComponentTemplates, deleteCustomComponentTemplate, renameCustomComponentTemplate, loadTemplateForEditing,
    savedLayouts, loadLayoutToCanvas, deleteSavedLayout, renameSavedLayout, loadLayoutForEditing,
    screens, activeScreenId, setActiveScreen, addScreen, renameScreen, duplicateScreen, deleteScreen
  } = useDesign();
  const { toast } = useToast();

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<CustomComponentTemplate | SavedLayout | Screen | null>(null);
  const [deleteType, setDeleteType] = useState<'template' | 'layout' | 'screen' | null>(null);

  const handleDeleteClick = (item: CustomComponentTemplate | SavedLayout | Screen, type: 'template' | 'layout' | 'screen') => {
    if (type === 'screen' && screens.length <= 1) {
      toast({ title: "Cannot Delete", description: "You must have at least one screen.", variant: "destructive"});
      return;
    }
    setItemToDelete(item);
    setDeleteType(type);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (itemToDelete && deleteType) {
      if (deleteType === 'template') {
        await deleteCustomComponentTemplate((itemToDelete as CustomComponentTemplate).templateId, (itemToDelete as CustomComponentTemplate).firestoreId);
      } else if (deleteType === 'layout') {
        await deleteSavedLayout((itemToDelete as SavedLayout).layoutId, (itemToDelete as SavedLayout).firestoreId);
      } else if (deleteType === 'screen') {
        deleteScreen((itemToDelete as Screen).id);
      }
      setItemToDelete(null);
      setDeleteType(null);
    }
    setIsDeleteDialogOpen(false);
  };
  
  const handleEditTemplateClick = (template: CustomComponentTemplate) => {
    loadTemplateForEditing(template.templateId);
  };

  const handleRenameClick = async (item: CustomComponentTemplate | SavedLayout | Screen, type: 'template' | 'layout' | 'screen') => {
    const newName = window.prompt(`Enter new name for this ${type}:`, item.name);
    if (newName && newName.trim() !== "") {
      if (type === 'template') {
        await renameCustomComponentTemplate((item as CustomComponentTemplate).templateId, newName.trim(), (item as CustomComponentTemplate).firestoreId);
      } else if (type === 'layout') {
        await renameSavedLayout((item as SavedLayout).layoutId, newName.trim(), (item as SavedLayout).firestoreId);
      } else if (type === 'screen') {
        renameScreen((item as Screen).id, newName.trim());
      }
    } else if (newName !== null) {
      toast({
        title: "Rename Failed",
        description: "New name cannot be empty.",
        variant: "destructive",
      });
    }
  };

  const handleLoadLayout = (layoutId: string) => {
    if (window.confirm("Loading this layout will replace the current canvas. Are you sure?")) {
      loadLayoutToCanvas(layoutId);
    }
  };

  const handleEditLayout = (layoutId: string) => {
    if (window.confirm("This will replace the current canvas with the selected layout for editing. Are you sure?")) {
      loadLayoutForEditing(layoutId);
    }
  };


  return (
    <aside className="w-64 border-r bg-sidebar p-4 flex flex-col shrink-0">
      <h2 className="text-xl font-semibold mb-2 text-sidebar-foreground font-headline">Components</h2>
      <TooltipProvider delayDuration={200}>
        <Tabs defaultValue="standard" className="flex-grow flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-4 mb-2 h-auto">
            <TabsTrigger value="standard" className="text-xs px-1 py-1.5">Standard</TabsTrigger>
            <TabsTrigger value="custom" disabled={customComponentTemplates.length === 0} className="text-xs px-1 py-1.5">
              Custom
            </TabsTrigger>
            <TabsTrigger value="layouts" disabled={savedLayouts.length === 0} className="text-xs px-1 py-1.5">
              Layouts
            </TabsTrigger>
            <TabsTrigger value="screens" className="text-xs px-1 py-1.5">
              Screens
            </TabsTrigger>
          </TabsList>

          <TabsContent value="standard" className="flex-grow overflow-hidden">
            <ScrollArea className="h-full pr-3">
              <div className="grid grid-cols-2 gap-2">
                {availableBaseComponents.map(({ type, icon, displayName }) => (
                  <DraggableComponentItem key={type as string} type={type as string} Icon={icon} displayName={displayName}/>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="custom" className="flex-grow overflow-hidden">
            {customComponentTemplates.length > 0 ? (
              <ScrollArea className="h-full pr-3">
                <div className="grid grid-cols-1 gap-2">
                  {customComponentTemplates.map((template) => (
                    <div key={template.templateId} className="bg-card border border-sidebar-border rounded-md shadow-sm overflow-hidden">
                      <DraggableComponentItem
                        type={template.templateId}
                        displayName={template.name}
                        Icon={BoxSelect}
                        template={template}
                      />
                      <div className="p-1 flex justify-end items-center space-x-1 border-t border-sidebar-border/50 bg-muted/30">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-sidebar-foreground hover:bg-sidebar-accent/20"
                          onClick={(e) => { e.stopPropagation(); handleEditTemplateClick(template);}}
                          aria-label={`Edit ${template.name}`}
                        >
                          <FilePenLine className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-sidebar-foreground hover:bg-sidebar-accent/20"
                          onClick={(e) => { e.stopPropagation(); handleRenameClick(template, 'template');}}
                          aria-label={`Rename ${template.name}`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive hover:bg-destructive/20"
                           onClick={(e) => { e.stopPropagation(); handleDeleteClick(template, 'template');}}
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

          <TabsContent value="layouts" className="flex-grow overflow-hidden">
             {savedLayouts.length > 0 ? (
              <ScrollArea className="h-full pr-3">
                <div className="grid grid-cols-1 gap-2">
                  {savedLayouts.map((layout) => (
                    <div key={layout.layoutId} className="bg-card border border-sidebar-border rounded-md shadow-sm overflow-hidden flex flex-col">
                      <SavedLayoutPreview layout={layout} />
                      <div className="p-2 text-center">
                        <p className="text-sm font-medium text-sidebar-foreground truncate" title={layout.name}>
                          {layout.name}
                        </p>
                        {layout.timestamp && (
                          <p className="text-xxs text-muted-foreground">
                            {new Date(layout.timestamp).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <div className="p-2 mt-auto border-t border-sidebar-border/50 bg-muted/30 flex items-center gap-1">
                          <Button
                              variant="outline"
                              size="sm"
                              className="h-7 px-2 py-1 text-xs flex-grow"
                              onClick={() => handleLoadLayout(layout.layoutId)}
                              aria-label={`Load layout ${layout.name}`}
                          >
                              <Download className="h-3 w-3 mr-1" /> Load
                          </Button>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => handleEditLayout(layout.layoutId)}
                                aria-label={`Edit layout ${layout.name}`}
                              >
                                <FilePenLine className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top"><p>Edit</p></TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => handleRenameClick(layout, 'layout')}
                                aria-label={`Rename layout ${layout.name}`}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top"><p>Rename</p></TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                onClick={() => handleDeleteClick(layout, 'layout')}
                                aria-label={`Delete layout ${layout.name}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top"><p>Delete</p></TooltipContent>
                          </Tooltip>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-sidebar-foreground/70 text-center p-2">
                No layouts saved yet. Use the "Save Layout" button in the header to save the current canvas.
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="screens" className="flex-grow flex flex-col min-h-0 space-y-2">
             <div className="flex-grow min-h-0">
                <ScrollArea className="h-full pr-3">
                  <div className="space-y-1.5">
                    {screens.map(screen => (
                      <div
                        key={screen.id}
                        onClick={() => setActiveScreen(screen.id)}
                        className={cn(
                          "flex items-center p-1 rounded-md border text-sm cursor-pointer hover:bg-accent/10",
                           activeScreenId === screen.id ? 'bg-accent/20 border-accent' : 'border-sidebar-border'
                        )}
                      >
                         <ScreenPreview screen={screen} />
                         <div className='flex flex-col flex-grow items-start'>
                            <span className="font-medium flex-grow truncate">{screen.name}</span>

                            <div className="flex items-center gap-0.5 mt-1">
                                <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => {e.stopPropagation(); duplicateScreen(screen.id)}} aria-label={`Duplicate ${screen.name}`}><Copy className="h-3.5 w-3.5"/></Button>
                                </TooltipTrigger>
                                <TooltipContent side="top"><p>Duplicate</p></TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => {e.stopPropagation(); handleRenameClick(screen, 'screen')}} aria-label={`Rename ${screen.name}`}><Pencil className="h-3.5 w-3.5"/></Button>
                                </TooltipTrigger>
                                <TooltipContent side="top"><p>Rename</p></TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={(e) => {e.stopPropagation(); handleDeleteClick(screen, 'screen')}} aria-label={`Delete ${screen.name}`}><Trash2 className="h-3.5 w-3.5"/></Button>
                                </TooltipTrigger>
                                <TooltipContent side="top"><p>Delete</p></TooltipContent>
                                </Tooltip>
                            </div>
                         </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
             </div>
             <div className="shrink-0 pt-2 border-t border-sidebar-border/50">
               <Button variant="outline" size="sm" className="w-full" onClick={() => addScreen()}>
                  <Plus className="h-4 w-4 mr-2"/>
                  Add New Screen
               </Button>
             </div>
          </TabsContent>

        </Tabs>
      </TooltipProvider>

      {itemToDelete && (
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure you want to delete "{itemToDelete.name}"?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently remove the {deleteType}.
                {deleteType === 'template' && " Existing instances on the canvas will not be automatically removed but may no longer be addable or editable as this template."}
                {deleteType === 'screen' && " Any navigation actions pointing to this screen will be broken."}
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
