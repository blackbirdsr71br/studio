
'use client';

import React, { useState, useImperativeHandle, forwardRef, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useDesign } from '@/contexts/DesignContext';
import {
  getDesignComponentsAsJsonAction,
  generateJsonFromTextAction,
  generateCustomCommandJsonAction,
  convertCanvasToCustomJsonAction
} from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Copy, Download, Wand2, FileJson, Info, Save, AlertTriangle } from 'lucide-react';
import CodeMirror from '@uiw/react-codemirror';
import { json as jsonLang } from '@codemirror/lang-json';
import { githubLight, githubDark } from '@uiw/codemirror-theme-github';
import { useTheme } from '@/contexts/ThemeContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ModalJsonSchema } from '@/types/compose-spec'; // For validation
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export interface ViewJsonModalRef {
  openModal: () => void;
}

type ActiveTab = "canvasJson" | "generateCustomJsonFromCanvas" | "generateCustomJsonFromText";


export const ViewJsonModal = forwardRef<ViewJsonModalRef, {}>((_props, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("canvasJson");

  // State for "Design Canvas JSON" tab
  const [canvasJsonString, setCanvasJsonString] = useState<string>("");
  const [isCanvasJsonLoading, setIsCanvasJsonLoading] = useState(false);
  const [canvasJsonError, setCanvasJsonError] = useState<string | null>(null);
  const [syntaxError, setSyntaxError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);


  // State for "Generate Custom JSON from Canvas" tab
  const [customJsonFromCanvasString, setCustomJsonFromCanvasString] = useState<string>("");
  const [isCustomJsonFromCanvasLoading, setIsCustomJsonFromCanvasLoading] = useState(false);
  const [customJsonFromCanvasError, setCustomJsonFromCanvasError] = useState<string | null>(null);

  // State for "Generate Custom JSON from Text Command" tab
  const [textCommand, setTextCommand] = useState<string>("");
  const [generatedCustomJsonFromText, setGeneratedCustomJsonFromText] = useState<string>("");
  const [isGeneratingCustomJsonFromText, setIsGeneratingCustomJsonFromText] = useState(false);
  const [generationCustomJsonFromTextError, setGenerationCustomJsonFromTextError] = useState<string | null>(null);

  const { components, customComponentTemplates, overwriteComponents } = useDesign();
  const { toast } = useToast();
  const { resolvedTheme } = useTheme();

  const currentJsonInEditor = (): string => {
    switch (activeTab) {
      case "canvasJson": return canvasJsonString;
      case "generateCustomJsonFromCanvas": return customJsonFromCanvasString;
      case "generateCustomJsonFromText": return generatedCustomJsonFromText;
      default: return "";
    }
  };
  
  const currentError = (): string | null => {
     switch (activeTab) {
      case "canvasJson": return canvasJsonError || syntaxError || (validationErrors.length > 0 ? validationErrors.join('; ') : null);
      case "generateCustomJsonFromCanvas": return customJsonFromCanvasError;
      case "generateCustomJsonFromText": return generationCustomJsonFromTextError;
      default: return null;
    }
  }


  const fetchDesignJson = useCallback(async () => {
    if (activeTab !== "canvasJson" && activeTab !== "generateCustomJsonFromCanvas") return;

    if (activeTab === "canvasJson") {
      setIsCanvasJsonLoading(true);
      setCanvasJsonError(null);
      setSyntaxError(null);
      setValidationErrors([]);
      try {
        const jsonStr = await getDesignComponentsAsJsonAction(components, customComponentTemplates);
        if (jsonStr.startsWith("Error:")) {
          setCanvasJsonError(jsonStr);
          setCanvasJsonString("");
        } else {
          setCanvasJsonString(jsonStr);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to fetch design JSON.";
        setCanvasJsonError(message);
        setCanvasJsonString("");
      } finally {
        setIsCanvasJsonLoading(false);
      }
    }
  }, [activeTab, components, customComponentTemplates]);

  const handleGenerateCustomJsonFromCanvas = useCallback(async () => {
    setIsCustomJsonFromCanvasLoading(true);
    setCustomJsonFromCanvasError(null);
    setCustomJsonFromCanvasString("");
    try {
      const result = await convertCanvasToCustomJsonAction(components, customComponentTemplates);
      if (result.customJsonString) {
        setCustomJsonFromCanvasString(result.customJsonString);
      } else {
        setCustomJsonFromCanvasError(result.error || "Failed to generate custom JSON from canvas.");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "An unexpected error occurred.";
      setCustomJsonFromCanvasError(message);
    } finally {
      setIsCustomJsonFromCanvasLoading(false);
    }
  }, [components, customComponentTemplates]);


  useEffect(() => {
    if (isOpen) {
      if (activeTab === "canvasJson") {
         fetchDesignJson();
      } else if (activeTab === "generateCustomJsonFromCanvas" && !customJsonFromCanvasString && !customJsonFromCanvasError) {
        // If this tab is opened for the first time (or cleared) and no content/error, generate
        handleGenerateCustomJsonFromCanvas();
      }
      // For "generateCustomJsonFromText", content is generated on demand via button.
    }
  }, [isOpen, activeTab, fetchDesignJson, handleGenerateCustomJsonFromCanvas, customJsonFromCanvasString, customJsonFromCanvasError]);

  useImperativeHandle(ref, () => ({
    openModal: () => {
      setIsOpen(true);
      // Resetting potentially stale states from previous openings
      setTextCommand("");
      setGeneratedCustomJsonFromText("");
      setGenerationCustomJsonFromTextError(null);
      // setCustomJsonFromCanvasString(""); // Don't reset this if user might want to re-open and see last generated
      // setCustomJsonFromCanvasError(null);
      
      // Trigger fetch/generation based on the tab that will be active
      // If it's not canvasJson, the useEffect will handle it or user interaction
      if (activeTab === "canvasJson") {
        fetchDesignJson();
      } else if (activeTab === "generateCustomJsonFromCanvas") {
        // If opening directly to this tab and it's empty, generate
        if (!customJsonFromCanvasString && !customJsonFromCanvasError) {
           handleGenerateCustomJsonFromCanvas();
        }
      }
    }
  }));

  const handleCanvasJsonChange = useCallback((value: string) => {
    setCanvasJsonString(value);
    setSyntaxError(null); // Clear previous syntax error on new input
    setValidationErrors([]); // Clear previous validation errors
  }, []);

  const handleSaveChangesToCanvas = () => {
    setSyntaxError(null);
    setValidationErrors([]);
    try {
      const parsedJson = JSON.parse(canvasJsonString);
      const validationResult = ModalJsonSchema.safeParse(parsedJson);

      if (!validationResult.success) {
        const errors = validationResult.error.errors.map(err => `${err.path.join('.')} - ${err.message}`);
        setValidationErrors(errors);
        toast({
          title: "Validation Failed",
          description: "JSON structure is invalid. See errors below editor.",
          variant: "destructive",
        });
        return;
      }
      
      const result = overwriteComponents(validationResult.data);
      if (result.success) {
        toast({
          title: "Canvas Updated",
          description: "JSON changes applied to the design canvas.",
        });
        // setIsOpen(false); // Optionally close modal on success
      } else {
        setCanvasJsonError(result.error || "Failed to apply JSON to canvas.");
         toast({
          title: "Update Failed",
          description: result.error || "Could not apply JSON to canvas.",
          variant: "destructive",
        });
      }

    } catch (e) {
      const error = e as Error;
      setSyntaxError(`Invalid JSON syntax: ${error.message}`);
      toast({
        title: "Invalid JSON",
        description: "Please correct the JSON syntax errors.",
        variant: "destructive",
      });
    }
  };
  
  const handleGenerateCustomJsonFromText = async () => {
    if (!textCommand.trim()) {
      setGenerationCustomJsonFromTextError("Text command cannot be empty.");
      return;
    }
    setIsGeneratingCustomJsonFromText(true);
    setGenerationCustomJsonFromTextError(null);
    setGeneratedCustomJsonFromText("");
    try {
      const result = await generateCustomCommandJsonAction(textCommand);
      if (result.commandJson) {
        setGeneratedCustomJsonFromText(result.commandJson);
      } else {
        setGenerationCustomJsonFromTextError(result.error || "Failed to generate JSON.");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "An unexpected error occurred.";
      setGenerationCustomJsonFromTextError(message);
    } finally {
      setIsGeneratingCustomJsonFromText(false);
    }
  };

  const handleCopyToClipboard = async () => {
    const jsonToCopy = currentJsonInEditor();
    if (jsonToCopy) {
      try {
        await navigator.clipboard.writeText(jsonToCopy);
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
    }
  };

  const handleDownloadJson = () => {
    const jsonToDownload = currentJsonInEditor();
    const currentErr = currentError();
    if (jsonToDownload && !currentErr) {
      const blob = new Blob([jsonToDownload], { type: 'application/json;charset=utf-char8' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      let filename = "design_output.json";
      if (activeTab === "canvasJson") filename = "canvas_design.json";
      else if (activeTab === "generateCustomJsonFromCanvas") filename = "custom_from_canvas.json";
      else if (activeTab === "generateCustomJsonFromText") filename = "custom_from_text.json";
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
        description: currentErr || "No valid JSON to download.",
        variant: "destructive",
      });
    }
  };
  
  const isLoading = isCanvasJsonLoading || isGeneratingCustomJsonFromText || isCustomJsonFromCanvasLoading;
  const canPerformCopyDownloadActionsValue = !isLoading && !!currentJsonInEditor() && !currentError();
  const canSaveChangesValue = activeTab === 'canvasJson' && !isCanvasJsonLoading && !!canvasJsonString && !syntaxError && validationErrors.length === 0;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-headline">View / Generate JSON</DialogTitle>
          <DialogDescription>
            View or edit the canvas design JSON, or generate custom JSON using different methods.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ActiveTab)} className="flex-grow flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-3 mb-2 h-auto">
            <TabsTrigger value="canvasJson" className="text-xs px-1 py-1.5"><FileJson className="mr-1.5"/>Canvas JSON</TabsTrigger>
            <TabsTrigger value="generateCustomJsonFromCanvas" className="text-xs px-1 py-1.5"><Wand2 className="mr-1.5"/>Custom from Canvas</TabsTrigger>
            <TabsTrigger value="generateCustomJsonFromText" className="text-xs px-1 py-1.5"><Wand2 className="mr-1.5"/>Custom from Text</TabsTrigger>
          </TabsList>

          {/* Tab: Design Canvas JSON */}
          <TabsContent value="canvasJson" className="flex-grow flex flex-col space-y-2 min-h-0">
            <Label htmlFor="canvasJsonEditor" className="text-sm font-medium">Canvas Design (Editable)</Label>
            <div className="flex-grow rounded-md border bg-muted/30 overflow-hidden min-h-[200px] relative">
              {isCanvasJsonLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="ml-2">Loading Canvas JSON...</span>
                </div>
              ) : (
                <CodeMirror
                  value={canvasJsonString}
                  height="100%"
                  extensions={[jsonLang()]}
                  theme={resolvedTheme === 'dark' ? githubDark : githubLight}
                  onChange={handleCanvasJsonChange}
                  className="text-sm h-full"
                  basicSetup={{ lineNumbers: true, foldGutter: true, highlightActiveLine: true, highlightActiveLineGutter: true }}
                  id="canvasJsonEditor"
                />
              )}
            </div>
            {canvasJsonError && <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{canvasJsonError}</AlertDescription></Alert>}
            {syntaxError && <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertTitle>Syntax Error</AlertTitle><AlertDescription>{syntaxError}</AlertDescription></Alert>}
            {validationErrors.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Validation Errors</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc list-inside text-xs">
                    {validationErrors.map((err, i) => <li key={i}>{err}</li>)}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
             <Button onClick={handleSaveChangesToCanvas} disabled={!canSaveChangesValue} className="w-full sm:w-auto mt-2">
                <Save className="mr-2" /> Save Changes to Canvas
            </Button>
          </TabsContent>

          {/* Tab: Generate Custom JSON from Canvas */}
          <TabsContent value="generateCustomJsonFromCanvas" className="flex-grow flex flex-col space-y-2 min-h-0">
            <div className="flex justify-between items-center">
              <Label htmlFor="customJsonFromCanvasEditor" className="text-sm font-medium">Custom Command JSON (from Canvas)</Label>
              <Button onClick={handleGenerateCustomJsonFromCanvas} variant="outline" size="sm" disabled={isCustomJsonFromCanvasLoading}>
                {isCustomJsonFromCanvasLoading ? <Loader2 className="mr-1.5 animate-spin"/> : <Wand2 className="mr-1.5"/>} Regenerate
              </Button>
            </div>
            <div className="flex-grow rounded-md border bg-muted/30 overflow-hidden min-h-[200px] relative">
              {isCustomJsonFromCanvasLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="ml-2">Generating Custom JSON...</span>
                </div>
              ) : (
                <CodeMirror
                  value={customJsonFromCanvasString}
                  height="100%"
                  extensions={[jsonLang()]}
                  theme={resolvedTheme === 'dark' ? githubDark : githubLight}
                  readOnly={true} // Usually this output is not meant to be edited back to canvas
                  className="text-sm h-full"
                  basicSetup={{ lineNumbers: true, foldGutter: true, highlightActiveLine: true }}
                  id="customJsonFromCanvasEditor"
                />
              )}
            </div>
            {customJsonFromCanvasError && <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{customJsonFromCanvasError}</AlertDescription></Alert>}
             <Alert>
                <Info className="h-4 w-4"/>
                <AlertTitle>Note</AlertTitle>
                <AlertDescription>This JSON is generated for use with server-driven UI systems expecting the custom command format. It's read-only here.</AlertDescription>
            </Alert>
          </TabsContent>

          {/* Tab: Generate Custom JSON from Text Command */}
          <TabsContent value="generateCustomJsonFromText" className="flex-grow flex flex-col space-y-2 min-h-0">
            <Label htmlFor="textCommandInput" className="text-sm font-medium">Jetpack Compose-like Text Commands</Label>
            <Textarea
              id="textCommandInput"
              value={textCommand}
              onChange={(e) => setTextCommand(e.target.value)}
              placeholder="e.g., Card with fillMaxWidth { Text('Hello') }"
              className="min-h-[100px] text-sm"
            />
            <Button onClick={handleGenerateCustomJsonFromText} disabled={isGeneratingCustomJsonFromText} className="w-full">
              {isGeneratingCustomJsonFromText ? <Loader2 className="mr-2 animate-spin" /> : <Wand2 className="mr-2" />}
              Generate Custom JSON
            </Button>
            <Label htmlFor="generatedJsonFromTextEditor" className="text-sm font-medium pt-2">Generated Custom Command JSON</Label>
            <div className="flex-grow rounded-md border bg-muted/30 overflow-hidden min-h-[150px] relative">
              {isGeneratingCustomJsonFromText && !generatedCustomJsonFromText ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="ml-2">Generating...</span>
                </div>
              ) : (
                <CodeMirror
                  value={generatedCustomJsonFromText}
                  height="100%"
                  extensions={[jsonLang()]}
                  theme={resolvedTheme === 'dark' ? githubDark : githubLight}
                  readOnly={true}
                  className="text-sm h-full"
                  id="generatedJsonFromTextEditor"
                  basicSetup={{ lineNumbers: true, foldGutter: true, highlightActiveLine: true }}
                />
              )}
            </div>
            {generationCustomJsonFromTextError && <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{generationCustomJsonFromTextError}</AlertDescription></Alert>}
          </TabsContent>
        </Tabs>

        <DialogFooter className="sm:justify-end gap-2 mt-2">
          <Button onClick={handleCopyToClipboard} variant="outline" disabled={!canPerformCopyDownloadActionsValue}>
            <Copy className="mr-2" /> Copy JSON
          </Button>
          <Button onClick={handleDownloadJson} variant="outline" disabled={!canPerformCopyDownloadActionsValue}>
            <Download className="mr-2" /> Download .json
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

ViewJsonModal.displayName = 'ViewJsonModal';


    