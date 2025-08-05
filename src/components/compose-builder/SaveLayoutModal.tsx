
'use client';

import React, { useState, useImperativeHandle, forwardRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Library } from 'lucide-react';
import { useDesign } from '@/contexts/DesignContext';
import { useToast } from '@/hooks/use-toast';

export interface SaveLayoutModalRef {
  openModal: () => void;
}

export const SaveLayoutModal = forwardRef<SaveLayoutModalRef, {}>((props, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [layoutName, setLayoutName] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const { saveCurrentCanvasAsLayout, savedLayouts } = useDesign();
  const { toast } = useToast();

  useImperativeHandle(ref, () => ({
    openModal: () => {
      setLayoutName("");
      setIsSaving(false);
      setIsOpen(true);
    }
  }));

  const handleSave = async () => {
    if (!layoutName.trim()) {
      toast({
        title: "Validation Error",
        description: "Layout name cannot be empty.",
        variant: "destructive",
      });
      return;
    }
    
    if (savedLayouts.some(layout => layout.name.toLowerCase() === layoutName.trim().toLowerCase())) {
        toast({
            title: "Validation Error",
            description: "A layout with this name already exists. Please choose a unique name.",
            variant: "destructive",
        });
        return;
    }

    setIsSaving(true);
    try {
      await saveCurrentCanvasAsLayout(layoutName.trim());
      // The context will show a toast on success
      setIsOpen(false);
    } catch (error) {
       toast({
        title: "Save Failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred while saving the layout.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-headline flex items-center gap-2">
            <Library className="w-5 h-5 text-primary" /> Save Current Layout
          </DialogTitle>
          <DialogDescription>
            Give your current canvas design a name to save it for later use.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 space-y-1.5">
            <Label htmlFor="layoutNameInput">Layout Name</Label>
            <Input
              id="layoutNameInput"
              value={layoutName}
              onChange={(e) => setLayoutName(e.target.value)}
              placeholder="e.g., User Profile Screen"
              disabled={isSaving}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
            />
            <p className="text-xs text-muted-foreground">
              This name will be used to identify your layout in the library.
            </p>
        </div>
        
        <DialogFooter className="gap-2 sm:gap-0">
          <DialogClose asChild>
            <Button variant="outline" disabled={isSaving}>Cancel</Button>
          </DialogClose>
          <Button onClick={handleSave} disabled={isSaving || !layoutName.trim()}>
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Library className="mr-2 h-4 w-4" />
            )}
            Save Layout
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

SaveLayoutModal.displayName = 'SaveLayoutModal';
