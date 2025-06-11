
'use client';

import React, { useState, useImperativeHandle, forwardRef, useEffect, useCallback, useRef } from 'react';
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
import type { DesignComponent } from '@/types/compose-spec'; // Ensure DesignComponent is imported

export interface ViewJsonModalRef {
  openModal: () => void;
}

const DESIGN_CANVAS_JSON_TAB = "design-canvas-json";
const GENERATE_COMMAND_JSON_TAB = "generate-command-json";

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
    setDesignJsonError(null); // Clear error on manual edit
  }, []);

  const handleGeneratedCommandJsonChange = useCallback((value: string) => {
    setGeneratedCommandJson(value);
  }, []);

  const handleCommandInputChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCommandInputText(event.target.value);
  }, []);

  const validateAndSetDesignJson = (jsonString: string): { success: boolean; error?: string; parsed?: DesignComponent[] } => {
    try {
      const parsedJson = JSON.parse(jsonString);
      // Basic validation: check if it's an array (as expected by `getDesignComponentsAsJsonAction` output)
      if (!Array.isArray(parsedJson)) {
        return { success: false, error: "Invalid JSON: Root must be an array of components." };
      }
      // Further validation against a Zod schema could be done here if `ModalJsonSchema` was more specific
      // For now, we assume `overwriteComponents` will handle detailed structural validation.
      return { success: true, parsed: parsedJson };
    } catch (e) {
      const error = e instanceof Error ? e.message : "Invalid JSON format.";
      return { success: false, error };
    }
  };

  const handleFetchDesignJson = useCallback(async () => {
    if (!isOpen || activeTab !== DESIGN_CANVAS_JSON_TAB) return;
    setIsFetchingDesignJson(true);
    setDesignJsonError(null);
    try {
      const jsonStr = await getDesignComponentsAsJsonAction(components, customComponentTemplates);
      if (jsonStr.startsWith("Error:")) {
        setDesignJsonError(jsonStr);
        setDesignJsonString("[]");
      } else {
        setDesignJsonString(jsonStr);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch design JSON.";
      setDesignJsonError(message);
      setDesignJsonString("[]");
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setIsFetchingDesignJson(false);
    }
  }, [isOpen, activeTab, components, customComponentTemplates, toast]);

  useEffect(() => {
    if (isOpen && activeTab === DESIGN_CANVAS_JSON_TAB) {
      handleFetchDesignJson();
    }
  }, [isOpen, activeTab, components, customComponentTemplates, handleFetchDesignJson]);


  useImperativeHandle(ref, () => ({
    openModal: () => {
      setIsOpen(true);
      // Reset states for Generate Command JSON tab if it's the one about to be shown or was last active
      // Or always reset them if preferred
      setCommandInputText('');
      setGeneratedCommandJson("{\n  \n}");
      setCommandGenerationError(null);

      // Fetch design JSON if the design canvas tab will be active
      // The useEffect above will also trigger this if conditions are met.
      // setActiveTab is async, so we check the current value of activeTab or a default.
      if (activeTab === DESIGN_CANVAS_JSON_TAB) {
         handleFetchDesignJson();
      }
    }
  }), [handleFetchDesignJson, activeTab]);


  const handleSaveChanges = async () => {
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
        // setIsOpen(false); // Optionally close modal on success
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
  };

  const handleGenerateCommandJson = async () => {
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
  };

  const handleCopyToClipboard = async () => {
    const contentToCopy = activeTab === DESIGN_CANVAS_JSON_TAB ? designJsonString : generatedCommandJson;
    if (contentToCopy) {
      try {
        await navigator.clipboard.writeText(contentToCopy);
        toast({ title: "JSON Copied!", description: "Content copied to clipboard." });
      } catch (err) {
        toast({ title: "Copy Failed", description: "Could not copy to clipboard.", variant: "destructive" });
      }
    }
  };

  const handleDownloadJson = () => {
    const contentToDownload = activeTab === DESIGN_CANVAS_JSON_TAB ? designJsonString : generatedCommandJson;
    const filename = activeTab === DESIGN_CANVAS_JSON_TAB ? "design_canvas.json" : "command_ui.json";

    if (contentToDownload && (contentToDownload !== "[]" || activeTab === GENERATE_COMMAND_JSON_TAB && contentToDownload !== "{\n  \n}")) {
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
  };

  const isLoading = isFetchingDesignJson || isSavingDesignJson || isGeneratingCommandJson;
  const canSaveChanges = activeTab === DESIGN_CANVAS_JSON_TAB && !isLoading && !designJsonError && designJsonString !== "[]";
  const canPerformActions = !isLoading && ((activeTab === DESIGN_CANVAS_JSON_TAB && designJsonString && designJsonString !== "[]") || (activeTab === GENERATE_COMMAND_JSON_TAB && generatedCommandJson && generatedCommandJson !== "{\n  \n}"));

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
            {designJsonError && <p className="text-sm text-destructive mb-2 p-2 bg-destructive/10 rounded-md">{designJsonError}</p>}
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
            {commandGenerationError && <p className="text-sm text-destructive p-2 bg-destructive/10 rounded-md">{commandGenerationError}</p>}
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
              <Button variant="outline" onClick={handleFetchDesignJson} disabled={isLoading}>
                <RefreshCcw className="mr-2 h-4 w-4" /> Refresh Canvas JSON
              </Button>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button onClick={handleCopyToClipboard} disabled={!canPerformActions} variant="outline">
              <Copy className="mr-2 h-4 w-4" /> Copy JSON
            </Button>
            <Button onClick={handleDownloadJson} disabled={!canPerformActions} variant="outline">
              <Download className="mr-2 h-4 w-4" /> Download .json
            </Button>
            {activeTab === DESIGN_CANVAS_JSON_TAB && (
              <Button onClick={handleSaveChanges} disabled={!canSaveChanges || isSavingDesignJson}>
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

    