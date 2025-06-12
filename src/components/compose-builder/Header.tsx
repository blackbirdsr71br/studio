
'use client';

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/icons/Logo";
import { Code, Trash2, FileJson, UploadCloud, Loader2, Cog as SettingsIcon, Palette, Save } from "lucide-react"; // Added Save icon
import type { GenerateCodeModalRef } from "./GenerateCodeModal";
import type { ViewJsonModalRef } from "./ViewJsonModal";
import type { ThemeEditorModalRef } from "./ThemeEditorModal";
import type { PublishConfigModalRef } from "./PublishConfigModal";
import type { RefObject } from "react";
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
  const { clearDesign, components, saveCurrentCanvasAsLayout } = useDesign();
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
    if (window.confirm("Are you sure you want to clear the canvas? This action cannot be undone.")) {
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
    const name = window.prompt("Enter a name for this layout:", "My Saved Layout");
    if (name && name.trim() !== "") {
      try {
        await saveCurrentCanvasAsLayout(name.trim());
        // Toast is handled within saveCurrentCanvasAsLayout
      } catch (error) {
        // Toast for unexpected error (though context should handle most)
        toast({
          title: "Save Layout Failed",
          description: error instanceof Error ? error.message : "An unexpected error occurred.",
          variant: "destructive",
        });
      }
    } else if (name !== null) { // User didn't cancel, but entered empty name
      toast({
        title: "Save Failed",
        description: "Layout name cannot be empty.",
        variant: "destructive",
      });
    }
  };

  const hasUserComponents = components.some(c => c.id !== 'default-root-lazy-column') ||
                           (components.find(c => c.id === 'default-root-lazy-column')?.properties.children?.length || 0) > 0;

  return (
    <header className="h-16 border-b bg-sidebar flex items-center justify-between px-6 shrink-0">
      <Logo />
      <TooltipProvider delayDuration={200}>
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="outline"
                onClick={handleClearCanvas}
                disabled={!hasUserComponents}
                aria-label="Clear Canvas"
                className="border border-sidebar-border text-sidebar-foreground bg-sidebar hover:bg-sidebar-accent hover:text-sidebar-accent-foreground disabled:opacity-50"
              >
                <Trash2 />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Clear Canvas</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="outline"
                onClick={handleSaveLayout}
                disabled={!hasUserComponents}
                aria-label="Save Current Layout"
                className="border border-sidebar-border text-sidebar-foreground bg-sidebar hover:bg-sidebar-accent hover:text-sidebar-accent-foreground disabled:opacity-50"
              >
                <Save />
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
                onClick={handleOpenPublishConfigModal}
                disabled={!hasUserComponents}
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
