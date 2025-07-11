
'use client';

import React, { useState, RefObject } from 'react';
import { Button } from "@/components/ui/button";
import { Code, Trash2, FileJson, UploadCloud, Loader2, Cog as SettingsIcon, Palette, Save, Undo, Redo, Copy, ClipboardPaste } from "lucide-react";
import type { GenerateCodeModalRef } from "./GenerateCodeModal";
import type { ViewJsonModalRef } from "./ViewJsonModal";
import type { ThemeEditorModalRef } from "./ThemeEditorModal";
import type { PublishConfigModalRef } from "./PublishConfigModal";
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
import { CORE_SCAFFOLD_ELEMENT_IDS } from '@/types/compose-spec';

interface HeaderProps {
  generateModalRef: RefObject<GenerateCodeModalRef>;
  viewJsonModalRef: RefObject<ViewJsonModalRef>;
  themeEditorModalRef: RefObject<ThemeEditorModalRef>;
  publishConfigModalRef: RefObject<PublishConfigModalRef>;
}

export function Header({
  generateModalRef,
  viewJsonModalRef,
  themeEditorModalRef,
  publishConfigModalRef,
}: HeaderProps) {
  const { 
    clearDesign, components, saveCurrentCanvasAsLayout, 
    editingTemplateInfo, updateCustomTemplate,
    editingLayoutInfo, updateSavedLayout,
    undo, redo, copyComponent, pasteComponent,
    history, future, selectedComponentId, clipboard
  } = useDesign();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

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
    const message = editingTemplateInfo
      ? "Are you sure you want to discard changes and exit template editing?"
      : editingLayoutInfo
      ? "Are you sure you want to discard changes and exit layout editing?"
      : "Are you sure you want to clear the canvas? This action cannot be undone.";
    if (window.confirm(message)) {
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

  const handleSaveLayout = async () => {
    setIsSaving(true);
    const name = window.prompt("Enter a name for this layout:", "My Saved Layout");
    if (name && name.trim() !== "") {
      try {
        await saveCurrentCanvasAsLayout(name.trim());
      } catch (error) {
        toast({
          title: "Save Layout Failed",
          description: error instanceof Error ? error.message : "An unexpected error occurred.",
          variant: "destructive",
        });
      }
    } else if (name !== null) {
      toast({
        title: "Save Failed",
        description: "Layout name cannot be empty.",
        variant: "destructive",
      });
    }
    setIsSaving(false);
  };
  
  const handleUpdateTemplate = async () => {
    setIsSaving(true);
    try {
      await updateCustomTemplate();
    } catch(error) {
       toast({
          title: "Update Failed",
          description: error instanceof Error ? error.message : "An unexpected error occurred while updating template.",
          variant: "destructive",
        });
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleUpdateLayout = async () => {
    setIsSaving(true);
    try {
      await updateSavedLayout();
    } catch (error) {
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred while updating layout.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveOrUpdate = () => {
    if (isEditingTemplate) {
      handleUpdateTemplate();
    } else if (isEditingLayout) {
      handleUpdateLayout();
    } else {
      handleSaveLayout();
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

  const hasUserComponents = components.length > 4; // Check for any component beyond the initial 4 scaffold parts
  const isEditingTemplate = !!editingTemplateInfo;
  const isEditingLayout = !!editingLayoutInfo;
  const canCopy = !!selectedComponentId && !CORE_SCAFFOLD_ELEMENT_IDS.includes(selectedComponentId);
  const canPaste = !!clipboard;
  const canUndo = history.length > 0;
  const canRedo = future.length > 0;

  return (
    <header className="h-16 border-b bg-sidebar flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center">
        <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          UI Compose Builder
        </h1>
      </div>
      <TooltipProvider delayDuration={200}>
        <div className="flex items-center gap-2">
           <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="outline"
                onClick={undo}
                disabled={!canUndo}
                aria-label="Undo"
                className="border border-sidebar-border text-sidebar-foreground bg-sidebar hover:bg-sidebar-accent hover:text-sidebar-accent-foreground disabled:opacity-50"
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
                className="border border-sidebar-border text-sidebar-foreground bg-sidebar hover:bg-sidebar-accent hover:text-sidebar-accent-foreground disabled:opacity-50"
              >
                <Redo />
              </Button>
            </TooltipTrigger>
            <TooltipContent><p>Redo (Ctrl+Y)</p></TooltipContent>
          </Tooltip>

          <Separator orientation="vertical" className="h-6 mx-1" />

           <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="outline"
                onClick={handleCopy}
                disabled={!canCopy}
                aria-label="Copy Component"
                className="border border-sidebar-border text-sidebar-foreground bg-sidebar hover:bg-sidebar-accent hover:text-sidebar-accent-foreground disabled:opacity-50"
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
                className="border border-sidebar-border text-sidebar-foreground bg-sidebar hover:bg-sidebar-accent hover:text-sidebar-accent-foreground disabled:opacity-50"
              >
                <ClipboardPaste />
              </Button>
            </TooltipTrigger>
            <TooltipContent><p>Paste (Ctrl+V)</p></TooltipContent>
          </Tooltip>

          <Separator orientation="vertical" className="h-6 mx-1" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="outline"
                onClick={handleClearCanvas}
                disabled={!hasUserComponents && !isEditingTemplate && !isEditingLayout}
                aria-label={isEditingTemplate ? "Discard Template Changes" : isEditingLayout ? "Discard Layout Changes" : "Clear Canvas"}
                className="border border-sidebar-border text-sidebar-foreground bg-sidebar hover:bg-sidebar-accent hover:text-sidebar-accent-foreground disabled:opacity-50"
              >
                <Trash2 />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{isEditingTemplate ? "Discard Template Changes" : isEditingLayout ? "Discard Layout Changes" : "Clear Canvas"}</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="outline"
                onClick={handleSaveOrUpdate}
                disabled={(!hasUserComponents && !isEditingTemplate && !isEditingLayout) || isSaving}
                aria-label={isEditingTemplate ? "Update Custom Component" : isEditingLayout ? "Update Layout" : "Save Current Layout"}
                className="border border-sidebar-border text-sidebar-foreground bg-sidebar hover:bg-sidebar-accent hover:text-sidebar-accent-foreground disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="animate-spin" /> : <Save />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{isEditingTemplate ? `Update "${editingTemplateInfo.name}"` : isEditingLayout ? `Update "${editingLayoutInfo.name}"` : "Save Current Layout"}</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="outline"
                onClick={handleOpenPublishConfigModal}
                disabled={!hasUserComponents || isEditingTemplate || isEditingLayout}
                aria-label="Publish to Remote Config"
                className="border border-sidebar-border text-sidebar-foreground bg-sidebar hover:bg-sidebar-accent hover:text-sidebar-accent-foreground disabled:opacity-50"
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
                className="border border-sidebar-border text-sidebar-foreground bg-sidebar hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
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
                    className="border border-sidebar-border text-sidebar-foreground bg-sidebar hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  >
                    <SettingsIcon />
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
                disabled={isEditingTemplate || isEditingLayout}
                className="border border-sidebar-border text-sidebar-foreground bg-sidebar hover:bg-sidebar-accent hover:text-sidebar-accent-foreground disabled:opacity-50"
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
                disabled={!hasUserComponents}
                aria-label="Generate Jetpack Compose Code"
              >
                <Code />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Generate Jetpack Compose Code</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    </header>
  );
}
