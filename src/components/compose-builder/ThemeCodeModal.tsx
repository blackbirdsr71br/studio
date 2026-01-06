
'use client';

import React, { useState, useImperativeHandle, forwardRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useDesign } from '@/contexts/DesignContext';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Copy, Download, Wand2, FileCode2 } from 'lucide-react';
import CodeMirror from '@uiw/react-codemirror';
import { java as javaLang } from '@codemirror/lang-java';
import { githubLight, githubDark } from '@uiw/codemirror-theme-github';
import { useTheme } from '@/contexts/ThemeContext';
import type { M3Colors, M3Typography, M3Shapes, CustomColor } from '@/types/compose-spec';

export interface ThemeCodeModalRef {
  openModal: () => void;
}

const generateThemeFileContent = (m3Theme?: {
    lightColors: M3Colors;
    darkColors: M3Colors;
    customLightColors: CustomColor[];
    customDarkColors: CustomColor[];
    typography: M3Typography;
    shapes: M3Shapes;
}): string => {
  if (!m3Theme) {
    return "// Theme data is not available.";
  }

  const { lightColors, darkColors, customLightColors = [], customDarkColors = [], typography, shapes } = m3Theme;
  const toComposeColor = (hex: string) => `Color(0xFF${hex.substring(1).toUpperCase()})`;
  const toFontWeight = (w: 'Normal' | 'Medium' | 'Bold') => w === 'Normal' ? 'FontWeight.Normal' : w === 'Medium' ? 'FontWeight.Medium' : 'FontWeight.Bold';

  const lightColorScheme = Object.entries(lightColors).map(([n, c]) => `    ${n} = ${toComposeColor(c)}`).join(',\n');
  const darkColorScheme = Object.entries(darkColors).map(([n, c]) => `    ${n} = ${toComposeColor(c)}`).join(',\n');

  const customColorClassProperties = customLightColors.map(c => `    val ${c.name}: Color`).join(',\n');
  const customColorClass = customLightColors.length > 0
    ? `@Immutable\ndata class CustomColors(\n${customColorClassProperties}\n)`
    : '';

  const lightCustomColors = customLightColors.map(c => `    ${c.name} = ${toComposeColor(c.color)}`).join(',\n');
  const darkCustomColorsForGeneration = customDarkColors.length > 0 ? customDarkColors : customLightColors.map(c => ({...c, color: '#000000'})); // Fallback
  const darkCustomColors = darkCustomColorsForGeneration.map(c => `    ${c.name} = ${toComposeColor(c.color)}`).join(',\n');
        
  const customColorInstances = customLightColors.length > 0
      ? `val LightCustomColors = CustomColors(\n${lightCustomColors}\n)\n\nval DarkCustomColors = CustomColors(\n${darkCustomColors}\n)`
      : '';
            
  const localComposition = customLightColors.length > 0
      ? `val LocalCustomColors = staticCompositionLocalOf { LightCustomColors }`
      : '';
            
  const themeExtension = customLightColors.length > 0
      ? `val MaterialTheme.customColors: CustomColors\n    @Composable\n    @ReadOnlyComposable\n    get() = LocalCustomColors.current`
      : '';

  const typographyStyles = (Object.keys(typography) as Array<keyof M3Typography>).map(key => `    ${key} = TextStyle(\n        fontFamily = FontFamily.Default, // TODO: Replace with actual font\n        fontWeight = ${toFontWeight(typography[key].fontWeight)},\n        fontSize = ${typography[key].fontSize}.sp\n    )`).join(',\n');
  const shapesDef = (Object.keys(shapes) as Array<keyof M3Shapes>).map(key => `    ${key} = RoundedCornerShape(${shapes[key]}.dp)`).join(',\n');
  
  const compositionProvider = customLightColors.length > 0
      ? `    CompositionLocalProvider(LocalCustomColors provides customColors) {\n        content()\n    }`
      : `    content()`;

  return `
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

// This is a generated file. Modifications may be overwritten.

private val LightColorScheme = lightColorScheme(
${lightColorScheme}
)

private val DarkColorScheme = darkColorScheme(
${darkColorScheme}
)

${customColorClass}

${customColorInstances}

${localComposition}

private val AppShapes = Shapes(
${shapesDef}
)

private val AppTypography = Typography(
${typographyStyles}
)

${themeExtension}

@Composable
fun AppTheme(
    useDarkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colors = if (useDarkTheme) DarkColorScheme else LightColorScheme
    ${customLightColors.length > 0 ? 'val customColors = if (useDarkTheme) DarkCustomColors else LightCustomColors' : ''}
    
    MaterialTheme(
        colorScheme = colors,
        typography = AppTypography,
        shapes = AppShapes
    ) {
    ${compositionProvider}
    }
}`;
};


export const ThemeCodeModal = forwardRef<ThemeCodeModalRef, {}>((props, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { m3Theme } = useDesign();
  const { toast } = useToast();
  const { resolvedTheme } = useTheme();

  const handleGenerateCode = useCallback(() => {
    setIsLoading(true);
    try {
      const content = generateThemeFileContent(m3Theme);
      setGeneratedContent(content);
    } catch (e) {
      console.error("Error generating theme code:", e);
      toast({ title: "Error", description: "Failed to generate theme code.", variant: "destructive" });
      setGeneratedContent(null);
    } finally {
      setIsLoading(false);
    }
  }, [m3Theme, toast]);

  useImperativeHandle(ref, () => ({
    openModal: () => {
      setIsOpen(true);
      setGeneratedContent(null); // Reset on open
    }
  }));

  const handleCopyToClipboard = async () => {
    if (generatedContent) {
      try {
        await navigator.clipboard.writeText(generatedContent);
        toast({ title: "Code Copied!", description: `Theme.kt copied to clipboard.` });
      } catch (err) {
        toast({ title: "Copy Failed", description: "Could not copy code to clipboard.", variant: "destructive" });
      }
    }
  };

  const handleDownload = () => {
    if (generatedContent) {
      const blob = new Blob([generatedContent], { type: 'text/plain;charset=utf-8' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'Theme.kt';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    }
  };
  
  const canCopyOrDownload = !isLoading && generatedContent;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-headline flex items-center gap-2">
            <FileCode2 className="w-5 h-5 text-primary" /> View Theme Code
          </DialogTitle>
          <DialogDescription>
             Generate and view the Jetpack Compose code for your Material 3 theme.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-grow my-2 rounded-md border bg-muted/30 overflow-y-auto relative min-h-[300px]">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : generatedContent ? (
                <CodeMirror value={generatedContent} height="100%" extensions={[javaLang()]} theme={resolvedTheme === 'dark' ? githubDark : githubLight} readOnly className="text-sm h-full" basicSetup={{ lineNumbers: true, foldGutter: true }}/>
            ) : (
                 <div className="flex items-center justify-center h-full">
                     <Button variant="outline" onClick={handleGenerateCode}>
                        <Wand2 className="mr-2 h-4 w-4"/>
                        Generate Theme Code
                     </Button>
                </div>
            )}
        </div>
        
        <DialogFooter className="sm:justify-end flex-wrap gap-2 pt-4 border-t shrink-0">
          <Button onClick={handleCopyToClipboard} disabled={!canCopyOrDownload} variant="outline">
              <Copy className="mr-2 h-4 w-4" /> Copy Code
            </Button>
            <Button onClick={handleDownload} disabled={!canCopyOrDownload} variant="outline">
              <Download className="mr-2 h-4 w-4" /> Download .kt File
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

ThemeCodeModal.displayName = 'ThemeCodeModal';
