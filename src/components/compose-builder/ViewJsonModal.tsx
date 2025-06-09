
'use client';

import React, { useState, useImperativeHandle, forwardRef, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useDesign } from '@/contexts/DesignContext';
import { getDesignComponentsAsJsonAction } from '@/app/actions'; 
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Copy, Download, Save, RefreshCw, AlertTriangle } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import type { DesignComponent } from '@/types/compose-spec';
import { ModalJsonSchema, DEFAULT_ROOT_LAZY_COLUMN_ID } from '@/types/compose-spec'; // Import the Zod schema
import { ZodError } from 'zod';


export interface ViewJsonModalRef {
  openModal: () => void;
}

export const ViewJsonModal = forwardRef<ViewJsonModalRef, {}>((props, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [editableJsonString, setEditableJsonString] = useState<string>("");
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { components, customComponentTemplates, overwriteComponents } = useDesign();
  const { toast } = useToast();

  const validateAndSetJson = useCallback((jsonStr: string) => {
    setEditableJsonString(jsonStr);
    try {
      const parsedJson = JSON.parse(jsonStr);
      setJsonError(null); 

      const validationResult = ModalJsonSchema.safeParse(parsedJson);
      if (!validationResult.success) {
        const formattedErrors = validationResult.error.errors.map(
          (err) => `Error at path "${err.path.join('.')}": ${err.message}`
        ).join('; \n');
        setJsonError(`Schema validation failed: \n${formattedErrors}`);
      } else {
        setJsonError(null); 
      }
    } catch (error) { 
      if (error instanceof Error) {
        setJsonError(`Syntax error: ${error.message}`);
      } else {
        setJsonError("Invalid JSON syntax. Check for missing commas, brackets, etc.");
      }
    }
  }, []); // Empty dependency array as it only uses setters from useState

  const handleFetchJson = useCallback(async () => {
    setIsLoading(true);
    setJsonError(null); // Clear previous errors at the start of fetch

    try {
      const rootLazyColumn = components.find(c => c.id === DEFAULT_ROOT_LAZY_COLUMN_ID);
      // Check if the canvas is effectively empty (only root with no children from user's perspective)
      if (components.length <= 1 && rootLazyColumn && (!rootLazyColumn.properties.children || rootLazyColumn.properties.children.length === 0)) {
        validateAndSetJson("[]"); // Set to "[]" for an empty user design
      } else {
        const jsonString = await getDesignComponentsAsJsonAction(components, customComponentTemplates);
        validateAndSetJson(jsonString);
      }
    } catch (error) { // This catch is for errors from getDesignComponentsAsJsonAction or other async errors
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch JSON.";
      setEditableJsonString(`// Error fetching JSON:\n// ${errorMessage}`); // Show error in textarea
      setJsonError(`Fetch error: ${errorMessage}`); // Also set the jsonError state for UI feedback
      toast({
        title: "JSON Fetch Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false); // Ensure isLoading is reset
    }
  }, [components, customComponentTemplates, toast, validateAndSetJson]);


  useImperativeHandle(ref, () => ({
    openModal: () => {
      setIsOpen(true);
      handleFetchJson();
    }
  }));

  const handleSaveChanges = () => {
    if (jsonError) {
      toast({ title: "Save Failed", description: "JSON is invalid. Please correct errors before saving.", variant: "destructive" });
      return;
    }
    try {
      const parsedComponents = JSON.parse(editableJsonString); 
      
      const validationResult = ModalJsonSchema.safeParse(parsedComponents);
      if (!validationResult.success) {
          const formattedErrors = validationResult.error.errors.map(
          (err) => `${err.path.join('.')} - ${err.message}`
        ).join('\n');
        setJsonError(`Schema validation failed:\n${formattedErrors}`);
        toast({ title: "Save Failed", description: `JSON is invalid according to schema:\n${formattedErrors}`, variant: "destructive" });
        return;
      }

      const result = overwriteComponents(validationResult.data); 
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
          <DialogTitle className="font-headline">Design JSON (User Components)</DialogTitle>
          <DialogDescription>
            View, edit, and save the JSON representation of your design components.
            Errors (syntax or schema violations) will be shown below.
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
            <ScrollArea className="mt-2 max-h-28">
              <pre className="p-2 text-xs text-destructive-foreground bg-destructive rounded-md flex items-start gap-2 whitespace-pre-wrap">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span className="flex-1">{jsonError}</span>
              </pre>
            </ScrollArea>
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

    
