
'use client';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext'; // For main UI theme
import { defaultDarkColors, defaultLightColors, type M3Theme } from '@/types/compose-spec';
import { useDesign } from '@/contexts/DesignContext'; // Import useDesign

interface MobileFrameProps {
  children: ReactNode;
  className?: string;
  isPreview?: boolean;
}

const SCREEN_WIDTH_TARGET = 432;
const SCREEN_HEIGHT_TARGET = 896; 

const FRAME_BODY_PADDING = 8; 
const SPEAKER_BAR_HEIGHT = 24; 
const SPEAKER_BAR_MARGIN_BOTTOM = 4;

export const FRAME_WIDTH = SCREEN_WIDTH_TARGET + (FRAME_BODY_PADDING * 2);
export const FRAME_HEIGHT = SCREEN_HEIGHT_TARGET + (FRAME_BODY_PADDING * 2) + SPEAKER_BAR_HEIGHT + SPEAKER_BAR_MARGIN_BOTTOM;

export function MobileFrame({ children, className, isPreview = false }: MobileFrameProps) {
  const { resolvedTheme: editorTheme } = useTheme(); 
  const { m3Theme: contextM3Theme } = useDesign();

  const m3Theme = contextM3Theme;

  const frameBodyColor = editorTheme === 'dark' ? 'bg-neutral-300' : 'bg-neutral-900';
  const speakerBarColor = editorTheme === 'dark' ? 'bg-neutral-400' : 'bg-neutral-950';

  const themeSource = m3Theme || { lightColors: defaultLightColors, darkColors: defaultDarkColors };
  const canvasTheme = editorTheme === 'dark' ? themeSource.darkColors : themeSource.lightColors;

  const m3StyleVariables: React.CSSProperties = {
    '--m3-primary': canvasTheme.primary,
    '--m3-on-primary': canvasTheme.onPrimary,
    '--m3-primary-container': canvasTheme.primaryContainer,
    '--m3-on-primary-container': canvasTheme.onPrimaryContainer,
    '--m3-secondary': canvasTheme.secondary,
    '--m3-on-secondary': canvasTheme.onSecondary,
    '--m3-secondary-container': canvasTheme.secondaryContainer,
    '--m3-on-secondary-container': canvasTheme.onSecondaryContainer,
    '--m3-tertiary': canvasTheme.tertiary,
    '--m3-on-tertiary': canvasTheme.onTertiary,
    '--m3-tertiary-container': canvasTheme.tertiaryContainer,
    '--m3-on-tertiary-container': canvasTheme.onTertiaryContainer,
    '--m3-error': canvasTheme.error,
    '--m3-on-error': canvasTheme.onError,
    '--m3-error-container': canvasTheme.errorContainer,
    '--m3-on-error-container': canvasTheme.onErrorContainer,
    '--m3-background': canvasTheme.background,
    '--m3-on-background': canvasTheme.onBackground,
    '--m3-surface': canvasTheme.surface,
    '--m3-on-surface': canvasTheme.onSurface,
    '--m3-surface-variant': canvasTheme.surfaceVariant,
    '--m3-on-surface-variant': canvasTheme.onSurfaceVariant,
    '--m3-outline': canvasTheme.outline,
  } as React.CSSProperties;


  return (
    <div
      className={cn(
        "rounded-[44px] shadow-xl mx-auto my-auto flex flex-col",
        frameBodyColor,
        className,
        { 'shadow-none': isPreview }
      )}
      style={{
        width: `${FRAME_WIDTH}px`,
        height: `${FRAME_HEIGHT}px`,
        padding: `${FRAME_BODY_PADDING}px`
      }}
    >
      <div 
        className={cn(
          "w-28 mx-auto rounded-b-xl shrink-0",
          speakerBarColor
        )}
        style={{ 
          height: `${SPEAKER_BAR_HEIGHT}px`,
          marginBottom: `${SPEAKER_BAR_MARGIN_BOTTOM}px`
        }}
      ></div>
      
      <div 
        className={cn(
          "overflow-hidden rounded-[32px] w-full flex-grow" 
        )}
         style={{ ...m3StyleVariables, backgroundColor: 'var(--m3-background)' }}
      >
        {children}
      </div>
    </div>
  );
}
