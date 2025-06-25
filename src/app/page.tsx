'use client'; // Top-level client component for context and refs

import { useRef, useState, useEffect } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { DesignProvider } from '@/contexts/DesignContext';
import { Header } from '@/components/compose-builder/Header';
import { ComponentLibraryPanel } from '@/components/compose-builder/ComponentLibraryPanel';
import { DesignSurface } from '@/components/compose-builder/DesignSurface';
import { PropertyPanel } from '@/components/compose-builder/PropertyPanel';
import { GenerateCodeModal, type GenerateCodeModalRef } from '@/components/compose-builder/GenerateCodeModal';
import { ViewJsonModal, type ViewJsonModalRef } from '@/components/compose-builder/ViewJsonModal';
import { ThemeEditorModal, type ThemeEditorModalRef } from '@/components/compose-builder/ThemeEditorModal';
import { ImageSourceModal, type ImageSourceModalRef } from '@/components/compose-builder/ImageSourceModal';
import { PublishConfigModal, type PublishConfigModalRef } from '@/components/compose-builder/PublishConfigModal';
import { MobileFrame } from '@/components/compose-builder/MobileFrame';
import { ZoomControls } from '@/components/compose-builder/ZoomControls';

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 2.0;

export default function ComposeBuilderPage() {
  const generateModalRef = useRef<GenerateCodeModalRef>(null);
  const viewJsonModalRef = useRef<ViewJsonModalRef>(null);
  const themeEditorModalRef = useRef<ThemeEditorModalRef>(null);
  const imageSourceModalRef = useRef<ImageSourceModalRef>(null);
  const publishConfigModalRef = useRef<PublishConfigModalRef>(null);

  const [zoomLevel, setZoomLevel] = useState(0.65);

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
  }, []);

  return (
    <DndProvider backend={HTML5Backend}>
      <DesignProvider>
        <div className="flex flex-col h-screen overflow-hidden bg-background">
          <Header
            generateModalRef={generateModalRef}
            viewJsonModalRef={viewJsonModalRef}
            themeEditorModalRef={themeEditorModalRef}
            publishConfigModalRef={publishConfigModalRef}
          />
          <div className="flex flex-row flex-grow overflow-hidden">
            <ComponentLibraryPanel />
            <main className="flex-grow relative flex items-center justify-center overflow-auto bg-muted/20 p-8">
              <div
                className="transition-transform duration-150 ease-out"
                style={{
                  transform: `scale(${zoomLevel})`,
                  transformOrigin: 'center',
                }}
              >
                <MobileFrame>
                  <DesignSurface zoomLevel={zoomLevel} />
                </MobileFrame>
              </div>
              <ZoomControls zoomLevel={zoomLevel} setZoomLevel={setZoomLevel} />
            </main>
            <PropertyPanel imageSourceModalRef={imageSourceModalRef} />
          </div>
        </div>
        <GenerateCodeModal ref={generateModalRef} />
        <ViewJsonModal ref={viewJsonModalRef} />
        <ThemeEditorModal ref={themeEditorModalRef} />
        <ImageSourceModal ref={imageSourceModalRef} />
        <PublishConfigModal ref={publishConfigModalRef} />
      </DesignProvider>
    </DndProvider>
  );
}
