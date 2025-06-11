
'use client';

import React, { useState, useImperativeHandle, forwardRef, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useDesign } from '@/contexts/DesignContext';
import { getDesignComponentsAsJsonAction } from '@/app/actions';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Copy, Download, Save, RefreshCw, AlertTriangle, Edit3, Users } from 'lucide-react';
import CodeMirror from '@uiw/react-codemirror';
import { json as jsonLang } from '@codemirror/lang-json';
import { githubLight, githubDark } from '@uiw/codemirror-theme-github';
import { ModalJsonSchema, DEFAULT_ROOT_LAZY_COLUMN_ID } from '@/types/compose-spec';
import { useTheme } from '@/contexts/ThemeContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

export interface ViewJsonModalRef {
  openModal: () => void;
}

const userCardTemplate = (initials: string, username: string, email: string) => ({
  "card": {
    "modifier": {
      "base": {
        "fillMaxWidth": true,
        "padding": { "all": 16 },
        "clickId": "view_profile"
      }
    },
    "children": [
      {
        "row": {
          "modifier": { "verticalAlignment": "center" },
          "children": [
            {
              "box": {
                "modifier": {
                  "base": { "size": 64, "background": { "color": "#EEEEEE", "shape": "circle" } },
                  "contentAlignment": "center"
                },
                "children": [
                  { "text": { "content": initials, "fontSize": 24, "fontWeight": "bold", "color": "#666666" } }
                ]
              }
            },
            { "spacer": { "width": 16, "height": 0 } },
            {
              "column": {
                "children": [
                  { "text": { "content": username, "fontSize": 18, "fontWeight": "bold" } },
                  { "text": { "content": email, "fontSize": 14, "color": "#666666" } }
                ]
              }
            }
          ]
        }
      }
    ]
  }
});


export const ViewJsonModal = forwardRef<ViewJsonModalRef, {}>((props, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("editDesignJson");

  // State for "Edit Design JSON" tab
  const [designJsonString, setDesignJsonString] = useState<string>("");
  const [isFetchingDesignJson, setIsFetchingDesignJson] = useState(false);
  const [designJsonError, setDesignJsonError] = useState<string | string[] | null>(null);

  // State for "User Card JSON Generator" tab
  const [initialsInput, setInitialsInput] = useState<string>("JD");
  const [usernameInput, setUsernameInput] = useState<string>("John Doe");
  const [emailInput, setEmailInput] = useState<string>("john.doe@example.com");
  const [userCardJsonOutput, setUserCardJsonOutput] = useState<string>(
    JSON.stringify(userCardTemplate("JD", "John Doe", "john.doe@example.com"), null, 2)
  );
  const [isGeneratingUserCard, setIsGeneratingUserCard] = useState(false); // Placeholder for potential async ops
  const [userCardJsonError, setUserCardJsonError] = useState<string | null>(null);


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
    } catch (error) {
      if (error instanceof Error) {
        setDesignJsonError(`Syntax error: ${error.message}`);
      } else {
        setDesignJsonError("Invalid JSON syntax. Check for missing commas, brackets, etc.");
      }
    }
  }, []);

  const handleFetchDesignJson = useCallback(async () => {
    setIsFetchingDesignJson(true);
    setDesignJsonError(null);
    try {
      const rootLazyColumn = components.find(c => c.id === DEFAULT_ROOT_LAZY_COLUMN_ID);
      if (components.length <= 1 && rootLazyColumn && (!rootLazyColumn.properties.children || rootLazyColumn.properties.children.length === 0)) {
        validateAndSetDesignJson("[]");
      } else {
        const fetchedJsonString = await getDesignComponentsAsJsonAction(components, customComponentTemplates);
        validateAndSetDesignJson(fetchedJsonString);
      }
    } catch (error) {
      console.error("Error fetching design JSON:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch design JSON.";
      setDesignJsonString(`// Error fetching design JSON:\n// ${errorMessage}`);
      setDesignJsonError(`Fetch error: ${errorMessage}`);
      toast({
        title: "Design JSON Fetch Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsFetchingDesignJson(false);
    }
  }, [components, customComponentTemplates, toast, validateAndSetDesignJson]);

  useImperativeHandle(ref, () => ({
    openModal: () => {
      setIsOpen(true);
      if (activeTab === "editDesignJson") {
        handleFetchDesignJson();
      }
    }
  }));
  
  useEffect(() => {
    if (isOpen && activeTab === "editDesignJson" && (designJsonString === "" || designJsonString.startsWith("// Error"))) {
      handleFetchDesignJson();
    }
  }, [isOpen, activeTab, designJsonString, handleFetchDesignJson]);

  const handleSaveChangesToCanvas = () => {
    if (activeTab !== "editDesignJson" || designJsonError) {
      const errorSummary = Array.isArray(designJsonError) ? designJsonError.slice(0,5).join("\n") : "JSON is invalid.";
      toast({
        title: "Save Failed",
        description: `${errorSummary} Please correct errors.`,
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
    } catch (error) {
      console.error("Error saving design JSON:", error);
      const message = error instanceof Error ? error.message : "An error occurred while saving.";
      setDesignJsonError(message);
      toast({
        title: "Save Failed",
        description: message,
        variant: "destructive",
      });
    }
  };

  const handleGenerateUserCardJson = () => {
    setIsGeneratingUserCard(true);
    setUserCardJsonError(null);
    try {
      const generated = userCardTemplate(initialsInput, usernameInput, emailInput);
      const jsonStr = JSON.stringify(generated, null, 2);
      setUserCardJsonOutput(jsonStr);
      // Basic validation for the generated string
      JSON.parse(jsonStr); // Will throw if not valid JSON
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to generate valid JSON from template.";
        setUserCardJsonError(message);
        toast({ title: "Generation Error", description: message, variant: "destructive" });
    } finally {
        setIsGeneratingUserCard(false);
    }
  };

  const validateUserCardJson = useCallback((newJsonString: string) => {
    setUserCardJsonOutput(newJsonString);
    try {
      JSON.parse(newJsonString);
      setUserCardJsonError(null);
    } catch (error) {
      if (error instanceof Error) {
        setUserCardJsonError(`Syntax error: ${error.message}`);
      } else {
        setUserCardJsonError("Invalid JSON syntax.");
      }
    }
  }, []);


  const handleCopyToClipboard = async () => {
    let contentToCopy = "";
    let errorState: string | string[] | null = null;

    if (activeTab === "editDesignJson") {
      contentToCopy = designJsonString;
      errorState = designJsonError;
    } else if (activeTab === "userCardGenerator") {
      contentToCopy = userCardJsonOutput;
      errorState = userCardJsonError;
    }

    if (errorState) {
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
          description: "JSON copied to clipboard.",
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
    let contentToDownload = "";
    let errorState: string | string[] | null = null;
    let filename = "data.json";

    if (activeTab === "editDesignJson") {
      contentToDownload = designJsonString;
      errorState = designJsonError;
      filename = "design_components.json";
    } else if (activeTab === "userCardGenerator") {
      contentToDownload = userCardJsonOutput;
      errorState = userCardJsonError;
      filename = "user_card.json";
    }
    
    if (errorState) {
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
  
  const isLoadingCurrentTab = (activeTab === "editDesignJson" && isFetchingDesignJson) || (activeTab === "userCardGenerator" && isGeneratingUserCard);
  const currentTabJsonContent = activeTab === "editDesignJson" ? designJsonString : userCardJsonOutput;
  const currentTabError = activeTab === "editDesignJson" ? designJsonError : userCardJsonError;
  const canPerformActionsOnCurrentJson = !isLoadingCurrentTab && currentTabJsonContent && !currentTabJsonContent.startsWith("// Error");


  return (
    <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if(open && activeTab === "editDesignJson") handleFetchDesignJson(); }}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-headline">JSON Editor / Generator</DialogTitle>
          <DialogDescription>
            View/edit the design JSON or generate specific JSON structures.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(value) => {
            setActiveTab(value);
            if (value === "editDesignJson") {
                handleFetchDesignJson(); // Refresh design JSON when switching to its tab
            }
        }} className="flex-grow flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-2 mb-2 h-auto">
            <TabsTrigger value="editDesignJson" className="text-xs px-1 py-1.5">
              <Edit3 className="mr-1.5 h-3.5 w-3.5" /> Edit Design JSON
            </TabsTrigger>
            <TabsTrigger value="userCardGenerator" className="text-xs px-1 py-1.5">
              <Users className="mr-1.5 h-3.5 w-3.5" /> User Card Generator
            </TabsTrigger>
          </TabsList>

          <TabsContent value="editDesignJson" className="flex-grow flex flex-col min-h-0 relative">
            <div className="flex-grow my-1 rounded-md border overflow-auto bg-background min-h-[200px] md:min-h-[300px]">
                <CodeMirror
                    value={designJsonString}
                    height="100%"
                    className="text-xs h-full"
                    extensions={[jsonLang()]}
                    theme={resolvedTheme === 'dark' ? githubDark : githubLight}
                    onChange={validateAndSetDesignJson}
                    editable={!isFetchingDesignJson}
                    basicSetup={{
                        lineNumbers: true, foldGutter: true, autocompletion: true,
                        highlightActiveLine: true, highlightActiveLineGutter: true,
                        bracketMatching: true, closeBrackets: true,
                    }}
                />
            </div>
            {designJsonError && (
                <ScrollArea className="mt-1 mb-1 max-h-24">
                  <div className="p-2 text-xs text-destructive-foreground bg-destructive rounded-md">
                    {Array.isArray(designJsonError) ? (
                      <>
                        <div className="flex items-start gap-1.5 mb-0.5">
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-px" />
                          <strong className="flex-1">{designJsonError[0]}</strong>
                        </div>
                        <ul className="list-disc list-inside pl-4">
                          {designJsonError.slice(1).map((err, index) => (
                            <li key={index} className="whitespace-pre-wrap leading-relaxed text-xxs">{err}</li>
                          ))}
                        </ul>
                      </>
                    ) : (
                      <div className="flex items-start gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-px" />
                        <span className="flex-1 whitespace-pre-wrap leading-relaxed">{designJsonError}</span>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              )}
          </TabsContent>
          
          <TabsContent value="userCardGenerator" className="flex-grow flex flex-col min-h-0 relative">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3 p-1">
              <div className="space-y-1">
                <Label htmlFor="initialsInput" className="text-xs">Initials</Label>
                <Input id="initialsInput" value={initialsInput} onChange={(e) => setInitialsInput(e.target.value)} placeholder="JD" className="h-8 text-sm"/>
              </div>
              <div className="space-y-1">
                <Label htmlFor="usernameInput" className="text-xs">Username</Label>
                <Input id="usernameInput" value={usernameInput} onChange={(e) => setUsernameInput(e.target.value)} placeholder="John Doe" className="h-8 text-sm"/>
              </div>
              <div className="space-y-1">
                <Label htmlFor="emailInput" className="text-xs">Email</Label>
                <Input id="emailInput" type="email" value={emailInput} onChange={(e) => setEmailInput(e.target.value)} placeholder="john.doe@example.com" className="h-8 text-sm"/>
              </div>
            </div>
            <Button onClick={handleGenerateUserCardJson} disabled={isGeneratingUserCard} size="sm" className="mb-2 w-full md:w-auto self-center">
              {isGeneratingUserCard ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Edit3 className="mr-2 h-4 w-4" />}
              Generate User Card JSON
            </Button>
            <div className="flex-grow my-1 rounded-md border overflow-auto bg-background min-h-[150px] md:min-h-[250px]">
                 <CodeMirror
                    value={userCardJsonOutput}
                    height="100%"
                    className="text-xs h-full"
                    extensions={[jsonLang()]}
                    theme={resolvedTheme === 'dark' ? githubDark : githubLight}
                    onChange={validateUserCardJson}
                    editable={!isGeneratingUserCard}
                     basicSetup={{
                        lineNumbers: true, foldGutter: true, autocompletion: true,
                        highlightActiveLine: true, highlightActiveLineGutter: true,
                        bracketMatching: true, closeBrackets: true,
                    }}
                />
            </div>
            {userCardJsonError && (
              <div className="mt-1 mb-1 p-2 text-xs text-destructive-foreground bg-destructive rounded-md flex items-start gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-px" />
                <span className="flex-1 whitespace-pre-wrap leading-relaxed">{userCardJsonError}</span>
              </div>
            )}
          </TabsContent>
        </Tabs>
        
        <DialogFooter className="sm:justify-between flex-wrap gap-2 pt-3">
          <Button 
            variant="outline" 
            onClick={handleFetchDesignJson} 
            disabled={isLoadingCurrentTab || activeTab !== "editDesignJson"}
            className={activeTab !== "editDesignJson" ? 'invisible' : ''}
          >
            {isFetchingDesignJson ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Refresh Design
          </Button>
          <div className="flex gap-2 flex-wrap">
            <Button onClick={handleCopyToClipboard} disabled={!canPerformActionsOnCurrentJson || !!currentTabError}>
              <Copy className="mr-2 h-4 w-4" /> Copy JSON
            </Button>
            <Button onClick={handleDownloadJson} disabled={!canPerformActionsOnCurrentJson || !!currentTabError}>
              <Download className="mr-2 h-4 w-4" /> Download .json
            </Button>
            <Button 
              onClick={handleSaveChangesToCanvas} 
              disabled={!canPerformActionsOnCurrentJson || !!designJsonError || activeTab !== "editDesignJson"}
              className={activeTab !== "editDesignJson" ? 'hidden' : ''}
            >
              <Save className="mr-2 h-4 w-4" /> Save to Canvas
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

ViewJsonModal.displayName = 'ViewJsonModal';
    

