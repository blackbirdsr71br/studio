
'use client';

import React, { useMemo } from 'react';
import type { CustomComponentTemplate, DesignComponent, M3Theme } from '@/types/compose-spec';
import { RenderedComponentWrapper } from './component-renderer/RenderedComponentWrapper';
import { useDesign } from '@/contexts/DesignContext';
import { defaultDarkColors, defaultLightColors } from '@/types/compose-spec';
import { useTheme } from '@/contexts/ThemeContext';


interface TemplatePreviewProps {
  template: CustomComponentTemplate;
}

export function TemplatePreview({ template }: TemplatePreviewProps) {
  const { m3Theme } = useDesign();
  const { resolvedTheme: editorTheme } = useTheme();

  const getTemplateComponentById = (id: string): DesignComponent | undefined => {
    return template.componentTree.find(c => c.id === id);
  };
  
  const rootComponent = getTemplateComponentById(template.rootComponentId);

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
    return <div className="p-2 text-xs text-destructive">Preview Error: Root component not found.</div>;
  }
  
  const componentWidth = typeof rootComponent.properties.width === 'number' ? rootComponent.properties.width : 200;
  const componentHeight = typeof rootComponent.properties.height === 'number' ? rootComponent.properties.height : 150;
  
  const passThroughProps = {
      getComponentById: getTemplateComponentById,
      customComponentTemplates: [], 
      activeDesignId: null,
      zoomLevel: 1,
      selectComponent: () => {},
      addComponent: () => {},
      moveComponent: () => {},
      updateComponent: () => {},
  };

  return (
    <div 
        className="w-full h-full flex items-center justify-center overflow-hidden"
        style={m3StyleVariables}
    >
      <div 
        className="relative"
        style={{
            width: `${componentWidth}px`,
            height: `${componentHeight}px`,
            transform: `scale(${Math.min(220 / (componentWidth || 1), 58 / (componentHeight || 1))})`,
            transformOrigin: 'center center'
        }}
      >
        <RenderedComponentWrapper
            component={rootComponent}
            isPreview={true}
            {...passThroughProps}
        />
      </div>
    </div>
  );
}
