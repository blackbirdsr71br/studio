'use client';

import { useDesign } from '@/contexts/DesignContext';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { propertyDefinitions, type ComponentType } from '@/types/compose-spec';
import { PropertyEditor } from './PropertyEditor';
import { Trash2 } from 'lucide-react';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

export function PropertyPanel() {
  const { selectedComponentId, getComponentById, updateComponentProperties, deleteComponent } = useDesign();
  const selectedComponent = selectedComponentId ? getComponentById(selectedComponentId) : null;

  if (!selectedComponent) {
    return (
      <aside className="w-80 border-l bg-sidebar p-4 flex flex-col shrink-0">
        <h2 className="text-xl font-semibold mb-4 text-sidebar-foreground font-headline">Properties</h2>
        <div className="flex-grow flex items-center justify-center">
          <p className="text-sm text-muted-foreground">Select a component to see its properties.</p>
        </div>
      </aside>
    );
  }

  const componentPropsDef = propertyDefinitions[selectedComponent.type as ComponentType] || [];

  const handlePropertyChange = (propName: string, value: string | number | boolean) => {
    updateComponentProperties(selectedComponent.id, { [propName]: value });
  };

  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
     updateComponentProperties(selectedComponent.id, { name: event.target.value });
  };

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete "${selectedComponent.name}"?`)) {
      deleteComponent(selectedComponent.id);
    }
  };

  return (
    <aside className="w-80 border-l bg-sidebar p-4 flex flex-col shrink-0">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-sidebar-foreground font-headline truncate" title={selectedComponent.name}>
          {selectedComponent.name}
        </h2>
        <Button variant="ghost" size="icon" onClick={handleDelete} className="text-destructive hover:bg-destructive/10" aria-label="Delete component">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      
      <ScrollArea className="flex-grow pr-2">
        <div className="space-y-4">
          <div>
            <Label htmlFor="componentName" className="text-xs">Component Name</Label>
            <Input 
              id="componentName"
              type="text" 
              value={selectedComponent.name} 
              onChange={handleNameChange}
              className="h-8 text-sm mt-1.5"
            />
          </div>

          {componentPropsDef.map((propDef) => (
            <PropertyEditor
              key={propDef.name}
              property={propDef}
              currentValue={selectedComponent.properties[propDef.name] ?? propDef.value} // Use default from def if not set
              onChange={(value) => handlePropertyChange(propDef.name, value)}
            />
          ))}
          {componentPropsDef.length === 0 && (
            <p className="text-sm text-muted-foreground">No editable properties for this component type.</p>
          )}
        </div>
      </ScrollArea>
    </aside>
  );
}
