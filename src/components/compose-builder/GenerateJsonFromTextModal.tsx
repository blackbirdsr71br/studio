
'use client';

import React, { useState, useImperativeHandle, forwardRef, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useDesign } from '@/contexts/DesignContext';
import { generateJsonFromTextAction } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Sparkles, AlertTriangle } from 'lucide-react';
import { Label } from '@/components/ui/label';

export interface GenerateJsonFromTextModalRef {
  openModal: () => void;
}

export const GenerateJsonFromTextModal = forwardRef<GenerateJsonFromTextModalRef, {}>((props, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [composeCommands, setComposeCommands] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const { overwriteComponents } = useDesign();
  const { toast } = useToast();

  useImperativeHandle(ref, () => ({
    openModal: () => {
      setIsOpen(true);
      setComposeCommands(""); // Reset input on open
      setAiError(null); // Reset error on open
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
        const parsedJson = JSON.parse(result.designJson);
        const overwriteResult = overwriteComponents(parsedJson);
        if (overwriteResult.success) {
          toast({
            title: "UI Generated from Text!",
            description: "The design canvas has been updated.",
          });
          setIsOpen(false);
        } else {
          // If overwriteComponents fails, it means the JSON from AI was valid JSON but not valid per ModalJsonSchema
          // or failed some other internal validation in overwriteComponents.
          setAiError(overwriteResult.error || "Failed to apply generated JSON to the canvas. The structure might be invalid or inconsistent.");
          toast({
            title: "Generation Partially Successful",
            description: `AI generated JSON, but it could not be applied: ${overwriteResult.error || "Ensure the JSON structure is correct."}`,
            variant: "destructive",
          });
        }
      } else if (result.error) {
        // This error comes directly from the AI flow (e.g., input validation, AI model error, or refine on output schema failed)
        setAiError(result.error);
        toast({
          title: "AI Generation Failed",
          description: result.error,
          variant: "destructive",
        });
      } else {
        setAiError("An unexpected error occurred. The AI did not return JSON or an error message.");
         toast({
          title: "AI Generation Error",
          description: "The AI response was not in the expected format.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error in handleGenerateJson:", error);
      // This catch block handles errors from JSON.parse or unexpected issues in the try block itself.
      let message = "An unknown error occurred during the generation process.";
      if (error instanceof SyntaxError) {
        message = "The AI returned invalid JSON. Please try rephrasing your command or try again.";
      } else if (error instanceof Error) {
        message = error.message;
      }
      setAiError(message);
      toast({
        title: "Processing Error",
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
            <Sparkles className="mr-2 h-5 w-5 text-primary" />
            Generate UI from Text Commands
          </DialogTitle>
          <DialogDescription>
            Describe your UI using Jetpack Compose-like syntax (e.g., "Column with a Text 'Hello' and a Button 'Submit'").
            The AI will attempt to generate the corresponding UI components. The generated UI will replace the current canvas content.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-grow my-4 space-y-3 flex flex-col min-h-0">
          <div className="space-y-1.5">
            <Label htmlFor="compose-commands-input" className="text-sm">Compose Commands</Label>
            <Textarea
              id="compose-commands-input"
              value={composeCommands}
              onChange={(e) => setComposeCommands(e.target.value)}
              placeholder="e.g., Column(modifier = Modifier.padding(16.dp)) {\n  Text(\"Welcome!\", fontSize = 20.sp)\n  Button(text = \"Get Started\", onClick = {})\n}"
              className="min-h-[200px] max-h-[calc(80vh-250px)] text-sm font-code flex-grow"
              rows={10}
              disabled={isLoading}
            />
          </div>
          {aiError && (
            <div className="p-3 text-xs text-destructive-foreground bg-destructive rounded-md flex items-start gap-2">
               <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span className="flex-1 whitespace-pre-wrap leading-relaxed">{aiError}</span>
            </div>
          )}
        </div>
        <DialogFooter className="sm:justify-between flex-wrap gap-2">
            <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isLoading}>
                Cancel
            </Button>
          <Button onClick={handleGenerateJson} disabled={isLoading || !composeCommands.trim()}>
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            Generate & Replace UI
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

GenerateJsonFromTextModal.displayName = 'GenerateJsonFromTextModal';
