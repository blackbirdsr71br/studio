
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
  const { selectedComponentId, selectComponent, getComponentById } = useDesign(); // Removed 'components' as getComponentById is used
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: component.properties.x || 0, y: component.properties.y || 0 });

  useEffect(() => {
    setPosition({ x: component.properties.x || 0, y: component.properties.y || 0 });
  }, [component.properties.x, component.properties.y]);


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
        return <div className="p-2 border border-dashed border-red-500">Unknown: {component.type}</div>;
    }
  };

  const isDraggableOnCanvas = !component.parentId; 

  const wrapperStyle: React.CSSProperties = isDraggableOnCanvas ? {
    position: 'absolute',
    left: `${position.x}px`,
    top: `${position.y}px`,
    cursor: isDragging ? 'grabbing' : 'grab',
    transition: isDragging ? 'none' : 'box-shadow 0.2s ease-in-out, border-color 0.2s ease-in-out',
  } : { 
    position: 'relative', 
    cursor: 'pointer',
    transition: 'box-shadow 0.2s ease-in-out, border-color 0.2s ease-in-out',
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
      draggable={isDraggableOnCanvas}
      onDragStart={isDraggableOnCanvas ? handleDragStart : undefined}
      onDragEnd={isDraggableOnCanvas ? handleDragEnd : undefined}
      data-component-id={component.id}
    >
      {renderSpecificComponent()}
    </div>
  );
}

    