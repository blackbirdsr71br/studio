
'use client';

import React, { useState, useImperativeHandle, forwardRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
// Temporarily remove other complex imports like CodeMirror, useDesign, useToast, useTheme, actions, etc.

export interface ViewJsonModalRef {
  openModal: () => void;
}

export const ViewJsonModal = forwardRef<ViewJsonModalRef, {}>((props, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [debugText, setDebugText] = useState("Modal Initial State");

  // Simplified imperative handle
  useImperativeHandle(ref, () => ({
    openModal: () => {
      setIsOpen(true);
      setDebugText("Modal has been opened via ref!");
    }
  }), []); // Empty dependency array as it only uses setIsOpen and setDebugText

  // Simplified effect
  useEffect(() => {
    if (isOpen) {
      console.log("ViewJsonModal is open. Debug text:", debugText);
    }
  }, [isOpen, debugText]);

  if (!isOpen) {
    return null; // Or return <></> if you prefer
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-lg"> {/* Simplified className */}
        <DialogHeader>
          <DialogTitle>Simplified Modal Title</DialogTitle>
          <DialogDescription>
            This is a test to ensure basic dialog rendering.
          </DialogDescription>
        </DialogHeader>
        <div className="p-4">
          <p>Debug Text: {debugText}</p>
          <p>If you see this, the basic Dialog structure is parsing correctly.</p>
        </div>
        <DialogFooter>
          <Button onClick={() => setIsOpen(false)}>Close Modal</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

ViewJsonModal.displayName = 'ViewJsonModal';
