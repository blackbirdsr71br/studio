

'use client';

import React from 'react';
import { useDesign } from '@/contexts/DesignContext';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Palette, Type as TypeIcon, Shapes } from 'lucide-react';
import type { M3Colors, M3Typography, M3Shapes } from '@/types/compose-spec';
import { ScrollArea } from '../ui/scroll-area';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"


type SelectorType = 'color' | 'typography' | 'shape';

interface ThemePropertySelectorProps {
  type: SelectorType;
  onSelect: (value: string | number | Record<string, any>) => void;
}

const toTitleCase = (str: string) => {
  return str.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase());
};

const ColorSwatch = ({ name, color, onSelect }: { name: string, color: string, onSelect: (color: string) => void }) => (
    <TooltipProvider delayDuration={100}>
        <Tooltip>
            <TooltipTrigger asChild>
                <button
                    className="w-full flex flex-col items-center gap-1.5 p-2 rounded-md hover:bg-accent/20 transition-colors"
                    onClick={() => onSelect(color)}
                >
                    <div className="w-8 h-8 rounded-full border-2 border-border" style={{ backgroundColor: color }} />
                    <span className="text-xs text-center text-muted-foreground truncate w-full">{toTitleCase(name)}</span>
                </button>
            </TooltipTrigger>
            <TooltipContent side="top">
                <p>{toTitleCase(name)} ({color})</p>
            </TooltipContent>
        </Tooltip>
    </TooltipProvider>
);


export const ThemePropertySelector: React.FC<ThemePropertySelectorProps> = ({ type, onSelect }) => {
  const { m3Theme, activeM3ThemeScheme } = useDesign();
  
  const renderContent = () => {
    switch(type) {
      case 'color':
        const colors = activeM3ThemeScheme === 'light' ? m3Theme.lightColors : m3Theme.darkColors;
        const customColors = activeM3ThemeScheme === 'light' ? m3Theme.customLightColors : m3Theme.customDarkColors;
        
        return (
          <div className="space-y-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground px-1 mb-1">Theme Colors</p>
              <div className="grid grid-cols-4 gap-1">
                {(Object.keys(colors) as Array<keyof M3Colors>).map((key) => (
                  <ColorSwatch key={key} name={key} color={colors[key]} onSelect={onSelect as (color: string) => void} />
                ))}
              </div>
            </div>
            {customColors && customColors.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground px-1 mb-1 pt-2 border-t">Custom Colors</p>
                <div className="grid grid-cols-4 gap-1">
                  {customColors.map((customColor) => (
                    <ColorSwatch key={customColor.name} name={customColor.name} color={customColor.color} onSelect={onSelect as (color: string) => void} />
                  ))}
                </div>
              </div>
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
               <Button key={key} variant="ghost" className="w-full h-8 justify-start text-xs" onClick={() => onSelect(m3Theme.shapes[key])}>
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
  
  const popoverWidth = type === 'color' ? 'w-80' : 'w-64';

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground">
          {getIcon()}
        </Button>
      </PopoverTrigger>
      <PopoverContent className={cn("p-0", popoverWidth)}>
        <ScrollArea className="max-h-72 p-2">
            {renderContent()}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};
