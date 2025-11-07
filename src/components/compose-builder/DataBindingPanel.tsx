

'use client';

import React, { useState, useEffect } from 'react';
import { useDesign } from '@/contexts/DesignContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '@/components/ui/select';
import { Loader2, Link, CopyPlus, ChevronDown } from 'lucide-react';
import { fetchAndAnalyzeEndpoint } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { getComponentDisplayName, propertyDefinitions, type ComponentType, isContainerType, DesignComponent, CUSTOM_COMPONENT_TYPE_PREFIX } from '@/types/compose-spec';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { cn } from '@/lib/utils';


function isLazyContainerType(type: string): boolean {
    return ['LazyColumn', 'LazyRow', 'LazyVerticalGrid', 'LazyHorizontalGrid'].includes(type);
}


function RecursiveBindingUI({ componentId, getComponent, schema, dataBindings, onBindingChange, level = 0 }: {
    componentId: string;
    getComponent: (id: string) => DesignComponent | undefined;
    schema: string[];
    dataBindings: Record<string, string>;
    onBindingChange: (propPath: string, bindingKey: string) => void;
    level?: number;
}) {
    const component = getComponent(componentId);

    if (!component) {
        return <div className="text-destructive text-xs">Component with ID {componentId} not found in template.</div>;
    }

    const propsForBinding = (propertyDefinitions[component.type as ComponentType] || [])
        .filter(p => !['Layout', 'Behavior', 'Slots'].includes(p.group) && p.name !== 'children' && !p.name.startsWith('on'))
        .sort((a,b) => a.label.localeCompare(b.label));

    const isContainer = isContainerType(component.type);

    const renderPropertyInputs = () => {
        if (propsForBinding.length === 0) {
            return <p className="text-xs text-center text-muted-foreground p-1">No bindable properties for this component.</p>;
        }
        return propsForBinding.map(prop => {
            const propPath = `${component.id}.${prop.name}`;
            const boundValue = dataBindings[propPath]?.replace(/[{}]/g, '') || 'none';
            return (
                <div key={propPath} className="flex items-center justify-between gap-2 py-1">
                    <Label htmlFor={`binding-${propPath}`} className="text-xs text-muted-foreground whitespace-nowrap">{prop.label}</Label>
                    <Select value={boundValue} onValueChange={(value) => onBindingChange(propPath, value)} disabled={schema.length === 0}>
                        <SelectTrigger id={`binding-${propPath}`} className="h-7 w-[55%] text-xs">
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

    if (isContainer) {
        return (
            <Accordion type="single" collapsible className="w-full" defaultValue={`item-${component.id}`}>
                <AccordionItem value={`item-${component.id}`} className={cn("border-b-0", level > 0 && "ml-3 pl-2 border-l")}>
                    <AccordionTrigger className="text-xs font-medium text-sidebar-foreground py-1.5 hover:no-underline">
                       <div className="flex items-center gap-1.5">
                         <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-200" />
                         <span>{getComponentDisplayName(component.type)}: <span className="font-normal text-muted-foreground">{component.name}</span></span>
                       </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-0">
                         <div className="space-y-1 pl-2 border-l-2 border-primary/20 ml-1.5">
                            <div className="pl-4 pr-1 space-y-1">{renderPropertyInputs()}</div>
                            {component.properties.children?.map(childId => (
                                <RecursiveBindingUI
                                    key={childId}
                                    componentId={childId}
                                    getComponent={getComponent}
                                    schema={schema}
                                    dataBindings={dataBindings}
                                    onBindingChange={onBindingChange}
                                    level={level + 1}
                                />
                            ))}
                        </div>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        );
    }

    return (
        <div className={cn("py-1", level > 0 && "ml-3 pl-3 border-l")}>
            <p className="text-xs font-medium text-sidebar-foreground">{getComponentDisplayName(component.type)}: <span className="font-normal text-muted-foreground">{component.name}</span></p>
            <div className="pl-4 pr-1 mt-1 space-y-1">{renderPropertyInputs()}</div>
        </div>
    );
}



export function DataBindingPanel() {
  const { activeDesign, getComponentById, updateComponent, customComponentTemplates, generateChildrenFromDataSource } = useDesign();
  const { toast } = useToast();

  const selectedComponentId = activeDesign?.selectedComponentId;
  const selectedComponent = selectedComponentId ? getComponentById(selectedComponentId) : null;
  const parentComponent = selectedComponent?.parentId ? getComponentById(selectedComponent.parentId) : null;

  const targetContainer = isLazyContainerType(selectedComponent?.type || '')
    ? selectedComponent
    : parentComponent && isLazyContainerType(parentComponent.type)
    ? parentComponent
    : null;

  const [url, setUrl] = useState('');
  const [schema, setSchema] = useState<string[]>([]);
  const [isLoadingSchema, setIsLoadingSchema] = useState(false);
  const [dataBindings, setDataBindings] = useState<Record<string, string>>({});
  
  const [childTemplateId, setChildTemplateId] = useState<string>('Text');

  useEffect(() => {
    if (targetContainer) {
        const newUrl = targetContainer.properties.dataSource?.url || '';
        const newSchema = targetContainer.properties.dataSource?.schema || [];
        const newBindings = targetContainer.properties.dataBindings || {};
        
        let newTemplateId;
        if(targetContainer.properties.childrenTemplate?.templateIdRef) {
          newTemplateId = targetContainer.properties.childrenTemplate.templateIdRef;
        } else {
          newTemplateId = targetContainer.properties.childrenTemplate?.type || 'Text';
        }

        setUrl(newUrl);
        setSchema(newSchema);
        setDataBindings(newBindings);
        setChildTemplateId(newTemplateId);
    }
  }, [targetContainer]);


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
      } else if (result.schema){
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

  const handleBindingChange = (propPath: string, bindingKey: string) => {
    const newBindings = { ...dataBindings };
    if (bindingKey === 'none') {
      delete newBindings[propPath];
    } else {
      newBindings[propPath] = `{${bindingKey}}`;
    }
    setDataBindings(newBindings);
    if (targetContainer) {
      updateComponent(targetContainer.id, { properties: { dataBindings: newBindings } });
    }
  };

  const handleGenerateChildren = () => {
    if (targetContainer && childTemplate) {
        if (typeof generateChildrenFromDataSource === 'function') {
            generateChildrenFromDataSource(targetContainer.id, childTemplate);
        } else {
            console.error("generateChildrenFromDataSource is not a function on useDesign context");
            toast({ title: "Error", description: "The feature to generate children is currently unavailable.", variant: "destructive" });
        }
    } else {
      toast({ title: "Error", description: "A valid container and child template must be selected.", variant: "destructive" });
    }
  };
  
  const handleTemplateChange = (templateId: string) => {
      setChildTemplateId(templateId);
      if (targetContainer) {
          let templateComponent: DesignComponent | undefined;
          if(templateId.startsWith(CUSTOM_COMPONENT_TYPE_PREFIX)) {
              const customTemplate = customComponentTemplates.find(t => t.templateId === templateId);
              if (customTemplate) {
                  templateComponent = customTemplate.componentTree.find(c => c.id === customTemplate.rootComponentId);
                   if (templateComponent) {
                      templateComponent.templateIdRef = templateId;
                   }
              }
          } else {
              templateComponent = { id: 'template-dummy', type: templateId as ComponentType, name: getComponentDisplayName(templateId as ComponentType), properties: {} };
          }
          if (templateComponent) {
            updateComponent(targetContainer.id, { properties: { childrenTemplate: templateComponent }});
          }
      }
  }

  const availableChildTypes = Object.keys(propertyDefinitions).filter(type => !['Scaffold', 'TopAppBar', 'BottomNavigationBar'].includes(type) && !isLazyContainerType(type));

  let childTemplate: DesignComponent | undefined;
  let getTemplateComponentById: (id: string) => DesignComponent | undefined = () => undefined;
  
  if (childTemplateId.startsWith(CUSTOM_COMPONENT_TYPE_PREFIX)) {
      const template = customComponentTemplates.find(t => t.templateId === childTemplateId);
      if(template) {
          childTemplate = template.componentTree.find(c => c.id === template.rootComponentId);
          getTemplateComponentById = (id: string) => template.componentTree.find(c => c.id === id);
      }
  } else {
      childTemplate = { id: 'template-dummy-id', type: childTemplateId as ComponentType, name: getComponentDisplayName(childTemplateId as ComponentType), properties: {} };
      getTemplateComponentById = () => childTemplate;
  }
  
  if (!targetContainer) {
    return <p className='text-sm text-muted-foreground p-4 text-center'>Select a Lazy container or its direct child to configure data binding.</p>
  }

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
        <Select value={childTemplateId} onValueChange={handleTemplateChange}>
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Select a component template" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Standard Components</SelectLabel>
              {availableChildTypes.map(type => (
                <SelectItem key={type} value={type}>{getComponentDisplayName(type as ComponentType)}</SelectItem>
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
        <div className="space-y-2 rounded-md border p-2 bg-muted/20 max-h-60 overflow-y-auto">
          {schema.length === 0 ? (
            <p className="text-xs text-center text-muted-foreground py-4">Fetch a schema to see binding options.</p>
          ) : !childTemplate ? (
            <p className="text-xs text-center text-muted-foreground py-4">Select a child template to configure bindings.</p>
          ) : (
            <RecursiveBindingUI
                componentId={childTemplate.id}
                getComponent={getTemplateComponentById}
                schema={schema}
                dataBindings={dataBindings}
                onBindingChange={handleBindingChange}
            />
          )}
        </div>
      </div>
      
      <div>
         <h3 className="text-base font-medium mb-2">4. Generate Children</h3>
        <Button onClick={handleGenerateChildren} disabled={!targetContainer || schema.length === 0 || !childTemplate} className="w-full">
            <CopyPlus className="mr-2 h-4 w-4" />
            Generate Children from Data
        </Button>
        <p className="text-xs text-muted-foreground mt-2 text-center">This will replace existing children with new components based on the data source.</p>
      </div>
    </div>
  );
}
