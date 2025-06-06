
'use client';

import { useDesign } from '@/contexts/DesignContext';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { propertyDefinitions, type ComponentType, type ComponentProperty } from '@/types/compose-spec';
import { PropertyEditor } from './PropertyEditor';
import { Trash2 } from 'lucide-react';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ReactNode } from 'react';

interface GroupedProperties {
  [groupName: string]: ReactNode[];
}

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

  const componentPropsDef = (propertyDefinitions[selectedComponent.type as ComponentType] || []) as (Omit<ComponentProperty, 'value'> & { group: string })[];

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

  const groupedProperties: GroupedProperties = {};
  const propertyGroups: string[] = [];

  componentPropsDef.forEach((propDef) => {
    const group = propDef.group || 'General';
    if (!groupedProperties[group]) {
      groupedProperties[group] = [];
      propertyGroups.push(group);
    }
    groupedProperties[group].push(
      <PropertyEditor
        key={propDef.name}
        property={propDef}
        currentValue={selectedComponent.properties[propDef.name] ?? getDefaultPropertyValue(propDef)}
        onChange={(value) => handlePropertyChange(propDef.name, value)}
      />
    );
  });

  // Helper to get default value if not set on component, for initial rendering
  // This is a bit of a workaround as PropertyEditor expects a 'value' in its propDef, but we Omit it for the main array.
  // We need to find the original default from the full spec if we were to re-add it.
  // For now, we'll assume a sensible default or let PropertyEditor handle undefined.
  // The type `Omit<ComponentProperty, 'value'>` makes it tricky to access the original default here easily.
  // Let's assume that properties always have a value on the `selectedComponent.properties` due to `getDefaultProperties`
  // or PropertyEditor handles it.
  const getDefaultPropertyValue = (propDef: Omit<ComponentProperty, 'value'>) => {
    // This is a simplification. Ideally, we'd look up the actual default.
    // However, `getDefaultProperties` in `DesignContext` should ensure initial values are set.
    // If a new property is added to spec and not old components, it might be undefined.
    if (propDef.type === 'number') return 0;
    if (propDef.type === 'boolean') return false;
    return '';
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
      
      <div className="mb-4">
        <Label htmlFor="componentName" className="text-xs">Component Name</Label>
        <Input 
          id="componentName"
          type="text" 
          value={selectedComponent.name} 
          onChange={handleNameChange}
          className="h-8 text-sm mt-1.5"
        />
      </div>

      <ScrollArea className="flex-grow pr-2">
        {componentPropsDef.length === 0 ? (
          <p className="text-sm text-muted-foreground">No editable properties for this component type.</p>
        ) : (
          <Tabs defaultValue={propertyGroups[0] || 'general'} className="w-full">
            <TabsList className="grid w-full grid-cols-auto">
              {propertyGroups.map((group) => (
                <TabsTrigger key={group} value={group} className="text-xs px-2 py-1.5">
                  {group}
                </TabsTrigger>
              ))}
            </TabsList>
            {propertyGroups.map((group) => (
              <TabsContent key={group} value={group}>
                <div className="space-y-4 pt-4">
                  {groupedProperties[group]}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        )}
      </ScrollArea>
    </aside>
  );
}
