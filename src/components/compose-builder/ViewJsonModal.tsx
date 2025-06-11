
'use client';

import React, { useState, useImperativeHandle, forwardRef, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
// Textarea was removed when tabs were removed in a previous step by user, so not re-adding.
// Tabs components were also removed.
import { useDesign } from '@/contexts/DesignContext';
import { getDesignComponentsAsJsonAction, generateCustomCommandJsonAction } from '@/app/actions'; // generateCustomCommandJsonAction is likely unused now
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Copy, Download, Save, RefreshCw, AlertTriangle, Wand2 } from 'lucide-react'; // Wand2 might be unused
import CodeMirror from '@uiw/react-codemirror';
import { json as jsonLang } from '@codemirror/lang-json';
import { githubLight, githubDark } from '@uiw/codemirror-theme-github';
import { ModalJsonSchema, DEFAULT_ROOT_LAZY_COLUMN_ID } from '@/types/compose-spec';
import { useTheme } from '@/contexts/ThemeContext';

export interface ViewJsonModalRef {
  openModal: () => void;
}

// If there are no tabs, this constant might not be used unless activeTab state is still present for future use.
const DESIGN_CANVAS_JSON_TAB = "designCanvasJson"; 


export const ViewJsonModal = forwardRef<ViewJsonModalRef, {}>((props, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  // activeTab state might be vestigial if there's only one view now.
  // Let's assume it was intended to be kept for the single view's logic or potential future re-introduction of tabs.
  const [activeTab, setActiveTab] = useState<string>(DESIGN_CANVAS_JSON_TAB);

  const [designJsonString, setDesignJsonString] = useState<string>("");
  const [isLoadingDesignJson, setIsLoadingDesignJson] = useState(false);
  const [designJsonError, setDesignJsonError] = useState<string | string[] | null>(null);

  // State for "Generate Command JSON" tab (likely unused if tab was removed)
  // const [commandInputText, setCommandInputText] = useState<string>("");
  // const [generatedCommandJson, setGeneratedCommandJson] = useState<string>("");
  // const [isGeneratingCommandJson, setIsGeneratingCommandJson] = useState(false);
  // const [commandGenerationError, setCommandGenerationError] = useState<string | null>(null);

  const { components, customComponentTemplates, overwriteComponents } = useDesign();
  const { toast } = useToast();
  const { resolvedTheme } = useTheme();

  const validateAndSetDesignJson = useCallback((newJsonString: string) => {
    setDesignJsonString(newJsonString);
    try {
      const parsedJson = JSON.parse(newJsonString);
      const validationResult = ModalJsonSchema.safeParse(parsedJson);
      if (!validationResult.success) {
        const individualErrors = validationResult.error.errors.map(
          (err) => `Path "${err.path.join('.')}": ${err.message}`
        );
        setDesignJsonError(['Schema validation failed:', ...individualErrors]);
      } else {
        setDesignJsonError(null);
      }
    } catch (e) {
      if (e instanceof Error) {
        setDesignJsonError(`Syntax error: ${e.message}`);
      } else {
        setDesignJsonError("Invalid JSON syntax. Check for missing commas, brackets, etc.");
      }
    }
  }, []);

  const handleFetchDesignJson = useCallback(async () => {
    setIsLoadingDesignJson(true);
    setDesignJsonError(null);
    try {
      const rootLazyColumn = components.find(c => c.id === DEFAULT_ROOT_LAZY_COLUMN_ID);
      if (components.length <= 1 && rootLazyColumn && (!rootLazyColumn.properties.children || rootLazyColumn.properties.children.length === 0)) {
        validateAndSetDesignJson("[]");
      } else {
        const fetchedJsonString = await getDesignComponentsAsJsonAction(components, customComponentTemplates);
        validateAndSetDesignJson(fetchedJsonString);
      }
    } catch (fetchError) {
      console.error("Error fetching design JSON:", fetchError);
      const errorMessage = fetchError instanceof Error ? fetchError.message : "Failed to fetch design JSON.";
      setDesignJsonString(`// Error fetching JSON:\n// ${errorMessage}`);
      setDesignJsonError(`Fetch error: ${errorMessage}`);
      toast({
        title: "JSON Fetch Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoadingDesignJson(false);
    }
  }, [components, customComponentTemplates, toast, validateAndSetDesignJson]);

  useImperativeHandle(ref, () => ({
    openModal: () => {
      setIsOpen(true);
      // setActiveTab(DESIGN_CANVAS_JSON_TAB); // Remains if activeTab state is kept
      if (designJsonString === "" || designJsonString.startsWith("// Error") || designJsonError) {
        handleFetchDesignJson();
      } else {
        validateAndSetDesignJson(designJsonString); // Re-validate on open
      }
      // Reset states for other potential tabs if they were to be re-added
      // setCommandInputText("");
      // setGeneratedCommandJson("");
      // setCommandGenerationError(null);
    }
  }));
  
  useEffect(() => {
    // This effect handles fetching/re-validating when the modal opens or activeTab (if used) changes
    if (isOpen && activeTab === DESIGN_CANVAS_JSON_TAB) { // Assuming activeTab logic remains for the single view
        if (designJsonString === "" || designJsonString.startsWith("// Error") || designJsonError) {
             handleFetchDesignJson();
        } else {
            // If already open and JSON is present, re-validate it.
            // This can be useful if an external action could have invalidated it.
            // Or, simply trust the JSON if it was valid on open.
            // For safety, re-validating or ensuring it's still the current state is good.
            // The original logic in openModal already called validateAndSetDesignJson.
        }
    }
  }, [isOpen, activeTab, designJsonString, handleFetchDesignJson, designJsonError, validateAndSetDesignJson]);


  const handleSaveChangesToCanvas = () => {
    if (designJsonError) {
      const errorSummary = Array.isArray(designJsonError) ? designJsonError.slice(0,5).join("\n") : "Design JSON is invalid.";
      toast({
        title: "Save Failed",
        description: `${errorSummary} Please correct errors before saving.`,
        variant: "destructive",
      });
      return;
    }
    try {
      const parsedComponents = JSON.parse(designJsonString);
      const result = overwriteComponents(parsedComponents);
      if (result.success) {
        toast({
          title: "Changes Saved",
          description: "Design updated from JSON successfully.",
        });
        setIsOpen(false);
      } else {
        setDesignJsonError(result.error || "Could not apply JSON changes.");
        toast({
          title: "Save Failed",
          description: result.error || "Could not apply JSON changes.",
          variant: "destructive",
        });
      }
    } catch (e) {
      console.error("Error saving design JSON:", e);
      const message = e instanceof Error ? e.message : "An error occurred while saving.";
      setDesignJsonError(message);
      toast({
        title: "Save Failed",
        description: message,
        variant: "destructive",
      });
    }
  };

  // handleGenerateCommandJson and related states/elements would be removed if tabs are fully removed.
  // For now, commenting them out to match the "single tab" view.
  /*
  const handleGenerateCommandJson = async () => {
    // ... logic for command JSON generation
  };
  */

  const handleCopyToClipboard = async () => {
    let contentToCopy = designJsonString; // Assuming only one JSON view
    let currentError = designJsonError;

    if (currentError) { 
        toast({
            title: "Copy Failed",
            description: "JSON contains errors. Please correct them before copying.",
            variant: "destructive",
        });
        return;
    }
    if (contentToCopy) {
      try {
        await navigator.clipboard.writeText(contentToCopy);
        toast({
          title: "JSON Copied!",
          description: "JSON content copied to clipboard.",
        });
      } catch (err) {
        toast({
          title: "Copy Failed",
          description: "Could not copy JSON to clipboard.",
          variant: "destructive",
        });
      }
    } else {
        toast({title: "Nothing to Copy", description: "No JSON content available to copy.", variant: "default"});
    }
  };

  const handleDownloadJson = () => {
    let contentToDownload = designJsonString; // Assuming only one JSON view
    let currentError = designJsonError;
    let filename = "design_canvas.json";
    
    if (currentError) {
        toast({
            title: "Download Failed",
            description: "JSON contains errors. Please correct them before downloading.",
            variant: "destructive",
        });
        return;
    }
    if (contentToDownload && !contentToDownload.startsWith("// Error")) {
      const blob = new Blob([contentToDownload], { type: 'application/json;charset=utf-8' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      toast({
        title: "JSON Downloaded",
        description: `${filename} has started downloading.`,
      });
    } else {
      toast({
        title: "Download Failed",
        description: "No valid JSON to download.",
        variant: "destructive",
      });
    }
  };
  
  const isLoading = isLoadingDesignJson; // Simplified if only one loading state
  const canPerformActions = !isLoading && designJsonString && !designJsonString.startsWith("// Error");
  
  const hasUserComponentsOnCanvas = components.some(c => c.id !== DEFAULT_ROOT_LAZY_COLUMN_ID) || 
                                 (components.find(c => c.id === DEFAULT_ROOT_LAZY_COLUMN_ID)?.properties.children?.length || 0) > 0;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-headline">View/Edit Design JSON</DialogTitle>
          <DialogDescription>
            Inspect or modify the JSON representation of your design.
          </DialogDescription>
        </DialogHeader>

        {/* Single view for Design Canvas JSON */}
        <div className="flex-grow flex flex-col min-h-0 my-2">
            <div className="flex-grow rounded-md border overflow-auto bg-background min-h-[250px] relative">
              {isLoadingDesignJson ? (
                <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="ml-2">Fetching JSON...</span>
                </div>
              ) : null}
              <CodeMirror
                value={designJsonString}
                height="100%"
                className="text-sm h-full"
                extensions={[jsonLang()]}
                theme={resolvedTheme === 'dark' ? githubDark : githubLight}
                onChange={validateAndSetDesignJson}
                editable={!isLoadingDesignJson}
                basicSetup={{ lineNumbers: true, foldGutter: true, autocompletion: true, highlightActiveLine: true, highlightActiveLineGutter: true, bracketMatching: true, closeBrackets: true }}
              />
            </div>
            {designJsonError && (
              <ScrollArea className="mt-1 mb-1 max-h-20">
                <div className="p-2 text-xs text-destructive-foreground bg-destructive rounded-md">
                  {Array.isArray(designJsonError) ? (
                    <>
                      <div className="flex items-start gap-1.5 mb-0.5"><AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-px" /><strong className="flex-1">{designJsonError[0]}</strong></div>
                      <ul className="list-disc list-inside pl-4">{designJsonError.slice(1).map((err, index) => (<li key={index} className="whitespace-pre-wrap leading-relaxed text-xxs">{err}</li>))}</ul>
                    </>
                  ) : (
                    <div className="flex items-start gap-1.5"><AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-px" /><span className="flex-1 whitespace-pre-wrap leading-relaxed">{designJsonError}</span></div>
                  )}
                </div>
              </ScrollArea>
            )}
        </div>
        
        <DialogFooter className="sm:justify-between flex-wrap gap-2 pt-3">
          <Button 
            variant="outline" 
            onClick={handleFetchDesignJson} 
            disabled={isLoading || !hasUserComponentsOnCanvas}
          >
            {isLoadingDesignJson ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Refresh Canvas JSON
          </Button>
          <div className="flex gap-2 flex-wrap">
            <Button onClick={handleCopyToClipboard} disabled={!canPerformActions || !!designJsonError}>
              <Copy className="mr-2 h-4 w-4" /> Copy
            </Button>
            <Button onClick={handleDownloadJson} disabled={!canPerformActions || !!designJsonError}>
              <Download className="mr-2 h-4 w-4" /> Download .json
            </Button>
            <Button 
              onClick={handleSaveChangesToCanvas} 
              disabled={!canPerformActions || !!designJsonError}
            >
              <Save className="mr-2 h-4 w-4" /> Save Changes to Canvas
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

ViewJsonModal.displayName = 'ViewJsonModal';
    
