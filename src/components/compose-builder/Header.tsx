
'use client';

import React, { RefObject } from 'react';
import { Logo } from '@/components/icons/Logo';
import { Button } from "@/components/ui/button";
import { Code, Trash2, FileJson, UploadCloud, Palette, Undo, Redo, Copy, ClipboardPaste, Settings, Save, Library, Edit, FileCode2, LayoutGrid } from "lucide-react";
import type { GenerateCodeModalRef } from "./GenerateCodeModal";
import type { ViewJsonModalRef } from "./ViewJsonModal";
import type { ThemeEditorModalRef } from "./ThemeEditorModal";
import type { ThemeCodeModalRef } from "./ThemeCodeModal";
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
import { cn } from '@/lib/utils';


interface HeaderProps {
  generateModalRef: RefObject<GenerateCodeModalRef>;
  viewJsonModalRef: RefObject<ViewJsonModalRef>;
  themeEditorModalRef: RefObject<ThemeEditorModalRef>;
  themeCodeModalRef: RefObject<ThemeCodeModalRef>;
  publishConfigModalRef: RefObject<PublishConfigModalRef>;
  saveLayoutModalRef: RefObject<SaveLayoutModalRef>;
}

export function Header({
  generateModalRef,
  viewJsonModalRef,
  themeEditorModalRef,
  themeCodeModalRef,
  publishConfigModalRef,
  saveLayoutModalRef,
}: HeaderProps) {
  const { 
    activeDesign,
    clearDesign,
    undo, redo, copyComponent, pasteComponent,
    updateCustomTemplate,
    updateLayout,
    activeView,
    setActiveView,
    navigationItems,
  } = useDesign();
  const { toast } = useToast();

  // Guard against undefined activeDesign on initial server render
  if (!activeDesign) {
      return (
        <header className="h-16 border-b bg-black dark:bg-sidebar flex items-center justify-between shrink-0">
          <div className="h-full bg-white flex items-center px-4">
              <Logo />
          </div>
          <div className="flex items-center gap-2 px-6">
              {/* Render a simplified header or placeholders if needed */}
          </div>
        </header>
      );
  }

  const { components = [], history = [], future = [], selectedComponentId, clipboard, editingTemplateInfo, editingLayoutInfo } = activeDesign;

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

   const handleOpenThemeCode = () => {
    if (themeCodeModalRef.current) {
      themeCodeModalRef.current.openModal();
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
            {activeView === 'design' && <ZoomControls />}
       </div>
      
      <div className="flex items-center gap-2 px-6">
        <TooltipProvider delayDuration={200}>
          {isEditing && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon" className="bg-green-500 text-white hover:bg-green-600 h-9 w-9" onClick={handleUpdate}>
                    <Save className="h-4 w-4"/> 
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{editingLayoutInfo ? 'Update Layout' : 'Update Template'}</p>
              </TooltipContent>
            </Tooltip>
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
            
            <Separator orientation="vertical" className="h-6 mx-1 bg-white/50 dark:bg-sidebar-border" />
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={handleOpenThemeEditor}
                  aria-label="Edit Material 3 App Theme"
                  className="text-sidebar-foreground border-sidebar-border bg-sidebar hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                >
                  <Edit />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Edit Material 3 App Theme</p>
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
                      className="text-sidebar-foreground border-sidebar-border bg-sidebar hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    >
                      <Palette />
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
                  onClick={handleOpenThemeCode}
                  aria-label="View Theme Code"
                  className="text-sidebar-foreground border-sidebar-border bg-sidebar hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                >
                  <FileCode2 />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>View Theme Code</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={handleViewJson}
                  aria-label="View/Edit Design JSON"
                  className="text-sidebar-foreground border-sidebar-border bg-sidebar hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
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
