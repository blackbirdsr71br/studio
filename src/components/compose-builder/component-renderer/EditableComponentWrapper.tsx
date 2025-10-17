'use client';

import type { DesignComponent, CustomComponentTemplate } from '@/types/compose-spec';
import { useDesign } from '@/contexts/DesignContext';
import { cn } from '@/lib/utils';
import React, { useRef, useEffect } from 'react';
import { ROOT_SCAFFOLD_ID, CORE_SCAFFOLD_ELEMENT_IDS } from '@/types/compose-spec';
import { EditableContainerView } from './EditableContainerView';
import { TextView } from './TextView';
import { ButtonView } from './ButtonView';
import { ImageView } from './ImageView';

// THIS IS A DEDICATED WRAPPER FOR EDITING MODE TO AVOID CIRCULAR DEPENDENCIES

interface EditableComponentWrapperProps {
  component: DesignComponent;
}

const isNumericValue = (value: any): boolean => {
  if (value === null || value === undefined || typeof value === 'boolean') return false;
  if (typeof value === 'number' && !isNaN(value)) return true;
  if (typeof value === 'string' && value.trim() !== '') return !isNaN(Number(value));
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
  
export function EditableComponentWrapper({ component }: EditableComponentWrapperProps) {
  const { selectedComponentId, selectComponent, getComponentById, customComponentTemplates } = useDesign();
  const ref = useRef<HTMLDivElement>(null);

  const isSelected = component.id === selectedComponentId;
  const isScaffoldElement = CORE_SCAFFOLD_ELEMENT_IDS.includes(component.id);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    selectComponent(component.id);
  };
  
  useEffect(() => {
    // This effect ensures that clicking outside any component within the editable
    // canvas selects the root of the template.
    const handleOutsideClick = (event: MouseEvent) => {
        if (ref.current && !ref.current.contains(event.target as Node)) {
             // Click was outside this component, logic handled by parent container
        }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
        document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [component.id, selectComponent]);


  const renderSpecificComponent = () => {
    const childrenToRender = (component.properties.children || [])
      .map(id => getComponentById(id))
      .filter(Boolean) as DesignComponent[];
    
    switch (component.type) {
      case 'Text':
        return <TextView properties={component.properties} />;
      case 'Button':
        return <ButtonView properties={component.properties} />;
      case 'Image':
        return <ImageView properties={component.properties} />;
      
      case 'Column':
      case 'Box':
      case 'Card':
      case 'LazyColumn': 
      case 'AnimatedContent':
        return <EditableContainerView component={component} childrenComponents={childrenToRender} isRow={false} />;

      case 'Row':
      case 'LazyRow':
      case 'LazyVerticalGrid':
      case 'LazyHorizontalGrid':
      case 'TopAppBar': 
      case 'BottomNavigationBar':
        return <EditableContainerView component={component} childrenComponents={childrenToRender} isRow={true} />;
      
      case 'Spacer':
        const width = component.properties.width ?? 8;
        const height = component.properties.height ?? 8;
        return <div style={{ width: `${width}px`, height: `${height}px`, flexShrink: 0 }} className="select-none"/>;

      default:
        // Default to a container view for custom components.
        const isRowLike = ['Row', 'LazyRow', 'LazyHorizontalGrid', 'TopAppBar', 'BottomNavigationBar'].includes(component.type);
        return <EditableContainerView component={component} childrenComponents={childrenToRender} isRow={isRowLike} />;
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
  if (parentIsRowLike && component.properties.fillMaxWidth) effectiveLayoutWeight = Math.max(effectiveLayoutWeight, 1);
  if (parentIsColumnLike && component.properties.fillMaxHeight) effectiveLayoutWeight = Math.max(effectiveLayoutWeight, 1);

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
        if (currentParentIsRowLike) wrapperStyle.height = component.properties.fillMaxHeight ? '100%' : 'auto'; 
        else wrapperStyle.width = component.properties.fillMaxWidth ? '100%' : 'auto'; 
    }
  }

  if (parent) {
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
      if (parentIsRowLike && component.properties.fillMaxHeight) wrapperStyle.alignSelf = 'stretch';
      else if (!parentIsRowLike && component.properties.fillMaxWidth) wrapperStyle.alignSelf = 'stretch';
    }
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
        'border border-transparent',
        { 
          'ring-2 ring-offset-2 ring-offset-background shadow-lg': isSelected,
          'ring-primary/80': isSelected && !isScaffoldElement,
          'ring-accent': isSelected && isScaffoldElement,
          'cursor-pointer': component.properties.clickable,
          'relative': true,
        }
      )}
      onClick={handleClick}
      data-component-id={component.id}
      data-component-type={component.type}
    >
      {renderSpecificComponent()}
    </div>
  );
}
