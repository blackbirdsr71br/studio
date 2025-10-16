

'use client';

import type { ChangeEvent } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ComponentProperty, ComponentPropertyOption, ClickAction } from '@/types/compose-spec';
import { Button } from '../ui/button';
import { Droplet } from 'lucide-react';

interface PropertyEditorProps {
  property: Omit<ComponentProperty, 'value'>; // Definition of the property
  currentValue: string | number | boolean | ClickAction; // Actual current value from the component
  onChange: (value: string | number | boolean | ClickAction) => void;
}

export function PropertyEditor({ property, currentValue, onChange }: PropertyEditorProps) {

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (property.type === 'number') {
      const strValue = e.target.value;
      if (strValue === '') {
        onChange(0); 
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
      ...(currentValue as ClickAction),
      [field]: value
    };
    onChange(newAction);
  };

  const handleTransparentClick = () => {
    if (currentValue === 'transparent') {
      onChange('#FFFFFF');
    } else {
      onChange('transparent');
    }
  }
  
  const id = `prop-${property.name}`;
  const isTransparent = currentValue === 'transparent';

  switch (property.type) {
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
                value={action.value}
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
            value={currentValue as number ?? ''}
            onChange={handleInputChange}
            placeholder={property.placeholder}
            className="h-8 text-sm"
            min={0}
            step={property.name === 'layoutWeight' || property.name === 'lineHeight' ? '0.1' : '1'}
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
              value={isTransparent ? '#FFFFFF' : (currentValue as string || '#FFFFFF')}
              onChange={handleInputChange}
              className="h-8 w-10 p-1"
              disabled={isTransparent}
            />
            <Input
              type="text"
              value={currentValue as string || '#FFFFFF'}
              onChange={handleInputChange}
              placeholder="#RRGGBB or transparent"
              className="h-8 text-sm flex-grow"
              aria-label={`${property.label} hex value`}
              disabled={isTransparent}
            />
            <Button
              size="sm"
              variant={isTransparent ? "default" : "outline"}
              onClick={handleTransparentClick}
              className="h-8 text-xs px-2"
              title="Set to transparent"
            >
              <Droplet className="w-3 h-3 mr-1" />
              Transparent
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
