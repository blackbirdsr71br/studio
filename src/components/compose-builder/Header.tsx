
'use client';

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/icons/Logo";
import { Code, Trash2, FileJson, UploadCloud, Loader2, Cog as SettingsIcon, Palette } from "lucide-react";
import type { GenerateCodeModalRef } from "./GenerateCodeModal";
import type { ViewJsonModalRef } from "./ViewJsonModal";
import type { ThemeEditorModalRef } from "./ThemeEditorModal";
import type { PublishConfigModalRef } from "./PublishConfigModal"; // Import new ref type
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
// publishToRemoteConfigAction is no longer called directly from here
import { useToast } from '@/hooks/use-toast';

interface HeaderProps {
  generateModalRef: RefObject<GenerateCodeModalRef>;
  viewJsonModalRef: RefObject<ViewJsonModalRef>;
  themeEditorModalRef: RefObject<ThemeEditorModalRef>;
  publishConfigModalRef: RefObject<PublishConfigModalRef>; // Add new ref prop
}

export function Header({
  generateModalRef,
  viewJsonModalRef,
  themeEditorModalRef,
  publishConfigModalRef, // Destructure new prop
}: HeaderProps) {
  const { clearDesign, components } = useDesign(); // Removed customComponentTemplates as it's not directly used for the condition
  const { toast } = useToast();
  // isPublishing state is now managed within PublishConfigModal

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
                disabled={!hasUserComponents} // isPublishing check removed as modal handles its own state
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
                onClick={handleOpenPublishConfigModal} // Changed to open the new modal
                disabled={!hasUserComponents} // isPublishing check removed
                aria-label="Publish to Remote Config"
                className="border border-sidebar-border text-sidebar-foreground bg-sidebar hover:bg-sidebar-accent hover:text-sidebar-accent-foreground disabled:opacity-50"
              >
                {/* Loader2 might be managed inside the modal now, or can be kept if header needs global indication */}
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
                // disabled={isPublishing} // isPublishing check removed
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
                disabled={!hasUserComponents} // isPublishing check removed
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
