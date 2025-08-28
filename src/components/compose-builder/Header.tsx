
'use client';

import React, { RefObject } from 'react';
import { Logo } from '@/components/icons/Logo';
import { Button } from "@/components/ui/button";
import { Code, Trash2, FileJson, UploadCloud, Palette, Undo, Redo, Copy, ClipboardPaste, Settings, Save, Library, Edit } from "lucide-react";
import type { GenerateCodeModalRef } from "./GenerateCodeModal";
import type { ViewJsonModalRef } from "./ViewJsonModal";
import type { ThemeEditorModalRef } from "./ThemeEditorModal";
import type { PublishConfigModalRef } from "./PublishConfigModal";
import type { SaveLayoutModalRef } from "./SaveLayoutModal";
import { useDesign } from "@/contexts/DesignContext";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SettingsPanelContent } from "./SettingsPanelContent";
import { useToast } from '@/hooks/use-toast';
import { Separator } from '../ui/separator';
import { CORE_SCAFFOLD_ELEMENT_IDS, DEFAULT_CONTENT_LAZY_COLUMN_ID } from '@/types/compose-spec';
import { ZoomControls } from './ZoomControls';


interface HeaderProps {
  generateModalRef: RefObject<GenerateCodeModalRef>;
  viewJsonModalRef: RefObject<ViewJsonModalRef>;
  themeEditorModalRef: RefObject<ThemeEditorModalRef>;
  publishConfigModalRef: RefObject<PublishConfigModalRef>;
  saveLayoutModalRef: RefObject<SaveLayoutModalRef>;
}

export function Header({
  generateModalRef,
  viewJsonModalRef,
  themeEditorModalRef,
  publishConfigModalRef,
  saveLayoutModalRef,
}: HeaderProps) {
  const { 
    clearDesign, components,
    undo, redo, copyComponent, pasteComponent,
    history, future, selectedComponentId, clipboard,
    editingTemplateInfo, updateCustomTemplate,
    editingLayoutInfo, updateLayout,
  } = useDesign();
  const { toast } = useToast();

  const handleGenerateCode = () => {
    if (generateModalRef.current) {
      generateModalRef.current.openModal();
    }
  };

  const handleViewJson = () => {
    if (viewJsonModalRef && viewJsonModalRef.current) {
      viewJsonModalRef.current.openModal();
    } else {
      console.error("ViewJsonModalRef or its .current property is not available in Header's handleViewJson.");
      toast({ title: "Error", description: "View JSON Modal reference is not configured correctly.", variant: "destructive"});
    }
  };

  const handleOpenThemeEditor = () => {
    if (themeEditorModalRef.current) {
      themeEditorModalRef.current.openModal();
    }
  };

  const handleClearCanvas = () => {
    if (editingTemplateInfo || editingLayoutInfo) {
       if (window.confirm("Are you sure you want to exit editing mode? Any unsaved changes will be lost.")) {
          clearDesign(); // This will exit template/layout editing mode
       }
    } else if (window.confirm("Are you sure you want to clear the canvas? This action cannot be undone.")) {
      clearDesign();
    }
  };

  const handleOpenPublishConfigModal = () => {
    if (publishConfigModalRef.current) {
      publishConfigModalRef.current.openModal();
    } else {
      toast({
        title: "Error",
        description: "Publish Configuration Modal reference is not available.",
        variant: "destructive",
      });
    }
  };
  
  const handleCopy = () => {
    if (selectedComponentId) {
      copyComponent(selectedComponentId);
    }
  };

  const handlePaste = () => {
    pasteComponent();
  };
  
  const handleUpdate = () => {
    if (editingTemplateInfo) {
      updateCustomTemplate();
    } else if (editingLayoutInfo) {
      updateLayout();
    }
  };
  
  const handleSaveLayout = () => {
    if (saveLayoutModalRef.current) {
        saveLayoutModalRef.current.openModal();
    }
  };


  const contentArea = components.find(c => c.id === DEFAULT_CONTENT_LAZY_COLUMN_ID);
  const hasUserComponents = contentArea ? (contentArea.properties.children?.length ?? 0) > 0 : false;
  const isEditing = !!editingTemplateInfo || !!editingLayoutInfo;

  const canCopy = !!selectedComponentId && !CORE_SCAFFOLD_ELEMENT_IDS.includes(selectedComponentId);
  const canPaste = !!clipboard;
  const canUndo = history.length > 0;
  const canRedo = future.length > 0;

  return (
    <header className="h-16 border-b bg-black dark:bg-sidebar flex items-center justify-between shrink-0">
      <div className="h-full bg-white flex items-center px-4">
          <Logo />
      </div>

       <div className="flex-grow flex items-center justify-center">
            <ZoomControls />
       </div>
      
      <div className="flex items-center gap-2 px-6">
        <TooltipProvider delayDuration={200}>
          {isEditing && (
             <Button size="sm" className="bg-green-500 text-white hover:bg-green-600 h-9" onClick={handleUpdate}>
                  <Save className="mr-2 h-4 w-4"/> 
                  {editingLayoutInfo ? 'Update Layout' : 'Update Template'}
              </Button>
          )}

          <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={undo}
                  disabled={!canUndo}
                  aria-label="Undo"
                  className="text-sidebar-foreground border-sidebar-border bg-sidebar hover:bg-sidebar-accent hover:text-sidebar-accent-foreground disabled:opacity-50"
                >
                  <Undo />
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>Undo (Ctrl+Z)</p></TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={redo}
                  disabled={!canRedo}
                  aria-label="Redo"
                  className="text-sidebar-foreground border-sidebar-border bg-sidebar hover:bg-sidebar-accent hover:text-sidebar-accent-foreground disabled:opacity-50"
                >
                  <Redo />
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>Redo (Ctrl+Y)</p></TooltipContent>
            </Tooltip>

            <Separator orientation="vertical" className="h-6 mx-1 bg-white/50 dark:bg-sidebar-border" />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={handleCopy}
                  disabled={!canCopy}
                  aria-label="Copy Component"
                  className="text-sidebar-foreground border-sidebar-border bg-sidebar hover:bg-sidebar-accent hover:text-sidebar-accent-foreground disabled:opacity-50"
                >
                  <Copy />
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>Copy (Ctrl+C)</p></TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={handlePaste}
                  disabled={!canPaste}
                  aria-label="Paste Component"
                  className="text-sidebar-foreground border-sidebar-border bg-sidebar hover:bg-sidebar-accent hover:text-sidebar-accent-foreground disabled:opacity-50"
                >
                  <ClipboardPaste />
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>Paste (Ctrl+V)</p></TooltipContent>
            </Tooltip>

            <Separator orientation="vertical" className="h-6 mx-1 bg-white/50 dark:bg-sidebar-border" />
            
             <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={handleSaveLayout}
                  disabled={!hasUserComponents || isEditing}
                  aria-label={"Save Layout"}
                  className="text-sidebar-foreground border-sidebar-border bg-sidebar hover:bg-sidebar-accent hover:text-sidebar-accent-foreground disabled:opacity-50"
                >
                  <Library />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Save Current Layout</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={handleClearCanvas}
                  disabled={!hasUserComponents && !isEditing}
                  aria-label={isEditing ? "Exit Editing Mode" : "Clear Canvas"}
                  className="text-sidebar-foreground border-sidebar-border bg-sidebar hover:bg-sidebar-accent hover:text-sidebar-accent-foreground disabled:opacity-50"
                >
                  <Trash2 />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isEditing ? "Exit Editing Mode" : "Clear Canvas"}</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={handleOpenPublishConfigModal}
                  disabled={!hasUserComponents || isEditing}
                  aria-label="Publish to Remote Config"
                  className="text-sidebar-foreground border-sidebar-border bg-sidebar hover:bg-sidebar-accent hover:text-sidebar-accent-foreground disabled:opacity-50"
                >
                  <UploadCloud />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Publish to Remote Config</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={handleOpenThemeEditor}
                  aria-label="Edit App Theme"
                  className="text-sidebar-foreground border-sidebar-border bg-sidebar hover:bg-sidebar-accent hover:text-sidebar-accent-foreground disabled:opacity-50"
                >
                  <Palette />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Edit App Theme</p>
              </TooltipContent>
            </Tooltip>

            <Popover>
              <Tooltip>
                <TooltipTrigger asChild>
                  <PopoverTrigger asChild>
                    <Button
                      size="icon"
                      variant="outline"
                      aria-label="Settings"
                      className="text-sidebar-foreground border-sidebar-border bg-sidebar hover:bg-sidebar-accent hover:text-sidebar-accent-foreground disabled:opacity-50"
                    >
                      <Settings />
                    </Button>
                  </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Interface Theme Settings</p>
                </TooltipContent>
              </Tooltip>
              <PopoverContent className="w-auto p-0 mr-2" align="end">
                <SettingsPanelContent />
              </PopoverContent>
            </Popover>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={handleViewJson}
                  aria-label="View/Edit Design JSON"
                  className="text-sidebar-foreground border-sidebar-border bg-sidebar hover:bg-sidebar-accent hover:text-sidebar-accent-foreground disabled:opacity-50"
                >
                  <FileJson />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>View/Edit Design JSON</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  onClick={handleGenerateCode}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  disabled={!hasUserComponents || isEditing}
                  aria-label="Generate Jetpack Compose Code"
                >
                  <Code />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Generate Jetpack Compose Code</p>
              </TooltipContent>
            </Tooltip>
        </TooltipProvider>
      </div>
    </header>
  );
}

    