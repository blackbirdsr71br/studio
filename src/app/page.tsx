
'use client'; // Top-level client component for context and refs

import { useRef } from 'react';
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
import { ImageSourceModal, type ImageSourceModalRef } from '@/components/compose-builder/ImageSourceModal'; // Import new modal
import { MobileFrame } from '@/components/compose-builder/MobileFrame';

export default function ComposeBuilderPage() {
  const generateModalRef = useRef<GenerateCodeModalRef>(null);
  const viewJsonModalRef = useRef<ViewJsonModalRef>(null);
  const themeEditorModalRef = useRef<ThemeEditorModalRef>(null);
  const imageSourceModalRef = useRef<ImageSourceModalRef>(null); // Add ref for ImageSourceModal

  return (
    <DndProvider backend={HTML5Backend}>
      <DesignProvider>
        <div className="flex flex-col h-screen overflow-hidden bg-background">
          <Header
            generateModalRef={generateModalRef}
            viewJsonModalRef={viewJsonModalRef}
            themeEditorModalRef={themeEditorModalRef}
            // No need to pass imageSourceModalRef to Header, PropertyPanel will use its own ref or a passed down one
          />
          <div className="flex flex-row flex-grow overflow-hidden">
            <ComponentLibraryPanel />
            <main className="flex-grow flex flex-col overflow-hidden items-center justify-center bg-muted/20 p-4">
              <MobileFrame>
                <DesignSurface />
              </MobileFrame>
            </main>
            {/* Pass the imageSourceModalRef to PropertyPanel so it can open it */}
            <PropertyPanel /> 
            {/* Alternative: Could pass imageSourceModalRef to PropertyPanel directly as a prop if PropertyPanel is refactored to accept it */}
          </div>
        </div>
        <GenerateCodeModal ref={generateModalRef} />
        <ViewJsonModal ref={viewJsonModalRef} />
        <ThemeEditorModal ref={themeEditorModalRef} />
        <ImageSourceModal ref={imageSourceModalRef} /> {/* Render ImageSourceModal, PropertyPanel will need to access this ref, ideally through context or prop drilling if state is managed in page */}
      </DesignProvider>
    </DndProvider>
  );
}
