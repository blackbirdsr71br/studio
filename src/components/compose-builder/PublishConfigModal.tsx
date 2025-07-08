'use client';

import React, { useState, useImperativeHandle, forwardRef, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, UploadCloud } from 'lucide-react';
import { useDesign } from '@/contexts/DesignContext';
import { publishToRemoteConfigAction } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { Switch } from "@/components/ui/switch";


export interface PublishConfigModalRef {
  openModal: () => void;
}

interface PublishConfigModalProps {
  // No props needed for now, could add onPublishSuccess callback later if needed
}

export const PublishConfigModal = forwardRef<PublishConfigModalRef, PublishConfigModalProps>((props, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [parameterKey, setParameterKey] = useState<string>("COMPOSE_DESIGN_JSON_V2");
  const [includeDefaultValues, setIncludeDefaultValues] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const { components, customComponentTemplates } = useDesign();
  const { toast } = useToast();

  useImperativeHandle(ref, () => ({
    openModal: () => {
      // Reset to default or last used key when opening, if desired
      // setParameterKey("COMPOSE_DESIGN_JSON_V2");
      setIsPublishing(false);
      setIncludeDefaultValues(false); // Reset switch on open
      setIsOpen(true);
    }
  }));

  const handlePublish = async () => {
    if (!parameterKey.trim()) {
      toast({
        title: "Validation Error",
        description: "Remote Config parameter key cannot be empty.",
        variant: "destructive",
      });
      return;
    }

    if (components.length === 0 || (components.length === 1 && components[0].id === 'default-root-lazy-column' && (!components[0].properties.children || components[0].properties.children.length === 0))) {
      toast({
        title: "Cannot Publish",
        description: "There are no user-added components on the canvas to publish.",
        variant: "destructive",
      });
      setIsOpen(false);
      return;
    }

    setIsPublishing(true);
    try {
      const result = await publishToRemoteConfigAction(components, customComponentTemplates, parameterKey.trim(), includeDefaultValues);
      if (result.success) {
        toast({
          title: "Publish Successful",
          description: `${result.message} (Version: ${result.version || 'N/A'})`,
        });
        setIsOpen(false); // Close modal on success
      } else {
        toast({
          title: "Publish Failed",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Publishing error:", error);
      toast({
        title: "Publish Error",
        description: error instanceof Error ? error.message : "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-headline flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-primary" /> Publish to Firebase Remote Config
          </DialogTitle>
          <DialogDescription>
            Enter the parameter key where the UI design JSON will be published.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="parameterKeyInput">Parameter Key</Label>
            <Input
              id="parameterKeyInput"
              value={parameterKey}
              onChange={(e) => setParameterKey(e.target.value)}
              placeholder="e.g., COMPOSE_DESIGN_JSON_V2"
              disabled={isPublishing}
            />
            <p className="text-xs text-muted-foreground">
              This key will be used to store your design in Firebase Remote Config.
            </p>
          </div>
          
          <div className="flex items-center justify-between pt-2">
            <Label htmlFor="publish-include-defaults" className="text-sm">
              Include Default Values
            </Label>
            <Switch
              id="publish-include-defaults"
              checked={includeDefaultValues}
              onCheckedChange={setIncludeDefaultValues}
              disabled={isPublishing}
              aria-label="Include default values in published JSON"
            />
          </div>
           <p className="text-xs text-muted-foreground -mt-3">
              Include properties with empty or default values in the published JSON.
            </p>
        </div>
        
        <DialogFooter className="gap-2 sm:gap-0">
          <DialogClose asChild>
            <Button variant="outline" disabled={isPublishing}>Cancel</Button>
          </DialogClose>
          <Button onClick={handlePublish} disabled={isPublishing}>
            {isPublishing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <UploadCloud className="mr-2 h-4 w-4" />
            )}
            Publish
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

PublishConfigModal.displayName = 'PublishConfigModal';
