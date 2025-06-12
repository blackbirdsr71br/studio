
'use client';

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/icons/Logo";
import { Code, Trash2, FileJson, UploadCloud, Loader2, Cog as SettingsIcon, Palette } from "lucide-react";
import type { GenerateCodeModalRef } from "./GenerateCodeModal";
import type { ViewJsonModalRef } from "./ViewJsonModal";
import type { ThemeEditorModalRef } from "./ThemeEditorModal";
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
import { publishToRemoteConfigAction } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';

interface HeaderProps {
  generateModalRef: RefObject<GenerateCodeModalRef>;
  viewJsonModalRef: RefObject<ViewJsonModalRef>;
  themeEditorModalRef: RefObject<ThemeEditorModalRef>;
}

export function Header({ generateModalRef, viewJsonModalRef, themeEditorModalRef }: HeaderProps) {
  const { clearDesign, components, customComponentTemplates } = useDesign();
  const { toast } = useToast();
  const [isPublishing, setIsPublishing] = useState(false);

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

  const handlePublishToRemoteConfig = async () => {
    if (components.length === 0 || (components.length === 1 && components[0].id === 'default-root-lazy-column' && (!components[0].properties.children || components[0].properties.children.length === 0))) {
      toast({
        title: "Cannot Publish",
        description: "There are no user-added components on the canvas to publish.",
        variant: "destructive",
      });
      return;
    }

    const parameterKey = window.prompt(
      "Enter the Remote Config Parameter Key for publishing:",
      "COMPOSE_DESIGN_JSON_V2" // Default value
    );

    if (!parameterKey || parameterKey.trim() === "") {
      toast({
        title: "Publish Canceled",
        description: "Parameter key cannot be empty.",
        variant: "default",
      });
      return;
    }

    setIsPublishing(true);
    try {
      const result = await publishToRemoteConfigAction(components, customComponentTemplates, parameterKey.trim());
      if (result.success) {
        toast({
          title: "Publish Successful",
          description: `${result.message} (Version: ${result.version || 'N/A'})`,
        });
      } else {
        toast({
          title: "Publish Failed",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Publishing error:", error);
      toast({
        title: "Publish Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsPublishing(false);
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
                disabled={!hasUserComponents || isPublishing}
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
                onClick={handlePublishToRemoteConfig}
                disabled={!hasUserComponents || isPublishing}
                aria-label="Publish to Remote Config"
                className="border border-sidebar-border text-sidebar-foreground bg-sidebar hover:bg-sidebar-accent hover:text-sidebar-accent-foreground disabled:opacity-50"
              >
                {isPublishing ? <Loader2 className="animate-spin" /> : <UploadCloud />}
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
                disabled={isPublishing}
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
                disabled={!hasUserComponents || isPublishing}
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

