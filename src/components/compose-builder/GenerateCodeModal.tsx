

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

export interface GenerateCodeModalRef {
  openModal: () => void;
}

export const GenerateCodeModal = forwardRef<GenerateCodeModalRef, {}>((props, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
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
    setGeneratedCode(null);
    setHasGeneratedOnce(true);
    try {
      const result = await generateJetpackComposeCodeAction(activeDesign.components, customComponentTemplates);
      if (result.error) {
        setError(result.error);
        setGeneratedCode(null);
      } else if (result.files && result.files['GeneratedScreen.kt']) {
        setGeneratedCode(result.files['GeneratedScreen.kt']);
      } else {
        setError("Code generation returned an empty or invalid structure.");
        setGeneratedCode(null);
      }
    } catch (e) {
      console.error("Error generating screen code:", e);
      const errorMessage = e instanceof Error ? e.message : "Failed to generate screen code.";
      setError(errorMessage);
      setGeneratedCode(null);
    } finally {
      setIsLoading(false);
    }
  }, [activeDesign, customComponentTemplates]);

  useImperativeHandle(ref, () => ({
    openModal: () => {
      setIsOpen(true);
      setGeneratedCode(null);
      setError(null);
      setHasGeneratedOnce(false);
    }
  }));
  
  const handleCopyToClipboard = async () => {
    if (generatedCode) {
      try {
        await navigator.clipboard.writeText(generatedCode);
        toast({ title: "Code Copied!", description: `GeneratedScreen.kt copied to clipboard.` });
      } catch (err) {
        toast({ title: "Copy Failed", description: "Could not copy code to clipboard.", variant: "destructive" });
      }
    }
  };

  const handleDownload = () => {
    if (generatedCode) {
      const blob = new Blob([generatedCode], { type: 'text/plain;charset=utf-t' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'GeneratedScreen.kt';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    }
  };

  const canCopyOrDownload = !isLoading && generatedCode && !error;
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-headline">Generated Jetpack Compose Code</DialogTitle>
          <DialogDescription>
             Below is the generated Kotlin code for your design. You can copy it or download it as a .kt file.
          </DialogDescription>
        </DialogHeader>
          
        <div className="flex-grow my-2 rounded-md border bg-muted/30 overflow-y-auto relative min-h-[300px]">
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
                  <p className="text-muted-foreground">Click "Generate" to create the Kotlin Composable file.</p>
              </div>
            ) : (
                <CodeMirror value={generatedCode || ''} height="100%" extensions={[javaLang()]} theme={resolvedTheme === 'dark' ? githubDark : githubLight} readOnly className="text-sm h-full" basicSetup={{ lineNumbers: true, foldGutter: true }}/>
            )}
        </div>
        
        <DialogFooter className="sm:justify-between flex-wrap gap-2 pt-4 border-t shrink-0">
           <Button variant="outline" onClick={handleGenerateCode} disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
            {hasGeneratedOnce ? 'Regenerate' : 'Generate'}
          </Button>
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
