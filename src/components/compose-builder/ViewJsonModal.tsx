

'use client';

import React, { useState, useImperativeHandle, forwardRef, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDesign } from '@/contexts/DesignContext';
import {
  getDesignComponentsAsJsonAction,
  convertCanvasToCustomJsonAction,
  publishCustomJsonToRemoteConfigAction,
  publishToRemoteConfigAction,
  generateProjectFromTemplatesAction
} from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Copy, Download, Wand2, FileJson, Save, AlertTriangle, UploadCloud, FileCode } from 'lucide-react';
import CodeMirror from '@uiw/react-codemirror';
import { json as jsonLang } from '@codemirror/lang-json';
import { java as javaLang } from '@codemirror/lang-java';
import { githubLight, githubDark } from '@uiw/codemirror-theme-github';
import { useTheme } from '@/contexts/ThemeContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ModalJsonSchema, DEFAULT_CONTENT_LAZY_COLUMN_ID } from '@/types/compose-spec';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import JSZip from 'jszip';


export interface ViewJsonModalRef {
  openModal: () => void;
}

type ActiveTab = "canvasJson" | "generateCustomJsonFromCanvas" | "generateJsonParserCode";


export const ViewJsonModal = forwardRef<ViewJsonModalRef, {}>((_props, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("canvasJson");

  // State for "Design Canvas JSON" tab
  const [canvasJsonString, setCanvasJsonString] = useState<string>("");
  const [isCanvasJsonLoading, setIsCanvasJsonLoading] = useState(false);
  const [canvasJsonError, setCanvasJsonError] = useState<string | null>(null);
  const [syntaxError, setSyntaxError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [showPublishCanvasJsonDialog, setShowPublishCanvasJsonDialog] = useState(false);
  const [publishCanvasJsonParameterKey, setPublishCanvasJsonParameterKey] = useState<string>("COMPOSE_DESIGN_JSON_V2");
  const [isPublishingCanvasJson, setIsPublishingCanvasJson] = useState(false);
  const [includeDefaultValues, setIncludeDefaultValues] = useState(false);


  // State for "Generate Custom JSON from Canvas" tab
  const [customJsonFromCanvasString, setCustomJsonFromCanvasString] = useState<string>("");
  const [isCustomJsonFromCanvasLoading, setIsCustomJsonFromCanvasLoading] = useState(false);
  const [customJsonFromCanvasError, setCustomJsonFromCanvasError] = useState<string | null>(null);
  const [includeCustomJsonDefaults, setIncludeCustomJsonDefaults] = useState(false);


  // State for publishing custom JSON
  const [showPublishCustomJsonDialog, setShowPublishCustomJsonDialog] = useState(false);
  const [publishCustomJsonParameterKey, setPublishCustomJsonParameterKey] = useState<string>("CUSTOM_COMMAND_JSON_V1");
  const [isPublishingCustomJson, setIsPublishingCustomJson] = useState(false);

  // State for "Kotlin Parser" tab
  const [parserProjectFiles, setParserProjectFiles] = useState<Record<string, string> | null>(null);
  const [concatenatedParserCode, setConcatenatedParserCode] = useState<string>('');
  const [isParserLoading, setIsParserLoading] = useState(false);
  const [parserError, setParserError] = useState<string | null>(null);


  const { activeDesign, customComponentTemplates, overwriteComponents } = useDesign();
  const { toast } = useToast();
  const { resolvedTheme } = useTheme();

  const currentJsonInEditor = (): string => {
    switch (activeTab) {
      case "canvasJson": return canvasJsonString;
      case "generateCustomJsonFromCanvas": return customJsonFromCanvasString;
      case "generateJsonParserCode": return concatenatedParserCode;
      default: return "";
    }
  };

  const currentError = (): string | null => {
     switch (activeTab) {
      case "canvasJson": return canvasJsonError || syntaxError || (validationErrors.length > 0 ? validationErrors.join('; ') : null);
      case "generateCustomJsonFromCanvas": return customJsonFromCanvasError;
      case "generateJsonParserCode": return parserError;
      default: return null;
    }
  }


  const handleFetchDesignJson = useCallback(async () => {
    if (activeTab !== "canvasJson" || !activeDesign) return;

    setIsCanvasJsonLoading(true);
    setCanvasJsonError(null);
    setSyntaxError(null);
    setValidationErrors([]);
    try {
      const jsonStr = await getDesignComponentsAsJsonAction(activeDesign.components, customComponentTemplates, includeDefaultValues);
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
  }, [activeTab, activeDesign, customComponentTemplates, includeDefaultValues]);

  const handleGenerateCustomJsonFromCanvas = useCallback(async () => {
    if (!activeDesign) return;
    setIsCustomJsonFromCanvasLoading(true);
    setCustomJsonFromCanvasError(null);
    setCustomJsonFromCanvasString("");
    try {
      const result = await convertCanvasToCustomJsonAction(activeDesign.components, customComponentTemplates, includeCustomJsonDefaults);
      if (result.customJsonString) {
        // Format the single-line JSON string to be pretty-printed
        const parsed = JSON.parse(result.customJsonString);
        const formattedJson = JSON.stringify(parsed, null, 2);
        setCustomJsonFromCanvasString(formattedJson);
      } else {
        setCustomJsonFromCanvasError(result.error || "Failed to generate custom JSON from canvas.");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "An unexpected error occurred.";
      setCustomJsonFromCanvasError(message);
    } finally {
      setIsCustomJsonFromCanvasLoading(false);
    }
  }, [activeDesign, customComponentTemplates, includeCustomJsonDefaults]);

  const handleGenerateJsonParserCode = useCallback(async () => {
    if (!activeDesign) return;
    setIsParserLoading(true);
    setParserError(null);
    setParserProjectFiles(null);
    setConcatenatedParserCode('');
    
    try {
      const result = await generateProjectFromTemplatesAction(activeDesign.components, customComponentTemplates);
      if (result.files && Object.keys(result.files).length > 0) {
        setParserProjectFiles(result.files);
        
        const allCode = Object.entries(result.files)
          .map(([filePath, content]) => `// --- FILE: ${filePath} ---\n\n${content}\n\n`)
          .join('\n');
        setConcatenatedParserCode(allCode);

      } else {
        setParserError(result.error || "AI returned an empty or invalid project structure for the parser.");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "An unexpected error occurred during parser generation.";
      setParserError(message);
    } finally {
      setIsParserLoading(false);
    }
  }, [activeDesign, customComponentTemplates]);

  useEffect(() => {
    if (!isOpen) return;

    if (activeTab === 'canvasJson') {
      handleFetchDesignJson();
    } else if (activeTab === 'generateCustomJsonFromCanvas') {
      handleGenerateCustomJsonFromCanvas();
    } else if (activeTab === 'generateJsonParserCode') {
      handleGenerateJsonParserCode();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, activeTab, includeDefaultValues, includeCustomJsonDefaults]);

  useImperativeHandle(ref, () => ({
    openModal: () => {
      setIsOpen(true);
      // Reset all states when modal opens
      setActiveTab('canvasJson'); // Default to first tab
      setIncludeDefaultValues(false);
      setCanvasJsonString("");
      setCanvasJsonError(null);
      setSyntaxError(null);
      setValidationErrors([]);
      
      setIncludeCustomJsonDefaults(false);
      setCustomJsonFromCanvasString("");
      setCustomJsonFromCanvasError(null);
      
      setParserProjectFiles(null);
      setConcatenatedParserCode('');
      setParserError(null);
    }
  }));

  const handleCanvasJsonChange = useCallback((value: string) => {
    setCanvasJsonString(value);
    setSyntaxError(null);
    setValidationErrors([]);
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

      // Check if the parsed JSON is an empty array, which means clearing the content area.
      if (Array.isArray(validationResult.data) && validationResult.data.length === 0) {
         if (window.confirm("Applying an empty JSON array will clear all components from the content area. Are you sure?")) {
            const result = overwriteComponents(validationResult.data);
             if (result.success) {
                toast({ title: "Canvas Content Cleared", description: "All components removed from the content area." });
             } else {
                setCanvasJsonError(result.error || "Failed to clear canvas content.");
                toast({ title: "Update Failed", description: result.error || "Could not clear canvas content.", variant: "destructive" });
             }
         } else {
            return; // User cancelled clearing
         }
      } else {
        const result = overwriteComponents(validationResult.data);
        if (result.success) {
          toast({
            title: "Canvas Updated",
            description: "JSON changes applied to the design canvas.",
          });
        } else {
          setCanvasJsonError(result.error || "Failed to apply JSON to canvas.");
           toast({
            title: "Update Failed",
            description: result.error || "Could not apply JSON to canvas.",
            variant: "destructive",
          });
        }
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

  const handleCopyToClipboard = async () => {
    const contentToCopy = currentJsonInEditor();
    if (contentToCopy) {
      try {
        await navigator.clipboard.writeText(contentToCopy);
        toast({
          title: "Content Copied!",
          description: "Code content copied to clipboard.",
        });
      } catch (err) {
        toast({
          title: "Copy Failed",
          description: "Could not copy content to clipboard.",
          variant: "destructive",
        });
      }
    }
  };

  const handleDownload = async () => {
    const contentToDownload = currentJsonInEditor();
    const currentErr = currentError();

    if (!contentToDownload && activeTab !== 'generateJsonParserCode') {
        toast({ title: "Download Failed", description: "No content available to download.", variant: "destructive" });
        return;
    }

    if (currentErr && activeTab !== 'generateJsonParserCode') {
        toast({ title: "Download Failed", description: currentErr, variant: "destructive" });
        return;
    }

    try {
        if (activeTab === 'generateJsonParserCode') {
            if (!parserProjectFiles || Object.keys(parserProjectFiles).length === 0) {
                toast({ title: "Download Failed", description: "Parser project files not generated yet.", variant: "destructive" });
                return;
            }
            if (parserError) {
                toast({ title: "Download Failed", description: "Cannot download project with errors.", variant: "destructive" });
                return;
            }
            const zip = new JSZip();
            for (const filePath in parserProjectFiles) {
                zip.file(filePath, parserProjectFiles[filePath]);
            }
            const blob = await zip.generateAsync({ type: "blob" });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'MVI_Parser_Project.zip';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
            toast({ title: "Project Downloaded", description: "Your MVI project is being downloaded." });

        } else {
            const blob = new Blob([contentToDownload], { type: 'application/json;charset=utf-8' });
            let filename = "design_output.json";
            if (activeTab === "canvasJson") filename = "canvas_content_design.json";
            else if (activeTab === "generateCustomJsonFromCanvas") filename = "custom_from_canvas.json";

            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
            toast({ title: "JSON Downloaded", description: `${filename} has started downloading.` });
        }
    } catch (error) {
        console.error("Error during download:", error);
        toast({ title: "Download Failed", description: "Could not prepare the file for download.", variant: "destructive" });
    }
  };


  // Publish Custom JSON from "Custom from Canvas" tab
  const handleOpenPublishCustomJsonDialog = () => {
    if (customJsonFromCanvasString && !customJsonFromCanvasError && !isCustomJsonFromCanvasLoading) {
        setShowPublishCustomJsonDialog(true);
    } else {
        toast({
            title: "Cannot Publish",
            description: "No valid custom JSON available to publish.",
            variant: "destructive"
        });
    }
  };

  const handleActualPublishCustomJson = async () => {
    if (!publishCustomJsonParameterKey.trim()) {
        toast({
            title: "Validation Error",
            description: "Remote Config parameter key cannot be empty.",
            variant: "destructive"
        });
        return;
    }
    if (!customJsonFromCanvasString) {
        toast({
            title: "Error",
            description: "No custom JSON available to publish.",
            variant: "destructive"
        });
        return;
    }

    setIsPublishingCustomJson(true);
    try {
        const result = await publishCustomJsonToRemoteConfigAction(customJsonFromCanvasString, publishCustomJsonParameterKey.trim());
        if (result.success) {
            toast({
                title: "Publish Successful",
                description: `${result.message} (Version: ${result.version || 'N/A'})`
            });
            setShowPublishCustomJsonDialog(false);
        } else {
            toast({
                title: "Publish Failed",
                description: result.message,
                variant: "destructive"
            });
        }
    } catch (error) {
        toast({
            title: "Publish Error",
            description: error instanceof Error ? error.message : "An unexpected error occurred.",
            variant: "destructive"
        });
    } finally {
        setIsPublishingCustomJson(false);
    }
  };

  // Publish Canvas JSON (content area) from "Canvas JSON" tab
  const handleOpenPublishCanvasJsonDialog = () => {
    const contentAreaComponentsExist = activeDesign?.components.some(c => c.parentId === DEFAULT_CONTENT_LAZY_COLUMN_ID || (c.id === DEFAULT_CONTENT_LAZY_COLUMN_ID && (c.properties.children?.length || 0) > 0));
    if (!isCanvasJsonLoading && !canvasJsonError && contentAreaComponentsExist) {
        setShowPublishCanvasJsonDialog(true);
    } else {
        toast({
            title: "Cannot Publish",
            description: !contentAreaComponentsExist ? "No components in the content area to publish." : "Canvas JSON is currently loading or has errors.",
            variant: "destructive"
        });
    }
  };

  const handleActualPublishCanvasJson = async () => {
    if (!publishCanvasJsonParameterKey.trim()) {
        toast({
            title: "Validation Error",
            description: "Remote Config parameter key cannot be empty.",
            variant: "destructive"
        });
        return;
    }
    if (!activeDesign) {
       toast({ title: "Error", description: "No active design to publish.", variant: "destructive" });
       return;
    }

    setIsPublishingCanvasJson(true);
    try {
      const result = await publishToRemoteConfigAction(activeDesign.components, customComponentTemplates, publishCanvasJsonParameterKey.trim(), includeDefaultValues);
      if (result.success) {
        toast({
          title: "Publish Successful",
          description: `${result.message} (Version: ${result.version || 'N/A'})`,
        });
        setShowPublishCanvasJsonDialog(false);
      } else {
        toast({
          title: "Publish Failed",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Publish Error",
        description: error instanceof Error ? error.message : "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsPublishingCanvasJson(false);
    }
  };


  const isLoading = isCanvasJsonLoading || isCustomJsonFromCanvasLoading || isParserLoading;
  const canPerformCopyDownloadActions = !isLoading && !!currentJsonInEditor() && !currentError();
  const canDownloadProject = activeTab === 'generateJsonParserCode' && !isParserLoading && !parserError && !!parserProjectFiles;
  
  const canSaveChangesValue = activeTab === 'canvasJson' && !isCanvasJsonLoading && !!canvasJsonString && !syntaxError && validationErrors.length === 0 && !canvasJsonError;
  
  const canPublishCustomJsonValue = activeTab === 'generateCustomJsonFromCanvas' && !!customJsonFromCanvasString && !customJsonFromCanvasError && !isCustomJsonFromCanvasLoading && !isPublishingCustomJson;
  const contentComponentsExist = activeDesign?.components.some(c => c.parentId === DEFAULT_CONTENT_LAZY_COLUMN_ID || (c.id === DEFAULT_CONTENT_LAZY_COLUMN_ID && (c.properties.children?.length || 0) > 0));
  const canPublishCanvasJsonValue = activeTab === 'canvasJson' && !isCanvasJsonLoading && !canvasJsonError && !isPublishingCanvasJson && contentComponentsExist;


  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-headline">View / Generate JSON & Code</DialogTitle>
          <DialogDescription>
            Inspect or edit canvas JSON, or generate custom command JSON and full Kotlin parser projects.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ActiveTab)} className="flex-grow flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-3 mb-2 h-auto">
            <TabsTrigger value="canvasJson" className="text-xs px-1 py-1.5"><FileJson className="mr-1.5"/>Canvas JSON</TabsTrigger>
            <TabsTrigger value="generateCustomJsonFromCanvas" className="text-xs px-1 py-1.5"><Wand2 className="mr-1.5"/>Custom JSON</TabsTrigger>
            <TabsTrigger value="generateJsonParserCode" className="text-xs px-1 py-1.5"><FileCode className="mr-1.5"/>Kotlin Parser</TabsTrigger>
          </TabsList>

          <TabsContent value="canvasJson" className="flex-grow flex flex-col space-y-2 min-h-0">
            <div className="flex-grow rounded-md border bg-muted/30 overflow-auto min-h-[200px] relative">
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
            {canvasJsonError && <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertTitle>Error Loading JSON</AlertTitle><AlertDescription>{canvasJsonError}</AlertDescription></Alert>}
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
          </TabsContent>

          <TabsContent value="generateCustomJsonFromCanvas" className="flex-grow flex flex-col space-y-2 min-h-0">
            <div className="flex-grow rounded-md border bg-muted/30 overflow-auto min-h-[200px] relative">
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
                  readOnly={true}
                  className="text-sm h-full"
                  basicSetup={{ lineNumbers: true, foldGutter: true, highlightActiveLine: true }}
                  id="customJsonFromCanvasEditor"
                />
              )}
            </div>
            {customJsonFromCanvasError && <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertTitle>Error Generating JSON</AlertTitle><AlertDescription>{customJsonFromCanvasError}</AlertDescription></Alert>}
          </TabsContent>

          <TabsContent value="generateJsonParserCode" className="flex-grow flex flex-col space-y-2 min-h-0">
            <div className="flex-grow rounded-md border bg-muted/30 overflow-auto min-h-[200px] relative">
              {isParserLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="ml-2">Generating Kotlin Project...</span>
                </div>
              ) : parserError ? (
                <div className="p-4">
                  <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertTitle>Error Generating Project</AlertTitle><AlertDescription>{parserError}</AlertDescription></Alert>
                </div>
              ) : (
                <CodeMirror
                  value={concatenatedParserCode}
                  height="100%"
                  extensions={[javaLang()]}
                  theme={resolvedTheme === 'dark' ? githubDark : githubLight}
                  readOnly={true}
                  className="text-sm h-full"
                  basicSetup={{ lineNumbers: true, foldGutter: true, highlightActiveLine: true }}
                />
              )}
            </div>
          </TabsContent>

        </Tabs>

        <DialogFooter className="flex flex-col sm:flex-row sm:justify-between gap-2 mt-4 pt-4 border-t">
          {/* Left side: Tab-specific primary actions */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-start gap-2 flex-wrap">
            {activeTab === 'canvasJson' && (
              <>
                <Button onClick={handleFetchDesignJson} variant="outline" disabled={isCanvasJsonLoading} className="w-full sm:w-auto">
                  {isCanvasJsonLoading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Wand2 className="mr-1.5 h-4 w-4" />}
                  Regenerate
                </Button>
                <Button onClick={handleSaveChangesToCanvas} disabled={!canSaveChangesValue} className="w-full sm:w-auto">
                  <Save className="mr-2 h-4 w-4" /> Save to Canvas
                </Button>
                <Button onClick={handleOpenPublishCanvasJsonDialog} disabled={!canPublishCanvasJsonValue} className="w-full sm:w-auto">
                  {isPublishingCanvasJson ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                  Publish
                </Button>
                <div className="flex items-center space-x-2 pl-2">
                  <Switch
                    id="include-defaults-switch"
                    checked={includeDefaultValues}
                    onCheckedChange={setIncludeDefaultValues}
                    disabled={isCanvasJsonLoading}
                  />
                  <Label htmlFor="include-defaults-switch" className="text-xs text-muted-foreground whitespace-nowrap">
                    Include default values
                  </Label>
                </div>
              </>
            )}
            {activeTab === 'generateCustomJsonFromCanvas' && (
               <div className="flex flex-col sm:flex-row sm:items-center sm:justify-start gap-2 w-full">
                <Button onClick={handleGenerateCustomJsonFromCanvas} variant="outline" disabled={isCustomJsonFromCanvasLoading || isPublishingCustomJson} className="w-full sm:w-auto">
                  {isCustomJsonFromCanvasLoading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin"/> : <Wand2 className="mr-1.5 h-4 w-4"/>} Regenerate
                </Button>
                <Button onClick={handleOpenPublishCustomJsonDialog} disabled={!canPublishCustomJsonValue} className="w-full sm:w-auto">
                  {isPublishingCustomJson ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                  Publish Custom JSON
                </Button>
                 <div className="flex items-center space-x-2 pl-2">
                    <Switch
                        id="include-custom-json-defaults-switch"
                        checked={includeCustomJsonDefaults}
                        onCheckedChange={setIncludeCustomJsonDefaults}
                        disabled={isCustomJsonFromCanvasLoading}
                    />
                    <Label htmlFor="include-custom-json-defaults-switch" className="text-xs text-muted-foreground whitespace-nowrap">
                        Include default values
                    </Label>
                 </div>
              </div>
            )}
            {activeTab === 'generateJsonParserCode' && (
                <Button onClick={handleGenerateJsonParserCode} variant="outline" disabled={isParserLoading} className="w-full sm:w-auto">
                  {isParserLoading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Wand2 className="mr-1.5 h-4 w-4" />}
                  Regenerate Project
                </Button>
            )}
          </div>

          {/* Right side: Common secondary actions */}
          <div className="flex flex-col sm:flex-row sm:justify-end gap-2">
            <Button onClick={handleCopyToClipboard} variant="outline" disabled={!canPerformCopyDownloadActions} className="w-full sm:w-auto">
              <Copy className="mr-2 h-4 w-4" /> Copy
            </Button>
            <Button onClick={handleDownload} variant="outline" disabled={!canPerformCopyDownloadActions && !canDownloadProject} className="w-full sm:w-auto">
              <Download className="mr-2 h-4 w-4" /> Download
            </Button>
          </div>
        </DialogFooter>


        {/* Dialog for Custom JSON Publishing */}
        <AlertDialog open={showPublishCustomJsonDialog} onOpenChange={setShowPublishCustomJsonDialog}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Publish Custom JSON to Remote Config</AlertDialogTitle>
                    <AlertDialogDescription>
                        Enter the parameter key where this custom command JSON will be published.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="py-2 space-y-1.5">
                    <Label htmlFor="publishCustomJsonParameterKeyInput">Parameter Key</Label>
                    <Input
                        id="publishCustomJsonParameterKeyInput"
                        value={publishCustomJsonParameterKey}
                        onChange={(e) => setPublishCustomJsonParameterKey(e.target.value)}
                        placeholder="e.g., MY_CUSTOM_UI_JSON"
                        disabled={isPublishingCustomJson}
                    />
                </div>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isPublishingCustomJson}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleActualPublishCustomJson} disabled={isPublishingCustomJson || !publishCustomJsonParameterKey.trim()}>
                        {isPublishingCustomJson && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Confirm & Publish
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        {/* Dialog for Canvas JSON Publishing */}
        <AlertDialog open={showPublishCanvasJsonDialog} onOpenChange={setShowPublishCanvasJsonDialog}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Publish Canvas JSON (Content Area) to Remote Config</AlertDialogTitle>
                    <AlertDialogDescription>
                        Enter the parameter key where the content area design JSON will be published.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="py-2 space-y-1.5">
                    <Label htmlFor="publishCanvasJsonParameterKeyInput">Parameter Key</Label>
                    <Input
                        id="publishCanvasJsonParameterKeyInput"
                        value={publishCanvasJsonParameterKey}
                        onChange={(e) => setPublishCanvasJsonParameterKey(e.target.value)}
                        placeholder="e.g., COMPOSE_DESIGN_JSON_V2"
                        disabled={isPublishingCanvasJson}
                    />
                </div>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isPublishingCanvasJson}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleActualPublishCanvasJson} disabled={isPublishingCanvasJson || !publishCanvasJsonParameterKey.trim()}>
                        {isPublishingCanvasJson && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Confirm & Publish
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

      </DialogContent>
    </Dialog>
  );
});

ViewJsonModal.displayName = 'ViewJsonModal';
