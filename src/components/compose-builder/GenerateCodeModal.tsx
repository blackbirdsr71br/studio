

'use client';

import React, { useState, useImperativeHandle, forwardRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useDesign } from '@/contexts/DesignContext';
import { generateJetpackComposeCodeAction, generateProjectFromTemplatesAction } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Copy, Download, Wand2, FileCode, Package } from 'lucide-react';
import CodeMirror from '@uiw/react-codemirror';
import { java as javaLang } from '@codemirror/lang-java';
import { githubLight, githubDark } from '@uiw/codemirror-theme-github';
import { useTheme } from '@/contexts/ThemeContext';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from '../ui/input';
import { Label } from '../ui/label';

export interface GenerateCodeModalRef {
  openModal: () => void;
}

export const GenerateCodeModal = forwardRef<GenerateCodeModalRef, {}>((props, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isProjectLoading, setIsProjectLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { activeDesign, customComponentTemplates, m3Theme } = useDesign();
  const { toast } = useToast();
  const { resolvedTheme } = useTheme();
  const [hasGeneratedOnce, setHasGeneratedOnce] = useState(false);
  const [packageId, setPackageId] = useState("com.example.generated");


  const handleGenerateSingleFile = useCallback(async () => {
    if (!activeDesign) {
        setError("No active design to generate code from.");
        return;
    }
    setIsLoading(true);
    setError(null);
    setGeneratedContent(null);
    setHasGeneratedOnce(true);
    try {
      const result = await generateJetpackComposeCodeAction(activeDesign.components, customComponentTemplates);
      if (result.error) {
        setError(result.error);
        setGeneratedContent(null);
      } else if (result.files && result.files['GeneratedScreen.kt']) {
        setGeneratedContent(result.files['GeneratedScreen.kt']);
      } else {
        setError("Code generation returned an empty or invalid structure.");
        setGeneratedContent(null);
      }
    } catch (e) {
      console.error("Error generating screen code:", e);
      const errorMessage = e instanceof Error ? e.message : "Failed to generate screen code.";
      setError(errorMessage);
      setGeneratedContent(null);
    } finally {
      setIsLoading(false);
    }
  }, [activeDesign, customComponentTemplates]);

  const handleGenerateFullProject = useCallback(async () => {
    if (!activeDesign) {
        setError("No active design to generate project from.");
        return;
    }
     if (!packageId.match(/^[a-z][a-z0-9_]*(\.[a-z_][a-z0-9_]*)+$/)) {
        toast({ title: "Invalid Package ID", description: "Please enter a valid package ID (e.g., com.example.myapp).", variant: "destructive" });
        return;
    }
    setIsProjectLoading(true);
    setError(null);
    setGeneratedContent(null); // Clear previous content
    setHasGeneratedOnce(false); // Reset this so code viewer doesn't show up

    try {
        const result = await generateProjectFromTemplatesAction(packageId, activeDesign.components, customComponentTemplates, m3Theme);
        if (result.error) {
            setError(result.error);
        } else if (result.zip) {
            const link = document.createElement('a');
            link.href = `data:application/zip;base64,${result.zip}`;
            link.download = 'ComposeProject.zip';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast({ title: "Project Generated", description: "ComposeProject.zip has been downloaded." });
            setIsOpen(false);
        }
    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : "Failed to generate project.";
        setError(errorMessage);
    } finally {
        setIsProjectLoading(false);
    }
  }, [activeDesign, customComponentTemplates, packageId, m3Theme, toast]);


  useImperativeHandle(ref, () => ({
    openModal: () => {
      setIsOpen(true);
      setGeneratedContent(null);
      setError(null);
      setHasGeneratedOnce(false);
      setPackageId("com.example.generated");
    }
  }));
  
  const handleCopyToClipboard = async () => {
    if (generatedContent) {
      try {
        await navigator.clipboard.writeText(generatedContent);
        toast({ title: "Code Copied!", description: `GeneratedScreen.kt copied to clipboard.` });
      } catch (err) {
        toast({ title: "Copy Failed", description: "Could not copy code to clipboard.", variant: "destructive" });
      }
    }
  };

  const handleDownload = () => {
    if (generatedContent) {
      const blob = new Blob([generatedContent], { type: 'text/plain;charset=utf-t' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'GeneratedScreen.kt';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    }
  };

  const canCopyOrDownload = !isLoading && generatedContent && !error;
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-headline">Generate Jetpack Compose Code</DialogTitle>
          <DialogDescription>
             Generate a single composable file or a complete project structure with Clean Architecture and MVI.
          </DialogDescription>
        </DialogHeader>
          
        <div className="flex-grow my-2 rounded-md border bg-muted/30 overflow-y-auto relative min-h-[300px]">
            {(isLoading || isProjectLoading) ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2">{isProjectLoading ? 'Generating full project...' : 'Generating code...'}</span>
              </div>
            ) : error ? (
                <div className="p-4">
                  <Alert variant="destructive"><AlertTitle>Error Generating</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>
                </div>
            ) : !hasGeneratedOnce ? (
              <div className="flex flex-col items-center justify-center h-full p-4 space-y-6">
                  <p className="text-muted-foreground text-center">Choose a generation option below.</p>
                  <div className="w-full max-w-sm space-y-1.5">
                    <Label htmlFor='package-id'>Package ID (for full project)</Label>
                    <Input id="package-id" value={packageId} onChange={e => setPackageId(e.target.value)} placeholder="com.example.myapp" />
                    <p className="text-xs text-muted-foreground">Used as the base package for the generated Android project.</p>
                  </div>
              </div>
            ) : (
                <CodeMirror value={generatedContent || ''} height="100%" extensions={[javaLang()]} theme={resolvedTheme === 'dark' ? githubDark : githubLight} readOnly className="text-sm h-full" basicSetup={{ lineNumbers: true, foldGutter: true }}/>
            )}
        </div>
        
        <DialogFooter className="sm:justify-between flex-wrap gap-2 pt-4 border-t shrink-0">
            <div className="flex gap-2">
                <Button variant="outline" onClick={handleGenerateSingleFile} disabled={isLoading || isProjectLoading}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileCode className="mr-2 h-4 w-4" />}
                    {hasGeneratedOnce ? 'Regenerate File' : 'Generate Composable File'}
                </Button>
                <Button variant="outline" onClick={handleGenerateFullProject} disabled={isLoading || isProjectLoading}>
                    {isProjectLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Package className="mr-2 h-4 w-4" />}
                    Generate Full Project (.zip)
                </Button>
            </div>
          <div className="flex gap-2">
            <Button onClick={handleCopyToClipboard} disabled={!canCopyOrDownload}>
              <Copy className="mr-2 h-4 w-4" /> Copy Code
            </Button>
            <Button onClick={handleDownload} disabled={!canCopyOrDownload}>
              <Download className="mr-2 h-4 w-4" /> Download .kt File
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

GenerateCodeModal.displayName = 'GenerateCodeModal';
