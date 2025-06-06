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
    const value = property.type === 'number' ? parseFloat(e.target.value) : e.target.value;
    if (property.type === 'number' && isNaN(value as number)) {
      // Allow empty string for numbers to clear input, but don't pass NaN
      onChange(''); // or some default like 0, or keep previous valid value
    } else {
      onChange(value);
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
            value={currentValue as number ?? ''} // Allow empty display for undefined/null numbers
            onChange={handleInputChange}
            placeholder={property.placeholder}
            className="h-8 text-sm"
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
