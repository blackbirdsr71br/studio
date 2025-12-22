
'use client';

import React from 'react';
import { useDesign } from '@/contexts/DesignContext';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Palette, Type as TypeIcon, Shapes } from 'lucide-react';
import type { M3Colors, M3Typography, M3Shapes } from '@/types/compose-spec';
import { ScrollArea } from '../ui/scroll-area';

type SelectorType = 'color' | 'typography' | 'shape';

interface ThemePropertySelectorProps {
  type: SelectorType;
  onSelect: (value: string | number | Record<string, any>) => void;
}

const toTitleCase = (str: string) => {
  return str.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase());
};

export const ThemePropertySelector: React.FC<ThemePropertySelectorProps> = ({ type, onSelect }) => {
  const { m3Theme, activeM3ThemeScheme } = useDesign();
  
  const renderContent = () => {
    switch(type) {
      case 'color':
        const colors = activeM3ThemeScheme === 'light' ? m3Theme.lightColors : m3Theme.darkColors;
        const customColors = activeM3ThemeScheme === 'light' ? m3Theme.customLightColors : m3Theme.customDarkColors;
        
        return (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground px-2">Theme Colors</p>
            <div className="grid grid-cols-2 gap-1">
              {(Object.keys(colors) as Array<keyof M3Colors>).map((key) => (
                <Button key={key} variant="ghost" className="h-7 justify-start text-xs px-2" onClick={() => onSelect(colors[key])}>
                  <div className="w-3 h-3 rounded-full mr-2 border" style={{ backgroundColor: colors[key] }} />
                  {toTitleCase(key)}
                </Button>
              ))}
            </div>
            {customColors && customColors.length > 0 && (
              <>
                <p className="text-xs font-medium text-muted-foreground px-2 pt-2">Custom Colors</p>
                <div className="grid grid-cols-2 gap-1">
                  {customColors.map((customColor) => (
                    <Button key={customColor.name} variant="ghost" className="h-7 justify-start text-xs px-2" onClick={() => onSelect(customColor.color)}>
                      <div className="w-3 h-3 rounded-full mr-2 border" style={{ backgroundColor: customColor.color }} />
                      {customColor.name}
                    </Button>
                  ))}
                </div>
              </>
            )}
          </div>
        );

      case 'typography':
        return (
          <div className="space-y-1">
            {(Object.keys(m3Theme.typography) as Array<keyof M3Typography>).map(key => (
              <Button key={key} variant="ghost" className="w-full h-8 justify-start text-xs" onClick={() => onSelect(key)}>
                {toTitleCase(key)}
              </Button>
            ))}
          </div>
        );

      case 'shape':
        return (
          <div className="space-y-1">
            {(Object.keys(m3Theme.shapes) as Array<keyof M3Shapes>).map(key => (
               <Button key={key} variant="ghost" className="w-full h-8 justify-start text-xs" onClick={() => onSelect(key)}>
                {toTitleCase(key)} ({m3Theme.shapes[key]} dp)
              </Button>
            ))}
          </div>
        );
      
      default:
        return null;
    }
  };

  const getIcon = () => {
    switch(type) {
      case 'color': return <Palette className="w-3.5 h-3.5" />;
      case 'typography': return <TypeIcon className="w-3.5 h-3.5" />;
      case 'shape': return <Shapes className="w-3.5 h-3.5" />;
      default: return null;
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground">
          {getIcon()}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0">
        <ScrollArea className="max-h-72 p-2">
            {renderContent()}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};
