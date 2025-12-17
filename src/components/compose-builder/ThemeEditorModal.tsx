
'use client';

import React, { useState, useImperativeHandle, forwardRef, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Palette, Loader2, FileCode2, Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '../ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';

// --- TYPE DEFINITIONS ---

interface M3Colors {
  primary: string; onPrimary: string; primaryContainer: string; onPrimaryContainer: string;
  secondary: string; onSecondary: string; secondaryContainer: string; onSecondaryContainer: string;
  tertiary: string; onTertiary: string; tertiaryContainer: string; onTertiaryContainer: string;
  error: string; onError: string; errorContainer: string; onErrorContainer: string;
  background: string; onBackground: string;
  surface: string; onSurface: string; surfaceVariant: string; onSurfaceVariant: string;
  outline: string;
}

interface CustomColor { name: string; color: string; }

interface TextStyle { fontFamily: string; fontWeight: 'Normal' | 'Medium' | 'Bold'; fontSize: number; }

interface M3Typography {
  displayLarge: TextStyle;
  headlineMedium: TextStyle;
  titleMedium: TextStyle;
  bodyLarge: TextStyle;
  labelSmall: TextStyle;
}

interface M3Shapes { small: number; medium: number; large: number; }

// --- DEFAULTS ---

const defaultLightColors: M3Colors = {
  primary: '#6750A4', onPrimary: '#FFFFFF', primaryContainer: '#EADDFF', onPrimaryContainer: '#21005D',
  secondary: '#625B71', onSecondary: '#FFFFFF', secondaryContainer: '#E8DEF8', onSecondaryContainer: '#1D192B',
  tertiary: '#7D5260', onTertiary: '#FFFFFF', tertiaryContainer: '#FFD8E4', onTertiaryContainer: '#31111D',
  error: '#B3261E', onError: '#FFFFFF', errorContainer: '#F9DEDC', onErrorContainer: '#410E0B',
  background: '#FFFBFE', onBackground: '#1C1B1F',
  surface: '#FFFBFE', onSurface: '#1C1B1F', surfaceVariant: '#E7E0EC', onSurfaceVariant: '#49454F',
  outline: '#79747E',
};

const defaultDarkColors: M3Colors = {
  primary: '#D0BCFF', onPrimary: '#381E72', primaryContainer: '#4F378B', onPrimaryContainer: '#EADDFF',
  secondary: '#CCC2DC', onSecondary: '#332D41', secondaryContainer: '#4A4458', onSecondaryContainer: '#E8DEF8',
  tertiary: '#EFB8C8', onTertiary: '#492532', tertiaryContainer: '#633B48', onTertiaryContainer: '#FFD8E4',
  error: '#F2B8B5', onError: '#601410', errorContainer: '#8C1D18', onErrorContainer: '#F9DEDC',
  background: '#1C1B1F', onBackground: '#E6E1E5',
  surface: '#1C1B1F', onSurface: '#E6E1E5', surfaceVariant: '#49454F', onSurfaceVariant: '#CAC4D0',
  outline: '#938F99',
};

const defaultTypography: M3Typography = {
    displayLarge: { fontFamily: 'Roboto', fontWeight: 'Normal', fontSize: 57 },
    headlineMedium: { fontFamily: 'Roboto', fontWeight: 'Normal', fontSize: 28 },
    titleMedium: { fontFamily: 'Roboto', fontWeight: 'Medium', fontSize: 16 },
    bodyLarge: { fontFamily: 'Roboto', fontWeight: 'Normal', fontSize: 16 },
    labelSmall: { fontFamily: 'Roboto', fontWeight: 'Medium', fontSize: 11 },
};

const defaultShapes: M3Shapes = { small: 8, medium: 12, large: 16, };

const availableFonts = [ 'Roboto', 'Lato', 'Oswald', 'Merriweather', 'Playfair Display', 'Source Code Pro', 'Poppins', 'Montserrat', 'Raleway', 'Nunito', 'Open Sans', 'EB Garamond', 'DM Sans', 'Inter' ];
const availableFontWeights: ('Normal' | 'Medium' | 'Bold')[] = ['Normal', 'Medium', 'Bold'];

// --- SUB-COMPONENTS ---

const ColorInput: React.FC<{ label: string; color: string; setColor: (color: string) => void; }> = ({ label, color, setColor }) => (
    <div className="flex items-center justify-between gap-4">
        <Label htmlFor={`color-${label}`} className="text-xs whitespace-nowrap capitalize">{label.replace(/([A-Z])/g, ' $1')}</Label>
        <div className="flex items-center gap-2">
            <Input id={`color-${label}-picker`} type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-7 w-8 p-1"/>
            <Input id={`color-${label}-text`} type="text" value={color} onChange={(e) => setColor(e.target.value)} className="h-7 w-24 text-xs"/>
        </div>
    </div>
);

const ColorGroup: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div>
        <h4 className="text-sm font-semibold mb-2 text-foreground/90">{title}</h4>
        <div className="grid grid-cols-1 gap-x-6 gap-y-3 pl-2 border-l-2">{children}</div>
    </div>
);

const TypographyEditor: React.FC<{ typography: M3Typography, setTypography: (t: M3Typography) => void }> = ({ typography, setTypography }) => {
    const handleStyleChange = (style: keyof M3Typography, field: keyof TextStyle, value: string | number) => {
        setTypography({
            ...typography,
            [style]: { ...typography[style], [field]: value }
        });
    };

    return (
        <div className="space-y-6">
            {(Object.keys(typography) as Array<keyof M3Typography>).map(styleKey => (
                <div key={styleKey} className="p-3 border rounded-md">
                     <h4 className="text-sm font-semibold mb-2 capitalize">{styleKey.replace(/([A-Z])/g, ' $1')}</h4>
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label className="text-xs">Font Family</Label>
                             <Select value={typography[styleKey].fontFamily} onValueChange={(v) => handleStyleChange(styleKey, 'fontFamily', v)}>
                                <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                                <SelectContent>{availableFonts.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div>
                             <Label className="text-xs">Font Weight</Label>
                             <Select value={typography[styleKey].fontWeight} onValueChange={(v) => handleStyleChange(styleKey, 'fontWeight', v)}>
                                <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                                <SelectContent>{availableFontWeights.map(w => <SelectItem key={w} value={w}>{w}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                         <div className="col-span-2">
                             <Label className="text-xs">Font Size ({typography[styleKey].fontSize} sp)</Label>
                             <Slider min={8} max={96} step={1} value={[typography[styleKey].fontSize]} onValueChange={(v) => handleStyleChange(styleKey, 'fontSize', v[0])}/>
                         </div>
                     </div>
                </div>
            ))}
        </div>
    );
};

const ShapeEditor: React.FC<{ shapes: M3Shapes, setShapes: (s: M3Shapes) => void }> = ({ shapes, setShapes }) => (
    <div className="space-y-6">
        {(Object.keys(shapes) as Array<keyof M3Shapes>).map(shapeKey => (
            <div key={shapeKey}>
                <Label className="text-sm capitalize">{shapeKey} Corner ({shapes[shapeKey]} dp)</Label>
                <Slider min={0} max={32} step={1} value={[shapes[shapeKey]]} onValueChange={(v) => setShapes({...shapes, [shapeKey]: v[0]})}/>
            </div>
        ))}
    </div>
);

const ThemePreview: React.FC<{ colors: M3Colors; customColors: CustomColor[], typography: M3Typography, shapes: M3Shapes }> = ({ colors, customColors, typography, shapes }) => {
    const getFontFamilyVariable = (fontName: string) => `var(--font-${fontName.toLowerCase().replace(/ /g, '-')})`;
    const getFontWeightValue = (weight: 'Normal' | 'Medium' | 'Bold') => (weight === 'Normal' ? 400 : weight === 'Medium' ? 500 : 700);

    const dynamicStyles = useMemo(() => {
        const style: React.CSSProperties = {
            '--preview-background': colors.background, '--preview-on-background': colors.onBackground,
            '--preview-surface': colors.surface, '--preview-on-surface': colors.onSurface,
            '--preview-surface-variant': colors.surfaceVariant, '--preview-on-surface-variant': colors.onSurfaceVariant,
            '--preview-primary': colors.primary, '--preview-on-primary': colors.onPrimary,
            '--preview-primary-container': colors.primaryContainer, '--preview-on-primary-container': colors.onPrimaryContainer,
            '--preview-secondary-container': colors.secondaryContainer, '--preview-on-secondary-container': colors.onSecondaryContainer,
            '--preview-tertiary-container': colors.tertiaryContainer, '--preview-on-tertiary-container': colors.onTertiaryContainer,
            '--preview-outline': colors.outline,
            '--shape-small': `${shapes.small}px`,
            '--shape-medium': `${shapes.medium}px`,
            '--shape-large': `${shapes.large}px`,
        } as React.CSSProperties;

        customColors.forEach(cc => { if (cc.name) { style[`--preview-custom-${cc.name.toLowerCase()}`] = cc.color; }});

        (Object.keys(typography) as Array<keyof M3Typography>).forEach(key => {
            const textStyle = typography[key];
            style[`--font-family-${key}`] = getFontFamilyVariable(textStyle.fontFamily);
            style[`--font-weight-${key}`] = getFontWeightValue(textStyle.fontWeight);
            style[`--font-size-${key}`] = `${textStyle.fontSize}px`;
        });
        return style;
    }, [colors, customColors, typography, shapes]);

    return (
        <div className="w-full h-full p-4 rounded-lg transition-colors duration-200" style={{ backgroundColor: 'var(--preview-background)', color: 'var(--preview-on-background)', ...dynamicStyles }}>
            <h3 style={{ 
                fontFamily: 'var(--font-family-headlineMedium)', 
                fontWeight: 'var(--font-weight-headlineMedium)', 
                fontSize: 'var(--font-size-headlineMedium)'
            }}
                className="mb-4 text-center">Live Preview</h3>
            
            <Card style={{ 
                borderRadius: 'var(--shape-large)', 
                borderColor: 'var(--preview-outline)', 
                backgroundColor: 'var(--preview-surface)',
                color: 'var(--preview-on-surface)',
            }}>
                <CardHeader>
                    <CardTitle style={{
                        fontFamily: 'var(--font-family-titleMedium)', 
                        fontWeight: 'var(--font-weight-titleMedium)', 
                        fontSize: 'var(--font-size-titleMedium)',
                        color: 'var(--preview-on-surface)',
                    }}>
                        Example Card
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="p-4 rounded-md" style={{backgroundColor: 'var(--preview-surface-variant)', color: 'var(--preview-on-surface-variant)'}}>
                         <p style={{
                            fontFamily: 'var(--font-family-bodyLarge)',
                            fontWeight: 'var(--font-weight-bodyLarge)',
                            fontSize: 'var(--font-size-bodyLarge)',
                         }}>This is a sample card to preview the theme on a surface-variant color.</p>
                    </div>

                    <div className="flex flex-col gap-2">
                         <Button style={{ backgroundColor: 'var(--preview-primary)', color: 'var(--preview-on-primary)', borderRadius: 'var(--shape-small)' }}>
                             Primary
                         </Button>
                         <Button style={{ backgroundColor: 'var(--preview-secondary-container)', color: 'var(--preview-on-secondary-container)', borderRadius: 'var(--shape-small)' }}>
                             Secondary
                         </Button>
                         <Button style={{ backgroundColor: 'var(--preview-tertiary-container)', color: 'var(--preview-on-tertiary-container)', borderRadius: 'var(--shape-small)' }}>
                             Tertiary
                         </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};



// --- MAIN COMPONENT ---

export interface ThemeEditorModalRef { openModal: () => void; }

export const ThemeEditorModal = forwardRef<ThemeEditorModalRef, {}>((props, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeThemeTab, setActiveThemeTab] = useState<'light' | 'dark'>('light');
  const [activeEditorTab, setActiveEditorTab] = useState<'colors' | 'typography' | 'shapes'>('colors');
  
  const [lightColors, setLightColors] = useState<M3Colors>(defaultLightColors);
  const [darkColors, setDarkColors] = useState<M3Colors>(defaultDarkColors);
  const [customLightColors, setCustomLightColors] = useState<CustomColor[]>([]);
  const [customDarkColors, setCustomDarkColors] = useState<CustomColor[]>([]);
  const [typography, setTypography] = useState<M3Typography>(defaultTypography);
  const [shapes, setShapes] = useState<M3Shapes>(defaultShapes);

  useImperativeHandle(ref, () => ({
    openModal: () => {
      setLightColors(defaultLightColors); setDarkColors(defaultDarkColors);
      setCustomLightColors([]); setCustomDarkColors([]);
      setTypography(defaultTypography); setShapes(defaultShapes);
      setActiveThemeTab('light'); setActiveEditorTab('colors');
      setIsOpen(true);
    }
  }));

  const handleGenerateThemeFile = async () => {
    setIsGenerating(true);
    try {
        const toComposeColor = (hex: string) => `Color(0xFF${hex.substring(1).toUpperCase()})`;
        const toFontWeight = (w: 'Normal' | 'Medium' | 'Bold') => w === 'Normal' ? 'FontWeight.Normal' : w === 'Medium' ? 'FontWeight.Medium' : 'FontWeight.Bold';

        const lightColorScheme = Object.entries(lightColors).map(([n, c]) => `    ${n} = ${toComposeColor(c)}`).join(',\n');
        const darkColorScheme = Object.entries(darkColors).map(([n, c]) => `    ${n} = ${toComposeColor(c)}`).join(',\n');
        const typographyStyles = (Object.keys(typography) as Array<keyof M3Typography>).map(key => `    ${key} = TextStyle(\n        fontFamily = ${typography[key].fontFamily},\n        fontWeight = ${toFontWeight(typography[key].fontWeight)},\n        fontSize = ${typography[key].fontSize}.sp\n    )`).join(',\n');
        const shapesDef = (Object.keys(shapes) as Array<keyof M3Shapes>).map(key => `    ${key} = RoundedCornerShape(${shapes[key]}.dp)`).join(',\n');
        
        const themeFileContent = `
package com.example.app.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

// Font Families (assuming you have them in res/font)
// val Inter = FontFamily(...)

private val LightColorScheme = lightColorScheme(\n${lightColorScheme}\n)
private val DarkColorScheme = darkColorScheme(\n${darkColorScheme}\n)

private val AppShapes = Shapes(\n${shapesDef}\n)

private val AppTypography = Typography(\n${typographyStyles}\n)

@Composable
fun AppTheme(useDarkTheme: Boolean = isSystemInDarkTheme(), content: @Composable () -> Unit) {
    val colors = if (useDarkTheme) DarkColorScheme else LightColorScheme
    MaterialTheme(colorScheme = colors, typography = AppTypography, shapes = AppShapes, content = content)
}`;

      const blob = new Blob([themeFileContent.trim()], { type: 'text/plain;charset=utf-8' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'Theme.kt';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      toast({ title: "Theme File Generated", description: "Theme.kt has been downloaded." });

    } catch (error) {
      toast({ title: "Error", description: "An unexpected error occurred while generating the theme file.", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };
  
    const handleAddCustomColor = () => {
        const nextIndex = customLightColors.length + 1;
        const newName = `custom${nextIndex}`;
        setCustomLightColors([...customLightColors, { name: newName, color: '#FFC0CB' }]);
        setCustomDarkColors([...customDarkColors, { name: newName, color: '#806065'}]);
    };
    
    const handleUpdateCustomColor = (index: number, field: 'name' | 'color', value: string, theme: 'light' | 'dark') => {
        if (theme === 'light') {
            const updated = [...customLightColors];
            const oldName = updated[index].name;
            updated[index] = { ...updated[index], [field]: value };
            setCustomLightColors(updated);
            if (field === 'name') {
                const darkIndex = customDarkColors.findIndex(c => c.name === oldName);
                if(darkIndex !== -1) { const updatedDark = [...customDarkColors]; updatedDark[darkIndex].name = value; setCustomDarkColors(updatedDark); }
            }
        } else {
            const updated = [...customDarkColors]; updated[index] = { ...updated[index], [field]: value }; setCustomDarkColors(updated);
        }
    };

    const handleRemoveCustomColor = (index: number) => {
        const colorToRemove = customLightColors[index];
        setCustomLightColors(customLightColors.filter((_, i) => i !== index));
        setCustomDarkColors(customDarkColors.filter((c) => c.name !== colorToRemove.name));
    };

  const createColorStateUpdater = (theme: 'light' | 'dark') => {
    const setColors = theme === 'light' ? setLightColors : setDarkColors;
    const colors = theme === 'light' ? lightColors : darkColors;
    return (key: keyof M3Colors, value: string) => { setColors({ ...colors, [key]: value }); };
  }

  const renderColorSection = (theme: 'light' | 'dark') => {
    const colors = theme === 'light' ? lightColors : darkColors;
    const setColor = createColorStateUpdater(theme);
    const currentCustomColors = theme === 'light' ? customLightColors : customDarkColors;

    return (
        <div className="space-y-6">
            <ColorGroup title="Primary"><ColorInput label="primary" color={colors.primary} setColor={(c) => setColor('primary', c)} /><ColorInput label="onPrimary" color={colors.onPrimary} setColor={(c) => setColor('onPrimary', c)} /><ColorInput label="primaryContainer" color={colors.primaryContainer} setColor={(c) => setColor('primaryContainer', c)} /><ColorInput label="onPrimaryContainer" color={colors.onPrimaryContainer} setColor={(c) => setColor('onPrimaryContainer', c)} /></ColorGroup>
            <ColorGroup title="Secondary"><ColorInput label="secondary" color={colors.secondary} setColor={(c) => setColor('secondary', c)} /><ColorInput label="onSecondary" color={colors.onSecondary} setColor={(c) => setColor('onSecondary', c)} /><ColorInput label="secondaryContainer" color={colors.secondaryContainer} setColor={(c) => setColor('secondaryContainer', c)} /><ColorInput label="onSecondaryContainer" color={colors.onSecondaryContainer} setColor={(c) => setColor('onSecondaryContainer', c)} /></ColorGroup>
            <ColorGroup title="Tertiary"><ColorInput label="tertiary" color={colors.tertiary} setColor={(c) => setColor('tertiary', c)} /><ColorInput label="onTertiary" color={colors.onTertiary} setColor={(c) => setColor('onTertiary', c)} /><ColorInput label="tertiaryContainer" color={colors.tertiaryContainer} setColor={(c) => setColor('tertiaryContainer', c)} /><ColorInput label="onTertiaryContainer" color={colors.onTertiaryContainer} setColor={(c) => setColor('onTertiaryContainer', c)} /></ColorGroup>
            <ColorGroup title="Error"><ColorInput label="error" color={colors.error} setColor={(c) => setColor('error', c)} /><ColorInput label="onError" color={colors.onError} setColor={(c) => setColor('onError', c)} /><ColorInput label="errorContainer" color={colors.errorContainer} setColor={(c) => setColor('errorContainer', c)} /><ColorInput label="onErrorContainer" color={colors.onErrorContainer} setColor={(c) => setColor('onErrorContainer', c)} /></ColorGroup>
            <ColorGroup title="Surface & Background"><ColorInput label="background" color={colors.background} setColor={(c) => setColor('background', c)} /><ColorInput label="onBackground" color={colors.onBackground} setColor={(c) => setColor('onBackground', c)} /><ColorInput label="surface" color={colors.surface} setColor={(c) => setColor('surface', c)} /><ColorInput label="onSurface" color={colors.onSurface} setColor={(c) => setColor('onSurface', c)} /><ColorInput label="surfaceVariant" color={colors.surfaceVariant} setColor={(c) => setColor('surfaceVariant', c)} /><ColorInput label="onSurfaceVariant" color={colors.onSurfaceVariant} setColor={(c) => setColor('onSurfaceVariant', c)} /><ColorInput label="outline" color={colors.outline} setColor={(c) => setColor('outline', c)} /></ColorGroup>
            <Separator />
            <div>
                <h3 className="text-base font-semibold mb-3 text-foreground">Custom Colors</h3>
                <div className="space-y-4">
                    {customLightColors.map((custom, index) => {
                        const currentCustomColor = theme === 'light' ? customLightColors[index] : customDarkColors.find(c => c.name === custom.name);
                        return (
                          <div key={index} className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 p-3 border rounded-md relative">
                              <div className="flex items-center justify-between gap-4">
                                <Label htmlFor={`custom-name-${theme}-${index}`} className="text-xs">Name</Label>
                                <Input id={`custom-name-${theme}-${index}`} type="text" value={custom.name} onChange={(e) => handleUpdateCustomColor(index, 'name', e.target.value.replace(/[^a-zA-Z0-9]/g, ''), 'light')} className="h-7 w-24 text-xs" placeholder="e.g., success" disabled={theme === 'dark'}/>
                            </div>
                              <div className="flex items-center justify-between gap-4">
                                <Label htmlFor={`custom-color-${theme}-${index}`} className="text-xs">Color</Label>
                                <div className="flex items-center gap-2">
                                      <Input id={`custom-color-input-${theme}-${index}`} type="color" value={currentCustomColor?.color || ''} onChange={(e) => handleUpdateCustomColor(index, 'color', e.target.value, theme)} className="h-7 w-8 p-1"/>
                                    <Input id={`custom-color-hex-${theme}-${index}`} type="text" value={currentCustomColor?.color || ''} onChange={(e) => handleUpdateCustomColor(index, 'color', e.target.value, theme)} className="h-7 w-24 text-xs"/>
                                </div>
                            </div>
                            {theme === 'light' && ( <div className="absolute -top-3 -right-2"><Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10 rounded-full" onClick={() => handleRemoveCustomColor(index)}><Trash2 className="h-4 w-4" /></Button></div>)}
                        </div>
                        )
                    })}
                    <Button variant="outline" size="sm" onClick={handleAddCustomColor} className="w-full"><Plus className="mr-2 h-4 w-4" /> Add Custom Color</Button>
                </div>
            </div>
        </div>
    );
  }

  const currentColorsForPreview = activeThemeTab === 'light' ? lightColors : darkColors;
  const currentCustomColorsForPreview = activeThemeTab === 'light' ? customLightColors : customDarkColors;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-6xl w-[90vw] h-[90vh] flex flex-col">
        <DialogHeader><DialogTitle className="font-headline flex items-center gap-2"><Palette className="w-5 h-5 text-primary" /> Material 3 Theme Editor</DialogTitle><DialogDescription>Define colors, typography, and shapes for your Jetpack Compose app.</DialogDescription></DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 flex-grow min-h-0 gap-6">
            <div className="flex flex-col min-h-0 border-r pr-4">
                 <Tabs value={activeEditorTab} onValueChange={(v) => setActiveEditorTab(v as any)} className="flex-grow flex flex-col min-h-0">
                    <TabsList className="grid w-full grid-cols-3 mb-2">
                        <TabsTrigger value="colors">Colors</TabsTrigger>
                        <TabsTrigger value="typography">Typography</TabsTrigger>
                        <TabsTrigger value="shapes">Shapes</TabsTrigger>
                    </TabsList>
                    <ScrollArea className="flex-grow min-h-0 -mr-4">
                        <div className="p-1 pr-4">
                            <TabsContent value="colors">
                                <Tabs value={activeThemeTab} onValueChange={(v) => setActiveThemeTab(v as any)}>
                                    <TabsList className="grid w-full grid-cols-2 mb-4"><TabsTrigger value="light">Light Scheme</TabsTrigger><TabsTrigger value="dark">Dark Scheme</TabsTrigger></TabsList>
                                    <TabsContent value="light" forceMount={true} className={activeThemeTab === 'light' ? 'block' : 'hidden'}>{renderColorSection('light')}</TabsContent>
                                    <TabsContent value="dark" forceMount={true} className={activeThemeTab === 'dark' ? 'block' : 'hidden'}>{renderColorSection('dark')}</TabsContent>
                                </Tabs>
                            </TabsContent>
                            <TabsContent value="typography"><TypographyEditor typography={typography} setTypography={setTypography} /></TabsContent>
                            <TabsContent value="shapes"><ShapeEditor shapes={shapes} setShapes={setShapes} /></TabsContent>
                        </div>
                    </ScrollArea>
                </Tabs>
            </div>
            
             <div className="flex flex-col min-h-0 bg-muted/30 rounded-lg">
                <div className="p-2 border-b shrink-0"><h3 className="text-sm font-semibold text-center">Live Preview</h3></div>
                <ScrollArea className="flex-grow">
                    <ThemePreview colors={currentColorsForPreview} customColors={currentCustomColorsForPreview} typography={typography} shapes={shapes} />
                </ScrollArea>
            </div>
        </div>
        
        <DialogFooter className="mt-4 pt-4 border-t shrink-0"><Button onClick={handleGenerateThemeFile} disabled={isGenerating} className="w-full">{isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileCode2 className="mr-2 h-4 w-4" />}Generate and Download Theme.kt</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

ThemeEditorModal.displayName = 'ThemeEditorModal';
