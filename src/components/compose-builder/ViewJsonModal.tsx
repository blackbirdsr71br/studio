
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
  const [error, setError] = useState<string | string[] | null>(null); // Can be single string or array for multiple errors
  const { components, customComponentTemplates, overwriteComponents } = useDesign();
  const { toast } = useToast();
  const { resolvedTheme } = useTheme();

  const validateAndSetJson = useCallback((newJsonString: string) => {
    setJsonString(newJsonString);
    try {
      const parsedJson = JSON.parse(newJsonString);
      // Validate against the schema
      const validationResult = ModalJsonSchema.safeParse(parsedJson);
      if (!validationResult.success) {
        // Format Zod errors for display
        const individualErrors = validationResult.error.errors.map(
          (err) => `Path "${err.path.join('.')}": ${err.message}`
        );
        setError(['Schema validation failed:', ...individualErrors]);
      } else {
        setError(null);
      }
    } catch (e) {
      if (e instanceof Error) {
        setError(`Syntax error: ${e.message}`);
      } else {
        setError("Invalid JSON syntax. Check for missing commas, brackets, etc.");
      }
    }
  }, []);

  const handleFetchJson = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Check if only the default root exists and has no children
      const rootLazyColumn = components.find(c => c.id === DEFAULT_ROOT_LAZY_COLUMN_ID);
      if (components.length <= 1 && rootLazyColumn && (!rootLazyColumn.properties.children || rootLazyColumn.properties.children.length === 0)) {
        validateAndSetJson("[]"); // Set to empty array if only root exists
      } else {
        const fetchedJsonString = await getDesignComponentsAsJsonAction(components, customComponentTemplates);
        validateAndSetJson(fetchedJsonString);
      }
    } catch (fetchError) {
      console.error("Error fetching JSON:", fetchError);
      const errorMessage = fetchError instanceof Error ? fetchError.message : "Failed to fetch JSON.";
      setJsonString(`// Error fetching JSON:\n// ${errorMessage}`);
      setError(`Fetch error: ${errorMessage}`);
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
      // Fetch JSON only if it's empty, error, or first open
      if (jsonString === "" || jsonString.startsWith("// Error")) {
        handleFetchJson();
      } else {
        // If already populated, re-validate in case schema changed or was buggy
        validateAndSetJson(jsonString);
      }
    }
  }));
  
  useEffect(() => {
    if (isOpen && (jsonString === "" || jsonString.startsWith("// Error"))) {
        handleFetchJson();
    }
  }, [isOpen, jsonString, handleFetchJson]);


  const handleSaveChanges = () => {
    if (error) {
      const errorSummary = Array.isArray(error) ? error.slice(0,5).join("\n") : "JSON is invalid.";
      toast({
        title: "Save Failed",
        description: `${errorSummary} Please correct errors before saving.`,
        variant: "destructive",
      });
      return;
    }
    try {
      const parsedComponents = JSON.parse(jsonString); // Already validated by validateAndSetJson
      const result = overwriteComponents(parsedComponents); // This is the new method name
      if (result.success) {
        toast({
          title: "Changes Saved",
          description: "Design updated from JSON successfully.",
        });
        setIsOpen(false); // Close modal on successful save
      } else {
        setError(result.error || "Could not apply JSON changes.");
        toast({
          title: "Save Failed",
          description: result.error || "Could not apply JSON changes.",
          variant: "destructive",
        });
      }
    } catch (e) {
      console.error("Error saving JSON:", e);
      const message = e instanceof Error ? e.message : "An error occurred while saving.";
      setError(message);
      toast({
        title: "Save Failed",
        description: message,
        variant: "destructive",
      });
    }
  };

  const handleCopyToClipboard = async () => {
    if (error) {
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
          description: "Design components JSON copied to clipboard.",
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
    if (error) {
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
  const hasUserComponentsOnCanvas = components.some(c => c.id !== DEFAULT_ROOT_LAZY_COLUMN_ID) || 
                                 (components.find(c => c.id === DEFAULT_ROOT_LAZY_COLUMN_ID)?.properties.children?.length || 0) > 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if(open) handleFetchJson(); }}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-headline">View/Edit Design JSON</DialogTitle>
          <DialogDescription>
            Inspect and modify the JSON representation of your design. Changes can be applied to the canvas.
            Ensure the structure adheres to the ModalJsonSchema for compatibility.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-grow my-4 rounded-md border overflow-auto bg-background min-h-[300px] relative">
          {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2">Fetching JSON...</span>
            </div>
          ) : null}
            <CodeMirror
              value={jsonString}
              height="100%" // Ensure CodeMirror tries to fill its container
              className="text-sm h-full" // Added h-full
              extensions={[jsonLang()]}
              theme={resolvedTheme === 'dark' ? githubDark : githubLight}
              onChange={validateAndSetJson}
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
        {error && (
          <ScrollArea className="mt-1 mb-2 max-h-24">
            <div className="p-2 text-xs text-destructive-foreground bg-destructive rounded-md">
              {Array.isArray(error) ? (
                <>
                  <div className="flex items-start gap-1.5 mb-0.5">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-px" />
                    <strong className="flex-1">{error[0]}</strong>
                  </div>
                  <ul className="list-disc list-inside pl-4">
                    {error.slice(1).map((err, index) => (
                      <li key={index} className="whitespace-pre-wrap leading-relaxed text-xxs">{err}</li>
                    ))}
                  </ul>
                </>
              ) : (
                <div className="flex items-start gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-px" />
                  <span className="flex-1 whitespace-pre-wrap leading-relaxed">{error}</span>
                </div>
              )}
            </div>
          </ScrollArea>
        )}
        <DialogFooter className="sm:justify-between flex-wrap gap-2">
          <Button variant="outline" onClick={handleFetchJson} disabled={isLoading || !hasUserComponentsOnCanvas}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Refresh
          </Button>
          <div className="flex gap-2 flex-wrap">
            <Button onClick={handleCopyToClipboard} disabled={!canPerformActions || !!error}>
              <Copy className="mr-2 h-4 w-4" /> Copy
            </Button>
            <Button onClick={handleDownloadJson} disabled={!canPerformActions || !!error}>
              <Download className="mr-2 h-4 w-4" /> Download .json
            </Button>
            <Button onClick={handleSaveChanges} disabled={!canPerformActions || !!error}>
              <Save className="mr-2 h-4 w-4" /> Save Changes
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

ViewJsonModal.displayName = 'ViewJsonModal';
    
