
'use client';

import { useRef, useState, useEffect } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { DesignProvider, useDesign } from '@/contexts/DesignContext';
import { Header } from '@/components/compose-builder/Header';
import { ComponentLibraryPanel } from '@/components/compose-builder/ComponentLibraryPanel';
import { DesignSurface } from '@/components/compose-builder/DesignSurface';
import { PropertyPanel } from '@/components/compose-builder/PropertyPanel';
import { GenerateCodeModal, type GenerateCodeModalRef } from '@/components/compose-builder/GenerateCodeModal';
import { ViewJsonModal, type ViewJsonModalRef } from '@/components/compose-builder/ViewJsonModal';
import { ThemeEditorModal, type ThemeEditorModalRef } from '@/components/compose-builder/ThemeEditorModal';
import { ImageSourceModal, type ImageSourceModalRef } from '@/components/compose-builder/ImageSourceModal';
import { PublishConfigModal, type PublishConfigModalRef } from '@/components/compose-builder/PublishConfigModal';
import { MobileFrame, FRAME_WIDTH, FRAME_HEIGHT } from '@/components/compose-builder/MobileFrame';
import { ZoomControls } from '@/components/compose-builder/ZoomControls';
import { useToast } from '@/hooks/use-toast';

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 2.0;

function KeyboardShortcuts() {
  const { undo, redo, copyComponent, pasteComponent, selectedComponentId } = useDesign();
  const { toast } = useToast();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const ctrlKey = isMac ? event.metaKey : event.ctrlKey;
      const targetElement = event.target as HTMLElement;

      const isTyping = ['INPUT', 'TEXTAREA'].includes(targetElement.tagName) || targetElement.isContentEditable;
      if (isTyping) return;

      if (ctrlKey && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (event.shiftKey) {
          redo();
        } else {
          undo();
        }
      } else if (ctrlKey && event.key.toLowerCase() === 'y') {
        event.preventDefault();
        redo();
      } else if (ctrlKey && event.key.toLowerCase() === 'c') {
        event.preventDefault();
        if (selectedComponentId) {
          const result = copyComponent(selectedComponentId);
          if (result.success && result.message) {
            toast({ title: "Component Copied", description: result.message });
          }
        }
      } else if (ctrlKey && event.key.toLowerCase() === 'v') {
        event.preventDefault();
        const result = pasteComponent();
         if (result.success && result.message) {
            toast({ title: "Component Pasted", description: result.message });
         } else if (!result.success && result.message) {
            toast({ title: "Paste Failed", description: result.message, variant: 'destructive' });
         }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [undo, redo, copyComponent, pasteComponent, selectedComponentId, toast]);

  return null;
}

function MainApp() {
  const { zoomLevel, setZoomLevel } = useDesign();
  const generateModalRef = useRef<GenerateCodeModalRef>(null);
  const viewJsonModalRef = useRef<ViewJsonModalRef>(null);
  const themeEditorModalRef = useRef<ThemeEditorModalRef>(null);
  const imageSourceModalRef = useRef<ImageSourceModalRef>(null);
  const publishConfigModalRef = useRef<PublishConfigModalRef>(null);

  useEffect(() => {
    const mainElement = document.querySelector('main');
    if (!mainElement) return;

    const handleWheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
        setZoomLevel(prev => {
          const newZoom = prev - event.deltaY * 0.002;
          return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom));
        });
      }
    };
    
    mainElement.addEventListener('wheel', handleWheel, { passive: false });
    
    return () => {
      mainElement.removeEventListener('wheel', handleWheel);
    };
  }, [setZoomLevel]);

  return (
    <>
      <KeyboardShortcuts />
      <div className="flex flex-col h-screen overflow-hidden bg-background">
        <Header
          generateModalRef={generateModalRef}
          viewJsonModalRef={viewJsonModalRef}
          themeEditorModalRef={themeEditorModalRef}
          publishConfigModalRef={publishConfigModalRef}
        />
        <div className="flex flex-row flex-grow overflow-hidden">
          <ComponentLibraryPanel />
          <main className="flex-grow relative grid place-items-center overflow-auto bg-muted/20 p-8">
            <div
              style={{
                width: FRAME_WIDTH * zoomLevel,
                height: FRAME_HEIGHT * zoomLevel,
              }}
            >
              <div
                className="transition-transform duration-150 ease-out"
                style={{
                  transform: `scale(${zoomLevel})`,
                  transformOrigin: 'top left',
                }}
              >
                <MobileFrame>
                  <DesignSurface />
                </MobileFrame>
              </div>
            </div>
            <ZoomControls />
          </main>
          <PropertyPanel imageSourceModalRef={imageSourceModalRef} />
        </div>
      </div>
      <GenerateCodeModal ref={generateModalRef} />
      <ViewJsonModal ref={viewJsonModalRef} />
      <ThemeEditorModal ref={themeEditorModalRef} />
      <ImageSourceModal ref={imageSourceModalRef} />
      <PublishConfigModal ref={publishConfigModalRef} />
    </>
  );
}

export default function ComposeBuilderPage() {
  return (
    <DndProvider backend={HTML5Backend}>
      <DesignProvider>
        <MainApp />
      </DesignProvider>
    </DndProvider>
  );
}
