
'use client';

import React, {
  useState,
  useImperativeHandle,
  forwardRef,
  useCallback,
  useEffect,
} from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useDesign } from '@/contexts/DesignContext';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Copy, Download, Save, Wand2, AlertTriangle, CheckCircle } from 'lucide-react';
import CodeMirror from '@uiw/react-codemirror';
import { json as jsonLang } from '@codemirror/lang-json';
import { githubLight, githubDark } from '@uiw/codemirror-theme-github';
import { useTheme } from '@/contexts/ThemeContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { getDesignComponentsAsJsonAction, generateJsonFromTextAction } from '@/app/actions';
import { ModalJsonSchema } from '@/types/compose-spec';
import type { ZodError } from 'zod';

export interface ViewJsonModalRef {
  openModal: (initialTab?: 'canvas' | 'command') => void;
}

export const ViewJsonModal = forwardRef<ViewJsonModalRef, {}>((props, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'canvas' | 'command'>('canvas');
  const { toast } = useToast();
  const { resolvedTheme } = useTheme();
  const { components, customComponentTemplates, overwriteComponents } = useDesign();

  // State for "Design Canvas JSON" tab
  const [designJsonString, setDesignJsonString] = useState<string>('');
  const [isFetchingDesignJson, setIsFetchingDesignJson] = useState(false);
  const [designJsonError, setDesignJsonError] = useState<string | null>(null);

  // State for "Generate from Text Command" tab
  const [textCommandInput, setTextCommandInput] = useState<string>('');
  const [generatedCommandJsonString, setGeneratedCommandJsonString] = useState<string>('');
  const [isGeneratingCommandJson, setIsGeneratingCommandJson] = useState(false);
  const [commandJsonError, setCommandJsonError] = useState<string | null>(null);

  const handleDesignJsonChange = useCallback((value: string) => {
    setDesignJsonString(value);
    setDesignJsonError(null); // Clear previous errors on edit
  }, [setDesignJsonString, setDesignJsonError]);

  const validateAndSetDesignJson = useCallback(() => {
    if (!designJsonString.trim()) {
      setDesignJsonError("JSON content cannot be empty.");
      return null;
    }
    try {
      const parsedJson = JSON.parse(designJsonString);
      const validationResult = ModalJsonSchema.safeParse(parsedJson);
      if (!validationResult.success) {
        const zodError = validationResult.error as ZodError;
        const errorMessages = zodError.errors.map(
          (err) => `${err.path.join('.')} : ${err.message}`
        );
        setDesignJsonError(`Schema Validation Failed:\n- ${errorMessages.join('\n- ')}`);
        return null;
      }
      setDesignJsonError(null); // Clear error on successful validation
      return validationResult.data;
    } catch (e) {
      setDesignJsonError(`Invalid JSON syntax: ${(e as Error).message}`);
      return null;
    }
  }, [designJsonString, setDesignJsonError]);

  const handleSaveChangesToCanvas = useCallback(async () => {
    const validatedData = validateAndSetDesignJson();
    if (validatedData) {
      const result = overwriteComponents(validatedData);
      if (result.success) {
        toast({
          title: 'Design Updated',
          description: 'Changes from JSON have been applied to the canvas.',
        });
        setIsOpen(false);
      } else {
        const errorMessage = result.error || "Failed to apply changes to canvas.";
        setDesignJsonError(errorMessage);
        toast({
          title: 'Update Failed',
          description: errorMessage,
          variant: 'destructive',
        });
      }
    } else {
      // designJsonError would have been set by validateAndSetDesignJson
      toast({
        title: 'Validation Error',
        description: designJsonError || 'Please fix the errors in the JSON before saving.',
        variant: 'destructive',
      });
    }
  }, [validateAndSetDesignJson, overwriteComponents, toast, setIsOpen, setDesignJsonError, designJsonError]);

  const handleTextCommandInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTextCommandInput(event.target.value);
  };

  const handleGenerateCommandJson = useCallback(async () => {
    if (!textCommandInput.trim()) {
      setCommandJsonError('Please enter some text commands to generate JSON.');
      return;
    }
    setIsGeneratingCommandJson(true);
    setGeneratedCommandJsonString('');
    setCommandJsonError(null);
    try {
      const result = await generateJsonFromTextAction(textCommandInput);
      if (result.designJson) {
         try {
          const parsed = JSON.parse(result.designJson);
          setGeneratedCommandJsonString(JSON.stringify(parsed, null, 2));
        } catch (parseError) {
          setGeneratedCommandJsonString(result.designJson); // Show raw if pretty print fails
          setCommandJsonError("AI returned content, but it could not be formatted as pretty JSON. Displaying raw version.");
          toast({ title: 'Formatting Issue', description: "AI content shown raw; could not pretty-print.", variant: 'default' });
        }
      } else {
        setCommandJsonError(result.error || 'Failed to generate JSON from commands.');
        toast({ title: 'JSON Generation Failed', description: result.error || "Unknown error during generation.", variant: 'destructive' });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unknown error occurred during AI JSON generation.';
      setCommandJsonError(message);
      toast({ title: 'Generation Error', description: message, variant: 'destructive' });
    } finally {
      setIsGeneratingCommandJson(false);
    }
  }, [textCommandInput, toast, setGeneratedCommandJsonString, setCommandJsonError, setIsGeneratingCommandJson]);

  const handleGeneratedCommandJsonChange = useCallback((value: string) => {
    setGeneratedCommandJsonString(value);
    setCommandJsonError(null);
  }, [setGeneratedCommandJsonString, setCommandJsonError]);

  const handleFetchDesignJson = useCallback(async () => {
    setIsFetchingDesignJson(true);
    setDesignJsonError(null);
    setDesignJsonString('');
    try {
      const result = await getDesignComponentsAsJsonAction(components, customComponentTemplates);
      if (result.startsWith("Error:")) {
        setDesignJsonError(result);
        setDesignJsonString("[]");
      } else {
         try {
            const parsed = JSON.parse(result);
            setDesignJsonString(JSON.stringify(parsed, null, 2));
          } catch (e) {
            setDesignJsonString(result);
            setDesignJsonError("Could not format the fetched JSON. Displaying raw version. It might contain errors.");
            toast({ title: 'Formatting Issue', description: "Fetched JSON shown raw; could not pretty-print.", variant: 'default' });
          }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch design JSON.';
      setDesignJsonError(message);
      setDesignJsonString("[]");
      toast({ title: 'Error Fetching Design', description: message, variant: 'destructive' });
    } finally {
      setIsFetchingDesignJson(false);
    }
  }, [components, customComponentTemplates, toast, setDesignJsonString, setDesignJsonError, setIsFetchingDesignJson]);

  useEffect(() => {
    if (isOpen && activeTab === 'canvas') {
      handleFetchDesignJson();
    }
  }, [isOpen, activeTab, handleFetchDesignJson]);

  useImperativeHandle(ref, () => ({
    openModal: (initialTab = 'canvas') => {
      setActiveTab(initialTab);
      setIsOpen(true);
      setDesignJsonString('');
      setDesignJsonError(null);
      setTextCommandInput('');
      setGeneratedCommandJsonString('');
      setCommandJsonError(null);
    },
  }), [setActiveTab, setIsOpen, setDesignJsonString, setDesignJsonError, setTextCommandInput, setGeneratedCommandJsonString, setCommandJsonError]);

  const handleDownloadJson = useCallback(() => {
    const contentToDownload = activeTab === 'canvas' ? designJsonString : generatedCommandJsonString;
    const currentErr = activeTab === 'canvas' ? designJsonError : commandJsonError;
    const filename = activeTab === 'canvas' ? 'design_canvas.json' : 'generated_commands.json';

    if (!contentToDownload || contentToDownload.trim() === "[]" || contentToDownload.trim() === "" || currentErr) {
      toast({ title: "Download Failed", description: currentErr ? "JSON has errors." : "No valid JSON content to download.", variant: "destructive" });
      return;
    }
    try {
      let formattedJson = contentToDownload;
      if (!currentErr) {
          try {
            const parsed = JSON.parse(contentToDownload);
            formattedJson = JSON.stringify(parsed, null, 2);
          } catch (e) {
            // Use raw if formatting fails
          }
      }
      const blob = new Blob([formattedJson], { type: 'application/json;charset=utf-8' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      toast({ title: "JSON Downloaded", description: `${filename} has started downloading.` });
    } catch (error) {
      toast({ title: "Download Error", description: "Could not prepare JSON for download.", variant: "destructive" });
    }
  }, [activeTab, designJsonString, generatedCommandJsonString, designJsonError, commandJsonError, toast]);

  const handleCopyToClipboard = useCallback(async () => {
    const contentToCopy = activeTab === 'canvas' ? designJsonString : generatedCommandJsonString;
    const currentErr = activeTab === 'canvas' ? designJsonError : commandJsonError;

     if (!contentToCopy || contentToCopy.trim() === "[]" || contentToCopy.trim() === "" || currentErr) {
      toast({ title: "Copy Failed", description: currentErr ? "JSON has errors." : "No valid JSON content to copy.", variant: "destructive" });
      return;
    }
    try {
      await navigator.clipboard.writeText(contentToCopy);
      toast({ title: "JSON Copied!", description: "JSON content copied to clipboard." });
    } catch (err) {
      toast({ title: "Copy Failed", description: "Could not copy JSON to clipboard.", variant: "destructive" });
    }
  }, [activeTab, designJsonString, generatedCommandJsonString, designJsonError, commandJsonError, toast]);

  const isLoadingCurrentTab =
    (activeTab === 'canvas' && isFetchingDesignJson) ||
    (activeTab === 'command' && isGeneratingCommandJson);

  let currentJsonContentForActions: string | null = null;
  let currentErrorFlagForActions: string | null = null;

  if (activeTab === 'canvas') {
    currentJsonContentForActions = designJsonString;
    currentErrorFlagForActions = designJsonError;
  } else { // 'command'
    currentJsonContentForActions = generatedCommandJsonString;
    currentErrorFlagForActions = commandJsonError;
  }

  const canPerformCopyDownloadActionsValue =
    !isLoadingCurrentTab &&
    currentJsonContentForActions &&
    currentJsonContentForActions.trim() !== "" &&
    (activeTab === 'canvas' ? currentJsonContentForActions.trim() !== "[]" : true) &&
    !currentErrorFlagForActions;

  const canSaveChangesValue =
    activeTab === 'canvas' &&
    !isFetchingDesignJson &&
    designJsonString &&
    designJsonString.trim() !== "" &&
    designJsonString.trim() !== "[]" &&
    !designJsonError;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-headline">View / Generate JSON</DialogTitle>
          <DialogDescription>
            {activeTab === 'canvas'
              ? 'View and edit the JSON representation of your design canvas. Changes can be validated and applied back.'
              : 'Generate UI JSON by describing components with text commands.'}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'canvas' | 'command')} className="flex-grow flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-2 mb-2 h-auto">
            <TabsTrigger value="canvas" className="text-xs px-1 py-1.5">Design Canvas JSON</TabsTrigger>
            <TabsTrigger value="command" className="text-xs px-1 py-1.5">Generate from Text Command</TabsTrigger>
          </TabsList>

          <TabsContent value="canvas" className="flex-grow flex flex-col space-y-3 min-h-0">
            <div className="flex-grow rounded-md border bg-muted/30 overflow-hidden min-h-[200px] relative">
              {isFetchingDesignJson ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="ml-2">Loading Canvas JSON...</span>
                </div>
              ) : (
                <CodeMirror
                  value={designJsonString}
                  height="100%"
                  extensions={[jsonLang()]}
                  theme={resolvedTheme === 'dark' ? githubDark : githubLight}
                  onChange={handleDesignJsonChange}
                  className="text-sm h-full"
                  basicSetup={{ lineNumbers: true, foldGutter: true, autocompletion: true, highlightActiveLine: true, bracketMatching: true }}
                />
              )}
            </div>
            {designJsonError && (
              <div className="p-2.5 text-xs text-destructive-foreground bg-destructive rounded-md whitespace-pre-wrap max-h-28 overflow-y-auto">
                <div className="flex items-start">
                  <AlertTriangle className="h-4 w-4 mr-1.5 mt-0.5 shrink-0" />
                  <span className="flex-grow">{designJsonError}</span>
                </div>
              </div>
            )}
             {!designJsonError && designJsonString && designJsonString.trim() !== "[]" && designJsonString.trim() !== "" && (
                <div className="p-2 text-xs text-green-700 dark:text-green-400 bg-green-500/10 rounded-md">
                 <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 mr-1.5 shrink-0" />
                    <span>JSON appears valid. You can save changes to the canvas.</span>
                  </div>
                </div>
            )}
          </TabsContent>

          <TabsContent value="command" className="flex-grow flex flex-col space-y-3 min-h-0">
            <div className="space-y-1.5">
              <Label htmlFor="textCommandInput" className="text-xs">Describe UI Components (Jetpack Compose-like)</Label>
              <Textarea
                id="textCommandInput"
                value={textCommandInput}
                onChange={handleTextCommandInputChange}
                placeholder="Example: Column { Text(\"Hello\"); Button(\"Click\") }"
                className="min-h-[80px] max-h-[150px] text-sm font-code"
              />
            </div>
            <Button onClick={handleGenerateCommandJson} disabled={isGeneratingCommandJson || !textCommandInput.trim()} size="sm" className="self-start">
              {isGeneratingCommandJson ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
              Generate JSON from Commands
            </Button>
            <div className="flex-grow rounded-md border bg-muted/30 overflow-hidden min-h-[150px] relative">
              {isGeneratingCommandJson && !generatedCommandJsonString ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="ml-2">Generating JSON...</span>
                </div>
              ) : (
                <CodeMirror
                  value={generatedCommandJsonString}
                  height="100%"
                  extensions={[jsonLang()]}
                  theme={resolvedTheme === 'dark' ? githubDark : githubLight}
                  onChange={handleGeneratedCommandJsonChange}
                  className="text-sm h-full"
                  readOnly={isGeneratingCommandJson}
                  basicSetup={{ lineNumbers: true, foldGutter: true, autocompletion: true, highlightActiveLine: true, bracketMatching: true }}
                />
              )}
            </div>
            {commandJsonError && (
              <div className="p-2.5 text-xs text-destructive-foreground bg-destructive rounded-md whitespace-pre-wrap max-h-28 overflow-y-auto">
                 <div className="flex items-start">
                  <AlertTriangle className="h-4 w-4 mr-1.5 mt-0.5 shrink-0" />
                  <span className="flex-grow">{commandJsonError}</span>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
        
        <DialogFooter className="mt-4 sm:justify-between flex-wrap gap-2 pt-3 border-t">
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleCopyToClipboard} 
              disabled={!canPerformCopyDownloadActionsValue}
            >
              <Copy className="mr-2 h-4 w-4" /> Copy JSON
            </Button>
            <Button 
              variant="outline" 
              onClick={handleDownloadJson} 
              disabled={!canPerformCopyDownloadActionsValue}
            >
              <Download className="mr-2 h-4 w-4" /> Download .json
            </Button>
          </div>
          {activeTab === 'canvas' ? (
            <Button 
              onClick={handleSaveChangesToCanvas} 
              disabled={!canSaveChangesValue}
            >
              {isFetchingDesignJson && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4" /> Save Changes to Canvas
            </Button>
          ) : (
             <Button variant="secondary" onClick={() => setIsOpen(false)}>
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

ViewJsonModal.displayName = 'ViewJsonModal';
