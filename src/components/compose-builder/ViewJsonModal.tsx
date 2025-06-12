
'use client';

import React, { useState, useImperativeHandle, forwardRef, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from '@/components/ui/textarea';
import { useDesign } from '@/contexts/DesignContext';
import { getDesignComponentsAsJsonAction, generateJsonFromTextAction } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, RefreshCcw, Wand2, Copy, Download } from 'lucide-react';
import CodeMirror from '@uiw/react-codemirror';
import { json as jsonLang } from '@codemirror/lang-json';
import { githubLight, githubDark } from '@uiw/codemirror-theme-github';
import { useTheme } from '@/contexts/ThemeContext';
import { ModalJsonSchema, DEFAULT_ROOT_LAZY_COLUMN_ID, type DesignComponent } from '@/types/compose-spec';
import type { ZodError } from 'zod';

export interface ViewJsonModalRef {
  openModal: () => void;
}

type ActiveTab = "design-json" | "generate-command-json";

export const ViewJsonModal = forwardRef<ViewJsonModalRef, {}>((props, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("design-json");
  
  const { components, customComponentTemplates, overwriteComponents } = useDesign();
  const { toast } = useToast();
  const { resolvedTheme } = useTheme();

  // State for "Design Canvas JSON" tab
  const [designJsonString, setDesignJsonString] = useState<string>("");
  const [isFetchingDesignJson, setIsFetchingDesignJson] = useState(false);
  const [designJsonError, setDesignJsonError] = useState<string | null>(null);
  const [isSavingDesignJson, setIsSavingDesignJson] = useState(false);

  // State for "Generate from Text Command" tab
  const [jsonCommandInput, setJsonCommandInput] = useState<string>('');
  const [generatedCommandJsonOutput, setGeneratedCommandJsonOutput] = useState<string>('');
  const [isGeneratingCommandJson, setIsGeneratingCommandJson] = useState(false);
  const [commandJsonError, setCommandJsonError] = useState<string | null>(null);


  const handleFetchDesignJson = useCallback(async () => {
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
      const message = error instanceof Error ? error.message : "An unknown error occurred";
      setDesignJsonError(`Failed to fetch design JSON: ${message}`);
      setDesignJsonString("[]");
    } finally {
      setIsFetchingDesignJson(false);
    }
  }, [components, customComponentTemplates]);

  useEffect(() => {
    if (isOpen && activeTab === "design-json") {
      // Only fetch if components array actually has user components beyond the root
      const hasUserComponents = components.some(c => c.id !== DEFAULT_ROOT_LAZY_COLUMN_ID) || 
                                (components.find(c => c.id === DEFAULT_ROOT_LAZY_COLUMN_ID)?.properties.children?.length || 0) > 0;
      if (hasUserComponents) {
        handleFetchDesignJson();
      } else {
        setDesignJsonString("[]");
        setDesignJsonError("No user components on the canvas to display as JSON.");
        setIsFetchingDesignJson(false);
      }
    }
  }, [isOpen, activeTab, components, handleFetchDesignJson]);
  
  useImperativeHandle(ref, () => ({
    openModal: () => {
      setIsOpen(true);
      // Reset states for both tabs for a clean open
      setDesignJsonString("");
      setDesignJsonError(null);
      setIsFetchingDesignJson(false);
      setIsSavingDesignJson(false);

      setJsonCommandInput('');
      setGeneratedCommandJsonOutput('');
      setIsGeneratingCommandJson(false);
      setCommandJsonError(null);
      
      setActiveTab("design-json"); // Default to first tab
    }
  }));

  const handleDesignJsonChange = useCallback((value: string) => {
    setDesignJsonString(value);
    setDesignJsonError(null); // Clear previous errors on edit
  }, []);

  const validateAndApplyDesignJson = async () => {
    setIsSavingDesignJson(true);
    setDesignJsonError(null);
    try {
      const parsedJson = JSON.parse(designJsonString);
      const validationResult = ModalJsonSchema.safeParse(parsedJson);

      if (!validationResult.success) {
        const zodError = validationResult.error as ZodError;
        const errorMessages = zodError.errors.map(err => `Path: ${err.path.join('.')} - Message: ${err.message}`).join('\n');
        setDesignJsonError(`Invalid JSON structure:\n${errorMessages}`);
        toast({ title: "Validation Error", description: "JSON does not match the required schema. See errors in modal.", variant: "destructive" });
        return;
      }

      // Call overwriteComponents from DesignContext
      const overwriteResult = overwriteComponents(validationResult.data);
      if (overwriteResult.success) {
        toast({ title: "Canvas Updated", description: "Changes applied to the design canvas." });
        await handleFetchDesignJson(); // Refresh the JSON in the editor to reflect the (potentially cleaned) state
      } else {
        setDesignJsonError(overwriteResult.error || "Failed to update canvas with the provided JSON.");
        toast({ title: "Update Failed", description: overwriteResult.error || "Could not update canvas.", variant: "destructive" });
      }

    } catch (e) {
      const message = e instanceof Error ? e.message : "Invalid JSON syntax";
      setDesignJsonError(`JSON Syntax Error: ${message}`);
      toast({ title: "Syntax Error", description: "Invalid JSON syntax. Please correct it.", variant: "destructive" });
    } finally {
      setIsSavingDesignJson(false);
    }
  };


  const handleJsonCommandInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setJsonCommandInput(event.target.value);
    setCommandJsonError(null);
  };

  const handleGenerateCommandJson = async () => {
    if (!jsonCommandInput.trim()) {
      setCommandJsonError("Please enter some Jetpack Compose-like commands.");
      return;
    }
    setIsGeneratingCommandJson(true);
    setGeneratedCommandJsonOutput('');
    setCommandJsonError(null);
    try {
      const result = await generateJsonFromTextAction(jsonCommandInput);
      if (result.designJson) {
        setGeneratedCommandJsonOutput(result.designJson);
        toast({ title: "JSON Generated", description: "JSON successfully generated from your commands." });
      } else {
        setCommandJsonError(result.error || "Failed to generate JSON. AI returned an empty or invalid response.");
        toast({ title: "Generation Failed", description: result.error || "Unknown error from AI.", variant: "destructive" });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "An unknown error occurred.";
      setCommandJsonError(`Error: ${message}`);
      toast({ title: "Generation Error", description: message, variant: "destructive" });
    } finally {
      setIsGeneratingCommandJson(false);
    }
  };

  const handleCopyToClipboard = async (text: string, type: string) => {
    if (text) {
      try {
        await navigator.clipboard.writeText(text);
        toast({
          title: `${type} Copied!`,
          description: `${type} copied to clipboard.`,
        });
      } catch (err) {
        toast({
          title: "Copy Failed",
          description: `Could not copy ${type} to clipboard.`,
          variant: "destructive",
        });
      }
    }
  };

  const handleDownloadJson = (text: string, filename: string, type: string) => {
    if (text && !text.startsWith("Error:") && text !== "[]") {
      const blob = new Blob([text], { type: 'application/json;charset=utf-8' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      toast({
        title: `${type} Downloaded`,
        description: `${filename} has started downloading.`,
      });
    } else {
       toast({
        title: "Download Failed",
        description: `No valid ${type} to download.`,
        variant: "destructive",
      });
    }
  };
  
  const canSaveChanges = !isFetchingDesignJson && !isSavingDesignJson && designJsonString && designJsonString.trim() !== "[]";
  const canPerformCopyDownloadActions = (text: string) => text && text.trim() !== "[]" && !text.startsWith("Error:");


  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-headline">View/Generate JSON</DialogTitle>
          <DialogDescription>
            View and edit the design canvas JSON, or generate JSON from text commands.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ActiveTab)} className="flex-grow flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-2 h-auto mb-2">
            <TabsTrigger value="design-json" className="text-xs px-1 py-1.5">Design Canvas JSON</TabsTrigger>
            <TabsTrigger value="generate-command-json" className="text-xs px-1 py-1.5">Generate from Text Command</TabsTrigger>
          </TabsList>

          <TabsContent value="design-json" className="flex-grow flex flex-col min-h-0 space-y-3">
            <div className="flex-grow rounded-md border bg-muted/30 overflow-hidden min-h-[250px] relative">
              {isFetchingDesignJson ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span className="ml-2 text-sm">Loading Canvas JSON...</span>
                </div>
              ) : (
                <CodeMirror
                  value={designJsonString}
                  height="100%"
                  extensions={[jsonLang()]}
                  theme={resolvedTheme === 'dark' ? githubDark : githubLight}
                  onChange={handleDesignJsonChange}
                  className="text-sm h-full"
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
              )}
            </div>
            {designJsonError && (
                <pre className="text-xs text-destructive bg-destructive/10 p-2 rounded-md max-h-28 overflow-y-auto whitespace-pre-wrap">
                    {designJsonError}
                </pre>
            )}
            <div className="flex flex-col sm:flex-row justify-between gap-2 pt-1">
              <Button variant="outline" onClick={handleFetchDesignJson} disabled={isFetchingDesignJson || isSavingDesignJson} className="w-full sm:w-auto">
                {isFetchingDesignJson ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
                Refresh Canvas JSON
              </Button>
              <div className="flex gap-2 w-full sm:w-auto">
                 <Button onClick={() => handleCopyToClipboard(designJsonString, "Design JSON")} disabled={!canPerformCopyDownloadActions(designJsonString) || isSavingDesignJson} className="flex-1">
                    <Copy className="mr-2 h-4 w-4" /> Copy
                </Button>
                <Button onClick={() => handleDownloadJson(designJsonString, "design_canvas.json", "Design JSON")} disabled={!canPerformCopyDownloadActions(designJsonString) || isSavingDesignJson} className="flex-1">
                    <Download className="mr-2 h-4 w-4" /> Download
                </Button>
              </div>
            </div>
             <Button onClick={validateAndApplyDesignJson} disabled={!canSaveChanges || !!designJsonError} className="w-full">
                {isSavingDesignJson ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Changes to Canvas
            </Button>
          </TabsContent>
          
          <TabsContent value="generate-command-json" className="flex-grow flex flex-col min-h-0 space-y-3">
            <Textarea
              value={jsonCommandInput}
              onChange={handleJsonCommandInputChange}
              placeholder="Enter Jetpack Compose-like commands here... e.g., Column { Text(\"Hello\") Button(\"Click\") }"
              className="min-h-[100px] flex-shrink-0 text-sm font-code"
              rows={5}
            />
            <div className="flex-grow rounded-md border bg-muted/30 overflow-hidden min-h-[150px] relative">
               {isGeneratingCommandJson ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span className="ml-2 text-sm">Generating JSON...</span>
                </div>
              ) : generatedCommandJsonOutput ? (
                 <CodeMirror
                    value={generatedCommandJsonOutput}
                    height="100%"
                    extensions={[jsonLang()]}
                    theme={resolvedTheme === 'dark' ? githubDark : githubLight}
                    readOnly={true}
                    className="text-sm h-full"
                    basicSetup={{ lineNumbers: true, foldGutter: true, highlightActiveLine: true }}
                  />
              ) : (
                <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                  Generated JSON will appear here.
                </div>
              )}
            </div>
            {commandJsonError && (
                <pre className="text-xs text-destructive bg-destructive/10 p-2 rounded-md max-h-28 overflow-y-auto whitespace-pre-wrap">
                    {commandJsonError}
                </pre>
            )}
            <div className="flex flex-col sm:flex-row justify-between gap-2 pt-1">
                <Button onClick={handleGenerateCommandJson} disabled={isGeneratingCommandJson} className="w-full sm:w-auto">
                    {isGeneratingCommandJson ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                    Generate JSON from Commands
                </Button>
                 <div className="flex gap-2 w-full sm:w-auto">
                     <Button onClick={() => handleCopyToClipboard(generatedCommandJsonOutput, "Generated JSON")} disabled={!canPerformCopyDownloadActions(generatedCommandJsonOutput) || isGeneratingCommandJson} className="flex-1">
                        <Copy className="mr-2 h-4 w-4" /> Copy
                    </Button>
                    <Button onClick={() => handleDownloadJson(generatedCommandJsonOutput, "generated_commands.json", "Generated JSON")} disabled={!canPerformCopyDownloadActions(generatedCommandJsonOutput) || isGeneratingCommandJson} className="flex-1">
                        <Download className="mr-2 h-4 w-4" /> Download
                    </Button>
                </div>
            </div>
          </TabsContent>
        </Tabs>
        
        <DialogFooter className="mt-4 sm:justify-end">
          <Button variant="outline" onClick={() => setIsOpen(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

ViewJsonModal.displayName = 'ViewJsonModal';

