
'use client';

import React, { useState, useImperativeHandle, forwardRef, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useDesign } from '@/contexts/DesignContext';
import { getDesignComponentsAsJsonAction, generateJsonFromTextAction } from '@/app/actions';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Copy, Download, Save, RefreshCw, AlertTriangle, Wand2 } from 'lucide-react';
import CodeMirror from '@uiw/react-codemirror';
import { json as jsonLang } from '@codemirror/lang-json';
import { githubLight, githubDark } from '@uiw/codemirror-theme-github';
import { ModalJsonSchema, DEFAULT_ROOT_LAZY_COLUMN_ID } from '@/types/compose-spec';
import { useTheme } from '@/contexts/ThemeContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export interface ViewJsonModalRef {
  openModal: () => void;
}

const INITIAL_TEXT_COMMANDS_PLACEHOLDER = `
// Type Jetpack Compose-like commands here...
// Example:
Column(modifier = Modifier.padding(16.dp).fillMaxWidth()) {
    Text("Welcome!", fontSize = 24.sp)
    Button(text = "Get Started")
}
Card(elevation = 4.dp) {
    Image(src = "https://placehold.co/200x100.png", contentDescription = "Placeholder")
}
`.trim();

export const ViewJsonModal = forwardRef<ViewJsonModalRef, {}>((props, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"editJson" | "generateJson">("editJson");

  // State for "Edit Design JSON" tab
  const [editableJsonString, setEditableJsonString] = useState<string>("");
  const [editJsonError, setEditJsonError] = useState<string | string[] | null>(null);
  const [isLoadingJson, setIsLoadingJson] = useState(false);

  // State for "Generate from Text" tab
  const [textCommandsInput, setTextCommandsInput] = useState<string>(INITIAL_TEXT_COMMANDS_PLACEHOLDER);
  const [generatedJsonOutputString, setGeneratedJsonOutputString] = useState<string>("{\n  \"message\": \"Generated JSON will appear here after you provide commands and click Generate.\"\n}");
  const [generateJsonError, setGenerateJsonError] = useState<string | null>(null);
  const [isGeneratingFromText, setIsGeneratingFromText] = useState(false);

  const { components, customComponentTemplates, overwriteComponents } = useDesign();
  const { toast } = useToast();
  const { resolvedTheme } = useTheme();

  const validateAndSetEditableJson = useCallback((jsonStr: string) => {
    setEditableJsonString(jsonStr);
    try {
      const parsedJson = JSON.parse(jsonStr);
      const validationResult = ModalJsonSchema.safeParse(parsedJson);
      if (!validationResult.success) {
        const individualErrors = validationResult.error.errors.map(
          (err) => `Path "${err.path.join('.')}": ${err.message}`
        );
        setEditJsonError(['Schema validation failed:', ...individualErrors]);
      } else {
        setEditJsonError(null);
      }
    } catch (error) {
      if (error instanceof Error) {
        setEditJsonError(`Syntax error: ${error.message}`);
      } else {
        setEditJsonError("Invalid JSON syntax. Check for missing commas, brackets, etc.");
      }
    }
  }, []);
  
  const validateAndSetGeneratedJson = useCallback((jsonStr: string) => {
    setGeneratedJsonOutputString(jsonStr);
    // For generated JSON, we might be less strict or only show syntax errors initially,
    // schema validation will happen more explicitly on "Save Changes".
    try {
      JSON.parse(jsonStr);
      setGenerateJsonError(null); // Clear syntax error if parsable
    } catch (error) {
      if (error instanceof Error) {
        setGenerateJsonError(`Syntax error in generated JSON: ${error.message}`);
      } else {
        setGenerateJsonError("Invalid JSON syntax in generated output.");
      }
    }
  }, []);


  const handleFetchJsonForEditing = useCallback(async () => {
    setIsLoadingJson(true);
    setEditJsonError(null);
    try {
      const rootLazyColumn = components.find(c => c.id === DEFAULT_ROOT_LAZY_COLUMN_ID);
      if (components.length <= 1 && rootLazyColumn && (!rootLazyColumn.properties.children || rootLazyColumn.properties.children.length === 0)) {
        validateAndSetEditableJson("[]");
      } else {
        const jsonString = await getDesignComponentsAsJsonAction(components, customComponentTemplates);
        validateAndSetEditableJson(jsonString);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch JSON.";
      setEditableJsonString(`// Error fetching JSON:\n// ${errorMessage}`);
      setEditJsonError(`Fetch error: ${errorMessage}`);
      toast({
        title: "JSON Fetch Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoadingJson(false);
    }
  }, [components, customComponentTemplates, toast, validateAndSetEditableJson]);

  useImperativeHandle(ref, () => ({
    openModal: () => {
      setIsOpen(true);
      if (activeTab === "editJson") {
        handleFetchJsonForEditing();
      }
      // Reset generate tab states if needed, or leave as is
      // setTextCommandsInput(INITIAL_TEXT_COMMANDS_PLACEHOLDER);
      // setGeneratedJsonOutputString("{\n  \"message\": \"Generated JSON will appear here...\"\n}");
      // setGenerateJsonError(null);
    }
  }));
  
  const handleTabChange = (value: string) => {
    const newTab = value as "editJson" | "generateJson";
    setActiveTab(newTab);
    if (newTab === "editJson" && !editableJsonString && !isLoadingJson) { // Fetch if opening and empty
        handleFetchJsonForEditing();
    }
  };


  const handleGenerateJsonFromText = async () => {
    if (!textCommandsInput.trim()) {
      toast({ title: "Input Required", description: "Please enter some text commands to generate JSON.", variant: "default" });
      return;
    }
    setIsGeneratingFromText(true);
    setGenerateJsonError(null);
    try {
      const result = await generateJsonFromTextAction(textCommandsInput);
      if (result.designJson) {
        validateAndSetGeneratedJson(result.designJson);
        toast({ title: "JSON Generated", description: "JSON successfully generated from text commands." });
      } else {
        setGenerateJsonError(result.error || "Unknown error during generation.");
        toast({ title: "Generation Failed", description: result.error || "Could not generate JSON.", variant: "destructive" });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "An unexpected error occurred.";
      setGenerateJsonError(message);
      toast({ title: "Generation Error", description: message, variant: "destructive" });
    } finally {
      setIsGeneratingFromText(false);
    }
  };

  const handleSaveChanges = () => {
    const jsonToSave = activeTab === "editJson" ? editableJsonString : generatedJsonOutputString;
    let currentErrorStateSetter = activeTab === "editJson" ? setEditJsonError : setGenerateJsonError;
    
    if (activeTab === "editJson" && editJsonError) {
         const errorSummary = Array.isArray(editJsonError) ? editJsonError.slice(0,5).join("\n") : "JSON is invalid.";
         toast({ title: "Save Failed", description: `${errorSummary} Please correct errors.`, variant: "destructive" });
         return;
    }
    // For generated JSON, we perform schema validation here before saving
    if (activeTab === "generateJson") {
        try {
            const parsedForValidation = JSON.parse(jsonToSave);
            const validationCheck = ModalJsonSchema.safeParse(parsedForValidation);
            if (!validationCheck.success) {
                const individualErrors = validationCheck.error.errors.map(
                  (err) => `Path "${err.path.join('.')}": ${err.message}`
                );
                setGenerateJsonError(['Generated JSON schema validation failed:', ...individualErrors]);
                toast({ title: "Save Failed", description: `Generated JSON is invalid: ${individualErrors.slice(0,2).join(', ')}...`, variant: "destructive" });
                return;
            }
            // if it passes, clear any previous schema error from this tab
            setGenerateJsonError(null);
        } catch (parseError) { // Syntax error on generated JSON (should have been caught by validateAndSetGeneratedJson)
             if (parseError instanceof Error) {
                setGenerateJsonError(`Syntax error in generated JSON: ${parseError.message}`);
             } else {
                setGenerateJsonError("Invalid JSON syntax in generated output.");
             }
             toast({ title: "Save Failed", description: "Generated JSON has syntax errors.", variant: "destructive" });
             return;
        }
    }


    try {
      const parsedComponents = JSON.parse(jsonToSave);
      // Schema already validated for 'editJson' by validateAndSetEditableJson
      // And explicitly validated for 'generateJson' just above

      const result = overwriteComponents(parsedComponents); // ModalJsonSchema.parse(parsedComponents) would re-validate
      if (result.success) {
        toast({ title: "Changes Saved", description: "Design updated from JSON successfully." });
        setIsOpen(false);
      } else {
        currentErrorStateSetter(result.error || "Could not apply JSON changes.");
        toast({ title: "Save Failed", description: result.error || "Could not apply JSON changes.", variant: "destructive" });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "An error occurred while saving.";
      currentErrorStateSetter(message);
      toast({ title: "Save Failed", description: message, variant: "destructive" });
    }
  };

  const handleCopyToClipboard = async () => {
    const jsonToCopy = activeTab === "editJson" ? editableJsonString : generatedJsonOutputString;
    const errorState = activeTab === "editJson" ? editJsonError : generateJsonError;
    if (errorState && !(Array.isArray(errorState) && errorState[0].startsWith("Generated JSON schema validation failed"))) { // Allow copy if only schema validation failed for generated
        toast({ title: "Copy Failed", description: "JSON contains errors. Please correct them before copying.", variant: "destructive" });
        return;
    }
    try {
      await navigator.clipboard.writeText(jsonToCopy);
      toast({ title: "JSON Copied!", description: "JSON copied to clipboard." });
    } catch (err) {
      toast({ title: "Copy Failed", description: "Could not copy JSON to clipboard.", variant: "destructive" });
    }
  };

  const handleDownloadJson = () => {
    const jsonToDownload = activeTab === "editJson" ? editableJsonString : generatedJsonOutputString;
    const errorState = activeTab === "editJson" ? editJsonError : generateJsonError;
     if (errorState && !(Array.isArray(errorState) && errorState[0].startsWith("Generated JSON schema validation failed"))) {
        toast({ title: "Download Failed", description: "JSON contains errors. Please correct them before downloading.", variant: "destructive" });
        return;
    }
    const blob = new Blob([jsonToDownload], { type: 'application/json;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = activeTab === "editJson" ? 'design_components.json' : 'generated_design.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
    toast({ title: "JSON Downloaded", description: `${link.download} has started downloading.` });
  };
  
  const currentActiveError = activeTab === 'editJson' ? editJsonError : generateJsonError;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if(open && activeTab === "editJson") handleFetchJsonForEditing(); }}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-headline">Design JSON</DialogTitle>
           <DialogDescription>
            {activeTab === "editJson" 
              ? "View, edit, and save the JSON representation of your design components."
              : "Generate UI JSON from text commands. Edit and save the result."}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="flex-grow flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-2 mb-2">
            <TabsTrigger value="editJson">Edit Design JSON</TabsTrigger>
            <TabsTrigger value="generateJson">Generate from Text</TabsTrigger>
          </TabsList>

          <TabsContent value="editJson" className="flex-grow flex flex-col min-h-0 outline-none ring-0 focus-visible:ring-0">
            <div className="flex-grow rounded-md border overflow-auto bg-background min-h-[300px]">
              <CodeMirror
                value={editableJsonString}
                height="100%"
                className="text-xs h-full"
                extensions={[jsonLang()]}
                theme={resolvedTheme === 'dark' ? githubDark : githubLight}
                onChange={(value) => validateAndSetEditableJson(value)}
                editable={!isLoadingJson}
                basicSetup={{ lineNumbers: true, foldGutter: true, autocompletion: true, highlightActiveLine: true, highlightActiveLineGutter: true, bracketMatching: true, closeBrackets: true }}
              />
            </div>
          </TabsContent>

          <TabsContent value="generateJson" className="flex-grow flex flex-col min-h-0 space-y-2 outline-none ring-0 focus-visible:ring-0">
            <div className="space-y-1">
              <Label htmlFor="textCommandsInput" className="text-xs">Compose-like Text Commands</Label>
              <Textarea
                id="textCommandsInput"
                value={textCommandsInput}
                onChange={(e) => setTextCommandsInput(e.target.value)}
                placeholder={INITIAL_TEXT_COMMANDS_PLACEHOLDER}
                rows={6}
                className="text-xs font-code"
              />
            </div>
            <Button onClick={handleGenerateJsonFromText} disabled={isGeneratingFromText} size="sm" className="w-full sm:w-auto">
              {isGeneratingFromText ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
              Generate JSON from Commands
            </Button>
            <div className="space-y-1 flex-grow flex flex-col min-h-0">
              <Label className="text-xs">Generated JSON Output</Label>
              <div className="flex-grow rounded-md border overflow-auto bg-background min-h-[200px]">
                <CodeMirror
                  value={generatedJsonOutputString}
                  height="100%"
                  className="text-xs h-full"
                  extensions={[jsonLang()]}
                  theme={resolvedTheme === 'dark' ? githubDark : githubLight}
                  onChange={(value) => validateAndSetGeneratedJson(value)} // Allow editing generated JSON
                  editable={!isGeneratingFromText}
                  basicSetup={{ lineNumbers: true, foldGutter: true, autocompletion: true, highlightActiveLine: true, highlightActiveLineGutter: true, bracketMatching: true, closeBrackets: true }}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>
        
        {currentActiveError && (
            <ScrollArea className="mt-2 max-h-28 flex-shrink-0">
              <div className="p-3 text-xs text-destructive-foreground bg-destructive rounded-md">
                {Array.isArray(currentActiveError) ? (
                  <>
                    <div className="flex items-start gap-2 mb-1">
                      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                      <strong className="flex-1">{currentActiveError[0]}</strong>
                    </div>
                    <ul className="list-disc list-inside pl-5">
                      {currentActiveError.slice(1).map((err, index) => (
                        <li key={index} className="whitespace-pre-wrap leading-relaxed">{err}</li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span className="flex-1 whitespace-pre-wrap leading-relaxed">{currentActiveError}</span>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}

        <DialogFooter className="sm:justify-between flex-wrap gap-2 mt-3 pt-3 border-t">
          <div className="flex gap-2">
             <Button variant="outline" onClick={handleFetchJsonForEditing} disabled={isLoadingJson || activeTab !== "editJson"}>
                {isLoadingJson ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                Refresh
             </Button>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button onClick={handleCopyToClipboard} disabled={isLoadingJson || isGeneratingFromText}>
              <Copy className="mr-2 h-4 w-4" /> Copy
            </Button>
            <Button onClick={handleDownloadJson} disabled={isLoadingJson || isGeneratingFromText}>
              <Download className="mr-2 h-4 w-4" /> Download .json
            </Button>
            <Button onClick={handleSaveChanges} disabled={isLoadingJson || isGeneratingFromText}>
              <Save className="mr-2 h-4 w-4" /> Save Changes
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

ViewJsonModal.displayName = 'ViewJsonModal';
    
