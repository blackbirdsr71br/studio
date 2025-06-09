
'use client';

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/icons/Logo";
import { Code, Trash2, FileJson, UploadCloud, Loader2 } from "lucide-react";
import type { GenerateCodeModalRef } from "./GenerateCodeModal";
import type { ViewJsonModalRef } from "./ViewJsonModal";
import type { RefObject } from "react";
import { useDesign } from "@/contexts/DesignContext";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { publishToRemoteConfigAction } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';

interface HeaderProps {
  generateModalRef: RefObject<GenerateCodeModalRef>;
  viewJsonModalRef: RefObject<ViewJsonModalRef>;
}

export function Header({ generateModalRef, viewJsonModalRef }: HeaderProps) {
  const { clearDesign, components, customComponentTemplates } = useDesign(); // Added customComponentTemplates
  const { toast } = useToast();
  const [isPublishing, setIsPublishing] = useState(false);

  const handleGenerateCode = () => {
    if (generateModalRef.current) {
      generateModalRef.current.openModal();
    }
  };

  const handleViewJson = () => {
    if (viewJsonModalRef.current) {
      viewJsonModalRef.current.openModal();
    }
  };

  const handleClearCanvas = () => {
    if (window.confirm("Are you sure you want to clear the canvas? This action cannot be undone.")) {
      clearDesign();
    }
  };

  const handlePublishToRemoteConfig = async () => {
    if (components.length === 0) {
      toast({
        title: "Cannot Publish",
        description: "There are no components on the canvas to publish.",
        variant: "destructive",
      });
      return;
    }
    setIsPublishing(true);
    try {
      // Pass customComponentTemplates to the action
      const result = await publishToRemoteConfigAction(components, customComponentTemplates);
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
                disabled={components.length === 0 || isPublishing}
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
                onClick={handleViewJson}
                disabled={components.length === 0 || isPublishing}
                aria-label="View JSON"
                className="border border-sidebar-border text-sidebar-foreground bg-sidebar hover:bg-sidebar-accent hover:text-sidebar-accent-foreground disabled:opacity-50"
              >
                <FileJson />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>View Design JSON</p>
            </TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="outline"
                onClick={handlePublishToRemoteConfig}
                disabled={components.length === 0 || isPublishing}
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
                onClick={handleGenerateCode}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
                disabled={components.length === 0 || isPublishing}
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
