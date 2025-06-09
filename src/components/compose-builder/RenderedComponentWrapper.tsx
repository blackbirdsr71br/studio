
'use client';

import type { DesignComponent } from '@/types/compose-spec';
import { useDesign } from '@/contexts/DesignContext';
import { cn } from '@/lib/utils';
import { TextView } from './component-renderer/TextView';
import { ButtonView } from './component-renderer/ButtonView';
import { ImageView } from './component-renderer/ImageView';
import { ContainerView } from './component-renderer/ContainerView';
import React, { useState, useEffect } from 'react';

interface RenderedComponentWrapperProps {
  component: DesignComponent;
}

export function RenderedComponentWrapper({ component }: RenderedComponentWrapperProps) {
  const { selectedComponentId, selectComponent, getComponentById } = useDesign();
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: component.properties.x || 0, y: component.properties.y || 0 });

  useEffect(() => {
    // Update position if it's a root component and its x/y props change
    if (!component.parentId) {
      setPosition({ x: component.properties.x || 0, y: component.properties.y || 0 });
    }
  }, [component.properties.x, component.properties.y, component.parentId]);


  const isSelected = component.id === selectedComponentId;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); 
    selectComponent(component.id);
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.stopPropagation();
    e.dataTransfer.setData('application/component-id', component.id);
    e.dataTransfer.effectAllowed = 'move';
    setIsDragging(true);
    selectComponent(component.id); 
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setIsDragging(false);
  };


  const renderSpecificComponent = () => {
    const children = (component.properties.children || []).map(id => getComponentById(id)).filter(Boolean) as DesignComponent[];
    
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
        return <ContainerView component={component} childrenComponents={children} isRow={false} />;

      case 'Row':
      case 'LazyRow':
      case 'LazyVerticalGrid':
      case 'LazyHorizontalGrid': // Visually like LazyRow, AI handles true grid for code
        return <ContainerView component={component} childrenComponents={children} isRow={true} />;
      
      default:
        // Check if it's a custom component type (which might not be in the switch)
        if (component.type.startsWith("custom/")) {
           const template = useDesign().customComponentTemplates.find(t => t.templateId === component.type);
           if (template) {
             // This is a basic fallback rendering for custom components directly on canvas.
             // Ideally, custom components would also have a more specific renderer or expand their tree here.
             // For now, treat as a simple container if it has children.
             return <ContainerView component={component} childrenComponents={children} isRow={false} />;
           }
        }
        return <div className="p-2 border border-dashed border-red-500">Unknown: {component.type}</div>;
    }
  };

  // Style for absolute positioning if it's a root component
  const absolutePositionStyle: React.CSSProperties = !component.parentId ? {
    position: 'absolute',
    left: `${position.x}px`,
    top: `${position.y}px`,
  } : {
    position: 'relative', // Children are positioned by their container
  };

  const wrapperStyle: React.CSSProperties = {
    ...absolutePositionStyle,
    cursor: isDragging ? 'grabbing' : 'grab', // All components are grabbable
    transition: isDragging ? 'none' : 'box-shadow 0.2s ease-in-out, border-color 0.2s ease-in-out',
  };


  return (
    <div
      style={wrapperStyle}
      className={cn(
        'p-0.5 border border-transparent hover:border-primary/50', 
        {
          'ring-2 ring-primary ring-offset-2 shadow-lg !border-primary': isSelected,
          'opacity-50': isDragging,
        }
      )}
      onClick={handleClick}
      draggable={true} // All components are draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      data-component-id={component.id}
    >
      {renderSpecificComponent()}
    </div>
  );
}
