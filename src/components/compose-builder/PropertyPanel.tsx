
'use client';

import React, { useState, useRef, ChangeEvent } from 'react';
import { useDesign } from '@/contexts/DesignContext';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  propertyDefinitions,
  type ComponentType,
  type ComponentProperty,
  getComponentDisplayName,
  DEFAULT_CONTENT_LAZY_COLUMN_ID,
  ROOT_SCAFFOLD_ID,
  DEFAULT_TOP_APP_BAR_ID,
  DEFAULT_BOTTOM_NAV_BAR_ID,
  CORE_SCAFFOLD_ELEMENT_IDS
} from '@/types/compose-spec';
import { PropertyEditor } from './PropertyEditor';
import { Trash2, Sparkles, Loader2, Upload, Search, Save, CopyPlus } from 'lucide-react';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';
import { generateImageFromHintAction } from '@/app/actions';
import { Separator } from '../ui/separator';
import type { ImageSourceModalRef } from './ImageSourceModal';
import type { BaseComponentProps, ClickAction } from '@/types/compose-spec';
import { ComponentTreeView } from './ComponentTreeView';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '../ui/select';

interface GroupedProperties {
  [groupName: string]: ReactNode[];
}

interface PropertyPanelProps {
  imageSourceModalRef: React.RefObject<ImageSourceModalRef>;
}

const PREFERRED_GROUP_ORDER = ['Layout', 'Appearance', 'Content', 'Behavior'];

export function PropertyPanel({ imageSourceModalRef }: PropertyPanelProps) {
  const { activeDesign, getComponentById, updateComponent, deleteComponent, customComponentTemplates, saveSelectedAsCustomTemplate, populateLazyContainer } = useDesign();
  
  const selectedComponentId = activeDesign?.selectedComponentId;
  const selectedComponent = selectedComponentId ? getComponentById(selectedComponentId) : null;
  
  const { toast } = useToast();

  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [newTemplateName, setNewTemplateName] = useState("");
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  
  // State for lazy container population
  const [childGenerationCount, setChildGenerationCount] = useState<number>(5);
  const [childGenerationType, setChildGenerationType] = useState<string>('Text');


  const handleSaveAsTemplate = async () => {
    if (!selectedComponentId) {
        toast({ title: "Error", description: "No component selected to save.", variant: "destructive"});
        return;
    }
    if (!newTemplateName.trim()) {
        toast({ title: "Name Required", description: "Please provide a name for the custom component.", variant: "destructive"});
        return;
    }
    setIsSavingTemplate(true);
    await saveSelectedAsCustomTemplate(newTemplateName.trim());
    setIsSavingTemplate(false);
    setNewTemplateName("");
  };

  const handlePopulateLazyContainer = () => {
    if (selectedComponent && (selectedComponent.type === 'LazyColumn' || selectedComponent.type === 'LazyRow')) {
        if (childGenerationCount > 0 && childGenerationType) {
            populateLazyContainer(selectedComponent.id, childGenerationType, childGenerationCount);
            toast({
                title: 'Components Generated',
                description: `${childGenerationCount} ${getComponentDisplayName(childGenerationType)} components were added.`,
            });
        } else {
            toast({
                title: 'Invalid Input',
                description: 'Please specify a count greater than 0 and select a component type.',
                variant: 'destructive',
            });
        }
    }
  };

  const getDefaultPropertyValue = (propDef: Omit<ComponentProperty, 'value'>) => {
    if (!selectedComponent) return '';
    if (['paddingTop', 'paddingBottom', 'paddingStart', 'paddingEnd'].includes(propDef.name)) {
        return selectedComponent.properties[propDef.name] ?? '';
    }
    if (propDef.type === 'number') return 0;
    if (propDef.type === 'boolean') return false;
    if (propDef.type === 'enum' && propDef.options && propDef.options.length > 0) return propDef.options[0].value;
    if (propDef.type === 'action') return { type: 'SHOW_TOAST', value: 'Clicked' };
    return '';
  };

  const renderProperties = () => {
    if (!selectedComponent || !activeDesign) return null;

    let componentPropsDefSourceType = selectedComponent.type;
    if (selectedComponent.templateIdRef) {
      const template = customComponentTemplates.find(t => t.templateId === selectedComponent.templateIdRef);
      if (template) {
        const rootTemplateComponent = template.componentTree.find(c => c.id === template.rootComponentId);
        if (rootTemplateComponent) {
          componentPropsDefSourceType = rootTemplateComponent.type; 
        }
      }
    }
    const componentPropsDef = (propertyDefinitions[componentPropsDefSourceType as ComponentType] || []) as (Omit<ComponentProperty, 'value'> & { group: string })[];

    const handlePropertyChange = (propName: string, value: string | number | boolean | ClickAction) => {
      let actualValue: any = value;
      const propDefinition = componentPropsDef.find(p => p.name === propName);
      if (propDefinition?.type === 'number' && value === '') {
        actualValue = undefined;
      }

      const updates: Partial<BaseComponentProps> = { [propName]: actualValue };

      if (propName === 'fillMaxSize') {
          const isChecked = actualValue as boolean;
          updates.fillMaxWidth = isChecked;
          updates.fillMaxHeight = isChecked;
      } else if (propName === 'fillMaxWidth' || propName === 'fillMaxHeight') {
          const isChecked = actualValue as boolean;
          const otherPropName = propName === 'fillMaxWidth' ? 'fillMaxHeight' : 'fillMaxHeight';
          const otherPropValue = selectedComponent.properties[otherPropName] ?? false;
          updates.fillMaxSize = isChecked && otherPropValue;
      }

      updateComponent(selectedComponent.id, { properties: updates });
    };

    const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
       updateComponent(selectedComponent.id, { name: event.target.value });
    };

    const handleDelete = () => {
      if (CORE_SCAFFOLD_ELEMENT_IDS.includes(selectedComponent.id) && !selectedComponent.templateIdRef) {
          toast({ title: "Action Prevented", description: "Core scaffold elements cannot be deleted.", variant: "destructive" });
          return;
      }
      if (window.confirm(`Are you sure you want to delete "${selectedComponent.name}"?`)) {
        deleteComponent(selectedComponent.id);
      }
    };

    const handleGenerateImage = async () => {
      if (selectedComponent.type !== 'Image' || !selectedComponent.properties['data-ai-hint']) {
        toast({ title: "Cannot Generate Image", description: "Please select an Image component and provide an AI hint.", variant: "destructive" });
        return;
      }
      setIsGeneratingImage(true);
      setGenerationError(null);
      try {
        const hint = selectedComponent.properties['data-ai-hint'] as string;
        const result = await generateImageFromHintAction(hint);
        if (result.imageUrls && result.imageUrls.length > 0) {
          updateComponent(selectedComponent.id, { properties: { src: result.imageUrls[0] } });
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

    const handleLocalImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file && selectedComponentId) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const dataUri = e.target?.result as string;
          updateComponent(selectedComponentId, { properties: { src: dataUri } });
          toast({ title: "Image Uploaded", description: "Local image set as source." });
        };
        reader.readAsDataURL(file);
      }
      if(event.target) event.target.value = "";
    };

    const handleImageFromModal = (imageUrl: string) => {
      if (selectedComponentId && imageUrl) {
          updateComponent(selectedComponentId, { properties: { src: imageUrl } });
          toast({ title: "Image Source Updated", description: "Image source set from modal." });
      }
    };

    const openImageSourceModal = () => {
      if (imageSourceModalRef.current) {
          imageSourceModalRef.current.openModal(handleImageFromModal, selectedComponent?.properties.src as string || '');
      } else {
          console.warn("ImageSourceModal ref not available in PropertyPanel.");
      }
    };

    const groupedProperties: GroupedProperties = {};
    const propertyGroups: string[] = [];

    let sourceComponentForShapeType = selectedComponent.type;
     if (selectedComponent.templateIdRef) {
      const template = customComponentTemplates.find(t => t.templateId === selectedComponent.templateIdRef);
      if (template) {
        const rootTemplateComponent = template.componentTree.find(c => c.id === template.rootComponentId);
        if (rootTemplateComponent) {
          sourceComponentForShapeType = rootTemplateComponent.type; 
        }
      }
    }
    
    const shouldShowCornerRadiusGroup = ['Image', 'Box', 'Card'].includes(sourceComponentForShapeType) || (sourceComponentForShapeType === 'Button' && selectedComponent.properties.shape === 'RoundedCorner');

    if (shouldShowCornerRadiusGroup) {
      const { cornerRadius, cornerRadiusTopLeft, cornerRadiusTopRight, cornerRadiusBottomRight, cornerRadiusBottomLeft } = selectedComponent.properties;
      const allCornersHaveValue = typeof cornerRadiusTopLeft === 'number' && typeof cornerRadiusTopRight === 'number' && typeof cornerRadiusBottomRight === 'number' && typeof cornerRadiusBottomLeft === 'number';
      const allCornersAreEqual = allCornersHaveValue && cornerRadiusTopLeft === cornerRadiusTopRight && cornerRadiusTopLeft === cornerRadiusBottomRight && cornerRadiusTopLeft === cornerRadiusBottomLeft;
      const allCornersValue = allCornersAreEqual ? (cornerRadiusTopLeft ?? '') : '';

      const handleAllCornersChange = (event: React.ChangeEvent<HTMLInputElement>) => {
          const strValue = event.target.value;
          const updates: Partial<BaseComponentProps> = { cornerRadiusTopLeft: undefined, cornerRadiusTopRight: undefined, cornerRadiusBottomRight: undefined, cornerRadiusBottomLeft: undefined, cornerRadius: undefined };

          if (strValue === '') {
               // Let's clear all corner properties
          } else {
              const numValue = parseFloat(strValue);
              if (!isNaN(numValue) && numValue >= 0) {
                  updates.cornerRadius = numValue;
                  updates.cornerRadiusTopLeft = numValue;
                  updates.cornerRadiusTopRight = numValue;
                  updates.cornerRadiusBottomRight = numValue;
                  updates.cornerRadiusBottomLeft = numValue;
              }
          }
          updateComponent(selectedComponent.id, { properties: updates });
      };

      const allCornersEditor = (
        <React.Fragment key="cornerRadiusAllFragment">
          <div className="space-y-1.5">
              <Label htmlFor="prop-cornerRadiusAll" className="text-xs font-semibold">Corner Radius (All dp)</Label>
              <Input id="prop-cornerRadiusAll" type="number" min={0} value={allCornersValue} onChange={handleAllCornersChange} placeholder={allCornersHaveValue && !allCornersAreEqual ? "Mixed" : "e.g., 8"} className="h-8 text-sm" />
          </div>
          <Separator className="my-3 bg-sidebar-border/50" />
        </React.Fragment>
      );
      if (!groupedProperties['Appearance']) { groupedProperties['Appearance'] = []; if (!propertyGroups.includes('Appearance')) { propertyGroups.push('Appearance'); } }
      groupedProperties['Appearance'].push(allCornersEditor);
    }

    componentPropsDef.forEach((propDef) => {
      if (propDef.name === 'onClickAction' && !selectedComponent.properties.clickable) {
        return; 
      }
      
      const isButtonShape = selectedComponent.type === 'Button' && selectedComponent.properties.shape === 'RoundedCorner';
      if (propDef.name === 'cornerRadius') {
        // Hide the general cornerRadius if individual controls are present (for non-buttons) or if it's a button and shape isn't rounded.
        if (!isButtonShape || shouldShowCornerRadiusGroup) return; 
      }
      if (['cornerRadiusTopLeft', 'cornerRadiusTopRight', 'cornerRadiusBottomRight', 'cornerRadiusBottomLeft'].includes(propDef.name)) {
        if (sourceComponentForShapeType === 'Button' && !isButtonShape) return;
      }


      const group = propDef.group || 'General';
      if (!groupedProperties[group]) { groupedProperties[group] = []; if (!propertyGroups.includes(group)) { propertyGroups.push('group'); } }

      let currentValue = selectedComponent.properties[propDef.name];
      if (['paddingTop', 'paddingBottom', 'paddingStart', 'paddingEnd'].includes(propDef.name) && currentValue === undefined) {
          currentValue = '';
      } else {
          currentValue = currentValue ?? getDefaultPropertyValue(propDef);
      }
      
      if (propDef.name === 'fillMaxSize') {
          currentValue = !!(selectedComponent.properties.fillMaxWidth && selectedComponent.properties.fillMaxHeight);
      }

      const editorElement = (
        <PropertyEditor
          key={propDef.name}
          property={propDef}
          currentValue={currentValue}
          onChange={(value) => handlePropertyChange(propDef.name, value)}
        />
      );

      if (propDef.type === 'boolean') {
         groupedProperties[group].push(
           <div key={`${propDef.name}-div`} className="flex items-center justify-between py-1">
             <Label htmlFor={`prop-${propDef.name}`} className="text-xs">{propDef.label}</Label>
             {editorElement}
           </div>
         );
      } else if (propDef.name === 'width' || propDef.name === 'height') {
        const shouldShow = propDef.name === 'width' ? !selectedComponent.properties.fillMaxWidth : !selectedComponent.properties.fillMaxHeight;
        if (shouldShow) {
          groupedProperties[group].push(editorElement);
        }
      }
      else {
         groupedProperties[group].push(editorElement);
      }

      if (propDef.name === 'src' && (selectedComponent.type === 'Image' || (sourceComponentForShapeType === 'Image'))) {
        const imageButtons = (
          <div key="src-buttons" className="mt-1.5 space-y-1.5">
             <div className="flex gap-1.5">
              <Button size="sm" variant="outline" className="flex-1 text-xs h-7" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="mr-1.5 h-3.5 w-3.5" /> Upload Local
              </Button>
              <Button size="sm" variant="outline" className="flex-1 text-xs h-7" onClick={openImageSourceModal}>
                  <Search className="mr-1.5 h-3.5 w-3.5" /> Online / URL
              </Button>
            </div>
            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleLocalImageUpload} style={{ display: 'none' }} />
          </div>
        );
        groupedProperties[group].push(imageButtons);
      }
    });

    propertyGroups.sort((a, b) => {
      const indexA = PREFERRED_GROUP_ORDER.indexOf(a);
      const indexB = PREFERRED_GROUP_ORDER.indexOf(b);
      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      return a.localeCompare(b);
    });

    let componentDisplayName;
    if (selectedComponent.templateIdRef) {
      componentDisplayName = customComponentTemplates.find(t => t.templateId === selectedComponent.templateIdRef)?.name || getComponentDisplayName(selectedComponent.type as ComponentType);
    } else {
      componentDisplayName = getComponentDisplayName(selectedComponent.type as ComponentType);
    }
    const isCoreScaffoldElement = CORE_SCAFFOLD_ELEMENT_IDS.includes(selectedComponent.id) && !selectedComponent.templateIdRef;
    
    const isLazyContainer = ['LazyColumn', 'LazyRow'].includes(selectedComponent.type);
    const availableChildTypes = Object.keys(propertyDefinitions).filter(type => !['Scaffold', 'TopAppBar', 'BottomNavigationBar'].includes(type));
    
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between mb-1 shrink-0">
           <h2 className="text-lg font-semibold text-sidebar-foreground font-headline truncate mr-2" title={`${selectedComponent.name} (${componentDisplayName})`}>
            {selectedComponent.name}
          </h2>
          <div className="flex items-center">
            <Button variant="ghost" size="icon" onClick={handleDelete} className="text-destructive hover:bg-destructive/10 h-7 w-7" aria-label="Delete component" disabled={isCoreScaffoldElement}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mb-3 -mt-1 shrink-0">{componentDisplayName}</p>

        <div className="mb-4 shrink-0">
          <Label htmlFor="componentName" className="text-xs">Instance Name</Label>
          <Input id="componentName" type="text" value={selectedComponent.name} onChange={handleNameChange} className="h-8 text-sm mt-1.5" disabled={isCoreScaffoldElement} />
        </div>

        {isLazyContainer && (
            <div className='mb-4 shrink-0 border border-sidebar-border rounded-md p-3 space-y-2 bg-muted/20'>
                <h3 className='text-sm font-medium text-sidebar-foreground'>Generate Children</h3>
                <div className='flex gap-2'>
                    <div className='flex-1 space-y-1'>
                        <Label htmlFor='child-count' className='text-xs'>Count</Label>
                        <Input
                            id='child-count'
                            type='number'
                            value={childGenerationCount}
                            onChange={(e) => setChildGenerationCount(Math.max(0, parseInt(e.target.value, 10) || 0))}
                            min={1}
                            className='h-8 text-sm'
                        />
                    </div>
                    <div className='flex-1 space-y-1'>
                        <Label htmlFor='child-type' className='text-xs'>Component Type</Label>
                        <Select value={childGenerationType} onValueChange={setChildGenerationType}>
                             <SelectTrigger id="child-type" className="h-8 text-sm">
                                <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectGroup>
                                    <SelectLabel>Standard</SelectLabel>
                                    {availableChildTypes.map(type => (
                                        <SelectItem key={type} value={type}>{getComponentDisplayName(type)}</SelectItem>
                                    ))}
                                </SelectGroup>
                                {customComponentTemplates.length > 0 && (
                                    <SelectGroup>
                                        <SelectLabel>Custom</SelectLabel>
                                        {customComponentTemplates.map(template => (
                                            <SelectItem key={template.templateId} value={template.templateId}>{template.name}</SelectItem>
                                        ))}
                                    </SelectGroup>
                                )}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <Button size="sm" className='w-full h-8' onClick={handlePopulateLazyContainer}>
                    <CopyPlus className='w-4 h-4 mr-2' />
                    Generate
                </Button>
            </div>
        )}

        {componentPropsDef.length === 0 && !activeDesign.editingTemplateInfo ? (
          <div className="flex-grow flex items-center justify-center min-h-0">
            <p className="text-sm text-muted-foreground">No editable properties for this component type.</p>
          </div>
        ) : (
          <div className="flex-grow flex flex-col min-h-0">
            <Tabs defaultValue={propertyGroups[0] || 'save'} className="flex flex-col flex-grow min-h-0">
              <div className="overflow-x-auto bg-muted/50 p-1 rounded-md shrink-0">
                <TabsList className="inline-flex h-auto bg-transparent p-0">
                  {propertyGroups.map((group) => (
                    <TabsTrigger key={group} value={group} className="text-xs px-2 py-1.5 h-auto whitespace-nowrap">
                      {group}
                    </TabsTrigger>
                  ))}
                   {!activeDesign.editingTemplateInfo && !isCoreScaffoldElement && (
                        <TabsTrigger value="save" className="text-xs px-2 py-1.5 h-auto whitespace-nowrap">
                          Save
                        </TabsTrigger>
                    )}
                </TabsList>
              </div>
              <ScrollArea className="flex-grow min-h-0 mt-3 -mx-4">
                <div className="px-4">
                  {propertyGroups.map((group) => (
                    <TabsContent key={group} value={group} className="space-y-3 mt-0">
                      {groupedProperties[group]}
                      {(selectedComponent.type === 'Image' || sourceComponentForShapeType === 'Image') && group === 'Content' && !groupedProperties[group].some(el => (el as React.ReactElement)?.key === 'src-buttons') && (
                        <div className="mt-3 pt-3 border-t border-sidebar-border">
                          <Button onClick={handleGenerateImage} disabled={isGeneratingImage || !selectedComponent.properties['data-ai-hint']} className="w-full" size="sm">
                            {isGeneratingImage ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                            Generate Image from Hint
                          </Button>
                          {generationError && <p className="text-xs text-destructive mt-1 text-center">{generationError}</p>}
                        </div>
                      )}
                    </TabsContent>
                  ))}
                   <TabsContent value="save" className="mt-0">
                        <div className="space-y-2 pt-2">
                            <Label htmlFor="templateName" className="text-xs">Custom Component Name</Label>
                            <Input
                                id="templateName"
                                placeholder="e.g., User Profile Card"
                                value={newTemplateName}
                                onChange={(e) => setNewTemplateName(e.target.value)}
                                disabled={isSavingTemplate}
                                className="h-8 text-sm"
                            />
                            <Button onClick={handleSaveAsTemplate} disabled={isSavingTemplate || !newTemplateName.trim()} className="w-full h-8 text-xs">
                                {isSavingTemplate ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>}
                                Save Selected as Component
                            </Button>
                        </div>
                    </TabsContent>
                </div>
              </ScrollArea>
            </Tabs>
          </div>
        )}
      </div>
    );
  };
  
  return (
    <aside className="w-80 border-l bg-sidebar p-4 flex flex-col shrink-0">
        <Tabs defaultValue="structure" className="w-full flex flex-col flex-grow min-h-0">
            <TabsList className="grid w-full grid-cols-2 shrink-0">
                <TabsTrigger value="properties" disabled={!selectedComponent}>Properties</TabsTrigger>
                <TabsTrigger value="structure">Structure</TabsTrigger>
            </TabsList>
            <TabsContent value="properties" className="flex-grow min-h-0 mt-4 focus-visible:ring-0 focus-visible:ring-offset-0">
                {selectedComponent ? renderProperties() : (
                    <div className="flex-grow flex items-center justify-center h-full">
                      <p className="text-sm text-muted-foreground text-center p-4">Select a component on the canvas to see its properties.</p>
                    </div>
                )}
            </TabsContent>
             <TabsContent value="structure" className="flex-grow min-h-0 mt-2 focus-visible:ring-0 focus-visible:ring-offset-0">
                <ComponentTreeView />
            </TabsContent>
        </Tabs>
    </aside>
  );
}
