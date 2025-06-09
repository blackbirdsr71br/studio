
'use client';

import React, { useState, useImperativeHandle, forwardRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useDesign } from '@/contexts/DesignContext';
import { generateJetpackComposeCodeAction } from '@/app/actions';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Copy, Download } from 'lucide-react';

export interface GenerateCodeModalRef {
  openModal: () => void;
}

export const GenerateCodeModal = forwardRef<GenerateCodeModalRef, {}>((props, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { components, customComponentTemplates } = useDesign(); // Added customComponentTemplates
  const { toast } = useToast();

  useImperativeHandle(ref, () => ({
    openModal: () => {
      setIsOpen(true);
      handleGenerateCode();
    }
  }));

  const handleGenerateCode = useCallback(async () => {
    if (components.length === 0) {
      setGeneratedCode("No components on the canvas to generate code from.");
      return;
    }
    setIsLoading(true);
    setGeneratedCode(null);
    try {
      // Pass customComponentTemplates to the action
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
  }, [components, customComponentTemplates, toast]); // Added customComponentTemplates to dependencies

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

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-headline">Generated Jetpack Compose Code</DialogTitle>
          <DialogDescription>
            Copy or download the code below to use in your Android project.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-grow my-4 rounded-md border bg-muted/30">
          <pre className="p-4 text-sm font-code whitespace-pre-wrap break-all min-h-[200px]">
            {isLoading && (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2">Generating code...</span>
              </div>
            )}
            {!isLoading && generatedCode}
            {!isLoading && !generatedCode && components.length > 0 && (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                    Click "Regenerate" to get code.
                </div>
            )}
             {!isLoading && !generatedCode && components.length === 0 && (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                    Add components to the canvas to generate code.
                </div>
            )}
          </pre>
        </ScrollArea>
        <DialogFooter className="sm:justify-between flex-wrap gap-2">
          <Button variant="outline" onClick={() => { handleGenerateCode(); }} disabled={isLoading || components.length === 0}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Regenerate
          </Button>
          <div className="flex gap-2">
            <Button onClick={handleCopyToClipboard} disabled={isLoading || !generatedCode || generatedCode.startsWith("// Error") || generatedCode.startsWith("No components")}>
              <Copy className="mr-2 h-4 w-4" /> Copy
            </Button>
            <Button onClick={handleDownloadCode} disabled={isLoading || !generatedCode || generatedCode.startsWith("// Error") || generatedCode.startsWith("No components")}>
              <Download className="mr-2 h-4 w-4" /> Download .kt
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

GenerateCodeModal.displayName = 'GenerateCodeModal';
