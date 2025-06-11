
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
import { json as jsonLang } from '@codemirror/lang-json';
import { githubLight, githubDark } from '@uiw/codemirror-theme-github';
import { ModalJsonSchema, DEFAULT_ROOT_LAZY_COLUMN_ID } from '@/types/compose-spec';
import { useTheme } from '@/contexts/ThemeContext';


export interface ViewJsonModalRef {
  openModal: () => void;
}

export const ViewJsonModal = forwardRef<ViewJsonModalRef, {}>((props, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [jsonString, setJsonString] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [jsonError, setJsonError] = useState<string | string[] | null>(null);
  const { components, customComponentTemplates, overwriteComponents } = useDesign();
  const { toast } = useToast();
  const { resolvedTheme } = useTheme();

  const validateAndSetJson = useCallback((newJsonString: string) => {
    setJsonString(newJsonString);
    try {
      const parsedJson = JSON.parse(newJsonString);
      const validationResult = ModalJsonSchema.safeParse(parsedJson);
      if (!validationResult.success) {
        const individualErrors = validationResult.error.errors.map(
          (err) => `Path "${err.path.join('.')}": ${err.message}`
        );
        setJsonError(['Schema validation failed:', ...individualErrors]);
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
      // Check if there are any user-added components (excluding the default root)
      // or if the default root has children.
      const rootLazyColumn = components.find(c => c.id === DEFAULT_ROOT_LAZY_COLUMN_ID);
      if (components.length <= 1 && rootLazyColumn && (!rootLazyColumn.properties.children || rootLazyColumn.properties.children.length === 0)) {
        // If only the default root lazy column exists and it has no children, show an empty array.
        validateAndSetJson("[]");
      } else {
        const fetchedJsonString = await getDesignComponentsAsJsonAction(components, customComponentTemplates);
        validateAndSetJson(fetchedJsonString);
      }
    } catch (error) {
      console.error("Error fetching JSON:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch JSON.";
      setJsonString(`// Error fetching JSON:\n// ${errorMessage}`);
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
      // Fetch or re-fetch JSON when modal opens or if it's empty/error state
      // This ensures the JSON is current if changes were made outside the modal.
      handleFetchJson();
    }
  }));
  
  // If modal is opened and the JSON string is still empty or shows an error, fetch it.
  // This handles the case where the modal might have been closed with an error or empty state.
  useEffect(() => {
    if (isOpen && (jsonString === "" || jsonString.startsWith("// Error"))) {
      handleFetchJson();
    }
  }, [isOpen, jsonString, handleFetchJson]);


  const handleSaveChanges = () => {
    if (jsonError) {
      const errorSummary = Array.isArray(jsonError) ? jsonError.slice(0,5).join("\n") : "JSON is invalid.";
      toast({
        title: "Save Failed",
        description: `${errorSummary} Please correct errors.`,
        variant: "destructive",
      });
      return;
    }
    try {
      const parsedComponents = JSON.parse(jsonString);
      // Schema is validated by validateAndSetJson, but we can re-parse here to be sure
      // or rely on the fact that jsonError would be set if it's invalid.
      const result = overwriteComponents(parsedComponents); // ModalJsonSchema.parse(parsedComponents) would re-validate
      if (result.success) {
        toast({
          title: "Changes Saved",
          description: "Design updated from JSON successfully.",
        });
        setIsOpen(false); 
      } else {
        setJsonError(result.error || "Could not apply JSON changes.");
        toast({
          title: "Save Failed",
          description: result.error || "Could not apply JSON changes.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error saving JSON:", error);
      const message = error instanceof Error ? error.message : "An error occurred while saving.";
      setJsonError(message);
      toast({
        title: "Save Failed",
        description: message,
        variant: "destructive",
      });
    }
  };

  const handleCopyToClipboard = async () => {
    if (jsonError) {
        toast({
            title: "Copy Failed",
            description: "JSON contains errors. Please correct them before copying.",
            variant: "destructive",
        });
        return;
    }
    if (jsonString) {
      try {
        await navigator.clipboard.writeText(jsonString);
        toast({
          title: "JSON Copied!",
          description: "JSON copied to clipboard.",
        });
      } catch (err) {
        toast({
          title: "Copy Failed",
          description: "Could not copy JSON to clipboard.",
          variant: "destructive",
        });
      }
    }
  };

  const handleDownloadJson = () => {
     if (jsonError) {
        toast({
            title: "Download Failed",
            description: "JSON contains errors. Please correct them before downloading.",
            variant: "destructive",
        });
        return;
    }
    if (jsonString && !jsonString.startsWith("// Error")) {
      const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
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
        description: "No valid JSON to download.",
        variant: "destructive",
      });
    }
  };
  
  const canPerformActions = !isLoading && jsonString && !jsonString.startsWith("// Error");

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if(open) handleFetchJson(); }}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-headline">View/Edit Design JSON</DialogTitle>
          <DialogDescription>
            Edit the JSON representation of your design components. Changes will update the canvas.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-grow my-4 rounded-md border overflow-auto bg-background min-h-[300px]">
            <CodeMirror
                value={jsonString}
                height="100%"
                className="text-xs h-full"
                extensions={[jsonLang()]}
                theme={resolvedTheme === 'dark' ? githubDark : githubLight}
                onChange={(value) => validateAndSetJson(value)}
                editable={!isLoading}
                basicSetup={{
                    lineNumbers: true,
                    foldGutter: true,
                    autocompletion: true,
                    highlightActiveLine: true,
                    highlightActiveLineGutter: true,
                    bracketMatching: true,
                    closeBrackets: true,
                }}
            />
        </div>
        
        {jsonError && (
            <ScrollArea className="mt-1 mb-2 max-h-28">
              <div className="p-3 text-xs text-destructive-foreground bg-destructive rounded-md">
                {Array.isArray(jsonError) ? (
                  <>
                    <div className="flex items-start gap-2 mb-1">
                      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                      <strong className="flex-1">{jsonError[0]}</strong>
                    </div>
                    <ul className="list-disc list-inside pl-5">
                      {jsonError.slice(1).map((err, index) => (
                        <li key={index} className="whitespace-pre-wrap leading-relaxed">{err}</li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span className="flex-1 whitespace-pre-wrap leading-relaxed">{jsonError}</span>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}

        <DialogFooter className="sm:justify-between flex-wrap gap-2">
          <Button variant="outline" onClick={handleFetchJson} disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Refresh
          </Button>
          <div className="flex gap-2 flex-wrap">
            <Button onClick={handleCopyToClipboard} disabled={!canPerformActions}>
              <Copy className="mr-2 h-4 w-4" /> Copy
            </Button>
            <Button onClick={handleDownloadJson} disabled={!canPerformActions}>
              <Download className="mr-2 h-4 w-4" /> Download .json
            </Button>
            <Button onClick={handleSaveChanges} disabled={!canPerformActions || !!jsonError}>
              <Save className="mr-2 h-4 w-4" /> Save Changes
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

ViewJsonModal.displayName = 'ViewJsonModal';
    
