
'use client';

import React, { useState } from 'react';
import { useDesign } from '@/contexts/DesignContext';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { propertyDefinitions, type ComponentType, type ComponentProperty, getComponentDisplayName, DEFAULT_ROOT_LAZY_COLUMN_ID } from '@/types/compose-spec';
import { PropertyEditor } from './PropertyEditor';
import { Trash2, Save, Sparkles, Loader2 } from 'lucide-react'; 
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';
import { generateImageFromHintAction } from '@/app/actions';
import { Separator } from '../ui/separator';

interface GroupedProperties {
  [groupName: string]: ReactNode[];
}

const PREFERRED_GROUP_ORDER = ['Layout', 'Appearance', 'Content', 'Behavior'];

export function PropertyPanel() {
  const { selectedComponentId, getComponentById, updateComponent, deleteComponent, saveSelectedAsCustomTemplate } = useDesign();
  const selectedComponent = selectedComponentId ? getComponentById(selectedComponentId) : null;
  const { toast } = useToast();

  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  if (!selectedComponent) {
    return (
      <aside className="w-72 border-l bg-sidebar p-4 flex flex-col shrink-0">
        <h2 className="text-xl font-semibold mb-4 text-sidebar-foreground font-headline">Properties</h2>
        <div className="flex-grow flex items-center justify-center">
          <p className="text-sm text-muted-foreground">Select a component to see its properties.</p>
        </div>
      </aside>
    );
  }

  const getDefaultPropertyValue = (propDef: Omit<ComponentProperty, 'value'>) => {
    if (propDef.type === 'number') return 0;
    if (propDef.type === 'boolean') return false;
    if (propDef.type === 'enum' && propDef.options && propDef.options.length > 0) return propDef.options[0].value;
    return '';
  };

  const componentPropsDef = (propertyDefinitions[selectedComponent.type as ComponentType] || []) as (Omit<ComponentProperty, 'value'> & { group: string })[];

  const handlePropertyChange = (propName: string, value: string | number | boolean) => {
    updateComponent(selectedComponent.id, { properties: { [propName]: value } });
  };

  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
     updateComponent(selectedComponent.id, { name: event.target.value });
  };

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete "${selectedComponent.name}"?`)) {
      deleteComponent(selectedComponent.id);
    }
  };

  const handleSaveAsCustom = () => {
    if (selectedComponentId === DEFAULT_ROOT_LAZY_COLUMN_ID) {
      toast({
        title: "Cannot Save Root",
        description: "The root canvas cannot be saved as a custom component.",
        variant: "destructive",
      });
      return;
    }
    const name = window.prompt("Enter a name for your custom component:", selectedComponent.name);
    if (name && name.trim() !== "") {
      saveSelectedAsCustomTemplate(name.trim());
      toast({
        title: "Custom Component Saved",
        description: `"${name.trim()}" added to the component library.`,
      });
    } else if (name !== null) { 
      toast({
        title: "Save Failed",
        description: "Custom component name cannot be empty.",
        variant: "destructive",
      });
    }
  };

  const handleGenerateImage = async () => {
    if (!selectedComponent || selectedComponent.type !== 'Image' || !selectedComponent.properties['data-ai-hint']) {
      toast({ title: "Cannot Generate Image", description: "Please select an Image component and provide an AI hint.", variant: "destructive" });
      return;
    }
    setIsGeneratingImage(true);
    setGenerationError(null);
    try {
      const hint = selectedComponent.properties['data-ai-hint'] as string;
      const result = await generateImageFromHintAction(hint);
      if (result.imageUrl) {
        updateComponent(selectedComponent.id, { properties: { src: result.imageUrl } });
        toast({ title: "Image Generated", description: "Image source has been updated successfully." });
      } else {
        setGenerationError(result.error || "An unknown error occurred while generating the image.");
        toast({ title: "Image Generation Failed", description: result.error || "Unknown error.", variant: "destructive" });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "An unexpected error occurred during image generation.";
      setGenerationError(message);
      toast({ title: "Image Generation Error", description: message, variant: "destructive" });
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const groupedProperties: GroupedProperties = {};
  const propertyGroups: string[] = [];

  componentPropsDef.forEach((propDef) => {
    const group = propDef.group || 'General';
    if (!groupedProperties[group]) {
      groupedProperties[group] = [];
      if (!propertyGroups.includes(group)) {
        propertyGroups.push(group);
      }
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

  // Special handling for "Corner Radius (All)" for relevant components
  if (['Image', 'Box', 'Card'].includes(selectedComponent.type)) {
    const {
        cornerRadiusTopLeft,
        cornerRadiusTopRight,
        cornerRadiusBottomRight,
        cornerRadiusBottomLeft,
    } = selectedComponent.properties;

    const allCornersHaveValue = 
        cornerRadiusTopLeft !== undefined &&
        cornerRadiusTopRight !== undefined &&
        cornerRadiusBottomRight !== undefined &&
        cornerRadiusBottomLeft !== undefined;

    const allCornersAreEqual =
        allCornersHaveValue &&
        cornerRadiusTopLeft === cornerRadiusTopRight &&
        cornerRadiusTopLeft === cornerRadiusBottomRight &&
        cornerRadiusTopLeft === cornerRadiusBottomLeft;

    const allCornersValue = allCornersAreEqual ? (cornerRadiusTopLeft ?? '') : ''; 

    const handleAllCornersChange = (value: string | number | boolean) => {
        const strValue = String(value);
        const numValue = parseFloat(strValue);

        if (strValue === '' || ( !isNaN(numValue) && numValue >= 0)) {
            const finalValue = strValue === '' ? 0 : numValue; // Default to 0 if cleared
            updateComponent(selectedComponent.id, {
                properties: {
                    cornerRadiusTopLeft: finalValue,
                    cornerRadiusTopRight: finalValue,
                    cornerRadiusBottomRight: finalValue,
                    cornerRadiusBottomLeft: finalValue,
                },
            });
        }
    };

    const allCornersEditor = (
      <React.Fragment key="cornerRadiusAllFragment">
        <div className="space-y-1.5">
            <Label htmlFor="prop-cornerRadiusAll" className="text-xs font-semibold">Corner Radius (All dp)</Label>
            <Input
                id="prop-cornerRadiusAll"
                type="number"
                value={allCornersValue}
                onChange={(e) => handleAllCornersChange(e.target.value)}
                placeholder="Mixed"
                className="h-8 text-sm"
            />
        </div>
        <Separator className="my-3 bg-sidebar-border/50" />
      </React.Fragment>
    );

    if (!groupedProperties['Appearance']) {
        groupedProperties['Appearance'] = [];
        if (!propertyGroups.includes('Appearance')) {
            propertyGroups.push('Appearance');
        }
    }
    groupedProperties['Appearance'].unshift(allCornersEditor);
  }
  
  propertyGroups.sort((a, b) => {
    const indexA = PREFERRED_GROUP_ORDER.indexOf(a);
    const indexB = PREFERRED_GROUP_ORDER.indexOf(b);

    if (indexA !== -1 && indexB !== -1) return indexA - indexB; 
    if (indexA !== -1) return -1; 
    if (indexB !== -1) return 1;  
    return a.localeCompare(b); 
  });

  const componentDisplayName = getComponentDisplayName(selectedComponent.type);
  const canSaveAsCustom = selectedComponentId !== DEFAULT_ROOT_LAZY_COLUMN_ID;

  return (
    <aside className="w-72 border-l bg-sidebar p-4 flex flex-col shrink-0">
      <div className="flex items-center justify-between mb-1">
         <h2 className="text-lg font-semibold text-sidebar-foreground font-headline truncate mr-2" title={`${selectedComponent.name} (${componentDisplayName})`}>
          {selectedComponent.name}
        </h2>
        <div className="flex items-center">
          {canSaveAsCustom && (
            <Button variant="ghost" size="icon" onClick={handleSaveAsCustom} className="text-sidebar-primary hover:bg-primary/10 h-7 w-7" aria-label="Save as custom component">
              <Save className="h-4 w-4" />
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={handleDelete} className="text-destructive hover:bg-destructive/10 h-7 w-7" aria-label="Delete component" disabled={selectedComponentId === DEFAULT_ROOT_LAZY_COLUMN_ID}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground mb-3 -mt-1">{componentDisplayName}</p>
      
      <div className="mb-4">
        <Label htmlFor="componentName" className="text-xs">Instance Name</Label>
        <Input 
          id="componentName"
          type="text" 
          value={selectedComponent.name} 
          onChange={handleNameChange}
          className="h-8 text-sm mt-1.5"
          disabled={selectedComponentId === DEFAULT_ROOT_LAZY_COLUMN_ID}
        />
      </div>

      <ScrollArea className="flex-grow pr-2">
        {componentPropsDef.length === 0 ? (
          <p className="text-sm text-muted-foreground">No editable properties for this component type.</p>
        ) : (
          <Tabs defaultValue={propertyGroups[0] || 'General'} className="w-full">
            <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${Math.min(propertyGroups.length, 3)}, minmax(0, 1fr))` }}>
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
                   {selectedComponent.type === 'Image' && group === 'Content' && (
                    <div className="mt-3 pt-3 border-t border-sidebar-border">
                      <Button
                        onClick={handleGenerateImage}
                        disabled={isGeneratingImage || !selectedComponent.properties['data-ai-hint']}
                        className="w-full"
                        size="sm"
                      >
                        {isGeneratingImage ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Sparkles className="mr-2 h-4 w-4" />
                        )}
                        Generate Image from Hint
                      </Button>
                      {generationError && <p className="text-xs text-destructive mt-1 text-center">{generationError}</p>}
                    </div>
                  )}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        )}
      </ScrollArea>
    </aside>
  );
}
