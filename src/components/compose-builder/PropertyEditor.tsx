'use client';

import type { ChangeEvent } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ComponentProperty, ComponentPropertyOption } from '@/types/compose-spec';

interface PropertyEditorProps {
  property: Omit<ComponentProperty, 'value'>; // Definition of the property
  currentValue: string | number | boolean; // Actual current value from the component
  onChange: (value: string | number | boolean) => void;
}

export function PropertyEditor({ property, currentValue, onChange }: PropertyEditorProps) {
  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (property.type === 'number') {
      const strValue = e.target.value;
      if (strValue === '') {
        // Handle empty string for numbers, perhaps by sending a default or allowing undefined
        // For now, let's send 0 if cleared, or you might want to send undefined/null
        // to signify "reset to default" if your backend handles it.
        // Sending 0 ensures a number is always passed.
        onChange(0); 
      } else {
        const numValue = parseFloat(strValue);
        if (!isNaN(numValue)) {
          // Allow floats only for specific properties like layoutWeight.
          // Round all other numeric inputs to the nearest integer as requested.
          if (property.name === 'layoutWeight') {
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
  
  const id = `prop-${property.name}`;

  switch (property.type) {
    case 'string':
      return (
        <div className="space-y-1.5">
          <Label htmlFor={id} className="text-xs">{property.label}</Label>
          <Input
            id={id}
            type="text"
            value={currentValue as string || ''}
            onChange={handleInputChange}
            placeholder={property.placeholder}
            className="h-8 text-sm"
          />
        </div>
      );
    case 'number':
      return (
        <div className="space-y-1.5">
          <Label htmlFor={id} className="text-xs">{property.label}</Label>
          <Input
            id={id}
            type="number"
            value={currentValue as number ?? ''} // Display current value, allow empty string for clearing
            onChange={handleInputChange}
            placeholder={property.placeholder}
            className="h-8 text-sm"
            min={0}
            step={property.name === 'layoutWeight' ? '0.1' : '1'}
          />
        </div>
      );
    case 'color':
      return (
        <div className="space-y-1.5">
          <Label htmlFor={id} className="text-xs">{property.label}</Label>
          <div className="flex items-center gap-2">
            <Input
              id={id}
              type="color"
              value={currentValue as string || '#000000'}
              onChange={handleInputChange}
              className="h-8 w-10 p-1"
            />
            <Input
              type="text"
              value={currentValue as string || '#000000'}
              onChange={handleInputChange}
              placeholder="#RRGGBB"
              className="h-8 text-sm flex-grow"
              aria-label={`${property.label} hex value`}
            />
          </div>
        </div>
      );
    case 'boolean':
      return (
        <div className="flex items-center justify-between space-x-2 py-2">
          <Label htmlFor={id} className="text-xs">{property.label}</Label>
          <Switch
            id={id}
            checked={currentValue as boolean}
            onCheckedChange={handleSwitchChange}
          />
        </div>
      );
    case 'enum':
      return (
        <div className="space-y-1.5">
          <Label htmlFor={id} className="text-xs">{property.label}</Label>
          <Select value={currentValue as string} onValueChange={handleSelectChange}>
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
