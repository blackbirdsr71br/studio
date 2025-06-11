
'use client';

import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Sun, Moon, Cog } from 'lucide-react';

export function SettingsPanelContent() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="p-4 space-y-3 w-60"> {/* Adjusted width back */}
      <h3 className="text-base font-medium font-headline text-sidebar-foreground">Interface Theme</h3>
      <RadioGroup value={theme} onValueChange={(value) => setTheme(value as typeof theme)}>
        <div className="flex items-center space-x-3 py-1">
          <RadioGroupItem value="light" id="theme-light" />
          <Label htmlFor="theme-light" className="flex items-center gap-2 text-sm text-sidebar-foreground cursor-pointer">
            <Sun className="w-4 h-4 text-sidebar-primary" /> Light
          </Label>
        </div>
        <div className="flex items-center space-x-3 py-1">
          <RadioGroupItem value="dark" id="theme-dark" />
          <Label htmlFor="theme-dark" className="flex items-center gap-2 text-sm text-sidebar-foreground cursor-pointer">
            <Moon className="w-4 h-4 text-sidebar-primary" /> Dark
          </Label>
        </div>
        <div className="flex items-center space-x-3 py-1">
          <RadioGroupItem value="system" id="theme-system" />
          <Label htmlFor="theme-system" className="flex items-center gap-2 text-sm text-sidebar-foreground cursor-pointer">
            <Cog className="w-4 h-4 text-sidebar-primary" /> System
          </Label>
        </div>
      </RadioGroup>
    </div>
  );
}
