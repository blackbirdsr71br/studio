
'use client';

import React, { useState, useImperativeHandle, forwardRef, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useDesign } from '@/contexts/DesignContext';
import { getDesignComponentsAsJsonAction, generateCustomCommandJsonAction } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Copy, Download, Save, RefreshCcw, Wand2 } from 'lucide-react';
import CodeMirror from '@uiw/react-codemirror';
import { json as jsonLang } from '@codemirror/lang-json';
import { githubLight, githubDark } from '@uiw/codemirror-theme-github';
import { useTheme } from '@/contexts/ThemeContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import type { DesignComponent } from '@/types/compose-spec';
import { ModalJsonSchema, DEFAULT_ROOT_LAZY_COLUMN_ID } from '@/types/compose-spec';

export interface ViewJsonModalRef {
  openModal: () => void;
}

const DESIGN_CANVAS_JSON_TAB = "design-canvas-json";
const GENERATE_COMMAND_JSON_TAB = "generate-command-json";

// Helper function to validate and parse the JSON string from the Design Canvas JSON tab
const validateAndSetDesignJson = (jsonString: string): { success: boolean; error?: string; parsed?: DesignComponent[] } => {
  try {
    const parsedJson = JSON.parse(jsonString);
    const validation = ModalJsonSchema.safeParse(parsedJson);
    if (!validation.success) {
      const formattedError = validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('\n');
      return { success: false, error: `JSON Schema Validation Failed:\n${formattedError}` };
    }
    return { success: true, parsed: validation.data as DesignComponent[] };
  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : "Invalid JSON format.";
    return { success: false, error: errorMsg };
  }
};

export const ViewJsonModal = forwardRef<ViewJsonModalRef, {}>((props, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const { components, customComponentTemplates, overwriteComponents } = useDesign();
  const { toast } = useToast();
  const { resolvedTheme } = useTheme();

  const [activeTab, setActiveTab] = useState(DESIGN_CANVAS_JSON_TAB);

  // State for Design Canvas JSON Tab
  const [designJsonString, setDesignJsonString] = useState<string>("[]");
  const [isFetchingDesignJson, setIsFetchingDesignJson] = useState(false);
  const [designJsonError, setDesignJsonError] = useState<string | null>(null);
  const [isSavingDesignJson, setIsSavingDesignJson] = useState(false);

  // State for Generate Command JSON Tab
  const [commandInputText, setCommandInputText] = useState<string>('');
  const [generatedCommandJson, setGeneratedCommandJson] = useState<string>("{\n  \n}");
  const [isGeneratingCommandJson, setIsGeneratingCommandJson] = useState(false);
  const [commandGenerationError, setCommandGenerationError] = useState<string | null>(null);

  const handleDesignJsonChange = useCallback((value: string) => {
    setDesignJsonString(value);
    setDesignJsonError(null);
  }, []);

  const handleGeneratedCommandJsonChange = useCallback((value: string) => {
    setGeneratedCommandJson(value);
  }, []);

  const handleCommandInputChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCommandInputText(event.target.value);
  }, []);

  const handleFetchDesignJson = useCallback(async () => {
    setIsFetchingDesignJson(true);
    setDesignJsonError(null);
    try {
      const jsonStr = await getDesignComponentsAsJsonAction(components, customComponentTemplates);
      if (jsonStr.startsWith("Error:")) {
        setDesignJsonError(jsonStr);
        setDesignJsonString("[]");
        toast({ title: "Error Fetching JSON", description: jsonStr, variant: "destructive" });
      } else {
        const validationResult = validateAndSetDesignJson(jsonStr);
        if (validationResult.success) {
            setDesignJsonString(jsonStr);
        } else {
            setDesignJsonError(validationResult.error || "Fetched JSON is invalid.");
            setDesignJsonString("[]");
            toast({ title: "Validation Error", description: validationResult.error || "Fetched JSON is invalid.", variant: "destructive" });
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch design JSON.";
      setDesignJsonError(message);
      setDesignJsonString("[]");
      toast({ title: "Error Fetching JSON", description: message, variant: "destructive" });
    } finally {
      setIsFetchingDesignJson(false);
    }
  }, [components, customComponentTemplates, toast]);

  const handleSaveChanges = useCallback(async () => {
    if (activeTab !== DESIGN_CANVAS_JSON_TAB) return;

    const validationResult = validateAndSetDesignJson(designJsonString);
    if (!validationResult.success || !validationResult.parsed) {
      setDesignJsonError(validationResult.error || "Invalid JSON structure.");
      toast({ title: "Validation Error", description: validationResult.error || "Invalid JSON structure.", variant: "destructive" });
      return;
    }
    setDesignJsonError(null);
    setIsSavingDesignJson(true);
    try {
      const result = overwriteComponents(validationResult.parsed);
      if (result.success) {
        toast({ title: "Changes Saved", description: "Design updated successfully from JSON." });
      } else {
        setDesignJsonError(result.error || "Failed to apply JSON to canvas.");
        toast({ title: "Save Error", description: result.error || "Failed to apply JSON to canvas.", variant: "destructive" });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "An unknown error occurred while saving.";
      setDesignJsonError(message);
      toast({ title: "Save Error", description: message, variant: "destructive" });
    } finally {
      setIsSavingDesignJson(false);
    }
  }, [activeTab, designJsonString, overwriteComponents, toast]);

  const handleGenerateCommandJson = useCallback(async () => {
    if (!commandInputText.trim()) {
      setCommandGenerationError("Please enter some Jetpack Compose-like commands.");
      return;
    }
    setIsGeneratingCommandJson(true);
    setCommandGenerationError(null);
    setGeneratedCommandJson("{\n  \n}");
    try {
      const result = await generateCustomCommandJsonAction(commandInputText);
      if (result.commandJson) {
        setGeneratedCommandJson(result.commandJson);
      } else {
        setCommandGenerationError(result.error || "AI failed to generate JSON for the commands.");
        toast({ title: "Generation Failed", description: result.error || "AI failed to generate JSON.", variant: "destructive" });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "An unknown error occurred.";
      setCommandGenerationError(message);
      toast({ title: "Generation Error", description: message, variant: "destructive" });
    } finally {
      setIsGeneratingCommandJson(false);
    }
  }, [commandInputText, toast]);

  const handleCopyToClipboard = useCallback(async () => {
    const contentToCopy = activeTab === DESIGN_CANVAS_JSON_TAB ? designJsonString : generatedCommandJson;
    if (contentToCopy) {
      try {
        await navigator.clipboard.writeText(contentToCopy);
        toast({ title: "JSON Copied!", description: "Content copied to clipboard." });
      } catch (err) {
        toast({ title: "Copy Failed", description: "Could not copy to clipboard.", variant: "destructive" });
      }
    }
  }, [activeTab, designJsonString, generatedCommandJson, toast]);

  const handleDownloadJson = useCallback(() => {
    const contentToDownload = activeTab === DESIGN_CANVAS_JSON_TAB ? designJsonString : generatedCommandJson;
    const filename = activeTab === DESIGN_CANVAS_JSON_TAB ? "design_canvas.json" : "command_ui.json";

    if (contentToDownload && (contentToDownload !== "[]" || (activeTab === GENERATE_COMMAND_JSON_TAB && contentToDownload !== "{\n  \n}"))) {
      const blob = new Blob([contentToDownload], { type: 'application/json;charset=utf-8' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      toast({ title: "JSON Downloaded", description: `${filename} has started downloading.` });
    } else {
      toast({ title: "Download Failed", description: "No valid JSON content to download.", variant: "destructive" });
    }
  }, [activeTab, designJsonString, generatedCommandJson, toast]);

  useEffect(() => {
    if (isOpen && activeTab === DESIGN_CANVAS_JSON_TAB) {
      handleFetchDesignJson();
    }
  }, [isOpen, activeTab, handleFetchDesignJson]);

  useImperativeHandle(ref, () => ({
    openModal: () => {
      setIsOpen(true);
      setActiveTab(DESIGN_CANVAS_JSON_TAB);
      setCommandInputText('');
      setGeneratedCommandJson("{\n  \n}");
      setCommandGenerationError(null);
    }
  }), []);

  const isLoading = isFetchingDesignJson || isSavingDesignJson || isGeneratingCommandJson;
  const hasUserComponents = components.some(c => c.id !== DEFAULT_ROOT_LAZY_COLUMN_ID) ||
                           (components.find(c => c.id === DEFAULT_ROOT_LAZY_COLUMN_ID)?.properties.children?.length || 0) > 0;

  const canSaveChanges = activeTab === DESIGN_CANVAS_JSON_TAB && !isLoading && !designJsonError && designJsonString !== "[]" && hasUserComponents;

  const canPerformCopyDownloadActions = !isLoading && (
    (activeTab === DESIGN_CANVAS_JSON_TAB && designJsonString && designJsonString !== "[]" && hasUserComponents) ||
    (activeTab === GENERATE_COMMAND_JSON_TAB && generatedCommandJson && generatedCommandJson !== "{\n  \n}")
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-headline">View/Generate JSON</DialogTitle>
          <DialogDescription>
            {activeTab === DESIGN_CANVAS_JSON_TAB
              ? "View or edit the JSON representation of your current design. Changes can be saved back to the canvas."
              : "Input Jetpack Compose-like commands to generate a custom JSON structure."
            }
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-grow flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-2 mb-2 h-auto">
            <TabsTrigger value={DESIGN_CANVAS_JSON_TAB} className="text-xs px-1 py-1.5">Design Canvas JSON</TabsTrigger>
            <TabsTrigger value={GENERATE_COMMAND_JSON_TAB} className="text-xs px-1 py-1.5">Generate Command JSON</TabsTrigger>
          </TabsList>

          <TabsContent value={DESIGN_CANVAS_JSON_TAB} className="flex-grow flex flex-col min-h-0">
            {designJsonError && <p className="text-sm text-destructive mb-2 p-2 bg-destructive/10 rounded-md whitespace-pre-wrap">{designJsonError}</p>}
            <div className="flex-grow my-1 rounded-md border bg-muted/30 overflow-hidden min-h-[200px] relative">
              {isFetchingDesignJson ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="ml-2">Loading JSON...</span>
                </div>
              ) : (
                <CodeMirror
                  value={designJsonString}
                  height="100%"
                  extensions={[jsonLang()]}
                  theme={resolvedTheme === 'dark' ? githubDark : githubLight}
                  onChange={handleDesignJsonChange}
                  className="text-sm h-full"
                  basicSetup={{ lineNumbers: true, foldGutter: true, autocompletion: true, highlightActiveLine: true, highlightActiveLineGutter: true, bracketMatching: true, closeBrackets: true }}
                />
              )}
            </div>
          </TabsContent>

          <TabsContent value={GENERATE_COMMAND_JSON_TAB} className="flex-grow flex flex-col min-h-0 space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="commandInput" className="text-xs">Jetpack Compose-like Commands</Label>
              <Textarea
                id="commandInput"
                value={commandInputText}
                onChange={handleCommandInputChange}
                placeholder="e.g., Card(modifier = Modifier.fillMaxWidth().padding(16.dp)) { Text(\"Hello\") }"
                className="text-sm min-h-[100px] max-h-[200px] font-code"
                rows={5}
              />
            </div>
            <Button onClick={handleGenerateCommandJson} disabled={isGeneratingCommandJson || !commandInputText.trim()} size="sm" className="w-full sm:w-auto self-start">
              {isGeneratingCommandJson ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
              Generate Custom JSON
            </Button>
            {commandGenerationError && <p className="text-sm text-destructive p-2 bg-destructive/10 rounded-md whitespace-pre-wrap">{commandGenerationError}</p>}
            <div className="flex-grow my-1 rounded-md border bg-muted/30 overflow-hidden min-h-[150px] relative">
              {isGeneratingCommandJson && generatedCommandJson === "{\n  \n}" ? (
                 <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="ml-2">Generating...</span>
                </div>
              ) : (
                <CodeMirror
                  value={generatedCommandJson}
                  height="100%"
                  extensions={[jsonLang()]}
                  theme={resolvedTheme === 'dark' ? githubDark : githubLight}
                  onChange={handleGeneratedCommandJsonChange}
                  className="text-sm h-full"
                  basicSetup={{ lineNumbers: true, foldGutter: true, autocompletion: true, highlightActiveLine: true, highlightActiveLineGutter: true, bracketMatching: true, closeBrackets: true }}
                />
              )}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="sm:justify-between flex-wrap gap-2 pt-4">
          <div className="flex gap-2">
            {activeTab === DESIGN_CANVAS_JSON_TAB && (
              <Button variant="outline" onClick={handleFetchDesignJson} disabled={isLoading || !hasUserComponents}>
                <RefreshCcw className="mr-2 h-4 w-4" /> Refresh Canvas JSON
              </Button>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button onClick={handleCopyToClipboard} disabled={!canPerformCopyDownloadActions} variant="outline">
              <Copy className="mr-2 h-4 w-4" /> Copy JSON
            </Button>
            <Button onClick={handleDownloadJson} disabled={!canPerformCopyDownloadActions} variant="outline">
              <Download className="mr-2 h-4 w-4" /> Download .json
            </Button>
            {activeTab === DESIGN_CANVAS_JSON_TAB && (
              <Button onClick={handleSaveChanges} disabled={!canSaveChanges}>
                {isSavingDesignJson ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Changes to Canvas
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

ViewJsonModal.displayName = 'ViewJsonModal';
