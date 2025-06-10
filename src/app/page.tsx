
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
import { GenerateJsonFromTextModal, type GenerateJsonFromTextModalRef } from '@/components/compose-builder/GenerateJsonFromTextModal'; // Added
import { MobileFrame } from '@/components/compose-builder/MobileFrame';

export default function ComposeBuilderPage() {
  const generateModalRef = useRef<GenerateCodeModalRef>(null);
  const viewJsonModalRef = useRef<ViewJsonModalRef>(null);
  const generateJsonFromTextModalRef = useRef<GenerateJsonFromTextModalRef>(null); // Added

  return (
    <DndProvider backend={HTML5Backend}>
      <DesignProvider>
        <div className="flex flex-col h-screen overflow-hidden bg-background">
          <Header
            generateModalRef={generateModalRef}
            viewJsonModalRef={viewJsonModalRef}
            generateJsonFromTextModalRef={generateJsonFromTextModalRef} // Added
          />
          <div className="flex flex-row flex-grow overflow-hidden">
            <ComponentLibraryPanel />
            <main className="flex-grow flex flex-col overflow-hidden items-center justify-center bg-muted/20 p-4">
              <MobileFrame>
                <DesignSurface />
              </MobileFrame>
            </main>
            <PropertyPanel />
          </div>
        </div>
        <GenerateCodeModal ref={generateModalRef} />
        <ViewJsonModal ref={viewJsonModalRef} />
        <GenerateJsonFromTextModal ref={generateJsonFromTextModalRef} /> {/* Added */}
      </DesignProvider>
    </DndProvider>
  );
}
