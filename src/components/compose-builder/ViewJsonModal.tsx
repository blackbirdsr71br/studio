
'use client';

import React, { useState, useImperativeHandle, forwardRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useDesign } from '@/contexts/DesignContext';
import { getDesignAsJsonAction } from '@/app/actions';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Copy, Download } from 'lucide-react';

export interface ViewJsonModalRef {
  openModal: () => void;
}

export const ViewJsonModal = forwardRef<ViewJsonModalRef, {}>((props, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [designJson, setDesignJson] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { components, customComponentTemplates } = useDesign(); // Added customComponentTemplates
  const { toast } = useToast();

  useImperativeHandle(ref, () => ({
    openModal: () => {
      setIsOpen(true);
      handleFetchJson();
    }
  }));

  const handleFetchJson = useCallback(async () => {
    if (components.length === 0) {
      setDesignJson("[]"); // Empty array for no components
      return;
    }
    setIsLoading(true);
    setDesignJson(null);
    try {
      // Pass customComponentTemplates to the action
      const jsonString = await getDesignAsJsonAction(components, customComponentTemplates);
      setDesignJson(jsonString);
    } catch (error) {
      console.error("Error fetching design JSON:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch JSON.";
      setDesignJson(`// Error fetching JSON:\n// ${errorMessage}`);
      toast({
        title: "JSON Fetch Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [components, customComponentTemplates, toast]); // Added customComponentTemplates to dependencies

  const handleCopyToClipboard = async () => {
    if (designJson) {
      try {
        await navigator.clipboard.writeText(designJson);
        toast({
          title: "JSON Copied!",
          description: "Design JSON copied to clipboard.",
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
    if (designJson && !designJson.startsWith("// Error")) {
      const blob = new Blob([designJson], { type: 'application/json;charset=utf-8' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'design.json';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      toast({
        title: "JSON Downloaded",
        description: "design.json has started downloading.",
      });
    } else {
      toast({
        title: "Download Failed",
        description: "No valid JSON to download.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-headline">Design JSON</DialogTitle>
          <DialogDescription>
            The JSON representation of your current design.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-grow my-4 rounded-md border bg-muted/30">
          <pre className="p-4 text-sm font-code whitespace-pre-wrap break-all min-h-[200px]">
            {isLoading && (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2">Loading JSON...</span>
              </div>
            )}
            {!isLoading && designJson}
             {!isLoading && !designJson && components.length === 0 && (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                    Add components to the canvas to view JSON.
                </div>
            )}
          </pre>
        </ScrollArea>
        <DialogFooter className="sm:justify-end gap-2 flex-wrap">
           <Button variant="outline" onClick={() => setIsOpen(false)}>
            Close
          </Button>
          <Button onClick={handleCopyToClipboard} disabled={isLoading || !designJson || designJson.startsWith("// Error")}>
            <Copy className="mr-2 h-4 w-4" /> Copy
          </Button>
          <Button onClick={handleDownloadJson} disabled={isLoading || !designJson || designJson.startsWith("// Error")}>
            <Download className="mr-2 h-4 w-4" /> Download .json
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

ViewJsonModal.displayName = 'ViewJsonModal';
