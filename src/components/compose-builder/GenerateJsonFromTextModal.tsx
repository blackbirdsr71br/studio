
'use client';

import React, { useState, useImperativeHandle, forwardRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useDesign } from '@/contexts/DesignContext';
import { generateJsonFromTextAction } from '@/app/actions';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Wand2, AlertTriangle } from 'lucide-react';
import { Label } from "@/components/ui/label"; 

export interface GenerateJsonFromTextModalRef {
  openModal: () => void;
}

export const GenerateJsonFromTextModal = forwardRef<GenerateJsonFromTextModalRef, {}>((props, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [textCommands, setTextCommands] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const { overwriteComponents } = useDesign();
  const { toast } = useToast();

  useImperativeHandle(ref, () => ({
    openModal: () => {
      setIsOpen(true);
      setTextCommands(""); // Clear previous commands
      setAiError(null);
    }
  }));

  const handleGenerateAndApply = async () => {
    if (!textCommands.trim()) {
      toast({
        title: "Input Required",
        description: "Please enter some Jetpack Compose commands.",
        variant: "destructive",
      });
      return;
    }
    setIsLoading(true);
    setAiError(null);
    try {
      const result = await generateJsonFromTextAction(textCommands);
      if (result.error) {
        setAiError(result.error);
        toast({
          title: "AI Generation Failed",
          description: result.error.substring(0, 100) + (result.error.length > 100 ? "..." : ""),
          variant: "destructive",
        });
      } else if (result.designJson) {
        try {
          const parsedComponents = JSON.parse(result.designJson);
          const overwriteResult = overwriteComponents(parsedComponents); 

          if (overwriteResult.success) {
            toast({
              title: "Design Updated!",
              description: "The canvas has been updated based on your commands.",
            });
            setIsOpen(false); 
          } else {
            setAiError(overwriteResult.error || "Failed to apply the generated JSON to the canvas.");
            toast({
              title: "Application Error",
              description: overwriteResult.error || "Could not apply the generated JSON. Please check the AI output or schema.",
              variant: "destructive",
            });
          }
        } catch (parseError) {
          const message = parseError instanceof Error ? parseError.message : "Unknown error parsing JSON from AI.";
          console.error("Error parsing JSON from AI:", result.designJson, parseError);
          setAiError(`AI returned invalid JSON: ${message}`);
          toast({
            title: "Invalid JSON from AI",
            description: `The AI's response was not valid JSON. ${message.substring(0,100)}...`,
            variant: "destructive",
          });
        }
      } else {
        setAiError("The AI did not return any design JSON or an error.");
         toast({
          title: "Empty Response from AI",
          description: "The AI returned an empty response.",
          variant: "destructive",
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "An unexpected error occurred.";
      console.error("Error generating JSON from text:", error);
      setAiError(message);
      toast({
        title: "Generation Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) setAiError(null); }}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-headline flex items-center">
            <Wand2 className="mr-2 h-5 w-5" /> Generate UI from Text Commands
          </DialogTitle>
          <DialogDescription>
            Describe your UI using Jetpack Compose-like commands. The AI will attempt to convert it into a visual design.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-grow my-4 flex flex-col min-h-0">
          <Label htmlFor="compose-commands" className="mb-1.5 text-sm">Jetpack Compose Commands:</Label>
          <Textarea
            id="compose-commands"
            placeholder="e.g., Column {\n  Text(\"Hello World\")\n  Button(\"Click Me\")\n}"
            value={textCommands}
            onChange={(e) => setTextCommands(e.target.value)}
            className="min-h-[200px] flex-grow font-code text-xs"
            disabled={isLoading}
          />
        </div>

        {aiError && (
          <ScrollArea className="mt-1 mb-2 max-h-36">
            <div className="p-3 text-xs text-destructive-foreground bg-destructive rounded-md">
              <div className="flex items-start gap-2 mb-1">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <strong className="flex-1">Error:</strong>
              </div>
              <p className="whitespace-pre-wrap leading-relaxed pl-5">{aiError}</p>
            </div>
          </ScrollArea>
        )}

        <DialogFooter>
          <Button 
            onClick={handleGenerateAndApply} 
            disabled={isLoading || !textCommands.trim()}
          >
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
            Generate & Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

GenerateJsonFromTextModal.displayName = 'GenerateJsonFromTextModal';
