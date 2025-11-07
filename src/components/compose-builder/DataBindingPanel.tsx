

'use client';

import React, { useState, useEffect } from 'react';
import { useDesign } from '@/contexts/DesignContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '@/components/ui/select';
import { Loader2, Link, CopyPlus } from 'lucide-react';
import { fetchAndAnalyzeEndpoint } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { getComponentDisplayName, propertyDefinitions, type ComponentType, isContainerType } from '@/types/compose-spec';

function isLazyContainerType(type: string): boolean {
    return ['LazyColumn', 'LazyRow', 'LazyVerticalGrid', 'LazyHorizontalGrid'].includes(type);
}


export function DataBindingPanel() {
  const { activeDesign, getComponentById, updateComponent, customComponentTemplates, generateChildrenFromDataSource } = useDesign();
  const { toast } = useToast();

  const selectedComponentId = activeDesign?.selectedComponentId;
  const selectedComponent = selectedComponentId ? getComponentById(selectedComponentId) : null;
  const parentComponent = selectedComponent?.parentId ? getComponentById(selectedComponent.parentId) : null;

  const targetContainer = isLazyContainerType(selectedComponent?.type || '')
    ? selectedComponent
    : (parentComponent && isLazyContainerType(parentComponent.type))
      ? parentComponent
      : null;

  const [url, setUrl] = useState(targetContainer?.properties.dataSource?.url || '');
  const [schema, setSchema] = useState<string[]>(targetContainer?.properties.dataSource?.schema || []);
  const [isLoadingSchema, setIsLoadingSchema] = useState(false);
  const [dataBindings, setDataBindings] = useState(targetContainer?.properties.dataBindings || {});
  
  const [childTemplate, setChildTemplate] = useState<string>(
    targetContainer?.properties.childrenTemplate?.type || 
    (targetContainer?.properties.children?.[0] ? (getComponentById(targetContainer.properties.children[0])?.type || 'Text') : 'Text')
  );

  useEffect(() => {
    setUrl(targetContainer?.properties.dataSource?.url || '');
    setSchema(targetContainer?.properties.dataSource?.schema || []);
    setDataBindings(targetContainer?.properties.dataBindings || {});
    const firstChildId = targetContainer?.properties.children?.[0];
    const firstChild = firstChildId ? getComponentById(firstChildId) : null;
    const templateType = targetContainer?.properties.childrenTemplate?.type || firstChild?.type || 'Text';
    setChildTemplate(templateType);
  }, [targetContainer, getComponentById]);

  const handleFetchSchema = async () => {
    if (!url.trim()) {
      toast({ title: "URL is required", variant: "destructive" });
      return;
    }
    setIsLoadingSchema(true);
    try {
      const result = await fetchAndAnalyzeEndpoint(url);
      if (result.error) {
        toast({ title: "Failed to fetch schema", description: result.error, variant: "destructive" });
        setSchema([]);
      } else {
        toast({ title: "Schema fetched successfully", description: `Found fields: ${result.schema?.join(', ')}` });
        setSchema(result.schema || []);
        if (targetContainer) {
          updateComponent(targetContainer.id, {
            properties: { dataSource: { url, schema: result.schema } }
          });
        }
      }
    } catch (error) {
      toast({ title: "Error", description: "An unexpected error occurred.", variant: "destructive" });
    } finally {
      setIsLoadingSchema(false);
    }
  };

  const handleBindingChange = (propName: string, bindingKey: string) => {
    const newBindings = { ...dataBindings, [propName]: `{${bindingKey}}` };
    if (bindingKey === 'none') {
      delete newBindings[propName];
    }
    setDataBindings(newBindings);
    if (targetContainer) {
      updateComponent(targetContainer.id, { properties: { dataBindings: newBindings } });
    }
  };

  const handleGenerateChildren = () => {
    if (targetContainer) {
      generateChildrenFromDataSource(targetContainer.id, childTemplate);
    }
  };
  
  const handleTemplateChange = (templateId: string) => {
      setChildTemplate(templateId);
      if (targetContainer) {
          const templateComponent = { type: templateId, properties: {} } as any; // Simplified
          updateComponent(targetContainer.id, { properties: { childrenTemplate: templateComponent } });
      }
  }

  const renderBindingUI = () => {
    const propsForBinding = propertyDefinitions[childTemplate as ComponentType] || [];
    const relevantProps = propsForBinding.filter(p => ['text', 'src', 'contentDescription', 'title'].includes(p.name));

    return relevantProps.map(prop => {
      const currentBinding = Object.entries(dataBindings).find(([_, val]) => val === `{${prop.name}}`)?.[0] || 'none';
      const boundValue = dataBindings[prop.name]?.replace(/[{}]/g, '') || 'none';
      
      return (
        <div key={prop.name} className="flex items-center justify-between gap-2">
          <Label htmlFor={`binding-${prop.name}`} className="text-sm text-muted-foreground whitespace-nowrap">{prop.label}</Label>
          <Select value={boundValue} onValueChange={(value) => handleBindingChange(prop.name, value)} disabled={schema.length === 0}>
            <SelectTrigger id={`binding-${prop.name}`} className="h-8 w-[60%]">
              <SelectValue placeholder="Select field" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {schema.map(field => (
                <SelectItem key={field} value={field}>{field}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    });
  };

  const availableChildTypes = Object.keys(propertyDefinitions).filter(type => !['Scaffold', 'TopAppBar', 'BottomNavigationBar'].includes(type));

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-medium mb-2">1. Data Source</h3>
        <div className="space-y-1.5">
          <Label htmlFor="dataSourceUrl">REST Endpoint URL</Label>
          <div className="flex gap-2">
            <Input id="dataSourceUrl" value={url || ''} onChange={e => setUrl(e.target.value)} placeholder="https://api.example.com/items" />
            <Button onClick={handleFetchSchema} disabled={isLoadingSchema} variant="outline" size="icon" className="h-9 w-9">
              {isLoadingSchema ? <Loader2 className="animate-spin" /> : <Link />}
            </Button>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-base font-medium mb-2">2. Child Template</h3>
        <Select value={childTemplate} onValueChange={handleTemplateChange}>
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Select a component template" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Standard Components</SelectLabel>
              {availableChildTypes.map(type => (
                <SelectItem key={type} value={type}>{getComponentDisplayName(type)}</SelectItem>
              ))}
            </SelectGroup>
            {customComponentTemplates.length > 0 && (
              <SelectGroup>
                <SelectLabel>Custom Components</SelectLabel>
                {customComponentTemplates.map(template => (
                  <SelectItem key={template.templateId} value={template.templateId}>{template.name}</SelectItem>
                ))}
              </SelectGroup>
            )}
          </SelectContent>
        </Select>
      </div>

      <div>
        <h3 className="text-base font-medium mb-2">3. Property Bindings</h3>
        <div className="space-y-2 rounded-md border p-3 bg-muted/20">
          {schema.length > 0 ? renderBindingUI() : <p className="text-xs text-center text-muted-foreground">Fetch a schema to see binding options.</p>}
        </div>
      </div>
      
      <div>
         <h3 className="text-base font-medium mb-2">4. Generate Children</h3>
        <Button onClick={handleGenerateChildren} disabled={!targetContainer || schema.length === 0 || Object.keys(dataBindings).length === 0} className="w-full">
            <CopyPlus className="mr-2 h-4 w-4" />
            Generate Children from Data
        </Button>
        <p className="text-xs text-muted-foreground mt-2 text-center">This will replace existing children with new components based on the data source and bindings.</p>
      </div>
    </div>
  );
}
