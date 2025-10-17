'use client';
import type { DesignComponent, ComponentType as OriginalComponentType } from '@/types/compose-spec';
import { EditableComponentWrapper } from './EditableComponentWrapper'; // Use the editable wrapper
import { getComponentDisplayName, DEFAULT_CONTENT_LAZY_COLUMN_ID, isCustomComponentType } from '@/types/compose-spec';
import { useDesign } from '@/contexts/DesignContext';
import { getContrastingTextColor, cn } from '@/lib/utils';
import { TextView } from './TextView'; 
import { useTheme } from '@/contexts/ThemeContext';

// THIS IS A DEDICATED CONTAINER FOR EDITING MODE

interface EditableContainerViewProps {
  component: DesignComponent;
  childrenComponents: DesignComponent[];
  isRow: boolean;
}

const isNumericValue = (value: any): boolean => {
  if (value === null || value === undefined || typeof value === 'boolean') return false;
  if (typeof value === 'number' && !isNaN(value)) return true;
  if (typeof value === 'string' && value.trim() !== '') return !isNaN(Number(value));
  return false;
};

export function EditableContainerView({ component, childrenComponents, isRow: isRowPropHint }: EditableContainerViewProps) {
  const { customComponentTemplates } = useDesign();
  const { resolvedTheme } = useTheme();

  let effectiveType: OriginalComponentType | string = component.type;
  let basePropertiesFromTemplateRoot: DesignComponent['properties'] = {};

  if (component.templateIdRef) {
    const template = customComponentTemplates.find(t => t.templateId === component.templateIdRef);
    if (template) {
      const rootTemplateComponent = template.componentTree.find(c => c.id === template.rootComponentId);
      if (rootTemplateComponent) {
        effectiveType = rootTemplateComponent.type; 
        basePropertiesFromTemplateRoot = { ...rootTemplateComponent.properties };
      }
    }
  }
  
  const effectiveProperties = { ...basePropertiesFromTemplateRoot, ...component.properties };

  const defaultRadiusForType = (currentType: OriginalComponentType | string) => {
    if (currentType === 'Card') return 8;
    if (currentType === 'Box') return 4;
    return 0;
  };

  const {
    padding, paddingTop, paddingBottom, paddingStart, paddingEnd,
    elevation = (effectiveType === 'Card' ? 2 : 0),
    cornerRadiusTopLeft = defaultRadiusForType(effectiveType),
    cornerRadiusTopRight = defaultRadiusForType(effectiveType),
    cornerRadiusBottomRight = defaultRadiusForType(effectiveType),
    cornerRadiusBottomLeft = defaultRadiusForType(effectiveType),
    itemSpacing = 0,
    reverseLayout = false,
    backgroundColor: containerBackgroundColor,
    contentColor: explicitContentColor,
    borderWidth,
    borderColor,
    title, 
    titleFontSize,
    fillMaxWidth, 
    fillMaxHeight 
  } = effectiveProperties;

  const defaultAllSidesPadding = (effectiveType === 'Card' ? 16 : 0);
  const effectivePaddingTop = paddingTop ?? padding ?? defaultAllSidesPadding ;
  const effectivePaddingBottom = paddingBottom ?? padding ?? defaultAllSidesPadding;
  const effectivePaddingStart = paddingStart ?? padding ?? defaultAllSidesPadding;
  const effectivePaddingEnd = paddingEnd ?? padding ?? defaultAllSidesPadding;

  const processDimension = (
    dimValue: string | number | undefined,
    defaultValueIfUndefined: string | number,
  ): string => {
    if (typeof dimValue === 'number') return `${dimValue}px`;
    if (dimValue === 'match_parent') return '100%';
    if (dimValue === 'wrap_content') return 'auto';
    if (typeof dimValue === 'string' && isNumericValue(dimValue)) return `${Number(dimValue)}px`;
    if (typeof dimValue === 'string' && dimValue.endsWith('%')) return dimValue;
    if (typeof defaultValueIfUndefined === 'number') return `${defaultValueIfUndefined}px`;
    if (defaultValueIfUndefined === 'match_parent') return '100%';
    if (defaultValueIfUndefined === 'wrap_content') return 'auto';
    return defaultValueIfUndefined.toString();
  };

  let defaultWidth: string | number = 'wrap_content';
  let defaultHeight: string | number = 'wrap_content';

  if (effectiveType === 'TopAppBar' || effectiveType === 'BottomNavigationBar') {
    defaultWidth = 'match_parent';
    defaultHeight = effectiveProperties.height || 56; 
  } else if (effectiveType === 'LazyColumn' || effectiveType === 'LazyVerticalGrid') {
    defaultWidth = 'match_parent';
    defaultHeight = (effectiveType === 'LazyColumn') ? 'match_parent' : 300;
  } else if (effectiveType === 'LazyRow' || effectiveType === 'LazyHorizontalGrid') {
    defaultWidth = 'match_parent';
    defaultHeight = effectiveType === 'LazyRow' ? 120 : 200;
  } else if (effectiveType === 'Card' || effectiveType === 'AnimatedContent') {
    defaultWidth = 200;
    defaultHeight = 150;
  } else if (effectiveType === 'Box') {
    defaultWidth = 100;
    defaultHeight = 100;
  } else if (effectiveType === 'Column' || effectiveType === 'Row') {
    defaultWidth = 200;
    defaultHeight = (effectiveType === 'Row') ? 100 : 200;
  }

  let styleWidth = processDimension(effectiveProperties.width, defaultWidth);
  let styleHeight = processDimension(effectiveProperties.height, defaultHeight);

  if (fillMaxWidth) styleWidth = '100%';
  if (fillMaxHeight) styleHeight = '100%';

  let finalFlexDirection: 'row' | 'column' = isRowPropHint ? 'row' : 'column';
  if (reverseLayout) finalFlexDirection = finalFlexDirection === 'row' ? 'row-reverse' : 'column-reverse';

  const baseStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: finalFlexDirection,
    paddingTop: `${effectivePaddingTop}px`,
    paddingBottom: `${effectivePaddingBottom}px`,
    paddingLeft: `${effectivePaddingStart}px`,
    paddingRight: `${effectivePaddingEnd}px`,
    width: '100%',
    height: '100%',
    borderTopLeftRadius: `${cornerRadiusTopLeft}px`,
    borderTopRightRadius: `${cornerRadiusTopRight}px`,
    borderBottomRightRadius: `${cornerRadiusBottomRight}px`,
    borderBottomLeftRadius: `${cornerRadiusBottomLeft}px`,
    gap: `${itemSpacing}px`,
    boxSizing: 'border-box',
    position: 'relative', 
    border: '1px dashed hsl(var(--border) / 0.3)',
    minWidth: '20px',
    minHeight: '20px',
  };

  if (cornerRadiusTopLeft > 0 || cornerRadiusTopRight > 0 || cornerRadiusBottomLeft > 0 || cornerRadiusBottomRight > 0) {
    baseStyle.overflow = 'hidden'; 
  }
  
  if (containerBackgroundColor) {
    baseStyle.backgroundColor = containerBackgroundColor;
  } else {
    baseStyle.backgroundColor = resolvedTheme === 'dark' ? 'hsl(var(--muted))' : '#F0F0F0';
  }

  if (explicitContentColor) {
    (baseStyle as any)['--effective-foreground-color'] = explicitContentColor;
     baseStyle.color = explicitContentColor; 
  } else if (baseStyle.backgroundColor && typeof baseStyle.backgroundColor === 'string' && baseStyle.backgroundColor !== 'transparent') {
    const contrastingColor = getContrastingTextColor(baseStyle.backgroundColor);
    (baseStyle as any)['--effective-foreground-color'] = contrastingColor;
    baseStyle.color = contrastingColor;
  } else {
    (baseStyle as any)['--effective-foreground-color'] = 'hsl(var(--foreground))';
    baseStyle.color = 'hsl(var(--foreground))';
  }

  switch (effectiveType) {
    case 'Card':
    case 'AnimatedContent':
      baseStyle.boxShadow = `0 ${elevation}px ${elevation * 1.5}px rgba(0,0,0,0.1), 0 ${elevation/2}px ${elevation/2}px rgba(0,0,0,0.06)`;
      if (typeof borderWidth === 'number' && borderWidth > 0 && borderColor) {
        baseStyle.border = `${borderWidth}px solid ${borderColor === 'transparent' ? 'transparent' : borderColor}`;
      } else if (!baseStyle.border || baseStyle.border === 'none') { 
         baseStyle.border = '1px solid hsl(var(--border) / 0.5)';
      }
      break;
    // other cases...
  }

  const showPlaceholder = childrenComponents.length === 0 && effectiveType !== 'Box';
  const placeholderText = `Drop components into this ${getComponentDisplayName(effectiveType as OriginalComponentType)}`;

  const topAppBarTitleElement = effectiveType === 'TopAppBar' && title ? (
    <div style={{ flexShrink: 0, marginRight: (childrenComponents.length > 0 ? (itemSpacing || 8) : 0) + 'px' }} className="top-app-bar-title-container">
      <TextView properties={{ text: title, fontSize: titleFontSize || 20, textColor: baseStyle.color as string }} />
    </div>
  ) : null;

  return (
    <div style={baseStyle} className="select-none component-container" data-container-id={component.id} data-container-type={effectiveType}>
      {showPlaceholder && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground/70 text-xs pointer-events-none p-2 text-center leading-tight">
          {placeholderText}
        </div>
      )}
      {topAppBarTitleElement}
      {childrenComponents.map(child => (
        <EditableComponentWrapper key={child.id} component={child} />
      ))}
    </div>
  );
}
