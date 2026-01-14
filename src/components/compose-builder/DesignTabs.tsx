
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useDesign } from '@/contexts/DesignContext';
import { Button } from '@/components/ui/button';
import { Plus, X, LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

export function DesignTabs() {
  const { 
    designs = [], 
    activeDesignId, 
    setActiveDesign, 
    addNewDesign, 
    closeDesign, 
    updateDesignName, 
    editingLayoutInfo, 
    editingTemplateInfo,
    activeView,
    setActiveView,
    navigationItems,
  } = useDesign();
  
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const isEditingMode = !!editingLayoutInfo || !!editingTemplateInfo;

  useEffect(() => {
    if (editingTabId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingTabId]);


  const handleDoubleClick = (designId: string, currentName: string) => {
    if (isEditingMode) return; // Prevent renaming while in special editing modes
    setEditingTabId(designId);
    setEditingName(currentName);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditingName(e.target.value);
  };

  const handleNameUpdate = () => {
    if (editingTabId && editingName.trim()) {
      updateDesignName(editingTabId, editingName.trim());
    }
    setEditingTabId(null);
    setEditingName('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleNameUpdate();
    } else if (e.key === 'Escape') {
      setEditingTabId(null);
      setEditingName('');
    }
  };

  const handleCloseTab = (e: React.MouseEvent, designId: string) => {
    e.stopPropagation(); // Prevent the click from selecting the tab
    if (designs.length > 1 || isEditingMode) {
      closeDesign(designId);
    }
  };

  return (
    <div className="bg-muted/30 border-b border-border flex items-center shrink-0 h-10">
      <div className="flex-grow flex items-stretch h-full overflow-x-auto scrollbar-hidden">
        {designs.map(design => (
          <div
            key={design.id}
            onClick={() => { setActiveDesign(design.id); setActiveView('design'); }}
            onDoubleClick={() => handleDoubleClick(design.id, design.name)}
            className={cn(
              "relative flex items-center justify-between px-4 border-r border-border cursor-pointer group transition-colors duration-150",
              design.id === activeDesignId && activeView === 'design'
                ? 'bg-background text-foreground'
                : 'bg-muted/50 text-muted-foreground hover:bg-muted'
            )}
            title={design.name}
          >
            {editingTabId === design.id ? (
              <Input
                ref={inputRef}
                value={editingName}
                onChange={handleNameChange}
                onBlur={handleNameUpdate}
                onKeyDown={handleKeyDown}
                className="h-6 text-sm px-1 w-32 bg-background ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            ) : (
              <span className="text-sm select-none truncate max-w-[150px]">{design.name}</span>
            )}
            
            {(designs.length > 1 || isEditingMode) && (
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "ml-2 h-5 w-5 rounded-full",
                  design.id === activeDesignId ? "text-foreground/60 hover:bg-accent/10 hover:text-foreground" : "text-muted-foreground/60 hover:bg-accent/20 hover:text-accent-foreground"
                )}
                onClick={(e) => handleCloseTab(e, design.id)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        ))}
         {navigationItems.length > 0 && (
          <div
            key="navigation-tab"
            onClick={() => setActiveView('navigation')}
            className={cn(
              "relative flex items-center justify-between px-4 border-r border-border cursor-pointer group transition-colors duration-150",
              activeView === 'navigation'
                ? 'bg-background text-foreground'
                : 'bg-muted/50 text-muted-foreground hover:bg-muted'
            )}
            title="Navigation Preview"
          >
             <LayoutGrid className="h-4 w-4 mr-2" />
            <span className="text-sm select-none truncate max-w-[150px]">Navigation</span>
          </div>
        )}
      </div>
      {!isEditingMode && (
          <Button variant="ghost" size="icon" onClick={() => addNewDesign()} className="h-full w-10 rounded-none border-l border-border text-muted-foreground hover:bg-muted hover:text-foreground">
              <Plus className="h-4 w-4" />
          </Button>
      )}
    </div>
  );
}
