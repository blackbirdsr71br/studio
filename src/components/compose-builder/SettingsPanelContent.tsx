
'use client';

import React, { useState, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Sun, Moon, Cog, Palette, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { updateGlobalStylesheetAction, type GlobalThemeColorsInput } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';

const initialThemeColors: GlobalThemeColorsInput = {
  lightBackground: "#F5F5F5", // approx 0 0% 96%
  lightForeground: "#0A0A0A", // approx 0 0% 3.9%
  lightPrimary: "#3F51B5",   // approx 231 48% 48%
  lightAccent: "#9C27B0",    // approx 291 64% 42%
  darkBackground: "#262B33",  // approx 220 10% 15% (updated)
  darkForeground: "#FAFAFA",  // approx 0 0% 98%
  darkPrimary: "#A3AFFF",    // approx 260 70% 65%
  darkAccent: "#E0B0FF",     // approx 300 70% 65%
};


export function SettingsPanelContent() {
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const [isUpdatingStylesheet, setIsUpdatingStylesheet] = useState(false);

  const [lightBackground, setLightBackground] = useState(initialThemeColors.lightBackground);
  const [lightForeground, setLightForeground] = useState(initialThemeColors.lightForeground);
  const [lightPrimary, setLightPrimary] = useState(initialThemeColors.lightPrimary);
  const [lightAccent, setLightAccent] = useState(initialThemeColors.lightAccent);

  const [darkBackground, setDarkBackground] = useState(initialThemeColors.darkBackground);
  const [darkForeground, setDarkForeground] = useState(initialThemeColors.darkForeground);
  const [darkPrimary, setDarkPrimary] = useState(initialThemeColors.darkPrimary);
  const [darkAccent, setDarkAccent] = useState(initialThemeColors.darkAccent);

  // In a real app, you might want to parse globals.css to prefill these,
  // but for simplicity, we'll use initial values.
  // useEffect to load current theme values from globals.css would be complex.

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
        // Optionally, trigger a reload if Next.js doesn't pick it up fast enough,
        // or instruct user. For now, rely on HMR or manual refresh.
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


  return (
    <div className="p-4 space-y-4 w-72"> {/* Increased width */}
      <h3 className="text-base font-medium font-headline text-sidebar-foreground flex items-center gap-2">
        <Palette className="w-5 h-5 text-sidebar-primary" /> App Theme Editor
      </h3>
      
      <Separator className="bg-sidebar-border" />

      <div>
        <h4 className="text-sm font-medium mb-2 text-sidebar-foreground">Light Theme</h4>
        <div className="space-y-3">
          <ColorInputGroup label="Background" hexValue={lightBackground} onHexChange={setLightBackground} idPrefix="light-bg" />
          <ColorInputGroup label="Foreground" hexValue={lightForeground} onHexChange={setLightForeground} idPrefix="light-fg" />
          <ColorInputGroup label="Primary" hexValue={lightPrimary} onHexChange={setLightPrimary} idPrefix="light-primary" />
          <ColorInputGroup label="Accent" hexValue={lightAccent} onHexChange={setLightAccent} idPrefix="light-accent" />
        </div>
      </div>

      <Separator className="bg-sidebar-border" />
      
      <div>
        <h4 className="text-sm font-medium mb-2 text-sidebar-foreground">Dark Theme</h4>
        <div className="space-y-3">
          <ColorInputGroup label="Background" hexValue={darkBackground} onHexChange={setDarkBackground} idPrefix="dark-bg" />
          <ColorInputGroup label="Foreground" hexValue={darkForeground} onHexChange={setDarkForeground} idPrefix="dark-fg" />
          <ColorInputGroup label="Primary" hexValue={darkPrimary} onHexChange={setDarkPrimary} idPrefix="dark-primary" />
          <ColorInputGroup label="Accent" hexValue={darkAccent} onHexChange={setDarkAccent} idPrefix="dark-accent" />
        </div>
      </div>
      
      <Separator className="bg-sidebar-border" />

      <Button onClick={handleApplyStylesheet} disabled={isUpdatingStylesheet} className="w-full bg-sidebar-primary hover:bg-sidebar-primary/90 text-sidebar-primary-foreground">
        {isUpdatingStylesheet ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Palette className="mr-2 h-4 w-4" />}
        Apply & Update Stylesheet
      </Button>
      
      <Separator className="bg-sidebar-border" />

      <h3 className="text-base font-medium font-headline text-sidebar-foreground">Interface Theme</h3>
      <RadioGroup value={theme} onValueChange={(value) => setTheme(value as typeof theme)}>
        <div className="flex items-center space-x-3 py-1">
          <RadioGroupItem value="light" id="theme-light" />
          <Label htmlFor="theme-light" className="flex items-center gap-2 text-sm text-sidebar-foreground cursor-pointer">
            <Sun className="w-4 h-4 text-sidebar-primary" /> Light
          </Label>
        </div>
        <div className="flex items-center space-x-3 py-1">
          <RadioGroupItem value="dark" id="theme-dark" />
          <Label htmlFor="theme-dark" className="flex items-center gap-2 text-sm text-sidebar-foreground cursor-pointer">
            <Moon className="w-4 h-4 text-sidebar-primary" /> Dark
          </Label>
        </div>
        <div className="flex items-center space-x-3 py-1">
          <RadioGroupItem value="system" id="theme-system" />
          <Label htmlFor="theme-system" className="flex items-center gap-2 text-sm text-sidebar-foreground cursor-pointer">
            <Cog className="w-4 h-4 text-sidebar-primary" /> System
          </Label>
        </div>
      </RadioGroup>
    </div>
  );
}
