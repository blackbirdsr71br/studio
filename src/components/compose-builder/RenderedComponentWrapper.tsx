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
  const { selectedComponentId, selectComponent, getComponentById, components } = useDesign();
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: component.properties.x || 0, y: component.properties.y || 0 });

  useEffect(() => {
    setPosition({ x: component.properties.x || 0, y: component.properties.y || 0 });
  }, [component.properties.x, component.properties.y]);


  const isSelected = component.id === selectedComponentId;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering DesignSurface click
    selectComponent(component.id);
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.stopPropagation();
    e.dataTransfer.setData('application/component-id', component.id);
    e.dataTransfer.effectAllowed = 'move';
    setIsDragging(true);
    selectComponent(component.id); // Select on drag start
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setIsDragging(false);
  };


  const renderSpecificComponent = () => {
    switch (component.type) {
      case 'Text':
        return <TextView properties={component.properties} />;
      case 'Button':
        return <ButtonView properties={component.properties} />;
      case 'Image':
        return <ImageView properties={component.properties} />;
      case 'Column': {
        const children = (component.properties.children || []).map(id => getComponentById(id)).filter(Boolean) as DesignComponent[];
        return <ContainerView component={component} childrenComponents={children} isRow={false} />;
      }
      case 'Row': {
        const children = (component.properties.children || []).map(id => getComponentById(id)).filter(Boolean) as DesignComponent[];
        return <ContainerView component={component} childrenComponents={children} isRow={true} />;
      }
      default:
        return <div className="p-2 border border-dashed border-red-500">Unknown: {component.type}</div>;
    }
  };

  // Only root components are draggable for canvas positioning
  // Children components' positions are relative to their parent container (handled by flex in ContainerView)
  const isDraggableOnCanvas = !component.parentId; 

  const wrapperStyle: React.CSSProperties = isDraggableOnCanvas ? {
    position: 'absolute',
    left: `${position.x}px`,
    top: `${position.y}px`,
    cursor: isDragging ? 'grabbing' : 'grab',
    transition: isDragging ? 'none' : 'box-shadow 0.2s ease-in-out, border-color 0.2s ease-in-out',
  } : { 
    position: 'relative', // Children are positioned by parent flex layout
    cursor: 'pointer',
    transition: 'box-shadow 0.2s ease-in-out, border-color 0.2s ease-in-out',
  };


  return (
    <div
      style={wrapperStyle}
      className={cn(
        'p-0.5 border border-transparent hover:border-primary/50', // Reduced padding, rely on component's own padding
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
