
'use client';

import React, { useState, useImperativeHandle, forwardRef, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useDesign } from '@/contexts/DesignContext';
import { generateJetpackComposeCodeAction, convertCanvasToCustomJsonAction, generateJsonParserCodeAction } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Copy, Download, Wand2, FileCode, AlertTriangle } from 'lucide-react';
import CodeMirror from '@uiw/react-codemirror';
import { java as javaLang } from '@codemirror/lang-java';
import { githubLight, githubDark } from '@uiw/codemirror-theme-github';
import { useTheme } from '@/contexts/ThemeContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";


export interface GenerateCodeModalRef {
  openModal: () => void;
}

type ActiveTab = "screenComposable" | "jsonParser";

export const GenerateCodeModal = forwardRef<GenerateCodeModalRef, {}>((props, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("screenComposable");

  // State for Screen Composable tab
  const [generatedScreenCode, setGeneratedScreenCode] = useState<string>("");
  const [isScreenCodeLoading, setIsScreenCodeLoading] = useState(false);
  const [screenCodeError, setScreenCodeError] = useState<string | null>(null);

  // State for JSON Parser tab
  const [generatedParserCode, setGeneratedParserCode] = useState<string>("");
  const [isParserCodeLoading, setIsParserCodeLoading] = useState(false);
  const [parserCodeError, setParserCodeError] = useState<string | null>(null);

  const { components, customComponentTemplates } = useDesign();
  const { toast } = useToast();
  const { resolvedTheme } = useTheme();

  const handleScreenCodeChange = useCallback((value: string) => {
    setGeneratedScreenCode(value);
  }, []);

  const handleGenerateScreenCode = useCallback(async () => {
    const userComponentsExist = components.some(c => c.parentId === 'scaffold-content-lazy-column') || components.length > 4;

    if (!userComponentsExist) {
      setScreenCodeError("No user components on the canvas to generate code from.");
      setGeneratedScreenCode("");
      return;
    }
    
    setIsScreenCodeLoading(true);
    setScreenCodeError(null);
    setGeneratedScreenCode("");
    
    try {
      const code = await generateJetpackComposeCodeAction(components, customComponentTemplates);
      setGeneratedScreenCode(code);
    } catch (error) {
      console.error("Error generating screen code:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to generate screen code.";
      setScreenCodeError(errorMessage);
      setGeneratedScreenCode("");
    } finally {
      setIsScreenCodeLoading(false);
    }
  }, [components, customComponentTemplates]);
  
  const handleGenerateParserCode = useCallback(async () => {
    setIsParserCodeLoading(true);
    setParserCodeError(null);
    setGeneratedParserCode("");
    
    try {
      // Step 1: Generate the custom JSON from the canvas
      const customJsonResult = await convertCanvasToCustomJsonAction(components, customComponentTemplates);
      if (customJsonResult.error || !customJsonResult.customJsonString) {
        throw new Error(customJsonResult.error || "Failed to generate underlying custom JSON from canvas.");
      }
      
      // Step 2: Generate the Kotlin parser code from the custom JSON
      const parserCodeResult = await generateJsonParserCodeAction(customJsonResult.customJsonString);
      if (parserCodeResult.error || !parserCodeResult.kotlinCode) {
        throw new Error(parserCodeResult.error || "Failed to generate Kotlin parser code.");
      }
      
      setGeneratedParserCode(parserCodeResult.kotlinCode);
      
    } catch (error) {
      console.error("Error generating parser code:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to generate parser code.";
      setParserCodeError(errorMessage);
      setGeneratedParserCode("");
    } finally {
      setIsParserCodeLoading(false);
    }
  }, [components, customComponentTemplates]);

  const onTabChange = (value: string) => {
      const newTab = value as ActiveTab;
      setActiveTab(newTab);
      // Trigger generation if tab is switched to and content is empty
      if (newTab === 'screenComposable' && !generatedScreenCode && !isScreenCodeLoading) {
          handleGenerateScreenCode();
      } else if (newTab === 'jsonParser' && !generatedParserCode && !isParserCodeLoading) {
          handleGenerateParserCode();
      }
  };


  useImperativeHandle(ref, () => ({
    openModal: () => {
      setIsOpen(true);
      // Reset states on open to ensure fresh generation
      setGeneratedScreenCode("");
      setScreenCodeError(null);
      setGeneratedParserCode("");
      setParserCodeError(null);

      // Trigger generation for the initially active tab
      if (activeTab === 'screenComposable') {
        handleGenerateScreenCode();
      } else if (activeTab === 'jsonParser') {
        handleGenerateParserCode();
      }
    }
  }));

  const handleCopyToClipboard = async () => {
    const codeToCopy = activeTab === 'screenComposable' ? generatedScreenCode : generatedParserCode;
    if (codeToCopy) {
      try {
        await navigator.clipboard.writeText(codeToCopy);
        toast({
          title: "Code Copied!",
          description: "Kotlin code copied to clipboard.",
        });
      } catch (err) {
        toast({
          title: "Copy Failed",
          description: "Could not copy code to clipboard.",
          variant: "destructive",
        });
      }
    }
  };

  const handleDownloadCode = () => {
    const codeToDownload = activeTab === 'screenComposable' ? generatedScreenCode : generatedParserCode;
    const errorExists = activeTab === 'screenComposable' ? !!screenCodeError : !!parserCodeError;
    const filename = activeTab === 'screenComposable' ? 'GeneratedScreen.kt' : 'RemoteUiParser.kt';

    if (codeToDownload && !errorExists) {
      const blob = new Blob([codeToDownload], { type: 'text/plain;charset=utf-8' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      toast({
        title: "Code Downloaded",
        description: `${filename} has started downloading.`,
      });
    } else {
      toast({
        title: "Download Failed",
        description: "No valid code to download.",
        variant: "destructive",
      });
    }
  };

  const isLoading = isScreenCodeLoading || isParserCodeLoading;
  const canPerformActions = !isLoading && (
    (activeTab === 'screenComposable' && !!generatedScreenCode && !screenCodeError) ||
    (activeTab === 'jsonParser' && !!generatedParserCode && !parserCodeError)
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-4xl max-h-[95vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-headline">Generated Jetpack Compose Code</DialogTitle>
          <DialogDescription>
            Select a tab to view the generated code. Edit, copy, or download it for your project.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={onTabChange} className="flex-grow flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-2 mb-2 h-auto">
              <TabsTrigger value="screenComposable" className="text-xs px-1 py-1.5"><FileCode className="mr-1.5"/>Screen Composable</TabsTrigger>
              <TabsTrigger value="jsonParser" className="text-xs px-1 py-1.5"><Wand2 className="mr-1.5"/>JSON Parser Logic</TabsTrigger>
          </TabsList>

          <TabsContent value="screenComposable" className="flex-grow flex flex-col min-h-0">
            <div className="flex-grow my-2 rounded-md border bg-muted/30 overflow-y-auto min-h-0 relative">
              {isScreenCodeLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="ml-2">Generating code...</span>
                </div>
              ) : screenCodeError ? (
                  <div className="p-4">
                    <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertTitle>Error Generating Screen Code</AlertTitle><AlertDescription>{screenCodeError}</AlertDescription></Alert>
                  </div>
              ) : (
                <CodeMirror
                  value={generatedScreenCode}
                  height="100%"
                  extensions={[javaLang()]}
                  theme={resolvedTheme === 'dark' ? githubDark : githubLight}
                  onChange={handleScreenCodeChange}
                  className="text-sm h-full"
                  basicSetup={{ lineNumbers: true, foldGutter: true, autocompletion: true, highlightActiveLine: true, highlightActiveLineGutter: true, bracketMatching: true, closeBrackets: true }}
                />
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="jsonParser" className="flex-grow flex flex-col min-h-0">
             <div className="flex-grow my-2 rounded-md border bg-muted/30 overflow-y-auto min-h-0 relative">
              {isParserCodeLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="ml-2">Generating parser logic...</span>
                </div>
              ) : parserCodeError ? (
                  <div className="p-4">
                    <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertTitle>Error Generating Parser Code</AlertTitle><AlertDescription>{parserCodeError}</AlertDescription></Alert>
                  </div>
              ) : (
                <CodeMirror
                  value={generatedParserCode}
                  height="100%"
                  extensions={[javaLang()]}
                  theme={resolvedTheme === 'dark' ? githubDark : githubLight}
                  readOnly={true}
                  className="text-sm h-full"
                  basicSetup={{ lineNumbers: true, foldGutter: true }}
                />
              )}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="sm:justify-between flex-wrap gap-2 pt-4 border-t shrink-0">
           <Button variant="outline" onClick={activeTab === 'screenComposable' ? handleGenerateScreenCode : handleGenerateParserCode} disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
            Regenerate
          </Button>
          <div className="flex gap-2">
            <Button onClick={handleCopyToClipboard} disabled={!canPerformActions}>
              <Copy className="mr-2 h-4 w-4" /> Copy
            </Button>
            <Button onClick={handleDownloadCode} disabled={!canPerformActions}>
              <Download className="mr-2 h-4 w-4" /> Download .kt
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

GenerateCodeModal.displayName = 'GenerateCodeModal';
