
'use client';

import React, { useState } from 'react';
import { useDesign } from '@/contexts/DesignContext';
import { MobileFrame } from './MobileFrame';
import { LayoutPreview } from './LayoutPreview';
import { Button } from '@/components/ui/button';
import { getComponentIcon } from './ComponentIconMap';
import { cn } from '@/lib/utils';
import { LayoutGrid, AlertCircle } from 'lucide-react';

export function NavigationPreview() {
  const { navigationItems, savedLayouts, customComponentTemplates, m3Theme } = useDesign();
  const [activeLayoutId, setActiveLayoutId] = useState<string | null>(navigationItems[0]?.firestoreId || null);

  const activeLayout = savedLayouts.find(l => l.firestoreId === activeLayoutId);

  if (navigationItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center text-muted-foreground p-8 bg-background rounded-lg border-2 border-dashed">
        <LayoutGrid className="h-12 w-12 mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Navigation Items</h3>
        <p className="max-w-md">
          To build a navigation preview, go to the "Layouts" tab in the component library and click the "Add to Nav" button on your saved layouts.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col items-center justify-center">
      <MobileFrame>
        <div className="w-full h-full flex flex-col bg-[var(--m3-background)]">
          <main className="flex-grow flex-1 w-full overflow-y-auto">
            {activeLayout ? (
              <LayoutPreview 
                layout={activeLayout} 
                customComponentTemplates={customComponentTemplates} 
                m3Theme={m3Theme} 
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-center p-4 text-destructive">
                <AlertCircle className="h-8 w-8 mb-2" />
                <p className="font-semibold">Layout not found</p>
                <p className="text-xs">The selected layout could not be loaded. It might have been deleted.</p>
              </div>
            )}
          </main>

          {/* Bottom Navigation Bar */}
          <nav 
            className="w-full h-16 flex-shrink-0 bg-[var(--m3-surface)] text-[var(--m3-on-surface)] border-t border-[var(--m3-outline)] flex justify-around items-center"
          >
            {navigationItems.map(item => {
              const Icon = getComponentIcon(item.iconName) || AlertCircle;
              const isActive = item.firestoreId === activeLayoutId;
              const color = isActive ? 'var(--m3-primary)' : 'var(--m3-on-surface-variant)';

              return (
                <Button
                  key={item.firestoreId}
                  variant="ghost"
                  className="flex flex-col items-center justify-center h-full rounded-none p-1"
                  onClick={() => setActiveLayoutId(item.firestoreId)}
                >
                  <Icon className={cn("h-6 w-6 mb-0.5 transition-colors", isActive && "text-[var(--m3-primary)]")} style={{ color }} />
                  <span className="text-xs font-medium transition-colors" style={{ color }}>{item.name}</span>
                </Button>
              );
            })}
          </nav>
        </div>
      </MobileFrame>
    </div>
  );
}
