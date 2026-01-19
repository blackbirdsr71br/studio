

'use client';

import type { ChangeEvent } from 'react';
import React from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ComponentProperty, ComponentPropertyOption, ClickAction, LinearGradient } from '@/types/compose-spec';
import { Button } from '../ui/button';
import { Droplet, XCircle, Plus, Trash2 } from 'lucide-react';
import { Slider } from '../ui/slider';
import { ThemePropertySelector } from './ThemePropertySelector';
import { getComponentIcon } from './ComponentIconMap';

interface PropertyEditorProps {
  property: Omit<ComponentProperty, 'value'>; // Definition of the property
  currentValue: string | number | boolean | ClickAction | LinearGradient | null | undefined; // Actual current value from the component
  onChange: (value: string | number | boolean | ClickAction | LinearGradient | null) => void;
}

export function PropertyEditor({ property, currentValue, onChange }: PropertyEditorProps) {

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (property.type === 'number') {
      const strValue = e.target.value;
      if (strValue === '') {
        onChange(null); 
      } else {
        const numValue = parseFloat(strValue);
        if (!isNaN(numValue)) {
          if (property.name === 'layoutWeight' || property.name === 'lineHeight') {
            onChange(numValue);
          } else {
            onChange(Math.round(numValue));
          }
        }
      }
    } else {
      onChange(e.target.value);
    }
  };

  const handleSwitchChange = (checked: boolean) => {
    onChange(checked);
  };

  const handleSelectChange = (value: string) => {
    onChange(value);
  };

  const handleActionChange = (field: 'type' | 'value', value: string) => {
    const newAction: ClickAction = {
      ...((currentValue as ClickAction) || { type: 'SHOW_TOAST', value: '' }),
      [field]: value
    };
    onChange(newAction);
  };

  const handleTransparentClick = () => {
    onChange('transparent');
  }

  const handleNoColorClick = () => {
    onChange(null);
  }
  
  const id = `prop-${property.name}`;
  
  switch (property.type) {
     case 'gradient':
      const isGradient = typeof currentValue === 'object' && currentValue?.type === 'linearGradient';
      const gradient = isGradient ? (currentValue as LinearGradient) : { type: 'linearGradient', colors: ['#FFFFFF', '#000000'], angle: 90 };
      const solidColor = typeof currentValue === 'string' ? currentValue : '#FFFFFF';

      const handleGradientTypeChange = (type: 'solid' | 'linearGradient') => {
        if (type === 'solid') {
          onChange(solidColor);
        } else {
          onChange(gradient);
        }
      };
      
      const handleGradientColorChange = (index: number, color: string) => {
        const newColors = [...gradient.colors];
        newColors[index] = color;
        onChange({ ...gradient, colors: newColors });
      };

      const addGradientColor = () => {
        onChange({ ...gradient, colors: [...gradient.colors, '#000000'] });
      };

      const removeGradientColor = (index: number) => {
        if (gradient.colors.length > 2) {
          const newColors = gradient.colors.filter((_, i) => i !== index);
          onChange({ ...gradient, colors: newColors });
        }
      };
      
      const handleAngleChange = (newAngle: number[]) => {
        onChange({ ...gradient, angle: newAngle[0] });
      };

      return (
        <div className="space-y-3 p-2 my-2 border rounded-md border-sidebar-border">
          <Select value={isGradient ? 'linearGradient' : 'solid'} onValueChange={handleGradientTypeChange}>
            <SelectTrigger className="h-8 text-xs mt-1">
              <SelectValue placeholder="Select background type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="solid">Solid Color</SelectItem>
              <SelectItem value="linearGradient">Linear Gradient</SelectItem>
            </SelectContent>
          </Select>

          {!isGradient ? (
             <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor={`${id}-solid`} className="text-xs">Solid Color</Label>
                  <ThemePropertySelector
                      type="color"
                      onSelect={(value) => onChange(value as string)}
                  />
                </div>
                <div className="flex items-center gap-2">
                    <Input id={`${id}-solid-color`} type="color" value={solidColor === 'transparent' ? '#ffffff' : solidColor} onChange={e => onChange(e.target.value)} className="h-8 w-10 p-1" />
                    <Input id={`${id}-solid-hex`} type="text" value={solidColor} onChange={e => onChange(e.target.value)} placeholder="#RRGGBB" className="h-8 text-sm flex-grow" />
                </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Gradient Colors</Label>
                <div className="space-y-2 mt-1">
                  {gradient.colors.map((color, index) => (
                    <div key={index} className="flex items-center gap-2">
                       <Input type="color" value={color} onChange={e => handleGradientColorChange(index, e.target.value)} className="h-8 w-10 p-1" />
                       <Input type="text" value={color} onChange={e => handleGradientColorChange(index, e.target.value)} className="h-8 text-sm flex-grow" />
                       <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeGradientColor(index)} disabled={gradient.colors.length <= 2}>
                          <Trash2 className="h-4 w-4" />
                       </Button>
                    </div>
                  ))}
                </div>
                 <Button variant="outline" size="sm" onClick={addGradientColor} className="mt-2 text-xs h-7">
                    <Plus className="h-4 w-4 mr-1" /> Add Color
                </Button>
              </div>
              <div className="space-y-1.5">
                 <Label htmlFor={`${id}-angle`} className="text-xs">Angle ({gradient.angle}°)</Label>
                 <Slider id={`${id}-angle`} min={0} max={360} step={1} value={[gradient.angle]} onValueChange={handleAngleChange} />
              </div>
            </div>
          )}
        </div>
      );
    case 'action':
      const action = currentValue as ClickAction || { type: 'SHOW_TOAST', value: 'Clicked' };
      return (
        <div className="space-y-3 p-2 my-2 border rounded-md border-sidebar-border">
          <div>
            <Label htmlFor={`${id}-type`} className="text-xs">Action Type</Label>
            <Select value={action.type} onValueChange={(v) => handleActionChange('type', v)}>
              <SelectTrigger id={`${id}-type`} className="h-8 text-sm mt-1">
                <SelectValue placeholder="Select an action type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SHOW_TOAST">Show Toast</SelectItem>
                <SelectItem value="NAVIGATE">Navigate</SelectItem>
                <SelectItem value="CUSTOM_EVENT">Custom Event</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
             <Label htmlFor={`${id}-value`} className="text-xs">Action Value</Label>
             <Input
                id={`${id}-value`}
                type="text"
                value={action.value || ''}
                onChange={(e) => handleActionChange('value', e.target.value)}
                placeholder="e.g., /profile, Item clicked, etc."
                className="h-8 text-sm mt-1"
             />
          </div>
        </div>
      )
    case 'string':
      return (
        <div className="space-y-1.5">
          <Label htmlFor={id} className="text-xs">{property.label}</Label>
          <Input
            id={id}
            type="text"
            value={(currentValue as string) || ''}
            onChange={handleInputChange}
            placeholder={property.placeholder}
            className="h-8 text-sm"
          />
        </div>
      );
    case 'number':
       const numValue = currentValue;
      return (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor={id} className="text-xs">{property.label}</Label>
            {property.name.toLowerCase().includes('radius') && (
                <ThemePropertySelector
                    type="shape"
                    onSelect={(value) => onChange(value as number)}
                />
            )}
          </div>
          <Input
            id={id}
            type="number"
            value={numValue ?? ''}
            onChange={handleInputChange}
            placeholder={property.placeholder}
            className="h-8 text-sm"
            min={0}
            step={property.name === 'layoutWeight' || property.name === 'lineHeight' ? '0.1' : '1'}
          />
        </div>
      );
    case 'color':
       const isTransparent = currentValue === 'transparent';
       const isNull = currentValue === null || currentValue === undefined;
       const colorValue = isTransparent || isNull ? '#FFFFFF' : (currentValue as string || '#FFFFFF');
       const textValue = isNull ? '' : (currentValue as string || '');
      return (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor={id} className="text-xs">{property.label}</Label>
            <ThemePropertySelector
              type="color"
              onSelect={(value) => onChange(value as string)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Input
              id={id}
              type="color"
              value={colorValue}
              onChange={handleInputChange}
              className="h-8 w-10 p-1"
            />
            <Input
              type="text"
              value={textValue}
              onChange={handleInputChange}
              placeholder={isNull ? "None" : "#RRGGBB or transparent"}
              className="h-8 text-sm flex-grow"
              aria-label={`${property.label} hex value`}
            />
          </div>
          <div className="flex items-center gap-2 mt-1">
             <Button
              size="sm"
              variant={isTransparent ? "secondary" : "outline"}
              onClick={handleTransparentClick}
              className="h-7 text-xs px-2 flex-1"
              title="Set to transparent"
            >
              <Droplet className="w-3 h-3 mr-1" />
              Transparent
            </Button>
            <Button
              size="sm"
              variant={isNull ? "secondary" : "outline"}
              onClick={handleNoColorClick}
              className="h-7 text-xs px-2 flex-1"
              title="Set no color"
            >
              <XCircle className="w-3 h-3 mr-1" />
              No Color
            </Button>
          </div>
        </div>
      );
    case 'boolean':
      return (
        <div className="flex items-center justify-between space-x-2 py-2">
          <Label htmlFor={id} className="text-xs">{property.label}</Label>
          <Switch
            id={id}
            checked={!!currentValue}
            onCheckedChange={handleSwitchChange}
          />
        </div>
      );
    case 'enum':
      if (property.name === 'iconName') {
        const Icon = currentValue ? getComponentIcon(currentValue as string) : null;
        return (
          <div className="space-y-1.5">
            <Label htmlFor={id} className="text-xs">{property.label}</Label>
            <Select value={(currentValue as string) || ''} onValueChange={handleSelectChange}>
              <SelectTrigger id={id} className="h-8 text-sm">
                <SelectValue placeholder={property.placeholder || "Select an icon"}>
                  {Icon ? (
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      <span>{property.options?.find(o => o.value === currentValue)?.label || currentValue}</span>
                    </div>
                  ) : (
                    <span>{property.placeholder || "Select an icon"}</span>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {(property.options as ComponentPropertyOption[] || []).map(option => {
                  const ItemIcon = getComponentIcon(option.value);
                  return (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <ItemIcon className="h-4 w-4" />
                        <span>{option.label}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        );
      }

      // Default enum rendering
      return (
        <div className="space-y-1.5">
          <Label htmlFor={id} className="text-xs">{property.label}</Label>
          <Select value={(currentValue as string) || ''} onValueChange={handleSelectChange}>
            <SelectTrigger id={id} className="h-8 text-sm">
              <SelectValue placeholder={property.placeholder || "Select an option"} />
            </SelectTrigger>
            <SelectContent>
              {(property.options as ComponentPropertyOption[] || []).map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    default:
      return <p className="text-xs text-red-500">Unsupported property type: {property.type}</p>;
  }
}
