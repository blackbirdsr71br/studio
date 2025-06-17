
'use client';

import React, { useState, useImperativeHandle, forwardRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Palette, Loader2 } from 'lucide-react';
import { updateGlobalStylesheetAction, type GlobalThemeColorsInput } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';

const initialThemeColors: GlobalThemeColorsInput = {
  lightBackground: "#F5F5F5",
  lightForeground: "#0A0A0A",
  lightPrimary: "#3F51B5",
  lightAccent: "#9C27B0",
  darkBackground: "#262B33", // Updated as per previous request for a darker canvas
  darkForeground: "#FAFAFA",
  darkPrimary: "#A3AFFF",
  darkAccent: "#E0B0FF",
};

export interface ThemeEditorModalRef {
  openModal: () => void;
}

const ColorInputGroup: React.FC<{
  label: string;
  hexValue: string;
  onHexChange: (value: string) => void;
  idPrefix: string;
}> = ({ label, hexValue, onHexChange, idPrefix }) => (
  <div className="space-y-1.5">
    <Label htmlFor={`${idPrefix}-hex`} className="text-xs">{label} (HEX)</Label>
    <div className="flex items-center gap-2">
      <Input
        id={`${idPrefix}-color`}
        type="color"
        value={hexValue}
        onChange={(e) => onHexChange(e.target.value)}
        className="h-8 w-10 p-1"
        aria-label={`${label} color picker`}
      />
      <Input
        id={`${idPrefix}-hex`}
        type="text"
        value={hexValue}
        onChange={(e) => onHexChange(e.target.value)}
        placeholder="#RRGGBB"
        className="h-8 text-sm flex-grow"
        aria-label={`${label} hex value`}
      />
    </div>
  </div>
);

export const ThemeEditorModal = forwardRef<ThemeEditorModalRef, {}>((props, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const [isUpdatingStylesheet, setIsUpdatingStylesheet] = useState(false);

  // State for theme colors
  const [lightBackground, setLightBackground] = useState(initialThemeColors.lightBackground);
  const [lightForeground, setLightForeground] = useState(initialThemeColors.lightForeground);
  const [lightPrimary, setLightPrimary] = useState(initialThemeColors.lightPrimary);
  const [lightAccent, setLightAccent] = useState(initialThemeColors.lightAccent);

  const [darkBackground, setDarkBackground] = useState(initialThemeColors.darkBackground);
  const [darkForeground, setDarkForeground] = useState(initialThemeColors.darkForeground);
  const [darkPrimary, setDarkPrimary] = useState(initialThemeColors.darkPrimary);
  const [darkAccent, setDarkAccent] = useState(initialThemeColors.darkAccent);

  useImperativeHandle(ref, () => ({
    openModal: () => {
      // Optionally, you could fetch current values from CSS here if needed,
      // but for now, it opens with initial/last set values.
      setIsOpen(true);
    }
  }));

  const handleApplyStylesheet = async () => {
    setIsUpdatingStylesheet(true);
    const themeColors: GlobalThemeColorsInput = {
      lightBackground, lightForeground, lightPrimary, lightAccent,
      darkBackground, darkForeground, darkPrimary, darkAccent,
    };
    try {
      const result = await updateGlobalStylesheetAction(themeColors);
      if (result.success) {
        toast({
          title: "Stylesheet Updated",
          description: "App theme has been applied. The page might reload to reflect changes.",
        });
        // Consider closing the modal on success or providing a close button.
        // setIsOpen(false); 
      } else {
        toast({
          title: "Stylesheet Update Failed",
          description: result.error || "Could not update stylesheet.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred while updating the stylesheet.",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingStylesheet(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-headline flex items-center gap-2">
            <Palette className="w-5 h-5 text-primary" /> App Theme Editor
          </DialogTitle>
          <DialogDescription>
            Customize the base colors for the light and dark themes of this application.
            Changes will be applied to the global stylesheet.
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="flex-grow min-h-0"> {/* Removed my-4, pr-3 */}
          <div className="space-y-4 py-4 pr-4"> {/* Added py-4 and pr-4 here */}
            <div>
              <h4 className="text-sm font-medium mb-2 text-foreground">Light Theme</h4>
              <div className="space-y-3 p-1">
                <ColorInputGroup label="Background" hexValue={lightBackground} onHexChange={setLightBackground} idPrefix="light-bg" />
                <ColorInputGroup label="Foreground" hexValue={lightForeground} onHexChange={setLightForeground} idPrefix="light-fg" />
                <ColorInputGroup label="Primary" hexValue={lightPrimary} onHexChange={setLightPrimary} idPrefix="light-primary" />
                <ColorInputGroup label="Accent" hexValue={lightAccent} onHexChange={setLightAccent} idPrefix="light-accent" />
              </div>
            </div>

            <Separator />
            
            <div>
              <h4 className="text-sm font-medium mb-2 text-foreground">Dark Theme</h4>
              <div className="space-y-3 p-1">
                <ColorInputGroup label="Background" hexValue={darkBackground} onHexChange={setDarkBackground} idPrefix="dark-bg" />
                <ColorInputGroup label="Foreground" hexValue={darkForeground} onHexChange={setDarkForeground} idPrefix="dark-fg" />
                <ColorInputGroup label="Primary" hexValue={darkPrimary} onHexChange={setDarkPrimary} idPrefix="dark-primary" />
                <ColorInputGroup label="Accent" hexValue={darkAccent} onHexChange={setDarkAccent} idPrefix="dark-accent" />
              </div>
            </div>
          </div>
        </ScrollArea>
        
        <DialogFooter className="mt-auto pt-4"> {/* Ensure footer doesn't overlap scroll content due to ScrollArea's margin removal */}
          <Button onClick={handleApplyStylesheet} disabled={isUpdatingStylesheet} className="w-full">
            {isUpdatingStylesheet ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Palette className="mr-2 h-4 w-4" />}
            Apply & Update Stylesheet
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

ThemeEditorModal.displayName = 'ThemeEditorModal';
