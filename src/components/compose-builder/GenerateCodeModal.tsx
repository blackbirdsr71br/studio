
'use client';

import React, { useState, useImperativeHandle, forwardRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useDesign } from '@/contexts/DesignContext';
import { generateJetpackComposeCodeAction } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Copy, Download, Wand2 } from 'lucide-react';
import CodeMirror from '@uiw/react-codemirror';
import { java as javaLang } from '@codemirror/lang-java';
import { githubLight, githubDark } from '@uiw/codemirror-theme-github';
import { useTheme } from '@/contexts/ThemeContext';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import JSZip from 'jszip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export interface GenerateCodeModalRef {
  openModal: () => void;
}

export const GenerateCodeModal = forwardRef<GenerateCodeModalRef, {}>((props, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [generatedFiles, setGeneratedFiles] = useState<Record<string, string> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { activeDesign, customComponentTemplates } = useDesign();
  const { toast } = useToast();
  const { resolvedTheme } = useTheme();
  const [hasGeneratedOnce, setHasGeneratedOnce] = useState(false);
  const [activeTab, setActiveTab] = useState('renderer');

  const handleGenerateCode = useCallback(async () => {
    if (!activeDesign) {
        setError("No active design to generate code from.");
        return;
    }
    setIsLoading(true);
    setError(null);
    setGeneratedFiles(null);
    setHasGeneratedOnce(true);
    try {
      // This now calls the non-AI generator
      const result = await generateJetpackComposeCodeAction(activeDesign.components, customComponentTemplates);
      if (result.error) {
        setError(result.error);
        setGeneratedFiles(null);
      } else if (result.files && Object.keys(result.files).length > 0) {
        setGeneratedFiles(result.files);
        setActiveTab('renderer'); // Default to showing the renderer first
      } else {
        setError("Code generation returned an empty or invalid structure.");
        setGeneratedFiles(null);
      }
    } catch (e) {
      console.error("Error generating screen code:", e);
      const errorMessage = e instanceof Error ? e.message : "Failed to generate screen code.";
      setError(errorMessage);
      setGeneratedFiles(null);
    } finally {
      setIsLoading(false);
    }
  }, [activeDesign, customComponentTemplates]);

  useImperativeHandle(ref, () => ({
    openModal: () => {
      setIsOpen(true);
      setGeneratedFiles(null);
      setError(null);
      setHasGeneratedOnce(false);
      setActiveTab('renderer');
    }
  }));
  
  const handleCopyToClipboard = async (fileKey: string) => {
    const codeToCopy = generatedFiles?.[fileKey] || '';
    if (codeToCopy) {
      try {
        await navigator.clipboard.writeText(codeToCopy);
        const fileName = fileKey.split('/').pop();
        toast({ title: "Code Copied!", description: `${fileName} copied to clipboard.` });
      } catch (err) {
        toast({ title: "Copy Failed", description: "Could not copy code to clipboard.", variant: "destructive" });
      }
    }
  };

  const handleDownloadZip = async () => {
    if (!generatedFiles) {
      toast({ title: "Download Failed", description: "No files to download.", variant: "destructive" });
      return;
    }

    try {
        const zip = new JSZip();
        // Add only the two dynamic files to the zip
        const rendererFile = 'app/src/main/java/com/example/myapplication/presentation/components/DynamicUiComponent.kt';
        const dtoFile = 'app/src/main/java/com/example/myapplication/data/model/ComponentDto.kt';

        if(generatedFiles[rendererFile]) {
            zip.file(rendererFile, generatedFiles[rendererFile]);
        }
        if(generatedFiles[dtoFile]) {
            zip.file(dtoFile, generatedFiles[dtoFile]);
        }

        const blob = await zip.generateAsync({ type: "blob" });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'ComposeUISource.zip';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
        
        toast({ title: "Source Code Downloaded", description: "Your ZIP file is being downloaded." });

    } catch (error) {
        console.error("Error creating source zip:", error);
        toast({ title: "Download Failed", description: "Could not create the ZIP file.", variant: "destructive" });
    }
  };

  const rendererFileKey = 'app/src/main/java/com/example/myapplication/presentation/components/DynamicUiComponent.kt';
  const dtoFileKey = 'app/src/main/java/com/example/myapplication/data/model/ComponentDto.kt';
  const rendererCode = generatedFiles?.[rendererFileKey] || '';
  const dtoCode = generatedFiles?.[dtoFileKey] || '';

  const canCopyOrDownload = !isLoading && generatedFiles && Object.keys(generatedFiles).length > 0;
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-headline">Generated Jetpack Compose Code</DialogTitle>
          <DialogDescription>
             Below is the generated Kotlin code for your design. You can copy individual files or download a ZIP with both.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-grow flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-2 mb-2">
            <TabsTrigger value="renderer">DynamicUiComponent.kt</TabsTrigger>
            <TabsTrigger value="dto">ComponentDto.kt</TabsTrigger>
          </TabsList>
            
          <div className="flex-grow my-2 rounded-md border bg-muted/30 overflow-y-auto relative min-h-[250px]">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2">Generating code...</span>
              </div>
            ) : error ? (
                <div className="p-4">
                  <Alert variant="destructive"><AlertTitle>Error Generating Code</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>
                </div>
            ) : !hasGeneratedOnce ? (
              <div className="flex items-center justify-center h-full">
                  <p className="text-muted-foreground">Click "Generate Code" to create the Kotlin source files.</p>
              </div>
            ) : (
              <>
                <TabsContent value="renderer" className="m-0 h-full">
                    <CodeMirror value={rendererCode} height="100%" extensions={[javaLang()]} theme={resolvedTheme === 'dark' ? githubDark : githubLight} readOnly className="text-sm h-full" basicSetup={{ lineNumbers: true, foldGutter: true }}/>
                </TabsContent>
                <TabsContent value="dto" className="m-0 h-full">
                    <CodeMirror value={dtoCode} height="100%" extensions={[javaLang()]} theme={resolvedTheme === 'dark' ? githubDark : githubLight} readOnly className="text-sm h-full" basicSetup={{ lineNumbers: true, foldGutter: true }}/>
                </TabsContent>
              </>
            )}
          </div>
        </Tabs>
        
        <DialogFooter className="sm:justify-between flex-wrap gap-2 pt-4 border-t shrink-0">
           <Button variant="outline" onClick={handleGenerateCode} disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
            {hasGeneratedOnce ? 'Regenerate Code' : 'Generate Code'}
          </Button>
          <div className="flex gap-2">
            {activeTab === 'renderer' && (
              <Button onClick={() => handleCopyToClipboard(rendererFileKey)} disabled={!canCopyOrDownload}>
                <Copy className="mr-2 h-4 w-4" /> Copy Renderer
              </Button>
            )}
             {activeTab === 'dto' && (
              <Button onClick={() => handleCopyToClipboard(dtoFileKey)} disabled={!canCopyOrDownload}>
                <Copy className="mr-2 h-4 w-4" /> Copy DTO
              </Button>
            )}
            <Button onClick={handleDownloadZip} disabled={!canCopyOrDownload}>
              <Download className="mr-2 h-4 w-4" /> Download .zip
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

GenerateCodeModal.displayName = 'GenerateCodeModal';
