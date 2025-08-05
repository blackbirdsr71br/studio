
'use client';

import type { DesignComponent, CustomComponentTemplate } from '@/types/compose-spec';
import { useDesign } from '@/contexts/DesignContext';
import { cn } from '@/lib/utils';
import { TextView } from './TextView';
import { ButtonView } from './ButtonView';
import { ImageView } from './ImageView';
import { ContainerView } from './ContainerView';
import React, { useRef } from 'react';
import { ROOT_SCAFFOLD_ID, DEFAULT_CONTENT_LAZY_COLUMN_ID, DEFAULT_TOP_APP_BAR_ID, DEFAULT_BOTTOM_NAV_BAR_ID } from '@/types/compose-spec';

interface ReadonlyRenderedComponentWrapperProps {
  component: DesignComponent;
  getComponentById: (id: string) => DesignComponent | undefined;
  isPreview?: boolean;
}

const isNumericValue = (value: any): boolean => {
  if (value === null || value === undefined || typeof value === 'boolean') {
    return false;
  }
  if (typeof value === 'number' && !isNaN(value)) {
    return true;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    return !isNaN(Number(value));
  }
  return false;
};

const getDimensionValue = (
    propName: 'width' | 'height',
    propValue: any,
    fillValue: boolean | undefined,
    componentType: string,
    componentId: string,
    parentId: string | null,
    getLocalComponentById: (id: string) => DesignComponent | undefined,
    customComponentTemplates: CustomComponentTemplate[],
  ): string => {

    if (componentId === ROOT_SCAFFOLD_ID) return '100%';
  
    if (componentId === DEFAULT_TOP_APP_BAR_ID || componentType === 'TopAppBar') {
      return propName === 'width' ? '100%' : (isNumericValue(propValue) ? `${propValue}px` : '56px');
    }
    if (componentId === DEFAULT_BOTTOM_NAV_BAR_ID || componentType === 'BottomNavigationBar') {
      return propName === 'width' ? '100%' : (isNumericValue(propValue) ? `${propValue}px` : '56px');
    }
    if (componentId === DEFAULT_CONTENT_LAZY_COLUMN_ID) {
      return '100%';
    }
  
    const parentComponent = parentId ? getLocalComponentById(parentId) : null;
  
    if (parentComponent) {
      let effectiveParentType = parentComponent.type;
      if (parentComponent.templateIdRef) {
        const template = customComponentTemplates.find(t => t.templateId === parentComponent.templateIdRef);
        if (template) {
            const rootOfParentTemplate = template.componentTree.find(c => c.id === template.rootComponentId);
            if(rootOfParentTemplate) effectiveParentType = rootOfParentTemplate.type;
        }
      }
      const parentIsRowLike = ['LazyRow', 'LazyHorizontalGrid', 'TopAppBar', 'BottomNavigationBar', 'Row'].includes(effectiveParentType);
      const parentIsColumnLike = ['LazyColumn', 'LazyVerticalGrid', 'Column', 'Card', 'Box'].includes(effectiveParentType);
      
      if (fillValue) {
        if (propName === 'width' && parentIsRowLike) return 'auto';
        if (propName === 'height' && parentIsColumnLike) return 'auto';
      }
    }
  
    if (fillValue) return '100%';
    if (isNumericValue(propValue)) return `${propValue}px`;
    return 'auto';
  };
  
export function ReadonlyRenderedComponentWrapper({ component, getComponentById, isPreview = false }: ReadonlyRenderedComponentWrapperProps) {
  const { customComponentTemplates } = useDesign(); // Still need this for resolving custom component base types
  const ref = useRef<HTMLDivElement>(null);

  const renderSpecificComponent = () => {
    const childrenToRender = (component.properties.children || [])
      .map(id => getComponentById(id))
      .filter(Boolean) as DesignComponent[];
    
    switch (component.type) {
      case 'Scaffold':
        const topBarChild = childrenToRender.find(c => c.type === 'TopAppBar' || c.id === DEFAULT_TOP_APP_BAR_ID);
        const contentChild = childrenToRender.find(c => c.type === 'LazyColumn' && c.id === DEFAULT_CONTENT_LAZY_COLUMN_ID);
        const bottomBarChild = childrenToRender.find(c => c.type === 'BottomNavigationBar' || c.id === DEFAULT_BOTTOM_NAV_BAR_ID);
        
        return (
          <div className="flex flex-col w-full h-full bg-[var(--scaffold-bg-color)]" style={{'--scaffold-bg-color': component.properties.backgroundColor || 'transparent'} as React.CSSProperties}>
            {topBarChild && (
              <div style={{ flexShrink: 0, width: '100%', height: `${topBarChild.properties.height || 56}px` }} className="flex w-full">
                <ReadonlyRenderedComponentWrapper component={topBarChild} getComponentById={getComponentById} isPreview={isPreview} />
              </div>
            )}
            {contentChild && (
              <div
                style={{ flexGrow: 1, minHeight: 0, width: '100%' }}
                className={cn("flex w-full", "overflow-y-auto overflow-x-hidden")}
              >
                <ReadonlyRenderedComponentWrapper component={contentChild} getComponentById={getComponentById} isPreview={isPreview} />
              </div>
            )}
            {bottomBarChild && (
              <div style={{ flexShrink: 0, width: '100%', height: `${bottomBarChild.properties.height || 56}px` }} className="flex w-full">
                 <ReadonlyRenderedComponentWrapper component={bottomBarChild} getComponentById={getComponentById} isPreview={isPreview} />
              </div>
            )}
          </div>
        );
      case 'Text':
        return <TextView properties={component.properties} />;
      case 'Button':
        return <ButtonView properties={component.properties} />;
      case 'Image':
        return <ImageView properties={component.properties} isPreview={isPreview} />;
      
      case 'Column':
      case 'Box':
      case 'Card':
      case 'LazyColumn': 
      case 'AnimatedContent':
        return <ContainerView component={component} childrenComponents={childrenToRender} isRow={false} isPreview={isPreview} getComponentById={getComponentById} />;

      case 'Row':
      case 'LazyRow':
      case 'LazyVerticalGrid':
      case 'LazyHorizontalGrid':
      case 'TopAppBar': 
      case 'BottomNavigationBar':
        return <ContainerView component={component} childrenComponents={childrenToRender} isRow={true} isPreview={isPreview} getComponentById={getComponentById} />;
      
      case 'Spacer':
        const width = component.properties.width ?? 8;
        const height = component.properties.height ?? 8;
        return (
          <div
            style={{
              width: `${width}px`,
              height: `${height}px`,
              flexShrink: 0,
            }}
            className="select-none"
          />
        );

      default:
        if (component.templateIdRef) {
           const template = customComponentTemplates.find(t => t.templateId === component.templateIdRef);
           if (template) {
             const rootTemplateComponent = template.componentTree.find(c => c.id === template.rootComponentId);
             if (rootTemplateComponent) {
                const isTemplateRootRowLike = ['Row', 'LazyRow', 'LazyHorizontalGrid', 'TopAppBar', 'BottomNavigationBar'].includes(rootTemplateComponent.type);
                return <ContainerView component={component} childrenComponents={childrenToRender} isRow={isTemplateRootRowLike} isPreview={isPreview} getComponentById={getComponentById} />;
             }
           }
        }
        return <div className="p-2 border border-dashed border-red-500 text-xs">Unknown: {component.type}</div>;
    }
  };
  
  const parent = component.parentId ? getComponentById(component.parentId) : null;
  let parentIsRowLike = false;
  let parentIsColumnLike = false;
  
  if (parent) {
      let effectiveParentType = parent.type;
      if (parent.templateIdRef) {
          const template = customComponentTemplates.find(t => t.templateId === parent.templateIdRef);
          if (template) {
              const rootOfTemplate = template.componentTree.find(c => c.id === template.rootComponentId);
              if (rootOfTemplate) effectiveParentType = rootOfTemplate.type;
          }
      }
      parentIsRowLike = ['LazyRow', 'LazyHorizontalGrid', 'TopAppBar', 'BottomNavigationBar', 'Row'].includes(effectiveParentType);
      parentIsColumnLike = ['LazyColumn', 'LazyVerticalGrid', 'Column', 'Card', 'Box', 'Scaffold'].includes(effectiveParentType);
  }

  const wrapperStyle: React.CSSProperties = {
    width: getDimensionValue('width', component.properties.width, component.properties.fillMaxWidth, component.type, component.id, component.parentId, getComponentById, customComponentTemplates),
    height: getDimensionValue('height', component.properties.height, component.properties.fillMaxHeight, component.type, component.id, component.parentId, getComponentById, customComponentTemplates),
    position: 'relative',
    display: 'block',
  };
  
  let effectiveLayoutWeight = component.properties.layoutWeight || 0;
  if (parentIsRowLike && component.properties.fillMaxWidth) {
    effectiveLayoutWeight = Math.max(effectiveLayoutWeight, 1);
  }
  if (parentIsColumnLike && component.properties.fillMaxHeight) {
    effectiveLayoutWeight = Math.max(effectiveLayoutWeight, 1);
  }

  if (effectiveLayoutWeight > 0) {
    wrapperStyle.flexGrow = effectiveLayoutWeight;
    wrapperStyle.flexShrink = 1; 
    wrapperStyle.flexBasis = '0%'; 
    
    const parentComp = component.parentId ? getComponentById(component.parentId) : null;
    if (parentComp) {
        let currentParentIsRowLike = ['Row', 'LazyRow', 'TopAppBar', 'BottomNavigationBar', 'LazyHorizontalGrid'].includes(parentComp.type);
        if (parentComp.templateIdRef) {
            const template = customComponentTemplates.find(t => t.templateId === parentComp.templateIdRef);
            if (template) {
                const rootOfTemplate = template.componentTree.find(c => c.id === template.rootComponentId);
                if (rootOfTemplate) currentParentIsRowLike = ['Row', 'LazyRow', 'TopAppBar', 'BottomNavigationBar', 'LazyHorizontalGrid'].includes(rootOfTemplate.type);
            }
        }

        if (currentParentIsRowLike) { 
            wrapperStyle.height = component.properties.fillMaxHeight ? '100%' : 'auto'; 
        } else { 
            wrapperStyle.width = component.properties.fillMaxWidth ? '100%' : 'auto'; 
        }
    }
  }

  if (parent && (parent.type === 'Column' || parent.type === 'Row' || parent.type === 'Box' || parent.type.startsWith('Lazy') || parent.templateIdRef)) {
    const selfAlignProp = component.properties.selfAlign;

    if (selfAlignProp && selfAlignProp !== 'Inherit') {
      if (parentIsRowLike) { 
        if (selfAlignProp === 'Start') wrapperStyle.alignSelf = 'flex-start';
        else if (selfAlignProp === 'Center') wrapperStyle.alignSelf = 'center';
        else if (selfAlignProp === 'End') wrapperStyle.alignSelf = 'flex-end';
        else if (component.properties.fillMaxHeight) wrapperStyle.alignSelf = 'stretch';

      } else { 
        if (selfAlignProp === 'Start') wrapperStyle.alignSelf = 'flex-start';
        else if (selfAlignProp === 'Center') wrapperStyle.alignSelf = 'center';
        else if (selfAlignProp === 'End') wrapperStyle.alignSelf = 'flex-end';
        else if (component.properties.fillMaxWidth) wrapperStyle.alignSelf = 'stretch';
      }
    } else { 
      if (parentIsRowLike && component.properties.fillMaxHeight) {
        wrapperStyle.alignSelf = 'stretch';
      } else if (!parentIsRowLike && component.properties.fillMaxWidth) {
        wrapperStyle.alignSelf = 'stretch';
      }
    }
  }

  if (component.id === ROOT_SCAFFOLD_ID) {
    wrapperStyle.backgroundColor = component.properties.backgroundColor || 'transparent';
  }

  const hasCornerRadius = (component.properties.cornerRadiusTopLeft || 0) > 0 ||
                          (component.properties.cornerRadiusTopRight || 0) > 0 ||
                          (component.properties.cornerRadiusBottomRight || 0) > 0 ||
                          (component.properties.cornerRadiusBottomLeft || 0) > 0;

  if (hasCornerRadius) {
    wrapperStyle.borderTopLeftRadius = `${component.properties.cornerRadiusTopLeft || 0}px`;
    wrapperStyle.borderTopRightRadius = `${component.properties.cornerRadiusTopRight || 0}px`;
    wrapperStyle.borderBottomRightRadius = `${component.properties.cornerRadiusBottomRight || 0}px`;
    wrapperStyle.borderBottomLeftRadius = `${component.properties.cornerRadiusBottomLeft || 0}px`;
    if (component.type === 'Image') {
      wrapperStyle.overflow = 'hidden';
    }
  }

  return (
    <div
      ref={ref}
      style={wrapperStyle}
      className={cn(
        'border border-transparent relative'
      )}
      data-component-id={component.id}
      data-component-type={component.type}
    >
      {renderSpecificComponent()} 
    </div>
  );
}

