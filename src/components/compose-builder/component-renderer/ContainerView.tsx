'use client';
import type { DesignComponent, BaseComponentProps } from '@/types/compose-spec';
import { RenderedComponentWrapper } from '../RenderedComponentWrapper';

interface ContainerViewProps {
  component: DesignComponent;
  childrenComponents: DesignComponent[];
  isRow: boolean;
}

export function ContainerView({ component, childrenComponents, isRow }: ContainerViewProps) {
  const { backgroundColor = 'rgba(224, 224, 224, 0.5)', padding = 8, width = 200, height = isRow ? 100 : 200 } = component.properties;
  
  const style: React.CSSProperties = {
    backgroundColor,
    padding: `${padding}px`,
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
    display: 'flex',
    flexDirection: isRow ? 'row' : 'column',
    gap: '8px', // Spacing between children
    border: '1px dashed hsl(var(--border))', // Visual aid for container bounds
    overflow: 'auto', // Allow scrolling if children overflow
    position: 'relative', // For positioning children if needed, and for drag-n-drop target
    minWidth: '50px', // Ensure it's visible
    minHeight: '50px', // Ensure it's visible
  };

  return (
    <div style={style} className="select-none component-container" data-container-id={component.id}>
      {childrenComponents.length === 0 && (
        <div className="flex items-center justify-center text-muted-foreground text-xs h-full pointer-events-none">
          {`Drop components into ${isRow ? 'Row' : 'Column'}`}
        </div>
      )}
      {childrenComponents.map(child => (
        <RenderedComponentWrapper key={child.id} component={child} />
      ))}
    </div>
  );
}
