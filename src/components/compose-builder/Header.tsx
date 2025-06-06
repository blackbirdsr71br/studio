
'use client';

import { Button } from "@/components/ui/button";
import { Logo } from "@/components/icons/Logo";
import { Code, Trash2, FileJson } from "lucide-react";
import type { GenerateCodeModalRef } from "./GenerateCodeModal";
import type { ViewJsonModalRef } from "./ViewJsonModal"; // Import the new ref type
import type { RefObject } from "react";
import { useDesign } from "@/contexts/DesignContext";

interface HeaderProps {
  generateModalRef: RefObject<GenerateCodeModalRef>;
  viewJsonModalRef: RefObject<ViewJsonModalRef>; // Add the new ref prop
}

export function Header({ generateModalRef, viewJsonModalRef }: HeaderProps) {
  const { clearDesign, components } = useDesign();

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

  return (
    <header className="h-16 border-b bg-sidebar flex items-center justify-between px-6 shrink-0">
      <Logo />
      <div className="flex items-center gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleClearCanvas}
          disabled={components.length === 0}
          aria-label="Clear Canvas"
        >
          <Trash2 className="mr-2 h-4 w-4" /> Clear Canvas
        </Button>
        <Button 
          variant="outline"
          size="sm" 
          onClick={handleViewJson} 
          disabled={components.length === 0}
          aria-label="View JSON"
        >
          <FileJson className="mr-2 h-4 w-4" /> View JSON
        </Button>
        <Button 
          size="sm" 
          onClick={handleGenerateCode} 
          className="bg-accent hover:bg-accent/90 text-accent-foreground"
          disabled={components.length === 0}
          aria-label="Generate Code"
        >
          <Code className="mr-2 h-4 w-4" /> Generate Code
        </Button>
      </div>
    </header>
  );
}
