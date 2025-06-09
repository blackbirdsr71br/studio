
'use client';

import React, { useState, useImperativeHandle, forwardRef, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useDesign } from '@/contexts/DesignContext';
import { getDesignComponentsAsJsonAction } from '@/app/actions';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Copy, Download, Save, RefreshCw, AlertTriangle } from 'lucide-react';
import CodeMirror from '@uiw/react-codemirror';
import { json } from '@codemirror/lang-json';
import { githubLight } from '@uiw/codemirror-theme-github';
import type { DesignComponent } from '@/types/compose-spec';
import { ModalJsonSchema, DEFAULT_ROOT_LAZY_COLUMN_ID } from '@/types/compose-spec';
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
  }, []);

  const handleFetchJson = useCallback(async () => {
    setIsLoading(true);
    setJsonError(null);

    try {
      const rootLazyColumn = components.find(c => c.id === DEFAULT_ROOT_LAZY_COLUMN_ID);
      if (components.length <= 1 && rootLazyColumn && (!rootLazyColumn.properties.children || rootLazyColumn.properties.children.length === 0)) {
        validateAndSetJson("[]");
      } else {
        const jsonString = await getDesignComponentsAsJsonAction(components, customComponentTemplates);
        validateAndSetJson(jsonString);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch JSON.";
      setEditableJsonString(`// Error fetching JSON:\n// ${errorMessage}`);
      setJsonError(`Fetch error: ${errorMessage}`);
      toast({
        title: "JSON Fetch Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
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
    if (jsonError) {
        toast({ title: "Copy Failed", description: "JSON contains errors. Please correct them before copying.", variant: "destructive" });
        return;
    }
    if (!editableJsonString) {
        toast({ title: "Copying Empty JSON", description: "JSON is empty, copied as is.", variant: "default" });
    }
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
  };

  const handleDownloadJson = () => {
    if (jsonError) {
        toast({ title: "Download Failed", description: "JSON contains errors. Please correct them before downloading.", variant: "destructive" });
        return;
    }
     if (!editableJsonString ) {
        toast({ title: "Downloading Empty JSON", description: "JSON is empty, downloading as is.", variant: "default" });
    }
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
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if(open) handleFetchJson(); }}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-headline">Design JSON (User Components)</DialogTitle>
          <DialogDescription>
            View, edit, and save the JSON representation of your design components.
            Syntax and schema errors will be shown below.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-grow my-2 flex flex-col min-h-[400px]">
          <div className="flex flex-col flex-grow rounded-md border overflow-hidden bg-background"> {/* Added flex flex-col here */}
            <CodeMirror
              value={editableJsonString}
              height="100%"
              className="h-full text-xs"
              extensions={[json(), githubLight]}
              onChange={(value) => validateAndSetJson(value)}
              editable={!isLoading}
              basicSetup={{
                lineNumbers: true,
                foldGutter: true,
                autocompletion: true,
                highlightActiveLine: true,
                highlightActiveLineGutter: true,
              }}
            />
          </div>
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
            <Button onClick={handleCopyToClipboard} disabled={isLoading}>
              <Copy className="mr-2 h-4 w-4" /> Copy
            </Button>
            <Button onClick={handleDownloadJson} disabled={isLoading}>
              <Download className="mr-2 h-4 w-4" /> Download .json
            </Button>
            <Button onClick={handleSaveChanges} disabled={isLoading}>
              <Save className="mr-2 h-4 w-4" /> Save Changes
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

ViewJsonModal.displayName = 'ViewJsonModal';
    
