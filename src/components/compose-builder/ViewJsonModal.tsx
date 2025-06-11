
'use client';

import React, { useState, useImperativeHandle, forwardRef, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDesign } from '@/contexts/DesignContext';
import {
  getDesignComponentsAsJsonAction,
  generateCustomCommandJsonAction,
} from '@/app/actions';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Copy, Download, Save, RefreshCw, AlertTriangle, Wand2 } from 'lucide-react';
import CodeMirror from '@uiw/react-codemirror';
import { json as jsonLang } from '@codemirror/lang-json';
import { githubLight, githubDark } from '@uiw/codemirror-theme-github';
import { ModalJsonSchema, DEFAULT_ROOT_LAZY_COLUMN_ID } from '@/types/compose-spec';
import { useTheme } from '@/contexts/ThemeContext';

export interface ViewJsonModalRef {
  openModal: () => void;
}

const DESIGN_CANVAS_JSON_TAB = "designCanvasJson";
const GENERATE_COMMAND_JSON_TAB = "generateCommandJson";


export const ViewJsonModal = forwardRef<ViewJsonModalRef, {}>((props, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>(DESIGN_CANVAS_JSON_TAB);

  // State for Design Canvas JSON tab (Tab 1)
  const [designJsonString, setDesignJsonString] = useState<string>("");
  const [isLoadingDesignJson, setIsLoadingDesignJson] = useState(false);
  const [designJsonError, setDesignJsonError] = useState<string | string[] | null>(null);

  // State for Generate Command JSON tab (Tab 2)
  const [commandInputText, setCommandInputText] = useState<string>("");
  const [generatedCommandJson, setGeneratedCommandJson] = useState<string>("");
  const [isGeneratingCommandJson, setIsGeneratingCommandJson] = useState(false);
  const [commandGenerationError, setCommandGenerationError] = useState<string | string[] | null>(null);

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
        validateAndSetDesignJson("[]"); // Valid empty array
      } else {
        const fetchedJsonString = await getDesignComponentsAsJsonAction(components, customComponentTemplates);
        validateAndSetDesignJson(fetchedJsonString);
      }
    } catch (fetchError) {
      console.error("Error fetching design JSON:", fetchError);
      const errorMessage = fetchError instanceof Error ? fetchError.message : "Failed to fetch design JSON.";
      setDesignJsonString(`// Error fetching JSON:\n// ${errorMessage}`);
      setDesignJsonError([`Fetch error: ${errorMessage}`]);
      toast({
        title: "JSON Fetch Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoadingDesignJson(false);
    }
  }, [components, customComponentTemplates, toast, validateAndSetDesignJson]);


  const handleGenerateCommandJson = async () => { // For Tab 2
    if (!commandInputText.trim()) {
      setCommandGenerationError(["Input commands cannot be empty."]);
      return;
    }
    setIsGeneratingCommandJson(true);
    setGeneratedCommandJson("");
    setCommandGenerationError(null);
    try {
      const result = await generateCustomCommandJsonAction(commandInputText);
      if (result.commandJson) {
        try {
            JSON.parse(result.commandJson); // Validate if it's JSON
            setGeneratedCommandJson(result.commandJson);
        } catch (parseError) {
            setCommandGenerationError(["AI returned invalid JSON."]);
            setGeneratedCommandJson(result.commandJson); // Show the invalid JSON for debugging
        }
      } else {
        setCommandGenerationError([result.error || "AI did not return JSON."]);
      }
    } catch (error) {
      console.error("Error generating command JSON:", error);
      const message = error instanceof Error ? error.message : "An unknown error occurred.";
      setCommandGenerationError([`Generation error: ${message}`]);
    } finally {
      setIsGeneratingCommandJson(false);
    }
  };


  useImperativeHandle(ref, () => ({
    openModal: () => {
      setIsOpen(true);
      setActiveTab(DESIGN_CANVAS_JSON_TAB); // Default to the first tab
      // Initial fetch/validation for the first tab
      if (designJsonString === "" || designJsonString.startsWith("// Error") || designJsonError) {
        handleFetchDesignJson();
      } else {
        validateAndSetDesignJson(designJsonString);
      }
      // Reset state for the second tab
      setCommandInputText("");
      setGeneratedCommandJson("");
      setCommandGenerationError(null);
    }
  }), [designJsonString, designJsonError, handleFetchDesignJson, validateAndSetDesignJson]);
  
  useEffect(() => {
    if (isOpen && activeTab === DESIGN_CANVAS_JSON_TAB) {
        if (designJsonString === "" || designJsonString.startsWith("// Error") || designJsonError) {
             handleFetchDesignJson();
        } else {
            validateAndSetDesignJson(designJsonString); // Re-validate on tab switch if needed
        }
    }
  }, [isOpen, activeTab, designJsonString, handleFetchDesignJson, designJsonError, validateAndSetDesignJson]);


  const handleSaveChangesToCanvas = () => { // Only for Tab 1
    if (activeTab !== DESIGN_CANVAS_JSON_TAB) return; 
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
        setDesignJsonError(result.error ? [result.error] : ["Could not apply JSON changes."]);
        toast({
          title: "Save Failed",
          description: result.error || "Could not apply JSON changes.",
          variant: "destructive",
        });
      }
    } catch (e) {
      console.error("Error saving design JSON:", e);
      const message = e instanceof Error ? e.message : "An error occurred while saving.";
      setDesignJsonError([message]);
      toast({
        title: "Save Failed",
        description: message,
        variant: "destructive",
      });
    }
  };


  const handleCopyToClipboard = async () => {
    let contentToCopy = "";
    let currentErrorState: string | string[] | null = null;

    if (activeTab === DESIGN_CANVAS_JSON_TAB) {
      contentToCopy = designJsonString;
      currentErrorState = designJsonError;
    } else if (activeTab === GENERATE_COMMAND_JSON_TAB) {
      contentToCopy = generatedCommandJson;
      currentErrorState = commandGenerationError;
    }

    if (currentErrorState) {
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
    let contentToDownload = "";
    let currentErrorState: string | string[] | null = null;
    let filename = "data.json";

    if (activeTab === DESIGN_CANVAS_JSON_TAB) {
      contentToDownload = designJsonString;
      currentErrorState = designJsonError;
      filename = "design_canvas.json";
    } else if (activeTab === GENERATE_COMMAND_JSON_TAB) {
      contentToDownload = generatedCommandJson;
      currentErrorState = commandGenerationError;
      filename = "command_ui.json";
    }
    
    if (currentErrorState) {
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
  
  const isLoading = isLoadingDesignJson || isGeneratingCommandJson;
  const canPerformActions = !isLoading && 
    (activeTab === DESIGN_CANVAS_JSON_TAB ? (designJsonString && !designJsonString.startsWith("// Error") && !designJsonError) :
     (generatedCommandJson && !generatedCommandJson.startsWith("// Error") && !commandGenerationError));
  
  const hasUserComponentsOnCanvas = components.some(c => c.id !== DEFAULT_ROOT_LAZY_COLUMN_ID) || 
                                 (components.find(c => c.id === DEFAULT_ROOT_LAZY_COLUMN_ID)?.properties.children?.length || 0) > 0;

  const showSaveToCanvasButton = activeTab === DESIGN_CANVAS_JSON_TAB;
  const showRefreshCanvasJsonButton = activeTab === DESIGN_CANVAS_JSON_TAB;

  const currentErrorForDisplay = activeTab === DESIGN_CANVAS_JSON_TAB ? designJsonError : commandGenerationError;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-headline">View/Generate JSON</DialogTitle>
          <DialogDescription>
            Inspect or generate JSON representations of UI designs.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-grow flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-2 mb-2 h-auto">
            <TabsTrigger value={DESIGN_CANVAS_JSON_TAB} className="text-xs px-1 py-1.5">Design Canvas JSON</TabsTrigger>
            <TabsTrigger value={GENERATE_COMMAND_JSON_TAB} className="text-xs px-1 py-1.5">Generate Command JSON</TabsTrigger>
          </TabsList>

          <TabsContent value={DESIGN_CANVAS_JSON_TAB} className="flex-grow flex flex-col min-h-0 outline-none ring-0">
            <div className="flex-grow rounded-md border overflow-auto bg-background min-h-[250px] relative">
              {isLoadingDesignJson && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" /><span className="ml-2">Fetching JSON...</span>
                </div>
              )}
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
          </TabsContent>

          <TabsContent value={GENERATE_COMMAND_JSON_TAB} className="flex-grow flex flex-col min-h-0 space-y-2 outline-none ring-0">
            <Textarea
              value={commandInputText}
              onChange={(e) => setCommandInputText(e.target.value)}
              placeholder="Enter Jetpack Compose-like commands here... e.g., Card { Text(\"Hello\") }"
              className="text-sm min-h-[100px] max-h-[150px] flex-shrink-0"
            />
            <Button onClick={handleGenerateCommandJson} disabled={isGeneratingCommandJson || !commandInputText.trim()} size="sm" className="self-start">
              {isGeneratingCommandJson ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
              Generate JSON from Commands
            </Button>
            <div className="flex-grow rounded-md border overflow-auto bg-background min-h-[150px] relative">
              {isGeneratingCommandJson && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" /><span className="ml-2">Generating JSON...</span>
                </div>
              )}
              <CodeMirror
                value={generatedCommandJson}
                height="100%"
                className="text-sm h-full"
                extensions={[jsonLang()]}
                theme={resolvedTheme === 'dark' ? githubDark : githubLight}
                onChange={setGeneratedCommandJson} 
                editable={!isGeneratingCommandJson}
                basicSetup={{ lineNumbers: true, foldGutter: true, autocompletion: true, highlightActiveLine: true, highlightActiveLineGutter: true, bracketMatching: true, closeBrackets: true }}
              />
            </div>
          </TabsContent>
        </Tabs>
        
        {currentErrorForDisplay && (
            <ScrollArea className="mt-1 mb-1 max-h-20">
            <div className="p-2 text-xs text-destructive-foreground bg-destructive rounded-md">
                {Array.isArray(currentErrorForDisplay) ? (
                <>
                    <div className="flex items-start gap-1.5 mb-0.5"><AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-px" /><strong className="flex-1">{currentErrorForDisplay[0]}</strong></div>
                    <ul className="list-disc list-inside pl-4">{currentErrorForDisplay.slice(1).map((err, index) => (<li key={index} className="whitespace-pre-wrap leading-relaxed text-xxs">{err}</li>))}</ul>
                </>
                ) : (
                <div className="flex items-start gap-1.5"><AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-px" /><span className="flex-1 whitespace-pre-wrap leading-relaxed">{currentErrorForDisplay}</span></div>
                )}
            </div>
            </ScrollArea>
        )}
        
        <DialogFooter className="sm:justify-between flex-wrap gap-2 pt-3">
          <div>
            {showRefreshCanvasJsonButton && (
              <Button 
                variant="outline" 
                onClick={handleFetchDesignJson} 
                disabled={isLoadingDesignJson || !hasUserComponentsOnCanvas}
              >
                {isLoadingDesignJson ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                Refresh Canvas JSON
              </Button>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button onClick={handleCopyToClipboard} disabled={!canPerformActions || !!currentErrorForDisplay}>
              <Copy className="mr-2 h-4 w-4" /> Copy
            </Button>
            <Button onClick={handleDownloadJson} disabled={!canPerformActions || !!currentErrorForDisplay}>
              <Download className="mr-2 h-4 w-4" /> Download .json
            </Button>
            {showSaveToCanvasButton && (
              <Button 
                onClick={handleSaveChangesToCanvas} 
                disabled={!canPerformActions || !!designJsonError} 
              >
                <Save className="mr-2 h-4 w-4" /> Save Changes to Canvas
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

ViewJsonModal.displayName = 'ViewJsonModal';
    
    

    