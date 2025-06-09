
'use client';

import React, { useState, useImperativeHandle, forwardRef, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useDesign } from '@/contexts/DesignContext';
import { getDesignComponentsAsJsonAction } from '@/app/actions'; // Updated action name
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Copy, Download, Save, RefreshCw, AlertTriangle } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import type { DesignComponent } from '@/types/compose-spec';

export interface ViewJsonModalRef {
  openModal: () => void;
}

export const ViewJsonModal = forwardRef<ViewJsonModalRef, {}>((props, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [editableJsonString, setEditableJsonString] = useState<string>("");
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { components, overwriteComponents } = useDesign();
  const { toast } = useToast();

  useImperativeHandle(ref, () => ({
    openModal: () => {
      setIsOpen(true);
      handleFetchJson();
    }
  }));

  const validateAndSetJson = (jsonStr: string) => {
    setEditableJsonString(jsonStr);
    try {
      JSON.parse(jsonStr);
      setJsonError(null);
    } catch (error) {
      if (error instanceof Error) {
        setJsonError(error.message);
      } else {
        setJsonError("Invalid JSON format.");
      }
    }
  };

  const handleFetchJson = useCallback(async () => {
    if (components.length === 0) {
      validateAndSetJson("[]");
      return;
    }
    setIsLoading(true);
    setJsonError(null);
    try {
      const jsonString = await getDesignComponentsAsJsonAction(components); // Uses the flat list
      validateAndSetJson(jsonString);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch JSON.";
      validateAndSetJson(`// Error fetching JSON:\n// ${errorMessage}`);
      toast({
        title: "JSON Fetch Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [components, toast]);

  const handleSaveChanges = () => {
    if (jsonError) {
      toast({ title: "Save Failed", description: "JSON is invalid. Please correct errors before saving.", variant: "destructive" });
      return;
    }
    try {
      const parsedComponents = JSON.parse(editableJsonString) as DesignComponent[];
      // Basic validation: check if it's an array
      if (!Array.isArray(parsedComponents)) {
        throw new Error("Invalid format: Top level must be an array of components.");
      }
      const result = overwriteComponents(parsedComponents);
      if (result.success) {
        toast({ title: "Changes Saved", description: "Design updated from JSON successfully." });
        setIsOpen(false);
      } else {
        toast({ title: "Save Failed", description: result.error || "Could not apply JSON changes.", variant: "destructive" });
        setJsonError(result.error || "Could not apply JSON changes.");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "An error occurred while saving.";
      toast({ title: "Save Failed", description: message, variant: "destructive" });
      setJsonError(message);
    }
  };

  const handleCopyToClipboard = async () => {
    if (editableJsonString && !jsonError) {
      try {
        await navigator.clipboard.writeText(editableJsonString);
        toast({
          title: "JSON Copied!",
          description: "Design JSON copied to clipboard.",
        });
      } catch (err) {
        toast({
          title: "Copy Failed",
          description: "Could not copy JSON to clipboard.",
          variant: "destructive",
        });
      }
    } else {
      toast({ title: "Copy Failed", description: "JSON is invalid or empty.", variant: "destructive" });
    }
  };

  const handleDownloadJson = () => {
    if (editableJsonString && !jsonError) {
      const blob = new Blob([editableJsonString], { type: 'application/json;charset=utf-8' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'design_components.json';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      toast({
        title: "JSON Downloaded",
        description: "design_components.json has started downloading.",
      });
    } else {
      toast({
        title: "Download Failed",
        description: "JSON is invalid or empty.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if(open) handleFetchJson(); }}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-headline">Design JSON (Components List)</DialogTitle>
          <DialogDescription>
            View, edit, and save the JSON representation of your design components.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-grow my-2 flex flex-col min-h-[400px]">
          <Textarea
            value={editableJsonString}
            onChange={(e) => validateAndSetJson(e.target.value)}
            placeholder="JSON data will appear here..."
            className="flex-grow font-code text-xs p-2 rounded-md border bg-muted/30 resize-none min-h-[inherit]"
            disabled={isLoading}
            aria-label="Design JSON content"
          />
          {jsonError && (
            <div className="mt-2 p-2 text-xs text-destructive-foreground bg-destructive rounded-md flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{jsonError}</span>
            </div>
          )}
        </div>
        <DialogFooter className="sm:justify-between flex-wrap gap-2">
          <div className="flex gap-2">
             <Button variant="outline" onClick={handleFetchJson} disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                Refresh
             </Button>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button onClick={handleCopyToClipboard} disabled={isLoading || !!jsonError || !editableJsonString}>
              <Copy className="mr-2 h-4 w-4" /> Copy
            </Button>
            <Button onClick={handleDownloadJson} disabled={isLoading || !!jsonError || !editableJsonString}>
              <Download className="mr-2 h-4 w-4" /> Download .json
            </Button>
            <Button onClick={handleSaveChanges} disabled={isLoading || !!jsonError || !editableJsonString}>
              <Save className="mr-2 h-4 w-4" /> Save Changes
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

ViewJsonModal.displayName = 'ViewJsonModal';
