
'use client';

import React, { useMemo } from 'react';
import type { SavedLayout, DesignComponent, M3Theme, CustomComponentTemplate } from '@/types/compose-spec';
import { RenderedComponentWrapper } from './component-renderer/RenderedComponentWrapper';
import { ROOT_SCAFFOLD_ID, defaultDarkColors, defaultLightColors } from '@/types/compose-spec';
import { MobileFrame, FRAME_WIDTH, FRAME_HEIGHT } from './MobileFrame';
import { useTheme } from '@/contexts/ThemeContext';

interface LayoutPreviewProps {
  layout: SavedLayout;
  customComponentTemplates: CustomComponentTemplate[];
  m3Theme?: M3Theme;
}

export function LayoutPreview({ layout, customComponentTemplates, m3Theme }: LayoutPreviewProps) {
  const { resolvedTheme: editorTheme } = useTheme();

  const getLayoutComponentById = (id: string): DesignComponent | undefined => {
    return layout.components.find(c => c.id === id);
  };

  const rootComponent = getLayoutComponentById(ROOT_SCAFFOLD_ID);

  const m3StyleVariables = useMemo(() => {
    const themeSource = m3Theme || { lightColors: defaultLightColors, darkColors: defaultDarkColors };
    const canvasTheme = editorTheme === 'dark' ? themeSource.darkColors : themeSource.lightColors;

    const styles: React.CSSProperties = {
        '--m3-primary': canvasTheme.primary, '--m3-on-primary': canvasTheme.onPrimary,
        '--m3-primary-container': canvasTheme.primaryContainer, '--m3-on-primary-container': canvasTheme.onPrimaryContainer,
        '--m3-secondary': canvasTheme.secondary, '--m3-on-secondary': canvasTheme.onSecondary,
        '--m3-secondary-container': canvasTheme.secondaryContainer, '--m3-on-secondary-container': canvasTheme.onSecondaryContainer,
        '--m3-tertiary': canvasTheme.tertiary, '--m3-on-tertiary': canvasTheme.onTertiary,
        '--m3-tertiary-container': canvasTheme.tertiaryContainer, '--m3-on-tertiary-container': canvasTheme.onTertiaryContainer,
        '--m3-error': canvasTheme.error, '--m3-on-error': canvasTheme.onError,
        '--m3-error-container': canvasTheme.errorContainer, '--m3-on-error-container': canvasTheme.onErrorContainer,
        '--m3-background': canvasTheme.background, '--m3-on-background': canvasTheme.onBackground,
        '--m3-surface': canvasTheme.surface, '--m3-on-surface': canvasTheme.onSurface,
        '--m3-surface-variant': canvasTheme.surfaceVariant, '--m3-on-surface-variant': canvasTheme.onSurfaceVariant,
        '--m3-outline': canvasTheme.outline,
    };
    return styles;
  }, [m3Theme, editorTheme]);

  if (!rootComponent) {
    return <div className="p-2 text-xs text-destructive">Preview Error: Root scaffold component not found in layout.</div>;
  }
  
  const previewContainerWidth = 200; 
  const scale = previewContainerWidth / FRAME_WIDTH;

  const passThroughProps = {
      getComponentById: getLayoutComponentById,
      customComponentTemplates,
      activeDesignId: null,
      zoomLevel: scale, // Pass scale, even if not used by all children, it's context
      selectComponent: () => {},
      addComponent: () => {},
      moveComponent: () => {},
      updateComponent: () => {},
  };


  return (
    <div 
        className="w-full h-full flex items-center justify-center overflow-hidden bg-background relative"
        style={m3StyleVariables}
    >
      <div 
        className="transform-gpu" 
        style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: FRAME_WIDTH,
            height: FRAME_HEIGHT,
            transform: `translate(-50%, -50%) scale(${scale})`,
        }}
      >
          <MobileFrame isPreview={true}>
            <RenderedComponentWrapper
                component={rootComponent}
                isPreview={true}
                {...passThroughProps}
            />
          </MobileFrame>
      </div>
    </div>
  );
}
