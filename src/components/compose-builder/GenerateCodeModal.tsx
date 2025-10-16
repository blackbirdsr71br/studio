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

export interface GenerateCodeModalRef {
  openModal: () => void;
}

export const GenerateCodeModal = forwardRef<GenerateCodeModalRef, {}>((props, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [generatedProjectFiles, setGeneratedProjectFiles] = useState<Record<string, string> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { activeDesign, customComponentTemplates } = useDesign();
  const { toast } = useToast();
  const { resolvedTheme } = useTheme();
  const [hasGeneratedOnce, setHasGeneratedOnce] = useState(false);

  const handleGenerateCode = useCallback(async () => {
    if (!activeDesign) {
        setError("No active design to generate code from.");
        return;
    }
    setIsLoading(true);
    setError(null);
    setGeneratedProjectFiles(null);
    setHasGeneratedOnce(true);
    try {
      const result = await generateJetpackComposeCodeAction(activeDesign.components, customComponentTemplates);
      if (result.error) {
        setError(result.error);
        setGeneratedProjectFiles(null);
      } else if (result.files && Object.keys(result.files).length > 0) {
        setGeneratedProjectFiles(result.files);
      } else {
        setError("AI returned an empty or invalid project structure.");
        setGeneratedProjectFiles(null);
      }
    } catch (e) {
      console.error("Error generating screen code:", e);
      const errorMessage = e instanceof Error ? e.message : "Failed to generate screen code.";
      setError(errorMessage);
      setGeneratedProjectFiles(null);
    } finally {
      setIsLoading(false);
    }
  }, [activeDesign, customComponentTemplates]);

  useImperativeHandle(ref, () => ({
    openModal: () => {
      setIsOpen(true);
      setGeneratedProjectFiles(null);
      setError(null);
      setHasGeneratedOnce(false);
    }
  }));
  
  const handleCopyToClipboard = async () => {
    const codeToCopy = generatedProjectFiles?.['app/src/main/java/com/example/myapplication/presentation/components/DynamicUiComponent.kt'] || '';
    if (codeToCopy) {
      try {
        await navigator.clipboard.writeText(codeToCopy);
        toast({ title: "Code Copied!", description: "DynamicUiComponent.kt copied to clipboard." });
      } catch (err) {
        toast({ title: "Copy Failed", description: "Could not copy code to clipboard.", variant: "destructive" });
      }
    }
  };

  const handleDownloadProject = async () => {
    if (!generatedProjectFiles) {
      toast({ title: "Download Failed", description: "No project files to download.", variant: "destructive" });
      return;
    }

    try {
        const zip = new JSZip();
        for (const filePath in generatedProjectFiles) {
            zip.file(filePath, generatedProjectFiles[filePath]);
        }
        const blob = await zip.generateAsync({ type: "blob" });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'MVI_Dynamic_UI_Project.zip';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
        
        toast({ title: "Project Downloaded", description: "Your project is being downloaded." });

    } catch (error) {
        console.error("Error creating project zip:", error);
        toast({ title: "Download Failed", description: "Could not create the project ZIP file.", variant: "destructive" });
    }
  };

  const canCopyCode = !isLoading && generatedProjectFiles && Object.keys(generatedProjectFiles).length > 0;
  const canDownloadProject = !isLoading && !error && generatedProjectFiles && Object.keys(generatedProjectFiles).length > 0;
  const mainFileToDisplay = generatedProjectFiles?.['app/src/main/java/com/example/myapplication/presentation/components/DynamicUiComponent.kt'] || '';

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-4xl max-h-[95vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-headline">Generated Jetpack Compose Project</DialogTitle>
          <DialogDescription>
             Below is the dynamic UI rendering component. You can copy the code or download the complete, runnable Android MVI project.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-grow my-4 rounded-md border bg-muted/30 overflow-y-auto relative min-h-[300px]">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2">Generating project files...</span>
            </div>
          ) : error ? (
              <div className="p-4">
                <Alert variant="destructive"><AlertTitle>Error Generating Project</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>
              </div>
          ) : !hasGeneratedOnce ? (
             <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">Click "Generate" to create the project files.</p>
            </div>
          ) : (
            <CodeMirror
              value={mainFileToDisplay}
              height="100%"
              extensions={[javaLang()]}
              theme={resolvedTheme === 'dark' ? githubDark : githubLight}
              readOnly
              className="text-sm h-full"
              basicSetup={{ lineNumbers: true, foldGutter: true, autocompletion: true, highlightActiveLine: true, highlightActiveLineGutter: true, bracketMatching: true, closeBrackets: true }}
            />
          )}
        </div>
        
        <DialogFooter className="sm:justify-between flex-wrap gap-2 pt-4 border-t shrink-0">
           <Button variant="outline" onClick={handleGenerateCode} disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
            {hasGeneratedOnce ? 'Regenerate' : 'Generate'}
          </Button>
          <div className="flex gap-2">
            <Button onClick={handleCopyToClipboard} disabled={!canCopyCode}>
              <Copy className="mr-2 h-4 w-4" /> Copy Code
            </Button>
            <Button onClick={handleDownloadProject} disabled={!canDownloadProject}>
              <Download className="mr-2 h-4 w-4" /> Download Project.zip
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

GenerateCodeModal.displayName = 'GenerateCodeModal';
