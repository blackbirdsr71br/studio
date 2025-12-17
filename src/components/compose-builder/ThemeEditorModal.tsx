
'use client';

import React, { useState, useImperativeHandle, forwardRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Palette, Loader2, FileCode2, Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '../ui/separator';

// Represents the Material 3 ColorScheme properties
interface M3Colors {
  primary: string;
  onPrimary: string;
  primaryContainer: string;
  onPrimaryContainer: string;
  secondary: string;
  onSecondary: string;
  secondaryContainer: string;
  onSecondaryContainer: string;
  tertiary: string;
  onTertiary: string;
  tertiaryContainer: string;
  onTertiaryContainer: string;
  error: string;
  onError: string;
  errorContainer: string;
  onErrorContainer: string;
  background: string;
  onBackground: string;
  surface: string;
  onSurface: string;
  surfaceVariant: string;
  onSurfaceVariant: string;
  outline: string;
}

interface CustomColor {
    name: string;
    color: string;
}

// Default Material 3 baseline colors
const defaultLightColors: M3Colors = {
  primary: '#6750A4',
  onPrimary: '#FFFFFF',
  primaryContainer: '#EADDFF',
  onPrimaryContainer: '#21005D',
  secondary: '#625B71',
  onSecondary: '#FFFFFF',
  secondaryContainer: '#E8DEF8',
  onSecondaryContainer: '#1D192B',
  tertiary: '#7D5260',
  onTertiary: '#FFFFFF',
  tertiaryContainer: '#FFD8E4',
  onTertiaryContainer: '#31111D',
  error: '#B3261E',
  onError: '#FFFFFF',
  errorContainer: '#F9DEDC',
  onErrorContainer: '#410E0B',
  background: '#FFFBFE',
  onBackground: '#1C1B1F',
  surface: '#FFFBFE',
  onSurface: '#1C1B1F',
  surfaceVariant: '#E7E0EC',
  onSurfaceVariant: '#49454F',
  outline: '#79747E',
};

const defaultDarkColors: M3Colors = {
  primary: '#D0BCFF',
  onPrimary: '#381E72',
  primaryContainer: '#4F378B',
  onPrimaryContainer: '#EADDFF',
  secondary: '#CCC2DC',
  onSecondary: '#332D41',
  secondaryContainer: '#4A4458',
  onSecondaryContainer: '#E8DEF8',
  tertiary: '#EFB8C8',
  onTertiary: '#492532',
  tertiaryContainer: '#633B48',
  onTertiaryContainer: '#FFD8E4',
  error: '#F2B8B5',
  onError: '#601410',
  errorContainer: '#8C1D18',
  onErrorContainer: '#F9DEDC',
background: '#1C1B1F',
  onBackground: '#E6E1E5',
  surface: '#1C1B1F',
  onSurface: '#E6E1E5',
  surfaceVariant: '#49454F',
  onSurfaceVariant: '#CAC4D0',
  outline: '#938F99',
};


export interface ThemeEditorModalRef {
  openModal: () => void;
}

const ColorInput: React.FC<{ label: string; color: string; setColor: (color: string) => void; }> = ({ label, color, setColor }) => (
  <div className="flex items-center justify-between gap-4">
    <Label htmlFor={`color-${label}`} className="text-xs whitespace-nowrap capitalize">{label.replace(/([A-Z])/g, ' $1')}</Label>
    <div className="flex items-center gap-2">
      <Input
        id={`color-${label}-picker`}
        type="color"
        value={color}
        onChange={(e) => setColor(e.target.value)}
        className="h-7 w-8 p-1"
      />
      <Input
        id={`color-${label}-text`}
        type="text"
        value={color}
        onChange={(e) => setColor(e.target.value)}
        className="h-7 w-24 text-xs"
      />
    </div>
  </div>
);

const ColorGroup: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div>
        <h4 className="text-sm font-semibold mb-2 text-foreground/90">{title}</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 pl-2 border-l-2">
            {children}
        </div>
    </div>
);


export const ThemeEditorModal = forwardRef<ThemeEditorModalRef, {}>((props, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);

  const [lightColors, setLightColors] = useState<M3Colors>(defaultLightColors);
  const [darkColors, setDarkColors] = useState<M3Colors>(defaultDarkColors);

  const [customLightColors, setCustomLightColors] = useState<CustomColor[]>([]);
  const [customDarkColors, setCustomDarkColors] = useState<CustomColor[]>([]);

  useImperativeHandle(ref, () => ({
    openModal: () => {
      // Reset state to defaults when opening
      setLightColors(defaultLightColors);
      setDarkColors(defaultDarkColors);
      setCustomLightColors([]);
      setCustomDarkColors([]);
      setIsOpen(true);
    }
  }));

  const handleGenerateThemeFile = async () => {
    setIsGenerating(true);
    try {
        const toComposeColor = (hex: string) => `Color(0xFF${hex.substring(1).toUpperCase()})`;
        
        const lightColorScheme = Object.entries(lightColors).map(([name, color]) => `    ${name} = ${toComposeColor(color)}`).join(',\n');
        const darkColorScheme = Object.entries(darkColors).map(([name, color]) => `    ${name} = ${toComposeColor(color)}`).join(',\n');
        
        const customColorNames = customLightColors.map(c => c.name.toLowerCase());
        
        const customColorsInterface = customColorNames.length > 0
            ? `data class CustomColors(\n${customColorNames.map(name => `    val ${name}: Color`).join(',\n')}\n)`
            : 'data class CustomColors(\n    // No custom colors defined\n)';

        const localCustomColorsProvider = customColorNames.length > 0
            ? `staticCompositionLocalOf {\n    CustomColors(\n${customColorNames.map(name => `        ${name} = Color.Unspecified`).join(',\n')}\n    )\n}`
            : `staticCompositionLocalOf { CustomColors() }`;
        
        const customColorsExtension = customColorNames.length > 0
            ? `val MaterialTheme.customColors: CustomColors\n    @Composable\n    get() = LocalCustomColors.current`
            : '';
            
        const customLightColorsImpl = customLightColors.length > 0
            ? `private val CustomLightColors = CustomColors(\n${customLightColors.map(c => `    ${c.name.toLowerCase()} = ${toComposeColor(c.color)}`).join(',\n')}\n)`
            : 'private val CustomLightColors = CustomColors()';

        const customDarkColorsImpl = customDarkColors.length > 0
            ? `private val CustomDarkColors = CustomColors(\n${customDarkColors.map(c => `    ${c.name.toLowerCase()} = ${toComposeColor(c.color)}`).join(',\n')}\n)`
            : 'private val CustomDarkColors = CustomColors()';

        const themeFileContent = `
package com.example.app.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color

// Custom Colors - Generated by UI Builder
${customColorsInterface}

private val LocalCustomColors = ${localCustomColorsProvider}

${customColorsExtension}

private val LightColorScheme = lightColorScheme(
${lightColorScheme}
)

private val DarkColorScheme = darkColorScheme(
${darkColorScheme}
)

${customLightColorsImpl}

${customDarkColorsImpl}


@Composable
fun AppTheme(
    useDarkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colors = if (useDarkTheme) {
        DarkColorScheme
    } else {
        LightColorScheme
    }
    
    val customColors = if(useDarkTheme) {
        CustomDarkColors
    } else {
        CustomLightColors
    }

    CompositionLocalProvider(LocalCustomColors provides customColors) {
        MaterialTheme(
            colorScheme = colors,
            // You can also define typography and shapes here
            content = content
        )
    }
}
        `;

      const blob = new Blob([themeFileContent.trim()], { type: 'text/plain;charset=utf-8' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'Theme.kt';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);

      toast({
        title: "Theme File Generated",
        description: "Theme.kt has been downloaded.",
      });

    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred while generating the theme file.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };
  
    const handleAddCustomColor = () => {
        const lightName = `custom${customLightColors.length + 1}`;
        const darkName = `custom${customDarkColors.length + 1}`;

        setCustomLightColors([...customLightColors, { name: lightName, color: '#FFC0CB' }]);
        setCustomDarkColors([...customDarkColors, { name: darkName, color: '#806065'}]);
    };
    
    const handleUpdateCustomColor = (index: number, field: 'name' | 'color', value: string, theme: 'light' | 'dark') => {
        const setCustomColors = theme === 'light' ? setCustomLightColors : setCustomDarkColors;
        const customColors = theme === 'light' ? customLightColors : customDarkColors;

        const updated = [...customColors];
        updated[index] = { ...updated[index], [field]: value };
        setCustomColors(updated);
    };

    const handleRemoveCustomColor = (index: number) => {
        setCustomLightColors(customLightColors.filter((_, i) => i !== index));
        setCustomDarkColors(customDarkColors.filter((_, i) => i !== index));
    };

  const createColorStateUpdater = (theme: 'light' | 'dark') => {
    const setColors = theme === 'light' ? setLightColors : setDarkColors;
    const colors = theme === 'light' ? lightColors : darkColors;
    return (key: keyof M3Colors, value: string) => {
        setColors({ ...colors, [key]: value });
    };
  }

  const renderColorSection = (theme: 'light' | 'dark') => {
    const colors = theme === 'light' ? lightColors : darkColors;
    const setColor = createColorStateUpdater(theme);
    const customColors = theme === 'light' ? customLightColors : customDarkColors;

    return (
        <div className="space-y-6">
            <ColorGroup title="Primary">
                <ColorInput label="primary" color={colors.primary} setColor={(c) => setColor('primary', c)} />
                <ColorInput label="onPrimary" color={colors.onPrimary} setColor={(c) => setColor('onPrimary', c)} />
                <ColorInput label="primaryContainer" color={colors.primaryContainer} setColor={(c) => setColor('primaryContainer', c)} />
                <ColorInput label="onPrimaryContainer" color={colors.onPrimaryContainer} setColor={(c) => setColor('onPrimaryContainer', c)} />
            </ColorGroup>
            <ColorGroup title="Secondary">
                <ColorInput label="secondary" color={colors.secondary} setColor={(c) => setColor('secondary', c)} />
                <ColorInput label="onSecondary" color={colors.onSecondary} setColor={(c) => setColor('onSecondary', c)} />
                <ColorInput label="secondaryContainer" color={colors.secondaryContainer} setColor={(c) => setColor('secondaryContainer', c)} />
                <ColorInput label="onSecondaryContainer" color={colors.onSecondaryContainer} setColor={(c) => setColor('onSecondaryContainer', c)} />
            </ColorGroup>
            <ColorGroup title="Tertiary">
                <ColorInput label="tertiary" color={colors.tertiary} setColor={(c) => setColor('tertiary', c)} />
                <ColorInput label="onTertiary" color={colors.onTertiary} setColor={(c) => setColor('onTertiary', c)} />
                <ColorInput label="tertiaryContainer" color={colors.tertiaryContainer} setColor={(c) => setColor('tertiaryContainer', c)} />
                <ColorInput label="onTertiaryContainer" color={colors.onTertiaryContainer} setColor={(c) => setColor('onTertiaryContainer', c)} />
            </ColorGroup>
            <ColorGroup title="Error">
                <ColorInput label="error" color={colors.error} setColor={(c) => setColor('error', c)} />
                <ColorInput label="onError" color={colors.onError} setColor={(c) => setColor('onError', c)} />
                <ColorInput label="errorContainer" color={colors.errorContainer} setColor={(c) => setColor('errorContainer', c)} />
                <ColorInput label="onErrorContainer" color={colors.onErrorContainer} setColor={(c) => setColor('onErrorContainer', c)} />
            </ColorGroup>
             <ColorGroup title="Surface & Background">
                <ColorInput label="background" color={colors.background} setColor={(c) => setColor('background', c)} />
                <ColorInput label="onBackground" color={colors.onBackground} setColor={(c) => setColor('onBackground', c)} />
                <ColorInput label="surface" color={colors.surface} setColor={(c) => setColor('surface', c)} />
                <ColorInput label="onSurface" color={colors.onSurface} setColor={(c) => setColor('onSurface', c)} />
                <ColorInput label="surfaceVariant" color={colors.surfaceVariant} setColor={(c) => setColor('surfaceVariant', c)} />
                <ColorInput label="onSurfaceVariant" color={colors.onSurfaceVariant} setColor={(c) => setColor('onSurfaceVariant', c)} />
                <ColorInput label="outline" color={colors.outline} setColor={(c) => setColor('outline', c)} />
            </ColorGroup>
             <Separator />
            <div>
                <h3 className="text-base font-semibold mb-3 text-foreground">Custom Colors</h3>
                <div className="space-y-4">
                    {customColors.map((custom, index) => (
                        <div key={index} className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 p-3 border rounded-md relative">
                             <div className="flex items-center justify-between gap-4">
                                <Label htmlFor={`custom-name-${theme}-${index}`} className="text-xs">Name</Label>
                                <Input
                                    id={`custom-name-${theme}-${index}`}
                                    type="text"
                                    value={custom.name}
                                    onChange={(e) => handleUpdateCustomColor(index, 'name', e.target.value.replace(/[^a-zA-Z0-9]/g, ''), theme)}
                                    className="h-7 w-24 text-xs"
                                    placeholder="e.g., success"
                                />
                            </div>
                             <div className="flex items-center justify-between gap-4">
                                <Label htmlFor={`custom-color-${theme}-${index}`} className="text-xs">Color</Label>
                                <div className="flex items-center gap-2">
                                     <Input
                                        id={`custom-color-input-${theme}-${index}`}
                                        type="color"
                                        value={custom.color}
                                        onChange={(e) => handleUpdateCustomColor(index, 'color', e.target.value, theme)}
                                        className="h-7 w-8 p-1"
                                    />
                                    <Input
                                        id={`custom-color-hex-${theme}-${index}`}
                                        type="text"
                                        value={custom.color}
                                        onChange={(e) => handleUpdateCustomColor(index, 'color', e.target.value, theme)}
                                        className="h-7 w-24 text-xs"
                                    />
                                </div>
                            </div>
                            <div className="absolute -top-3 -right-2">
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10 rounded-full" onClick={() => handleRemoveCustomColor(index)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={handleAddCustomColor} className="w-full">
                        <Plus className="mr-2 h-4 w-4" /> Add Custom Color
                    </Button>
                </div>
            </div>
        </div>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-headline flex items-center gap-2">
            <Palette className="w-5 h-5 text-primary" /> Material 3 Theme Editor
          </DialogTitle>
          <DialogDescription>
            Define the light and dark color schemes for your Jetpack Compose app. The generated Theme.kt file can be used in your project.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="light" className="flex-grow flex flex-col min-h-0">
             <TabsList className="grid w-full grid-cols-2 mb-2">
                <TabsTrigger value="light">Light Scheme</TabsTrigger>
                <TabsTrigger value="dark">Dark Scheme</TabsTrigger>
            </TabsList>
            <div className="flex-grow min-h-0 -mr-4">
                <ScrollArea className="h-full pr-4">
                     <TabsContent value="light" className="mt-0">
                        <div className="p-1">{renderColorSection('light')}</div>
                    </TabsContent>
                    <TabsContent value="dark" className="mt-0">
                        <div className="p-1">{renderColorSection('dark')}</div>
                    </TabsContent>
                </ScrollArea>
            </div>
        </Tabs>
        
        <DialogFooter className="mt-auto pt-4 border-t shrink-0">
          <Button onClick={handleGenerateThemeFile} disabled={isGenerating} className="w-full">
            {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileCode2 className="mr-2 h-4 w-4" />}
            Generate and Download Theme.kt
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

ThemeEditorModal.displayName = 'ThemeEditorModal';
