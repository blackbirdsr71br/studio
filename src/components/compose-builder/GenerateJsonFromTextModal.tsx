
'use client';

import React, { useState, useImperativeHandle, forwardRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useDesign } from '@/contexts/DesignContext';
import { generateJsonFromTextAction } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Wand2, AlertTriangle } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';

export interface GenerateJsonFromTextModalRef {
  openModal: () => void;
}

export const GenerateJsonFromTextModal = forwardRef<GenerateJsonFromTextModalRef, {}>((props, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [composeCommands, setComposeCommands] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const { overwriteComponents } = useDesign();
  const { toast } = useToast();

  useImperativeHandle(ref, () => ({
    openModal: () => {
      setIsOpen(true);
      setComposeCommands('');
      setAiError(null);
    }
  }));

  const handleGenerateJson = useCallback(async () => {
    if (!composeCommands.trim()) {
      setAiError("Please enter some Jetpack Compose-like commands.");
      return;
    }
    setIsLoading(true);
    setAiError(null);
    try {
      const result = await generateJsonFromTextAction(composeCommands);
      if (result.designJson) {
        const overwriteResult = overwriteComponents(JSON.parse(result.designJson));
        if (overwriteResult.success) {
          toast({
            title: "UI Generated & Applied!",
            description: "The UI has been updated based on your text commands.",
          });
          setIsOpen(false);
        } else {
          setAiError(overwriteResult.error || "Failed to apply the generated JSON to the canvas.");
          toast({
            title: "Failed to Apply JSON",
            description: overwriteResult.error || "Could not apply the generated JSON. Please check the JSON structure if possible.",
            variant: "destructive",
          });
        }
      } else if (result.error) {
        setAiError(result.error);
        toast({
          title: "AI Generation Failed",
          description: result.error,
          variant: "destructive",
        });
      } else {
        setAiError("An unknown error occurred during generation.");
         toast({
          title: "AI Generation Failed",
          description: "An unknown error occurred.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error in handleGenerateJson:", error);
      const message = error instanceof Error ? error.message : "An unexpected error occurred.";
      setAiError(message);
      toast({
        title: "Generation Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [composeCommands, overwriteComponents, toast]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) setAiError(null); }}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-headline flex items-center">
            <Wand2 className="mr-2 h-5 w-5 text-primary" />
            Generate UI from Text
          </DialogTitle>
          <DialogDescription>
            Describe your UI using Jetpack Compose-like syntax. The AI will attempt to convert it into a design.
            For example: "Column { Text(\\"Hello\\"); Button(\\"Click Me\\") }"
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="flex-grow my-4 pr-1">
            <Textarea
            value={composeCommands}
            onChange={(e) => setComposeCommands(e.target.value)}
            placeholder="e.g., Column(modifier = Modifier.padding(16.dp)) { Text(\\"Welcome!\\"); Image(url = \\"logo.png\\") }"
            className="min-h-[200px] text-sm font-code resize-none"
            disabled={isLoading}
            />
        </ScrollArea>

        {aiError && (
          <div className="mb-3 p-3 text-xs text-destructive-foreground bg-destructive rounded-md flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span className="flex-1 whitespace-pre-wrap">{aiError}</span>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleGenerateJson} disabled={isLoading || !composeCommands.trim()}>
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Wand2 className="mr-2 h-4 w-4" />
            )}
            Generate Design
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

GenerateJsonFromTextModal.displayName = 'GenerateJsonFromTextModal';

