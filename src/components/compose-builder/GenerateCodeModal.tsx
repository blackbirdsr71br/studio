
'use client';

import React, { useState, useImperativeHandle, forwardRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useDesign } from '@/contexts/DesignContext';
import { generateJetpackComposeCodeAction } from '@/app/actions';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Copy, Download } from 'lucide-react';
import CodeMirror from '@uiw/react-codemirror';
import { java as javaLang } from '@codemirror/lang-java'; // Using java for Kotlin-like syntax
import { githubLight } from '@uiw/codemirror-theme-github';

export interface GenerateCodeModalRef {
  openModal: () => void;
}

export const GenerateCodeModal = forwardRef<GenerateCodeModalRef, {}>((props, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string>(""); 
  const [isLoading, setIsLoading] = useState(false);
  const { components, customComponentTemplates } = useDesign();
  const { toast } = useToast();

  const handleCodeChange = useCallback((value: string) => {
    setGeneratedCode(value);
  }, []);

  const handleGenerateCode = useCallback(async () => {
    const userComponentsExist = components.some(c => c.id !== 'default-root-lazy-column') || 
                               (components.find(c => c.id === 'default-root-lazy-column')?.properties.children?.length || 0) > 0;

    if (!userComponentsExist) {
      setGeneratedCode("No user components on the canvas to generate code from.");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setGeneratedCode(""); // Clear previous code before generating new
    try {
      const code = await generateJetpackComposeCodeAction(components, customComponentTemplates);
      setGeneratedCode(code);
    } catch (error) {
      console.error("Error generating code:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to generate code.";
      setGeneratedCode(`// Error generating code:\n// ${errorMessage}`);
      toast({
        title: "Code Generation Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [components, customComponentTemplates, toast]);

  useImperativeHandle(ref, () => ({
    openModal: () => {
      setIsOpen(true);
      const userComponentsExist = components.some(c => c.id !== 'default-root-lazy-column') || 
                                 (components.find(c => c.id === 'default-root-lazy-column')?.properties.children?.length || 0) > 0;

      if (userComponentsExist) {
        // If generatedCode is empty or is a placeholder/error message, then generate new code.
        // Otherwise, keep the existing (potentially edited) code.
        if (!generatedCode || generatedCode.startsWith("// Error") || generatedCode.startsWith("No user components on the canvas")) {
          handleGenerateCode(); 
        } else {
          // Valid code (potentially with user edits) already exists, don't regenerate.
          setIsLoading(false); // Ensure loading state is off
        }
      } else {
        // No components, set placeholder message
        setGeneratedCode("No user components on the canvas to generate code from.");
        setIsLoading(false); // Ensure loading state is off
      }
    }
  }));

  const handleCopyToClipboard = async () => {
    if (generatedCode) {
      try {
        await navigator.clipboard.writeText(generatedCode);
        toast({
          title: "Code Copied!",
          description: "Jetpack Compose code copied to clipboard.",
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
    if (generatedCode && !generatedCode.startsWith("// Error") && !generatedCode.startsWith("No components")) {
      const blob = new Blob([generatedCode], { type: 'text/plain;charset=utf-8' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'GeneratedComposeScreen.kt';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      toast({
        title: "Code Downloaded",
        description: "GeneratedComposeScreen.kt has started downloading.",
      });
    } else {
      toast({
        title: "Download Failed",
        description: "No valid code to download.",
        variant: "destructive",
      });
    }
  };
  
  const canPerformActions = !isLoading && generatedCode && !generatedCode.startsWith("// Error") && !generatedCode.startsWith("No components");
  const userComponentsExistForRegeneration = components.some(c => c.id !== 'default-root-lazy-column') || 
                                           (components.find(c => c.id === 'default-root-lazy-column')?.properties.children?.length || 0) > 0;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-headline">Generated Jetpack Compose Code</DialogTitle>
          <DialogDescription>
            Edit, copy, or download the code below to use in your Android project.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-grow my-4 rounded-md border bg-muted/30 overflow-hidden min-h-[300px]">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2">Generating code...</span>
            </div>
          ) : (
            <CodeMirror
              value={generatedCode}
              height="100%" 
              extensions={[javaLang()]}
              theme={githubLight}
              onChange={handleCodeChange}
              className="text-sm flex-grow h-full"
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
        <DialogFooter className="sm:justify-between flex-wrap gap-2">
          <Button variant="outline" onClick={handleGenerateCode} disabled={isLoading || !userComponentsExistForRegeneration}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
